import { describe, expect, it } from "vitest";
import { EMPTY_SETTINGS, settingsSchema, storeStatus } from "@/lib/store-settings";

describe("Store settings", () => {
  it("starts without invented delivery fees or active hours", () => {
    expect(settingsSchema.parse(EMPTY_SETTINGS).delivery_enabled).toBe(false);
    expect(storeStatus(EMPTY_SETTINGS).configured).toBe(false);
  });
  it("requires a region when delivery pricing is enabled", () => {
    expect(settingsSchema.safeParse({...EMPTY_SETTINGS,delivery_enabled:true}).success).toBe(false);
  });
  it("supports fixed fees without regions and validates their limits", () => {
    expect(settingsSchema.safeParse({ ...EMPTY_SETTINGS, delivery_enabled: true, fixed_delivery_fee: 9 }).success).toBe(true);
    for (const fee of [-1, 1001]) expect(settingsSchema.safeParse({ ...EMPTY_SETTINGS, fixed_delivery_fee: fee }).success).toBe(false);
  });
  it("rejects negative fees and duplicate regions", () => {
    expect(settingsSchema.safeParse({...EMPTY_SETTINGS,delivery_zones:[{id:"a",name:"Centro",fee:-1}]}).success).toBe(false);
    expect(settingsSchema.safeParse({...EMPTY_SETTINGS,delivery_zones:[{id:"a",name:"Centro",fee:1},{id:"b",name:"centro",fee:2}]}).success).toBe(false);
  });
  it("evaluates overnight hours in Sao Paulo timezone", () => {
    const settings = {...EMPTY_SETTINGS,hours_enabled:true,opening_hours:EMPTY_SETTINGS.opening_hours.map(h => ({...h, enabled:h.day===5,open:"18:00",close:"02:00"}))};
    expect(storeStatus(settings,new Date("2026-10-10T04:00:00Z")).open).toBe(true);
    expect(storeStatus(settings,new Date("2026-10-10T05:00:00Z")).open).toBe(false);
    expect(storeStatus(settings,new Date("2026-10-09T20:00:00Z")).open).toBe(false);
  });
  it("shows closed status before opening, at closing and on disabled days", () => {
    const settings = {...EMPTY_SETTINGS, hours_enabled:true, opening_hours:EMPTY_SETTINGS.opening_hours.map(h => ({...h, enabled:h.day===4, open:"18:00", close:"23:00"}))};
    expect(storeStatus(settings, new Date("2026-10-15T20:59:00Z"))).toEqual({open:false, configured:true, label:"Fechado agora"});
    expect(storeStatus(settings, new Date("2026-10-15T21:00:00Z")).open).toBe(true);
    expect(storeStatus(settings, new Date("2026-10-16T02:00:00Z")).open).toBe(false);
    expect(storeStatus(settings, new Date("2026-10-16T21:00:00Z")).open).toBe(false);
  });
});
import { describe as d2, it as i2, expect as e2 } from "vitest";
import { applyCoupon as ac, EMPTY_SETTINGS as ES } from "@/lib/store-settings";
d2("cupons", () => {
  const s = { ...ES, coupons: [{ code: "SEXTOU10", type: "percent" as const, value: 10, minOrder: 50, active: true }, { code: "OFF", type: "fixed" as const, value: 5, minOrder: 0, active: false }] };
  i2("aplica porcentagem acima do mínimo", () => e2(ac(s, "sextou10", 100)?.discount).toBe(10));
  i2("rejeita abaixo do mínimo", () => e2(ac(s, "SEXTOU10", 40)).toBeNull());
  i2("rejeita cupom inativo", () => e2(ac(s, "OFF", 100)).toBeNull());
});

import { ordersOpen } from "@/lib/store-settings";
describe("pausa da loja", () => {
  it("bloqueia pedidos quando a loja está pausada, mesmo sem horários", () => {
    expect(ordersOpen({ ...EMPTY_SETTINGS, paused: true })).toMatchObject({ open: false, reason: "paused" });
    expect(ordersOpen({ ...EMPTY_SETTINGS, paused: false }).open).toBe(true);
  });
});
