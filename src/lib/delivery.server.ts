import type { StoreSettings } from "./store-settings";
import { DELIVERY_TRAVEL_MODE } from "./delivery-route";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();

async function signingKey() {
  const password = process.env["DELIVERY_SESSION_SECRET"];
  if (!password) throw new Error("O cálculo de entrega ainda não está configurado.");
  return crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) => new Uint8Array((hex.match(/../g) ?? []).map(h => parseInt(h, 16)));

/** Signed delivery session token sent in the request body (works where cookies are blocked). */
export async function createDeliveryToken(now = Date.now()) {
  const id = crypto.randomUUID();
  const payload = `${id}.${now + TOKEN_TTL_MS}`;
  const sig = toHex(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(payload)));
  return `${payload}.${sig}`;
}
/** Returns the session id when the token is authentic and not expired. */
export async function verifyDeliveryToken(token: string | undefined, now = Date.now()) {
  const match = /^([0-9a-f-]{36})\.(\d{1,16})\.([0-9a-f]{64})$/.exec(token ?? "");
  if (!match) return null;
  const [, id, exp, sig] = match;
  if (!id || !exp || !sig) return null;
  if (Number(exp) < now) return null;
  const ok = await crypto.subtle.verify("HMAC", await signingKey(), fromHex(sig), encoder.encode(`${id}.${exp}`));
  return ok ? id : null;
}
export async function deliverySettingsHash(settings: StoreSettings) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(["aracatuba-v1", DELIVERY_TRAVEL_MODE, settings.delivery_origin, settings.delivery_distance_tiers, settings.delivery_enabled, settings.delivery_distance_enabled])));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}

/** New paid Maps calculations allowed per hour, store-wide and per network. */
export const DELIVERY_QUOTE_GLOBAL_HOURLY_LIMIT = 200;
export const DELIVERY_QUOTE_CLIENT_HOURLY_LIMIT = 20;

/** Address autocomplete and GPS geocoding use a different budget from chargeable quotes.
 * Limits are enforced in Postgres by claim_delivery_lookup_attempt; never trust client counters.
 * Install drizzle/migrations/0054_delivery_lookup_budget.sql in Supabase BR before deploying.
 */
export async function claimAddressLookupBudget(client: {
  rpc: (name: "claim_delivery_lookup_attempt", args: { _client_hash: string }) => PromiseLike<{ data: unknown; error: unknown }>;
}, ip: string) {
  const { data, error } = await client.rpc("claim_delivery_lookup_attempt", {
    _client_hash: await deliveryClientHash(ip),
  });
  if (error) {
    console.error('[S7VEN] lookup budget: RPC unavailable', { code: (error as { code?: string }).code ?? 'unknown' });
    throw new Error('Não foi possível verificar o limite de consultas de endereço. Tente novamente em instantes.');
  }
  if (data !== "ok") {
    throw new Error('Limite de sugestões de endereço atingido. Digite a rua e o número manualmente para tentar calcular a entrega.');
  }
}

/** Pseudonymous per-network key (HMAC of the caller IP); the raw IP is never stored. */
export async function deliveryClientHash(ip: string) {
  return toHex(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(`delivery-client:${ip}`)));
}

/** Shared existing store/network budget; failures always stop paid Maps calls. */
export async function claimMapsBudget(client: {
  rpc: (name: "claim_delivery_quote_attempt", args: { _client_hash: string; _global_limit: number; _client_limit: number }) => PromiseLike<{ data: unknown; error: unknown }>;
}, ip: string) {
  const { data, error } = await client.rpc("claim_delivery_quote_attempt", {
    _client_hash: await deliveryClientHash(ip),
    _global_limit: DELIVERY_QUOTE_GLOBAL_HOURLY_LIMIT,
    _client_limit: DELIVERY_QUOTE_CLIENT_HOURLY_LIMIT,
  });
  if (error || data !== "ok") throw new Error("Muitas buscas de endereço agora. Digite o endereço ou tente em instantes.");
}
