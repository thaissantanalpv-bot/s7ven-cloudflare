import { describe, expect, it } from "vitest";
import {
  customerSchema,
  submitOrderSchema,
  priceOrder,
  orderWhatsApp,
  trackingUrlSchema,
  ORDER_STAGES,
  validateCartAvailability,
} from "@/lib/orders";
import { EMPTY_SETTINGS } from "@/lib/store-settings";
import { mergeCatalog } from "@/lib/catalog";
import { WHATSAPP_NUMBER } from "@/lib/products";
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
  it("always requires name and WhatsApp for delivery and pickup", () => {
    for (const fulfillment of ["delivery", "pickup"] as const) {
      for (const patch of [{ name: "" }, { name: "   " }, { phone: "" }, { phone: "18999" }]) {
        const customer = { ...input().customer, fulfillment, ...patch };
        expect(customerSchema.safeParse(customer).success).toBe(false);
        expect(submitOrderSchema.safeParse({ ...input(), customer }).success).toBe(false);
      }
    }
  });
  it("charges the fixed fee without region, ignores old zones and keeps pickup free", () => {
    const settings = { ...EMPTY_SETTINGS, delivery_enabled: true, fixed_delivery_fee: 9, pickup_address: "Rua Marechal Deodoro, nº 1696", delivery_zones: [{ id: "centro", name: "Centro", fee: 25 }] };
    const delivery = priceOrder({ ...input(), customer: { ...input().customer, zone: "" } }, settings);
    expect(delivery.delivery_fee).toBe(9);
    expect(delivery.total).toBe(50.8);
    expect(priceOrder(input(), settings).total).toBe(50.8);
    const pickup = priceOrder({ ...input(), customer: { ...input().customer, fulfillment: "pickup", address: "" } }, settings);
    expect(pickup.delivery_fee).toBe(0);
    expect(pickup.total).toBe(41.8);
  });
  it("allows pickup without address or region and never charges delivery", () => {
    const customer = customerSchema.parse({ ...input().customer, fulfillment: "pickup", address: "", zone: "invalid" });
    const priced = priceOrder({ ...input(), customer }, { ...EMPTY_SETTINGS, delivery_enabled: true, delivery_zones: [{ id: "centro", name: "Centro", fee: 5 }] });
    expect(priced.delivery_fee).toBe(0);
    expect(priced.delivery_zone).toBe("");
    expect(priced.total).toBe(priced.subtotal);
    expect(customerSchema.safeParse({ ...customer, payment: "" }).success).toBe(false);
    expect(customerSchema.safeParse({ ...customer, fulfillment: "delivery" }).success).toBe(false);
  });
  it("uses the updated order completion WhatsApp", () => {
    expect(WHATSAPP_NUMBER).toBe("5518991511004");
  });
  it("requires a complete address and selected supported payment on both checkout schemas", () => {
    for (const patch of [{ address: "" }, { address: "        " }, { address: "Rua" }, { payment: "" }, { payment: "   " }, { payment: "não existe" }]) {
      const customer = { ...input().customer, ...patch };
      expect(customerSchema.safeParse(customer).success).toBe(false);
      expect(submitOrderSchema.safeParse({ ...input(), customer }).success).toBe(false);
    }
  });
  it("rejects missing products, invalid quantities and empty carts", () => {
    const products = mergeCatalog([]);
    expect(() => validateCartAvailability([], products)).toThrow("vazio");
    expect(() => validateCartAvailability([{ productId: "missing", option: "", qty: 1 }], products)).toThrow("não está mais disponível");
    for (const qty of [0, -1, 1.5, 100, NaN]) {
      expect(() => validateCartAvailability([{ productId: "p1", option: "", qty }], products)).toThrow("quantidade");
    }
  });
  it("checks paused products, flavors and aggregate stock across cart lines", () => {
    const original = mergeCatalog([]).find(p => p.id === "p4");
    if (!original) throw new Error("Missing fixture");
    const product = { ...original, stock: 3, allowOther: false, variations: [
      { name: "Melancia", active: true, stock: 2 },
      { name: "Morango", active: true, stock: 2 },
    ] };
    const first = { productId: "p4", option: "Melancia", qty: 2 };
    const lines = [first, { productId: "p4", option: "Morango", qty: 2 }];
    expect(() => validateCartAvailability(lines, [product])).toThrow("quantidade indisponível");
    expect(() => priceOrder({ ...input(), items: lines }, EMPTY_SETTINGS, [product])).toThrow("quantidade indisponível");
    expect(() => validateCartAvailability([first, { ...first, qty: 1 }], [product])).toThrow();
    expect(() => validateCartAvailability([first], [{ ...product, active: false }])).toThrow();
    expect(() => validateCartAvailability([{ ...first, option: "" }], [product])).toThrow("Escolha");
    expect(() => validateCartAvailability([{ ...first, option: "Inexistente" }], [product])).toThrow();
    expect(() => validateCartAvailability([first], [{ ...product, variations: product.variations.map(v => ({ ...v, active: false })) }])).toThrow();
    expect(() => validateCartAvailability([first], [product])).not.toThrow();
  });
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
describe("tracking link", () => {
  it("accepts only full https links or empty", () => {
    expect(trackingUrlSchema.safeParse("https://entrega.app/r/abc123").success).toBe(true);
    expect(trackingUrlSchema.safeParse("").success).toBe(true);
    expect(trackingUrlSchema.safeParse("http://inseguro.app/r/1").success).toBe(false);
    expect(trackingUrlSchema.safeParse("entrega.app/r/1").success).toBe(false);
    expect(trackingUrlSchema.safeParse(`https://e.co/${"a".repeat(300)}`).success).toBe(false);
  });
  it("adds the tracking link only when the order is out for delivery", () => {
    const base = { number: 7, customer_name: "Cliente", customer_phone: "18999999999", tracking_url: "https://entrega.app/r/abc" };
    const out = new URL(orderWhatsApp({ ...base, status: "out_for_delivery" }));
    expect(out.searchParams.get("text")).toContain("Acompanhe a entrega em tempo real: https://entrega.app/r/abc");
    for (const status of ["received", "preparing", "delivered"] as const) {
      const url = new URL(orderWhatsApp({ ...base, status }));
      expect(url.searchParams.get("text")).not.toContain("entrega.app");
    }
    const noLink = new URL(orderWhatsApp({ number: 7, customer_name: "Cliente", customer_phone: "18999999999", status: "out_for_delivery", tracking_url: null }));
    expect(noLink.searchParams.get("text")).not.toContain("Acompanhe");
  });
});
