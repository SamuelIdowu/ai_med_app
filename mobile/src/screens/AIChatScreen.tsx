import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { Chat, Message } from '../types/chatTypes';
import { createNewChat, updateChatMessages, getAllChats } from '../services/chatService';
import { deleteChat as deleteChatFromStorage, setCurrentChatId, getCurrentChatId } from '../services/chatStorage';
import { ChatHistorySidebar } from '../components/ChatHistorySidebar';

const PRIMARY_COLOR = '#137fec';
const BG_LIGHT = '#f6f7f8';
const TEXT_DARK = '#0f172a';
const TEXT_SECONDARY = '#64748b';

export const AIChatScreen = () => {
    const navigation = useNavigation<any>();
    const scrollViewRef = useRef<ScrollView>(null);

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentChatId, setCurrentChatIdState] = useState<string | null>(null);
    const [allChats, setAllChats] = useState<Chat[]>([]);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [currentChatTitle, setCurrentChatTitle] = useState('New Chat');

    // Load chats on mount
    useEffect(() => {
        loadChatsFromStorage();
    }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const loadChatsFromStorage = async () => {
        try {
            const chats = await getAllChats();
            setAllChats(chats);

            // Get current chat ID or create new chat if none exists
            let chatId = await getCurrentChatId();

            if (!chatId || !chats.find(c => c.id === chatId)) {
                // No current chat or current chat doesn't exist, create new one
                const newChat = await createNewChat();
                chatId = newChat.id;
                await setCurrentChatId(chatId);
                setAllChats(prev => [newChat, ...prev]);
            }

            // Load messages for current chat
            const currentChat = chats.find(c => c.id === chatId);
            if (currentChat) {
                setMessages(currentChat.messages);
                setCurrentChatTitle(currentChat.title);
                setCurrentChatIdState(chatId);
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    };

    const saveCurrentChat = async (updatedMessages: Message[]) => {
        if (!currentChatId) return;

        try {
            await updateChatMessages(currentChatId, updatedMessages);

            // Refresh chat list to show updated title/timestamp
            const chats = await getAllChats();
            setAllChats(chats);

            // Update current chat title if it changed
            const updatedChat = chats.find(c => c.id === currentChatId);
            if (updatedChat) {
                setCurrentChatTitle(updatedChat.title);
            }
        } catch (error) {
            console.error('Error saving chat:', error);
        }
    };

    const handleNewChat = async () => {
        try {
            const newChat = await createNewChat();
            await setCurrentChatId(newChat.id);

            setCurrentChatIdState(newChat.id);
            setMessages(newChat.messages);
            setCurrentChatTitle(newChat.title);
            setAllChats(prev => [newChat, ...prev]);
            setSidebarVisible(false);
        } catch (error) {
            console.error('Error creating new chat:', error);
        }
    };

    const handleSelectChat = async (chatId: string) => {
        try {
            await setCurrentChatId(chatId);

            const chat = allChats.find(c => c.id === chatId);
            if (chat) {
                setCurrentChatIdState(chatId);
                setMessages(chat.messages);
                setCurrentChatTitle(chat.title);
            }
        } catch (error) {
            console.error('Error selecting chat:', error);
        }
    };

    const handleDeleteChat = async (chatId: string) => {
        try {
            await deleteChatFromStorage(chatId);
            const updatedChats = allChats.filter(c => c.id !== chatId);
            setAllChats(updatedChats);

            // If deleted chat was current, create new chat
            if (chatId === currentChatId) {
                if (updatedChats.length > 0) {
                    // Switch to most recent chat
                    await handleSelectChat(updatedChats[0].id);
                } else {
                    // No chats left, create new one
                    await handleNewChat();
                }
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    };



    const sendMessage = async () => {
        if (!message.trim()) return;

        const userMsg: Message = {
            role: 'user',
            text: message,
            timestamp: Date.now()
        };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setMessage('');
        setLoading(true);

        try {
            // Convert messages to history format expected by Gemini (user, model)
            // But our backend expects { message, history }
            // History is array of { role: 'user' | 'model', parts: [{ text: string }] }
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const response = await api.post('/ai/chat', {
                message: userMsg.text,
                history: history
            });

            const aiResponse = response.data.response;
            const aiMessage: Message = {
                role: 'model',
                text: aiResponse,
                timestamp: Date.now()
            };
            const updatedMessages = [...newMessages, aiMessage];
            setMessages(updatedMessages);

            // Auto-save to storage
            await saveCurrentChat(updatedMessages);
        } catch (error: any) {
            console.error(error);

            // Extract user-friendly error message from backend response
            let errorMessage = 'Sorry, I am having trouble connecting to the server.';

            if (error?.response?.data?.userMessage) {
                // Backend returned a structured error with userMessage
                errorMessage = error.response.data.userMessage;
            } else if (error?.response?.status === 429) {
                // Rate limit error
                errorMessage = 'Too many requests. Please wait a moment before trying again.';
            } else if (error?.message?.includes('Network Error') || !error?.response) {
                // Network connectivity issue
                errorMessage = 'Unable to connect. Please check your internet connection.';
            }

            const errorMsg: Message = {
                role: 'model',
                text: errorMessage,
                timestamp: Date.now()
            };
            const updatedMessagesWithError = [...newMessages, errorMsg];
            setMessages(updatedMessagesWithError);

            // Auto-save even on error
            await saveCurrentChat(updatedMessagesWithError);
        } finally {
            setLoading(false);
        }
    };

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
                    <Text style={styles.headerTitle} numberOfLines={1}>{currentChatTitle}</Text>
                    <View style={styles.statusRow}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Offline Ready</Text>
                    </View>
                </View>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleNewChat}
                    >
                        <MaterialCommunityIcons name="plus" size={24} color={TEXT_DARK} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setSidebarVisible(true)}
                    >
                        <MaterialCommunityIcons name="history" size={24} color={TEXT_DARK} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Chat History Sidebar */}
            <ChatHistorySidebar
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
                chats={allChats}
                currentChatId={currentChatId}
                onSelectChat={handleSelectChat}
                onNewChat={handleNewChat}
                onDeleteChat={handleDeleteChat}
            />

            {/* Chat Area */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.chatContainer}
                contentContainerStyle={styles.chatContent}
            >
                {/* Date Divider */}
                <View style={styles.dividerContainer}>
                    <View style={styles.dividerChip}>
                        <Text style={styles.dividerText}>Emergency Mode • 14:02 PM</Text>
                    </View>
                </View>

                {/* Chat Messages */}
                {messages.map((msg, index) => (
                    <View key={index} style={[styles.messageRow, msg.role === 'user' ? styles.messageRowRight : {}]}>
                        {msg.role === 'model' && (
                            <View style={styles.avatarContainer}>
                                <MaterialCommunityIcons name="robot" size={20} color="#64748b" />
                            </View>
                        )}
                        <View style={[styles.messageContent, msg.role === 'user' ? styles.messageContentRight : {}]}>
                            {msg.role === 'model' && <Text style={styles.senderName}>AI Assistant</Text>}
                            <View style={msg.role === 'user' ? styles.sentBubble : styles.receivedBubble}>
                                <Text style={msg.role === 'user' ? styles.sentMessageText : styles.messageText}>
                                    {msg.text}
                                </Text>
                            </View>
                        </View>
                        {msg.role === 'user' && (
                            <View style={styles.avatarContainer}>
                                <MaterialCommunityIcons name="account" size={20} color="#64748b" />
                            </View>
                        )}
                    </View>
                ))}

                {loading && (
                    <View style={styles.messageRow}>
                        <View style={styles.avatarContainer}>
                            <MaterialCommunityIcons name="robot" size={20} color="#64748b" />
                        </View>
                        <View style={styles.messageContent}>
                            <View style={styles.receivedBubble}>
                                <ActivityIndicator size="small" color="#64748b" />
                            </View>
                        </View>
                    </View>
                )}

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

                        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <MaterialCommunityIcons name="send" size={20} color="#fff" />
                            )}
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
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
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
