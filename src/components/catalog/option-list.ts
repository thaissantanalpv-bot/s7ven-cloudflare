import { available, type CatalogProduct } from "@/lib/catalog";

/** Above this many flavors/colors, cards use a compact dropdown and the detail screen adds search. */
export const MANY_OPTIONS = 6;

export const kindOf = (p: CatalogProduct) => (p.optionLabel === "Cor" ? "uma cor" : "um sabor");

/** Alphabetical (pt-BR), with sold-out options moved to the end. */
export function sortedOptions(p: CatalogProduct): string[] {
  const opts = [...(p.options ?? [])].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  return [...opts.filter((o) => available(p, o)), ...opts.filter((o) => !available(p, o))];
}

/** Accent-insensitive search used by the flavor filter. */
export const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
