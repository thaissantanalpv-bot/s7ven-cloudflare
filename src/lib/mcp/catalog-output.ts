import { available, type CatalogProduct } from "../catalog";

/** Explicit projection: no inventory thresholds, private photos, or customer fields. */
export function catalogOutput(p: CatalogProduct) {
  return {
    id: p.id, name: p.name, description: p.description ?? "", category: p.category,
    price: p.price, compareAtPrice: p.compareAtPrice ?? null, currency: "BRL",
    available: available(p), optionLabel: p.optionLabel ?? "Variação",
    options: p.variations.filter(v => v.active).map(v => ({ name: v.name, available: available(p, v.name) })),
    url: `https://s7venlounge.shop/?produto=${encodeURIComponent(p.id)}`,
  };
}