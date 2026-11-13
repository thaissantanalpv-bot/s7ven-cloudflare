import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ALFA_MERCHANT_ID, ALFA_MERCHANT_NAME, alfaAddressFromGeocode, alfaPayments, canCallAlfa } from "./alfa";
import { deliveryAddress } from "./delivery-address";

async function geocode(address: string, complement = "") {
  const apiKey = process.env["LOVABLE_API_KEY"], mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!apiKey || !mapsKey) throw new Error("Google Maps não está conectado.");
  const res = await fetch(`https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=${encodeURIComponent(deliveryAddress(address))}&components=country:BR&region=br&language=pt-BR`, {
    headers: { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": mapsKey },
  });
  if (!res.ok) { console.error(`Alfa geocode [${res.status}]: ${await res.text()}`); throw new Error("Não consegui localizar o endereço no mapa."); }
  const payload = await res.json() as { results?: Parameters<typeof alfaAddressFromGeocode>[0][] };
  return alfaAddressFromGeocode(payload.results?.[0], complement);
}

/** Quote (confirm=false) or create (confirm=true) an Alfa delivery for a catalog delivery order. Admin only. */
export const callAlfaDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), confirm: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const { data: order, error } = await context.supabase.from("orders").select("*").eq("id", data.id).maybeSingle();
    if (error || !order) throw new Error("Pedido não encontrado.");
    if (order.fulfillment === "pickup" || order.status === "cancelled" || order.status === "delivered") throw new Error("Este pedido não precisa de entregador.");
    if (!canCallAlfa(order.alfa_status)) throw new Error("A Alfa já está cuidando deste pedido.");
    const { data: settings } = await context.supabase.from("store_settings").select("delivery_origin,pickup_address").limit(1).maybeSingle();
    const origin = (settings?.delivery_origin || settings?.pickup_address || "").trim();
    if (origin.length < 8) throw new Error("Cadastre o endereço da loja em Minha loja > Entregas.");
    const { alfaToken, alfaRequest } = await import("./alfa.server");
    const [pickupAddress, customerAddress, token] = await Promise.all([geocode(origin), geocode(order.address, order.notes ?? ""), alfaToken()]);
    // Customer notes (apartment, back house, etc.) go to every field the courier app shows.
    const notes = (order.notes ?? "").trim();
    if (notes) Object.assign(customerAddress, { complement: notes.slice(0, 120), reference: notes.slice(0, 200) });
    const base = {
      merchant: { id: ALFA_MERCHANT_ID, name: ALFA_MERCHANT_NAME },
      pickupAddress, deliveryAddress: customerAddress,
      vehicle: { type: ["MOTORBIKE_BAG", "MOTORBIKE_BOX"], container: "NORMAL", ...(notes ? { instruction: `Obs. do cliente: ${notes}`.slice(0, 300) } : {}) },
      limitTimes: { pickupLimit: 20, deliveryLimit: 60, orderCreatedAt: new Date(order.created_at).toISOString() },
      totalOrderPrice: { value: Number(order.total), currency: "BRL" },
      orderDeliveryFee: { value: Number(order.delivery_fee), currency: "BRL" },
      totalWeight: 1000, returnToMerchant: false, canCombine: true, onlinePayment: false,
    };
    if (!data.confirm) {
      const quote = await alfaRequest("/v1/logistics/availability", token, base) as { deliveryPrice?: { value?: number; price?: { value?: number } }; ETAs?: { deliveryEtaInMinutes?: number } };
      return { price: quote.deliveryPrice?.price?.value ?? quote.deliveryPrice?.value ?? null, etaMinutes: quote.ETAs?.deliveryEtaInMinutes ?? null, created: false };
    }
    const items = (order.items as { name?: string; qty?: number; option?: string }[] ?? []).map(i => ({ name: [i.name, i.option].filter(Boolean).join(" - ").slice(0, 120), quantity: i.qty ?? 1 }));
    const created = await alfaRequest("/v1/logistics/delivery", token, {
      ...base,
      orderId: order.id, orderDisplayId: String(order.number),
      customerName: order.customer_name, customerPhone: order.customer_phone,
      payments: alfaPayments(order.payment, Number(order.total), order.change_for ?? ""),
      items, specialInstructions: notes ? `Obs. do cliente: ${notes}`.slice(0, 300) : "",
    }) as { deliveryId?: string; status?: string };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("orders").update({
      alfa_status: created.status ?? "PENDING", alfa_delivery_id: created.deliveryId ?? null, alfa_message: null, alfa_updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    return { price: null, etaMinutes: null, created: true };
  });

/** Cancel the active Alfa delivery of an order (before pickup). Admin only. */
export const cancelAlfaDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const { data: order, error } = await context.supabase.from("orders").select("id,alfa_status").eq("id", data.id).maybeSingle();
    if (error || !order) throw new Error("Pedido não encontrado.");
    if (canCallAlfa(order.alfa_status)) throw new Error("Não há corrida ativa da Alfa neste pedido.");
    const { alfaToken, alfaRequest } = await import("./alfa.server");
    await alfaRequest(`/v1/logistics/cancel/${encodeURIComponent(order.id)}`, await alfaToken(), { reason: "PROBLEM_AT_MERCHANT", action: "CANCEL_DELIVERY", message: "Cancelado pela loja" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("orders").update({ alfa_status: "CANCELLED", alfa_updated_at: new Date().toISOString() }).eq("id", order.id);
    return { ok: true };
  });
