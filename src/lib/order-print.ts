import type { Order } from "./orders";
import { brl, STORE_NAME } from "./products";
export type PrinterPreferences = { name: string; paper: "58" | "80" };
export const PRINTER_STORAGE_KEY = "s7ven-order-printer";
export const DEFAULT_PRINTER: PrinterPreferences = { name: "", paper: "80" };
export function parsePrinterPreferences(value: string | null): PrinterPreferences {
  try {
    const saved = JSON.parse(value ?? "null");
    return { name: typeof saved?.name === "string" ? saved.name.slice(0, 80) : "", paper: saved?.paper === "58" ? "58" : "80" };
  } catch { return { ...DEFAULT_PRINTER }; }
}
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
export function orderReceiptHtml(order: Order, paper: PrinterPreferences["paper"], colors: { paper: string; ink: string }) {
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(order.created_at));
  const items = order.items.map(item => `<li><strong>${escape(item.qty)}× ${escape(item.name)}</strong>${item.option ? `<div>${escape(item.optionLabel)}: ${escape(item.option)}</div>` : ""}<div class="amount">${escape(brl(item.qty * item.price))}</div></li>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Pedido #${escape(order.number)} — S7VEN</title><style>
  :root { --paper: ${colors.paper}; --ink: ${colors.ink}; }
  @page { size: auto; margin: 0; } * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--paper); color: var(--ink); }
  body { width: ${paper === "58" ? "54" : "76"}mm; padding: 3mm; font: 12px/1.45 Arial, sans-serif; overflow-wrap: anywhere; }
  h1 { font-size: 16px; margin: 0; } h2 { font-size: 18px; margin: 8px 0; }
  header { text-align: center; } p { margin: 6px 0; white-space: pre-wrap; }
  section { border-top: 1px dashed var(--ink); margin-top: 10px; padding-top: 8px; }
  ul { list-style: none; padding: 0; margin: 0; } li { padding: 6px 0; break-inside: avoid; }
  .amount { text-align: right; } .row { display: flex; justify-content: space-between; gap: 8px; }
  .total { font-size: 16px; font-weight: bold; } footer { border-top: 1px dashed var(--ink); margin-top: 12px; padding-top: 8px; text-align: center; font-size: 10px; }
  </style></head><body><header><h1>${escape(STORE_NAME)}</h1><h2>Pedido #${escape(order.number)}</h2><p>${escape(date)}</p><strong>${order.fulfillment === "pickup" ? "RETIRADA NA LOJA" : "VIA DO ENTREGADOR"}</strong></header>
  <section><p><strong>Cliente:</strong> ${escape(order.customer_name)}</p><p><strong>WhatsApp:</strong> ${escape(order.customer_phone)}</p>${order.fulfillment === "pickup" ? "<p><strong>Retirada na loja — sem entrega</strong></p>" : `<p><strong>Endereço de entrega:</strong><br>${escape(order.address)}</p>`}</section>
  ${order.status === "cancelled" ? `<section><strong>CANCELADO</strong><p>Motivo: ${escape(order.cancellation_reason)}</p></section>` : ""}<section><ul>${items}</ul></section><section><p class="row"><span>Produtos</span><span>${escape(brl(order.subtotal))}</span></p><p class="row"><span>${order.fulfillment === "pickup" ? "Retirada" : "Taxa de entrega"}</span><span>${order.fulfillment === "pickup" ? "Sem taxa" : order.delivery_confirmed ? escape(brl(order.delivery_fee)) : "A confirmar"}</span></p><p class="row total"><span>Total</span><span>${escape(brl(order.total))}</span></p></section>
  <section><p><strong>Pagamento:</strong> ${escape(order.payment)}</p>${order.change_for ? `<p><strong>Troco para:</strong> ${escape(order.change_for)}</p>` : ""}${order.notes ? `<p><strong>Observações:</strong> ${escape(order.notes)}</p>` : ""}</section><footer>Via de pedido · Não é documento fiscal</footer></body></html>`;
}
