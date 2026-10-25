import { buildProviderMarkers, type ProviderWithDistance } from '../providerMapUtils';

jest.mock('expo-location', () => ({}));

const createProvider = (
  overrides: Partial<ProviderWithDistance> & { distanceMiles?: number }
): ProviderWithDistance => ({
  id: 'provider-1',
  name: 'Downtown Clinic',
  type: 'Clinic',
  address: '10 Main St',
  phone: '555-0100',
  created_at: '2026-01-01T00:00:00Z',
  lat: 40.7128,
  lng: -74.006,
  ...overrides,
});

describe('buildProviderMarkers', () => {
  it('maps providers with coordinates to map markers', () => {
    const markers = buildProviderMarkers([
      createProvider({ distanceMiles: 1.24 }),
      createProvider({
        id: 'provider-2',
        name: 'General Hospital',
        type: 'Hospital',
        address: '200 Care Ave',
        lat: 40.75,
        lng: -73.99,
        distanceMiles: 0.04,
      }),
    ]);

    expect(markers).toHaveLength(2);
    expect(markers[0]).toEqual({
      id: 'provider-1',
      name: 'Downtown Clinic',
      type: 'Clinic',
      address: '10 Main St',
      coordinate: { latitude: 40.7128, longitude: -74.006 },
      distanceLabel: '1.2 mi away',
    });
    expect(markers[1].distanceLabel).toBe('Nearby (<0.1 mi away)');
  });

  it('drops providers without usable coordinates', () => {
    const markers = buildProviderMarkers([
      createProvider({ id: 'missing-lat', lat: null }),
      createProvider({ id: 'missing-lng', lng: null }),
      createProvider({ id: 'valid' }),
    ]);

    expect(markers.map((marker) => marker.id)).toEqual(['valid']);
  });

  it('falls back to a readable name and omits an unknown distance', () => {
    const [marker] = buildProviderMarkers([
      createProvider({ name: null, address: null, distanceMiles: undefined }),
    ]);

    expect(marker.name).toBe('Medical Facility');
    expect(marker.address).toBeNull();
    expect(marker.distanceLabel).toBeUndefined();
  });
});
