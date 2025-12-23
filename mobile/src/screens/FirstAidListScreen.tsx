import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import firstAidData from '../content/first-aid-content.json';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { ScreenWrapper } from '../components/ScreenWrapper';

const ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    'blood-bag': 'water',
    'fire': 'fire',
    'breathe': 'weather-windy',
    'heart-pulse': 'heart-pulse',
    'bone': 'bone',
    'account-alert': 'alert-circle',
};

export const FirstAidListScreen = () => {
    const navigation = useNavigation<any>();

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
            <Text style={styles.categoryText}>{item.title}</Text>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>First Aid Guide</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={firstAidData.categories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 40) + 10 : 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: COLORS.white,
        ...SHADOWS.light,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    listContent: {
        padding: 16,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    categoryCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        width: '48%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.medium,
        shadowOpacity: 0.1,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        gap: 12,
    },
    catIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F2F8FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
