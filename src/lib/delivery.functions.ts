import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { distanceFee, settingsSchema } from "./store-settings";
import { deliveryAddress, deliveryLocation, deliveryNeighborhood } from "./delivery-address";

export const startDeliverySession = createServerFn({ method: "POST" }).handler(async () => {
  const { createDeliveryToken } = await import("./delivery.server");
  return { token: await createDeliveryToken() };
});

const suggestionSchema = z.object({
  input: z.string().trim().min(3).max(120),
  token: z.string().max(200),
  sessionToken: z.string().uuid(),
});

type AddressSuggestion = { placeId: string; text: string; street: string; number: string; neighborhood: string };

/** Autocomplete de endereços de Araçatuba para o checkout; consome a sessão de entrega já existente. */
export const suggestDeliveryAddress = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => suggestionSchema.parse(input))
  .handler(async ({ data }) => {
    const { verifyDeliveryToken } = await import("./delivery.server");
    const sessionId = await verifyDeliveryToken(data.token);
    if (!sessionId) throw new Error("DELIVERY_SESSION_EXPIRED");
    const apiKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!apiKey || !mapsKey) throw new Error("Conecte o Google Maps para sugerir endereços.");
    const gateway = "https://connector-gateway.lovable.dev/google_maps";
    const response = await fetch(`${gateway}/places/v1/places:autocomplete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
      },
      body: JSON.stringify({
        input: data.input,
        sessionToken: data.sessionToken,
        languageCode: "pt-BR",
        regionCode: "BR",
        includedRegionCodes: ["br"],
        locationBias: { circle: { center: { latitude: -21.2089, longitude: -50.4328 }, radius: 15000 } },
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Google Maps autocomplete [${response.status}]: ${body}`);
      throw new Error("Não foi possível buscar endereços agora. Digite o endereço completo.");
    }
    const payload = await response.json() as {
      suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string }; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } }[];
    };
    const suggestions: AddressSuggestion[] = [];
    for (const item of payload.suggestions ?? []) {
      const prediction = item.placePrediction;
      const text = prediction?.text?.text?.trim() ?? "";
      if (!prediction?.placeId || !text) continue;
      const normalized = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      if (!normalized.includes("aracatuba")) continue;
      const main = prediction.structuredFormat?.mainText?.text?.trim() ?? "";
      const secondary = prediction.structuredFormat?.secondaryText?.text?.trim() ?? "";
      const numberMatch = main.match(/^(.*?)[,\s]+(\d{1,6}[a-zA-Z-]?)$/);
      const street = (numberMatch?.[1] ?? main).trim();
      const number = numberMatch?.[2] ?? "";
      const neighborhood = secondary.split(",")[0]?.replace(/-/g, " ").trim() ?? "";
      if (street) suggestions.push({ placeId: prediction.placeId, text, street, number, neighborhood });
      if (suggestions.length >= 5) break;
    }
    return { suggestions };
  });
export const quoteDelivery = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ address: z.string().trim().min(8).max(300), token: z.string().max(200), autoNeighborhood: z.boolean().optional() }).parse(input))
  .handler(async ({ data }) => {
    const { verifyDeliveryToken, deliverySettingsHash } = await import("./delivery.server");
    const sessionId = await verifyDeliveryToken(data.token);
    if (!sessionId) throw new Error("DELIVERY_SESSION_EXPIRED");
    const session = { id: sessionId };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("store_settings").select("*").eq("id", "main").single();
    if (error) throw new Error("Não foi possível conferir as taxas.");
    const settings = settingsSchema.parse(row);
    if (!settings.delivery_enabled || !settings.delivery_distance_enabled) throw new Error("A entrega por km não está ativa.");
    const hash = await deliverySettingsHash(settings);
    const address = deliveryAddress(data.address);
    const since = new Date(Date.now() - 15 * 60000).toISOString();
    const { data: cached } = await supabaseAdmin.from("delivery_quotes").select("id,distance_km,fee").eq("session_id", session.id).eq("address", address).eq("settings_hash", hash).gte("created_at", since).limit(1).maybeSingle();
    if (cached) return { id: cached.id, address, km: Number(cached.distance_km), fee: Number(cached.fee), neighborhood: "" };
    const { count, error: countError } = await supabaseAdmin.from("delivery_quotes").select("id", { head: true, count: "exact" }).eq("session_id", session.id).gte("created_at", since);
    if (countError || (count ?? 0) >= 10) throw new Error("Aguarde antes de calcular mais endereços.");
    const apiKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!apiKey || !mapsKey) throw new Error("Conecte o Google Maps para calcular as distâncias.");
    const gateway = "https://connector-gateway.lovable.dev/google_maps";
    const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": mapsKey };
    const checkResponse = async (response: Response) => {
      if (response.ok) return;
      const body = await response.text();
      console.error(`Google Maps [${response.status}]: ${body}`);
      let payload: { error?: { message?: string; details?: { reason?: string }[] }; message?: string } = {};
      try { payload = JSON.parse(body); } catch {}
      const reason = payload.error?.details?.find(d => d.reason)?.reason;
      if (response.status === 403 && reason === "API_KEY_HTTP_REFERRER_BLOCKED") throw new Error("Google Maps: a chave de servidor está restrita a sites; ajuste para servidor na conta Google.");
      if (response.status === 403 && reason === "API_KEY_SERVICE_BLOCKED") throw new Error("Google Maps: habilite Geocoding API e Routes API para a chave de servidor na conta Google.");
      if (response.status === 403) throw new Error("Google Maps negou o cálculo (403). A loja precisa conferir as restrições da chave de servidor na conta Google.");
      throw new Error(`Google Maps (${response.status}): ${payload.error?.message ?? payload.message ?? "Cálculo indisponível."}`);
    };
    const geocode = await fetch(`${gateway}/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:BR&region=br&language=pt-BR`, { headers });
    await checkResponse(geocode);
    const geocoded = await geocode.json() as Parameters<typeof deliveryLocation>[0] & { error_message?: string };
    if (geocoded.status === "REQUEST_DENIED" || geocoded.status === "OVER_QUERY_LIMIT") throw new Error(`Google Maps: ${geocoded.error_message ?? geocoded.status}`);
    const location = deliveryLocation(geocoded);
    const neighborhood = data.autoNeighborhood ? deliveryNeighborhood(geocoded) : "";
    const savedAddress = neighborhood ? deliveryAddress(`${data.address.trim()}, ${neighborhood}`) : address;
    const response = await fetch("https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": mapsKey, "Content-Type": "application/json", "X-Goog-FieldMask": "routes.distanceMeters,routes.duration" },
      body: JSON.stringify({ origin: { address: deliveryAddress(settings.delivery_origin) }, destination: { location: { latLng: location } }, travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE" }),
    });
    await checkResponse(response);
    const payload = await response.json() as { routes?: { distanceMeters?: number; duration?: string }[] };
    const route = payload.routes?.[0];
    if (!route?.duration || !/^\d+(\.\d+)?s$/.test(route.duration)) throw new Error("Não foi encontrada uma rota. Confira rua, número, cidade e CEP.");
    const km = (route.distanceMeters ?? 0) / 1000;
    if (!Number.isFinite(km) || km < 0) throw new Error("A rota retornou uma distância inválida. Confira o endereço e tente novamente.");
    const maxKm = Math.max(...settings.delivery_distance_tiers.map(t => t.upToKm));
    if (km > maxKm) throw new Error(`A rota até este endereço tem ${km.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km. A entrega atende até ${maxKm.toLocaleString("pt-BR")} km. Confira rua, número e cidade ou escolha retirada na loja.`);
    const fee = distanceFee(settings, km);
    const { data: saved, error: saveError } = await supabaseAdmin.from("delivery_quotes").insert({ session_id: session.id, address: savedAddress, settings_hash: hash, distance_km: km, fee }).select("id").single();
    if (saveError || !saved) throw new Error("Não foi possível guardar o cálculo. Tente novamente.");
    return { id: saved.id, address: savedAddress, km, fee, neighborhood };
  });