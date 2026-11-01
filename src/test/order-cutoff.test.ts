import { describe, expect, it } from "vitest";
import { EMPTY_SETTINGS, ordersOpen, type StoreSettings } from "@/lib/store-settings";

const base: StoreSettings = {
  ...EMPTY_SETTINGS,
  hours_enabled: true,
  order_cutoff: "23:00",
  opening_hours: EMPTY_SETTINGS.opening_hours.map((h) => ({ ...h, enabled: true, open: "16:00", close: "02:00" })),
};

// 2026-10-14 é quarta-feira; horários em UTC-3 (São Paulo)
const at = (iso: string) => new Date(iso);

describe("ordersOpen", () => {
  it("permite entrega e retirada antes das 23:00", () => {
    expect(ordersOpen(base, at("2026-10-14T20:00:00-03:00"))).toMatchObject({ open: true, delivery: true });
  });

  it("depois das 23:00 aceita pedido somente para retirada, até a loja fechar", () => {
    expect(ordersOpen(base, at("2026-10-14T23:30:00-03:00"))).toMatchObject({ open: true, delivery: false, reason: "cutoff", closesAt: "02:00" });
  });

  it("depois da meia-noite continua só retirada enquanto a loja está aberta", () => {
    expect(ordersOpen(base, at("2026-10-15T01:00:00-03:00"))).toMatchObject({ open: true, delivery: false, closesAt: "02:00" });
  });

  it("bloqueia também a retirada depois do fechamento da loja", () => {
    expect(ordersOpen(base, at("2026-10-15T02:30:00-03:00"))).toMatchObject({ open: false, delivery: false, reason: "closed" });
  });

  it("bloqueia quando a loja está fechada", () => {
    expect(ordersOpen(base, at("2026-10-14T10:00:00-03:00"))).toMatchObject({ open: false, reason: "closed" });
  });

  it("aceita outro horário limite das entregas", () => {
    const s = { ...base, order_cutoff: "21:30" };
    expect(ordersOpen(s, at("2026-10-14T21:00:00-03:00"))).toMatchObject({ open: true, delivery: true });
    expect(ordersOpen(s, at("2026-10-14T21:45:00-03:00"))).toMatchObject({ open: true, delivery: false });
  });
});
