// mobile/src/services/__tests__/geoUtils.test.ts

import * as Location from 'expo-location';
import {
  MAX_LAST_KNOWN_AGE_MS,
  calculateDistanceMiles,
  formatDistance,
  formatDistanceLabel,
  formatDistanceKilometers,
  formatDistanceKilometersLabel,
  milesToKilometers,
  getValidCoordinates,
  getUserLocationWithStatus,
  normalizeLatitude,
  normalizeLongitude,
  sortProvidersByProximity,
} from '../geoUtils';
import { Provider } from '../types';

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 40.7128,
      longitude: -74.006,
    },
  }),
  getLastKnownPositionAsync: jest.fn().mockResolvedValue(null),
  Accuracy: {
    High: 4,
    Balanced: 3,
  },
}));

const createMockProvider = (overrides: Partial<Provider>): Provider => ({
  id: 'test-id',
  name: 'Test Clinic',
  type: 'Clinic',
  address: '123 Main St',
  phone: '555-0100',
  created_at: '2026-01-01T00:00:00Z',
  lat: 40.7128,
  lng: -74.006,
  ...overrides,
});

const requireDistance = (provider: { distanceMiles: number | null }): number => {
  if (provider.distanceMiles === null) {
    throw new Error('Expected provider distance to be available');
  }
  return provider.distanceMiles;
};

describe('Geolocation & Clinic Proximity Utilities', () => {
  const getPermissions = Location.getForegroundPermissionsAsync as jest.Mock;
  const requestPermissions = Location.requestForegroundPermissionsAsync as jest.Mock;
  const getPosition = Location.getCurrentPositionAsync as jest.Mock;
  const getLastKnownPosition = Location.getLastKnownPositionAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getPermissions.mockResolvedValue({ status: 'granted' });
    requestPermissions.mockResolvedValue({ status: 'granted' });
    getPosition.mockResolvedValue({
      coords: { latitude: 34.0522, longitude: -118.2437 },
    });
    getLastKnownPosition.mockResolvedValue(null);
  });

  describe('calculateDistanceMiles (Haversine formula)', () => {
    it('returns zero for identical coordinates', () => {
      const dist = calculateDistanceMiles(40.7128, -74.006, 40.7128, -74.006);
      expect(dist).toBeCloseTo(0, 4);
    });

    it('accurately computes distance between New York and Philadelphia (~80-85 miles)', () => {
      const nyc = { lat: 40.7128, lon: -74.006 };
      const philly = { lat: 39.9526, lon: -75.1652 };
      const dist = calculateDistanceMiles(nyc.lat, nyc.lon, philly.lat, philly.lon);
      expect(dist).toBeGreaterThan(75);
      expect(dist).toBeLessThan(90);
    });

    it('accurately calculates short city distances (~1-3 miles)', () => {
      // Midtown Manhattan to Lower Manhattan (~3.8 miles)
      const midtown = { lat: 40.7589, lon: -73.9851 };
      const downtown = { lat: 40.7128, lon: -74.006 };
      const dist = calculateDistanceMiles(midtown.lat, midtown.lon, downtown.lat, downtown.lon);
      expect(dist).toBeGreaterThan(3);
      expect(dist).toBeLessThan(4.5);
    });
  });

  describe('formatDistance', () => {
    it('formats distances less than 0.1 miles as Nearby (<0.1 mi away)', () => {
      expect(formatDistance(0.04)).toBe('Nearby (<0.1 mi away)');
      expect(formatDistance(0.09)).toBe('Nearby (<0.1 mi away)');
    });

    it('formats miles with 1 decimal place and suffix', () => {
      expect(formatDistance(1.234)).toBe('1.2 mi away');
      expect(formatDistance(0.5)).toBe('0.5 mi away');
      expect(formatDistance(12.0)).toBe('12.0 mi away');
    });

    it('returns null for missing or invalid distance labels', () => {
      expect(formatDistanceLabel(null)).toBeNull();
      expect(formatDistanceLabel(undefined)).toBeNull();
      expect(formatDistanceLabel(Number.NaN)).toBeNull();
      expect(formatDistanceLabel(1.2)).toBe('1.2 mi away');
    });
  });

  describe('metric provider distances', () => {
    it('converts miles to kilometers for distance filters', () => {
      expect(milesToKilometers(5)).toBeCloseTo(8.047, 2);
    });

    it('formats facility distances in kilometers and handles missing values', () => {
      expect(formatDistanceKilometers(1)).toBe('1.6 km away');
      expect(formatDistanceKilometers(0.02)).toBe('Nearby (<0.1 km away)');
      expect(formatDistanceKilometersLabel(null)).toBeNull();
      expect(formatDistanceKilometersLabel(Number.NaN)).toBeNull();
    });
  });

  describe('coordinate validation', () => {
    it('accepts valid numeric and numeric-string coordinates', () => {
      expect(normalizeLatitude(40.7128)).toBeCloseTo(40.7128);
      expect(normalizeLatitude('40.7128')).toBeCloseTo(40.7128);
      expect(normalizeLongitude(-74.006)).toBeCloseTo(-74.006);
      expect(getValidCoordinates('40.7128', '-74.006')).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
      });
    });

    it('rejects missing, non-numeric, and out-of-range coordinates', () => {
      expect(normalizeLatitude(91)).toBeNull();
      expect(normalizeLatitude('not-a-number')).toBeNull();
      expect(normalizeLongitude(-181)).toBeNull();
      expect(getValidCoordinates(null, -74.006)).toBeNull();
      expect(getValidCoordinates(40.7128, undefined)).toBeNull();
    });
  });

  describe('getUserLocationWithStatus', () => {
    it('returns current coordinates when permission and GPS are available', async () => {
      const result = await getUserLocationWithStatus();

      expect(result).toEqual({
        latitude: 34.0522,
        longitude: -118.2437,
        status: 'granted',
        source: 'current',
      });
      expect(getPosition).toHaveBeenCalledWith({ accuracy: 3 });
    });

    it('returns denied without coordinates and does not call GPS when permission is refused', async () => {
      getPermissions.mockResolvedValueOnce({ status: 'undetermined' });
      requestPermissions.mockResolvedValueOnce({ status: 'denied' });

      const result = await getUserLocationWithStatus();

      expect(result).toEqual({
        latitude: null,
        longitude: null,
        status: 'denied',
        source: 'none',
      });
      expect(getPosition).not.toHaveBeenCalled();
    });

    it('does not prompt when requestPermission is false', async () => {
      getPermissions.mockResolvedValueOnce({ status: 'denied' });

      const result = await getUserLocationWithStatus({ requestPermission: false });

      expect(result.status).toBe('denied');
      expect(requestPermissions).not.toHaveBeenCalled();
      expect(getPosition).not.toHaveBeenCalled();
    });

    it('uses a recent last-known position when the current GPS lookup fails', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      getPosition.mockRejectedValueOnce(new Error('GPS unavailable'));
      getLastKnownPosition.mockResolvedValueOnce({
        coords: { latitude: 34.05, longitude: -118.25 },
      });

      const result = await getUserLocationWithStatus();

      expect(result).toEqual({
        latitude: 34.05,
        longitude: -118.25,
        status: 'granted',
        source: 'last-known',
      });
      expect(getLastKnownPosition).toHaveBeenCalledWith({
        maxAge: MAX_LAST_KNOWN_AGE_MS,
        requiredAccuracy: 1000,
      });
      warn.mockRestore();
    });

    it('returns unavailable without coordinates when no real position exists', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      getPosition.mockRejectedValueOnce(new Error('GPS unavailable'));

      const result = await getUserLocationWithStatus();

      expect(result).toEqual({
        latitude: null,
        longitude: null,
        status: 'unavailable',
        source: 'none',
      });
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('returns unavailable when permission lookup throws', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      getPermissions.mockRejectedValueOnce(new Error('Permission API unavailable'));

      const result = await getUserLocationWithStatus();

      expect(result).toEqual({
        latitude: null,
        longitude: null,
        status: 'unavailable',
        source: 'none',
      });
      warn.mockRestore();
    });
  });

  describe('sortProvidersByProximity', () => {
    const userLocation = { latitude: 40.7128, longitude: -74.006 };

    const mockProviders: Provider[] = [
      createMockProvider({
        id: 'far-clinic',
        name: 'Far Suburb Hospital',
        type: 'Hospital',
        lat: 41.0,
        lng: -74.0,
        address: '100 Suburb Way',
        phone: '555-0001',
      }),
      createMockProvider({
        id: 'nearest-clinic',
        name: 'Downtown Urgent Care',
        type: 'Clinic',
        lat: 40.715,
        lng: -74.005,
        address: '10 Main St',
        phone: '555-0002',
      }),
      createMockProvider({
        id: 'mid-clinic',
        name: 'Midtown Health Center',
        type: 'Clinic',
        lat: 40.75,
        lng: -73.99,
        address: '200 Center Ave',
        phone: '555-0003',
      }),
    ];

    it('sorts providers with closest clinic appearing first', () => {
      const sorted = sortProvidersByProximity(mockProviders, userLocation);

      expect(sorted).toHaveLength(3);
      expect(sorted.map((provider) => provider.id)).toEqual([
        'nearest-clinic',
        'mid-clinic',
        'far-clinic',
      ]);

      expect(requireDistance(sorted[0])).toBeLessThan(requireDistance(sorted[1]));
      expect(requireDistance(sorted[1])).toBeLessThan(requireDistance(sorted[2]));
    });

    it('keeps providers with missing coordinates and marks their distance unavailable', () => {
      const providerWithoutCoords = createMockProvider({
        id: 'no-coords',
        name: 'Remote Advice Center',
        type: 'Clinic',
        lat: null,
        lng: null,
      });

      const sorted = sortProvidersByProximity(
        [providerWithoutCoords, ...mockProviders],
        userLocation
      );

      expect(sorted).toHaveLength(4);
      expect(sorted[sorted.length - 1].id).toBe('no-coords');
      expect(sorted[sorted.length - 1].distanceMiles).toBeNull();
    });

    it('does not calculate any distance without a valid user location', () => {
      const sorted = sortProvidersByProximity(mockProviders, null);

      expect(sorted.map((provider) => provider.name)).toEqual([
        'Downtown Urgent Care',
        'Far Suburb Hospital',
        'Midtown Health Center',
      ]);
      expect(sorted.every((provider) => provider.distanceMiles === null)).toBe(true);
    });

    it('rejects invalid provider coordinates instead of substituting a fallback', () => {
      const invalidProvider = createMockProvider({
        id: 'invalid-coords',
        name: 'Invalid Clinic',
        lat: 999,
        lng: -74.006,
      });

      const [sorted] = sortProvidersByProximity([invalidProvider], userLocation);

      expect(sorted.distanceMiles).toBeNull();
    });
  });
});
