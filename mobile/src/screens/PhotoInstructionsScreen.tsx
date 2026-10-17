
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

const BG_LIGHT = theme.colors.canvas.background;
const PRIMARY_COLOR = theme.colors.primary.main;
const TEXT_DARK = theme.colors.text.primary;
const TEXT_SECONDARY = theme.colors.text.secondary;
const CARD_BG = theme.colors.canvas.surface;

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
        borderRadius: 16,
        padding: 16,
        minHeight: 56,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.canvas.border,
        ...theme.spatial.shadows3d.level1,
    },
    instructionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: theme.colors.primary.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    instructionText: {
        fontSize: 16,
        fontWeight: '600',
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
        borderRadius: theme.spatial.radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.spatial.shadows3d.level2,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
