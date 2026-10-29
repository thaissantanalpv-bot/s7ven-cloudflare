import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyticsPeriodSchema, funnelStatsSchema, trackingSchema } from "./catalog-analytics";

// Keyed hash so the stored value cannot be reversed into an IP address.
async function deviceKeyFor(ip: string, userAgent: string, hints: string) {
  const secret = process.env["DELIVERY_SESSION_SECRET"];
  if (!secret || ip === "unknown") return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(`catalog-device:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ip}|${userAgent.slice(0, 300)}|${hints}`));
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, "0")).join("");
}

export const trackCatalogVisit = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => trackingSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${new Date().toISOString().slice(0, 10)}:${ip}`));
    const rateKey = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
    const deviceKey = await deviceKeyFor(ip, getRequestHeader("user-agent") ?? "", data.device ?? "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("track_catalog_session", { _id: data.sessionId, _visitor: data.visitorId, _cart: data.hasCart, _rate_key: rateKey, _device: deviceKey ?? undefined });
    return { recorded: !error };
  });

export const getCatalogFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => analyticsPeriodSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Apenas a administradora pode consultar os indicadores.");
    const { data: stats, error } = await context.supabase.rpc("catalog_funnel_stats", { _period: data });
    if (error) throw new Error("Não foi possível carregar os indicadores.");
    return funnelStatsSchema.parse(stats);
  });