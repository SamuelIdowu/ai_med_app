// mobile/src/screens/ProviderDetailScreen.tsx
// Provider Details Screen with Interactive Map Preview & Navigation

import { Icon } from '../components/Icon';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProviderMap } from '../components/Map/ProviderMap';
import { buildProviderMarkers } from '../components/Map/providerMapUtils';
import { RootStackParamList } from '../navigation/types';
import { Provider } from '../services/types';
import { ProviderService } from '../services/providerService';
import {
  getUserLocationWithStatus,
  calculateDistanceMiles,
  formatDistance,
} from '../services/geoUtils';
import { callPhone, openDirections } from '../services/mapLinks';
import { theme } from '../theme';

type ProviderDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProviderDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProviderDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProviderDetailScreenRouteProp>();
  const { providerId } = route.params;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [distanceText, setDistanceText] = useState<string>('');
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [locationGranted, setLocationGranted] = useState(false);

  const loadProvider = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ProviderService.getProviderById(providerId);
      setProvider(data || null);

      if (!data) return;

      const location = await getUserLocationWithStatus();
      setUserCoords({ latitude: location.latitude, longitude: location.longitude });
      setLocationGranted(location.status === 'granted');

      if (data.lat !== null && data.lat !== undefined && data.lng !== null && data.lng !== undefined) {
        const miles = calculateDistanceMiles(
          location.latitude,
          location.longitude,
          data.lat,
          data.lng
        );
        setDistanceText(formatDistance(miles));
      }
    } catch (error) {
      console.error('Failed to load provider detail:', error);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    loadProvider();
  }, [loadProvider]);

  const mapProviders = useMemo(
    () => (provider ? buildProviderMarkers([provider]) : []),
    [provider]
  );

  const handleCall = () => {
    callPhone(provider?.phone);
  };

  const handleOpenMaps = () => {
    if (provider) {
      openDirections(provider);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading facility details...</Text>
      </View>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="caretLeft" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Provider not found.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Return to Directory</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Icon name="caretLeft" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {provider.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Interactive Map Preview Card */}
        <View style={styles.mapCard}>
          {provider.lat !== null && provider.lat !== undefined &&
          provider.lng !== null && provider.lng !== undefined ? (
            <>
              <ProviderMap
                providers={mapProviders}
                selectedProviderId={provider.id}
                userCoordinate={userCoords}
                showUserLocation={locationGranted}
                interactive={false}
                style={styles.mapView}
              />
              <TouchableOpacity
                style={styles.mapDirectionsPill}
                onPress={handleOpenMaps}
                activeOpacity={0.85}
                accessibilityLabel="Open this facility in Maps"
              >
                <Icon name="navigationArrow" size={15} color="#FFFFFF" />
                <Text style={styles.mapDirectionsText}>Directions</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.mapWebFallback}
              onPress={handleOpenMaps}
              activeOpacity={0.8}
            >
              <Icon name="mapPin" size={44} color="#FFFFFF" />
              <Text style={styles.mapWebText}>Tap to Open Interactive Map</Text>
              {distanceText ? (
                <Text style={styles.mapDistanceTag}>{distanceText}</Text>
              ) : null}
            </TouchableOpacity>
          )}
        </View>

        {/* Facility Header Info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{provider.name}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{provider.type || 'Medical Clinic'}</Text>
            </View>
            {distanceText ? (
              <View style={styles.distanceBadge}>
                <Icon name="navigationArrow" size={13} color="#9CA3AF" />
                <Text style={styles.distanceBadgeText}>{distanceText}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.divider} />

          {/* Details List */}
          <View style={styles.detailList}>
            {/* Address */}
            <TouchableOpacity style={styles.detailItem} onPress={handleOpenMaps}>
              <View style={styles.iconBox}>
                <Icon name="mapPin" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemValue}>{provider.address || 'Address on file'}</Text>
                <Text style={styles.itemLabel}>Location • Tap for Directions</Text>
              </View>
            </TouchableOpacity>

            {/* Phone */}
            <TouchableOpacity style={styles.detailItem} onPress={handleCall}>
              <View style={styles.iconBox}>
                <Icon name="phoneCall" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemValue}>{provider.phone || 'Phone not available'}</Text>
                <Text style={styles.itemLabel}>Contact Phone • Tap to Call</Text>
              </View>
            </TouchableOpacity>

            {/* Emergency Service status */}
            <View style={styles.detailItem}>
              <View style={styles.iconBox}>
                <Icon name="clock" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemValue}>Open 24/7 for Emergencies</Text>
                <Text style={styles.itemLabel}>Operating Hours</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Sticky Bottom Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleOpenMaps}
          accessibilityLabel="Open clinic directions in Maps"
        >
          <Icon name="navigationArrow" size={20} color="#0F1115" />
          <Text style={styles.primaryButtonText}>Open in Maps</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleCall}
          accessibilityLabel="Call clinic now"
        >
          <Icon name="phoneCall" size={18} color="#FFFFFF" />
          <Text style={styles.secondaryButtonText}>Call Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1115',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0F1115',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#1E232E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.palette.darkSideMoon,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.palette.petroBlue,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.palette.eliteTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  content: {
    flex: 1,
  },
  mapCard: {
    margin: 16,
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: theme.colors.palette.eliteTeal,
    borderWidth: 1,
    borderColor: theme.colors.palette.petroBlue,
    ...theme.spatial.shadows3d.level1,
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  mapDirectionsPill: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.palette.coralCoast,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    ...theme.spatial.shadows3d.level1,
  },
  mapDirectionsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapWebFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.palette.eliteTeal,
    gap: 8,
  },
  mapWebText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapDistanceTag: {
    fontSize: 12,
    color: theme.colors.palette.blissfulBlue,
  },
  pinBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.palette.eliteTeal,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: theme.colors.palette.petroBlue,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.palette.blissfulBlue,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceBadgeText: {
    fontSize: 12,
    color: theme.colors.palette.blissfulBlue,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.palette.petroBlue,
    marginVertical: 16,
  },
  detailList: {
    gap: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.palette.eliteTeal,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.palette.petroBlue,
    ...theme.spatial.shadows3d.level1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.palette.petroBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemLabel: {
    fontSize: 12,
    color: theme.colors.palette.blissfulBlue,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.palette.darkSideMoon,
    borderTopWidth: 1,
    borderTopColor: theme.colors.palette.petroBlue,
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.palette.coralCoast,
    paddingVertical: 14,
    borderRadius: theme.spatial.radii.pill,
    gap: 8,
    ...theme.spatial.shadows3d.level2,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.palette.eliteTeal,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: theme.spatial.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.palette.petroBlue,
    gap: 6,
    ...theme.spatial.shadows3d.level1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
