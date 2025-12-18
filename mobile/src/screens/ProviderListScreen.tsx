import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Provider } from '../services/types';
import { ProviderService } from '../services/providerService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = ['All', 'Hospital', 'Clinic', 'Pharmacy'];

export const ProviderListScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [providers, setProviders] = useState<Provider[]>([]);
    const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    useEffect(() => {
        loadProviders();
    }, []);

    useEffect(() => {
        filterData();
    }, [providers, searchQuery, activeFilter]);

    const loadProviders = async () => {
        try {
            const data = await ProviderService.getProviders();
            setProviders(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filterData = () => {
        let result = providers;

        // Apply Search
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(lower) ||
                p.type?.toLowerCase().includes(lower)
            );
        }

        // Apply Category Filter
        if (activeFilter !== 'All') {
            result = result.filter(p => p.type === activeFilter);
        }

        setFilteredProviders(result);
    };

    const renderItem = ({ item }: { item: Provider }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ProviderDetail', { providerId: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardContent}>
                    <Text style={styles.providerName}>{item.name}</Text>
                    <Text style={styles.providerDistance}>1.2 mi away</Text>
                    <View style={styles.tagContainer}>
                        <View style={[
                            styles.tag,
                            item.type === 'Hospital' ? styles.tagRed :
                                item.type === 'Pharmacy' ? styles.tagGreen : styles.tagBlue
                        ]}>
                            <Text style={[
                                styles.tagText,
                                item.type === 'Hospital' ? styles.tagTextRed :
                                    item.type === 'Pharmacy' ? styles.tagTextGreen : styles.tagTextBlue
                            ]}>{item.type}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.callButton}>
                    <Ionicons name="call" size={24} color="#E53734" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Provider Directory</Text>
                <TouchableOpacity onPress={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')}>
                    <MaterialCommunityIcons
                        name={viewMode === 'list' ? "map-marker-radius" : "format-list-bulleted"}
                        size={24}
                        color="#1F2937"
                    />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#6B7280" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search providers..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    data={FILTERS}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                    keyExtractor={item => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
                            onPress={() => setActiveFilter(item)}
                        >
                            <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#E53734" />
                </View>
            ) : viewMode === 'list' ? (
                <FlatList
                    data={filteredProviders}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16, gap: 16 }}
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <MapView
                        style={{ width: '100%', height: '100%' }}
                        initialRegion={{
                            latitude: 40.7128,
                            longitude: -74.0060,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                    >
                        {filteredProviders.map(item => (
                            (item.lat && item.lng) ? (
                                <Marker
                                    key={item.id}
                                    coordinate={{ latitude: item.lat, longitude: item.lng }}
                                    title={item.name || ''}
                                    description={item.type || ''}
                                    onCalloutPress={() => navigation.navigate('ProviderDetail', { providerId: item.id })}
                                />
                            ) : null
                        ))}
                    </MapView>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F6F6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8F6F6',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F8F6F6', // Sticky header look
        zIndex: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1F2937',
    },
    filterContainer: {
        paddingVertical: 8,
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterChipActive: {
        backgroundColor: '#E53734',
        borderColor: '#E53734',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardContent: {
        flex: 1,
        marginRight: 16,
    },
    providerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    providerDistance: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    tagContainer: {
        flexDirection: 'row',
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
    },
    tagRed: { backgroundColor: '#FEE2E2', },
    tagBlue: { backgroundColor: '#DBEAFE', },
    tagGreen: { backgroundColor: '#DCFCE7', },
    tagText: { fontSize: 12, fontWeight: '500' },
    tagTextRed: { color: '#B91C1C' },
    tagTextBlue: { color: '#1D4ED8' },
    tagTextGreen: { color: '#15803D' },

    callButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(229, 55, 52, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
