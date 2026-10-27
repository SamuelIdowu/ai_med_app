import fetch from 'node-fetch';
import { cacheService } from '../cacheService';
import {
  buildOverpassQuery,
  findNearbyProviders,
  normalizeGeoapifyPlaces,
  normalizeOverpassElements,
} from '../nearbyProvidersService';

jest.mock('node-fetch', () => jest.fn());
jest.mock('../cacheService', () => ({
  cacheService: { get: jest.fn(), set: jest.fn() },
}));

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockedCache = cacheService as jest.Mocked<typeof cacheService>;
const lagos = { latitude: 6.5244, longitude: 3.3792 };
const originalOverpassUrl = process.env.OVERPASS_API_URL;
const originalGeoapifyApiKey = process.env.GEOAPIFY_API_KEY;

describe('nearbyProvidersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
    delete process.env.GEOAPIFY_API_KEY;
    mockedCache.get.mockResolvedValue(null);
  });

  afterAll(() => {
    if (originalOverpassUrl === undefined) {
      delete process.env.OVERPASS_API_URL;
    } else {
      process.env.OVERPASS_API_URL = originalOverpassUrl;
    }
    if (originalGeoapifyApiKey === undefined) {
      delete process.env.GEOAPIFY_API_KEY;
    } else {
      process.env.GEOAPIFY_API_KEY = originalGeoapifyApiKey;
    }
  });

  it('builds a radius query for global healthcare and amenity tags', () => {
    const query = buildOverpassQuery(lagos, 25_000);

    expect(query).toContain('around:25000,6.5244,3.3792');
    expect(query).toContain('"amenity"');
    expect(query).toContain('"healthcare"');
    expect(query).toContain('out center tags');
  });

  it('normalizes nodes and building centers and sorts by actual distance', () => {
    const providers = normalizeOverpassElements(
      [
        {
          type: 'way',
          id: 2,
          center: { lat: 6.7, lon: 3.5 },
          tags: { amenity: 'hospital', name: 'Far Hospital' },
        },
        {
          type: 'node',
          id: 1,
          lat: 6.525,
          lon: 3.38,
          tags: {
            amenity: 'clinic',
            name: 'Nearby Clinic',
            'addr:street': 'Allen Avenue',
            'addr:city': 'Ikeja',
            'contact:phone': '+234800000000',
          },
        },
      ],
      lagos,
    );

    expect(providers.map((provider) => provider.name)).toEqual(['Nearby Clinic', 'Far Hospital']);
    expect(providers[0]).toMatchObject({
      id: 'osm-node-1',
      type: 'Clinic',
      address: 'Allen Avenue, Ikeja',
      phone: '+234800000000',
    });
    expect(providers[0].distanceMiles).toBeLessThan(1);
  });

  it('requests live Overpass data and returns its source timestamp', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [{ type: 'node', id: 10, lat: 6.525, lon: 3.38, tags: { amenity: 'hospital' } }],
        osm3s: { timestamp_osm_base: '2026-10-26T12:00:00Z' },
      }),
    } as never);

    const result = await findNearbyProviders(lagos, 10_000);

    expect(mockedFetch).toHaveBeenCalledWith(
      'https://overpass-api.de/api/interpreter',
      expect.objectContaining({ method: 'POST', timeout: 7_000 }),
    );
    expect(result).toMatchObject({
      source: 'OpenStreetMap',
      sourceTimestamp: '2026-10-26T12:00:00Z',
    });
    expect(result.providers).toHaveLength(1);
    expect(mockedCache.set).toHaveBeenCalledWith(
      expect.stringContaining('providers:nearby:'),
      result,
      600,
    );
  });

  it('uses the secondary global endpoint when the primary one is unavailable', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('primary timed out')).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [{ type: 'node', id: 11, lat: 6.525, lon: 3.38, tags: { amenity: 'clinic' } }],
        osm3s: { timestamp_osm_base: '2026-10-26T12:01:00Z' },
      }),
    } as never);

    const result = await findNearbyProviders(lagos, 10_000);

    expect(mockedFetch).toHaveBeenNthCalledWith(
      2,
      'https://overpass.private.coffee/api/interpreter',
      expect.objectContaining({ method: 'POST', timeout: 7_000 }),
    );
    expect(result.providers[0].name).toBe('Clinic');
    expect(result.sourceTimestamp).toBe('2026-10-26T12:01:00Z');
  });

  it('rejects invalid coordinates and out-of-range radii', async () => {
    await expect(findNearbyProviders({ latitude: 95, longitude: 3 }, 10_000)).rejects.toThrow(
      'valid latitude and longitude',
    );
    await expect(findNearbyProviders(lagos, 100_000)).rejects.toThrow('Radius must be between');
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('normalizes Geoapify healthcare places and sorts by measured distance', () => {
    const providers = normalizeGeoapifyPlaces(
      [
        {
          properties: {
            place_id: 'far-hospital',
            name: 'Far Hospital',
            lat: 6.7,
            lon: 3.5,
            formatted: 'Far Hospital, Lagos',
            categories: ['healthcare', 'healthcare.hospital'],
          },
        },
        {
          properties: {
            place_id: 'near-pharmacy',
            name: 'Nearby Pharmacy',
            lat: 6.525,
            lon: 3.38,
            address_line2: 'Allen Avenue, Ikeja',
            categories: ['healthcare', 'healthcare.pharmacy'],
            contact: { phone: '+234800000000' },
          },
        },
        { properties: { place_id: 'invalid', lat: Number.NaN, lon: 3.38 } },
      ],
      lagos,
    );

    expect(providers.map(({ name }) => name)).toEqual(['Nearby Pharmacy', 'Far Hospital']);
    expect(providers[0]).toMatchObject({
      id: 'geoapify-near-pharmacy',
      type: 'Pharmacy',
      address: 'Allen Avenue, Ikeja',
      phone: '+234800000000',
    });
  });

  it('uses Geoapify first when configured for faster nearby results', async () => {
    process.env.GEOAPIFY_API_KEY = 'test-geoapify-key';
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ properties: {
          place_id: 'lagos-clinic', name: 'Lagos Clinic', lat: 6.525, lon: 3.38,
          categories: ['healthcare', 'healthcare.clinic_or_praxis'],
        } }],
      }),
    } as never);

    const result = await findNearbyProviders(lagos, 10_000);
    const geoapifyRequest = new URL(String(mockedFetch.mock.calls[0][0]));

    expect(geoapifyRequest.origin + geoapifyRequest.pathname).toBe('https://api.geoapify.com/v2/places');
    expect(geoapifyRequest.searchParams.has('apiKey')).toBe(false);
    expect(mockedFetch.mock.calls[0][1]?.headers).toMatchObject({ 'x-api-key': 'test-geoapify-key' });
    expect(geoapifyRequest.searchParams.get('categories')).toBe('healthcare');
    expect(geoapifyRequest.searchParams.get('filter')).toBe('circle:3.3792,6.5244,10000');
    expect(result).toMatchObject({ source: 'Geoapify', sourceTimestamp: null });
    expect(result.providers[0]).toMatchObject({ name: 'Lagos Clinic', type: 'Clinic' });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to Overpass when Geoapify is unavailable', async () => {
    process.env.GEOAPIFY_API_KEY = 'test-geoapify-key';
    mockedFetch.mockRejectedValueOnce(new Error('Geoapify timeout')).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [{ type: 'node', id: 22, lat: 6.525, lon: 3.38, tags: { amenity: 'hospital' } }],
      }),
    } as never);

    const result = await findNearbyProviders(lagos, 10_000);
    expect(result.source).toBe('OpenStreetMap');
    expect(result.providers[0]).toMatchObject({ name: 'Hospital', type: 'Hospital' });
  });

  it('reuses a cached nearby search without calling Overpass again', async () => {
    const cached = { providers: [], source: 'OpenStreetMap' as const, sourceTimestamp: null };
    mockedCache.get.mockResolvedValue(cached);

    await expect(findNearbyProviders(lagos, 10_000)).resolves.toBe(cached);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
