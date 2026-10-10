import { describe, it, expect } from "vitest";
import { counterSaleSchema, priceCounterSale, cashChange, type CounterSaleInput } from "@/lib/pos";
import { mergeCatalog } from "@/lib/catalog";
const products = mergeCatalog([]);
const p = products.find(p => !p.variations.length);
function input(): CounterSaleInput {
  if (!p) throw new Error("Missing product fixture");
  return { requestId: "f58c409f-03f8-437e-a167-68b8d3d25fca", name: "", notes: "", payment: "Dinheiro", cashReceived: 1000, items: [{ productId: p.id, option: "", qty: 2, expectedPrice: p.price }] };
}
describe("Counter checkout", () => {
  it("calculates cash change in cents", () => expect(cashChange(19.9, 20)).toBe(0.1));
  it("prices from catalog without delivery fees", () => {
    const result = priceCounterSale(input(), products);
    expect(result.total).toBe((p?.price ?? 0) * 2);
    expect(result.delivery_fee).toBe(0);
    expect(result.cash_change).toBe(cashChange(result.total, 1000));
  });
  it("rejects insufficient cash and stale prices", () => {
    expect(() => priceCounterSale({ ...input(), cashReceived: 0 }, products)).toThrow("menor");
    const sale = input(); sale.items[0].expectedPrice += 1;
    expect(() => priceCounterSale(sale, products)).toThrow("preço alterado");
  });
  it("requires explicit cash and removes cash for other payments", () => {
    expect(counterSaleSchema.safeParse({ ...input(), cashReceived: null }).success).toBe(false);
    expect(counterSaleSchema.safeParse({ ...input(), payment: "Pix físico", cashReceived: null }).success).toBe(true);
    expect(counterSaleSchema.safeParse({ ...input(), payment: "Cartão de débito" }).success).toBe(false);
  });
  it("rejects depleted aggregate stock across variation lines", () => {
    const variation = products.find(p => p.variations.length > 1);
    if (!variation) throw new Error("Missing variations");
    const stock = { ...variation, stock: 1 };
    const sale = { ...input(), items: stock.variations.slice(0, 2).map(v => ({ productId: stock.id, option: v.name, qty: 1, expectedPrice: stock.price })) };
    expect(() => priceCounterSale(sale, [stock])).toThrow("indisponível");
  });
});