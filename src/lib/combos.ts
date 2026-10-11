import { z } from "zod";
import { type CatalogProduct } from "./catalog";

export const comboSelectionSchema = z.object({
  groupId: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  productId: z.string().regex(/^[a-zA-Z0-9_-]{1,30}$/),
  option: z.string().trim().max(40),
  qty: z.number().int().min(1).max(10),
});
export const comboSelectionsSchema = z.array(comboSelectionSchema).max(80);
export type ComboSelection = z.infer<typeof comboSelectionSchema>;
const PREFIX = "__combo__";
export function comboOption(selections: ComboSelection[]) {
  return PREFIX + encodeURIComponent(JSON.stringify(comboSelectionsSchema.parse(selections)));
}
export function parseComboOption(option: string): ComboSelection[] | undefined {
  if (!option.startsWith(PREFIX)) return undefined;
  try { return comboSelectionsSchema.parse(JSON.parse(decodeURIComponent(option.slice(PREFIX.length)))); }
  catch { return []; }
}
export function comboSummary(selections: ComboSelection[], products: CatalogProduct[], combo: CatalogProduct) {
  return selections.map(s => `${combo.comboGroups?.find(g => g.id === s.groupId)?.name ?? "Item"}: ${s.qty}× ${products.find(p => p.id === s.productId)?.name ?? "Produto indisponível"}${s.option ? ` (${s.option})` : ""}`).join("; ");
}