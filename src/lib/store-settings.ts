import { z } from "zod";
import { parseAppearance } from "./catalog-appearance";

export const DAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const couponSchema = z.object({
  code: z.string().trim().min(1).max(30),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive().max(100000),
  minOrder: z.number().min(0).default(0),
  active: z.boolean().default(true),
});
export type Coupon = z.infer<typeof couponSchema>;

const promoBannerSchema = z.object({
  enabled: z.boolean().default(false),
  text: z.string().trim().max(300).default(""),
  link: z.string().trim().max(500).default(""),
});
export type PromoBanner = z.infer<typeof promoBannerSchema>;

const specialDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().trim().max(60).default(""),
  enabled: z.boolean(),
  open: time,
  close: time,
});
export type SpecialDay = z.infer<typeof specialDaySchema>;

export const settingsSchema = z.object({
  promoBanner: promoBannerSchema.default({ enabled: false, text: "", link: "" }),
  coupons: z.array(couponSchema).max(100).default([]),
  delivery_enabled: z.boolean(),
  delivery_distance_enabled: z.boolean().default(false),
  delivery_origin: z.string().trim().max(300).default(""),
  delivery_distance_tiers: z.array(z.object({ id: z.string().min(1), upToKm: z.number().positive().max(500), fee: z.number().min(0).max(1000) })).max(50).default([]),
  fixed_delivery_fee: z.number().min(0).max(1000).nullable().default(null),
  pickup_address: z.string().trim().max(300).default(""),
  delivery_zones: z.array(z.object({ id: z.string().min(1), name: z.string().trim().min(2, "Informe o bairro ou região").max(80), fee: z.number().min(0).max(1000) })).max(100),
  hours_enabled: z.boolean(),
  opening_hours: z.array(z.object({ day: z.number().int().min(0).max(6), enabled: z.boolean(), open: time, close: time })).length(7),
  order_cutoff: time.default("23:00"),
  special_days: z.array(specialDaySchema).max(60).default([]),
  paused: z.boolean().default(false),
  /** Aparência do catálogo; salva somente por saveCatalogAppearance. */
  catalog_appearance: z.unknown().transform((v) => parseAppearance(v)).optional(),
}).superRefine((s, ctx) => {
  if (s.delivery_enabled && !s.delivery_distance_enabled && s.fixed_delivery_fee === null && !s.delivery_zones.length) ctx.addIssue({ code: "custom", message: "Cadastre pelo menos uma região antes de ativar as taxas." });
  if (s.delivery_distance_enabled && (s.delivery_origin.length < 8 || !s.delivery_distance_tiers.length)) ctx.addIssue({ code: "custom", message: "Informe o endereço completo de saída e pelo menos uma faixa de km." });
  if (new Set(s.delivery_distance_tiers.map(t => t.upToKm)).size !== s.delivery_distance_tiers.length) ctx.addIssue({ code: "custom", message: "Cada faixa precisa ter um limite de km diferente." });
  if (new Set(s.delivery_zones.map(z => z.name.toLocaleLowerCase())).size !== s.delivery_zones.length) ctx.addIssue({ code: "custom", message: "Cada região deve ter um nome diferente." });
  if (new Set(s.opening_hours.map(h => h.day)).size !== 7) ctx.addIssue({ code: "custom", message: "Informe os sete dias da semana." });
  if (s.hours_enabled && !s.opening_hours.some(h => h.enabled)) ctx.addIssue({ code: "custom", message: "Selecione pelo menos um dia de atendimento." });
  if (s.opening_hours.some(h => h.enabled && h.open === h.close)) ctx.addIssue({ code: "custom", message: "A abertura e o fechamento precisam ser diferentes." });
  if (new Set(s.special_days.map(d => d.date)).size !== s.special_days.length) ctx.addIssue({ code: "custom", message: "Cada data especial só pode aparecer uma vez." });
  if (s.special_days.some(d => d.enabled && d.open === d.close)) ctx.addIssue({ code: "custom", message: "Na data especial, a abertura e o fechamento precisam ser diferentes." });
});
export type StoreSettings = z.infer<typeof settingsSchema>;
export const EMPTY_SETTINGS: StoreSettings = {
  promoBanner: { enabled: false, text: "", link: "" },
  coupons: [],
  delivery_enabled: false, fixed_delivery_fee: null, pickup_address: "", delivery_zones: [], hours_enabled: false,
  delivery_distance_enabled: false, delivery_origin: "", delivery_distance_tiers: [],
  opening_hours: DAYS.map((_, day) => ({ day, enabled: false, open: "18:00", close: "23:00" })),
  order_cutoff: "23:00",
  special_days: [],
  paused: false,
};

export function applyCoupon(settings: StoreSettings, code: string, subtotal: number): { discount: number; label: string } | null {
  const coupon = settings.coupons.find(c => c.active && c.code.toUpperCase() === code.trim().toUpperCase());
  if (!coupon) return null;
  if (subtotal < coupon.minOrder) return null;
  const raw = coupon.type === "percent" ? subtotal * coupon.value / 100 : coupon.value;
  const discount = Math.min(Math.round(raw * 100) / 100, subtotal);
  const label = coupon.type === "percent" ? `${coupon.value}%` : `R$ ${coupon.value.toFixed(2).replace(".", ",")}`;
  return { discount, label };
}
export function distanceFee(settings: StoreSettings, distanceKm: number) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error("Distância inválida.");
  const tier = [...settings.delivery_distance_tiers].sort((a, b) => a.upToKm - b.upToKm).find(t => distanceKm <= t.upToKm);
  if (!tier) throw new Error("Endereço fora da área de entrega. Escolha retirada ou fale com a loja.");
  return tier.fee;
}
type Hours = { enabled: boolean; open: string; close: string };
const shiftIsoDay = (isoDay: string, days: number) => {
  const d = new Date(`${isoDay}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
/** Sao Paulo calendar date, weekday and HH:MM. */
export function saoPauloClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday")),
    current: `${part("hour")}:${part("minute")}`,
  };
}
/** Hours for one Sao Paulo date: a special day (holiday) replaces that weekday's regular hours. */
export function hoursForDate(settings: StoreSettings, isoDate: string): Hours & { special?: SpecialDay } {
  const special = settings.special_days.find(d => d.date === isoDate);
  if (special) return { enabled: special.enabled, open: special.open, close: special.close, special };
  const day = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  return settings.opening_hours.find(h => h.day === day) ?? { enabled: false, open: "00:00", close: "00:00" };
}
function currentWindow(settings: StoreSettings, now: Date) {
  const { date, current } = saoPauloClock(now);
  const today = hoursForDate(settings, date);
  const yesterday = hoursForDate(settings, shiftIsoDay(date, -1));
  const afterMidnight = !!(yesterday.enabled && yesterday.open > yesterday.close && current < yesterday.close);
  const todayOpen = !!(today.enabled && (today.open < today.close ? current >= today.open && current < today.close : current >= today.open));
  return { current, today, yesterday, afterMidnight, open: afterMidnight || todayOpen };
}
/** Upcoming special days (today onward), sorted by date. */
export function upcomingSpecialDays(settings: StoreSettings, now = new Date()) {
  const today = saoPauloClock(now).date;
  return settings.special_days.filter(d => d.date >= shiftIsoDay(today, -1)).sort((a, b) => a.date.localeCompare(b.date));
}

export function storeStatus(settings: StoreSettings, now = new Date()) {
  if (settings.paused) return { open: false, configured: true, label: "Pedidos pausados" };
  if (!settings.hours_enabled) return { open: true, configured: false, label: "Horários a confirmar" };
  const { open } = currentWindow(settings, now);
  return { open, configured: true, label: open ? "Aberto agora" : "Fechado agora" };
}

/**
 * Pedidos são aceitos enquanto a loja está aberta. Depois do horário limite das entregas
 * (ex.: 23:00) o pedido continua possível, mas somente para retirada, até a loja fechar.
 * Datas especiais (feriados) usam o mesmo horário limite das entregas.
 */
export function ordersOpen(settings: StoreSettings, now = new Date()) {
  if (settings.paused) return { open: false as const, delivery: false, configured: true, reason: "paused" as const, closesAt: null };
  const status = storeStatus(settings, now);
  if (!status.open) return { open: false as const, delivery: false, configured: status.configured, reason: "closed" as const, closesAt: null };
  const { current, today, yesterday, afterMidnight } = currentWindow(settings, now);
  const closesAt = !status.configured ? null : afterMidnight ? yesterday.close : today.enabled ? today.close : null;
  if (afterMidnight || current >= settings.order_cutoff) return { open: true as const, delivery: false, configured: status.configured, reason: "cutoff" as const, closesAt };
  return { open: true as const, delivery: true, configured: status.configured, reason: null, closesAt };
}

const WEEKDAYS_SHORT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
/** Next store opening as an instant plus a friendly label ("hoje às 16:00"); null when unknown or paused. Sao Paulo has no DST (UTC-3). */
export function nextOpeningAt(settings: StoreSettings, now = new Date()) {
  if (settings.paused || !settings.hours_enabled) return null;
  const { date, current } = saoPauloClock(now);
  for (let i = 0; i < 8; i++) {
    const day = shiftIsoDay(date, i);
    const h = hoursForDate(settings, day);
    if (!h.enabled || (i === 0 && h.open <= current)) continue;
    const label = i === 0 ? "hoje" : i === 1 ? "amanhã" : WEEKDAYS_SHORT[new Date(`${day}T12:00:00Z`).getUTCDay()];
    return { at: new Date(`${day}T${h.open}:00-03:00`), label: `${label} às ${h.open}` };
  }
  return null;
}
export function nextOpening(settings: StoreSettings, now = new Date()) {
  return nextOpeningAt(settings, now)?.label ?? null;
}

/** Lowest delivery fee a customer can expect, before typing an address; null when delivery is off or unpriced. */
export function deliveryFeeFrom(settings: StoreSettings) {
  if (!settings.delivery_enabled) return null;
  const fees = settings.delivery_distance_enabled && settings.delivery_distance_tiers.length
    ? settings.delivery_distance_tiers.map(t => t.fee)
    : settings.fixed_delivery_fee !== null ? [settings.fixed_delivery_fee]
    : settings.delivery_zones.map(z => z.fee);
  return fees.length ? Math.min(...fees) : null;
}
