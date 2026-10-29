import { z } from "zod";

export const analyticsIdentitySchema = z.object({ sessionId: z.string().uuid(), visitorId: z.string().uuid() });
export const trackingSchema = analyticsIdentitySchema.extend({ hasCart: z.boolean(), device: z.string().max(120).regex(/^[\w./:@+\- ]*$/).optional() });

/** Visits from the editor preview and local tests are not real customers. */
export function shouldTrackHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return false;
  return !(host.endsWith(".lovable.app") && (host.includes("preview--") || host.endsWith("-dev.lovable.app")));
}

/** Coarse, stable traits of the screen/browser; combined server-side with the network to recognise a device whose storage was cleared. */
export function deviceHints() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    return `${screen.width}x${screen.height}@${window.devicePixelRatio ?? 1} ${navigator.hardwareConcurrency ?? 0} ${navigator.language ?? ""} ${tz}`.replace(/[^\w./:@+\- ]/g, "").slice(0, 120);
  } catch { return ""; }
}
export const analyticsPeriodSchema = z.enum(["today", "7d", "30d", "all"]);
export const funnelStatsSchema = z.object({
  visitors: z.number().int().nonnegative(), carts: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(), abandoned: z.number().int().nonnegative(),
  online: z.number().int().nonnegative(), pending: z.number().int().nonnegative(),
  updatedAt: z.string(), trackingSince: z.string().nullable(),
});
export type AnalyticsIdentity = z.infer<typeof analyticsIdentitySchema>;
let fallbackIdentity: AnalyticsIdentity | undefined;

const VISITOR_COOKIE = "s7ven-visitor";

function readVisitorCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${VISITOR_COOKIE}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeVisitorCookie(visitorId: string) {
  // Um ano, mesmo site: reforça a identidade do aparelho se o armazenamento local for limpo.
  // Shared between s7venlounge.shop and www.s7venlounge.shop so both count as one device.
  const domain = location.hostname.endsWith("s7venlounge.shop") ? "; domain=.s7venlounge.shop" : "";
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(visitorId)}; max-age=31536000; path=/; samesite=lax${domain}`;
}

export function readAnalyticsIdentity(): AnalyticsIdentity | undefined {
  try {
    const stored = [readVisitorCookie(), localStorage.getItem("s7ven-visitor")]
      .find((candidate): candidate is string => z.string().uuid().safeParse(candidate).success);
    const visitorId = stored ?? crypto.randomUUID();
    localStorage.setItem("s7ven-visitor", visitorId);
    writeVisitorCookie(visitorId);
    let sessionId = sessionStorage.getItem("s7ven-session");
    const last = Number(sessionStorage.getItem("s7ven-session-seen") ?? 0);
    if (!z.string().uuid().safeParse(sessionId).success || Date.now() - last > 30 * 60 * 1000) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("s7ven-session", sessionId);
    }
    sessionStorage.setItem("s7ven-session-seen", String(Date.now()));
    return analyticsIdentitySchema.parse({ sessionId, visitorId });
  } catch {
    // Storage restrictions must not lose successful checkout conversion.
    fallbackIdentity ??= { sessionId: crypto.randomUUID(), visitorId: crypto.randomUUID() };
    return fallbackIdentity;
  }
}