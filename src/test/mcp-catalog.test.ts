import { describe, expect, it } from "vitest";
import { mergeCatalog } from "../lib/catalog";
import { catalogOutput } from "../lib/mcp/catalog-output";

describe("Agent catalog privacy", () => {
  it("returns only allowlisted sale fields, not private uploads or thresholds", () => {
    const product = mergeCatalog([])[0];
    if (!product) throw new Error("Missing fixture");
    const output = catalogOutput({ ...product, image: "uploads/private.jpg", minStock: 99, stock: 10 });
    expect(Object.keys(output).sort()).toEqual(["id", "name", "description", "category", "price", "compareAtPrice", "currency", "available", "optionLabel", "options", "url"].sort());
    expect(output.price).toBe(product.price);
    expect(JSON.stringify(output)).not.toContain("uploads/private.jpg");
  });
  it("does not offer paused variations", () => {
    const product = mergeCatalog([])[0];
    if (!product) throw new Error("Missing fixture");
    const output = catalogOutput({ ...product, variations: [{ name: "Pausada", active: false, stock: 10, minStock: null }, { name: "Ativa", active: true, stock: 0, minStock: null }] });
    expect(output.options).toEqual([{ name: "Ativa", available: false }]);
  });
});