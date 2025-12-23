import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Easing, FlatList, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBar } from '../components/BottomTabBar';
import firstAidData from '../content/first-aid-content.json';
import { AnalyticsService } from '../services/analyticsService';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { MedicalProfileService, MedicalProfile } from '../services/medicalProfileService';

const ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    'blood-bag': 'water',
    'fire': 'fire',
    'breathe': 'weather-windy',
    'heart-pulse': 'heart-pulse',
    'bone': 'bone',
    'account-alert': 'alert-circle',
};

export const HomeScreen = () => {
    const navigation = useNavigation<any>();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [profile, setProfile] = React.useState<MedicalProfile | null>(null);

    useEffect(() => {
        loadProfile();
        // Add listener to reload profile when screen comes into focus
        const unsubscribe = navigation.addListener('focus', () => {
            loadProfile();
        });
        return unsubscribe;
    }, [navigation]);

    const loadProfile = async () => {
        const data = await MedicalProfileService.getProfile();
        setProfile(data);
    };

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
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
        return ICON_MAP[originalIcon] || 'help-circle';
    };

    const renderCategoryItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.categoryCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EmergencySteps', { categoryId: item.id })}
        >
            <View style={styles.catIconContainer}>
                <MaterialCommunityIcons name={getIconName(item.icon)} size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.categoryText} numberOfLines={2}>{item.title}</Text>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper>

            {/* Enhanced Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.profileContainer}>
                        <Image
                            source={{ uri: profile?.photoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuATadtnpGLy0gIduxb0wLuTjC4m3cugufnBvj_-eDt3VcCWxmlDfo-iJkZw2SQdXjMuzPDU6Lh4u8Ezc112KvkuSrZrU5o3yvW_pCzkvWCxeapuIOEPGj6rFXqgQiye46fwjvKwuLuZpnuQSpvNIBVmKGmMncLEBc0z_cZXIR5yoYCqfFcve26iQ3iqg2Y71PRKR3Cf8u5maCzGJEY-arVr4f3Je-7BAp-X31YCVJViOsoMN5Q5lHWLcP82NFa5nqAFJn7X23037JQ" }}
                            style={styles.avatar}
                        />
                        <View style={styles.greetingTextContainer}>
                            <Text style={styles.greetingSub}>Welcome back,</Text>
                            <Text style={styles.greetingName}>{profile?.fullName || 'User'}</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            style={styles.notificationButton}
                            onPress={() => navigation.navigate('Settings')}
                        >
                            <MaterialCommunityIcons name="cog-outline" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.notificationButton}
                            onPress={() => navigation.navigate('Notifications')}
                        >
                            <MaterialCommunityIcons name="bell-badge-outline" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Prominent Emergency Button */}
                <View style={styles.emergencyWrapper}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
                        <TouchableOpacity
                            style={styles.emergencyButton}
                            activeOpacity={0.9}
                            onPress={() => {
                                AnalyticsService.track('emergency_start');
                            }}
                        >
                            <View style={styles.emergencyBtnContent}>
                                <MaterialCommunityIcons name="alert-octagon" size={28} color={COLORS.white} />
                                <Text style={styles.emergencyText}>EMERGENCY HELP</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>

            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Horizontal First Aid Categories */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>First Aid Guide</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('FirstAidList')}>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={firstAidData.categories}
                    renderItem={renderCategoryItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesList}
                />

                {/* Quick Services */}
                <Text style={[styles.sectionTitle, { marginTop: 24, marginLeft: 20 }]}>Quick Services</Text>
                <View style={styles.actionsGrid}>
                    <QuickActionButton
                        icon="file-document-outline"
                        label="History & Reports"
                        subLabel="View past logs"
                        onPress={() => navigation.navigate('History')}
                        color="#4A90E2"
                    />
                    <QuickActionButton
                        icon="hospital-marker"
                        label="Find Providers"
                        subLabel="Connect with doctors"
                        onPress={() => navigation.navigate('ProviderList')}
                        color="#50C878"
                    />
                </View>

                {/* Daily Tip Card */}
                <View style={styles.tipCard}>
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#FFA500" />
                    <View style={styles.tipContent}>
                        <Text style={styles.tipTitle}>Daily Health Tip</Text>
                        <Text style={styles.tipText}>Stay hydrated! Drinking water helps maintain the balance of body fluids.</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <BottomTabBar activeRoute="Home" />
        </ScreenWrapper>
    );
};

const QuickActionButton = ({ icon, label, subLabel, onPress, color }: any) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.actionIconBox, { backgroundColor: (color || COLORS.primary) + '20' }]}>
            <MaterialCommunityIcons name={icon} size={28} color={color || COLORS.primary} />
        </View>
        <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>{label}</Text>
            <Text style={styles.actionSubLabel}>{subLabel}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.gray} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.white,
        paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 40) + 10 : 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        ...SHADOWS.light,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    greetingTextContainer: {
        marginLeft: 12,
    },
    greetingSub: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    greetingName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    notificationButton: {
        padding: 10,
        backgroundColor: COLORS.inputBackground,
        borderRadius: 12,
    },
    emergencyWrapper: {
        alignItems: 'center',
    },
    emergencyButton: {
        backgroundColor: '#FF3B30',
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 24,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    emergencyBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    emergencyText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 24,
        paddingBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    seeAllText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    categoriesList: {
        paddingHorizontal: 14,
        paddingBottom: 10,
    },
    categoryCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 6,
        width: 120,
        height: 140,
        alignItems: 'center',
        justifyContent: 'space-between',
        ...SHADOWS.medium,
        shadowOpacity: 0.1,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    catIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F2F8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textPrimary,
        textAlign: 'center',
        lineHeight: 18,
    },
    actionsGrid: {
        paddingHorizontal: 20,
        marginTop: 12,
        gap: 12,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 16,
        ...SHADOWS.light,
        marginBottom: 8,
    },
    actionIconBox: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionInfo: {
        flex: 1,
    },
    actionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    actionSubLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    tipCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF8E1',
        marginHorizontal: 20,
        marginTop: 24,
        padding: 20,
        borderRadius: 20,
        alignItems: 'flex-start',
        gap: 12,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    tipContent: {
        flex: 1,
    },
    tipTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#E65100',
        marginBottom: 4,
    },
    tipText: {
        fontSize: 13,
        color: '#5D4037',
        lineHeight: 19,
    },
});
