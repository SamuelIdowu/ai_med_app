// mobile/src/components/Map/index.web.tsx
import { Icon } from '../Icon';
import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

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
        <Icon name="mapPin" size={48} color={theme.colors.primary.hover} />
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
    backgroundColor: theme.colors.canvas.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    ...theme.spatial.shadows.card,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default MapView;
