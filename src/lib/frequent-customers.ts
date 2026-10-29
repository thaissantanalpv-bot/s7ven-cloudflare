import type { OrderStatus } from "./orders";

export const CUSTOMER_WINDOWS = [30, 90, 365] as const;
export type CustomerWindow = (typeof CUSTOMER_WINDOWS)[number];
export type CustomerOrderRow = { customer_name: string; customer_phone: string; total: number; status: OrderStatus; created_at: string };
export type FrequentCustomer = { phone: string; name: string; orders: number; spent: number; lastOrderAt: string };

/** Same person = same WhatsApp number, regardless of formatting or +55 prefix. */
export function customerKey(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const national = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  return national.length === 10 || national.length === 11 ? `55${national}` : "";
}

export function rankFrequentCustomers(rows: CustomerOrderRow[], limit = 20): FrequentCustomer[] {
  const map = new Map<string, { phone: string; name: string; orders: number; cents: number; lastOrderAt: string }>();
  for (const row of rows) {
    if (row.status === "cancelled") continue;
    const phone = customerKey(row.customer_phone);
    if (!phone) continue;
    const current = map.get(phone) ?? { phone, name: row.customer_name, orders: 0, cents: 0, lastOrderAt: row.created_at };
    current.orders += 1;
    current.cents += Math.round(row.total * 100);
    if (row.created_at >= current.lastOrderAt) {
      current.lastOrderAt = row.created_at;
      current.name = row.customer_name.trim() || current.name;
    }
    map.set(phone, current);
  }
  return [...map.values()]
    .sort((a, b) => b.orders - a.orders || b.cents - a.cents || b.lastOrderAt.localeCompare(a.lastOrderAt))
    .slice(0, limit)
    .map(({ cents, ...c }) => ({ ...c, spent: cents / 100 }));
}

export const INACTIVE_AFTER_DAYS = 30;
const DAY = 86_400_000;
export function daysSinceLastOrder(lastOrderAt: string, now = new Date()) {
  return Math.floor((now.getTime() - new Date(lastOrderAt).getTime()) / DAY);
}
/** Reminder is offered only after a full month without buying. */
export function canSendReminder(lastOrderAt: string, now = new Date()) {
  return daysSinceLastOrder(lastOrderAt, now) >= INACTIVE_AFTER_DAYS;
}
export function reminderMessage(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return [
    `Oi${first ? `, ${first}` : ""}! Tudo bem? Aqui é da S7VEN Lounge e Tabacaria.`,
    "Faz um tempinho que você não pede com a gente. Está precisando de alguma coisa?",
    "Estamos à disposição! Veja nosso catálogo e faça seu pedido: https://s7venlounge.shop",
  ].join("\n\n");
}
export function reminderLink(customer: Pick<FrequentCustomer, "phone" | "name">) {
  return `https://wa.me/${customer.phone}?text=${encodeURIComponent(reminderMessage(customer.name))}`;
}
