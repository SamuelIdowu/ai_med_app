// Native interactive provider map (iOS / Android) using OpenFreeMap vector tiles.

import { Icon } from '../Icon';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Camera,
  Map as MapLibreMap,
  Marker,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import { theme } from '../../theme';
import type { MapCoordinate, ProviderMapHandle, ProviderMapProps } from './mapTypes';
import type { IconName } from '../../icons';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const FIT_PADDING = { top: 110, right: 56, bottom: 220, left: 56 };
const CITY_ZOOM = 13;
const PROVIDER_ZOOM = 15;

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
    ref,
  ) => {
    const cameraRef = useRef<CameraRef>(null);
    const [isReady, setIsReady] = useState(false);

    const focusProvider = useCallback(
      (providerId: string, animated = true) => {
        const provider = providers.find((item) => item.id === providerId);
        if (!provider) return;

        cameraRef.current?.easeTo({
          center: [provider.coordinate.longitude, provider.coordinate.latitude],
          zoom: PROVIDER_ZOOM,
          duration: animated ? 450 : 0,
        });
      },
      [providers],
    );

    const focusUser = useCallback(
      (animated = true) => {
        if (!userCoordinate) return;

        cameraRef.current?.easeTo({
          center: [userCoordinate.longitude, userCoordinate.latitude],
          zoom: CITY_ZOOM,
          duration: animated ? 450 : 0,
        });
      },
      [userCoordinate],
    );

    const fitToProviders = useCallback(
      (animated = true) => {
        const coordinates = providers.map(
          (provider) => [provider.coordinate.longitude, provider.coordinate.latitude] as const,
        );
        if (userCoordinate) coordinates.push([userCoordinate.longitude, userCoordinate.latitude]);
        if (coordinates.length === 0) return;

        if (coordinates.length === 1) {
          cameraRef.current?.easeTo({
            center: [coordinates[0][0], coordinates[0][1]],
            zoom: PROVIDER_ZOOM,
            duration: animated ? 450 : 0,
          });
          return;
        }

        const longitudes = coordinates.map(([longitude]) => longitude);
        const latitudes = coordinates.map(([, latitude]) => latitude);
        cameraRef.current?.fitBounds(
          [
            Math.min(...longitudes),
            Math.min(...latitudes),
            Math.max(...longitudes),
            Math.max(...latitudes),
          ],
          { ...FIT_PADDING, duration: animated ? 450 : 0 },
        );
      },
      [providers, userCoordinate],
    );

    useImperativeHandle(ref, () => ({ fitToProviders, focusProvider, focusUser }), [
      fitToProviders,
      focusProvider,
      focusUser,
    ]);

    useEffect(() => {
      if (!isReady) return;
      const timeout = setTimeout(() => fitToProviders(true), 150);
      return () => clearTimeout(timeout);
    }, [fitToProviders, isReady]);

    const initialCoordinate = userCoordinate ?? providers[0]?.coordinate;
    if (!initialCoordinate) return <View style={[styles.map, style]} />;

    return (
      <MapLibreMap
        mapStyle={OPENFREEMAP_STYLE}
        style={[styles.map, style]}
        attribution
        logo
        compass={false}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        touchRotate={interactive}
        touchPitch={false}
        onDidFinishLoadingMap={() => setIsReady(true)}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [initialCoordinate.longitude, initialCoordinate.latitude],
            zoom: CITY_ZOOM,
          }}
        />

        {showUserLocation && userCoordinate ? (
          <Marker lngLat={[userCoordinate.longitude, userCoordinate.latitude]} id="user-location">
            <View style={styles.userMarker} />
          </Marker>
        ) : null}

        {providers.map((provider) => {
          const isSelected = selectedProviderId === provider.id;
          const handleMarkerPress = () => {
            if (isSelected) {
              onOpenProvider?.(provider.id);
              return;
            }
            onSelectProvider?.(provider.id);
            focusProvider(provider.id);
          };

          return (
            <Marker
              key={provider.id}
              id={provider.id}
              lngLat={[provider.coordinate.longitude, provider.coordinate.latitude]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleMarkerPress}
                accessibilityRole="button"
                accessibilityLabel={`${provider.name} map marker`}
                style={[styles.marker, isSelected && styles.markerSelected]}
              >
                <Icon
                  name={markerIcon(provider.type)}
                  size={20}
                  color={theme.colors.text.inverse}
                />
              </TouchableOpacity>
            </Marker>
          );
        })}
      </MapLibreMap>
    );
  },
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
  userMarker: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    borderWidth: 3,
    borderColor: theme.colors.canvas.surface,
  },
});
