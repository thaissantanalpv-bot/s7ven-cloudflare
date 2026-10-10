import { describe, expect, it } from "vitest";
import {
  customerSchema,
  submitOrderSchema,
  priceOrder,
  orderWhatsApp,
  ORDER_STAGES,
} from "@/lib/orders";
import { EMPTY_SETTINGS } from "@/lib/store-settings";
const input = () =>
  submitOrderSchema.parse({
    requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    customer: {
      name: "Cliente teste",
      phone: "(18) 99999-9999",
      address: "Rua de teste, 123",
      payment: "Pix",
      zone: "centro",
    },
    items: [{ productId: "p4", qty: 2, option: "Melancia" }],
  });
describe("Orders", () => {
  it("requires phone with DDD and normalizes it", () => {
    expect(input().customer.phone).toBe("5518999999999");
    expect(customerSchema.safeParse({ ...input().customer, phone: "99999" }).success).toBe(false);
  });
  it("calculates prices from the real catalog including delivery", () => {
    const priced = priceOrder(input(), {
      ...EMPTY_SETTINGS,
      delivery_enabled: true,
      delivery_zones: [{ id: "centro", name: "Centro", fee: 5 }],
    });
    expect(priced.subtotal).toBe(41.8);
    expect(priced.total).toBe(46.8);
    expect(priced.items[0]?.option).toBe("Melancia");
  });
  it("rejects nonexistent products, missing flavors and invalid regions", () => {
    expect(() =>
      priceOrder(
        { ...input(), items: [{ productId: "missing", qty: 1, option: "" }] },
        EMPTY_SETTINGS,
      ),
    ).toThrow();
    expect(() =>
      priceOrder({ ...input(), items: [{ productId: "p4", qty: 1, option: "" }] }, EMPTY_SETTINGS),
    ).toThrow();
    expect(() => priceOrder(input(), { ...EMPTY_SETTINGS, delivery_enabled: true })).toThrow();
  });
  it("rejects zero/negative quantities and unsupported payment", () => {
    expect(
      submitOrderSchema.safeParse({ ...input(), items: [{ productId: "p1", qty: -1, option: "" }] })
        .success,
    ).toBe(false);
    expect(customerSchema.safeParse({ ...input().customer, payment: "invalid" }).success).toBe(
      false,
    );
  });
  it("builds the customer WhatsApp update for every stage", () => {
    for (const stage of ORDER_STAGES) {
      const url = new URL(
        orderWhatsApp({
          number: 42,
          customer_name: "Cliente",
          customer_phone: "18999999999",
          status: stage.id,
        }),
      );
      expect(url.pathname).toBe("/5518999999999");
      expect(url.searchParams.get("text")).toContain(stage.message);
      expect(url.searchParams.get("text")).toContain("#42");
    }
  });
});
