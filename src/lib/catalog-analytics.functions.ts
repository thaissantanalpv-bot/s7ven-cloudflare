import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyticsPeriodSchema, funnelStatsSchema, trackingSchema } from "./catalog-analytics";

export const trackCatalogVisit = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => trackingSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${new Date().toISOString().slice(0, 10)}:${ip}`));
    const rateKey = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("track_catalog_session", { _id: data.sessionId, _visitor: data.visitorId, _cart: data.hasCart, _rate_key: rateKey });
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