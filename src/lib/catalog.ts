import { z } from "zod";
import { PRODUCTS, type Product } from "./products";
import type { CatalogImageKind, CatalogImageVariants } from "./photos/image-derivatives";

const quantity = z.number().int().min(0).max(1000000).nullable();
export const PHOTO_PATH_PATTERN =
  /^(\/produtos\/p\d+\.jpg|uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp))$/;
const photoPath = z
  .string()
  .max(1000)
  .refine((v) => PHOTO_PATH_PATTERN.test(v), "Foto inválida.");
export const VIDEO_PATTERN = /^uploads\/[a-zA-Z0-9_-]+\.(mp4|mov|webm|m4v)$/;
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
const videoPath = z
  .string()
  .max(200)
  .refine((v) => !v || VIDEO_PATTERN.test(v), "Vídeo inválido.");
const youtubeIdSchema = z.union([
  z.literal(""),
  z.string().regex(/^[a-zA-Z0-9_-]{11}$/, "Link do YouTube inválido."),
]);
export const variationSchema = z.object({
  name: z.string().trim().min(1).max(40),
  active: z.boolean(),
  stock: quantity,
  minStock: quantity.default(null),
});
export const comboGroupSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  name: z.string().trim().min(1, "Informe o nome do grupo.").max(80),
  quantity: z.number().int().min(1).max(200),
  productIds: z
    .array(z.string().regex(/^[a-zA-Z0-9_-]{1,30}$/))
    .min(1, "Escolha os produtos do grupo.")
    .max(176)
    .refine((ids) => new Set(ids).size === ids.length),
});
export const catalogProductSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,30}$/),
    name: z.string().trim().min(2, "Informe o nome do produto.").max(150),
    description: z.string().trim().max(2000),
    price: z.number().min(0).max(1000000).multipleOf(0.01),
    // Optional pre-discount price shown struck through; `price` is always what the customer pays.
    compareAtPrice: z.number().min(0.01).max(1000000).multipleOf(0.01).nullable().default(null),
    category: z.string().trim().min(1, "Informe a categoria.").max(100),
    emoji: z.string().max(10).default("🛍️"),
    image: z
      .string()
      .max(1000)
      .refine(
        (v) =>
          !v ||
          /^\/produtos\/p\d+\.jpg$/.test(v) ||
          /^uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(v),
        "Foto inválida.",
      ),
    images: z.array(photoPath).max(500).default([]),
    variationPhotos: z.record(z.string(), photoPath).default({}),
    // Uploaded product video (storage path) and/or a YouTube video id; both optional.
    video: videoPath.default(""),
    youtube: youtubeIdSchema.default(""),
    active: z.boolean(),
    featured: z.boolean().default(false),
    stock: quantity,
    minStock: quantity.default(null),
    optionLabel: z.enum(["Sabor", "Cor", "Variação"]),
    allowOther: z.boolean(),
    comboGroups: z.array(comboGroupSchema).max(8).default([]),
    variations: z
      .array(variationSchema)
      .max(100)
      .refine(
        (v) => new Set(v.map((o) => o.name.toLowerCase())).size === v.length,
        "Não repita variações.",
      ),
  })
  .refine(
    (p) => p.compareAtPrice === null || p.compareAtPrice > p.price,
    "O preço com desconto precisa ser menor que o preço normal.",
  )
  .refine(
    (p) => !(p.allowOther && p.variations.some((v) => v.stock !== null)),
    "Desative Outro ao controlar estoque por variação.",
  )
  .refine(
    (p) => !p.comboGroups.length || (!p.variations.length && !p.allowOther),
    "Combos usam os sabores dos itens, não variações próprias.",
  )
  .refine(
    (p) => new Set(p.comboGroups.map((g) => g.id)).size === p.comboGroups.length,
    "Não repita grupos.",
  )
  .refine(
    (p) => !p.comboGroups.some((g) => g.productIds.includes(p.id)),
    "Um combo não pode conter a si mesmo.",
  );
export type CatalogProduct = Product & {
  featured?: boolean;
  compareAtPrice?: number | null;
  active: boolean;
  stock: number | null;
  minStock?: number | null;
  allowOther: boolean;
  variations: z.infer<typeof variationSchema>[];
  updatedAt: string | null;
  imagePath?: string;
  images?: string[];
  imagePaths?: string[];
  /** Resolved original gallery URLs keyed by the persisted path. */
  galleryPhotoUrls?: Record<string, string>;
  /** Runtime-only signed derivative URLs, keyed by the persisted original path. */
  photoVariants?: Record<string, CatalogImageVariants>;
  variationPhotos?: Record<string, string>;
  /** Stored variation-photo paths, kept when variationPhotos is resolved to display URLs. */
  variationPhotoPaths?: Record<string, string>;
  /** Playable video URL once resolved (storage path before resolution). */
  video?: string;
  videoPath?: string;
  youtube?: string;
  comboGroups?: z.infer<typeof comboGroupSchema>[];
};
export type ProductDraft = z.infer<typeof catalogProductSchema>;
type CatalogRow = { id: string; data: unknown; updated_at: string };
const fromRow = (row: CatalogRow): CatalogProduct => {
  const p = catalogProductSchema.parse(row.data);
  return { ...p, id: row.id, options: p.variations.map((v) => v.name), updatedAt: row.updated_at };
};
/** The stored catalog is the only source of truth: a product deleted in the panel never comes back. */
export function catalogFromRows(rows: CatalogRow[]): CatalogProduct[] {
  return rows.map(fromRow);
}
/** Original imported list overlaid with stored rows; used by tests and fixtures, not by live reads. */
export function mergeCatalog(rows: CatalogRow[]): CatalogProduct[] {
  const base: CatalogProduct[] = PRODUCTS.map((p) => ({
    ...p,
    compareAtPrice: null,
    active: true,
    stock: null,
    minStock: null,
    allowOther: Boolean(p.options?.length),
    variations: (p.options ?? []).map((name) => ({
      name,
      active: true,
      stock: null,
      minStock: null,
    })),
    updatedAt: null,
  }));
  const map = new Map(base.map((p) => [p.id, p]));
  for (const row of rows) map.set(row.id, fromRow(row));
  return [...map.values()];
}
export function available(p: Product | CatalogProduct, option = "", qty = 1) {
  if (!("active" in p)) return true;
  if (!p.active || (p.stock !== null && p.stock < qty)) return false;
  if (!p.variations.length) return !option;
  if (!option)
    return (
      p.variations.some((v) => v.active && (v.stock === null || v.stock >= qty)) || p.allowOther
    );
  const v = p.variations.find((v) => v.name === option);
  return v ? v.active && (v.stock === null || v.stock >= qty) : p.allowOther;
}
/** Keeps only variation-photo links whose variation still exists and whose photo is still one of the product photos. */
export function cleanVariationPhotos<
  T extends Pick<ProductDraft, "image" | "images" | "variations" | "variationPhotos">,
>(d: T): T {
  const names = new Set(d.variations.map((v) => v.name));
  const photos = new Set([d.image, ...d.images].filter(Boolean));
  return {
    ...d,
    variationPhotos: Object.fromEntries(
      Object.entries(d.variationPhotos ?? {}).filter(
        ([name, path]) => names.has(name) && photos.has(path) && PHOTO_PATH_PATTERN.test(path),
      ),
    ),
  };
}
export function toDraft(p: CatalogProduct): ProductDraft {
  return cleanVariationPhotos({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? null,
    category: p.category,
    emoji: p.emoji,
    image: p.imagePath ?? p.image ?? "",
    images: p.imagePaths ?? p.images ?? [],
    variationPhotos: p.variationPhotoPaths ?? p.variationPhotos ?? {},
    video: p.videoPath ?? (p.video && VIDEO_PATTERN.test(p.video) ? p.video : ""),
    youtube: p.youtube ?? "",
    active: p.active,
    featured: p.featured ?? false,
    stock: p.stock,
    minStock: p.minStock ?? null,
    optionLabel:
      p.optionLabel === "Cor" ? "Cor" : p.optionLabel === "Variação" ? "Variação" : "Sabor",
    allowOther: p.allowOther,
    variations: p.variations.map((v) => ({ ...v, minStock: v.minStock ?? null })),
    comboGroups: p.comboGroups ?? [],
  });
}
/** Tidies an AI-written description: plain text, no markdown/links/citation marks, within the field limit. */
export function cleanAiDescription(text: string): string {
  return text
    .replace(/\s*\(\s*\[[^\]]*\]\([^)]*\)\s*\)/g, "")
    .replace(/\[(\d+(,\s*\d+)*)\]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>]+/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2000)
    .trim();
}
// Low-stock alerts: items whose tracked stock reached the minimum set by the store.
export function lowStockItems(p: CatalogProduct): { label: string; stock: number; min: number }[] {
  const items: { label: string; stock: number; min: number }[] = [];
  if (p.stock !== null && p.minStock != null && p.stock <= p.minStock)
    items.push({ label: p.name, stock: p.stock, min: p.minStock });
  for (const v of p.variations)
    if (v.stock !== null && v.minStock != null && v.stock <= v.minStock)
      items.push({ label: `${p.name} · ${v.name}`, stock: v.stock, min: v.minStock });
  return items;
}
export function productPhotos(p: Pick<CatalogProduct, "image" | "images">) {
  return [...new Set([p.image, ...(p.images ?? [])].filter((v): v is string => Boolean(v)))];
}
type CatalogPhotoSource = Pick<
  CatalogProduct,
  "image" | "images" | "imagePath" | "imagePaths" | "galleryPhotoUrls" | "photoVariants"
>;
export function productPhotosFor(p: CatalogPhotoSource, kind: CatalogImageKind) {
  const cover = (p.imagePath && p.photoVariants?.[p.imagePath]?.[kind]) || p.image;
  // Older offline snapshots can contain compacted arrays. Use their existing URLs
  // as-is when they lack a path-keyed mapping.
  const gallery = p.galleryPhotoUrls
    ? (p.imagePaths ?? []).map(
        (path) => p.photoVariants?.[path]?.[kind] || p.galleryPhotoUrls?.[path],
      )
    : (p.images ?? []);
  return [...new Set([cover, ...gallery].filter((url): url is string => Boolean(url)))];
}
export function variationPhoto(
  p: Pick<CatalogProduct, "variationPhotos" | "variationPhotoPaths" | "photoVariants">,
  option: string,
  kind: CatalogImageKind = "gallery",
) {
  if (!option) return "";
  const path = p.variationPhotoPaths?.[option];
  return (path ? p.photoVariants?.[path]?.[kind] : undefined) || p.variationPhotos?.[option] || "";
}
/** Photo shown for a cart line, order item or combo item: the picked variation's own photo first, then the cover. */
export function itemPhoto(
  p: Pick<
    CatalogProduct,
    | "image"
    | "images"
    | "imagePath"
    | "imagePaths"
    | "galleryPhotoUrls"
    | "variationPhotos"
    | "variationPhotoPaths"
    | "photoVariants"
  >,
  option: string,
) {
  return variationPhoto(p, option, "thumb") || productPhotosFor(p, "thumb")[0] || "";
}
/** Whole-number discount percentage when a valid struck-through price exists, otherwise null. */
export function discountPercent(
  p: Pick<CatalogProduct, "price" | "compareAtPrice">,
): number | null {
  const old = p.compareAtPrice;
  if (old == null || !(old > p.price) || p.price < 0) return null;
  const pct = Math.round((1 - p.price / old) * 100);
  return pct > 0 ? pct : null;
}
/** Products customers may browse: paused items stay out of every catalog list. */
export function visibleProducts<T extends { active: boolean }>(products: T[]): T[] {
  return products.filter((p) => p.active);
}

/** Extracts the 11-character video id from any common YouTube link (watch, youtu.be, shorts, embed, live). */
export function youtubeId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const [, kind, value] = url.pathname.split("/");
      if (kind && ["shorts", "embed", "live", "v"].includes(kind)) id = value ?? null;
    }
  }
  return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
}
export const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
};
/** File extension for an accepted product video, or null when the format is not supported. */
export function videoExtension(file: { name: string; type: string }): string | null {
  const byType = VIDEO_TYPES[file.type];
  if (byType) return byType;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ["mp4", "mov", "webm", "m4v"].includes(ext) ? ext : null;
}

export type BulkPriceChange = { mode: "percent"; percent: number } | { mode: "set"; price: number };
export const bulkPriceChangeSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("percent"),
    percent: z
      .number()
      .min(-90, "Use no mínimo -90%.")
      .max(500, "Use no máximo 500%.")
      .refine((v) => v !== 0, "Informe a porcentagem."),
  }),
  z.object({
    mode: z.literal("set"),
    price: z.number().min(0.01, "Informe o novo preço.").max(1000000).multipleOf(0.01),
  }),
]);
const cents = (v: number) => Math.round(v * 100) / 100;
/**
 * New price for a bulk change. Percent changes also move the struck-through price so the discount stays;
 * a struck-through price that is no longer above the new price is removed.
 */
export function bulkPrice(
  p: { price: number; compareAtPrice?: number | null },
  change: BulkPriceChange,
): { price: number; compareAtPrice: number | null } {
  const price =
    change.mode === "set"
      ? cents(change.price)
      : Math.max(0, cents(p.price * (1 + change.percent / 100)));
  const old = p.compareAtPrice ?? null;
  const compare =
    old === null ? null : change.mode === "percent" ? cents(old * (1 + change.percent / 100)) : old;
  return { price, compareAtPrice: compare !== null && compare > price ? compare : null };
}
