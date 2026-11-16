import { describe, expect, it } from "vitest";
import { courierMessage, quickMessages } from "@/lib/quick-messages";
import { categoryLink } from "@/lib/share-links";

const base = { customer_name: "Ana Souza", customer_phone: "18999990000", address: "Rua A, 10 - Centro", payment: "Pix", change_for: "", total: 50, delivery_fee: 8, notes: "", number: 12, tracking_url: null, fulfillment: "delivery" as const };

describe("mensagens rápidas", () => {
  it("Pix mostra conferido e aguardando comprovante", () => {
    expect(quickMessages(base).map(m => m.id)).toEqual(["pix-ok", "pix-wait", "moto"]);
  });
  it("retirada oferece pronto para retirada, sem motoboy", () => {
    expect(quickMessages({ ...base, payment: "Dinheiro", fulfillment: "pickup" }).map(m => m.id)).toEqual(["pickup"]);
  });
  it("motoboy: Pix já pago, dinheiro cobra total e troco", () => {
    expect(courierMessage(base)).toContain("Já pago via Pix");
    expect(courierMessage({ ...base, payment: "Dinheiro", change_for: "R$ 100" })).toContain("Cobrar R$\u00a050,00 (Dinheiro) · troco para R$ 100");
  });
  it("link de categoria abre a aba categorias", () => {
    expect(categoryLink("https://s7venlounge.shop", "Combos")).toBe("https://s7venlounge.shop/?aba=categorias&categoria=Combos");
  });
});

describe("courierMessage retorno", () => {
  const o = { number: 1, customer_name: "A", customer_phone: "1", address: "R", total: 10, notes: "" } as never;
  it("pede retorno no dinheiro", () => expect(courierMessage({ ...(o as object), payment: "Dinheiro" } as never)).toContain("Retornar à loja"));
  it("não pede retorno no Pix", () => expect(courierMessage({ ...(o as object), payment: "Pix" } as never)).not.toContain("Retornar à loja"));
});
