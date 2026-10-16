
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import firstAidData from '../content/first-aid-content.json';
import { EncounterService } from '../services/encounterService';
import { offlineStorage } from '../services/offlineStorage';
import { Encounter } from '../services/types';

const BG_LIGHT = '#f8f6f6';
const CARD_LIGHT = '#ffffff';
const TEXT_LIGHT = '#1b0e0e';
const TEXT_SECONDARY = '#666666'; // gray-500/600ish
const SUCCESS_COLOR = '#27ae60';
const TEXT_DARK = '#1b0e0e';

type RootStackParamList = {
    EmergencySummary: { categoryId: string; encounterId?: string; symptoms?: string[] };
};

type EmergencySummaryRouteProp = RouteProp<RootStackParamList, 'EmergencySummary'>;

export const EmergencySummaryScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<EmergencySummaryRouteProp>();
    const { categoryId, encounterId, symptoms: routeSymptoms } = route.params;
    const category = firstAidData.categories.find(c => c.id === categoryId);
    const [encounter, setEncounter] = useState<Encounter | null>(null);

    useEffect(() => {
        if (!encounterId) return;
        let isMounted = true;
        EncounterService.getEncounters().then((encounters: Encounter[]) => {
            const found = encounters.find((e: Encounter) => e.id === encounterId);
            if (isMounted && found) {
                setEncounter(found);
            }
        }).catch(() => {
            offlineStorage.getPendingEncounters().then((pending) => {
                const found = pending.find((p) => p.id === encounterId);
                if (isMounted && found) {
                    setEncounter({
                        id: found.id,
                        created_at: new Date(found.createdAt).toISOString(),
                        status: 'in_progress',
                        category: categoryId || 'general',
                        symptoms: found.symptoms,
                        notes: found.notes,
                    } as unknown as Encounter);
                }
            }).catch(() => {});
        });
        return () => { isMounted = false; };
    }, [encounterId]);

    const displaySymptoms: string[] =
        (routeSymptoms && routeSymptoms.length > 0)
            ? routeSymptoms
            : (encounter?.symptoms && encounter.symptoms.length > 0)
            ? encounter.symptoms
            : (encounter?.notes ? [encounter.notes] : []);

    const handleGoHome = () => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home' }],
            })
        );
    };

    const handleShare = () => {
        if (encounterId) {
            navigation.navigate('ReportPreview', { encounterId });
        } else {
            console.warn("No encounter ID available to share");
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" backgroundColor={BG_LIGHT} />

            {/* Top App Bar */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Incident Summary</Text>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroIconContainer}>
                        <MaterialCommunityIcons name="check-circle" size={48} color={SUCCESS_COLOR} />
                    </View>
                    <Text style={styles.heroTitle}>Well Done</Text>
                    <Text style={styles.heroSubtitle}>You've successfully completed the first aid steps.</Text>
                </View>

                {/* Incident Summary Card */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>Incident Report</Text>

                    <View style={styles.cardSection}>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="fire" size={24} color={TEXT_SECONDARY} style={styles.rowIcon} />
                            <View>
                                <Text style={styles.label}>Incident</Text>
                                <Text style={styles.value}>{category ? category.title : 'Emergency'}</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="calendar-month" size={24} color={TEXT_SECONDARY} style={styles.rowIcon} />
                            <View>
                                <Text style={styles.label}>Date & Time</Text>
                                <Text style={styles.value}>
                                    {new Date(encounter?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {", "}
                                    {new Date(encounter?.created_at || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.cardSection}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>Assessed Symptoms</Text>
                        <View style={styles.bulletList}>
                            {displaySymptoms.length > 0 ? (
                                displaySymptoms.map((symptom, idx) => (
                                    <View key={idx} style={styles.bulletItem}>
                                        <View style={styles.bullet} />
                                        <Text style={styles.bulletText}>{symptom}</Text>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.bulletItem}>
                                    <View style={styles.bullet} />
                                    <Text style={styles.bulletText}>No specific symptoms recorded</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={[styles.cardSection, { marginTop: 16 }]}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>Actions Taken</Text>
                        <View style={styles.bulletList}>
                            {/* Dynamic steps from category if available, otherwise sample */}
                            {category ? category.steps.slice(0, 3).map((step, idx) => (
                                <View key={idx} style={styles.bulletItem}>
                                    <View style={styles.bullet} />
                                    <Text style={styles.bulletText} numberOfLines={1}>{step.title}</Text>
                                </View>
                            )) : (
                                <View style={styles.bulletItem}>
                                    <View style={styles.bullet} />
                                    <Text style={styles.bulletText}>Completed emergency procedure</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* CTA Buttons (Sticky Bottom) */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShare}
                    activeOpacity={0.9}
                    disabled={!encounterId}
                >
                    <MaterialCommunityIcons name="export-variant" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.shareButtonText}>Share Report</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.homeButton} onPress={handleGoHome} activeOpacity={0.7}>
                    <Text style={styles.homeButtonText}>Go Home</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_LIGHT,
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 40 : 60,
        paddingBottom: 16,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BG_LIGHT,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEXT_LIGHT,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    heroIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(39, 174, 96, 0.1)', // green/10
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: TEXT_LIGHT,
        marginBottom: 12,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: TEXT_SECONDARY,
        textAlign: 'center',
    },
    card: {
        backgroundColor: CARD_LIGHT,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 16,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEXT_LIGHT,
        marginBottom: 16,
    },
    cardSection: {
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    rowIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: TEXT_SECONDARY,
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_LIGHT,
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb', // gray-200
        marginVertical: 16,
    },
    bulletList: {
        gap: 4,
    },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    bullet: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: TEXT_DARK,
        marginRight: 8,
        // list-disc style
    },
    bulletText: {
        fontSize: 16,
        color: TEXT_LIGHT,
        lineHeight: 24,
    },
    footer: {
        padding: 16,
        backgroundColor: BG_LIGHT,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 12,
    },
    shareButton: {
        backgroundColor: SUCCESS_COLOR,
        borderRadius: 12,
        height: 52, // slightly smaller than hero button
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    shareButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    homeButton: {
        backgroundColor: 'transparent',
        borderRadius: 12,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333333', // Dark border
    },
    homeButtonText: {
        color: '#333333',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
