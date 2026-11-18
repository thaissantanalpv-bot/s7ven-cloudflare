import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { z } from 'zod';
import { distanceFee, settingsSchema } from './store-settings';
import { deliveryAddress } from './delivery-address';
import { orsSuggestions } from './openrouteservice';

export const startDeliverySession = createServerFn({ method: 'POST' }).handler(async () => {
  const { createDeliveryToken } = await import('./delivery.server');
  return { token: await createDeliveryToken() };
});

const suggestionSchema = z.object({
  input: z.string().trim().min(3).max(120),
  token: z.string().max(200),
  sessionToken: z.string().uuid(), // retained for checkout API compatibility
});

/** Autocomplete: independent per-network/global quotas, with a daily cap below free ORS geocoding quota. */
export const suggestDeliveryAddress = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => suggestionSchema.parse(input))
  .handler(async ({ data }) => {
    const { verifyDeliveryToken, claimAddressLookupBudget } = await import('./delivery.server');
    if (!await verifyDeliveryToken(data.token)) throw new Error('DELIVERY_SESSION_EXPIRED');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await claimAddressLookupBudget(supabaseAdmin, getRequestHeader('cf-connecting-ip') ?? 'unknown');
    const { orsAutocomplete } = await import('./openrouteservice.server');
    return { suggestions: orsSuggestions(await orsAutocomplete(data.input)) };
  });

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  token: z.string().max(200),
});

/** Reverse geocode only. Never infer missing house numbers from GPS. */
export const locateDeliveryAddress = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => locationSchema.parse(input))
  .handler(async ({ data }) => {
    const { verifyDeliveryToken, claimAddressLookupBudget } = await import('./delivery.server');
    if (!await verifyDeliveryToken(data.token)) throw new Error('DELIVERY_SESSION_EXPIRED');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await claimAddressLookupBudget(supabaseAdmin, getRequestHeader('cf-connecting-ip') ?? 'unknown');
    const { orsReverseGeocode } = await import('./openrouteservice.server');
    return orsReverseGeocode(data.latitude, data.longitude);
  });

export const quoteDelivery = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({
    address: z.string().trim().min(8).max(300), token: z.string().max(200),
    autoNeighborhood: z.boolean().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const { verifyDeliveryToken, deliverySettingsHash, claimMapsBudget } = await import('./delivery.server');
    const sessionId = await verifyDeliveryToken(data.token);
    if (!sessionId) throw new Error('DELIVERY_SESSION_EXPIRED');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: row, error } = await supabaseAdmin.from('store_settings').select('*').eq('id', 'main').single();
    if (error) throw new Error('Não foi possível conferir as taxas da loja.');
    const settings = settingsSchema.parse(row);
    if (!settings.delivery_enabled || !settings.delivery_distance_enabled) throw new Error('A entrega por km não está ativa.');
    const hash = await deliverySettingsHash(settings); // Includes ORS driving-car provider; old Google quotes invalid.
    const address = deliveryAddress(data.address);
    const since = new Date(Date.now() - 15 * 60000).toISOString();
    const { data: cached } = await supabaseAdmin.from('delivery_quotes')
      .select('id,distance_km,fee,duration_seconds').eq('session_id', sessionId)
      .eq('address', address).eq('settings_hash', hash).gte('created_at', since).limit(1).maybeSingle();
    if (cached && cached.duration_seconds !== null) return {
      id: cached.id, address, km: Number(cached.distance_km), fee: Number(cached.fee),
      routeDurationSeconds: Number(cached.duration_seconds), neighborhood: '',
    };
    const { count, error: countError } = await supabaseAdmin.from('delivery_quotes')
      .select('id', { head: true, count: 'exact' }).eq('session_id', sessionId).gte('created_at', since);
    if (countError || (count ?? 0) >= 10) throw new Error('Aguarde antes de calcular mais endereços.');
    await claimMapsBudget(supabaseAdmin, getRequestHeader('cf-connecting-ip') ?? 'unknown');
    const { orsGeocodeAddress, orsDrivingRoute } = await import('./openrouteservice.server');
    // No raw address/coordinates in Worker logs; ORS receives them only for the requested lookup.
    const [origin, destination] = await Promise.all([
      orsGeocodeAddress(deliveryAddress(settings.delivery_origin)),
      orsGeocodeAddress(address),
    ]);
    const { km, durationSeconds } = await orsDrivingRoute(origin, destination);
    const maxKm = Math.max(...settings.delivery_distance_tiers.map(t => t.upToKm));
    if (km > maxKm) throw new Error(`A rota estimada tem ${km.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km; a loja atende até ${maxKm.toLocaleString('pt-BR')} km. Confira o endereço ou escolha retirada.`);
    const fee = distanceFee(settings, km);
    const neighborhood = data.autoNeighborhood ? destination.neighborhood : '';
    const savedAddress = neighborhood ? deliveryAddress(`${data.address.trim()}, ${neighborhood}`) : address;
    const { data: saved, error: saveError } = await supabaseAdmin.from('delivery_quotes')
      .insert({ session_id: sessionId, address: savedAddress, settings_hash: hash,
        distance_km: km, fee, duration_seconds: durationSeconds }).select('id').single();
    if (saveError || !saved) throw new Error('Não foi possível guardar o cálculo. Tente novamente.');
    return { id: saved.id, address: savedAddress, km, fee, routeDurationSeconds: durationSeconds, neighborhood };
  });
