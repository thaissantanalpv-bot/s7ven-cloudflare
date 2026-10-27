import { available, type CatalogProduct } from "./catalog";

const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const has = (p: CatalogProduct, word: string) => norm(p.category).includes(word) || norm(p.name).includes(word);

const isEssence = (p: CatalogProduct) => has(p, "essencia");
const isDrink = (p: CatalogProduct) => norm(p.category) === "bebidas" && !has(p, "gelo");

/** "Peça junto": essence → charcoal, aluminium, mouthpiece; drink → flavoured ice. */
const RULES: { when: (p: CatalogProduct) => boolean; suggest: ((p: CatalogProduct) => boolean)[] }[] = [
  { when: isEssence, suggest: [(p) => has(p, "carvao"), (p) => has(p, "aluminio"), (p) => has(p, "piteira")] },
  { when: isDrink, suggest: [(p) => has(p, "gelo")] },
];

export function pairSuggestions(cartProducts: CatalogProduct[], catalog: CatalogProduct[], limit = 6): CatalogProduct[] {
  const inCart = new Set(cartProducts.map((p) => p.id));
  const candidates = catalog.filter((p) => !inCart.has(p.id) && !p.comboGroups?.length && available(p));
  const groups = RULES.filter((r) => cartProducts.some(r.when)).flatMap((r) => r.suggest.map((match) => candidates.filter(match)));
  // Interleave groups so every kind (carvão, alumínio, piteira, gelo) appears before repeats.
  const out: CatalogProduct[] = [];
  for (let i = 0; out.length < limit && groups.some((g) => g[i]); i++) {
    for (const g of groups) {
      const p = g[i];
      if (p && !out.some((o) => o.id === p.id) && out.length < limit) out.push(p);
    }
  }
  return out;
}
