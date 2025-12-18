import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, StatusBar, Modal, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import { MedicalProfileService } from '../services/medicalProfileService';
import { EncounterService } from '../services/encounterService';
import { StorageService } from '../services/storage';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export const SettingsScreen = () => {
    const navigation = useNavigation<SettingsScreenNavigationProp>();
    const [consentModalVisible, setConsentModalVisible] = useState(false);
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [analyticsConsent, setAnalyticsConsent] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // Navigation to Login/Welcome should be handled by the auth listener in App.tsx
            // But we can also manually navigate if needed, though state change is preferred.
            // Assuming AppNavigator handles auth state.
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleExportData = async () => {
        try {
            setIsExporting(true);

            // 1. Gather all data
            const profile = await MedicalProfileService.getProfile();
            const encounters = await EncounterService.getEncounters();
            const photos = await StorageService.getAllPhotos();

            const exportData = {
                exportedAt: new Date().toISOString(),
                profile,
                encounters,
                photoCount: photos.length,
                appVersion: '1.0.0'
            };

            // 2. Write to file
            const FS = FileSystem as any;
            const fileUri = (FS.documentDirectory || '') + 'ai_med_app_export.json';
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));

            // 3. Share
            await shareAsync(fileUri, {
                UTI: 'public.json',
                mimeType: 'application/json',
                dialogTitle: 'Export My Health Data'
            });

        } catch (error: any) {
            Alert.alert('Export Failed', 'Could not export data: ' + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleDeleteData = () => {
        Alert.alert(
            'Delete All Data',
            'Are you sure you want to delete all your data? This action cannot be undone and will sign you out.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Everything',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsDeleting(true);
                            // 1. Clear Local Data
                            await MedicalProfileService.clearProfile();
                            await EncounterService.clearEncounters();
                            await StorageService.deleteAllPhotos();

                            // 2. Sign Out (this usually clears the session)
                            const { error } = await supabase.auth.signOut();
                            if (error) throw error;

                        } catch (error: any) {
                            Alert.alert('Error', 'Failed to delete some data: ' + error.message);
                        } finally {
                            setIsDeleting(false);
                            // Force navigation or State update will happen via Auth state listener
                        }
                    }
                }
            ]
        );
    };

    const OptionItem = ({
        icon,
        label,
        onPress,
        color = '#1c1c1e',
        showChevron = true
    }: {
        icon: any,
        label: string,
        onPress?: () => void,
        color?: string,
        showChevron?: boolean
    }) => (
        <TouchableOpacity style={styles.optionItem} onPress={onPress}>
            <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: color === '#E53935' ? 'rgba(229, 57, 53, 0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <MaterialIcons name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.optionLabel, { color }]}>{label}</Text>
            </View>
            {showChevron && <MaterialIcons name="chevron-right" size={24} color="#6c6c6e" />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color="#1c1c1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings & Privacy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    <View style={styles.sectionContent}>
                        <OptionItem
                            icon="person"
                            label="Edit Profile"
                            onPress={() => navigation.navigate('MedicalProfile')}
                            color="#E53935"
                        />
                        <View style={styles.separator} />
                        <OptionItem
                            icon="logout"
                            label="Logout"
                            onPress={handleLogout}
                            color="#E53935"
                        />
                    </View>
                </View>

                {/* Privacy & Data Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PRIVACY & DATA</Text>
                    <View style={styles.sectionContent}>
                        <OptionItem
                            icon="verified-user"
                            label="Manage Consent"
                            onPress={() => setConsentModalVisible(true)}
                        />
                        <View style={styles.separator} />
                        <OptionItem
                            icon="download"
                            label="Export My Data"
                            onPress={handleExportData}
                        />
                        <View style={styles.separator} />
                        <OptionItem
                            icon="delete"
                            label="Delete My Data"
                            onPress={handleDeleteData}
                            color="#E53935"
                        />
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ABOUT</Text>
                    <View style={styles.sectionContent}>
                        <OptionItem
                            icon="info"
                            label="About & Disclaimer"
                            onPress={() => Alert.alert('About', 'AI Med App v1.0.0\n\nDisclaimer: This app provides health information but is not a substitute for professional medical advice.')}
                        />
                    </View>
                </View>
                {(isExporting || isDeleting) && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#E53935" />
                        <Text style={styles.loadingText}>{isDeleting ? 'Deleting data...' : 'Exporting data...'}</Text>
                    </View>
                )}

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={consentModalVisible}
                    onRequestClose={() => setConsentModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Privacy Choices</Text>
                                <TouchableOpacity onPress={() => setConsentModalVisible(false)}>
                                    <MaterialIcons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalDescription}>
                                Manage how we use your data. Essential data collection for app functionality cannot be disabled.
                            </Text>

                            <View style={styles.toggleRow}>
                                <Text style={styles.toggleLabel}>Usage Analytics</Text>
                                <Switch
                                    value={analyticsConsent}
                                    onValueChange={setAnalyticsConsent}
                                    trackColor={{ false: '#767577', true: '#E53935' }}
                                />
                            </View>
                            <Text style={styles.toggleDesc}>Allow us to collect anonymous usage data to improve the app.</Text>

                            <View style={[styles.toggleRow, { marginTop: 20 }]}>
                                <Text style={styles.toggleLabel}>Marketing Communications</Text>
                                <Switch
                                    value={marketingConsent}
                                    onValueChange={setMarketingConsent}
                                    trackColor={{ false: '#767577', true: '#E53935' }}
                                />
                            </View>
                            <Text style={styles.toggleDesc}>Receive updates about new features and health tips.</Text>

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={() => setConsentModalVisible(false)}
                            >
                                <Text style={styles.saveButtonText}>Save Preferences</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f6f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1c1c1e',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
        gap: 24,
    },
    section: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6c6c6e',
        marginBottom: 8,
        marginLeft: 16,
        letterSpacing: 0.5,
    },
    sectionContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '400',
        color: '#1c1c1e',
    },
    separator: {
        height: 1,
        backgroundColor: '#e5e5e5',
        marginLeft: 56,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
        minHeight: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1c1c1e',
    },
    modalDescription: {
        fontSize: 15,
        color: '#6c6c6e',
        marginBottom: 30,
        lineHeight: 20,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    toggleLabel: {
        fontSize: 17,
        fontWeight: '500',
        color: '#1c1c1e',
    },
    toggleDesc: {
        fontSize: 13,
        color: '#8e8e93',
        marginBottom: 10,
    },
    saveButton: {
        backgroundColor: '#E53935',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 40,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
});
