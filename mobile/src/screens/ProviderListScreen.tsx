// mobile/src/screens/ProviderListScreen.tsx
// Provider Directory, Nearest Clinic Locator & Interactive Map

import { Icon } from '../components/Icon';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Illustration } from '../components/Illustration';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProviderMap } from '../components/Map/ProviderMap';
import type { ProviderMapHandle } from '../components/Map/mapTypes';
import { buildProviderMarkers } from '../components/Map/providerMapUtils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Provider } from '../services/types';
import { ProviderService } from '../services/providerService';
import {
  getUserLocationWithStatus,
  sortProvidersByProximity,
  formatDistanceKilometersLabel,
  milesToKilometers,
  type Coordinates,
  type LocationPermissionStatus,
  type ProviderWithDistance,
} from '../services/geoUtils';
import { callPhone, openDirections } from '../services/mapLinks';
import { showAlert } from '../services/alert';
import { theme } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = ['All', 'Hospital', 'Clinic', 'Pharmacy'];
const DISTANCE_FILTERS = [
  { label: 'Up to 50 km', maxKm: null },
  { label: '5 km', maxKm: 5 },
  { label: '10 km', maxKm: 10 },
  { label: '25 km', maxKm: 25 },
];

type EnrichedProvider = ProviderWithDistance;

function getProviderMeta(provider: EnrichedProvider): string {
  return [provider.type, formatDistanceKilometersLabel(provider.distanceMiles)]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
}

export const ProviderListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const mapRef = useRef<ProviderMapHandle>(null);

  const [providers, setProviders] = useState<EnrichedProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<EnrichedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationPermissionStatus | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<EnrichedProvider | null>(null);
  const [sourceTimestamp, setSourceTimestamp] = useState<string | null>(null);
  const [providerSource, setProviderSource] = useState<'OpenStreetMap' | 'Geoapify'>('OpenStreetMap');

  const loadNearbyProviders = useCallback(async (coords: Coordinates | null) => {
    if (!coords) {
      setProviders([]);
      setSourceTimestamp(null);
      setProviderSource('OpenStreetMap');
      return;
    }

    const result = await ProviderService.getProviders(coords);
    setProviderSource(result.source);
    setSourceTimestamp(result.sourceTimestamp);
    setProviders(sortProvidersByProximity(result.providers, coords));
  }, []);

  const initScreenData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const location = await getUserLocationWithStatus();
      const coords =
        location.latitude !== null && location.longitude !== null
          ? { latitude: location.latitude, longitude: location.longitude }
          : null;
      setUserCoords(coords);
      setLocationStatus(location.status);

      await loadNearbyProviders(coords);
    } catch (error) {
      console.error('Failed to load providers:', error);
      setLoadError(
        'Could not reach live facility data. Check the backend connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [loadNearbyProviders]);

  const filterData = useCallback(() => {
    let result = providers;

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          p.type?.toLowerCase().includes(lower) ||
          p.address?.toLowerCase().includes(lower),
      );
    }

    if (activeFilter !== 'All') {
      result = result.filter((p) => p.type?.toLowerCase() === activeFilter.toLowerCase());
    }

    if (maxDistanceKm !== null) {
      result = result.filter(
        (provider) =>
          provider.distanceMiles !== null &&
          milesToKilometers(provider.distanceMiles) <= maxDistanceKm,
      );
    }

    setFilteredProviders(result);
  }, [activeFilter, maxDistanceKm, providers, searchQuery]);

  const mapProviders = useMemo(() => buildProviderMarkers(filteredProviders), [filteredProviders]);

  useEffect(() => {
    initScreenData();
  }, [initScreenData]);

  useEffect(() => {
    filterData();
  }, [filterData]);

  useEffect(() => {
    setSelectedProvider((current) => {
      if (!current) {
        return filteredProviders[0] ?? null;
      }

      return (
        filteredProviders.find((provider) => provider.id === current.id) ??
        filteredProviders[0] ??
        null
      );
    });
  }, [filteredProviders]);

  const refreshLocation = useCallback(async () => {
    const location = await getUserLocationWithStatus();
    const coords =
      location.latitude !== null && location.longitude !== null
        ? { latitude: location.latitude, longitude: location.longitude }
        : null;

    setUserCoords(coords);
    setLocationStatus(location.status);
    try {
      setLoading(true);
      setLoadError(null);
      await loadNearbyProviders(coords);
    } catch (error) {
      console.error('Failed to refresh nearby providers:', error);
      setLoadError(
        'Could not reach live facility data. Check the backend connection and try again.',
      );
    } finally {
      setLoading(false);
    }

    if (location.status === 'granted') {
      setTimeout(() => mapRef.current?.focusUser(), 0);
    }
  }, [loadNearbyProviders]);

  const handleLocationPress = useCallback(() => {
    if (locationStatus === 'denied' && Platform.OS !== 'web') {
      Linking.openSettings().catch(() => {
        refreshLocation();
      });
      return;
    }

    refreshLocation();
  }, [locationStatus, refreshLocation]);

  const handleSelectProvider = useCallback(
    (providerId: string) => {
      const provider = filteredProviders.find((item) => item.id === providerId);
      if (provider) {
        setSelectedProvider(provider);
      }
    },
    [filteredProviders],
  );

  const handleOpenProvider = useCallback(
    (providerId: string) => {
      const provider = filteredProviders.find((item) => item.id === providerId);
      if (provider) {
        navigation.navigate('ProviderDetail', { providerId, provider });
      }
    },
    [filteredProviders, navigation],
  );

  const handleCall = (phone?: string | null) => {
    callPhone(phone);
  };

  const handleCenterOnClosestClinic = () => {
    const closest = filteredProviders.find(
      (provider) => provider.lat !== null && provider.lng !== null,
    );

    if (!closest) {
      showAlert('No Mapped Facilities', 'No facilities with map coordinates match your filters.');
      return;
    }

    setSelectedProvider(closest);
    mapRef.current?.focusProvider(closest.id);
  };

  const handleShowAllProviders = () => {
    mapRef.current?.fitToProviders();
  };

  const handleRecenterOnUser = () => {
    if (locationStatus !== 'granted') {
      refreshLocation();
      return;
    }

    mapRef.current?.focusUser();
  };
  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveFilter('All');
    setMaxDistanceKm(null);
  };

  const renderItem = ({ item }: { item: EnrichedProvider }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('ProviderDetail', { providerId: item.id, provider: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardContent}>
          <Text style={styles.providerName}>{item.name}</Text>
          <Text style={styles.providerDistance}>
            {formatDistanceKilometersLabel(item.distanceMiles) ?? 'Distance unavailable'}
          </Text>
          {item.address ? (
            <Text style={styles.providerAddress} numberOfLines={1}>
              {item.address}
            </Text>
          ) : null}
          <View style={styles.tagContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.type || 'Medical Facility'}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.callButton}
          onPress={() => handleCall(item.phone)}
          accessibilityLabel={`Call ${item.name}`}
        >
          <Icon name="phoneCall" size={20} color={theme.colors.text.inverse} />
        </TouchableOpacity>
      </View>

    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      {/* Top App Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <Icon name="caretLeft" size={24} color={theme.colors.primary.hover} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Provider Directory</Text>

        <TouchableOpacity
          style={[styles.modeToggleBtn, viewMode === 'map' && styles.modeToggleBtnActive]}
          onPress={() => setViewMode((prev) => (prev === 'list' ? 'map' : 'list'))}
          accessibilityLabel={viewMode === 'list' ? 'Switch to map view' : 'Close map view'}
        >
          <Icon
            name={viewMode === 'list' ? 'map' : 'list'}
            size={22}
            color={viewMode === 'map' ? theme.colors.text.inverse : theme.colors.primary.hover}
          />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color={theme.colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clinics, hospitals, pharmacies..."
            placeholderTextColor={theme.colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="closeCircle" size={18} color={theme.colors.text.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={FILTERS}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = activeFilter.toLowerCase() === item.toLowerCase();
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(item)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {item === 'All' ? 'All Facilities' : item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={DISTANCE_FILTERS}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => {
            const isActive = maxDistanceKm === item.maxKm;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setMaxDistanceKm(item.maxKm)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Filter providers within ${item.label}`}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.attributionContainer}>
        <Text style={styles.attributionText}>
          Nearby facilities from {providerSource}
          {sourceTimestamp && Number.isFinite(Date.parse(sourceTimestamp))
            ? ` · Data as of ${new Date(sourceTimestamp).toLocaleString()}`
            : ''}
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
          accessibilityRole="link"
          accessibilityLabel="OpenStreetMap contributors and license"
        >
          <Text style={styles.attributionLink}>© OpenStreetMap contributors</Text>
        </TouchableOpacity>
        {providerSource === 'Geoapify' ? (
          <TouchableOpacity
            onPress={() => Linking.openURL('https://www.geoapify.com/')}
            accessibilityRole="link"
            accessibilityLabel="Powered by Geoapify"
          >
            <Text style={styles.attributionLink}>Powered by Geoapify</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Content Body: List vs Map View */}
      {loadError ? (
        <View style={styles.centerContainer}>
          <Icon name="cloudSlash" size={48} color={theme.colors.text.muted} />
          <Text style={styles.errorTitle}>Couldn&apos;t load facilities</Text>
          <Text style={styles.errorSubtitle}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => initScreenData()}>
            <Icon name="arrowClockwise" size={18} color={theme.colors.text.inverse} />
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.hover} />
          <Text style={styles.loadingText}>Locating nearby medical providers...</Text>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          data={filteredProviders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Illustration
                name="hospitalLocator"
                width={160}
                height={160}
                accessibilityLabel="Hospital locator"
                fallback={<Icon name="hospital" size={48} color={theme.colors.text.muted} />}
              />
              <Text style={styles.emptyTitle}>No Providers Found</Text>
              <Text style={styles.emptySubtitle}>
                {providers.length === 0
                  ? userCoords
                    ? 'No mapped facilities were returned within 50 km. Try refreshing or checking nearby towns.'
                    : 'Enable location access to find medical facilities near you.'
                  : 'Try adjusting your search, category, or distance filters.'}
              </Text>
              {providers.length > 0 &&
              (searchQuery || activeFilter !== 'All' || maxDistanceKm !== null) ? (
                <TouchableOpacity style={styles.emptyResetBtn} onPress={handleResetFilters}>
                  <Text style={styles.emptyResetText}>Clear filters</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      ) : (
        <View style={styles.mapViewport}>
          <ProviderMap
            ref={mapRef}
            providers={mapProviders}
            selectedProviderId={selectedProvider?.id ?? null}
            userCoordinate={userCoords}
            showUserLocation={locationStatus === 'granted'}
            interactive
            onSelectProvider={handleSelectProvider}
            onOpenProvider={handleOpenProvider}
            style={StyleSheet.absoluteFillObject}
          />

          {locationStatus && locationStatus !== 'granted' ? (
            <View style={styles.locationBanner}>
              <Icon name="mapPin" size={16} color={theme.colors.primary.hover} />
              <Text style={styles.locationBannerText} numberOfLines={2}>
                Using an approximate location. Enable GPS for accurate distances.
              </Text>
              <TouchableOpacity
                style={styles.locationBannerAction}
                onPress={handleLocationPress}
                accessibilityLabel="Update location permission"
              >
                <Text style={styles.locationBannerActionText}>
                  {locationStatus === 'denied' && Platform.OS !== 'web' ? 'Settings' : 'Retry'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {mapProviders.length === 0 ? (
            <View style={styles.mapEmptyOverlay} pointerEvents="box-none">
              <View style={styles.mapEmptyCard}>
                <Icon name="mapPin" size={34} color={theme.colors.primary.hover} />
                <Text style={styles.mapEmptyTitle}>No mapped facilities</Text>
                <Text style={styles.mapEmptyText}>
                  {providers.length === 0
                    ? userCoords
                      ? 'No mapped facilities were returned within 50 km. Try refreshing or checking nearby towns.'
                      : 'Enable location access to find medical facilities near you.'
                    : filteredProviders.length === 0
                      ? 'No facilities match your search, category, or distance filters.'
                      : 'The matching facilities do not have map coordinates.'}
                </Text>
                {searchQuery || activeFilter !== 'All' || maxDistanceKm !== null ? (
                  <TouchableOpacity style={styles.emptyResetBtn} onPress={handleResetFilters}>
                    <Text style={styles.emptyResetText}>Clear filters</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Floating Action Buttons over Map */}
          <View style={styles.mapFloatingControls}>
            <View style={styles.mapControlGroup}>
              <TouchableOpacity
                style={styles.floatingActionBtn}
                onPress={handleCenterOnClosestClinic}
                accessibilityLabel="Locate closest facility"
              >
                <Icon name="crosshair" size={18} color={theme.colors.primary.hover} />
                <Text style={styles.floatingActionText}>Nearest</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mapIconBtn}
                onPress={handleShowAllProviders}
                accessibilityLabel="Show all facilities on the map"
              >
                <Icon name="mapPin" size={20} color={theme.colors.primary.hover} />
              </TouchableOpacity>
            </View>

            <View style={styles.mapControlGroup}>
              <TouchableOpacity
                style={styles.mapIconBtn}
                onPress={handleRecenterOnUser}
                accessibilityLabel="Center the map on my location"
              >
                <Icon name="crosshair" size={20} color={theme.colors.primary.hover} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeMapPill}
                onPress={() => setViewMode('list')}
                accessibilityLabel="Close map view and return to list"
              >
                <Icon name="close" size={18} color={theme.colors.text.inverse} />
                <Text style={styles.closeMapText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Selected Provider Highlight Card */}
          {selectedProvider ? (
            <View style={styles.bottomCardWrapper}>
              <View style={styles.bottomCard}>
                <View style={styles.bottomCardInfo}>
                  <Text style={styles.bottomCardTitle} numberOfLines={1}>
                    {selectedProvider.name}
                  </Text>
                  <Text style={styles.bottomCardMeta}>{getProviderMeta(selectedProvider)}</Text>
                  {selectedProvider.address ? (
                    <Text style={styles.bottomCardAddress} numberOfLines={1}>
                      {selectedProvider.address}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.bottomCardActions}>
                  <TouchableOpacity
                    style={styles.bottomCallBtn}
                    onPress={() => handleCall(selectedProvider.phone)}
                    accessibilityLabel="Call facility"
                  >
                    <Icon name="phoneCall" size={18} color={theme.colors.text.inverse} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bottomDirectionsBtn}
                    onPress={() => openDirections(selectedProvider)}
                    accessibilityLabel="Open directions to facility"
                  >
                    <Icon name="navigationArrow" size={18} color={theme.colors.primary.hover} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bottomDetailBtn}
                    onPress={() =>
                      navigation.navigate('ProviderDetail', {
                        providerId: selectedProvider.id,
                        provider: selectedProvider,
                      })
                    }
                  >
                    <Text style={styles.bottomDetailBtnText}>Details</Text>
                    <Icon name="arrowRight" size={16} color={theme.colors.text.inverse} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.canvas.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.canvas.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    letterSpacing: -0.2,
  },
  modeToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleBtnActive: {
    backgroundColor: theme.colors.primary.hover,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: theme.colors.canvas.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    marginLeft: 8,
  },
  filterContainer: {
    paddingVertical: 8,
    backgroundColor: theme.colors.canvas.background,
  },
  attributionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: theme.colors.canvas.background,
  },
  attributionText: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.text.muted,
  },
  attributionLink: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.primary.hover,
    textDecorationLine: 'underline',
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.canvas.surface,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary.hover,
    borderColor: theme.colors.primary.hover,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  filterTextActive: {
    color: theme.colors.text.inverse,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    ...theme.spatial.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  providerDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary.hover,
    marginBottom: 4,
  },
  providerAddress: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.primary.light,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary.hover,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary.hover,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.spatial.shadows.sm,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  errorSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  retryButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.hover,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyResetBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.primary.hover,
  },
  emptyResetText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  mapViewport: {
    flex: 1,
    backgroundColor: theme.colors.canvas.surfaceSubtle,
  },
  mapFloatingControls: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  mapControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    ...theme.spatial.shadows.md,
  },
  mapIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.canvas.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.spatial.shadows.md,
  },
  locationBanner: {
    position: 'absolute',
    top: 68,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.canvas.surface,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    ...theme.spatial.shadows3d.level2,
  },
  locationBannerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  locationBannerAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: theme.colors.primary.hover,
  },
  locationBannerActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  mapEmptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 5,
  },
  mapEmptyCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxWidth: 320,
    ...theme.spatial.shadows.md,
  },
  mapEmptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  mapEmptyText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  floatingActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary.hover,
  },
  closeMapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary.hover,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    ...theme.spatial.shadows.md,
  },
  closeMapText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  bottomCard: {
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.spatial.shadows.lg,
  },
  bottomCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  bottomCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  bottomCardMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary.hover,
    marginBottom: 4,
  },
  bottomCardAddress: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  bottomCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.hover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDirectionsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary.hover,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  bottomDetailBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
});
