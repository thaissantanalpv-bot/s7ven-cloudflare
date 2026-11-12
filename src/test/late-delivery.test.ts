import { describe, expect, it } from "vitest";
import { EMPTY_SETTINGS, ordersOpen } from "@/lib/store-settings";
import { priceOrder, submitOrderSchema } from "@/lib/orders";

const week = [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, enabled: true, open: "16:00", close: "03:00" }));
const settings = { ...EMPTY_SETTINGS, hours_enabled: true, opening_hours: week, order_cutoff: "23:00", delivery_enabled: true, fixed_delivery_fee: 7 };

describe("entrega pela 99 após as 23:00", () => {
  it("entrega normal antes das 23:00", () => {
    expect(ordersOpen(settings, new Date("2026-11-13T01:30:00Z")).late).toBe(false); // 22:30 SP
  });
  it("entrega pela 99 depois das 23:00", () => {
    const s = ordersOpen(settings, new Date("2026-11-13T02:30:00Z")); // 23:30 SP
    expect(s.delivery).toBe(true);
    expect(s.late).toBe(true);
  });
  it("entrega pela 99 até as 02:00 e depois só retirada", () => {
    expect(ordersOpen(settings, new Date("2026-11-13T04:59:00Z")).late).toBe(true); // 01:59 SP
    const after = ordersOpen(settings, new Date("2026-11-13T05:01:00Z")); // 02:01 SP
    expect(after.delivery).toBe(false);
  });
  it("só aceita Pix e não cobra a taxa da loja (taxa da 99 combinada depois)", () => {
    const order = (payment: string) => submitOrderSchema.parse({ requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", customer: { name: "Ana", phone: "(18) 99999-9999", address: "Rua A, 1", payment, zone: "" }, items: [{ productId: "p4", qty: 1, option: "Melancia" }] });
    expect(() => priceOrder(order("Dinheiro"), settings, undefined, undefined, undefined, true)).toThrow("Pix");
    expect(priceOrder(order("Pix"), settings, undefined, undefined, undefined, true).delivery_fee).toBe(0);
  });
});
