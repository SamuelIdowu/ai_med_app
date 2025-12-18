import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Provider } from '../services/types';
import { ProviderService } from '../services/providerService';

type ProviderDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProviderDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProviderDetailScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ProviderDetailScreenRouteProp>();
    const { providerId } = route.params;

    const [provider, setProvider] = useState<Provider | null>(null);

    useEffect(() => {
        loadProvider();
    }, [providerId]);

    const loadProvider = async () => {
        const data = await ProviderService.getProviderById(providerId);
        setProvider(data || null);
    };

    const handleCall = () => {
        if (provider?.phone) {
            Linking.openURL(`tel:${provider.phone}`);
        } else {
            Alert.alert('Error', 'Phone number not available');
        }
    };

    const handleOpenMaps = () => {
        if (provider?.lat && provider?.lng) {
            const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
            const latLng = `${provider.lat},${provider.lng}`;
            const label = provider.name;
            const url = Platform.select({
                ios: `${scheme}${label}@${latLng}`,
                android: `${scheme}${latLng}(${label})`
            });

            if (url) {
                Linking.openURL(url);
            }
        } else {
            Alert.alert('Error', 'Location not available');
        }
    };

    if (!provider) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#e53734" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{provider.name}</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Map Placeholder */}
                <View style={styles.mapContainer}>
                    <View style={styles.mapPlaceholder}>
                        <MaterialCommunityIcons name="map" size={48} color="#9CA3AF" />
                        <Text style={styles.mapText}>Map View Placeholder</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>{provider.name}</Text>
                <Text style={styles.subtitle}>{provider.type} • Emergency Room</Text>

                <View style={styles.divider} />

                {/* Details */}
                <View style={styles.detailList}>
                    <View style={styles.detailItem}>
                        <View style={styles.iconBox}>
                            <Ionicons name="location" size={24} color="#e53734" />
                        </View>
                        <View style={styles.itemContent}>
                            <Text style={styles.itemValue}>{provider.address}</Text>
                            <Text style={styles.itemLabel}>Address</Text>
                        </View>
                    </View>

                    <View style={styles.detailItem}>
                        <View style={styles.iconBox}>
                            <Ionicons name="call" size={24} color="#e53734" />
                        </View>
                        <View style={styles.itemContent}>
                            <Text style={styles.itemValue}>{provider.phone}</Text>
                            <Text style={styles.itemLabel}>Phone</Text>
                        </View>
                    </View>

                    <View style={styles.detailItem}>
                        <View style={styles.iconBox}>
                            <Ionicons name="globe-outline" size={24} color="#e53734" />
                        </View>
                        <View style={styles.itemContent}>
                            <Text style={styles.itemValue}>www.website.com</Text>
                            <Text style={styles.itemLabel}>Website</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky Actions */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleOpenMaps}>
                    <MaterialCommunityIcons name="navigation" size={20} color="white" />
                    <Text style={styles.primaryButtonText}>Open in Maps</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleCall}>
                    <Ionicons name="call" size={20} color="#e53734" />
                    <Text style={styles.secondaryButtonText}>Call Now</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F6F6',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8F6F6',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    content: {
        flex: 1,
    },
    mapContainer: {
        padding: 16,
    },
    mapPlaceholder: {
        width: '100%',
        aspectRatio: 1.6,
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapText: {
        marginTop: 8,
        color: '#6B7280',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111827',
        paddingHorizontal: 16,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#e53734',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 16,
        marginVertical: 8,
    },
    detailList: {
        paddingVertical: 8,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 16,
        backgroundColor: '#F8F6F6',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(229, 55, 52, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemContent: {
        flex: 1,
    },
    itemValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 2,
    },
    itemLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    footer: {
        padding: 16,
        backgroundColor: '#F8F6F6',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#e53734',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#e53734',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        backgroundColor: 'rgba(229, 55, 52, 0.1)',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    secondaryButtonText: {
        color: '#e53734',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
