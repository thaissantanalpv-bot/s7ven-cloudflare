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
  it("permite pedidos dentro do horário e antes do limite", () => {
    expect(ordersOpen(base, at("2026-10-14T20:00:00-03:00"))).toMatchObject({ open: true });
  });

  it("bloqueia pedidos após o limite mesmo com a loja aberta", () => {
    const r = ordersOpen(base, at("2026-10-14T23:30:00-03:00"));
    expect(r).toMatchObject({ open: false, reason: "cutoff" });
  });

  it("bloqueia pedidos depois da meia-noite (entregas encerradas)", () => {
    const r = ordersOpen(base, at("2026-10-15T01:00:00-03:00"));
    expect(r).toMatchObject({ open: false, reason: "cutoff" });
  });

  it("bloqueia quando a loja está fechada", () => {
    const r = ordersOpen(base, at("2026-10-14T10:00:00-03:00"));
    expect(r).toMatchObject({ open: false, reason: "closed" });
  });

  it("aceita outro horário limite configurado", () => {
    const s = { ...base, order_cutoff: "21:30" };
    expect(ordersOpen(s, at("2026-10-14T21:00:00-03:00"))).toMatchObject({ open: true });
    expect(ordersOpen(s, at("2026-10-14T21:45:00-03:00"))).toMatchObject({ open: false, reason: "cutoff" });
  });
});
