// Static asset imports are bundled by Vite for both client and Cloudflare SSR.
import categoryAbafadoresImage from "@/assets/categories/abafadores.jpg";
import categoryAluminioImage from "@/assets/categories/aluminio.jpg";
import categoryBebidasImage from "@/assets/categories/bebidas.jpg";
import categoryCaixaCarvaoImage from "@/assets/categories/caixa-carvao.jpg";
import categoryCasesImage from "@/assets/categories/cases.jpg";
import categoryCharutoImage from "@/assets/categories/charuto.jpg";
import categoryCombosEssenciasImage from "@/assets/categories/combos-essencias.jpg";
import categoryCombosImage from "@/assets/categories/combos.jpg";
import categoryEssenciasImage from "@/assets/categories/essencias.jpg";
import categoryFluidoImage from "@/assets/categories/fluido.jpg";
import categoryHeadshopImage from "@/assets/categories/headshop.jpg";
import categoryIsqueirosImage from "@/assets/categories/isqueiros.jpg";
import categoryJuiceImage from "@/assets/categories/juice.jpg";
import categoryNarguilesImage from "@/assets/categories/narguiles.jpg";
import categoryPalheirosImage from "@/assets/categories/palheiros.jpg";
import categoryPiteiraNarguileImage from "@/assets/categories/piteira-narguile.jpg";
import categoryPiteirasImage from "@/assets/categories/piteiras.jpg";
import categoryRoshImage from "@/assets/categories/rosh.jpg";
import categorySedasImage from "@/assets/categories/sedas.jpg";
import categoryTabacoImage from "@/assets/categories/tabaco.jpg";
import categoryTerereImage from "@/assets/categories/terere.jpg";
import categoryTesouraImage from "@/assets/categories/tesoura.jpg";
import categoryVasosImage from "@/assets/categories/vasos.jpg";

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

const IMAGES: Record<string, string> = {
  "abafadores": categoryAbafadoresImage,
  "aluminio": categoryAluminioImage,
  "bebidas": categoryBebidasImage,
  "caixa-carvao": categoryCaixaCarvaoImage,
  "cases": categoryCasesImage,
  "charuto": categoryCharutoImage,
  "combos-essencias": categoryCombosEssenciasImage,
  "combos": categoryCombosImage,
  "essencias": categoryEssenciasImage,
  "fluido": categoryFluidoImage,
  "headshop": categoryHeadshopImage,
  "isqueiros": categoryIsqueirosImage,
  "juice": categoryJuiceImage,
  "narguiles": categoryNarguilesImage,
  "palheiros": categoryPalheirosImage,
  "piteira-narguile": categoryPiteiraNarguileImage,
  "piteiras": categoryPiteirasImage,
  "rosh": categoryRoshImage,
  "sedas": categorySedasImage,
  "tabaco": categoryTabacoImage,
  "terere": categoryTerereImage,
  "tesoura": categoryTesouraImage,
  "vasos": categoryVasosImage,
};
const img = (slug: string): string | undefined => IMAGES[slug];

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
