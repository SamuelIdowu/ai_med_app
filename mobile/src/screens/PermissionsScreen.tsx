import { Icon } from '../components/Icon';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';

export const PermissionsScreen = () => {
    const navigation = useNavigation<any>();

    // State for toggles
    const [anonymousData, setAnonymousData] = useState(true);
    const [cameraAccess, setCameraAccess] = useState(true);
    const [reportSharing, setReportSharing] = useState(false);

    const handleAgree = () => {
        navigation.navigate('CreateProfile');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.canvas.background} />

            {/* Top App Bar */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Welcome')}
                    style={styles.iconButton}
                >
                    <Icon name="caretLeft" size={32} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Consent & Permissions</Text>
                <View style={styles.iconButton} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Text */}
                <View style={styles.heroSection}>
                    <View style={styles.heroIconContainer}>
                        <Icon name="shieldCheck" size={40} color={theme.colors.primary.main} />
                    </View>
                    <Text style={styles.heroTitle}>Your Privacy Matters</Text>
                    <Text style={styles.heroSubtitle}>
                        To provide effective emergency guidance, we need your consent for the following.
                    </Text>
                </View>

                {/* Permissions List */}
                <View style={styles.listContainer}>
                    {/* Anonymous Data Usage */}
                    <View style={styles.card}>
                        <View style={styles.cardContent}>
                            <View style={styles.textContainer}>
                                <Text style={styles.cardTitle}>Anonymous Data Usage</Text>
                                <Text style={styles.cardDescription}>
                                    We use anonymized data to improve our AI model and overall app performance. Your personal information is never collected.
                                </Text>
                            </View>
                            <Switch
                                value={anonymousData}
                                onValueChange={setAnonymousData}
                                trackColor={{ false: theme.colors.canvas.subtle, true: theme.colors.primary.main }}
                                thumbColor={'#FFFFFF'}
                                ios_backgroundColor={theme.colors.canvas.subtle}
                            />
                        </View>
                    </View>

                    {/* Camera & Photos Access */}
                    <View style={styles.card}>
                        <View style={styles.cardContent}>
                            <View style={styles.textContainer}>
                                <Text style={styles.cardTitle}>Camera & Photos Access</Text>
                                <Text style={styles.cardDescription}>
                                    Allow the app to access your camera to analyze injuries from photos for better, real-time guidance.
                                </Text>
                            </View>
                            <Switch
                                value={cameraAccess}
                                onValueChange={setCameraAccess}
                                trackColor={{ false: theme.colors.canvas.subtle, true: theme.colors.primary.main }}
                                thumbColor={'#FFFFFF'}
                                ios_backgroundColor={theme.colors.canvas.subtle}
                            />
                        </View>
                    </View>

                    {/* Emergency Report Sharing */}
                    <View style={styles.card}>
                        <View style={styles.cardContent}>
                            <View style={styles.textContainer}>
                                <Text style={styles.cardTitle}>Emergency Report Sharing</Text>
                                <Text style={styles.cardDescription}>
                                    Optionally share generated incident reports with your emergency contacts or first responders.
                                </Text>
                            </View>
                            <Switch
                                value={reportSharing}
                                onValueChange={setReportSharing}
                                trackColor={{ false: theme.colors.canvas.subtle, true: theme.colors.primary.main }}
                                thumbColor={'#FFFFFF'}
                                ios_backgroundColor={theme.colors.canvas.subtle}
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Footer with CTA */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleAgree}
                    activeOpacity={0.8}
                >
                    <Text style={styles.primaryButtonText}>I Agree & Continue</Text>
                </TouchableOpacity>

                <Text style={styles.legalText}>
                    By continuing, you agree to our{'\n'}
                    <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.canvas.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        textAlign: 'center',
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    heroIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary.light,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.palette.blissfulBlue,
        ...theme.spatial.shadows3d.level1,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 38,
    },
    heroSubtitle: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 300,
    },
    listContainer: {
        gap: 12,
    },
    card: {
        backgroundColor: theme.colors.canvas.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.canvas.border,
        padding: 20,
        marginBottom: 12,
        ...theme.spatial.shadows3d.level1,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    textContainer: {
        flex: 1,
        paddingRight: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 6,
        lineHeight: 20,
    },
    cardDescription: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        lineHeight: 20,
    },
    footer: {
        padding: 16,
        backgroundColor: theme.colors.canvas.background,
        paddingBottom: 24,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary.main,
        height: 56,
        borderRadius: theme.spatial.radii.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.spatial.shadows3d.level2,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    legalText: {
        marginTop: 16,
        textAlign: 'center',
        fontSize: 12,
        color: theme.colors.text.muted,
        lineHeight: 18,
    },
    linkText: {
        color: theme.colors.primary.main,
        textDecorationLine: 'underline',
        fontWeight: '600',
    }
});
