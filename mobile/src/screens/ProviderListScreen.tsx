// mobile/src/screens/ProviderListScreen.tsx
// Provider Directory, Nearest Clinic Locator & Interactive Map

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from '../components/Map';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Provider } from '../services/types';
import { ProviderService } from '../services/providerService';
import {
  getCurrentUserLocation,
  sortProvidersByProximity,
  formatDistance,
  DEFAULT_USER_COORDS,
} from '../services/geoUtils';
import { theme } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = ['All', 'Hospital', 'Clinic', 'Pharmacy'];

type EnrichedProvider = Provider & { distanceMiles: number };

export const ProviderListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const mapRef = useRef<MapView>(null);

  const [providers, setProviders] = useState<EnrichedProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<EnrichedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userCoords, setUserCoords] = useState(DEFAULT_USER_COORDS);
  const [selectedProvider, setSelectedProvider] = useState<EnrichedProvider | null>(null);

  useEffect(() => {
    initScreenData();
  }, []);

  useEffect(() => {
    filterData();
  }, [providers, searchQuery, activeFilter]);

  const initScreenData = async () => {
    try {
      setLoading(true);
      const coords = await getCurrentUserLocation();
      setUserCoords(coords);

      const rawData = await ProviderService.getProviders();
      const sorted = sortProvidersByProximity(rawData, coords);
      setProviders(sorted);
      if (sorted.length > 0) {
        setSelectedProvider(sorted[0]);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
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
  };

  const handleCall = (phone?: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Error', 'Unable to initiate call on this device');
      });
    } else {
      Alert.alert('Phone Unavailable', 'No contact phone number listed for this provider.');
    }
  };

  const handleCenterOnClosestClinic = () => {
    if (filteredProviders.length > 0 && mapRef.current) {
      const closest = filteredProviders[0];
      setSelectedProvider(closest);
      mapRef.current.animateToRegion(
        {
          latitude: closest.lat ?? userCoords.latitude,
          longitude: closest.lng ?? userCoords.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        600
      );
    }
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
          <Text style={styles.providerDistance}>{formatDistance(item.distanceMiles)}</Text>
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
          <Ionicons name="call" size={20} color="#111318" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="#111318" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Provider Directory</Text>

        <TouchableOpacity
          style={[styles.modeToggleBtn, viewMode === 'map' && styles.modeToggleBtnActive]}
          onPress={() => setViewMode((prev) => (prev === 'list' ? 'map' : 'list'))}
          accessibilityLabel={viewMode === 'list' ? 'Switch to map view' : 'Close map view'}
        >
          <MaterialCommunityIcons
            name={viewMode === 'list' ? 'map-outline' : 'format-list-bulleted'}
            size={22}
            color={viewMode === 'map' ? '#FFFFFF' : '#111318'}
          />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clinics, hospitals, pharmacies..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
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

      {/* Content Body: List vs Map View */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#111318" />
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
              <MaterialCommunityIcons name="hospital-building" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Providers Found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search query or filters.</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.mapViewport}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: userCoords.latitude,
              longitude: userCoords.longitude,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            {filteredProviders.map((item) =>
              item.lat && item.lng ? (
                <Marker
                  key={item.id}
                  coordinate={{ latitude: item.lat, longitude: item.lng }}
                  title={item.name || ''}
                  description={`${item.type || 'Clinic'} • ${formatDistance(item.distanceMiles)}`}
                  onPress={() => setSelectedProvider(item)}
                >
                  <View
                    style={[
                      styles.mapMarker,
                      selectedProvider?.id === item.id && styles.mapMarkerSelected,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.type === 'Hospital' ? 'hospital-box' : 'medical-bag'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <Callout
                    onPress={() =>
                      navigation.navigate('ProviderDetail', { providerId: item.id })
                    }
                  >
                    <View style={styles.calloutBox}>
                      <Text style={styles.calloutTitle}>{item.name}</Text>
                      <Text style={styles.calloutSubtitle}>
                        {formatDistance(item.distanceMiles)} • Tap for details
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              ) : null
            )}
          </MapView>

          {/* Floating Action Buttons over Map */}
          <View style={styles.mapFloatingControls}>
            <TouchableOpacity
              style={styles.floatingActionBtn}
              onPress={handleCenterOnClosestClinic}
              accessibilityLabel="Locate closest clinic"
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#111318" />
              <Text style={styles.floatingActionText}>Nearest Facility</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeMapPill}
              onPress={() => setViewMode('list')}
              accessibilityLabel="Close map view and return to list"
            >
              <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
              <Text style={styles.closeMapText}>Close Map</Text>
            </TouchableOpacity>
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
                    {selectedProvider.type} • {formatDistance(selectedProvider.distanceMiles)}
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
                    accessibilityLabel="Call clinic"
                  >
                    <Ionicons name="call" size={18} color="#111318" />
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
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
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
    backgroundColor: '#0F1115',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F1115',
    borderBottomWidth: 1,
    borderBottomColor: '#222630',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E232E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  modeToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E232E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleBtnActive: {
    backgroundColor: '#374151',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#0F1115',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1E26',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#262C38',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  filterContainer: {
    paddingVertical: 8,
    backgroundColor: '#0F1115',
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1E26',
    borderWidth: 1,
    borderColor: '#262C38',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterTextActive: {
    color: '#0F1115',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1A1E26',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262C38',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  providerDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  providerAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#262C38',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  mapViewport: {
    flex: 1,
  },
  mapMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111318',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerSelected: {
    backgroundColor: '#2563EB',
    transform: [{ scale: 1.15 }],
  },
  calloutBox: {
    padding: 8,
    minWidth: 140,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F1115',
  },
  calloutSubtitle: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
  },
  mapFloatingControls: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  floatingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111318',
  },
  closeMapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111318',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  closeMapText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  bottomCard: {
    backgroundColor: '#1A1E26',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262C38',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  bottomCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  bottomCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bottomCardMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  bottomCardAddress: {
    fontSize: 12,
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262C38',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  bottomDetailBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
