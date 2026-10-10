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
});