import { describe, it, expect } from "vitest";
import { pairSuggestions } from "@/lib/pair-suggestions";
import type { CatalogProduct } from "@/lib/catalog";

const make = (id: string, name: string, category: string, extra: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id, name, category, description: "", price: 10, emoji: "", active: true, stock: null, allowOther: false, variations: [], updatedAt: null, ...extra,
});
const essence = make("e1", "Essência Ziggy", "Narguiles > Essências");
const drink = make("d1", "Energético Bally", "Bebidas");
const coal = make("c1", "Caixa de Carvão Fumeta", "Narguiles > Caixa de Carvão");
const foil = make("a1", "Papel Alumínio", "Narguiles > Alumínio");
const tip = make("t1", "Piteira Descartável", "Narguiles > Piteira Para Narguile");
const ice = make("g1", "Gelo de Sabor", "Bebidas");
const catalog = [essence, drink, coal, foil, tip, ice];

describe("Peça junto", () => {
  it("suggests carvão, alumínio and piteira for an essência", () => {
    expect(pairSuggestions([essence], catalog).map((p) => p.id)).toEqual(["c1", "a1", "t1"]);
  });
  it("suggests gelo de sabor for a bebida", () => {
    expect(pairSuggestions([drink], catalog).map((p) => p.id)).toEqual(["g1"]);
  });
  it("suggests nothing for unrelated products", () => {
    expect(pairSuggestions([coal], catalog)).toEqual([]);
  });
  it("skips items already in the cart and sold out ones", () => {
    const soldOutFoil = { ...foil, stock: 0 };
    expect(pairSuggestions([essence, coal], [essence, coal, soldOutFoil, tip]).map((p) => p.id)).toEqual(["t1"]);
  });
});
