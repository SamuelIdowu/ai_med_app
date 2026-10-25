// mobile/src/components/Map/ProviderMap.web.tsx
// Interactive web provider map backed by Leaflet + OpenStreetMap.

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { StyleSheet, View } from 'react-native';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_USER_COORDS } from '../../services/geoUtils';
import type {
  MapCoordinate,
  MapProvider,
  ProviderMapHandle,
  ProviderMapProps,
} from './mapTypes';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const FIT_PADDING_TOP_LEFT: L.PointExpression = [56, 110];
const FIT_PADDING_BOTTOM_RIGHT: L.PointExpression = [56, 220];

function toLatLng(coordinate: MapCoordinate): L.LatLngTuple {
  return [coordinate.latitude, coordinate.longitude];
}

function markerColor(provider: MapProvider, selected: boolean): string {
  if (selected) return '#F26B5E';
  if (provider.type?.toLowerCase() === 'hospital') return '#D9554A';
  if (provider.type?.toLowerCase() === 'pharmacy') return '#4C6FFF';
  return '#123B3A';
}

function buildPopupContent(
  provider: MapProvider,
  onOpenProvider?: (providerId: string) => void
): HTMLElement {
  const root = document.createElement('div');
  root.style.minWidth = '180px';
  root.style.fontFamily = 'PlusJakartaSans, sans-serif';
  root.style.color = '#111318';

  const title = document.createElement('div');
  title.textContent = provider.name;
  title.style.fontWeight = '700';
  title.style.fontSize = '13px';
  title.style.marginBottom = '4px';
  root.appendChild(title);

  const meta = [provider.type, provider.distanceLabel].filter(Boolean).join(' • ');
  if (meta) {
    const metaLine = document.createElement('div');
    metaLine.textContent = meta;
    metaLine.style.fontSize = '11px';
    metaLine.style.fontWeight = '600';
    metaLine.style.color = '#D9554A';
    metaLine.style.marginBottom = '4px';
    root.appendChild(metaLine);
  }

  if (provider.address) {
    const address = document.createElement('div');
    address.textContent = provider.address;
    address.style.fontSize = '11px';
    address.style.color = '#667085';
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
    button.style.backgroundColor = '#123B3A';
    button.style.color = '#FFFFFF';
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
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const providerLayerRef = useRef<L.LayerGroup | null>(null);
    const userLayerRef = useRef<L.LayerGroup | null>(null);
    const initialCenterRef = useRef<MapCoordinate>(
      userCoordinate ?? providers[0]?.coordinate ?? DEFAULT_USER_COORDS
    );

    const focusProvider = useCallback(
      (providerId: string, animated = true) => {
        const map = mapRef.current;
        const provider = providers.find((item) => item.id === providerId);
        if (!map || !provider) return;

        map.setView(toLatLng(provider.coordinate), Math.max(map.getZoom(), 14), {
          animate: animated,
        });
      },
      [providers]
    );

    const focusUser = useCallback(
      (animated = true) => {
        const map = mapRef.current;
        if (!map || !userCoordinate) return;

        map.setView(toLatLng(userCoordinate), 13, { animate: animated });
      },
      [userCoordinate]
    );

    const fitToProviders = useCallback(
      (animated = true) => {
        const map = mapRef.current;
        if (!map) return;

        if (providers.length === 0) {
          if (userCoordinate) {
            map.setView(toLatLng(userCoordinate), 13, { animate: animated });
          }
          return;
        }

        if (providers.length === 1) {
          map.setView(toLatLng(providers[0].coordinate), 14, { animate: animated });
          return;
        }

        const bounds = L.latLngBounds(providers.map((provider) => toLatLng(provider.coordinate)));
        map.fitBounds(bounds, {
          paddingTopLeft: FIT_PADDING_TOP_LEFT,
          paddingBottomRight: FIT_PADDING_BOTTOM_RIGHT,
          maxZoom: 15,
          animate: animated,
        });
      },
      [providers, userCoordinate]
    );

    useImperativeHandle(
      ref,
      () => ({ fitToProviders, focusProvider, focusUser }),
      [fitToProviders, focusProvider, focusUser]
    );

    useEffect(() => {
      const container = containerRef.current;
      if (!container || mapRef.current) return;

      const center = initialCenterRef.current;
      const map = L.map(container, {
        center: [center.latitude, center.longitude],
        zoom: 13,
        zoomControl: interactive,
        attributionControl: true,
        dragging: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
        scrollWheelZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
      });

      L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: TILE_ATTRIBUTION,
      }).addTo(map);

      providerLayerRef.current = L.layerGroup().addTo(map);
      userLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const resize = () => map.invalidateSize();
      const observer =
        typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
      observer?.observe(container);
      const timeout = setTimeout(resize, 50);

      return () => {
        clearTimeout(timeout);
        observer?.disconnect();
        map.remove();
        mapRef.current = null;
        providerLayerRef.current = null;
        userLayerRef.current = null;
      };
    }, [interactive]);

    useEffect(() => {
      const map = mapRef.current;
      const layer = providerLayerRef.current;
      if (!map || !layer) return;

      layer.clearLayers();

      providers.forEach((provider) => {
        const isSelected = selectedProviderId === provider.id;
        const marker = L.circleMarker(toLatLng(provider.coordinate), {
          radius: isSelected ? 11 : 8,
          color: '#FFFFFF',
          weight: isSelected ? 3 : 2,
          fillColor: markerColor(provider, isSelected),
          fillOpacity: 1,
        });

        marker.addTo(layer);
        marker.bindTooltip(provider.name, {
          direction: 'top',
          offset: [0, -8],
          opacity: 0.95,
        });
        marker.bindPopup(buildPopupContent(provider, onOpenProvider), {
          closeButton: true,
          minWidth: 180,
        });
        marker.on('click', () => {
          onSelectProvider?.(provider.id);
          map.panTo(toLatLng(provider.coordinate));
        });
      });
    }, [onOpenProvider, onSelectProvider, providers, selectedProviderId]);

    useEffect(() => {
      const layer = userLayerRef.current;
      if (!layer) return;

      layer.clearLayers();
      if (!showUserLocation || !userCoordinate) return;

      L.circleMarker(toLatLng(userCoordinate), {
        radius: 8,
        color: '#FFFFFF',
        weight: 3,
        fillColor: '#2563EB',
        fillOpacity: 1,
      })
        .addTo(layer)
        .bindTooltip('Your location', { direction: 'top', offset: [0, -8] });
    }, [showUserLocation, userCoordinate]);

    useEffect(() => {
      if (!mapRef.current) return;

      const timeout = setTimeout(() => fitToProviders(true), 200);
      return () => clearTimeout(timeout);
    }, [fitToProviders]);

    return (
      <View style={[styles.container, style]}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }
);

ProviderMap.displayName = 'ProviderMap';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default ProviderMap;
