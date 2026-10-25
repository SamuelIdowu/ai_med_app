import { Icon } from '../components/Icon';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';
import { api } from '../services/api';
import { Chat, Message } from '../types/chatTypes';
import { createNewChat, updateChatMessages, getAllChats } from '../services/chatService';
import { deleteChat as deleteChatFromStorage, setCurrentChatId, getCurrentChatId } from '../services/chatStorage';
import { ChatHistorySidebar } from '../components/ChatHistorySidebar';
import { ThingsYouCanDoCards, ActionCardItem } from '../components/chat/ThingsYouCanDoCards';
import { FloatingChatInput } from '../components/chat/FloatingChatInput';
import { VoiceWaveformModal } from '../components/chat/VoiceWaveformModal';
import { MedicalCard } from '../components/ui/MedicalCard';
import { OrganicFluidSphere } from '../components/ui/OrganicFluidSphere';
import { VoiceService } from '../services/voiceService';
import { getApiErrorMessage } from '../services/apiError';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import type { IconName } from '../icons';

const QUICK_SUGGESTIONS: { label: string; icon: IconName; prompt: string }[] = [
  { label: 'CPR Steps', icon: 'cpr', prompt: 'Walk me through CPR step by step.' },
  { label: 'Choking', icon: 'choking', prompt: 'What should I do if someone is choking?' },
  { label: 'Severe Bleed', icon: 'bleeding', prompt: 'How do I stop severe bleeding?' },
  { label: 'Burns', icon: 'burns', prompt: 'How should I treat a burn injury?' },
  { label: 'Shock', icon: 'pulse', prompt: 'What are the signs of shock and how do I treat it?' },
  { label: 'Seizure', icon: 'brain', prompt: 'What should I do if someone is having a seizure?' },
  { label: 'Allergic', icon: 'allergy', prompt: 'How do I handle a severe allergic reaction or anaphylaxis?' },
];

export const AIChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isGuest } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentChatId, setCurrentChatIdState] = useState<string | null>(null);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [currentChatTitle, setCurrentChatTitle] = useState('New Triage');

  useEffect(() => {
    loadChatsFromStorage();
    return () => {
      VoiceService.stop();
    };
  }, []);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadChatsFromStorage = async () => {
    try {
      let chats = await getAllChats();
      let chatId = await getCurrentChatId();
      let currentChat = chats.find((c) => c.id === chatId);

      if (!chatId || !currentChat) {
        const newChat = await createNewChat();
        chatId = newChat.id;
        await setCurrentChatId(chatId);
        chats = [newChat, ...chats];
        currentChat = newChat;
      }

      setAllChats(chats);
      setCurrentChatIdState(chatId);

      if (currentChat) {
        setMessages(currentChat.messages);
        setCurrentChatTitle(currentChat.title);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const saveCurrentChat = async (updatedMessages: Message[]) => {
    if (!currentChatId) return;
    try {
      await updateChatMessages(currentChatId, updatedMessages);
      const chats = await getAllChats();
      setAllChats(chats);
      const updatedChat = chats.find((c) => c.id === currentChatId);
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
      setAllChats((prev) => [newChat, ...prev]);
      setSidebarVisible(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleSelectChat = async (chatId: string) => {
    try {
      await setCurrentChatId(chatId);
      const chat = allChats.find((c) => c.id === chatId);
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
      const updatedChats = allChats.filter((c) => c.id !== chatId);
      setAllChats(updatedChats);
      if (chatId === currentChatId) {
        if (updatedChats.length > 0) {
          await handleSelectChat(updatedChats[0].id);
        } else {
          await handleNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? message).trim();
    if (!text) return;

    const userMsg: Message = {
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setMessage('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const response = await api.post('/ai/chat', {
        message: userMsg.text,
        history,
      });

      const aiResponse = response.data.response;
      const aiMessage: Message = {
        role: 'model',
        text: aiResponse,
        timestamp: Date.now(),
      };
      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      await saveCurrentChat(updatedMessages);
    } catch (error: any) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[AIChat] request failed', {
          status: error?.response?.status,
          code: error?.code,
          url: error?.config?.url,
        });
      }
      const errorMessage = getApiErrorMessage(error);

      const errorMsg: Message = {
        role: 'model',
        text: errorMessage,
        timestamp: Date.now(),
      };
      const updatedMessagesWithError = [...newMessages, errorMsg];
      setMessages(updatedMessagesWithError);
      await saveCurrentChat(updatedMessagesWithError);
    } finally {
      setLoading(false);
    }
  };

  const actionCards: ActionCardItem[] = [
    {
      id: 'first-aid',
      title: 'First Aid Protocol',
      description: 'Step-by-step guidance for bleeding, burns, CPR & choking',
      icon: 'firstAidKit',
      iconBgColor: '#F3F4F6',
      iconColor: '#0F1115',
      onPress: () => navigation.navigate('FirstAidList'),
    },
    {
      id: 'live-triage',
      title: 'Live Streaming Triage',
      description: 'Real-time markdown SSE clinical triage with escalation detection',
      icon: 'lightning',
      iconBgColor: '#F3F4F6',
      iconColor: '#0F1115',
      onPress: () => navigation.navigate('LiveTriage'),
    },
    {
      id: 'photo-analysis',
      title: 'Photo Analysis',
      description: 'Wound vision or general AI assessment with severity guidance',
      icon: 'scan',
      iconBgColor: '#F3F4F6',
      iconColor: '#0F1115',
      onPress: () => navigation.navigate('AIAnalysis'),
    },
    {
      id: 'nearby-clinics',
      title: 'Nearest Clinics & Map',
      description: 'Locate closest hospitals and urgent care centers with GPS distance',
      icon: 'mapPin',
      iconBgColor: '#F3F4F6',
      iconColor: '#0F1115',
      onPress: () => navigation.navigate('ProviderList'),
    },
    {
      id: 'emergency-services',
      title: 'Emergency Dial & Dispatch',
      description: 'Direct 911 one-tap line with location assistance',
      icon: 'emergencyCall',
      iconBgColor: '#F3F4F6',
      iconColor: '#0F1115',
      onPress: () => sendMessage('What should I do in an emergency before paramedics arrive?'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* 1. Header with Offline indicator & history button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <Icon
            name="arrowLeft"
            size={22}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentChatTitle}
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {isGuest ? 'Guest AI · rate-limited' : 'Clinical AI Active'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('AITools')}
            activeOpacity={0.7}
            accessibilityLabel="All AI Clinical Tools"
          >
            <Icon
              name="sparkle"
              size={22}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleNewChat}
            activeOpacity={0.7}
          >
            <Icon
              name="plus"
              size={22}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.7}
          >
            <Icon
              name="history"
              size={22}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat History Sidebar Modal */}
      <ChatHistorySidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        chats={allChats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Voice Waveform Recording Modal */}
      <VoiceWaveformModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onConfirm={(transcript) => {
          setVoiceModalVisible(false);
          sendMessage(transcript);
        }}
      />

      {/* 2. Messages & Actions Area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Orb Greeting if empty */}
          {messages.length === 0 && (
            <View style={styles.welcomeSection}>
              <OrganicFluidSphere
                state={loading ? 'thinking' : 'idle'}
                size={120}
                style={{ marginBottom: 12 }}
              />

              <Text style={styles.welcomeTitle}>Hey there!</Text>
              <Text style={styles.welcomeSubtitle}>
                How can I assist your health and safety today?
              </Text>

              {/* Things you can do cards from ref image */}
              <ThingsYouCanDoCards actions={actionCards} />
            </View>
          )}

          {/* Render Active Messages */}
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <View
                key={index}
                style={[
                  styles.messageRow,
                  isUser ? styles.userRow : styles.modelRow,
                ]}
              >
                {!isUser && (
                  <View style={styles.modelAvatarCircle}>
                    <LinearGradient
                      colors={['#0F1115', '#262A33']}
                      style={styles.avatarGradient}
                    >
                      <Icon
                        name="sparkle"
                        size={14}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.modelBubble,
                  ]}
                >
                  {isUser ? (
                    <Text style={styles.userMessageText}>{msg.text}</Text>
                  ) : (
                    <>
                      <Markdown style={markdownStyles}>{msg.text}</Markdown>
                      <TouchableOpacity
                        style={styles.speakButton}
                        onPress={() => VoiceService.speak(msg.text)}
                        activeOpacity={0.7}
                      >
                        <Icon name="speakerHigh" size={15} color="#4B5563" />
                        <Text style={styles.speakButtonText}>Listen to guidance</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })}

          {loading && (
            <View style={[styles.messageRow, styles.modelRow]}>
              <View style={styles.modelAvatarCircle}>
                <LinearGradient
                  colors={['#0F1115', '#262A33']}
                  style={styles.avatarGradient}
                >
                  <Icon
                    name="sparkle"
                    size={14}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </View>
              <View style={[styles.bubble, styles.modelBubble, { paddingVertical: 14 }]}>
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primary.main}
                />
              </View>
            </View>
          )}

          {/* Quick Suggestions Horizontal Chips */}
          <View style={styles.suggestionsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {QUICK_SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s.label}
                  style={styles.suggestionChip}
                  onPress={() => sendMessage(s.prompt)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={s.icon}
                    size={15}
                    color={theme.colors.primary.main}
                  />
                  <Text style={styles.suggestionText}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* 3. Floating Pill Chat Input from ref image */}
        <FloatingChatInput
          value={message}
          onChangeText={setMessage}
          onSend={() => sendMessage()}
          onMicPress={() => setVoiceModalVisible(true)}
          placeholder="Ask anything about your health?"
          loading={loading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const markdownStyles = {
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text.primary,
  },
  strong: {
    fontWeight: '700' as const,
    color: theme.colors.text.primary,
  },
  bullet_list: {
    marginVertical: 4,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spatial.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.canvas.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.canvas.border,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.status.success.primary,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spatial.spacing.md,
    paddingTop: 16,
    paddingBottom: 20,
  },
  welcomeSection: {
    alignItems: 'flex-start',
    marginVertical: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  modelRow: {
    justifyContent: 'flex-start',
  },
  modelAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.spatial.radii.lg,
  },
  userBubble: {
    backgroundColor: theme.colors.primary.main,
    borderBottomRightRadius: 4,
    ...theme.spatial.shadows3d.tactileButton,
  },
  modelBubble: {
    backgroundColor: theme.colors.canvas.surface,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    borderBottomLeftRadius: 4,
    ...theme.spatial.shadows3d.card3d,
  },
  userMessageText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#FFFFFF',
  },
  suggestionsSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  suggestionsScroll: {
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.spatial.radii.pill,
    ...theme.spatial.shadows.sm,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  bubbleMediaContainer: {
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imageBubbleWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  bubbleImage: {
    width: 220,
    height: 150,
    borderRadius: 14,
    backgroundColor: '#1F242D',
  },
  mediaTagPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 17, 21, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mediaTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  videoBubbleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F242D',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 14,
    padding: 10,
    width: 220,
  },
  videoPlayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  videoBubbleMeta: {
    flex: 1,
  },
  videoBubbleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  videoBubbleSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  videoPillBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoPillBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignSelf: 'flex-start',
  },
  speakButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
});
