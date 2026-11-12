import { describe, it, expect } from "vitest";
import { alfaEventStage, alfaPayments, canCallAlfa } from "@/lib/alfa";

describe("Alfa Delivery", () => {
  it("moves to Saiu p/ entrega when the courier picks up", () => expect(alfaEventStage("ORDER_PICKED")).toBe("out_for_delivery"));
  it("moves to Entregue when Alfa delivers", () => expect(alfaEventStage("ORDER_DELIVERED")).toBe("delivered"));
  it("keeps the stage while waiting for a courier", () => expect(alfaEventStage("ACCEPTED")).toBeNull());
  it("allows calling again only after a rejection or cancellation", () => {
    expect(canCallAlfa(null)).toBe(true);
    expect(canCallAlfa("REJECTED")).toBe(true);
    expect(canCallAlfa("ACCEPTED")).toBe(false);
  });
  it("sends change for cash payments", () => {
    expect(alfaPayments("Dinheiro", 47, "R$ 50,00")).toMatchObject({ offlineMethod: [{ type: "CASH" }], change: { value: 3 } });
  });
});
