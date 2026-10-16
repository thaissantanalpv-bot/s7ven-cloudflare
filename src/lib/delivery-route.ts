/** Motorized two-wheelers; do not substitute cycling or car routing. */
export const DELIVERY_TRAVEL_MODE = "TWO_WHEELER";

export function deliveryRouteRequest(origin: string, destination: { latitude: number; longitude: number }) {
  return {
    origin: { address: origin },
    destination: { location: { latLng: destination } },
    travelMode: DELIVERY_TRAVEL_MODE,
    routingPreference: "TRAFFIC_UNAWARE",
  };
}