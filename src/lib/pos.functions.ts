import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { counterSaleSchema, priceCounterSale } from "./pos";
import { mergeCatalog } from "./catalog";

export const submitCounterSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => counterSaleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const findExisting = async () => {
      const { data: existing, error } = await context.supabase.from("orders").select("number,total,cash_received,cash_change").eq("request_id", data.requestId).eq("source", "counter").eq("cashier_id", context.userId).maybeSingle();
      if (error) throw new Error("Não foi possível conferir a venda. Tente novamente.");
      return existing;
    };
    const existing = await findExisting();
    if (existing) return existing;
    const { data: rows, error: catalogError } = await context.supabase.from("catalog_products").select("id,data,updated_at").in("id", [...new Set(data.items.flatMap(i => [i.productId, ...(i.components ?? []).map(c => c.productId)]))]);
    if (catalogError) throw new Error("Não foi possível conferir o estoque.");
    const priced = priceCounterSale(data, mergeCatalog(rows));
    // Only the verified store admin can reach this privileged insertion; the stock trigger owns reservation.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: saved, error } = await supabaseAdmin.from("orders").insert({
      request_id: data.requestId, source: "counter", cashier_id: context.userId,
      customer_name: data.name || "Cliente balcão", customer_phone: "", address: "Balcão",
      payment: data.payment, notes: data.notes, status: "delivered", ...priced,
    }).select("number,total,cash_received,cash_change").single();
    if (error || !saved) {
      if (error?.code === "23505") { const duplicate = await findExisting(); if (duplicate) return duplicate; }
      if (error?.code === "P0001") throw new Error("Estoque ou preço alterado. Confira os itens e tente novamente.");
      throw new Error("Venda não concluída. Os itens foram mantidos; tente novamente.");
    }
    return saved;
  });