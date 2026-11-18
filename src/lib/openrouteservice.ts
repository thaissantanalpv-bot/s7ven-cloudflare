/** Pure Pelias/OpenRouteService adapters; no keys or network calls in browser bundles. */
export type OrsFeature = {
  geometry?: { type?: string; coordinates?: number[] };
  properties?: {
    gid?: string; layer?: string; label?: string; street?: string; housenumber?: string;
    neighbourhood?: string; neighbourhood_a?: string; locality?: string; county?: string;
    region?: string; region_a?: string; country?: string; country_a?: string;
    postalcode?: string; confidence?: number;
  };
};
export type OrsPoint = {
  latitude: number; longitude: number; street: string; number: string;
  neighborhood: string; postalCode: string;
};

export const ORS_ROUTE_PROVIDER = 'openrouteservice-driving-car-v1';

function normalized(value: string | undefined): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function sameNumber(a: string | undefined, b: string): boolean {
  return normalized(a).replace(/\s/g, '') === normalized(b).replace(/\s/g, '');
}
export function addressNumber(address: string): string {
  // A complete checkout address is: "Rua ..., 123, Bairro, Araçatuba, SP, Brasil".
  return /,\s*(\d{1,6}[a-zA-Z-]*)\s*(?:,|$)/.exec(address)?.[1] ?? '';
}
export function inDeliveryCity(feature: OrsFeature): boolean {
  const p = feature.properties;
  if (!p) return false;
  const city = normalized(p.locality || p.county);
  const region = normalized(p.region_a || p.region);
  const country = normalized(p.country_a || p.country);
  // Require verified administrative fields, not merely a mention of Araçatuba in the label.
  if (city !== 'aracatuba' || !['sp', 'sao paulo'].includes(region) || !['bra', 'br', 'brasil', 'brazil'].includes(country)) return false;
  const c = feature.geometry?.coordinates;
  return Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
    && c[1]! >= -21.55 && c[1]! <= -20.9 && c[0]! >= -50.9 && c[0]! <= -50.05;
}
export function toOrsPoint(feature: OrsFeature, expectedNumber?: string): OrsPoint {
  if (!inDeliveryCity(feature)) throw new Error('Endereço fora de Araçatuba, SP. Confira a cidade ou escolha retirada na loja.');
  const p = feature.properties!;
  const coords = feature.geometry!.coordinates!;
  if (!p.street || p.layer !== 'address') throw new Error('O mapa não encontrou um endereço com rua e número. Confira o endereço completo.');
  if (expectedNumber && !sameNumber(p.housenumber, expectedNumber)) {
    throw new Error('O número informado não foi confirmado pelo mapa. Confira o número e o endereço antes de calcular a entrega.');
  }
  if (!p.housenumber) throw new Error('O mapa não identificou o número do imóvel. Confira o endereço ou fale com a loja.');
  return {
    longitude: coords[0]!, latitude: coords[1]!,
    street: p.street.trim(), number: p.housenumber.trim(),
    neighborhood: (p.neighbourhood ?? '').trim().slice(0,80),
    postalCode: (p.postalcode ?? '').trim(),
  };
}
export function pickOrsAddress(features: OrsFeature[], address: string): OrsPoint {
  const number = addressNumber(address);
  if (!number) throw new Error('Informe rua e número completos para calcular a entrega.');
  const match = features.find(f => inDeliveryCity(f) && f.properties?.layer === 'address' && f.properties.street && sameNumber(f.properties.housenumber, number));
  if (!match) throw new Error('Não foi possível confirmar esse número em Araçatuba no mapa gratuito. Revise o endereço ou escolha retirada na loja.');
  return toOrsPoint(match, number);
}
export function orsSuggestions(features: OrsFeature[]): { placeId: string; text: string; street: string; number: string; neighborhood: string }[] {
  const result: { placeId: string; text: string; street: string; number: string; neighborhood: string }[] = [];
  const seen = new Set<string>();
  for (const feature of features) {
    if (!inDeliveryCity(feature)) continue;
    const p = feature.properties;
    if (!p || !p.street || !['address', 'street'].includes(p.layer ?? '')) continue;
    const text = p.label?.trim() || [p.street, p.housenumber, 'Araçatuba, SP'].filter(Boolean).join(', ');
    const key = `${normalized(p.street)}-${normalized(p.housenumber)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ placeId: p.gid ?? `ors-${result.length}`, text, street: p.street, number: p.housenumber ?? '', neighborhood: p.neighbourhood ?? '' });
    if (result.length >= 5) break;
  }
  return result;
}
export function orsRoutePayload(origin: OrsPoint, destination: OrsPoint) {
  return { coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]], instructions: false, geometry: false };
}
export function orsRouteSummary(payload: { routes?: { summary?: { distance?: number; duration?: number } }[] }): { km: number; durationSeconds: number } {
  const s = payload.routes?.[0]?.summary;
  if (!s || typeof s.distance !== 'number' || typeof s.duration !== 'number' ||
      !Number.isFinite(s.distance) || s.distance < 0 || !Number.isFinite(s.duration) || s.duration < 0) {
    throw new Error('Não foi possível calcular uma rota válida. Confira o endereço ou escolha retirada na loja.');
  }
  return { km: s.distance / 1000, durationSeconds: s.duration };
}
export function orsAlfaAddress(point: OrsPoint, complement = '') {
  if (!point.postalCode) throw new Error('O mapa não retornou o CEP para chamar o entregador Alfa. Confira o endereço com a loja.');
  return {
    country: 'BR' as const, state: 'BR-SP', city: 'Araçatuba', district: point.neighborhood || 'Não informado',
    street: point.street, number: point.number, postalCode: point.postalCode,
    complement: complement.slice(0, 120), latitude: point.latitude, longitude: point.longitude,
  };
}
