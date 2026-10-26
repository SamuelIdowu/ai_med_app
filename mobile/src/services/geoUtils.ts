// mobile/src/services/geoUtils.ts
// Geolocation, Distance Calculation & Provider Proximity Utilities

import * as Location from 'expo-location';
import { Provider } from './types';

export const FALLBACK_MAP_CENTER = {
  latitude: 40.7128,
  longitude: -74.006,
};

export const LOCATION_TIMEOUT_MS = 10000;
export const MAX_LAST_KNOWN_AGE_MS = 2 * 60 * 1000;

export type LocationPermissionStatus = 'granted' | 'denied' | 'unavailable';
export type LocationSource = 'current' | 'last-known' | 'none';

export interface UserLocationResult {
  latitude: number | null;
  longitude: number | null;
  status: LocationPermissionStatus;
  source: LocationSource;
}

export interface UserLocationOptions {
  requestPermission?: boolean;
  timeoutMs?: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type ProviderWithDistance = Provider & { distanceMiles: number | null };

function normalizeCoordinate(value: unknown, min: number, max: number): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

export function normalizeLatitude(value: unknown): number | null {
  return normalizeCoordinate(value, -90, 90);
}

export function normalizeLongitude(value: unknown): number | null {
  return normalizeCoordinate(value, -180, 180);
}

export function getValidCoordinates(lat: unknown, lng: unknown): Coordinates | null {
  const latitude = normalizeLatitude(lat);
  const longitude = normalizeLongitude(lng);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

export function hasValidCoordinates(lat: unknown, lng: unknown): boolean {
  return getValidCoordinates(lat, lng) !== null;
}

/**
 * Calculates distance in miles between two coordinate points using the Haversine formula
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats miles into a friendly display string (e.g. "0.8 mi away")
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return 'Nearby (<0.1 mi away)';
  }
  return `${miles.toFixed(1)} mi away`;
}

export function formatDistanceLabel(miles: number | null | undefined): string | null {
  if (typeof miles !== 'number' || !Number.isFinite(miles)) {
    return null;
  }

  return formatDistance(miles);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Location request timed out'));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Requests the current location. Coordinates are null whenever the real
 * device location cannot be determined; no default location is substituted.
 */
export async function getUserLocationWithStatus(
  options: UserLocationOptions = {}
): Promise<UserLocationResult> {
  const { requestPermission = true, timeoutMs = LOCATION_TIMEOUT_MS } = options;

  try {
    let permission = await Location.getForegroundPermissionsAsync();

    if (permission.status !== 'granted' && requestPermission) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== 'granted') {
      return {
        latitude: null,
        longitude: null,
        status: 'denied',
        source: 'none',
      };
    }

    try {
      const current = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        timeoutMs
      );
      const currentCoords = getValidCoordinates(
        current.coords.latitude,
        current.coords.longitude
      );

      if (currentCoords) {
        return {
          ...currentCoords,
          status: 'granted',
          source: 'current',
        };
      }
    } catch (error) {
      console.warn('Could not fetch current GPS position:', error);
    }

    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: MAX_LAST_KNOWN_AGE_MS,
        requiredAccuracy: 1000,
      });
      const lastKnownCoords = lastKnown
        ? getValidCoordinates(lastKnown.coords.latitude, lastKnown.coords.longitude)
        : null;

      if (lastKnownCoords) {
        return {
          ...lastKnownCoords,
          status: 'granted',
          source: 'last-known',
        };
      }
    } catch (error) {
      console.warn('Could not fetch last known GPS position:', error);
    }

    return {
      latitude: null,
      longitude: null,
      status: 'unavailable',
      source: 'none',
    };
  } catch (error) {
    console.warn('Could not determine location permission:', error);
    return {
      latitude: null,
      longitude: null,
      status: 'unavailable',
      source: 'none',
    };
  }
}

/**
 * Request user location or return null when no real position is available.
 */
export async function getCurrentUserLocation(): Promise<Coordinates | null> {
  const result = await getUserLocationWithStatus();

  if (result.latitude === null || result.longitude === null) {
    return null;
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

/**
 * Sorts providers by proximity to a given user position. Providers without
 * valid coordinates are kept at the end with distanceMiles set to null.
 */
export function sortProvidersByProximity(
  providers: Provider[],
  userCoords: Coordinates | null
): ProviderWithDistance[] {
  const validUserCoords = userCoords
    ? getValidCoordinates(userCoords.latitude, userCoords.longitude)
    : null;

  return providers
    .map((provider) => {
      const providerCoords = getValidCoordinates(provider.lat, provider.lng);
      const distanceMiles =
        validUserCoords && providerCoords
          ? calculateDistanceMiles(
              validUserCoords.latitude,
              validUserCoords.longitude,
              providerCoords.latitude,
              providerCoords.longitude
            )
          : null;

      return {
        ...provider,
        distanceMiles,
      };
    })
    .sort((a, b) => {
      if (a.distanceMiles === null && b.distanceMiles === null) {
        return (a.name ?? '').localeCompare(b.name ?? '');
      }
      if (a.distanceMiles === null) return 1;
      if (b.distanceMiles === null) return -1;
      return a.distanceMiles - b.distanceMiles;
    });
}
