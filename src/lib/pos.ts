import { z } from "zod";
import { submitOrderSchema, priceOrder } from "./orders";
import { EMPTY_SETTINGS } from "./store-settings";
import type { CatalogProduct } from "./catalog";

export const COUNTER_PAYMENTS = ["Dinheiro", "Cartão de débito", "Cartão de crédito", "Pix físico"] as const;
export const counterSaleSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().max(80).default(""),
  notes: z.string().trim().max(300).default(""),
  payment: z.enum(COUNTER_PAYMENTS),
  cashReceived: z.number().finite().min(0).max(10000000).multipleOf(0.01).nullable(),
  items: submitOrderSchema.shape.items.element.extend({ expectedPrice: z.number().finite().min(0).max(1000000) }).array().min(1).max(100),
}).superRefine((v, ctx) => {
  if (v.payment === "Dinheiro" && v.cashReceived === null) ctx.addIssue({ code: "custom", message: "Informe o valor recebido.", path: ["cashReceived"] });
  if (v.payment !== "Dinheiro" && v.cashReceived !== null) ctx.addIssue({ code: "custom", message: "Valor recebido é exclusivo para dinheiro.", path: ["cashReceived"] });
});
export type CounterSaleInput = z.infer<typeof counterSaleSchema>;
export function cashChange(total: number, received: number) {
  return (Math.round(received * 100) - Math.round(total * 100)) / 100;
}
export function priceCounterSale(input: CounterSaleInput, products: CatalogProduct[]) {
  const priced = priceOrder({ requestId: input.requestId, items: input.items, customer: { name: input.name || "Cliente balcão", phone: "", address: "Balcão", payment: input.payment, change: "", notes: input.notes, zone: "" } }, EMPTY_SETTINGS, products);
  const change = input.payment === "Dinheiro" && input.cashReceived !== null ? cashChange(priced.total, input.cashReceived) : null;
  if (change !== null && change < 0) throw new Error("O valor recebido é menor que o total da venda.");
  return { ...priced, cash_received: input.cashReceived, cash_change: change };
}