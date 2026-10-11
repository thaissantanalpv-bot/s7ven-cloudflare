import { describe, expect, it } from "vitest";
import { mergeCatalog, toDraft, catalogProductSchema } from "@/lib/catalog";
import { comboOption, parseComboOption } from "@/lib/combos";
import { priceOrder, submitOrderSchema, validateCartAvailability } from "@/lib/orders";
import { EMPTY_SETTINGS } from "@/lib/store-settings";
const base = mergeCatalog([]);
const original = base.find(p => p.id === "p1");
if (!original) throw new Error("Missing fixture");
const combo = { ...original, id: "combo1", price: 30, options: [], variations: [], allowOther: false, comboGroups: [{ id: "drink", name: "Bebida", quantity: 1, productIds: ["p1"] }, { id: "flavor", name: "Sabor", quantity: 2, productIds: ["p4"] }] };
const components = [{ groupId: "drink", productId: "p1", qty: 1, option: "" }, { groupId: "flavor", productId: "p4", qty: 2, option: "Melancia" }];
const products = [...base, combo];
const line = { productId: combo.id, option: "", qty: 1, components, expectedPrice: 30 };
describe("Grouped combos", () => {
  it("preserves typed selections in independent cart keys", () => {
    expect(parseComboOption(comboOption(components))).toEqual(components);
    expect(parseComboOption("Melancia")).toBeUndefined();
    expect(parseComboOption("__combo__broken")).toEqual([]);
  });
  it("charges only the fixed combo price and snapshots its items", () => {
    const input = submitOrderSchema.parse({ requestId: crypto.randomUUID(), customer: { name: "Cliente", phone: "18999999999", address: "Rua teste, 123", payment: "Pix" }, items: [line] });
    const priced = priceOrder(input, EMPTY_SETTINGS, products);
    expect(priced.total).toBe(30);
    expect(priced.items[0]?.components).toHaveLength(2);
    expect(priced.items[0]?.option).toContain("Sabor: 2× Gin Invictus (Melancia)");
  });
  it("rejects incomplete groups, foreign products and nested combos", () => {
    expect(() => validateCartAvailability([{ ...line, components: components.slice(0, 1) }], products)).toThrow("Sabor");
    expect(() => validateCartAvailability([{ ...line, components: components.map(s => s.groupId === "drink" ? { ...s, productId: "p2" } : s) }], products)).toThrow("permitido");
    expect(() => validateCartAvailability([{ ...line, components: undefined }], products)).toThrow("Monte");
  });
  it("combines stock demand of regular items and multiplied combo items", () => {
    const stock = products.map(p => p.id === "p1" ? { ...p, stock: 2 } : p);
    expect(() => validateCartAvailability([line, { productId: "p1", option: "", qty: 2 }], stock)).toThrow("quantidade indisponível");
    expect(() => validateCartAvailability([{ ...line, qty: 3 }], stock)).toThrow("quantidade indisponível");
    expect(() => validateCartAvailability([line], stock)).not.toThrow();
  });
  it("validates group quantities and excludes own products and own flavors", () => {
    expect(catalogProductSchema.safeParse(toDraft(combo)).success).toBe(true);
    expect(catalogProductSchema.safeParse({ ...toDraft(combo), comboGroups: [{ ...combo.comboGroups[0], quantity: 0 }] }).success).toBe(false);
    expect(catalogProductSchema.safeParse({ ...toDraft(combo), comboGroups: [{ id: "self", name: "Self", quantity: 1, productIds: [combo.id] }] }).success).toBe(false);
  });
});