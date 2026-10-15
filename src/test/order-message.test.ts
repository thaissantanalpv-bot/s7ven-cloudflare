import { describe, expect, it } from "vitest";
import { checkoutWhatsApp, productMessage, productPhotoLink } from "@/lib/order-message";

describe("WhatsApp product photos", () => {
  it("includes a persistent catalog photo link, quantities, options and totals", () => {
    const message = productMessage({ id: "p4", name: "Produto teste", qty: 3, price: 10, option: "Melancia", optionLabel: "Sabor", hasPhoto: true }, "https://s7venlounge.lovable.app");
    expect(message).toContain("*3x Produto teste*");
    expect(message).toContain("Sabor: Melancia");
    expect(message).toContain("30,00");
    expect(message).toContain("https://s7venlounge.lovable.app/?produto=p4");
    expect(message).not.toContain("token");
    const url = new URL(checkoutWhatsApp(123, [message], "18999999999"));
    expect(url.pathname).toBe("/5518991511004");
    expect(url.searchParams.get("text")).toContain("Pedido #123");
  });
  it("omits missing photos and keeps combo choices", () => {
    const message = productMessage({ id: "x", name: "Combo", qty: 1, price: 20, option: "", hasPhoto: false, combo: "Bebida: 1× Gin" }, "https://s7venlounge.lovable.app");
    expect(message).not.toContain("Foto:");
    expect(message).toContain("Bebida: 1× Gin");
    expect(new URL(productPhotoLink("https://example.com", "id com espaço")).searchParams.get("produto")).toBe("id com espaço");
  });
});