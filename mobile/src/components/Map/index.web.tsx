// mobile/src/components/Map/index.web.tsx
import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapViewHandle {
  animateToRegion: (region: Region, duration?: number) => void;
}

export const Marker: React.FC<any> = ({ children }) => {
  return <>{children}</>;
};

export const Callout: React.FC<any> = ({ children, onPress }) => {
  return <View onTouchEnd={onPress}>{children}</View>;
};

const MapView = forwardRef<MapViewHandle, any>(({ style }, ref) => {
  useImperativeHandle(ref, () => ({
    animateToRegion: (_region: Region, _duration?: number) => {
      // No-op fallback on web platform
    },
  }));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="map-marker-radius" size={48} color="#9CA3AF" />
        <Text style={styles.title}>Map View Unavailable on Web</Text>
        <Text style={styles.subtitle}>
          Interactive GPS mapping is supported on iOS and Android native apps. On web, please use the facility list or tap a facility for direct Google Maps directions.
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1115',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1A1E26',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#262C38',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default MapView;
