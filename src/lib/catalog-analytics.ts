import { z } from "zod";

export const analyticsIdentitySchema = z.object({ sessionId: z.string().uuid(), visitorId: z.string().uuid() });
export const trackingSchema = analyticsIdentitySchema.extend({ hasCart: z.boolean() });
export const analyticsPeriodSchema = z.enum(["today", "7d", "30d", "all"]);
export const funnelStatsSchema = z.object({
  visitors: z.number().int().nonnegative(), carts: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(), abandoned: z.number().int().nonnegative(),
  online: z.number().int().nonnegative(), pending: z.number().int().nonnegative(),
  updatedAt: z.string(), trackingSince: z.string().nullable(),
});
export type AnalyticsIdentity = z.infer<typeof analyticsIdentitySchema>;

export function readAnalyticsIdentity(): AnalyticsIdentity | undefined {
  try {
    let visitorId = localStorage.getItem("s7ven-visitor");
    if (!z.string().uuid().safeParse(visitorId).success) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("s7ven-visitor", visitorId);
    }
    let sessionId = sessionStorage.getItem("s7ven-session");
    const last = Number(sessionStorage.getItem("s7ven-session-seen") ?? 0);
    if (!z.string().uuid().safeParse(sessionId).success || Date.now() - last > 30 * 60 * 1000) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("s7ven-session", sessionId);
    }
    sessionStorage.setItem("s7ven-session-seen", String(Date.now()));
    return analyticsIdentitySchema.parse({ sessionId, visitorId });
  } catch { return undefined; }
}