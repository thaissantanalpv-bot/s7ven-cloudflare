import { describe, expect, it } from "vitest";
import { deliveryRouteRequest } from "../lib/delivery-route";

describe("delivery vehicle", () => {
  it("requests motorcycle routing, not driving or cycling", () => {
    const request = deliveryRouteRequest("Araçatuba, SP", { latitude: -21.2089, longitude: -50.4328 });
    expect(request.travelMode).toBe("TWO_WHEELER");
  });
});