import { Icon } from './Icon';
import React from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import type {
  LocationPermissionStatus,
  LocationSource,
} from '../services/geoUtils';
import { theme } from '../theme';

interface LocationBannerProps {
  status: LocationPermissionStatus;
  source: LocationSource;
  onPress: () => void;
  variant?: 'inline' | 'floating';
  style?: StyleProp<ViewStyle>;
}

function getMessage(status: LocationPermissionStatus, source: LocationSource): string | null {
  if (status === 'denied') {
    return 'Location access is off. Enable it for accurate provider distances.';
  }

  if (status === 'unavailable') {
    return 'Current location unavailable. Provider distances are hidden.';
  }

  if (source === 'last-known') {
    return 'Using a recent saved location. Distances are approximate.';
  }

  return null;
}

export const LocationBanner: React.FC<LocationBannerProps> = ({
  status,
  source,
  onPress,
  variant = 'inline',
  style,
}) => {
  const message = getMessage(status, source);

  if (!message) {
    return null;
  }

  const actionLabel =
    status === 'denied'
      ? Platform.OS === 'web'
        ? 'Retry'
        : 'Settings'
      : source === 'last-known'
        ? 'Refresh'
        : 'Retry';

  return (
    <View
      style={[
        styles.container,
        variant === 'floating' && styles.floating,
        style,
      ]}
    >
      <Icon name="mapPin" size={16} color={theme.colors.palette.darkSideMoon} />
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity
        style={styles.action}
        onPress={onPress}
        accessibilityLabel="Update location"
      >
        <Text style={styles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...theme.spatial.shadows3d.level2,
  },
  floating: {
    position: 'absolute',
    top: 68,
    left: 16,
    right: 16,
    zIndex: 9,
  },
  message: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: theme.colors.palette.darkSideMoon,
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: theme.colors.palette.coralCoast,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
