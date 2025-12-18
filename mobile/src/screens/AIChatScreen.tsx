import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY_COLOR = '#137fec';
const BG_LIGHT = '#f6f7f8';
const TEXT_DARK = '#0f172a';
const TEXT_SECONDARY = '#64748b';

export const AIChatScreen = () => {
    const navigation = useNavigation<any>();
    const [message, setMessage] = useState('');

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.headerButton}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>AI Assistant</Text>
                    <View style={styles.statusRow}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Offline Ready</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.headerButton}>
                    <MaterialCommunityIcons name="dots-vertical" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
            </View>

            {/* Chat Area */}
            <ScrollView
                style={styles.chatContainer}
                contentContainerStyle={styles.chatContent}
            >
                {/* Date Divider */}
                <View style={styles.dividerContainer}>
                    <View style={styles.dividerChip}>
                        <Text style={styles.dividerText}>Emergency Mode • 14:02 PM</Text>
                    </View>
                </View>

                {/* AI Welcome */}
                <View style={styles.messageRow}>
                    <View style={styles.avatarContainer}>
                        {/* Placeholder for AI Avatar */}
                        <MaterialCommunityIcons name="robot" size={20} color="#64748b" />
                    </View>
                    <View style={styles.messageContent}>
                        <Text style={styles.senderName}>AI Assistant</Text>
                        <View style={styles.receivedBubble}>
                            <Text style={styles.messageText}>
                                I am ready to help. Describe the injury or situation, or upload a photo.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* User Message */}
                <View style={[styles.messageRow, styles.messageRowRight]}>
                    <View style={[styles.messageContent, styles.messageContentRight]}>
                        <View style={styles.sentBubble}>
                            <Text style={styles.sentMessageText}>
                                My friend cut his hand deeply and it won't stop bleeding.
                            </Text>
                        </View>
                        <Text style={styles.timestampRight}>You • Just now</Text>
                    </View>
                    <View style={styles.avatarContainer}>
                        {/* Placeholder for User Avatar */}
                        <MaterialCommunityIcons name="account" size={20} color="#64748b" />
                    </View>
                </View>

                {/* AI Response */}
                <View style={styles.messageRow}>
                    <View style={styles.avatarContainer}>
                        <MaterialCommunityIcons name="robot" size={20} color="#64748b" />
                    </View>
                    <View style={styles.messageContent}>
                        <Text style={styles.senderName}>AI Assistant</Text>
                        <View style={styles.receivedBubble}>
                            <Text style={styles.protocolTitle}>SEVERE BLEEDING PROTOCOL</Text>
                            <View style={styles.stepsContainer}>
                                <Text style={styles.stepText}>
                                    1. <Text style={styles.boldText}>Apply direct pressure</Text> to the wound immediately using a clean cloth or gauze.
                                </Text>
                                <Text style={styles.stepText}>
                                    2. <Text style={styles.boldText}>Elevate the hand</Text> above heart level to reduce blood flow.
                                </Text>
                                <Text style={styles.stepText}>
                                    3. <Text style={styles.boldText}>Do not remove the cloth</Text> if it soaks through; add more material on top.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Warning Card */}
                <View style={styles.messageRow}>
                    <View style={{ width: 32 }} />
                    <View style={styles.warningCard}>
                        <MaterialCommunityIcons name="alert" size={20} color="#dc2626" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.warningTitle}>CRITICAL WARNING</Text>
                            <Text style={styles.warningText}>
                                If bleeding is spurting or won't stop after 10 minutes of pressure, call emergency services immediately. Do not use a tourniquet unless trained.
                            </Text>
                        </View>
                    </View>
                </View>

            </ScrollView>

            {/* Bottom Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                style={styles.keyboardAvoid}
            >
                <View style={styles.footer}>
                    {/* Quick Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
                        {['CPR Guide', 'Shock', 'Choking', 'Burn'].map((chip) => (
                            <TouchableOpacity key={chip} style={styles.chip}>
                                <Text style={styles.chipText}>{chip}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Input Bar */}
                    <View style={styles.inputBar}>
                        <TouchableOpacity style={styles.attachButton}>
                            <MaterialCommunityIcons name="camera-plus" size={24} color={TEXT_SECONDARY} />
                        </TouchableOpacity>

                        <View style={styles.inputFieldContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Describe the emergency..."
                                placeholderTextColor="#94a3b8"
                                value={message}
                                onChangeText={setMessage}
                            />
                            <TouchableOpacity>
                                <MaterialCommunityIcons name="microphone" size={22} color={TEXT_SECONDARY} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.sendButton}>
                            <MaterialCommunityIcons name="send" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
                <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
            </KeyboardAvoidingView>

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
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    statusText: {
        fontSize: 12,
        color: TEXT_SECONDARY,
        fontWeight: '500',
    },
    chatContainer: {
        flex: 1,
    },
    chatContent: {
        padding: 16,
        paddingBottom: 24,
    },
    dividerContainer: {
        alignItems: 'center',
        marginVertical: 16,
    },
    dividerChip: {
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 99,
    },
    dividerText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#94a3b8',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
        marginBottom: 24,
    },
    messageRowRight: {
        justifyContent: 'flex-end',
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    messageContent: {
        flex: 1,
        maxWidth: '85%',
    },
    messageContentRight: {
        alignItems: 'flex-end',
    },
    senderName: {
        fontSize: 12,
        color: TEXT_SECONDARY,
        marginBottom: 4,
        marginLeft: 4,
        fontWeight: '500',
    },
    receivedBubble: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        padding: 14,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageText: {
        fontSize: 15,
        color: '#1e293b',
        lineHeight: 22,
    },
    sentBubble: {
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 16,
        borderBottomRightRadius: 4,
        padding: 14,
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sentMessageText: {
        fontSize: 15,
        color: '#fff',
        lineHeight: 22,
    },
    timestampRight: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
        marginRight: 4,
        fontWeight: '500',
    },
    protocolTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    stepsContainer: {
        gap: 8,
    },
    stepText: {
        fontSize: 14,
        color: '#1e293b',
        lineHeight: 20,
    },
    boldText: {
        fontWeight: '700',
        color: TEXT_DARK,
    },
    warningCard: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fee2e2',
        borderRadius: 12,
        padding: 12,
        maxWidth: '90%',
    },
    warningTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#991b1b',
        marginBottom: 4,
    },
    warningText: {
        fontSize: 14,
        color: '#7f1d1d',
        lineHeight: 20,
    },
    keyboardAvoid: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    footer: {
        backgroundColor: '#fff',
    },
    chipsScroll: {
        paddingVertical: 12,
    },
    chipsContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    chip: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#334155',
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 16,
        paddingTop: 4,
        gap: 12,
    },
    attachButton: {
        padding: 10,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        marginBottom: 1,
    },
    inputFieldContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        paddingHorizontal: 16,
        minHeight: 48,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: TEXT_DARK,
        paddingVertical: 12,
        marginRight: 8,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: PRIMARY_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 1,
    },
});
