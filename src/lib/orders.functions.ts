import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { submitOrderSchema, priceOrder, statusSchema, workflowStatusSchema, cancelOrderSchema, trackingUrlSchema, type Order } from "./orders";
import { EMPTY_SETTINGS, ordersOpen, settingsSchema } from "./store-settings";
import { mergeCatalog } from "./catalog";
import { deliveryAddress } from "./delivery-address";

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitOrderSchema.parse(input))
  .handler(async ({ data }) => {
    // Public checkout is a narrowly scoped privileged write, never a public read of customer data.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Idempotent retries only replay an order placed with the same checkout key by the same customer.
    const replay = async () => {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("orders")
        .select("id,number,customer_phone,customer_name")
        .eq("request_id", data.requestId)
        .maybeSingle();
      if (existingError) throw new Error("Não foi possível registrar o pedido. Tente novamente.");
      if (!existing) return null;
      if (existing.customer_phone !== data.customer.phone || existing.customer_name !== data.customer.name)
        throw new Error("Não foi possível registrar o pedido. Atualize a página e tente novamente.");
      return { id: existing.id, number: existing.number };
    };
    const existing = await replay();
    if (existing) return existing;
    const { count, error: rateError } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", data.customer.phone)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());
    if (rateError || (count ?? 0) >= 3)
      throw new Error("Aguarde um minuto antes de enviar outro pedido.");
    const { data: row, error: settingsError } = await supabaseAdmin
      .from("store_settings")
      .select("delivery_enabled,fixed_delivery_fee,pickup_address,delivery_zones,hours_enabled,opening_hours,order_cutoff,delivery_distance_enabled,delivery_origin,delivery_distance_tiers,coupons,promoBanner")
      .eq("id", "main")
      .maybeSingle();
    if (settingsError) throw new Error("Não foi possível conferir a entrega. Tente novamente.");
    const settings = row ? settingsSchema.parse(row) : EMPTY_SETTINGS;
    const orderStatus = ordersOpen(settings);
    if (!orderStatus.open && orderStatus.reason === "cutoff") throw new Error(`Os pedidos de hoje encerraram às ${settings.order_cutoff}. O catálogo continua aberto para consulta.`);
    if (!orderStatus.open) throw new Error("A loja está fechada. Confira os horários.");
    const { data: catalogRows, error: catalogError } = await supabaseAdmin.from("catalog_products").select("id,data,updated_at").in("id", [...new Set(data.items.flatMap(i => [i.productId, ...(i.components ?? []).map(c => c.productId)]))]);
    if (catalogError) throw new Error("Não foi possível conferir o estoque.");
    let verifiedDelivery: { fee: number; km: number } | undefined;
    if (data.customer.fulfillment === "delivery" && settings.delivery_enabled && settings.delivery_distance_enabled) {
      const { verifyDeliveryToken, deliverySettingsHash } = await import("./delivery.server");
      const sessionId = await verifyDeliveryToken(data.deliveryToken);
      if (!data.deliveryQuoteId || !sessionId) throw new Error("Calcule a taxa de entrega antes de enviar.");
      const { data: quote, error: quoteError } = await supabaseAdmin.from("delivery_quotes").select("fee,distance_km,address,settings_hash").eq("id", data.deliveryQuoteId).eq("session_id", sessionId).gte("created_at", new Date(Date.now()-15*60000).toISOString()).maybeSingle();
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
      .select("id,number")
      .single();
    if (error || !saved) {
      if (error?.code === "P0001") throw new Error("Estoque ou preço alterado. Atualize o catálogo e confira o carrinho.");
      if (error?.code === "23505") {
        const duplicate = await replay();
        if (duplicate) return duplicate;
      }
      throw new Error("Não foi possível registrar o pedido. Seu carrinho foi mantido.");
    }
    // Avisos para a loja (celular e e-mail) em paralelo; falhas de envio nunca bloqueiam o pedido.
    const pushNotice = (async () => {
      const { newOrderPush } = await import("@/lib/push");
      const { notifyAdminsPush } = await import("@/lib/push.server");
      await notifyAdminsPush(newOrderPush({
        id: saved.id,
        number: saved.number,
        customerName: data.customer.name,
        total: priced.total,
        fulfillment: data.customer.fulfillment,
        items: priced.items,
      }));
    })();
    const emailNotice = (async () => {
      const { notifyNewOrder } = await import("@/lib/order-notifications");
      await notifyNewOrder(saved.id, {
        number: saved.number,
        customerName: data.customer.name,
        customerPhone: data.customer.phone,
        fulfillment: data.customer.fulfillment,
        address: data.customer.fulfillment === "pickup" ? "" : deliveryAddress(data.customer.address),
        payment: data.customer.payment,
        changeFor: data.customer.change,
        notes: data.customer.notes,
        items: priced.items,
        subtotal: priced.subtotal,
        deliveryFee: priced.delivery_fee,
        total: priced.total,
      });
    })();
    for (const result of await Promise.allSettled([pushNotice, emailNotice]))
      if (result.status === "rejected") console.error("Falha ao enviar aviso de novo pedido:", result.reason);
    return { id: saved.id, number: saved.number };
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
          cancellation_stock_notes: z.array(z.string()).parse(row.cancellation_stock_notes),
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
    z.object({ id: z.string().uuid(), status: workflowStatusSchema, expected: workflowStatusSchema }).parse(input),
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
      .neq("status", "cancelled")
      .select("id")
      .maybeSingle();
    if (error || !saved)
      throw new Error("Não foi possível salvar o link de rastreio. Atualize o quadro e tente novamente.");
    return { saved: true };
  });
// Public, narrowly scoped read: only the browser that placed the order knows both the order id and its checkout key.
export const orderTracking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), requestId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("order_tracking_for", { _id: data.id, _request_id: data.requestId });
    if (error) throw new Error("Não foi possível consultar a entrega.");
    if (!row) throw new Error("Pedido não encontrado.");
    const parsed = z
      .object({ status: statusSchema, trackingUrl: z.string().nullable() })
      .parse(row);
    return { status: parsed.status, trackingUrl: parsed.trackingUrl };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cancelOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const { data: result, error } = await context.supabase.rpc("cancel_store_order", { _id: data.id, _reason: data.reason, _expected_updated_at: data.expectedUpdatedAt });
    if (error) throw new Error("O pedido mudou ou não foi cancelado. Atualize e tente novamente.");
    return z.object({ cancelled: z.boolean(), alreadyCancelled: z.boolean(), stockNotes: z.array(z.string()) }).parse(result);
  });
