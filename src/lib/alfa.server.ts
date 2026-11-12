import { ALFA_BASE_URL } from "./alfa";

export async function alfaToken() {
  const id = process.env["ALFA_CLIENT_ID"], secret = process.env["ALFA_CLIENT_SECRET"];
  if (!id || !secret) throw new Error("A chave da Alfa Delivery não está configurada.");
  const res = await fetch(`${ALFA_BASE_URL}/oauth/token`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
  });
  if (!res.ok) { console.error(`Alfa token [${res.status}]: ${await res.text()}`); throw new Error("A Alfa recusou a chave de acesso."); }
  return ((await res.json()) as { access_token: string }).access_token;
}

export async function alfaRequest(path: string, token: string, body: unknown) {
  const res = await fetch(`${ALFA_BASE_URL}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Alfa ${path} [${res.status}]: ${text}`);
    let msg = "";
    try { const j = JSON.parse(text) as { message?: string; title?: string }; msg = j.message ?? j.title ?? ""; } catch { /* not json */ }
    throw new Error(`A Alfa não aceitou o pedido (${res.status})${msg ? `: ${msg}` : ""}.`);
  }
  return text ? JSON.parse(text) as Record<string, unknown> : {};
}

/** Constant-time check of the X-App-Signature header (hex HMAC-SHA256 of the raw body). */
export async function validAlfaSignature(rawBody: string, signature: string | null) {
  const secret = process.env["ALFA_CLIENT_SECRET"];
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = [...mac].map(b => b.toString(16).padStart(2, "0")).join("");
  const given = signature.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
