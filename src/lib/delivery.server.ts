import type { StoreSettings } from "./store-settings";

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
  const match = /^([0-9a-f-]{36}).(\d{1,16}).([0-9a-f]{64})$/.exec(token ?? "");
  if (!match) return null;
  const [, id, exp, sig] = match;
  if (Number(exp) < now) return null;
  const ok = await crypto.subtle.verify("HMAC", await signingKey(), fromHex(sig), encoder.encode(`${id}.${exp}`));
  return ok ? id : null;
}
export async function deliverySettingsHash(settings: StoreSettings) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(["aracatuba-v1", settings.delivery_origin, settings.delivery_distance_tiers, settings.delivery_enabled, settings.delivery_distance_enabled])));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
