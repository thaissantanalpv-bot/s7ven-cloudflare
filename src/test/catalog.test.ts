import { describe, it, expect } from "vitest";
import { mergeCatalog, toDraft, catalogProductSchema, available, productPhotos } from "@/lib/catalog";
import { priceOrder, submitOrderSchema } from "@/lib/orders";
import { EMPTY_SETTINGS } from "@/lib/store-settings";

describe("Shared catalog", () => {
  it("preserves gallery paths separately from signed photos", () => {
    const original = mergeCatalog([])[0];
    if (!original) throw new Error("Missing baseline");
    const draft = { ...toDraft(original), images: ["uploads/photo1.jpg"] };
    const merged = mergeCatalog([{ id: draft.id, data: draft, updated_at: "2026-10-11" }])[0];
    if (!merged) throw new Error("Missing gallery");
    expect(productPhotos(merged)).toEqual([original.image, "uploads/photo1.jpg"]);
    expect(toDraft({ ...merged, images: ["https://signed.example/photo"], imagePaths: draft.images }).images).toEqual(draft.images);
    expect(catalogProductSchema.safeParse({ ...draft, images: ["https://external.example/photo.jpg"] }).success).toBe(false);
    expect(catalogProductSchema.safeParse({ ...draft, images: Array(10).fill("uploads/photo1.jpg") }).success).toBe(false);
  });
  it("preserves all imported product IDs, photos and option names", () => {
    const products = mergeCatalog([]);
    expect(products).toHaveLength(176);
    expect(products.find(p => p.id === "p4")?.options).toContain("Melancia");
    expect(products[0]?.image).toBe("/produtos/p1.jpg");
  });
  it("merges edits and new products without losing old cart keys", () => {
    const original = mergeCatalog([])[0];
    if (!original) throw new Error("Missing baseline");
    const draft = { ...toDraft(original), price: 9.99, active: false };
    const products = mergeCatalog([{ id: draft.id, data: draft, updated_at: "2026-10-10" }, { id: "new1", data: { ...draft, id: "new1", name: "Novo produto", active: true }, updated_at: "2026-10-10" }]);
    expect(products).toHaveLength(177);
    expect(products.find(p => p.id === "p1")?.price).toBe(9.99);
    expect(available(products[0] ?? original)).toBe(false);
  });
  it("validates duplicate flavors, negative stock and unsafe photo paths", () => {
    const p = mergeCatalog([])[0];
    if (!p) throw new Error("Missing product");
    const draft = toDraft(p);
    expect(catalogProductSchema.safeParse({ ...draft, stock: -1 }).success).toBe(false);
    expect(catalogProductSchema.safeParse({ ...draft, image: "javascript:alert(1)" }).success).toBe(false);
    expect(catalogProductSchema.safeParse({ ...draft, variations: [{ name: "Coco", active: true, stock: null }, { name: "coco", active: true, stock: null }] }).success).toBe(false);
  });
  it("rejects paused or depleted variations and uses current prices", () => {
    const p = mergeCatalog([]).find(p => p.id === "p4");
    if (!p) throw new Error("Missing product");
    const product = { ...p, price: 11, stock: 3, allowOther: false, variations: p.variations.map(v => ({ ...v, stock: v.name === "Melancia" ? 2 : 0 })) };
    const input = submitOrderSchema.parse({ requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", customer: { name: "Cliente", phone: "18999999999", address: "Rua teste, 123", payment: "Pix" }, items: [{ productId: "p4", option: "Melancia", qty: 2 }] });
    expect(priceOrder(input, EMPTY_SETTINGS, [product]).total).toBe(22);
    expect(() => priceOrder({ ...input, items: [{ ...input.items[0], productId: "p4", option: "Melancia", qty: 3 }] }, EMPTY_SETTINGS, [product])).toThrow();
    expect(() => priceOrder(input, EMPTY_SETTINGS, [{ ...product, active: false }])).toThrow();
    expect(available(product, "Morango")).toBe(false);
    expect(available(product, "Inexistente")).toBe(false);
  });
});