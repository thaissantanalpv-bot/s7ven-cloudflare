import { describe, expect, it } from 'vitest';
import { addressNumber, inDeliveryCity, orsAlfaAddress, orsRoutePayload, orsRouteSummary, orsSuggestions, pickOrsAddress, toOrsPoint, type OrsFeature } from '@/lib/openrouteservice';
const address: OrsFeature = {
  geometry: { type: 'Point', coordinates: [-50.42, -21.20] },
  properties: { gid: 'oa:address:1', layer: 'address', label: 'Rua Teste, 123, Araçatuba', street: 'Rua Teste', housenumber: '123', locality: 'Araçatuba', region_a: 'SP', country_a: 'BRA', neighbourhood: 'Centro', postalcode: '16000-100' },
};
describe('ORS/Pelias adapter – fail closed', () => {
  it('accepts exact numbered address within Araçatuba', () => {
    expect(addressNumber('Rua Teste, 123, Centro, Araçatuba, SP, Brasil')).toBe('123');
    const point = pickOrsAddress([address], 'Rua Teste, 123, Araçatuba, SP');
    expect(point).toMatchObject({ latitude: -21.20, longitude: -50.42, number: '123' });
  });
  it('rejects mismatched number and street-centroid as a full address', () => {
    expect(() => pickOrsAddress([address], 'Rua Teste, 999, Araçatuba, SP')).toThrow('confirmar');
    expect(() => toOrsPoint({ ...address, properties: { ...address.properties!, layer: 'street' } }, '123')).toThrow();
  });
  it('rejects other cities even when the label contains Araçatuba', () => {
    const other = { ...address, properties: { ...address.properties!, locality: 'Birigui', label: 'Araçatuba' } };
    expect(inDeliveryCity(other)).toBe(false);
    expect(() => pickOrsAddress([other], 'Rua Teste, 123, Araçatuba')).toThrow();
  });
  it('returns safe autocomplete suggestions without trusting venue data', () => {
    expect(orsSuggestions([address, address, { ...address, properties: { ...address.properties!, layer: 'venue' } }])).toHaveLength(1);
  });
  it('uses [longitude, latitude] and validates kilometers and duration', () => {
    const point = toOrsPoint(address, '123');
    expect(orsRoutePayload(point, point).coordinates).toEqual([[-50.42, -21.20], [-50.42, -21.20]]);
    expect(orsRouteSummary({ routes: [{ summary: { distance: 2899, duration: 720 } }] })).toEqual({ km: 2.899, durationSeconds: 720 });
    expect(() => orsRouteSummary({ routes: [{ summary: { distance: -1, duration: 0 } }] })).toThrow();
  });
  it('does not invent courier postal code', () => {
    const point = toOrsPoint(address, '123');
    expect(orsAlfaAddress(point).postalCode).toBe('16000-100');
    expect(() => orsAlfaAddress({ ...point, postalCode: '' })).toThrow('CEP');
  });
});
