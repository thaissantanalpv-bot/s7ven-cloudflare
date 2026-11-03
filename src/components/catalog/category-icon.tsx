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
