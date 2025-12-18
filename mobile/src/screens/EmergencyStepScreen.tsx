
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import firstAidData from '../content/first-aid-content.json';
import { EncounterService } from '../services/encounterService';

const PRIMARY_COLOR = '#e53734';
const BG_LIGHT = '#f8f6f6';
const CARD_LIGHT = '#ffffff';
const TEXT_LIGHT = '#0f172a'; // slate-900
const TEXT_SECONDARY = '#334155'; // slate-700
const TEXT_MUTED = '#475569'; // slate-600

type RootStackParamList = {
    EmergencySteps: { categoryId: string };
    EmergencySummary: { categoryId: string };
};

// Design-spec mapping for icons (reused from Home, ideally shared in utils)
const ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    'blood-bag': 'water',
    'fire': 'fire',
    'breathe': 'weather-windy',
    'heart-pulse': 'heart-pulse',
    'bone': 'bone',
    'account-alert': 'alert-circle',
};

type EmergencyStepsRouteProp = RouteProp<RootStackParamList, 'EmergencySteps'>;

export const EmergencyStepScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<EmergencyStepsRouteProp>();
    const { categoryId } = route.params;

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const category = firstAidData.categories.find(c => c.id === categoryId);

    if (!category) {
        return (
            <View style={styles.container}>
                <Text>Category not found</Text>
            </View>
        );
    }

    const steps = category.steps;
    const currentStep = steps[currentStepIndex];
    const totalSteps = steps.length;
    // Calculation: 20% for 1 of 5. ((index + 1) / total) * 100
    const progress = ((currentStepIndex + 1) / totalSteps) * 100;

    const getIconName = (originalIcon: string) => {
        return ICON_MAP[originalIcon] || 'medical-bag';
    };

    // Specific icon for the step view large icon. Content.json doesn't have per-step icons, uses category icon.
    // Design shows 'compress' symbol for bleeding. We might need a mapping or just use category icon.
    // For now, using category icon is safer.

    const handleNext = async () => {
        if (currentStepIndex < totalSteps - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            try {
                const encounterId = await EncounterService.createEncounter(
                    category.title,
                    `Completed emergency guide for ${category.title}`,
                    []
                );
                navigation.navigate('EmergencySummary', { categoryId, encounterId });
            } catch (error) {
                console.error('Failed to create encounter', error);
                navigation.navigate('EmergencySummary', { categoryId, encounterId: 'temp_id' });
            }
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" backgroundColor={BG_LIGHT} />

            {/* Top App Bar */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <MaterialCommunityIcons name="chevron-left" size={32} color={TEXT_LIGHT} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{category.title}</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.mainContent}>
                {/* Progress Bar */}
                <View style={styles.progressSection}>
                    <View style={styles.stepLabelContainer}>
                        <Text style={styles.stepLabel}>Step {currentStepIndex + 1} of {totalSteps}</Text>
                    </View>
                    <View style={styles.track}>
                        <View style={[styles.bar, { width: `${progress}%` }]} />
                    </View>
                </View>

                {/* Instruction Card */}
                <View style={styles.cardContainer}>
                    <View style={styles.card}>
                        <View style={styles.iconWrapper}>
                            <View style={styles.iconCircle}>
                                <MaterialCommunityIcons name={getIconName(category.icon)} size={72} color={PRIMARY_COLOR} />
                            </View>
                        </View>

                        <View style={styles.textWrapper}>
                            <Text style={styles.stepTitle}>{currentStep.title}</Text>

                            {/* Content formatting: Split by newline if present to mimic the list in design */}
                            {/* Design has:
                                1. Place a clean cloth...
                                2. Press firmly...
                            */}
                            {/* Assuming content is a string. We can try to format it if it has newlines, or just display it. */}
                            <Text style={styles.stepDescription}>
                                {currentStep.content}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Button Group (Sticky Bottom) */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.9}>
                    <Text style={styles.nextButtonText}>
                        {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next Step'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sosButton} onPress={() => { /* Call Logic */ }} activeOpacity={0.7}>
                    <Text style={styles.sosButtonText}>Call Emergency Services</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? 40 : 60,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: BG_LIGHT,
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_LIGHT,
        textAlign: 'center',
        flex: 1,
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 16,
        flexDirection: 'column',
    },
    progressSection: {
        paddingVertical: 16,
        gap: 12,
    },
    stepLabelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: TEXT_SECONDARY,
    },
    track: {
        height: 8,
        backgroundColor: 'rgba(229, 55, 52, 0.2)', // primary/20
        borderRadius: 9999,
        width: '100%',
    },
    bar: {
        height: 8,
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 9999,
    },
    cardContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
    },
    card: {
        width: '100%',
        backgroundColor: CARD_LIGHT,
        borderRadius: 12,
        padding: 24,
        alignItems: 'stretch',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
        minHeight: 320,
    },
    iconWrapper: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 8,
    },
    iconCircle: {
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: 'rgba(229, 55, 52, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textWrapper: {
        gap: 8,
        alignItems: 'center',
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: TEXT_LIGHT,
        textAlign: 'center',
        marginBottom: 8,
    },
    stepDescription: {
        fontSize: 16,
        fontWeight: '400',
        color: TEXT_MUTED,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        padding: 16,
        paddingTop: 16,
        backgroundColor: BG_LIGHT,
        gap: 12,
        borderTopWidth: 0,
    },
    nextButton: {
        backgroundColor: PRIMARY_COLOR,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    sosButton: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    sosButtonText: {
        color: PRIMARY_COLOR,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
