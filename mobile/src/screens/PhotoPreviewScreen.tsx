
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BG_LIGHT = '#fbf8f8';
const PRIMARY_COLOR = '#e53734';
const TEXT_DARK = '#0f172a'; // slate-900 like
const TEXT_SECONDARY = '#1e293b'; // slate-800 like
const SURFACE_COLOR = '#e2e8f0'; // slate-200 like

export const PhotoPreviewScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { photoUri } = route.params || {};
    const [consent, setConsent] = useState(true);

    const handleSave = () => {
        if (!consent) {
            alert("Please provide consent to proceed.");
            return;
        }
        // Logic to save/upload specific encounter photo would go here
        // For now, assume success and maybe go back to home or next step
        console.log("Saving photo:", photoUri);
        // navigation.navigate('ShareReportPreview'); // Next flow? Or back to Home? 
        // Based on flow, it seems to go to Share Report or Emergency Summary if part of flow
        // For now, let's just go back to Home or previous screen
        navigation.popToTop();
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
                        <MaterialIcons name="arrow-back-ios" size={24} color={TEXT_DARK} />
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

                    {/* Consent Section */}
                    <View style={styles.consentContainer}>
                        <View style={styles.consentLeft}>
                            <View style={styles.shieldIconContainer}>
                                <MaterialIcons name="admin-panel-settings" size={24} color={TEXT_DARK} />
                            </View>
                            <Text style={styles.consentText}>I consent to include this image in my emergency report.</Text>
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
                        <Text style={styles.saveButtonText}>Save Photo</Text>
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
        borderRadius: 8,
        backgroundColor: '#e2e8f0', // slate-200
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    consentText: {
        fontSize: 16,
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
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    retakeButton: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: SURFACE_COLOR, // slate-200
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    retakeButtonText: {
        color: TEXT_DARK,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
