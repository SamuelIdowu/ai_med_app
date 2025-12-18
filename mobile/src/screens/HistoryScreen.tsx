import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBar } from '../components/BottomTabBar';

const BG_LIGHT = '#f8f6f6';
const CARD_LIGHT = '#ffffff';
const TEXT_LIGHT = '#1b0e0e';
const TEXT_SECONDARY = '#6b5f5f';

// Mock Data matching the design
const MOCK_DATA = [
    {
        title: 'RECENT',
        data: [
            {
                id: '1',
                title: 'Bleeding Incident',
                subtitle: 'Guidance Completed',
                date: '2 hrs ago',
                icon: 'water', // blood-bag in map
                iconColor: '#e53734',
                iconBg: '#ffe5e5',
            },
            {
                id: '2',
                title: 'Report Shared',
                subtitle: 'Sent to Dr. Smith',
                date: 'Yesterday',
                icon: 'share-variant',
                iconColor: '#2b6cb0', // Blueish
                iconBg: '#e5f0ff',
            }
        ]
    },
    {
        title: 'LAST WEEK',
        data: [
            {
                id: '3',
                title: 'Burn Treatment',
                subtitle: 'Severity: Moderate',
                date: 'Oct 15',
                icon: 'fire',
                iconColor: '#dd6b20', // Orange
                iconBg: '#fff0e5',
            },
            {
                id: '4',
                title: 'Injury Photo Upload',
                subtitle: '3 Images added',
                date: 'Oct 12',
                icon: 'camera',
                iconColor: '#4a5568', // Gray
                iconBg: '#f0f2f5',
            }
        ]
    },
    {
        title: 'OLDER',
        data: [
            {
                id: '5',
                title: 'CPR Training',
                subtitle: 'Practice Session',
                date: 'Sep 28',
                icon: 'heart-pulse',
                iconColor: '#38a169', // Green
                iconBg: '#e6fffa',
            }
        ]
    }
];

export const HistoryScreen = () => {
    // In a real app we'd fetch from EncounterService

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                <MaterialCommunityIcons name={item.icon} size={24} color={item.iconColor} />
            </View>
            <View style={styles.textContainer}>
                <View style={styles.row}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.dateText}>{item.date}</Text>
                </View>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#bdc3c7" />
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>History of Events</Text>
                <TouchableOpacity style={styles.filterButton}>
                    <MaterialCommunityIcons name="filter-variant" size={24} color={TEXT_LIGHT} />
                </TouchableOpacity>
            </View>

            <SectionList
                sections={MOCK_DATA}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
            />

            {/* Bottom Navigation */}
            <BottomTabBar activeRoute="History" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_LIGHT,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: BG_LIGHT,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: TEXT_LIGHT,
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100, // Space for bottom bar
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_SECONDARY,
        marginTop: 20,
        marginBottom: 10,
        letterSpacing: 1,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD_LIGHT,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_LIGHT,
    },
    dateText: {
        fontSize: 12,
        color: TEXT_SECONDARY,
    },
    itemSubtitle: {
        fontSize: 14,
        color: TEXT_SECONDARY,
    },
});
