import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const PRIMARY_COLOR = '#e53734';
const BG_LIGHT = '#f8f6f6';
const CARD_LIGHT = '#ffffff';
const TEXT_LIGHT = '#1b0e0e';
const TEXT_SECONDARY = '#6b5f5f';

export const AIAnalysisScreen = () => {
    const navigation = useNavigation<any>();
    const [image, setImage] = useState<string | null>(null);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <MaterialCommunityIcons name="chevron-left" size={28} color={TEXT_LIGHT} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI Analysis</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Headline & Status */}
                <View style={styles.headlineContainer}>
                    <View style={styles.headlineRow}>
                        <Text style={styles.headlineText}>Assess Injury</Text>
                        <View style={styles.offlineChip}>
                            <MaterialCommunityIcons name="wifi-off" size={16} color="#065f46" />
                            <Text style={styles.offlineText}>OFFLINE</Text>
                        </View>
                    </View>
                    <Text style={styles.subtext}>
                        Snap a photo of the affected area. Our offline AI will identify the injury and suggest immediate first aid steps.
                    </Text>
                </View>

                {/* Upload Area */}
                <View style={styles.uploadContainer}>
                    <TouchableOpacity
                        style={styles.uploadBox}
                        activeOpacity={0.8}
                        onPress={() => {
                            // Placeholder for image picker logic
                            console.log('Pick image');
                        }}
                    >
                        {/* Decorative background effect would be complex to replicate exactly, keeping it simple clean UI */}
                        <View style={styles.uploadIconCircle}>
                            <MaterialCommunityIcons name="camera-plus" size={40} color={PRIMARY_COLOR} />
                        </View>
                        <Text style={styles.uploadTitle}>No Image Selected</Text>
                        <Text style={styles.uploadSubtitle}>Tap to capture or upload</Text>
                    </TouchableOpacity>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.cameraButton}>
                            <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                            <Text style={styles.cameraButtonText}>Open Camera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.galleryButton}>
                            <MaterialCommunityIcons name="image" size={20} color={TEXT_LIGHT} />
                            <Text style={styles.galleryButtonText}>Select from Gallery</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Actions */}
                <View style={styles.bottomSection}>
                    <TouchableOpacity
                        style={[styles.analyzeButton, { opacity: 0.5 }]}
                        disabled={true}
                    >
                        <MaterialCommunityIcons name="auto-fix" size={24} color="#9ca3af" />
                        <Text style={styles.analyzeButtonText}>Analyze Image</Text>
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        AI analysis runs offline on your device. Always seek professional help for serious emergencies.
                    </Text>
                </View>
            </ScrollView>

            {/* Custom Bottom Nav Replica for this screen workflow if needed, 
                but usually we might just rely on the main tab bar or hide it.
                The design shows a specific nav. Implementing a simplified version.
            */}
            <View style={styles.bottomNav}>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('AIChat')}
                >
                    <MaterialCommunityIcons name="message-text-outline" size={24} color="#9ca3af" />
                    <Text style={styles.navText}>Chat</Text>
                </TouchableOpacity>

                <View style={styles.scanTabContainer}>
                    <TouchableOpacity style={styles.scanButton}>
                        <MaterialCommunityIcons name="line-scan" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.scanText}>Scan</Text>
                </View>

                <TouchableOpacity style={styles.navItem}>
                    <MaterialCommunityIcons name="book-open-variant" size={24} color="#9ca3af" />
                    <Text style={styles.navText}>Guides</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(248, 246, 246, 0.95)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_LIGHT,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 100,
    },
    headlineContainer: {
        marginBottom: 24,
    },
    headlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headlineText: {
        fontSize: 28,
        fontWeight: '700',
        color: TEXT_LIGHT,
    },
    offlineChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d1fae5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    offlineText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#065f46',
        letterSpacing: 0.5,
    },
    subtext: {
        fontSize: 16,
        color: TEXT_SECONDARY,
        lineHeight: 24,
    },
    uploadContainer: {
        flex: 1,
        marginBottom: 32,
    },
    uploadBox: {
        width: '100%',
        minHeight: 340,
        borderWidth: 2,
        borderColor: '#e6d1d0',
        borderStyle: 'dashed',
        borderRadius: 12,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        marginBottom: 24,
    },
    uploadIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(229, 55, 52, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    uploadTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_LIGHT,
        marginBottom: 4,
    },
    uploadSubtitle: {
        fontSize: 14,
        color: '#71717a',
    },
    actionButtons: {
        gap: 12,
        width: '100%',
        maxWidth: 260,
        alignSelf: 'center',
    },
    cameraButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: PRIMARY_COLOR,
        height: 48,
        borderRadius: 8,
        gap: 8,
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    cameraButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    galleryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        height: 48,
        borderRadius: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    galleryButtonText: {
        color: TEXT_LIGHT,
        fontSize: 14,
        fontWeight: '700',
    },
    bottomSection: {
        gap: 16,
    },
    analyzeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        height: 56,
        borderRadius: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    analyzeButtonText: {
        color: '#9ca3af',
        fontSize: 18,
        fontWeight: '700',
    },
    disclaimer: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 300,
        alignSelf: 'center',
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 80,
        paddingBottom: 20,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 64,
    },
    navText: {
        fontSize: 10,
        fontWeight: '500',
        color: '#9ca3af',
        marginTop: 4,
    },
    scanTabContainer: {
        position: 'relative',
        top: -24,
        alignItems: 'center',
    },
    scanButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: PRIMARY_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: BG_LIGHT,
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    scanText: {
        fontSize: 10,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginTop: 4,
    },
});
