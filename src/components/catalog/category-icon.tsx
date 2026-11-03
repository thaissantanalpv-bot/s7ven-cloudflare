import { Flame, Heart, Sparkles, Wine, Snowflake, Cigarette, Wind, Package, Gift, Zap, Droplet, Wrench, LayoutGrid, type LucideIcon } from "lucide-react";

const RULES: [RegExp, LucideIcon][] = [
  [/favorit/i, Heart],
  [/promo|destaque/i, Sparkles],
  [/combo|kit/i, Gift],
  [/carv[aã]o|brasa/i, Flame],
  [/ess[eê]ncia|rosh|sabor/i, Droplet],
  [/gelo/i, Snowflake],
  [/bebida|energ|drink|refri|[aá]gua|cerveja|dose|vodka|whisk/i, Wine],
  [/narguil|vaso|stem|mangueira/i, Wind],
  [/pod|vape|eletr|isqueiro/i, Zap],
  [/seda|piteira|tabaco|cigar|filtro|palheiro|blunt|bolador|dichavador/i, Cigarette],
  [/acess[oó]rio|alum[ií]nio|pe[cç]a|prato|pegador/i, Wrench],
];

export function categoryIcon(label: string): LucideIcon {
  for (const [re, icon] of RULES) if (re.test(label)) return icon;
  return label ? Package : LayoutGrid;
}

const IMAGES = import.meta.glob("@/assets/categories/*.jpg", { eager: true, import: "default" }) as Record<string, string>;
const img = (slug: string) => Object.entries(IMAGES).find(([k]) => k.endsWith(`/${slug}.jpg`))?.[1];

/** AI-generated illustrative photo per category; matches on the full stored category name. */
const CATEGORY_IMAGES: Record<string, string> = {
  "Sedas": "sedas", "Headshop": "headshop", "Tabaco": "tabaco", "Narguiles > Caixa de Carvão": "caixa-carvao",
  "Piteiras": "piteiras", "Narguiles > Essências": "essencias", "Narguiles": "narguiles", "Cases": "cases",
  "Isqueiros/Maçarico": "isqueiros", "Narguiles > Vasos": "vasos", "Narguiles > Alumínio": "aluminio",
  "Palheiros": "palheiros", "Narguiles > Piteira Para Narguile": "piteira-narguile", "Tesoura": "tesoura",
  "Bebidas": "bebidas", "Tereré": "terere", "Narguiles > Rosh": "rosh", "Combos": "combos", "Fluido": "fluido",
  "Narguiles > COMBOS DE ESSÊNCIAS": "combos-essencias", "Charuto": "charuto", "Juice": "juice",
  "Narguiles > Abafadores": "abafadores",
};

export function categoryImage(category: string): string | undefined {
  const slug = CATEGORY_IMAGES[category];
  return slug ? img(slug) : undefined;
}
