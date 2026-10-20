import { z } from "zod";

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
}).superRefine((s, ctx) => {
  if (s.delivery_enabled && !s.delivery_distance_enabled && s.fixed_delivery_fee === null && !s.delivery_zones.length) ctx.addIssue({ code: "custom", message: "Cadastre pelo menos uma região antes de ativar as taxas." });
  if (s.delivery_distance_enabled && (s.delivery_origin.length < 8 || !s.delivery_distance_tiers.length)) ctx.addIssue({ code: "custom", message: "Informe o endereço completo de saída e pelo menos uma faixa de km." });
  if (new Set(s.delivery_distance_tiers.map(t => t.upToKm)).size !== s.delivery_distance_tiers.length) ctx.addIssue({ code: "custom", message: "Cada faixa precisa ter um limite de km diferente." });
  if (new Set(s.delivery_zones.map(z => z.name.toLocaleLowerCase())).size !== s.delivery_zones.length) ctx.addIssue({ code: "custom", message: "Cada região deve ter um nome diferente." });
  if (new Set(s.opening_hours.map(h => h.day)).size !== 7) ctx.addIssue({ code: "custom", message: "Informe os sete dias da semana." });
  if (s.hours_enabled && !s.opening_hours.some(h => h.enabled)) ctx.addIssue({ code: "custom", message: "Selecione pelo menos um dia de atendimento." });
  if (s.opening_hours.some(h => h.enabled && h.open === h.close)) ctx.addIssue({ code: "custom", message: "A abertura e o fechamento precisam ser diferentes." });
});
export type StoreSettings = z.infer<typeof settingsSchema>;
export const EMPTY_SETTINGS: StoreSettings = {
  promoBanner: { enabled: false, text: "", link: "" },
  coupons: [],
  delivery_enabled: false, fixed_delivery_fee: null, pickup_address: "", delivery_zones: [], hours_enabled: false,
  delivery_distance_enabled: false, delivery_origin: "", delivery_distance_tiers: [],
  opening_hours: DAYS.map((_, day) => ({ day, enabled: false, open: "18:00", close: "23:00" })),
  order_cutoff: "23:00",
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
export function storeStatus(settings: StoreSettings, now = new Date()) {
  if (!settings.hours_enabled) return { open: true, configured: false, label: "Horários a confirmar" };
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday"));
  const current = `${part("hour")}:${part("minute")}`;
  const today = settings.opening_hours.find(h => h.day === day);
  const yesterday = settings.opening_hours.find(h => h.day === (day + 6) % 7);
  const afterMidnight = yesterday?.enabled && yesterday.open > yesterday.close && current < yesterday.close;
  const open = !!(afterMidnight || (today?.enabled && (today.open < today.close ? current >= today.open && current < today.close : current >= today.open)));
  return { open, configured: true, label: open ? "Aberto agora" : "Fechado agora" };
}

/** Pedidos só são aceitos enquanto a loja está aberta e antes do horário limite (ex.: entregas até 23:00). */
export function ordersOpen(settings: StoreSettings, now = new Date()) {
  const status = storeStatus(settings, now);
  if (!status.open) return { open: false as const, configured: status.configured, reason: "closed" as const };
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday"));
  const current = `${part("hour")}:${part("minute")}`;
  const yesterday = settings.opening_hours.find(h => h.day === (day + 6) % 7);
  const afterMidnight = !!(yesterday?.enabled && yesterday.open > yesterday.close && current < yesterday.close);
  if (afterMidnight || current >= settings.order_cutoff) return { open: false as const, configured: status.configured, reason: "cutoff" as const };
  return { open: true as const, configured: status.configured, reason: null };
}