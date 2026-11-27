/** ORS free public API supports driving-car, not a motorcycle route profile. */
export const DELIVERY_TRAVEL_MODE = 'openrouteservice-driving-car-v1';
export const DELIVERY_QUOTE_TTL_MS = 15 * 60_000;

/** Legacy Google duration parser retained for regression tests; ORS returns numeric seconds. */
export function routeDurationSeconds(duration: string) {
  if (!/^\d+(\.\d+)?s$/.test(duration)) throw new Error('Duração de rota inválida.');
  const seconds = Number(duration.slice(0, -1));
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Duração de rota inválida.');
  return seconds;
}
export function estimatedDeliveryMinutes(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const travel = Math.ceil(seconds / 60);
  return { min: travel + 30, max: travel + 45 };
}
