// mobile/src/services/geoUtils.ts
// Geolocation, Distance Calculation & Provider Proximity Utilities

import * as Location from 'expo-location';
import { Provider } from './types';

// Default fallback coordinates (e.g., downtown medical center)
export const DEFAULT_USER_COORDS = {
  latitude: 40.7128,
  longitude: -74.0060,
};

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

/**
 * Request user location or fallback gracefully
 */
export async function getCurrentUserLocation(): Promise<{ latitude: number; longitude: number }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return DEFAULT_USER_COORDS;
    }
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.warn('Could not fetch user GPS coordinates, using fallback:', error);
    return DEFAULT_USER_COORDS;
  }
}

/**
 * Sorts a list of providers by proximity to a given user position
 */
export function sortProvidersByProximity(
  providers: Provider[],
  userCoords: { latitude: number; longitude: number }
): (Provider & { distanceMiles: number })[] {
  return providers
    .map((p) => {
      const pLat = p.lat ?? DEFAULT_USER_COORDS.latitude;
      const pLng = p.lng ?? DEFAULT_USER_COORDS.longitude;
      const distance = calculateDistanceMiles(
        userCoords.latitude,
        userCoords.longitude,
        pLat,
        pLng
      );
      return {
        ...p,
        distanceMiles: distance,
      };
    })
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}
