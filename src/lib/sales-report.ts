import type { Order } from "./orders";

export type SalesPeriod = "today" | "week" | "month";
export type SalesRow = Pick<Order, "created_at" | "status" | "total" | "items"> & Partial<Pick<Order, "payment">>;
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
  const paymentMethods: Record<string, { count: number; total: number }> = {};
  for (const row of rows) {
    if (row.status === "cancelled") continue;
    const method = row.payment || "Não especificado";
    const prev = paymentMethods[method] ?? { count: 0, total: 0 };
    prev.count += 1;
    prev.total = Math.round((prev.total + row.total) * 100) / 100;
    paymentMethods[method] = prev;
  }
  return {
    revenue: revenueCents / 100,
    cancelledTotal: cancelledCents / 100,
    orderCount: count,
    cancelledCount,
    averageTicket: count ? Math.round(revenueCents / count) / 100 : 0,
    paymentMethods,
    bestSellers: [...products.values()].sort((a, b) => b.quantity - a.quantity || b.cents - a.cents || a.id.localeCompare(b.id)).slice(0, 10).map(({ cents, ...p }) => ({ ...p, revenue: cents / 100 }))
  };
}
export type HistoryPeriod = "today" | "7d" | "30d" | "month" | "lastMonth" | "all";
const shiftDay = (isoDay: string, days: number) => {
  const d = new Date(`${isoDay}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
/** Sao Paulo calendar days; `end` is exclusive. `all` returns null bounds. */
export function historyPeriodRange(period: HistoryPeriod, now = new Date()): { start: string | null; end: string } {
  const today = localDate(now);
  const end = shiftDay(today, 1);
  if (period === "today") return { start: today, end };
  if (period === "7d") return { start: shiftDay(today, -6), end };
  if (period === "30d") return { start: shiftDay(today, -29), end };
  const firstOfMonth = `${today.slice(0, 8)}01`;
  if (period === "month") return { start: firstOfMonth, end };
  if (period === "lastMonth") {
    const prev = new Date(`${firstOfMonth}T12:00:00Z`);
    prev.setUTCMonth(prev.getUTCMonth() - 1);
    return { start: prev.toISOString().slice(0, 10), end: firstOfMonth };
  }
  return { start: null, end };
}
export const salesDay = (value: string) => localDate(new Date(value));
export function inSalesRange(createdAt: string, range: { start: string | null; end: string }) {
  const d = salesDay(createdAt);
  return (!range.start || d >= range.start) && d < range.end;
}
/** One point per Sao Paulo day (gaps filled with zero), cancelled orders excluded. */
export function dailySales(rows: Pick<SalesRow, "created_at" | "status" | "total">[], range: { start: string | null; end: string }) {
  const totals = new Map<string, { cents: number; count: number }>();
  let first = range.start;
  for (const row of rows) {
    if (row.status === "cancelled") continue;
    const d = salesDay(row.created_at);
    if (range.start && d < range.start) continue;
    if (d >= range.end) continue;
    if (!first || d < first) first = d;
    const cur = totals.get(d) ?? { cents: 0, count: 0 };
    cur.cents += Math.round(row.total * 100);
    cur.count++;
    totals.set(d, cur);
  }
  if (!first) return [];
  const points: { date: string; revenue: number; count: number }[] = [];
  for (let d = first; d < range.end && points.length < 800; d = shiftDay(d, 1)) {
    const cur = totals.get(d);
    points.push({ date: d, revenue: (cur?.cents ?? 0) / 100, count: cur?.count ?? 0 });
  }
  return points;
}
