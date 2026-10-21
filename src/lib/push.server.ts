// Server-only: sends Web Push notifications to the store admins' devices.
import { buildPushHTTPRequest } from "@pushforge/builder";
import type { PushPayload } from "./push";

type StoredSubscription = { id: string; endpoint: string; p256dh: string; auth: string };

function privateJwk(): JsonWebKey & { x: string; y: string } {
  const raw = process.env["VAPID_PRIVATE_JWK"];
  if (!raw) throw new Error("VAPID_PRIVATE_JWK is not configured");
  const jwk = JSON.parse(raw) as JsonWebKey;
  if (!jwk.x || !jwk.y || !jwk.d) throw new Error("VAPID_PRIVATE_JWK is invalid");
  return jwk as JsonWebKey & { x: string; y: string };
}

function b64urlToBytes(value: string) {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function bytesToB64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Uncompressed P-256 public key (0x04 || x || y) the browser needs to subscribe. */
export function vapidPublicKeyFromJwk(jwk: { x: string; y: string }) {
  const x = b64urlToBytes(jwk.x);
  const y = b64urlToBytes(jwk.y);
  const key = new Uint8Array(65);
  key[0] = 4;
  key.set(x, 1);
  key.set(y, 33);
  return bytesToB64url(key);
}

export function vapidPublicKey() {
  return vapidPublicKeyFromJwk(privateJwk());
}

/** Sends to each device independently; returns the ids the push service reported as gone. */
export async function sendPush(subscriptions: StoredSubscription[], payload: PushPayload, send: typeof fetch = fetch) {
  const jwk = privateJwk();
  const results = await Promise.allSettled(
    subscriptions.map(async (s) => {
      const { endpoint, headers, body } = await buildPushHTTPRequest({
        privateJWK: jwk,
        subscription: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        message: { payload, adminContact: "https://s7venlounge.shop", options: { ttl: 4 * 3600, urgency: "high" } },
      });
      const response = await send(endpoint, { method: "POST", headers, body, signal: AbortSignal.timeout(6000) });
      if (response.status === 404 || response.status === 410) return { id: s.id, gone: true };
      if (!response.ok) throw new Error(`Push failed [${response.status}]: ${await response.text()}`);
      return { id: s.id, gone: false };
    }),
  );
  const expired: string[] = [];
  let sent = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      if (r.value.gone) expired.push(r.value.id);
      else sent++;
    } else console.error("Falha ao enviar notificação:", r.reason);
  }
  return { sent, expired };
}

/** Notifies every registered admin device about a new catalog order. Never throws. */
export async function notifyAdminsPush(payload: PushPayload) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    if (!data?.length) return;
    const { expired } = await sendPush(data, payload);
    if (expired.length) await supabaseAdmin.from("admin_push_subscriptions").delete().in("id", expired);
  } catch (error) {
    console.error("Falha ao enviar aviso no celular:", error);
  }
}
