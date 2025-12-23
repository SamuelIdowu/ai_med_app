import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabBar } from '../components/BottomTabBar';

const BG_LIGHT = '#f8f6f6';
const CARD_LIGHT = '#ffffff';
const TEXT_LIGHT = '#1b0e0e';
const TEXT_SECONDARY = '#6b5f5f';
const PRIMARY_COLOR = '#e53734';

export const AIToolsScreen = () => {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>AI Tools</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.sectionDescription}>
                        Powered by offline AI models to assist you in emergencies.
                    </Text>

                    <View style={styles.toolsGrid}>
                        <TouchableOpacity
                            style={styles.toolCard}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('AIAnalysis')}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(229, 55, 52, 0.1)' }]}>
                                <MaterialCommunityIcons name="camera-outline" size={32} color={PRIMARY_COLOR} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.toolTitle}>Assess Injury</Text>
                                <Text style={styles.toolDescription}>
                                    Take a photo of an injury for instant AI analysis and first aid suggestions.
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={TEXT_SECONDARY} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.toolCard}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('AIChat')}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                                <MaterialCommunityIcons name="robot" size={32} color="#2563eb" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.toolTitle}>AI Assistant</Text>
                                <Text style={styles.toolDescription}>
                                    Chat with our medical AI assistant for guidance and information.
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={TEXT_SECONDARY} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                <BottomTabBar activeRoute="AITools" />
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_LIGHT,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: BG_LIGHT,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: TEXT_LIGHT,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    sectionDescription: {
        fontSize: 16,
        color: TEXT_SECONDARY,
        marginBottom: 24,
        lineHeight: 22,
    },
    toolsGrid: {
        gap: 16,
    },
    toolCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD_LIGHT,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        marginRight: 12,
    },
    toolTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_LIGHT,
        marginBottom: 4,
    },
    toolDescription: {
        fontSize: 14,
        color: TEXT_SECONDARY,
        lineHeight: 20,
    },
});
