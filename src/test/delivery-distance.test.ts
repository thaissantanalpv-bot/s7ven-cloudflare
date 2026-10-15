import { describe, expect, it } from "vitest";
import { EMPTY_SETTINGS, distanceFee, settingsSchema } from "@/lib/store-settings";
import { priceOrder, submitOrderSchema } from "@/lib/orders";
import { PRODUCTS } from "@/lib/products";
const settings = { ...EMPTY_SETTINGS, delivery_enabled: true, delivery_distance_enabled: true, delivery_origin: "Rua de saída, 123, Cidade, SP", delivery_distance_tiers: [{ id: "b", upToKm: 5, fee: 9 }, { id: "a", upToKm: 2, fee: 5 }] };
describe("Entrega por distância", () => {
  it("selects inclusive sorted tiers without rounding across boundaries", () => {
    expect(distanceFee(settings, 2)).toBe(5);
    expect(distanceFee(settings, 2.001)).toBe(9);
    expect(distanceFee(settings, 5)).toBe(9);
    expect(() => distanceFee(settings, 5.001)).toThrow("fora da área");
    expect(() => distanceFee(settings, NaN)).toThrow();
  });
  it("requires an origin and unique limits", () => {
    expect(settingsSchema.safeParse(settings).success).toBe(true);
    expect(settingsSchema.safeParse({ ...settings, delivery_origin: "" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, delivery_distance_tiers: [...settings.delivery_distance_tiers, { id: "c", upToKm: 2, fee: 3 }] }).success).toBe(false);
  });
  it("requires server-verified quotes for delivery but never for pickup", () => {
    const product = PRODUCTS[0];
    if (!product) throw new Error("Missing product");
    const input = submitOrderSchema.parse({ requestId: crypto.randomUUID(), customer: { name: "Teste", phone: "18991511004", address: "Rua completa, 123", payment: "Pix" }, items: [{ productId: product.id, qty: 1, option: "" }] });
    expect(() => priceOrder(input, settings)).toThrow("Calcule");
    expect(priceOrder(input, settings, PRODUCTS, { fee: 9, km: 3 }).delivery_fee).toBe(9);
    expect(priceOrder({ ...input, customer: { ...input.customer, fulfillment: "pickup" } }, settings).delivery_fee).toBe(0);
  });
});