import { z } from "zod";
import { PRODUCTS, type Product } from "./products";

const quantity = z.number().int().min(0).max(1000000).nullable();
const photoPath = z.string().max(1000).refine(v => /^\/produtos\/p\d+\.jpg$/.test(v) || /^uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(v), "Foto inválida.");
export const variationSchema = z.object({ name: z.string().trim().min(1).max(40), active: z.boolean(), stock: quantity });
export const catalogProductSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,30}$/),
  name: z.string().trim().min(2, "Informe o nome do produto.").max(150),
  description: z.string().trim().max(2000),
  price: z.number().min(0).max(1000000).multipleOf(0.01),
  category: z.string().trim().min(1, "Informe a categoria.").max(100),
  emoji: z.string().max(10).default("🛍️"),
  image: z.string().max(1000).refine(v => !v || /^\/produtos\/p\d+\.jpg$/.test(v) || /^uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(v), "Foto inválida."),
  images: z.array(photoPath).max(9, "Use até 10 fotos por produto.").default([]),
  active: z.boolean(),
  stock: quantity,
  optionLabel: z.enum(["Sabor", "Cor", "Variação"]),
  allowOther: z.boolean(),
  variations: z.array(variationSchema).max(100).refine(v => new Set(v.map(o => o.name.toLowerCase())).size === v.length, "Não repita variações."),
}).refine(p => !(p.allowOther && p.variations.some(v => v.stock !== null)), "Desative Outro ao controlar estoque por variação.");
export type CatalogProduct = Product & {
  active: boolean;
  stock: number | null;
  allowOther: boolean;
  variations: z.infer<typeof variationSchema>[];
  updatedAt: string | null;
  imagePath?: string;
  images?: string[];
  imagePaths?: string[];
};
export type ProductDraft = z.infer<typeof catalogProductSchema>;
export function mergeCatalog(rows: { id: string; data: unknown; updated_at: string }[]): CatalogProduct[] {
  const base: CatalogProduct[] = PRODUCTS.map(p => ({ ...p, active: true, stock: null, allowOther: Boolean(p.options?.length), variations: (p.options ?? []).map(name => ({ name, active: true, stock: null })), updatedAt: null }));
  const map = new Map(base.map(p => [p.id, p]));
  for (const row of rows) {
    const p = catalogProductSchema.parse(row.data);
    map.set(row.id, { ...p, id: row.id, options: p.variations.map(v => v.name), updatedAt: row.updated_at });
  }
  return [...map.values()];
}
export function available(p: Product | CatalogProduct, option = "", qty = 1) {
  if (!("active" in p)) return true;
  if (!p.active || (p.stock !== null && p.stock < qty)) return false;
  if (!p.variations.length) return !option;
  if (!option) return p.variations.some(v => v.active && (v.stock === null || v.stock >= qty)) || p.allowOther;
  const v = p.variations.find(v => v.name === option);
  return v ? v.active && (v.stock === null || v.stock >= qty) : p.allowOther;
}
export function toDraft(p: CatalogProduct): ProductDraft {
  return { id: p.id, name: p.name, description: p.description, price: p.price, category: p.category, emoji: p.emoji, image: p.imagePath ?? p.image ?? "", images: p.imagePaths ?? p.images ?? [], active: p.active, stock: p.stock, optionLabel: p.optionLabel === "Cor" ? "Cor" : p.optionLabel === "Variação" ? "Variação" : "Sabor", allowOther: p.allowOther, variations: p.variations };
}
export function productPhotos(p: Pick<CatalogProduct, "image" | "images">) {
  return [...new Set([p.image, ...(p.images ?? [])].filter((v): v is string => Boolean(v)))];
}