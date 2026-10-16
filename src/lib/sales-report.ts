import type { Order } from "./orders";

export type SalesPeriod = "today" | "week" | "month";
export type SalesRow = Pick<Order, "created_at" | "status" | "total" | "items">;
const localDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
export function salesPeriodRange(period: SalesPeriod, now = new Date()) {
  const today = localDate(now);
  const calendar = new Date(`${today}T12:00:00Z`);
  if (period === "week") calendar.setUTCDate(calendar.getUTCDate() - (calendar.getUTCDay() + 6) % 7);
  if (period === "month") calendar.setUTCDate(1);
  const start = calendar.toISOString().slice(0, 10);
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { start, end: tomorrow.toISOString().slice(0, 10), from: `${start}T00:00:00-03:00`, until: `${tomorrow.toISOString().slice(0, 10)}T00:00:00-03:00` };
}
export function summarizeSales(rows: SalesRow[]) {
  let revenueCents = 0, cancelledCents = 0, count = 0, cancelledCount = 0;
  const products = new Map<string, { id: string; name: string; quantity: number; cents: number }>();
  for (const row of rows) {
    if (row.status === "cancelled") { cancelledCents += Math.round(row.total * 100); cancelledCount++; continue; }
    revenueCents += Math.round(row.total * 100); count++;
    for (const item of row.items) {
      const current = products.get(item.productId) ?? { id: item.productId, name: item.name, quantity: 0, cents: 0 };
      current.quantity += item.qty;
      current.cents += Math.round(item.price * 100) * item.qty;
      products.set(item.productId, current);
    }
  }
  return { revenue: revenueCents / 100, cancelledTotal: cancelledCents / 100, orderCount: count, cancelledCount, averageTicket: count ? Math.round(revenueCents / count) / 100 : 0, bestSellers: [...products.values()].sort((a, b) => b.quantity - a.quantity || b.cents - a.cents || a.id.localeCompare(b.id)).slice(0, 10).map(({ cents, ...p }) => ({ ...p, revenue: cents / 100 })) };
}