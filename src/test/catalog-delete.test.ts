import { describe, expect, it } from "vitest";
import { catalogFromRows, mergeCatalog, toDraft } from "@/lib/catalog";

describe("permanent product delete", () => {
  it("does not bring back an imported product once its stored row is deleted", () => {
    const kept = mergeCatalog([])[1]!;
    const rows = [{ id: kept.id, data: toDraft(kept), updated_at: "2026-11-01" }];
    const catalog = catalogFromRows(rows);
    expect(catalog.map(p => p.id)).toEqual([kept.id]);
    expect(catalog.some(p => p.id === mergeCatalog([])[0]!.id)).toBe(false);
  });
  it("an empty stored catalog shows no products", () => {
    expect(catalogFromRows([])).toEqual([]);
  });
});
