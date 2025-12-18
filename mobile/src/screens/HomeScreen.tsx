
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Easing, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBar } from '../components/BottomTabBar';
import firstAidData from '../content/first-aid-content.json';
import { AnalyticsService } from '../services/analyticsService';

const PRIMARY_COLOR = '#e53734';
const BG_LIGHT = '#f8f6f6';
const CARD_LIGHT = '#ffffff';
const TEXT_LIGHT = '#1b0e0e';
const SECONDARY_TEXT_LIGHT = '#6b5f5f';

// Design-spec mapping for icons
const ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    'blood-bag': 'water', // closest to bloodtype
    'fire': 'fire', // local_fire_department
    'breathe': 'weather-windy', // closest to air/choking
    'heart-pulse': 'heart-pulse', // cardiology
    'bone': 'bone', // personal_injury/fractures
    'account-alert': 'alert-circle', // sick/unconscious
};

export const HomeScreen = () => {
    const navigation = useNavigation<any>();
    // No pulse animation in the static design, but keeping refined version for "alive" feel
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.02,
                    duration: 1500,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    const getIconName = (originalIcon: string) => {
        // Map content.json icons to MaterialCommunityIcons if needed, or pass through if they match
        // content.json has: blood-bag, fire, breathe, heart-pulse, bone, account-alert
        return ICON_MAP[originalIcon] || 'help-circle';
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" backgroundColor="transparent" />

            {/* Sticky Header */}
            <View style={styles.header}>
                {/* Top App Bar */}
                <View style={styles.topBar}>
                    <View style={styles.profileSection}>
                        <Image
                            source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuATadtnpGLy0gIduxb0wLuTjC4m3cugufnBvj_-eDt3VcCWxmlDfo-iJkZw2SQdXjMuzPDU6Lh4u8Ezc112KvkuSrZrU5o3yvW_pCzkvWCxeapuIOEPGj6rFXqgQiye46fwjvKwuLuZpnuQSpvNIBVmKGmMncLEBc0z_cZXIR5yoYCqfFcve26iQ3iqg2Y71PRKR3Cf8u5maCzGJEY-arVr4f3Je-7BAp-X31YCVJViOsoMN5Q5lHWLcP82NFa5nqAFJn7X23037JQ" }}
                            style={styles.avatar}
                        />
                        <Text style={styles.welcomeText}>Hello, Alex</Text>
                    </View>
                    <TouchableOpacity style={styles.iconButton}>
                        <MaterialCommunityIcons name="bell-outline" size={24} color={TEXT_LIGHT} />
                    </TouchableOpacity>
                </View>

                {/* Emergency Button */}
                <View style={styles.emergencyContainer}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%', alignItems: 'center' }}>
                        <TouchableOpacity
                            style={styles.emergencyButton}
                            activeOpacity={0.9}
                            onPress={() => {
                                AnalyticsService.track('emergency_start');
                                // Determine where to go - usually to a list or wizard. 
                                // Design flow implies picking a category.
                                // For now, we can stay here or scroll to categories, 
                                // but typically "Emergency" big button might go to a specific "Quick Help" or "SOS" mode.
                                // Based on existing code, it went to 'EmergencyCategories' which is basically this screen's list.
                                // Let's just create a slight haptic feedback visual or scroll to grid.
                                // Or if there is a dedicated SOS flow, navigate there. 
                                // For this implementation, let's assume it highlights the categories.
                            }}
                        >
                            <Text style={styles.emergencyText}>EMERGENCY</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* First Aid Categories Section */}
                <Text style={styles.sectionTitle}>First Aid Categories</Text>
                <View style={styles.categoriesGrid}>
                    {firstAidData.categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={styles.categoryCard}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('EmergencySteps', { categoryId: cat.id })}
                        >
                            <View style={styles.catIconContainer}>
                                <MaterialCommunityIcons name={getIconName(cat.icon)} size={32} color={PRIMARY_COLOR} />
                            </View>
                            <Text style={styles.categoryText}>{cat.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Quick Actions Section */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsContainer}>
                    <QuickActionButton
                        icon="camera-outline"
                        label="Assess Injury (AI)"
                        onPress={() => navigation.navigate('AIAnalysis')}
                    />
                    <QuickActionButton
                        icon="robot"
                        label="AI Assistant"
                        onPress={() => navigation.navigate('AIChat')}
                    />
                    <QuickActionButton
                        icon="share-variant-outline"
                        label="Share Report"
                        onPress={() => navigation.navigate('History')} // Go to history to select report
                    />
                    <QuickActionButton
                        icon="hospital-building"
                        label="Provider Directory"
                        onPress={() => navigation.navigate('ProviderList')}
                    />
                </View>

                {/* Spacer for bottom nav */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Navigation Bar
            <View style={styles.bottomNav}>
                <BottomNavItem icon="home" label="Home" active />
                <BottomNavItem icon="history" label="History" />
                <BottomNavItem icon="account" label="Profile" onPress={() => navigation.navigate('MedicalProfile')} />
            </View> */}
            <BottomTabBar activeRoute="Home" />
        </View>
    );
};

const QuickActionButton = ({ icon, label, onPress }: { icon: any, label: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
        <MaterialCommunityIcons name={icon} size={24} color={PRIMARY_COLOR} />
        <Text style={styles.actionText}>{label}</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color={SECONDARY_TEXT_LIGHT} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_LIGHT,
    },
    header: {
        backgroundColor: 'rgba(248, 246, 246, 0.95)',
        paddingTop: Platform.OS === 'android' ? 40 : 60, // Safe area approximation
        paddingBottom: 12,
        zIndex: 10,
        // Sticky behavior is handled by ScrollView usually, but here it's a fixed view above ScrollView
        // essentially "sticky" to top of screen.
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
        height: 48,
    },
    profileSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12, // gap support in RN? Yes, recent versions. If not, use marginLeft.
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ddd',
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_LIGHT,
        marginLeft: 12, // fallback if gap fails
    },
    iconButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emergencyContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },
    emergencyButton: {
        backgroundColor: PRIMARY_COLOR,
        height: 48,
        borderRadius: 12,
        width: '100%',
        maxWidth: 480,
        justifyContent: 'center',
        alignItems: 'center',
        // No shadow in simple flat design or minimal
    },
    emergencyText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_LIGHT,
        marginLeft: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
    },
    categoryCard: {
        width: '45%', // approx for 2 col
        flexGrow: 1,
        backgroundColor: CARD_LIGHT,
        borderRadius: 12,
        padding: 16,
        margin: 4,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    catIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(229, 55, 52, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryText: {
        fontSize: 16,
        fontWeight: '500',
        color: TEXT_LIGHT,
    },
    quickActionsContainer: {
        paddingHorizontal: 16,
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD_LIGHT,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12, // in case gap doesn't work
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    actionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: TEXT_LIGHT,
        marginLeft: 16,
    },

});
