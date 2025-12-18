import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Encounter } from '../services/types';
import { EncounterService } from '../services/encounterService';
import { MedicalProfileService, MedicalProfile } from '../services/medicalProfileService';
import { reportService } from '../services/reportService';
import { AnalyticsService } from '../services/analyticsService';
import { ShareOptionsModal } from '../components/ShareOptionsModal';
import { MaterialIcons } from '@expo/vector-icons';

type ReportPreviewScreenRouteProp = RouteProp<RootStackParamList, 'ReportPreview'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ReportPreviewScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ReportPreviewScreenRouteProp>();
    const { encounterId } = route.params;

    const [encounter, setEncounter] = useState<Encounter | null>(null);
    const [profile, setProfile] = useState<MedicalProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [shareModalVisible, setShareModalVisible] = useState(false);

    useEffect(() => {
        loadData();
    }, [encounterId]);

    const loadData = async () => {
        try {
            const encounters = await EncounterService.getEncounters();
            const found = encounters.find((e: Encounter) => e.id === encounterId);
            setEncounter(found || null);

            const userProfile = await MedicalProfileService.getProfile();
            setProfile(userProfile);
        } catch (error) {
            console.error('Failed to load report data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSharePress = () => {
        setShareModalVisible(true);
    };

    const handleShareAction = async (action: string) => {
        // In a real app, implement actual share logic here for each action
        console.log('Share action:', action);
        await AnalyticsService.track('share_report_action', {
            action,
            encounterId: encounter?.id,
            category: encounter?.category
        });
        setShareModalVisible(false);
    };

    // Calculate age helper
    const getAge = (dobString?: string) => {
        if (!dobString) return null;
        const today = new Date();
        const birthDate = new Date(dobString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E53734" />
            </View>
        );
    }

    if (!encounter) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Encounter not found.</Text>
            </View>
        );
    }

    const age = getAge(profile?.dob);
    const allergies = profile?.allergies && Array.isArray(profile.allergies) ? profile.allergies.join(', ') : 'None';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F6F6" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={20} color="#171717" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Preview Report</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
                <Text style={styles.pageTitle}>Emergency Report</Text>

                {/* Patient Card */}
                <View style={styles.card}>
                    <View style={styles.patientInfoRow}>
                        <Image
                            source={{ uri: profile?.photoUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAB9SOQ8kjrcKUgdbi0u-_6m6MoekDee1ONUHXFA3LopL9eC92V_BiDdu9XibjsMrsOT-lbu_560W41GBoxbrHORvpZpCbJdsbZLHe1GKFOUuQ4I2X_0m3QhPKEJAp5NnJkX2_Oe2f1YyCxcVDELPDaPJXUM_yNOHO1WAFgBmrrSVrJuLjuSbzcfUqAOWujEtXh1oiPQaMN9dr_mKo07kj9V937r_YCWMsY4Jwkus40Y_6qF4jcxCdTJxglR2KtR6__0e827I9e6RE' }}
                            style={styles.avatar}
                        />
                        <View style={styles.patientDetails}>
                            <Text style={styles.patientName} numberOfLines={1}>{profile?.fullName || 'John Doe'}</Text>
                            <Text style={styles.patientSubDetail} numberOfLines={2}>
                                {age ? `${age} years old` : 'Age unknown'}, Allergy: {allergies}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Details Grid */}
                <View style={styles.card}>
                    <View style={styles.gridRow}>
                        <View style={styles.gridItem}>
                            <Text style={styles.gridLabel}>Timestamp</Text>
                            <Text style={styles.gridValue}>
                                {encounter.created_at ? new Date(encounter.created_at).toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }) : 'Unknown'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.gridRow}>
                        <View style={styles.gridItem}>
                            <Text style={styles.gridLabel}>Location</Text>
                            <Text style={styles.gridValue}>Central Park, New York</Text>
                        </View>
                    </View>
                </View>

                {/* Added Notes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Added Notes</Text>
                    <Text style={styles.notesText}>
                        {encounter.notes || 'Patient tripped and fell, sustaining a deep cut on the right forearm. Bleeding was controlled with direct pressure. Patient is conscious and alert, but experiencing moderate pain.'}
                    </Text>
                </View>

                {/* Attached Photos */}
                {(encounter.photos && encounter.photos.length > 0) ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Attached Photos</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                            {encounter.photos.map((uri, index) => (
                                <Image key={index} source={{ uri }} style={styles.photo} />
                            ))}
                        </ScrollView>
                    </View>
                ) : null}

            </ScrollView>

            {/* Sticky Share Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.shareButton} onPress={handleSharePress}>
                    <MaterialIcons name="share" size={20} color="#FFFFFF" />
                    <Text style={styles.shareButtonText}>Share Report</Text>
                </TouchableOpacity>
            </View>

            <ShareOptionsModal
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                onShareAction={handleShareAction}
            />
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
        // Sticky header effect
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: 50, // Approximate Status bar height compensation if SafeArea doesn't handle absolute
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#171717',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 100, // Make space for absolute header
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#171717',
        marginBottom: 16,
        marginTop: 8,
    },
    card: {
        backgroundColor: '#FFFFFF', // dark:bg-neutral-800/50
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        // No shadow in design snippet actually, just simple background, but card implies it.
    },
    patientInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E5E7EB',
    },
    patientDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    patientName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#171717',
        marginBottom: 2,
    },
    patientSubDetail: {
        fontSize: 14,
        color: '#525252',
    },
    gridRow: {
        paddingVertical: 4,
    },
    gridItem: {
        gap: 4,
    },
    gridLabel: {
        fontSize: 14,
        color: '#737373',
    },
    gridValue: {
        fontSize: 14,
        color: '#1F2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    section: {
        marginTop: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#171717',
        marginBottom: 12,
        paddingTop: 8,
    },
    notesText: {
        fontSize: 16,
        color: '#404040', // neutral-700
        lineHeight: 24,
    },
    photosScroll: {
        marginHorizontal: -16, // Bleed out
        paddingHorizontal: 16,
    },
    photo: {
        width: 112,
        height: 112,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#E5E7EB',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: '#F8F6F6',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    shareButton: {
        backgroundColor: '#E53734',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
        marginTop: 20,
    },
});
