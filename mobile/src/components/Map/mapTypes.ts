// mobile/src/components/Map/mapTypes.ts
// Shared contracts for the native and web provider map implementations.

import type { StyleProp, ViewStyle } from 'react-native';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapProvider {
  id: string;
  name: string;
  type?: string | null;
  address?: string | null;
  coordinate: MapCoordinate;
  distanceLabel?: string;
}

export interface ProviderMapHandle {
  fitToProviders: (animated?: boolean) => void;
  focusProvider: (providerId: string, animated?: boolean) => void;
  focusUser: (animated?: boolean) => void;
}

export interface ProviderMapProps {
  providers: MapProvider[];
  selectedProviderId?: string | null;
  userCoordinate: MapCoordinate | null;
  showUserLocation?: boolean;
  interactive?: boolean;
  onSelectProvider?: (providerId: string) => void;
  onOpenProvider?: (providerId: string) => void;
  style?: StyleProp<ViewStyle>;
}
