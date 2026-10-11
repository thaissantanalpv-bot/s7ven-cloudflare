import { z } from "zod";

export const DAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const settingsSchema = z.object({
  delivery_enabled: z.boolean(),
  fixed_delivery_fee: z.number().min(0).max(1000).nullable().default(null),
  pickup_address: z.string().trim().max(300).default(""),
  delivery_zones: z.array(z.object({ id: z.string().min(1), name: z.string().trim().min(2, "Informe o bairro ou região").max(80), fee: z.number().min(0).max(1000) })).max(100),
  hours_enabled: z.boolean(),
  opening_hours: z.array(z.object({ day: z.number().int().min(0).max(6), enabled: z.boolean(), open: time, close: time })).length(7),
}).superRefine((s, ctx) => {
  if (s.delivery_enabled && s.fixed_delivery_fee === null && !s.delivery_zones.length) ctx.addIssue({ code: "custom", message: "Cadastre pelo menos uma região antes de ativar as taxas." });
  if (new Set(s.delivery_zones.map(z => z.name.toLocaleLowerCase())).size !== s.delivery_zones.length) ctx.addIssue({ code: "custom", message: "Cada região deve ter um nome diferente." });
  if (new Set(s.opening_hours.map(h => h.day)).size !== 7) ctx.addIssue({ code: "custom", message: "Informe os sete dias da semana." });
  if (s.hours_enabled && !s.opening_hours.some(h => h.enabled)) ctx.addIssue({ code: "custom", message: "Selecione pelo menos um dia de atendimento." });
  if (s.opening_hours.some(h => h.enabled && h.open === h.close)) ctx.addIssue({ code: "custom", message: "A abertura e o fechamento precisam ser diferentes." });
});
export type StoreSettings = z.infer<typeof settingsSchema>;
export const EMPTY_SETTINGS: StoreSettings = {
  delivery_enabled: false, fixed_delivery_fee: null, pickup_address: "", delivery_zones: [], hours_enabled: false,
  opening_hours: DAYS.map((_, day) => ({ day, enabled: false, open: "18:00", close: "23:00" })),
};
export function storeStatus(settings: StoreSettings, now = new Date(import.meta.env.DEV ? "2026-10-11T06:30:00Z" : Date.now())) {
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