import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { distanceFee, settingsSchema } from "./store-settings";

export const startDeliverySession = createServerFn({ method: "POST" }).handler(async () => {
  const { deliverySession } = await import("./delivery.server");
  const session = await deliverySession();
  await session.update({ ready: true });
  return { ready: true };
});
export const quoteDelivery = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ address: z.string().trim().min(8).max(300) }).parse(input))
  .handler(async ({ data }) => {
    const { deliverySession, deliverySettingsHash } = await import("./delivery.server");
    const session = await deliverySession();
    if (!session.data.ready) throw new Error("Reabra o carrinho para calcular a entrega.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("store_settings").select("*").eq("id", "main").single();
    if (error) throw new Error("Não foi possível conferir as taxas.");
    const settings = settingsSchema.parse(row);
    if (!settings.delivery_enabled || !settings.delivery_distance_enabled) throw new Error("A entrega por km não está ativa.");
    const hash = await deliverySettingsHash(settings);
    const since = new Date(Date.now() - 15 * 60000).toISOString();
    const { data: cached } = await supabaseAdmin.from("delivery_quotes").select("id,distance_km,fee").eq("session_id", session.id).eq("address", data.address).eq("settings_hash", hash).gte("created_at", since).limit(1).maybeSingle();
    if (cached) return { id: cached.id, address: data.address, km: Number(cached.distance_km), fee: Number(cached.fee) };
    const { count, error: countError } = await supabaseAdmin.from("delivery_quotes").select("id", { head: true, count: "exact" }).eq("session_id", session.id).gte("created_at", since);
    if (countError || (count ?? 0) >= 10) throw new Error("Aguarde antes de calcular mais endereços.");
    const apiKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!apiKey || !mapsKey) throw new Error("Conecte o Google Maps para calcular as distâncias.");
    const response = await fetch("https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": mapsKey, "Content-Type": "application/json", "X-Goog-FieldMask": "routes.distanceMeters,routes.duration" },
      body: JSON.stringify({ origin: { address: settings.delivery_origin }, destination: { address: data.address }, travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE" }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: { message?: string; details?: { reason?: string }[] }; message?: string };
      const reason = payload.error?.details?.find(d => d.reason)?.reason;
      if (response.status === 403 && reason === "API_KEY_HTTP_REFERRER_BLOCKED") throw new Error("Google Maps: a chave de servidor está restrita a sites; ajuste para servidor na conta Google.");
      if (response.status === 403 && reason === "API_KEY_SERVICE_BLOCKED") throw new Error("Google Maps: habilite Routes API para a chave de servidor na conta Google.");
      throw new Error(`Google Maps (${response.status}): ${payload.error?.message ?? payload.message ?? "Cálculo indisponível."}`);
    }
    const payload = await response.json() as { routes?: { distanceMeters?: number; duration?: string }[] };
    const route = payload.routes?.[0];
    if (!route?.duration || !/^\d+(\.\d+)?s$/.test(route.duration)) throw new Error("Não foi encontrada uma rota. Confira rua, número, cidade e CEP.");
    const km = (route.distanceMeters ?? 0) / 1000;
    const fee = distanceFee(settings, km);
    const { data: saved, error: saveError } = await supabaseAdmin.from("delivery_quotes").insert({ session_id: session.id, address: data.address, settings_hash: hash, distance_km: km, fee }).select("id").single();
    if (saveError || !saved) throw new Error("Não foi possível guardar o cálculo. Tente novamente.");
    return { id: saved.id, address: data.address, km, fee };
  });