import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "../lib/catalog";
import { retainCatalogPhotoUrls } from "../lib/catalog-photo-stability";

const now = Date.UTC(2026, 10, 18, 12);
function signed(path: string, expiryMs: number, salt: string): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(expiryMs / 1000), salt }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `https://example.supabase.co/storage/v1/object/sign/product-photos/${path}?token=x.${payload}.z`;
}
const product = (partial: Partial<CatalogProduct>): CatalogProduct =>
  ({
    id: "sku1",
    imagePath: "uploads/a.jpg",
    image: "",
    images: [],
    imagePaths: [],
    variationPhotos: {},
    variationPhotoPaths: {},
    active: true,
    stock: null,
    updatedAt: null,
    name: "Test",
    category: "Test",
    price: 10,
    description: "",
    emoji: "",
    options: [],
    variations: [],
    comboGroups: [],
    allowOther: false,
    optionLabel: "Sabor",
    featured: false,
    compareAtPrice: null,
    ...partial,
  }) as CatalogProduct;

describe("catalog media stability / egress", () => {
  it("keeps a signed photo URL while its token is safely valid", () => {
    const a = signed("uploads/a.jpg", now + 3600000, "old");
    const b = signed("uploads/a.jpg", now + 3600000, "new");
    expect(
      retainCatalogPhotoUrls([product({ image: a })], [product({ image: b })], now)[0].image,
    ).toBe(a);
  });
  it("renews links nearing expiry", () => {
    const a = signed("uploads/a.jpg", now + 5 * 60000, "old");
    const b = signed("uploads/a.jpg", now + 3600000, "new");
    expect(
      retainCatalogPhotoUrls([product({ image: a })], [product({ image: b })], now)[0].image,
    ).toBe(b);
  });
  it("uses a new URL when the image itself changes", () => {
    const a = signed("uploads/a.jpg", now + 3600000, "old");
    const b = signed("uploads/b.jpg", now + 3600000, "new");
    expect(
      retainCatalogPhotoUrls(
        [product({ image: a })],
        [product({ imagePath: "uploads/b.jpg", image: b })],
        now,
      )[0].image,
    ).toBe(b);
  });
  it("never reuses a URL from another Supabase project", () => {
    const a = signed("uploads/a.jpg", now + 3600000, "old");
    const b = signed("uploads/a.jpg", now + 3600000, "new").replace(
      "example.supabase.co",
      "another.supabase.co",
    );
    expect(
      retainCatalogPhotoUrls([product({ image: a })], [product({ image: b })], now)[0].image,
    ).toBe(b);
  });
  it("matches gallery images by stored path even when order changes", () => {
    const a = signed("uploads/a.jpg", now + 3600000, "A");
    const b = signed("uploads/b.jpg", now + 3600000, "B");
    const a2 = signed("uploads/a.jpg", now + 3600000, "A2");
    const b2 = signed("uploads/b.jpg", now + 3600000, "B2");
    const [updated] = retainCatalogPhotoUrls(
      [product({ imagePaths: ["uploads/a.jpg", "uploads/b.jpg"], images: [a, b] })],
      [product({ imagePaths: ["uploads/b.jpg", "uploads/a.jpg"], images: [b2, a2] })],
      now,
    );
    expect(updated.images).toEqual([b, a]);
  });
  it("preserves updated product pricing and status while retaining photos", () => {
    const a = signed("uploads/a.jpg", now + 3600000, "old");
    const b = signed("uploads/a.jpg", now + 3600000, "new");
    const [updated] = retainCatalogPhotoUrls(
      [product({ image: a, price: 10 })],
      [product({ image: b, price: 12, active: false })],
      now,
    );
    expect(updated).toMatchObject({ image: a, price: 12, active: false });
  });
  it("keeps derivative URLs stable when only their signed tokens rotate", () => {
    const path = "uploads/item_original_webp.jpg";
    const oldCard = signed("uploads/item_512.webp", now + 3600000, "old");
    const newCard = signed("uploads/item_512.webp", now + 3600000, "new");
    const oldVariants = { thumb: oldCard, card: oldCard, gallery: oldCard };
    const newVariants = { thumb: newCard, card: newCard, gallery: newCard };
    const [updated] = retainCatalogPhotoUrls(
      [product({ imagePath: path, photoVariants: { [path]: oldVariants } })],
      [product({ imagePath: path, photoVariants: { [path]: newVariants } })],
      now,
    );
    expect(updated?.photoVariants?.[path]).toEqual(oldVariants);
  });
});
