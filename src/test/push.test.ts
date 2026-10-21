import { afterEach, describe, expect, it, vi } from "vitest";
import { newOrderPush, pushSubscriptionSchema } from "@/lib/push";
import { sendPush, vapidPublicKeyFromJwk } from "@/lib/push.server";

const JWK = {
  kty: "EC",
  crv: "P-256",
  x: "vU3schxiEeDj3E-MB3_-mxSYNksl4j0IR30vIk2zKb8",
  y: "Ioj-y17SfYLCjAYjP3lvDkOgNeW4H0HPmZiFLlcjALo",
};

async function browserSubscription() {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const b64 = (b: Uint8Array) =>
    btoa(String.fromCharCode(...b))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return { p256dh: b64(raw), auth: b64(crypto.getRandomValues(new Uint8Array(16))) };
}

describe("aviso de pedido novo no celular", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("abre os pedidos no painel e identifica o pedido", () => {
    const push = newOrderPush({
      id: "abc",
      number: 57,
      customerName: "Ana",
      total: 45,
      fulfillment: "pickup",
      items: [{ qty: 2, name: "Carvão", option: "" }],
    });
    expect(push.url).toBe("/painel?aba=pedidos");
    expect(push.tag).toBe("order-abc");
    expect(push.title).toContain("#57");
  });

  it("aceita somente endereços de aviso seguros (https)", () => {
    const keys = { p256dh: "B".repeat(87), auth: "a".repeat(22) };
    expect(
      pushSubscriptionSchema.safeParse({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys })
        .success,
    ).toBe(true);
    expect(
      pushSubscriptionSchema.safeParse({ endpoint: "http://fcm.googleapis.com/fcm/send/x", keys })
        .success,
    ).toBe(false);
  });

  it("gera a chave pública de 65 bytes que o celular usa para se inscrever", () => {
    const key = vapidPublicKeyFromJwk(JWK);
    const bytes = Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/") + "="), (c) =>
      c.charCodeAt(0),
    );
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
  });

  it("remove aparelhos que pararam de aceitar avisos e segue enviando aos demais", async () => {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
    ]);
    vi.stubEnv(
      "VAPID_PRIVATE_JWK",
      JSON.stringify(await crypto.subtle.exportKey("jwk", pair.privateKey)),
    );
    const a = await browserSubscription();
    const b = await browserSubscription();
    const send = vi.fn(
      async (url: string | URL | Request) =>
        new Response(null, { status: String(url).includes("gone") ? 410 : 201 }),
    );
    const result = await sendPush(
      [
        { id: "1", endpoint: "https://push.example/gone", ...a },
        { id: "2", endpoint: "https://push.example/ok", ...b },
      ],
      { title: "t", body: "b", tag: "x", url: "/painel" },
      send as unknown as typeof fetch,
    );
    expect(send).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: 1, expired: ["1"] });
  });
});
