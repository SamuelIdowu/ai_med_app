// mobile/src/components/Map/ProviderMap.tsx
// Native interactive provider map (iOS / Android).

import { Icon } from '../Icon';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { FALLBACK_MAP_CENTER } from '../../services/geoUtils';
import { theme } from '../../theme';
import type { MapCoordinate, ProviderMapHandle, ProviderMapProps } from './mapTypes';
import type { IconName } from '../../icons';

const FIT_PADDING = { top: 110, right: 56, bottom: 220, left: 56 };
const CITY_DELTA = 0.035;
const PROVIDER_DELTA = 0.015;

function markerIcon(type?: string | null): IconName {
  if (type?.toLowerCase() === 'hospital') return 'hospital';
  if (type?.toLowerCase() === 'pharmacy') return 'pill';
  return 'firstAidKit';
}

export const ProviderMap = forwardRef<ProviderMapHandle, ProviderMapProps>(
  (
    {
      providers,
      selectedProviderId,
      userCoordinate,
      showUserLocation = true,
      interactive = true,
      onSelectProvider,
      onOpenProvider,
      style,
    },
    ref
  ) => {
    const mapRef = useRef<MapView>(null);
    const [isReady, setIsReady] = useState(false);

    const focusProvider = useCallback(
      (providerId: string, animated = true) => {
        const provider = providers.find((item) => item.id === providerId);
        if (!provider || !mapRef.current) return;

        mapRef.current.animateToRegion(
          {
            ...provider.coordinate,
            latitudeDelta: PROVIDER_DELTA,
            longitudeDelta: PROVIDER_DELTA,
          },
          animated ? 450 : 0
        );
      },
      [providers]
    );

    const focusUser = useCallback(
      (animated = true) => {
        if (!userCoordinate || !mapRef.current) return;

        mapRef.current.animateToRegion(
          {
            ...userCoordinate,
            latitudeDelta: CITY_DELTA,
            longitudeDelta: CITY_DELTA,
          },
          animated ? 450 : 0
        );
      },
      [userCoordinate]
    );

    const fitToProviders = useCallback(
      (animated = true) => {
        const map = mapRef.current;
        if (!map) return;

        const coordinates = providers.map((provider) => provider.coordinate);

        if (userCoordinate) {
          coordinates.push(userCoordinate);
        }

        if (coordinates.length === 0) {
          return;
        }

        if (coordinates.length === 1) {
          map.animateToRegion(
            {
              ...coordinates[0],
              latitudeDelta: PROVIDER_DELTA,
              longitudeDelta: PROVIDER_DELTA,
            },
            animated ? 450 : 0
          );
          return;
        }

        map.fitToCoordinates(coordinates, { edgePadding: FIT_PADDING, animated });
      },
      [providers, userCoordinate]
    );

    useImperativeHandle(
      ref,
      () => ({ fitToProviders, focusProvider, focusUser }),
      [fitToProviders, focusProvider, focusUser]
    );

    useEffect(() => {
      if (!isReady) return;

      const timeout = setTimeout(() => fitToProviders(true), 150);
      return () => clearTimeout(timeout);
    }, [fitToProviders, isReady]);

    const initialCoordinate: MapCoordinate =
      userCoordinate ?? providers[0]?.coordinate ?? FALLBACK_MAP_CENTER;

    return (
      <MapView
        ref={mapRef}
        style={[styles.map, style]}
        initialRegion={{
          ...initialCoordinate,
          latitudeDelta: CITY_DELTA,
          longitudeDelta: CITY_DELTA,
        }}
        onMapReady={() => setIsReady(true)}
        showsUserLocation={showUserLocation && Boolean(userCoordinate)}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        userInterfaceStyle="light"
        pitchEnabled={false}
        rotateEnabled={interactive}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
      >
        {providers.map((provider) => {
          const isSelected = selectedProviderId === provider.id;

          return (
            <Marker
              key={provider.id}
              coordinate={provider.coordinate}
              title={provider.name}
              description={[provider.type, provider.distanceLabel]
                .filter(Boolean)
                .join(' • ')}
              zIndex={isSelected ? 1000 : 1}
              accessibilityLabel={`${provider.name} map marker`}
              onPress={() => {
                onSelectProvider?.(provider.id);
                focusProvider(provider.id);
              }}
            >
              <View
                style={[
                  styles.marker,
                  isSelected && styles.markerSelected,
                ]}
              >
                <Icon
                  name={markerIcon(provider.type)}
                  size={20}
                  color={theme.colors.text.inverse}
                />
              </View>
              <Callout
                onPress={() => {
                  onSelectProvider?.(provider.id);
                  onOpenProvider?.(provider.id);
                }}
              >
                <View style={styles.callout}>
                  <View style={styles.calloutHeader}>
                    <Icon
                      name={markerIcon(provider.type)}
                      size={16}
                      color={theme.colors.primary.hover}
                    />
                    <Text style={styles.calloutTitle} numberOfLines={2}>
                      {provider.name}
                    </Text>
                  </View>
                  {provider.distanceLabel ? (
                    <Text style={styles.calloutMeta}>{provider.distanceLabel}</Text>
                  ) : null}
                  {provider.address ? (
                    <Text style={styles.calloutAddress} numberOfLines={2}>
                      {provider.address}
                    </Text>
                  ) : null}
                  <Text style={styles.calloutAction}>Tap for details</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    );
  }
);

ProviderMap.displayName = 'ProviderMap';

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.palette.eliteTeal,
    borderWidth: 2,
    borderColor: theme.colors.canvas.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerSelected: {
    backgroundColor: theme.colors.primary.hover,
    transform: [{ scale: 1.18 }],
  },
  callout: {
    padding: 10,
    minWidth: 170,
    maxWidth: 240,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calloutTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  calloutMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary.hover,
    marginTop: 4,
  },
  calloutAddress: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  calloutAction: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary.hover,
    marginTop: 6,
  },
});
