import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { submitOrderSchema, priceOrder, statusSchema, type Order } from "./orders";
import { EMPTY_SETTINGS, settingsSchema, storeStatus } from "./store-settings";
import { mergeCatalog } from "./catalog";

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
      .select("delivery_enabled,delivery_zones,hours_enabled,opening_hours")
      .eq("id", "main")
      .maybeSingle();
    if (settingsError) throw new Error("Não foi possível conferir a entrega. Tente novamente.");
    const settings = row ? settingsSchema.parse(row) : EMPTY_SETTINGS;
    if (!storeStatus(settings).open) throw new Error("A loja está fechada. Confira os horários.");
    const { data: catalogRows, error: catalogError } = await supabaseAdmin.from("catalog_products").select("id,data,updated_at").in("id", [...new Set(data.items.flatMap(i => [i.productId, ...(i.components ?? []).map(c => c.productId)]))]);
    if (catalogError) throw new Error("Não foi possível conferir o estoque.");
    const priced = priceOrder(data, settings, mergeCatalog(catalogRows));
    const { data: saved, error } = await supabaseAdmin
      .from("orders")
      .insert({
        request_id: data.requestId,
        customer_name: data.customer.name,
        customer_phone: data.customer.phone,
        address: data.customer.fulfillment === "pickup" ? "" : data.customer.address,
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
