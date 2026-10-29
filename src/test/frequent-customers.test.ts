import { describe, expect, it } from "vitest";
import { customerKey, rankFrequentCustomers, type CustomerOrderRow } from "@/lib/frequent-customers";

const row = (phone: string, total: number, created_at: string, name = "Ana", status: CustomerOrderRow["status"] = "delivered"): CustomerOrderRow => ({ customer_name: name, customer_phone: phone, total, status, created_at });

describe("frequent customers", () => {
  it("treats differently formatted copies of the same WhatsApp as one customer", () => {
    expect(customerKey("(18) 99151-1004")).toBe("5518991511004");
    expect(customerKey("5518991511004")).toBe("5518991511004");
    expect(customerKey("+55 18 99151-1004")).toBe("5518991511004");
  });
  it("counts orders and total spent per customer, ignoring cancelled orders", () => {
    const [ana] = rankFrequentCustomers([
      row("5518991511004", 30, "2026-10-01T10:00:00Z"),
      row("(18) 99151-1004", 20.5, "2026-10-02T10:00:00Z"),
      row("18991511004", 100, "2026-10-03T10:00:00Z", "Ana", "cancelled"),
    ]);
    expect(ana.orders).toBe(2);
    expect(ana.spent).toBe(50.5);
  });
  it("ranks by number of orders first, then by amount spent", () => {
    const ranked = rankFrequentCustomers([
      row("18911111111", 500, "2026-10-01T10:00:00Z", "Gasta muito"),
      row("18922222222", 10, "2026-10-01T10:00:00Z", "Volta sempre"),
      row("18922222222", 10, "2026-10-02T10:00:00Z", "Volta sempre"),
      row("18933333333", 20, "2026-10-01T10:00:00Z", "Empate maior"),
      row("18933333333", 20, "2026-10-02T10:00:00Z", "Empate maior"),
    ]);
    expect(ranked.map((c) => c.name)).toEqual(["Empate maior", "Volta sempre", "Gasta muito"]);
  });
  it("shows the name from the latest order and skips orders without a phone", () => {
    const ranked = rankFrequentCustomers([
      row("18991511004", 10, "2026-10-01T10:00:00Z", "Aninha"),
      row("18991511004", 10, "2026-10-05T10:00:00Z", "Ana Paula"),
      row("", 50, "2026-10-05T10:00:00Z", "Balcão"),
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].name).toBe("Ana Paula");
    expect(ranked[0].lastOrderAt).toBe("2026-10-05T10:00:00Z");
  });
});
