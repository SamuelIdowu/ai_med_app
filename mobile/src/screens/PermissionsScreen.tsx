import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

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
            <StatusBar barStyle="dark-content" backgroundColor="#F8F6F6" />

            {/* Top App Bar */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Welcome')}
                    style={styles.iconButton}
                >
                    <MaterialCommunityIcons name="chevron-left" size={32} color="#1B0E0E" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Consent & Permissions</Text>
                <View style={styles.iconButton} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Text */}
                <View style={styles.heroSection}>
                    <View style={styles.heroIconContainer}>
                        <MaterialIcons name="health-and-safety" size={40} color="#E53734" />
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
                                trackColor={{ false: '#F3E8E8', true: '#E53734' }}
                                thumbColor={'#FFFFFF'}
                                ios_backgroundColor="#F3E8E8"
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
                                trackColor={{ false: '#F3E8E8', true: '#E53734' }}
                                thumbColor={'#FFFFFF'}
                                ios_backgroundColor="#F3E8E8"
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
                                trackColor={{ false: '#F3E8E8', true: '#E53734' }}
                                thumbColor={'#FFFFFF'}
                                ios_backgroundColor="#F3E8E8"
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
        backgroundColor: '#F8F6F6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(248, 246, 246, 0.8)',
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
        color: '#1B0E0E',
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
        borderRadius: 32, // rounded-full
        backgroundColor: 'rgba(229, 55, 52, 0.1)', // bg-primary/10
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1B0E0E',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 38,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#96504F', // text-subtle-light
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 300,
    },
    listContainer: {
        gap: 12, // Gap between cards
    },
    card: {
        backgroundColor: '#FFFFFF', // bg-card-light
        borderRadius: 12, // rounded-xl
        borderWidth: 1,
        borderColor: '#E6D1D0', // border-card-border-light
        padding: 20,
        marginBottom: 12, // fallback for gap
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
        color: '#1B0E0E',
        marginBottom: 6,
        lineHeight: 20,
    },
    cardDescription: {
        fontSize: 14,
        color: '#96504F', // text-subtle-light
        lineHeight: 20,
    },
    footer: {
        padding: 16,
        backgroundColor: '#F8F6F6',
        paddingBottom: 24,
    },
    primaryButton: {
        backgroundColor: '#E53734',
        height: 56, // h-14
        borderRadius: 12, // rounded-xl
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#E53734',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
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
        color: '#96504F', // text-subtle-light
        lineHeight: 18,
    },
    linkText: {
        color: '#E53734',
        textDecorationLine: 'underline',
        fontWeight: '500',
    }
});
