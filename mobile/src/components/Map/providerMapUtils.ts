// mobile/src/components/Map/providerMapUtils.ts

import { formatDistance } from '../../services/geoUtils';
import type { Provider } from '../../services/types';
import type { MapProvider } from './mapTypes';

export type ProviderWithDistance = Provider & { distanceMiles?: number };

export function buildProviderMarkers(providers: ProviderWithDistance[]): MapProvider[] {
  return providers
    .filter(
      (provider): provider is ProviderWithDistance & { lat: number; lng: number } =>
        provider.lat !== null && provider.lat !== undefined &&
        provider.lng !== null && provider.lng !== undefined
    )
    .map((provider) => ({
      id: provider.id,
      name: provider.name ?? 'Medical Facility',
      type: provider.type,
      address: provider.address,
      coordinate: {
        latitude: provider.lat,
        longitude: provider.lng,
      },
      distanceLabel:
        typeof provider.distanceMiles === 'number'
          ? formatDistance(provider.distanceMiles)
          : undefined,
    }));
}
