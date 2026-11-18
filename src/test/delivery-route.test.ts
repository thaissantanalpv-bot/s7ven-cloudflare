import { describe, expect, it } from "vitest";
import { DELIVERY_TRAVEL_MODE, routeDurationSeconds, estimatedDeliveryMinutes } from "../lib/delivery-route";

describe("delivery vehicle", () => {
  it("adds the chosen 30–45 minute preparation range to the rounded route duration", () => {
    expect(estimatedDeliveryMinutes(routeDurationSeconds("601s"))).toEqual({ min: 41, max: 56 });
    expect(estimatedDeliveryMinutes(0)).toEqual({ min: 30, max: 45 });
  });
  it("does not invent an estimate when route duration is absent or invalid", () => {
    for (const duration of [null, undefined, NaN, -1, Infinity]) expect(estimatedDeliveryMinutes(duration)).toBeNull();
    for (const duration of ["", "10m", "-1s", "Infinitys"]) expect(() => routeDurationSeconds(duration)).toThrow();
  });
  it('identifies the switch to ORS car routing for quote-hash invalidation', () => {
    expect(DELIVERY_TRAVEL_MODE).toBe('openrouteservice-driving-car-v1');
  });
});
