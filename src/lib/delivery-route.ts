/** Motorized two-wheelers; do not substitute cycling or car routing. */
export const DELIVERY_TRAVEL_MODE = "TWO_WHEELER";

export function routeDurationSeconds(duration: string) {
  if (!/^\d+(\.\d+)?s$/.test(duration)) throw new Error("Duração de rota inválida.");
  const seconds = Number(duration.slice(0, -1));
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error("Duração de rota inválida.");
  return seconds;
}
export function estimatedDeliveryMinutes(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const travel = Math.ceil(seconds / 60);
  return { min: travel + 30, max: travel + 45 };
}

export function deliveryRouteRequest(origin: string, destination: { latitude: number; longitude: number }) {
  return {
    origin: { address: origin },
    destination: { location: { latLng: destination } },
    travelMode: DELIVERY_TRAVEL_MODE,
    routingPreference: "TRAFFIC_UNAWARE",
  };
}