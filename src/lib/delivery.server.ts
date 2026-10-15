import { useSession } from "@tanstack/react-start/server";
import type { StoreSettings } from "./store-settings";

export async function deliverySession() {
  const password = process.env["DELIVERY_SESSION_SECRET"];
  if (!password) throw new Error("O cálculo de entrega ainda não está configurado.");
  return useSession<{ ready: boolean }>({ password, name: "s7ven-delivery", maxAge: 86400, cookie: { httpOnly: true, sameSite: "lax", secure: process.env["NODE_ENV"] === "production" } });
}
export async function deliverySettingsHash(settings: StoreSettings) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([settings.delivery_origin, settings.delivery_distance_tiers, settings.delivery_enabled, settings.delivery_distance_enabled])));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}