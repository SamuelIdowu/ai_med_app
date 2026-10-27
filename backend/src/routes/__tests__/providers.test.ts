import request from 'supertest';
import app from '../../app';
import {
  findGeoapifyProviderPhone,
  findNearbyProviders,
} from '../../services/nearbyProvidersService';

jest.mock('../../services/nearbyProvidersService', () => ({
  findNearbyProviders: jest.fn(),
  findGeoapifyProviderPhone: jest.fn(),
}));

const mockedFindNearbyProviders = findNearbyProviders as jest.MockedFunction<
  typeof findNearbyProviders
>;
const mockedFindGeoapifyProviderPhone = findGeoapifyProviderPhone as jest.MockedFunction<
  typeof findGeoapifyProviderPhone
>;

describe('GET /api/v1/providers/nearby', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns nearby OSM facilities without requiring an account', async () => {
    const nearbyResult = {
      providers: [
        {
          id: 'osm-node-1',
          name: 'Nearby Clinic',
          type: 'Clinic',
          address: null,
          phone: null,
          lat: 6.525,
          lng: 3.38,
          distanceMiles: 0.1,
          created_at: null,
        },
      ],
      source: 'OpenStreetMap' as const,
      sourceTimestamp: '2026-10-26T12:00:00Z',
    };
    mockedFindNearbyProviders.mockResolvedValue(nearbyResult);

    const response = await request(app).get('/api/v1/providers/nearby?lat=6.5244&lng=3.3792');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(nearbyResult);
    expect(mockedFindNearbyProviders).toHaveBeenCalledWith(
      { latitude: 6.5244, longitude: 3.3792 },
      50_000,
    );
  });

  it('rejects malformed and out-of-range coordinates', async () => {
    const malformed = await request(app).get('/api/v1/providers/nearby?lat=abc&lng=3');
    const outOfRange = await request(app).get('/api/v1/providers/nearby?lat=91&lng=3');

    expect(malformed.status).toBe(400);
    expect(outOfRange.status).toBe(400);
    expect(mockedFindNearbyProviders).not.toHaveBeenCalled();
  });

  it('returns a retryable error when live provider data is unavailable', async () => {
    mockedFindNearbyProviders.mockRejectedValue(new Error('upstream unavailable'));

    const response = await request(app).get('/api/v1/providers/nearby?lat=6.5244&lng=3.3792');

    expect(response.status).toBe(502);
    expect(response.body.error).toContain('could not be reached');
  });
});

describe('GET /api/v1/providers/nearby/:providerId/contact', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an available Geoapify phone number', async () => {
    mockedFindGeoapifyProviderPhone.mockResolvedValue('+234800000000');

    const response = await request(app).get(
      '/api/v1/providers/nearby/geoapify-place-123/contact',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ phone: '+234800000000' });
    expect(mockedFindGeoapifyProviderPhone).toHaveBeenCalledWith('place-123');
  });

  it('returns an empty phone for providers without a Geoapify record', async () => {
    const response = await request(app).get('/api/v1/providers/nearby/osm-node-1/contact');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ phone: null });
    expect(mockedFindGeoapifyProviderPhone).not.toHaveBeenCalled();
  });
});
