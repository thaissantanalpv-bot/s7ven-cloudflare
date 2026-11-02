import { describe, expect, it } from "vitest";
import { catalogProductSchema, cleanAiDescription, toDraft, type CatalogProduct } from "@/lib/catalog";

const base: CatalogProduct = {
  id: "p1", name: "Essência Teste", description: "", price: 10, compareAtPrice: null, category: "Essências", emoji: "🛍️",
  image: "https://cdn.example/signed/a.jpg?token=x", imagePath: "uploads/a.jpg",
  images: ["https://cdn.example/signed/b.jpg?token=y"], imagePaths: ["uploads/b.jpg"],
  // As loaded in the panel: links resolved for display, stored paths kept aside.
  variationPhotos: { Mint: "https://cdn.example/signed/b.jpg?token=y" }, variationPhotoPaths: { Mint: "uploads/b.jpg" },
  active: true, stock: null, minStock: null, optionLabel: "Sabor", allowOther: false,
  variations: [{ name: "Mint", active: true, stock: null, minStock: null }, { name: "Uva", active: true, stock: null, minStock: null }],
  options: ["Mint", "Uva"], updatedAt: "2026-11-01T00:00:00Z",
};

describe("editing a product with a photo linked to a variation", () => {
  it("saves without 'Foto inválida' when the photo was not changed", () => {
    const draft = toDraft(base);
    expect(draft.variationPhotos).toEqual({ Mint: "uploads/b.jpg" });
    expect(catalogProductSchema.safeParse(draft).success).toBe(true);
  });
  it("saves after removing the variation that had a photo, dropping its link", () => {
    const draft = toDraft({ ...base, variations: base.variations.filter(v => v.name !== "Mint") });
    expect(draft.variationPhotos).toEqual({});
    expect(catalogProductSchema.safeParse(draft).success).toBe(true);
  });
  it("pausing a product keeps its variation photo link", () => {
    const parsed = catalogProductSchema.parse({ ...toDraft(base), active: false });
    expect(parsed.variationPhotos).toEqual({ Mint: "uploads/b.jpg" });
  });
});

describe("AI description cleanup", () => {
  it("removes markdown, links and citation marks", () => {
    expect(cleanAiDescription("**Essência** de menta [1]. Veja https://x.com e [site](https://y.com).")).toBe("Essência de menta . Veja e site.");
  });
  it("removes web-search source citations in parentheses", () => {
    expect(cleanAiDescription("Essência para narguilé. ([gov.br](https://www.gov.br/x?utm_source=openai))")).toBe("Essência para narguilé.");
  });
  it("keeps within the 2000-character description limit", () => {
    expect(cleanAiDescription("a".repeat(2500)).length).toBe(2000);
  });
});
