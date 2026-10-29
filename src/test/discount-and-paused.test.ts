import { describe, expect, it } from "vitest";
import { catalogProductSchema, discountPercent, visibleProducts } from "@/lib/catalog";

const base = { id: "p1", name: "Essência", description: "", price: 30, category: "Essências", image: "", active: true, stock: null, optionLabel: "Sabor" as const, allowOther: false, variations: [] };

describe("desconto do produto", () => {
  it("mostra 25% quando o preço antigo é R$ 40 e o atual R$ 30", () => {
    expect(discountPercent({ price: 30, compareAtPrice: 40 })).toBe(25);
  });
  it("não mostra desconto sem preço antigo", () => {
    expect(discountPercent({ price: 30, compareAtPrice: null })).toBeNull();
  });
  it("recusa preço com desconto igual ou maior que o normal", () => {
    expect(catalogProductSchema.safeParse({ ...base, compareAtPrice: 30 }).success).toBe(false);
    expect(catalogProductSchema.safeParse({ ...base, compareAtPrice: 40 }).success).toBe(true);
  });
  it("produtos antigos sem preço antigo continuam válidos", () => {
    expect(catalogProductSchema.parse(base).compareAtPrice).toBeNull();
  });
});

describe("produtos pausados", () => {
  it("não aparecem no catálogo", () => {
    const list = visibleProducts([{ id: "a", active: true }, { id: "b", active: false }]);
    expect(list.map(p => p.id)).toEqual(["a"]);
  });
});
