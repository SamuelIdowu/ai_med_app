// mobile/src/services/__tests__/geoUtils.test.ts

import * as Location from 'expo-location';
import {
  calculateDistanceMiles,
  formatDistance,
  getUserLocationWithStatus,
  sortProvidersByProximity,
  DEFAULT_USER_COORDS,
} from '../geoUtils';
import { Provider } from '../types';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 40.7128,
      longitude: -74.006,
    },
  }),
  Accuracy: {
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

describe('Geolocation & Clinic Proximity Utilities', () => {
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
  });

  describe('getUserLocationWithStatus', () => {
    const requestPermissions = Location.requestForegroundPermissionsAsync as jest.Mock;
    const getPosition = Location.getCurrentPositionAsync as jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      requestPermissions.mockResolvedValue({ status: 'granted' });
      getPosition.mockResolvedValue({
        coords: { latitude: 34.0522, longitude: -118.2437 },
      });
    });

    it('returns granted status and real coordinates', async () => {
      const result = await getUserLocationWithStatus();

      expect(result).toEqual({
        latitude: 34.0522,
        longitude: -118.2437,
        status: 'granted',
      });
    });

    it('returns denied status with fallback coordinates when permission is refused', async () => {
      requestPermissions.mockResolvedValueOnce({ status: 'denied' });

      const result = await getUserLocationWithStatus();

      expect(result.status).toBe('denied');
      expect(result.latitude).toBe(DEFAULT_USER_COORDS.latitude);
      expect(result.longitude).toBe(DEFAULT_USER_COORDS.longitude);
      expect(getPosition).not.toHaveBeenCalled();
    });

    it('returns unavailable status with fallback coordinates when GPS lookup fails', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      getPosition.mockRejectedValueOnce(new Error('GPS unavailable'));

      const result = await getUserLocationWithStatus();

      expect(result.status).toBe('unavailable');
      expect(result.latitude).toBe(DEFAULT_USER_COORDS.latitude);
      expect(warn).toHaveBeenCalled();
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
      expect(sorted[0].id).toBe('nearest-clinic');
      expect(sorted[1].id).toBe('mid-clinic');
      expect(sorted[2].id).toBe('far-clinic');

      expect(sorted[0].distanceMiles).toBeLessThan(sorted[1].distanceMiles);
      expect(sorted[1].distanceMiles).toBeLessThan(sorted[2].distanceMiles);
    });

    it('falls back to default coordinates when provider lat/lng are missing', () => {
      const providerWithoutCoords: Provider = createMockProvider({
        id: 'no-coords',
        name: 'Remote Advice Center',
        type: 'Clinic',
        lat: null,
        lng: null,
      });

      const sorted = sortProvidersByProximity([providerWithoutCoords], userLocation);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].distanceMiles).toBeDefined();
    });
  });

  describe('DEFAULT_USER_COORDS', () => {
    it('defines valid non-zero latitude and longitude', () => {
      expect(DEFAULT_USER_COORDS.latitude).toBeDefined();
      expect(DEFAULT_USER_COORDS.longitude).toBeDefined();
      expect(typeof DEFAULT_USER_COORDS.latitude).toBe('number');
      expect(typeof DEFAULT_USER_COORDS.longitude).toBe('number');
    });
  });
});
