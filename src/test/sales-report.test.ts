import { describe, expect, it } from "vitest";
import { salesPeriodRange, summarizeSales, type SalesRow } from "@/lib/sales-report";
const row = (total: number, status: SalesRow["status"] = "delivered", qty = 1): SalesRow => ({ created_at: "2026-10-16T23:00:00Z", status, total, items: [{ productId: "a", name: "Produto", option: "", optionLabel: "", qty, price: 10 }] });
describe("sales report", () => {
  it("excludes cancelled orders from sales and ticket, recording them separately", () => {
    const report = summarizeSales([row(20), row(40, "preparing", 2), row(100, "cancelled", 9)]);
    expect(report.revenue).toBe(60);
    expect(report.averageTicket).toBe(30);
    expect(report.orderCount).toBe(2);
    expect(report.cancelledTotal).toBe(100);
    expect(report.cancelledCount).toBe(1);
    expect(report.bestSellers[0]?.quantity).toBe(3);
    expect(report.bestSellers[0]?.revenue).toBe(30);
  });
  it("uses Sao Paulo day, Monday-start week and calendar month", () => {
    const now = new Date("2026-10-17T01:00:00Z");
    expect(salesPeriodRange("today", now).from).toBe("2026-10-16T00:00:00-03:00");
    expect(salesPeriodRange("today", now).until).toBe("2026-10-17T00:00:00-03:00");
    expect(salesPeriodRange("week", now).start).toBe("2026-10-12");
    expect(salesPeriodRange("month", now).start).toBe("2026-10-01");
  });
  it("handles empty sales without dividing by zero", () => { expect(summarizeSales([]).averageTicket).toBe(0); });
  it("ranks by quantity and groups options by product ID", () => {
    const second: SalesRow = { ...row(50), items: [{ productId: "b", name: "Segundo", qty: 5, price: 10, option: "Morango", optionLabel: "Sabor" }] };
    const report = summarizeSales([row(10), row(20, "received", 2), second]);
    expect(report.bestSellers.map(p => [p.id, p.quantity])).toEqual([["b", 5], ["a", 3]]);
  });
  it("does not double-count the value or units of combo components", () => {
    const combo = row(40);
    combo.items[0].components = [{ groupId: "g", productId: "b", name: "Segundo", qty: 3, option: "", price: 20 }];
    expect(summarizeSales([combo]).bestSellers).toEqual([{ id: "a", name: "Produto", quantity: 1, revenue: 10 }]);
  });
});