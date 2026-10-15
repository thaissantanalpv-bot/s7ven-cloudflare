import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { submitOrderSchema, priceOrder, statusSchema, trackingUrlSchema, type Order } from "./orders";
import { EMPTY_SETTINGS, settingsSchema, storeStatus } from "./store-settings";
import { mergeCatalog } from "./catalog";
import { deliveryAddress } from "./delivery-address";

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitOrderSchema.parse(input))
  .handler(async ({ data }) => {
    // Public checkout is a narrowly scoped privileged write, never a public read of customer data.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("orders")
      .select("number")
      .eq("request_id", data.requestId)
      .maybeSingle();
    if (existingError) throw new Error("Não foi possível registrar o pedido. Tente novamente.");
    if (existing) return { number: existing.number };
    const { count, error: rateError } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", data.customer.phone)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());
    if (rateError || (count ?? 0) >= 3)
      throw new Error("Aguarde um minuto antes de enviar outro pedido.");
    const { data: row, error: settingsError } = await supabaseAdmin
      .from("store_settings")
      .select("delivery_enabled,fixed_delivery_fee,pickup_address,delivery_zones,hours_enabled,opening_hours,delivery_distance_enabled,delivery_origin,delivery_distance_tiers")
      .eq("id", "main")
      .maybeSingle();
    if (settingsError) throw new Error("Não foi possível conferir a entrega. Tente novamente.");
    const settings = row ? settingsSchema.parse(row) : EMPTY_SETTINGS;
    if (!storeStatus(settings).open) throw new Error("A loja está fechada. Confira os horários.");
    const { data: catalogRows, error: catalogError } = await supabaseAdmin.from("catalog_products").select("id,data,updated_at").in("id", [...new Set(data.items.flatMap(i => [i.productId, ...(i.components ?? []).map(c => c.productId)]))]);
    if (catalogError) throw new Error("Não foi possível conferir o estoque.");
    let verifiedDelivery: { fee: number; km: number } | undefined;
    if (data.customer.fulfillment === "delivery" && settings.delivery_enabled && settings.delivery_distance_enabled) {
      const { deliverySession, deliverySettingsHash } = await import("./delivery.server");
      const session = await deliverySession();
      if (!data.deliveryQuoteId || !session.data.ready || !session.id) throw new Error("Calcule a taxa de entrega antes de enviar.");
      const { data: quote, error: quoteError } = await supabaseAdmin.from("delivery_quotes").select("fee,distance_km,address,settings_hash").eq("id", data.deliveryQuoteId).eq("session_id", session.id).gte("created_at", new Date(Date.now()-15*60000).toISOString()).maybeSingle();
      if (quoteError || !quote || quote.address !== deliveryAddress(data.customer.address) || quote.settings_hash !== await deliverySettingsHash(settings)) throw new Error("O endereço ou a taxa mudou. Calcule a entrega novamente.");
      verifiedDelivery = { fee: Number(quote.fee), km: Number(quote.distance_km) };
    }
    const priced = priceOrder(data, settings, mergeCatalog(catalogRows), verifiedDelivery);
    const { data: saved, error } = await supabaseAdmin
      .from("orders")
      .insert({
        request_id: data.requestId,
        analytics_session_id: data.analytics?.sessionId ?? null,
        analytics_visitor_id: data.analytics?.visitorId ?? null,
        customer_name: data.customer.name,
        customer_phone: data.customer.phone,
        address: data.customer.fulfillment === "pickup" ? "" : deliveryAddress(data.customer.address),
        fulfillment: data.customer.fulfillment,
        payment: data.customer.payment,
        change_for: data.customer.change,
        notes: data.customer.notes,
        ...priced,
      })
      .select("number")
      .single();
    if (error || !saved) {
      if (error?.code === "P0001") throw new Error("Estoque ou preço alterado. Atualize o catálogo e confira o carrinho.");
      if (error?.code === "23505") {
        const { data: duplicate } = await supabaseAdmin
          .from("orders")
          .select("number")
          .eq("request_id", data.requestId)
          .maybeSingle();
        if (duplicate) return { number: duplicate.number };
      }
      throw new Error("Não foi possível registrar o pedido. Seu carrinho foi mantido.");
    }
    return { number: saved.number };
  });
export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const result: Order[] = [];
    // Explicit pagination prevents silent loss when the Data API caps results.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await context.supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new Error("Não foi possível carregar os pedidos.");
      result.push(
        ...data.map((row) => ({
          ...row,
          source: z.enum(["catalog", "counter"]).parse(row.source),
          fulfillment: z.enum(["delivery", "pickup"]).parse(row.fulfillment),
          status: statusSchema.parse(row.status),
          items: row.items as Order["items"],
          subtotal: Number(row.subtotal),
          delivery_fee: Number(row.delivery_fee),
          total: Number(row.total),
        })),
      );
      if (data.length < 500) break;
    }
    return result;
  });
export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: statusSchema, expected: statusSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const { data: saved, error } = await context.supabase
      .from("orders")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id)
       .eq("source", "catalog")
      .eq("status", data.expected)
      .select("id")
      .maybeSingle();
    if (error || !saved)
      throw new Error("O pedido mudou ou não foi salvo. Atualize o quadro e tente novamente.");
    return { saved: true };
  });
export const updateOrderTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), trackingUrl: trackingUrlSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const { data: saved, error } = await context.supabase
      .from("orders")
      .update({ tracking_url: data.trackingUrl || null, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("source", "catalog")
      .eq("fulfillment", "delivery")
      .select("id")
      .maybeSingle();
    if (error || !saved)
      throw new Error("Não foi possível salvar o link de rastreio. Atualize o quadro e tente novamente.");
    return { saved: true };
  });
// Public, narrowly scoped read: the customer sees only the stage and the tracking link of their own order id.
export const orderTracking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("order_tracking", { _id: data.id });
    if (error) throw new Error("Não foi possível consultar a entrega.");
    if (!row) throw new Error("Pedido não encontrado.");
    const parsed = z
      .object({ status: statusSchema, trackingUrl: z.string().nullable() })
      .parse(row);
    return { status: parsed.status, trackingUrl: parsed.trackingUrl };
  });
