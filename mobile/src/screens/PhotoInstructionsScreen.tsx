
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BG_LIGHT = '#f8f6f6';
const PRIMARY_COLOR = '#e53734';
const TEXT_DARK = '#1c1917'; // stone-900 like
const TEXT_SECONDARY = '#57534e'; // stone-600 like
const CARD_BG = '#ffffff';

export const PhotoInstructionsScreen = () => {
    const navigation = useNavigation<any>();

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
                    <Text style={styles.headerTitle}>Take a Photo</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.contentContainer}>
                    <Text style={styles.description}>
                        For the AI to analyze the injury correctly, please take a clear photo. Ensure good lighting and hold the phone steady.
                    </Text>

                    <View style={styles.instructionsList}>
                        {/* Instruction 1 */}
                        <View style={styles.instructionCard}>
                            <View style={styles.instructionContent}>
                                <View style={styles.iconContainer}>
                                    <MaterialIcons name="wb-sunny" size={24} color={PRIMARY_COLOR} />
                                </View>
                                <Text style={styles.instructionText}>Use bright, even light</Text>
                            </View>
                        </View>

                        {/* Instruction 2 */}
                        <View style={styles.instructionCard}>
                            <View style={styles.instructionContent}>
                                <View style={styles.iconContainer}>
                                    <MaterialIcons name="smartphone" size={24} color={PRIMARY_COLOR} />
                                </View>
                                <Text style={styles.instructionText}>Hold your phone steady</Text>
                            </View>
                        </View>

                        {/* Instruction 3 */}
                        <View style={styles.instructionCard}>
                            <View style={styles.instructionContent}>
                                <View style={styles.iconContainer}>
                                    <MaterialIcons name="center-focus-strong" size={24} color={PRIMARY_COLOR} />
                                </View>
                                <Text style={styles.instructionText}>Ensure the entire injury is in frame</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.spacer} />

                    {/* CTA Button */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => navigation.navigate('Camera')}
                        >
                            <Text style={styles.buttonText}>Open Camera</Text>
                        </TouchableOpacity>
                    </View>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: BG_LIGHT,
    },
    backButton: {
        width: 48,
        height: 48,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEXT_DARK,
        textAlign: 'center',
        flex: 1,
    },
    placeholder: {
        width: 48,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    description: {
        fontSize: 16,
        color: TEXT_SECONDARY,
        textAlign: 'center',
        paddingVertical: 24,
        lineHeight: 24,
    },
    instructionsList: {
        gap: 12,
    },
    instructionCard: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        padding: 16,
        minHeight: 56,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    instructionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(229, 55, 52, 0.1)', // primary/10 approx
        alignItems: 'center',
        justifyContent: 'center',
    },
    instructionText: {
        fontSize: 16,
        color: TEXT_DARK,
        flex: 1,
    },
    spacer: {
        flex: 1,
    },
    footer: {
        paddingVertical: 24,
        paddingBottom: Platform.OS === 'ios' ? 0 : 24,
    },
    button: {
        backgroundColor: PRIMARY_COLOR,
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
