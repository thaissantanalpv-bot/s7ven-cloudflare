import { describe, expect, it } from "vitest";
import { EMPTY_SETTINGS, SEVEN_DELIVERY_TIERS, distanceFee, settingsSchema } from "@/lib/store-settings";
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
  it("applies all nine Seven rates at the upper boundary and refuses routes over 15 km", () => {
    const seven = { ...settings, delivery_distance_tiers: SEVEN_DELIVERY_TIERS };
    const limits = [1, 3, 5, 6, 7, 9, 11, 13, 15];
    const fees = [7, 7.5, 8.4, 9.3, 10.2, 11.1, 13, 14.5, 16];
    for (const [index, limit] of limits.entries()) {
      expect(distanceFee(seven, limit)).toBe(fees[index]);
      expect(distanceFee(seven, (limits[index - 1] ?? 0) + 0.001)).toBe(fees[index]);
    }
    expect(() => distanceFee(seven, 15.001)).toThrow("fora da área");
    expect(() => distanceFee(seven, -0.001)).toThrow("Distância inválida");
  });
  it("requires server-verified quotes for delivery but never for pickup", () => {
    const product = PRODUCTS[0];
    if (!product) throw new Error("Missing product");
    const input = submitOrderSchema.parse({ requestId: crypto.randomUUID(), customer: { name: "Teste", phone: "18991511004", address: "Rua completa, 123", payment: "Pix" }, items: [{ productId: product.id, qty: 1, option: "" }] });
    expect(() => priceOrder(input, settings)).toThrow("Calcule");
    const order = priceOrder(input, settings, PRODUCTS, { fee: 9, km: 3 });
    expect(order.delivery_fee).toBe(9);
    expect(order.total).toBe(order.subtotal + 9);
    expect(() => priceOrder(input, settings, PRODUCTS, { fee: 0, km: 3 })).toThrow("taxa mudou");
    expect(priceOrder({ ...input, customer: { ...input.customer, fulfillment: "pickup" } }, settings).delivery_fee).toBe(0);
  });
});
