
import { Icon } from '../components/Icon';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PhotoAnalysisMode } from '../types/photoAnalysis';
import { theme } from '../theme';

const BG_LIGHT = theme.colors.canvas.background;
const PRIMARY_COLOR = theme.colors.primary.main;
const TEXT_DARK = theme.colors.text.primary;
const TEXT_SECONDARY = theme.colors.text.secondary;
const SURFACE_COLOR = theme.colors.canvas.surface;

export const PhotoPreviewScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { photoUri } = route.params || {};
    const [consent, setConsent] = useState(true);
    const [mode, setMode] = useState<PhotoAnalysisMode>('auto');

    const handleSave = () => {
        if (!photoUri) {
            Alert.alert('No Photo', 'Please retake the photo before continuing.');
            return;
        }
        if (!consent) {
            Alert.alert("Consent Required", "Please provide consent to proceed with clinical photo analysis.");
            return;
        }
        navigation.navigate('AIAnalysis', { photoUri, mode });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="caretLeft" size={24} color={TEXT_DARK} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Review Photo</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Main Content */}
                <View style={styles.content}>
                    <View style={styles.imageContainer}>
                        {photoUri ? (
                            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
                        ) : (
                            <View style={[styles.previewImage, { backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text>No Image Captured</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.modeSection}>
                        <Text style={styles.modeLabel}>Analysis mode</Text>
                        <View style={styles.modeRow}>
                            {([
                                { id: 'auto', label: 'Auto' },
                                { id: 'wound', label: 'Wound CV' },
                                { id: 'general', label: 'General AI' },
                            ] as Array<{ id: PhotoAnalysisMode; label: string }>).map((option) => {
                                const selected = mode === option.id;
                                return (
                                    <TouchableOpacity
                                        key={option.id}
                                        style={[styles.modeChip, selected && styles.modeChipSelected]}
                                        onPress={() => setMode(option.id)}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[styles.modeChipText, selected && styles.modeChipTextSelected]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <Text style={styles.captureTips}>
                            Use bright, even light. Keep the entire injury in frame and hold the phone steady.
                        </Text>
                    </View>

                    {/* Consent Section */}
                    <View style={styles.consentContainer}>
                        <View style={styles.consentLeft}>
                            <View style={styles.shieldIconContainer}>
                                <Icon name="gear" size={24} color={TEXT_DARK} />
                            </View>
                            <Text style={styles.consentText}>I consent to secure AI analysis of this image and saving the result to my history.</Text>
                        </View>
                        <Switch
                            trackColor={{ false: "#cbd5e1", true: PRIMARY_COLOR }}
                            thumbColor={"#ffffff"}
                            ios_backgroundColor="#cbd5e1"
                            onValueChange={setConsent}
                            value={consent}
                        />
                    </View>
                </View>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Analyze Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.retakeButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.retakeButtonText}>Retake</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: BG_LIGHT,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        flex: 1,
        backgroundColor: BG_LIGHT,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: BG_LIGHT,
    },
    backButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: TEXT_DARK,
        textAlign: 'center',
    },
    placeholder: {
        width: 48,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    imageContainer: {
        flex: 1,
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    modeSection: {
        marginBottom: 8,
    },
    modeLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT_SECONDARY,
        marginBottom: 8,
    },
    modeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    modeChip: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.canvas.border,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: SURFACE_COLOR,
    },
    modeChipSelected: {
        backgroundColor: '#0F1115',
        borderColor: '#0F1115',
    },
    modeChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    modeChipTextSelected: {
        color: '#fff',
    },
    captureTips: {
        fontSize: 12,
        lineHeight: 18,
        color: TEXT_SECONDARY,
        marginTop: 8,
    },
    consentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        backgroundColor: BG_LIGHT,
    },
    consentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 16,
    },
    shieldIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.primary.light,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    consentText: {
        fontSize: 15,
        color: TEXT_SECONDARY,
        flex: 1,
    },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 0 : 24,
        gap: 12,
        alignItems: 'center',
    },
    saveButton: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: PRIMARY_COLOR,
        height: 56,
        borderRadius: theme.spatial.radii.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.spatial.shadows3d.level2,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    retakeButton: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: SURFACE_COLOR,
        height: 56,
        borderRadius: theme.spatial.radii.pill,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.canvas.border,
    },
    retakeButtonText: {
        color: TEXT_DARK,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
