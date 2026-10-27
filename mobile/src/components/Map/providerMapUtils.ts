// mobile/src/components/Map/providerMapUtils.ts

import { formatDistanceKilometersLabel, getValidCoordinates } from '../../services/geoUtils';
import type { Provider } from '../../services/types';
import type { MapProvider } from './mapTypes';

export type ProviderWithDistance = Provider & { distanceMiles?: number | null };

export function buildProviderMarkers(providers: ProviderWithDistance[]): MapProvider[] {
  return providers.flatMap((provider) => {
    const coordinate = getValidCoordinates(provider.lat, provider.lng);

    if (!coordinate) {
      return [];
    }

    return [
      {
        id: provider.id,
        name: provider.name ?? 'Medical Facility',
        type: provider.type,
        address: provider.address,
        coordinate,
        distanceLabel: formatDistanceKilometersLabel(provider.distanceMiles) ?? undefined,
      },
    ];
  });
}
