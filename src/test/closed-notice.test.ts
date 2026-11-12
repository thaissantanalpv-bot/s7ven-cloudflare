import { describe, expect, it } from "vitest";
import { EMPTY_SETTINGS, deliveryFeeFrom, nextOpening } from "@/lib/store-settings";
import { checkoutStage } from "@/lib/catalog-analytics";

const week = [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, enabled: day !== 1, open: "16:00", close: "01:00" }));
const settings = { ...EMPTY_SETTINGS, hours_enabled: true, opening_hours: week };

describe("closed-store notice and checkout stages", () => {
  it("says opening is later today before 16:00", () => {
    expect(nextOpening(settings, new Date("2026-11-12T15:00:00Z"))).toBe("hoje às 16:00"); // Thu 12:00 SP
  });
  it("skips Monday when the store is closed", () => {
    expect(nextOpening(settings, new Date("2026-11-16T15:00:00Z"))).toBe("amanhã às 16:00"); // Mon 12:00 SP
  });
  it("shows the lowest distance tier fee", () => {
    expect(deliveryFeeFrom({ ...EMPTY_SETTINGS, delivery_enabled: true, delivery_distance_enabled: true, delivery_distance_tiers: [{ id: "a", upToKm: 5, fee: 10 }, { id: "b", upToKm: 2, fee: 7.5 }] })).toBe(7.5);
  });
  it("records the furthest checkout step", () => {
    expect(checkoutStage({ hasCart: true, deliveryReady: false, paymentChosen: true, sendTapped: false })).toBe(1);
    expect(checkoutStage({ hasCart: true, deliveryReady: true, paymentChosen: false, sendTapped: false })).toBe(2);
    expect(checkoutStage({ hasCart: true, deliveryReady: true, paymentChosen: true, sendTapped: false })).toBe(3);
    expect(checkoutStage({ hasCart: true, deliveryReady: false, paymentChosen: false, sendTapped: true })).toBe(4);
  });
});
