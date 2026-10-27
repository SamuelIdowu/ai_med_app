// Interactive web provider map using OpenFreeMap vector tiles through MapLibre GL JS.

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { theme } from '../../theme';
import type { MapCoordinate, MapProvider, ProviderMapHandle, ProviderMapProps } from './mapTypes';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const FIT_PADDING_TOP_LEFT: [number, number] = [56, 110];
const FIT_PADDING_BOTTOM_RIGHT: [number, number] = [56, 220];

type ProviderFeature = {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { name: string; type: string; selected: boolean };
};

function toLatLng(coordinate: MapCoordinate): [number, number] {
  return [coordinate.latitude, coordinate.longitude];
}

function providerFeatureCollection(
  providers: MapProvider[],
  selectedProviderId?: string | null,
): GeoJSON.FeatureCollection<GeoJSON.Point, ProviderFeature['properties']> {
  return {
    type: 'FeatureCollection',
    features: providers.map((provider): ProviderFeature => ({
      type: 'Feature',
      id: provider.id,
      geometry: {
        type: 'Point',
        coordinates: [provider.coordinate.longitude, provider.coordinate.latitude],
      },
      properties: {
        name: provider.name,
        type: provider.type ?? '',
        selected: provider.id === selectedProviderId,
      },
    })),
  };
}

function buildPopupContent(
  provider: MapProvider,
  onOpenProvider?: (providerId: string) => void,
): HTMLElement {
  const root = document.createElement('div');
  root.style.minWidth = '180px';
  root.style.fontFamily = 'PlusJakartaSans, sans-serif';
  root.style.color = theme.colors.text.primary;

  const title = document.createElement('div');
  title.textContent = provider.name;
  title.style.fontWeight = '700';
  title.style.fontSize = '13px';
  title.style.marginBottom = '4px';
  root.appendChild(title);

  const meta = [provider.type, provider.distanceLabel].filter(Boolean).join(' · ');
  if (meta) {
    const metaLine = document.createElement('div');
    metaLine.textContent = meta;
    metaLine.style.fontSize = '11px';
    metaLine.style.fontWeight = '600';
    metaLine.style.color = theme.colors.primary.hover;
    metaLine.style.marginBottom = '4px';
    root.appendChild(metaLine);
  }

  if (provider.address) {
    const address = document.createElement('div');
    address.textContent = provider.address;
    address.style.fontSize = '11px';
    address.style.color = theme.colors.text.muted;
    address.style.marginBottom = '8px';
    root.appendChild(address);
  }

  if (onOpenProvider) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'View details';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.padding = '7px 10px';
    button.style.backgroundColor = theme.colors.primary.hover;
    button.style.color = theme.colors.text.inverse;
    button.style.fontSize = '11px';
    button.style.fontWeight = '700';
    button.style.cursor = 'pointer';
    button.addEventListener('click', () => onOpenProvider(provider.id));
    root.appendChild(button);
  }

  return root;
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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const providersRef = useRef(providers);
    const selectedProviderIdRef = useRef(selectedProviderId);
    const userCoordinateRef = useRef(userCoordinate);
    const showUserLocationRef = useRef(showUserLocation);
    const onSelectProviderRef = useRef(onSelectProvider);
    const onOpenProviderRef = useRef(onOpenProvider);

    providersRef.current = providers;
    selectedProviderIdRef.current = selectedProviderId;
    userCoordinateRef.current = userCoordinate;
    showUserLocationRef.current = showUserLocation;
    onSelectProviderRef.current = onSelectProvider;
    onOpenProviderRef.current = onOpenProvider;

    const focusProvider = useCallback((providerId: string, animated = true) => {
      const map = mapRef.current;
      const provider = providersRef.current.find((item) => item.id === providerId);
      if (!map || !provider) return;

      map.easeTo({
        center: [provider.coordinate.longitude, provider.coordinate.latitude],
        zoom: Math.max(map.getZoom(), 15),
        duration: animated ? 450 : 0,
      });
    }, []);

    const focusUser = useCallback((animated = true) => {
      const map = mapRef.current;
      const coordinate = userCoordinateRef.current;
      if (!map || !coordinate) return;

      map.easeTo({ center: toLatLng(coordinate), zoom: 13, duration: animated ? 450 : 0 });
    }, []);

    const fitToProviders = useCallback((animated = true) => {
      const map = mapRef.current;
      if (!map) return;

      const coordinates = providersRef.current.map((provider) => toLatLng(provider.coordinate));
      const coordinate = userCoordinateRef.current;
      if (coordinate) coordinates.push(toLatLng(coordinate));
      if (coordinates.length === 0) return;

      if (coordinates.length === 1) {
        map.easeTo({ center: coordinates[0], zoom: 15, duration: animated ? 450 : 0 });
        return;
      }

      const bounds = coordinates.reduce(
        (current, point) => current.extend(point),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
      );
      map.fitBounds(bounds, {
        padding: {
          top: FIT_PADDING_TOP_LEFT[1],
          left: FIT_PADDING_TOP_LEFT[0],
          bottom: FIT_PADDING_BOTTOM_RIGHT[1],
          right: FIT_PADDING_BOTTOM_RIGHT[0],
        },
        maxZoom: 15,
        duration: animated ? 450 : 0,
      });
    }, []);

    useImperativeHandle(ref, () => ({ fitToProviders, focusProvider, focusUser }), [
      fitToProviders,
      focusProvider,
      focusUser,
    ]);

    const initialCoordinate = userCoordinate ?? providers[0]?.coordinate;
    const initialLatitude = initialCoordinate?.latitude;
    const initialLongitude = initialCoordinate?.longitude;

    useEffect(() => {
      const container = containerRef.current;
      if (
        initialLatitude === undefined ||
        initialLongitude === undefined ||
        !container ||
        mapRef.current
      ) {
        return;
      }

      const map = new maplibregl.Map({
        container,
        style: OPENFREEMAP_STYLE,
        center: [initialLongitude, initialLatitude],
        zoom: 13,
        attributionControl: {},
        dragPan: interactive,
        touchZoomRotate: interactive,
        doubleClickZoom: interactive,
        scrollZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');

      const handleProviderClick = (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const provider = providersRef.current.find((item) => item.id === String(feature?.id));
        if (!provider) return;

        onSelectProviderRef.current?.(provider.id);
        map.easeTo({
          center: [provider.coordinate.longitude, provider.coordinate.latitude],
          duration: 300,
        });
        new maplibregl.Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat([provider.coordinate.longitude, provider.coordinate.latitude])
          .setDOMContent(
            buildPopupContent(provider, (providerId) => onOpenProviderRef.current?.(providerId)),
          )
          .addTo(map);
      };
      const setCursor = () => {
        map.getCanvas().style.cursor = 'pointer';
      };
      const resetCursor = () => {
        map.getCanvas().style.cursor = '';
      };

      map.on('load', () => {
        map.addSource('providers', {
          type: 'geojson',
          data: providerFeatureCollection(providersRef.current, selectedProviderIdRef.current),
        });
        map.addLayer({
          id: 'provider-points',
          type: 'circle',
          source: 'providers',
          paint: {
            'circle-radius': ['case', ['get', 'selected'], 11, 8],
            'circle-color': [
              'case',
              ['get', 'selected'],
              theme.colors.primary.hover,
              ['==', ['downcase', ['get', 'type']], 'hospital'],
              theme.colors.emergency.primary,
              ['==', ['downcase', ['get', 'type']], 'pharmacy'],
              '#4C6FFF',
              theme.colors.palette.eliteTeal,
            ],
            'circle-stroke-color': theme.colors.canvas.surface,
            'circle-stroke-width': 2,
          },
        });
        map.addSource('user-location', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features:
              showUserLocationRef.current && userCoordinateRef.current
                ? [
                    {
                      type: 'Feature' as const,
                      geometry: {
                        type: 'Point' as const,
                        coordinates: [
                          userCoordinateRef.current.longitude,
                          userCoordinateRef.current.latitude,
                        ] as [number, number],
                      },
                      properties: {},
                    },
                  ]
                : [],
          },
        });
        map.addLayer({
          id: 'user-location-point',
          type: 'circle',
          source: 'user-location',
          paint: {
            'circle-radius': 8,
            'circle-color': '#2563EB',
            'circle-stroke-color': theme.colors.canvas.surface,
            'circle-stroke-width': 3,
          },
        });
        map.on('click', 'provider-points', handleProviderClick);
        map.on('mouseenter', 'provider-points', setCursor);
        map.on('mouseleave', 'provider-points', resetCursor);
      });

      const resize = () => map.resize();
      const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
      observer?.observe(container);
      const timeout = setTimeout(resize, 50);
      mapRef.current = map;

      return () => {
        clearTimeout(timeout);
        observer?.disconnect();
        map.remove();
        mapRef.current = null;
      };
    }, [initialLatitude, initialLongitude, interactive]);

    useEffect(() => {
      const source = mapRef.current?.getSource('providers') as maplibregl.GeoJSONSource | undefined;
      source?.setData(providerFeatureCollection(providers, selectedProviderId));
    }, [providers, selectedProviderId]);

    useEffect(() => {
      const source = mapRef.current?.getSource('user-location') as
        maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData({
        type: 'FeatureCollection',
        features:
          showUserLocation && userCoordinate
            ? [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [userCoordinate.longitude, userCoordinate.latitude],
                  },
                  properties: {},
                },
              ]
            : [],
      });
    }, [showUserLocation, userCoordinate]);

    useEffect(() => {
      if (!mapRef.current) return;
      const timeout = setTimeout(() => fitToProviders(true), 200);
      return () => clearTimeout(timeout);
    }, [fitToProviders, providers, userCoordinate]);

    if (!initialCoordinate) return <View style={[styles.container, style]} />;

    return (
      <View style={[styles.container, style]}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </View>
    );
  },
);

ProviderMap.displayName = 'ProviderMap';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default ProviderMap;
