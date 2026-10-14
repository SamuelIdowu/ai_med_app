// mobile/src/screens/ProviderListScreen.web.tsx
// Web-Compatible Provider Directory & Closest Clinic Map

import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = ['All', 'Hospital', 'Clinic', 'Pharmacy'];

type EnrichedProvider = Provider & { distanceMiles: number };

export const ProviderListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [providers, setProviders] = useState<EnrichedProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<EnrichedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userCoords, setUserCoords] = useState(DEFAULT_USER_COORDS);

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
        Alert.alert('Phone Call', `Contact: ${phone}`);
      });
    } else {
      Alert.alert('Phone Unavailable', 'No contact phone number listed.');
    }
  };

  const handleOpenGoogleMaps = (item: EnrichedProvider) => {
    const lat = item.lat ?? userCoords.latitude;
    const lng = item.lng ?? userCoords.longitude;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      item.name || 'Medical Clinic'
    )}&query=${lat},${lng}`;
    Linking.openURL(url);
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
              <Text style={styles.tagText}>{item.type || 'Clinic'}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.callButton}
          onPress={() => handleCall(item.phone)}
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
        >
          <Ionicons name="chevron-back" size={24} color="#111318" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Provider Directory</Text>

        <TouchableOpacity
          style={[styles.modeToggleBtn, viewMode === 'map' && styles.modeToggleBtnActive]}
          onPress={() => setViewMode((prev) => (prev === 'list' ? 'map' : 'list'))}
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

      {/* Category Filters */}
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

      {/* Body Content */}
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
        <View style={styles.webMapContainer}>
          <View style={styles.webMapHeader}>
            <Text style={styles.webMapHeaderTitle}>Closest Medical Facilities</Text>
            <TouchableOpacity
              style={styles.closeMapPill}
              onPress={() => setViewMode('list')}
            >
              <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
              <Text style={styles.closeMapText}>Close Map</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredProviders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.webMapList}
            renderItem={({ item, index }) => (
              <View style={styles.webMapCard}>
                <View style={styles.webMapCardBadge}>
                  <Text style={styles.webMapCardBadgeText}>#{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{item.name}</Text>
                  <Text style={styles.providerDistance}>{formatDistance(item.distanceMiles)}</Text>
                  <Text style={styles.providerAddress}>{item.address || 'Address on file'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.directionsBtn}
                  onPress={() => handleOpenGoogleMaps(item)}
                >
                  <Ionicons name="navigate" size={18} color="#FFFFFF" />
                  <Text style={styles.directionsBtnText}>Directions</Text>
                </TouchableOpacity>
              </View>
            )}
          />
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
  webMapContainer: {
    flex: 1,
    padding: 16,
  },
  webMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  webMapHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeMapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E232E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  closeMapText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webMapList: {
    gap: 12,
  },
  webMapCard: {
    backgroundColor: '#1A1E26',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262C38',
    gap: 12,
  },
  webMapCardBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262C38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMapCardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  directionsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
