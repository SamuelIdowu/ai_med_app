// mobile/src/screens/ProviderListScreen.tsx
// Provider Directory, Nearest Clinic Locator & Interactive Map

import { Icon } from '../components/Icon';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
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
import { LocationBanner } from '../components/LocationBanner';
import { ProviderMap } from '../components/Map/ProviderMap';
import type { ProviderMapHandle } from '../components/Map/mapTypes';
import { buildProviderMarkers } from '../components/Map/providerMapUtils';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ProviderService } from '../services/providerService';
import {
  formatDistanceLabel,
  getUserLocationWithStatus,
  sortProvidersByProximity,
  type Coordinates,
  type LocationPermissionStatus,
  type LocationSource,
  type ProviderWithDistance,
  type UserLocationResult,
} from '../services/geoUtils';
import { callPhone, openDirections } from '../services/mapLinks';
import { showAlert } from '../services/alert';
import { theme } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = ['All', 'Hospital', 'Clinic', 'Pharmacy'];

type EnrichedProvider = ProviderWithDistance;

export const ProviderListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const mapRef = useRef<ProviderMapHandle>(null);

  const [providers, setProviders] = useState<EnrichedProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<EnrichedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationPermissionStatus | null>(null);
  const [locationSource, setLocationSource] = useState<LocationSource>('none');
  const [selectedProvider, setSelectedProvider] = useState<EnrichedProvider | null>(null);
  const hasInitializedRef = useRef(false);

  const applyLocationState = useCallback((location: UserLocationResult): Coordinates | null => {
    const coords =
      location.latitude !== null && location.longitude !== null
        ? { latitude: location.latitude, longitude: location.longitude }
        : null;

    setUserCoords(coords);
    setLocationStatus(location.status);
    setLocationSource(location.source);
    return coords;
  }, []);

  const initScreenData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const location = await getUserLocationWithStatus();
      const coords = applyLocationState(location);

      const rawData = await ProviderService.getProviders();
      const sorted = sortProvidersByProximity(rawData, coords);
      setProviders(sorted);
    } catch (error) {
      console.error('Failed to load providers:', error);
      setLoadError(
        'Could not load nearby medical facilities. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [applyLocationState]);

  const filterData = useCallback(() => {
    let result = providers;

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          p.type?.toLowerCase().includes(lower) ||
          p.address?.toLowerCase().includes(lower)
      );
    }

    if (activeFilter !== 'All') {
      result = result.filter(
        (p) => p.type?.toLowerCase() === activeFilter.toLowerCase()
      );
    }

    setFilteredProviders(result);
  }, [activeFilter, providers, searchQuery]);

  const mapProviders = useMemo(
    () => buildProviderMarkers(filteredProviders),
    [filteredProviders]
  );

  const refreshLocation = useCallback(
    async (options: { requestPermission?: boolean } = {}) => {
      const location = await getUserLocationWithStatus(options);
      const coords = applyLocationState(location);

      setProviders((current) => sortProvidersByProximity(current, coords));

      if (coords) {
        setTimeout(() => mapRef.current?.focusUser(), 0);
      }

      return coords;
    },
    [applyLocationState]
  );

  useFocusEffect(
    useCallback(() => {
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        void initScreenData();
        return;
      }

      void refreshLocation({ requestPermission: false });
    }, [initScreenData, refreshLocation])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && hasInitializedRef.current) {
        void refreshLocation({ requestPermission: false });
      }
    });

    return () => subscription.remove();
  }, [refreshLocation]);

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

  const handleLocationPress = useCallback(() => {
    if (locationStatus === 'denied' && Platform.OS !== 'web') {
      Linking.openSettings().catch(() => {
        void refreshLocation({ requestPermission: true });
      });
      return;
    }

    void refreshLocation({ requestPermission: true });
  }, [locationStatus, refreshLocation]);

  const handleSelectProvider = useCallback(
    (providerId: string) => {
      const provider = filteredProviders.find((item) => item.id === providerId);
      if (provider) {
        setSelectedProvider(provider);
      }
    },
    [filteredProviders]
  );

  const handleOpenProvider = useCallback(
    (providerId: string) => {
      navigation.navigate('ProviderDetail', { providerId });
    },
    [navigation]
  );

  const handleCall = (phone?: string | null) => {
    callPhone(phone);
  };

  const handleCenterOnClosestClinic = async () => {
    const coords = userCoords ?? (await refreshLocation({ requestPermission: true }));

    if (!coords) {
      showAlert(
        'Location Needed',
        'Enable location access to find the facility closest to you.'
      );
      return;
    }

    const closest = sortProvidersByProximity(filteredProviders, coords).find(
      (provider) => provider.distanceMiles !== null
    );

    if (!closest) {
      showAlert(
        'No Located Facilities',
        'No facilities with valid coordinates match your filters.'
      );
      return;
    }

    setSelectedProvider(closest);
    mapRef.current?.focusProvider(closest.id);
  };

  const handleShowAllProviders = () => {
    mapRef.current?.fitToProviders();
  };

  const handleRecenterOnUser = async () => {
    if (!userCoords) {
      const coords = await refreshLocation({ requestPermission: true });

      if (!coords) {
        showAlert(
          'Location Needed',
          'Enable location access to center the map on your current position.'
        );
        return;
      }
    }

    mapRef.current?.focusUser();
  };
  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveFilter('All');
  };

  const renderItem = ({ item }: { item: EnrichedProvider }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('ProviderDetail', { providerId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardContent}>
          <Text style={styles.providerName}>{item.name}</Text>
          <Text style={styles.providerDistance}>
            {formatDistanceLabel(item.distanceMiles) ?? 'Distance unavailable'}
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
            color={
              viewMode === 'map'
                ? theme.colors.text.inverse
                : theme.colors.primary.hover
            }
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

      {!loading && !loadError && locationStatus ? (
        <View style={styles.inlineBannerContainer}>
          <LocationBanner
            status={locationStatus}
            source={locationSource}
            onPress={handleLocationPress}
          />
        </View>
      ) : null}

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
                fallback={
                  <Icon name="hospital" size={48} color={theme.colors.text.muted} />
                }
              />
              <Text style={styles.emptyTitle}>No Providers Found</Text>
              <Text style={styles.emptySubtitle}>
                {providers.length === 0
                  ? 'Sign in to load nearby medical facilities.'
                  : 'Try adjusting your search query or filters.'}
              </Text>
              {providers.length > 0 && (searchQuery || activeFilter !== 'All') ? (
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
            showUserLocation={Boolean(userCoords)}
            interactive
            onSelectProvider={handleSelectProvider}
            onOpenProvider={handleOpenProvider}
            style={StyleSheet.absoluteFillObject}
          />

          {locationStatus ? (
            <LocationBanner
              status={locationStatus}
              source={locationSource}
              onPress={handleLocationPress}
              variant="floating"
            />
          ) : null}

          {mapProviders.length === 0 ? (
            <View style={styles.mapEmptyOverlay} pointerEvents="box-none">
              <View style={styles.mapEmptyCard}>
                <Icon
                  name="mapPin"
                  size={34}
                  color={theme.colors.primary.hover}
                />
                <Text style={styles.mapEmptyTitle}>No mapped facilities</Text>
                <Text style={styles.mapEmptyText}>
                  {providers.length === 0
                    ? 'Sign in to load nearby medical facilities.'
                    : filteredProviders.length === 0
                      ? 'No facilities match your search or filters.'
                      : 'The matching facilities do not have map coordinates.'}
                </Text>
                {searchQuery || activeFilter !== 'All' ? (
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
                  <Text style={styles.bottomCardMeta}>
                    {[selectedProvider.type, formatDistanceLabel(selectedProvider.distanceMiles)]
                      .filter((value): value is string => Boolean(value))
                      .join(' • ')}
                  </Text>
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
                    <Icon
                      name="navigationArrow"
                      size={18}
                      color={theme.colors.primary.hover}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bottomDetailBtn}
                    onPress={() =>
                      navigation.navigate('ProviderDetail', {
                        providerId: selectedProvider.id,
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
  inlineBannerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: theme.colors.palette.darkSideMoon,
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
