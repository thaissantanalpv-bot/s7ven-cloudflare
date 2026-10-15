import { describe, expect, it } from "vitest";
import { orderReceiptHtml, parsePrinterPreferences } from "@/lib/order-print";
import type { Order } from "@/lib/orders";
const order: Order = {
  id: "example", number: 42, customer_name: "Cliente", customer_phone: "(18) 99999-9999",
  address: "Rua Exemplo, 100, Centro, Araçatuba, SP", fulfillment: "delivery", payment: "Dinheiro", change_for: "R$ 100", notes: "Chamar no portão",
  items: [{ productId: "p1", name: "Combo", qty: 2, price: 20, optionLabel: "Itens do combo", option: "100× Seda (Branca)" }],
  subtotal: 40, delivery_fee: 9, delivery_zone: "", delivery_confirmed: true, total: 49, status: "received", created_at: "2026-10-15T20:00:00Z", updated_at: "2026-10-15T20:00:00Z",
};
const colors = { paper: "white", ink: "black" };
describe("thermal order receipts", () => {
  it("includes delivery details, options, payment and totals on either paper width", () => {
    for (const paper of ["58", "80"] as const) {
      const html = orderReceiptHtml(order, paper, colors);
      for (const text of ["VIA DO ENTREGADOR", order.address, order.customer_phone, "2× Combo", "100× Seda", "Troco para:", "Chamar no portão", "49,00"]) expect(html).toContain(text);
      expect(html).toContain(paper === "58" ? "54mm" : "76mm");
    }
  });
  it("escapes all customer and product content", () => {
    const html = orderReceiptHtml({ ...order, customer_name: '<script>alert(1)</script>', notes: '<img src=x onerror="alert(1)">', items: [{ ...order.items[0], name: "<b>Teste</b>", productId: "p1", qty: 1, price: 20, option: "<iframe>", optionLabel: "Sabor" }] }, "80", colors);
    expect(html).not.toContain("<script>"); expect(html).not.toContain("<img"); expect(html).toContain("&lt;script&gt;"); expect(html).toContain("&lt;iframe&gt;");
  });
  it("does not print an address or delivery fee for pickup", () => {
    const html = orderReceiptHtml({ ...order, fulfillment: "pickup" }, "58", colors);
    expect(html).toContain("RETIRADA NA LOJA"); expect(html).toContain("Sem taxa"); expect(html).not.toContain(order.address); expect(html).not.toContain("VIA DO ENTREGADOR");
  });
  it("does not turn an unconfirmed fee into a free delivery", () => {
    expect(orderReceiptHtml({ ...order, delivery_confirmed: false }, "80", colors)).toContain("A confirmar");
  });
  it("restores only safe local printer preferences", () => {
    expect(parsePrinterPreferences('{"name":"Balcão","paper":"58","address":"private"}')).toEqual({ name: "Balcão", paper: "58" });
    expect(parsePrinterPreferences("broken")).toEqual({ name: "", paper: "80" });
    expect(parsePrinterPreferences('{"paper":"200"}').paper).toBe("80");
  });
});