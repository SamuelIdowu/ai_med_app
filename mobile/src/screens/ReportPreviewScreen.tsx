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
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { getIllustration } from '../assets/illustrations';

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
                <ActivityIndicator size="large" color={theme.colors.primary.main} />
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
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.canvas.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Preview Report</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.pageTitleRow}>
                    {getIllustration('recordCapsule') && (
                        <Image
                            source={getIllustration('recordCapsule')!}
                            style={styles.recordCapsuleImage}
                            resizeMode="contain"
                        />
                    )}
                    <Text style={styles.pageTitle}>Emergency Report</Text>
                </View>

                {/* Patient Card */}
                <View style={styles.card}>
                    <View style={styles.patientInfoRow}>
                        {profile?.photoUrl ? (
                            <Image
                                source={{ uri: profile.photoUrl }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <MaterialCommunityIcons name="account" size={28} color="#737373" />
                            </View>
                        )}
                        <View style={styles.patientDetails}>
                            <Text style={styles.patientName} numberOfLines={1}>{profile?.fullName || 'Patient'}</Text>
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
                                {encounter?.created_at ? new Date(encounter.created_at).toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }) : 'Unknown'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.gridRow}>
                        <View style={styles.gridItem}>
                            <Text style={styles.gridLabel}>Location</Text>
                            <Text style={styles.gridValue}>{encounter?.location || 'Location not specified'}</Text>
                        </View>
                    </View>
                </View>

                {/* Vitals & Triage Assessment (if recorded) */}
                {encounter?.vitals ? (
                    <View style={styles.card}>
                        <View style={styles.vitalsHeaderRow}>
                            <View style={styles.vitalsTitleGroup}>
                                <MaterialCommunityIcons name="heart-pulse" size={20} color="#E53734" />
                                <Text style={styles.vitalsCardTitle}>Vitals & ML Triage</Text>
                            </View>
                            <View style={[
                                styles.triageBadge,
                                encounter.vitals.triage_label === 'Emergency' ? styles.badgeEmergency :
                                encounter.vitals.triage_label === 'Urgent' ? styles.badgeUrgent : styles.badgeNonUrgent
                            ]}>
                                <Text style={[
                                    styles.triageBadgeText,
                                    encounter.vitals.triage_label === 'Emergency' ? styles.badgeTextEmergency :
                                    encounter.vitals.triage_label === 'Urgent' ? styles.badgeTextUrgent : styles.badgeTextNonUrgent
                                ]}>
                                    {encounter.vitals.triage_label || 'Evaluated'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.vitalsGrid}>
                            <View style={styles.vitalMetricBox}>
                                <Text style={styles.vitalMetricLabel}>Heart Rate</Text>
                                <Text style={styles.vitalMetricValue}>{encounter.vitals.heart_rate ?? '--'} <Text style={styles.vitalMetricUnit}>bpm</Text></Text>
                            </View>
                            <View style={styles.vitalMetricBox}>
                                <Text style={styles.vitalMetricLabel}>Blood Pressure</Text>
                                <Text style={styles.vitalMetricValue}>
                                    {encounter.vitals.systolic_bp ?? '--'}/{encounter.vitals.diastolic_bp ?? '--'} <Text style={styles.vitalMetricUnit}>mmHg</Text>
                                </Text>
                            </View>
                            <View style={styles.vitalMetricBox}>
                                <Text style={styles.vitalMetricLabel}>SpO2 Oxygen</Text>
                                <Text style={styles.vitalMetricValue}>{encounter.vitals.oxygen_saturation ?? '--'} <Text style={styles.vitalMetricUnit}>%</Text></Text>
                            </View>
                            <View style={styles.vitalMetricBox}>
                                <Text style={styles.vitalMetricLabel}>Resp. Rate</Text>
                                <Text style={styles.vitalMetricValue}>{encounter.vitals.respiratory_rate ?? '--'} <Text style={styles.vitalMetricUnit}>br/min</Text></Text>
                            </View>
                            <View style={styles.vitalMetricBox}>
                                <Text style={styles.vitalMetricLabel}>Temperature</Text>
                                <Text style={styles.vitalMetricValue}>{encounter.vitals.body_temperature ?? '--'} <Text style={styles.vitalMetricUnit}>°C</Text></Text>
                            </View>
                            <View style={styles.vitalMetricBox}>
                                <Text style={styles.vitalMetricLabel}>Pain Level</Text>
                                <Text style={styles.vitalMetricValue}>{encounter.vitals.pain_score ?? '0'} <Text style={styles.vitalMetricUnit}>/10</Text></Text>
                            </View>
                        </View>

                        {encounter.vitals.risk_drivers && encounter.vitals.risk_drivers.length > 0 ? (
                            <View style={styles.vitalsRiskContainer}>
                                <Text style={styles.vitalsRiskTitle}>Clinical Risk Drivers & Red Flags:</Text>
                                {encounter.vitals.risk_drivers.map((driver: string, idx: number) => (
                                    <View key={idx} style={styles.riskRow}>
                                        <MaterialIcons name="warning-amber" size={16} color="#DC2626" />
                                        <Text style={styles.riskText}>{driver}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {/* Added Notes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Added Notes</Text>
                    <Text style={styles.notesText}>
                        {encounter?.notes || 'No responder notes recorded for this encounter.'}
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
        backgroundColor: theme.colors.canvas.background,
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
        backgroundColor: theme.colors.canvas.background,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: 50,
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
        color: theme.colors.text.primary,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 100,
    },
    pageTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        marginTop: 8,
    },
    recordCapsuleImage: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#0F1115',
    },
    pageTitle: {
        flex: 1,
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    card: {
        backgroundColor: theme.colors.canvas.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.canvas.border,
        ...theme.spatial.shadows3d.level1,
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
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
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
        backgroundColor: theme.colors.canvas.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.canvas.border,
    },
    shareButton: {
        backgroundColor: theme.colors.primary.main,
        borderRadius: theme.spatial.radii.pill,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...theme.spatial.shadows3d.level2,
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
    vitalsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    vitalsTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    vitalsCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#171717',
    },
    triageBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeEmergency: {
        backgroundColor: '#FEE2E2',
    },
    badgeUrgent: {
        backgroundColor: '#FEF3C7',
    },
    badgeNonUrgent: {
        backgroundColor: '#DCFCE7',
    },
    triageBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    badgeTextEmergency: {
        color: '#DC2626',
    },
    badgeTextUrgent: {
        color: '#D97706',
    },
    badgeTextNonUrgent: {
        color: '#16A34A',
    },
    vitalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    vitalMetricBox: {
        flexBasis: '30%',
        flexGrow: 1,
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    vitalMetricLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 4,
    },
    vitalMetricValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    vitalMetricUnit: {
        fontSize: 11,
        fontWeight: 'normal',
        color: '#9CA3AF',
    },
    vitalsRiskContainer: {
        marginTop: 14,
        padding: 10,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
    },
    vitalsRiskTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#B91C1C',
        marginBottom: 6,
    },
    riskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginVertical: 2,
    },
    riskText: {
        fontSize: 12,
        color: '#7F1D1D',
        fontWeight: '500',
    },
});
