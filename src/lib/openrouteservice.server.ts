/** All ORS calls happen in Cloudflare Worker, never in the customer's browser. */
import { addressNumber, inDeliveryCity, orsRoutePayload, orsRouteSummary, pickOrsAddress, type OrsFeature, type OrsPoint } from './openrouteservice';

const PELIAS = 'https://api.heigit.org/pelias/v1';
const ROUTES = 'https://api.heigit.org/openrouteservice/v2/directions/driving-car';
const CENTER_LAT = '-21.2089';
const CENTER_LON = '-50.4328';

type PeliasResult = { features?: OrsFeature[] };
function orsKey() {
  const key = process.env['ORS_API_KEY']?.trim();
  if (!key) throw new Error('O serviço gratuito de rotas ainda não foi configurado pela loja.');
  return key;
}
async function callOrs(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: orsKey(), Accept: 'application/json', ...init.headers },
    signal: AbortSignal.timeout(8500),
  });
  if (!response.ok) {
    // No query strings, tokens, street addresses, or customer positions in logs.
    console.error(`[S7VEN] ORS ${response.status} ${url.split('?')[0]}`);
    if (response.status === 429 || response.status === 403) throw new Error('O limite gratuito de consultas de rotas foi alcançado ou a chave não foi autorizada. Tente mais tarde ou escolha retirada na loja.');
    if (response.status === 401) throw new Error('A loja precisa revisar a chave de acesso às rotas.');
    throw new Error('O serviço de localização está temporariamente indisponível. Tente mais tarde ou escolha retirada na loja.');
  }
  return response.json();
}
function peliasUrl(type: 'autocomplete' | 'search' | 'reverse', params: Record<string, string>) {
  const url = new URL(`${PELIAS}/${type}`);
  for (const [name,value] of Object.entries(params)) url.searchParams.set(name,value);
  return url.toString();
}
export async function orsAutocomplete(input: string): Promise<OrsFeature[]> {
  const result = await callOrs(peliasUrl('autocomplete', {
    text: `${input}, Araçatuba, SP`, size: '10', 'focus.point.lat': CENTER_LAT,
    'focus.point.lon': CENTER_LON, 'boundary.country': 'BRA',
    'boundary.circle.lat': CENTER_LAT, 'boundary.circle.lon': CENTER_LON,
    'boundary.circle.radius': '27', layers: 'address,street',
  })) as PeliasResult;
  return Array.isArray(result.features) ? result.features : [];
}
export async function orsGeocodeAddress(address: string): Promise<OrsPoint> {
  if (!addressNumber(address)) throw new Error('Informe o número do imóvel para calcular a entrega.');
  const result = await callOrs(peliasUrl('search', {
    text: address, size: '10', 'focus.point.lat': CENTER_LAT,
    'focus.point.lon': CENTER_LON, 'boundary.country': 'BRA',
    'boundary.circle.lat': CENTER_LAT, 'boundary.circle.lon': CENTER_LON,
    'boundary.circle.radius': '27',
  })) as PeliasResult;
  return pickOrsAddress(result.features ?? [], address);
}
export async function orsReverseGeocode(latitude: number, longitude: number): Promise<OrsPoint | { street: string; number: string; neighborhood: string }> {
  const result = await callOrs(peliasUrl('reverse', {
    'point.lat': String(latitude), 'point.lon': String(longitude),
    size: '10', 'boundary.country': 'BRA', layers: 'address,street',
  })) as PeliasResult;
  const near = (result.features ?? []).find(f => inDeliveryCity(f) && f.properties?.street && (f.properties.layer === 'address' || f.properties.layer === 'street'));
  if (!near) throw new Error('Não encontramos uma rua em Araçatuba para sua localização. Digite o endereço manualmente.');
  const point = near.properties!;
  return { street: point.street!.slice(0,120), number: (point.housenumber ?? '').slice(0,12), neighborhood: (point.neighbourhood ?? '').slice(0,80) };
}
export async function orsDrivingRoute(origin: OrsPoint, destination: OrsPoint) {
  const result = await callOrs(ROUTES, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orsRoutePayload(origin, destination)),
  }) as Parameters<typeof orsRouteSummary>[0];
  return orsRouteSummary(result);
}
