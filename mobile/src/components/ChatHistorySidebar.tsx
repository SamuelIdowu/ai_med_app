import { Icon } from './Icon';
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import { Chat } from '../types/chatTypes';

const PRIMARY_COLOR = '#0F1115';
const TEXT_DARK = '#0F1115';
const TEXT_SECONDARY = '#6B7280';

interface ChatHistorySidebarProps {
    visible: boolean;
    onClose: () => void;
    chats: Chat[];
    currentChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
    visible,
    onClose,
    chats,
    currentChatId,
    onSelectChat,
    onNewChat,
    onDeleteChat,
}) => {
    console.log('Context: ChatHistorySidebar.tsx [render] Received chats count:', chats?.length);
    const handleDelete = (chatId: string) => {
        Alert.alert(
            'Delete Chat',
            'Are you sure you want to delete this chat? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDeleteChat(chatId),
                },
            ]
        );
    };

    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffHours / 24;

        if (diffHours < 1) {
            return 'Just now';
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)}h ago`;
        } else if (diffDays < 7) {
            return `${Math.floor(diffDays)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const getLastMessagePreview = (chat: Chat): string => {
        if (chat.messages.length === 0) return 'No messages yet';
        const lastMessage = chat.messages[chat.messages.length - 1];
        const preview = lastMessage.text.substring(0, 50);
        return preview.length < lastMessage.text.length ? preview + '...' : preview;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sidebar}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Chat History</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color={TEXT_DARK} />
                        </TouchableOpacity>
                    </View>

                    {/* New Chat Button */}
                    <TouchableOpacity style={styles.newChatButton} onPress={onNewChat}>
                        <Icon name="plus" size={20} color="#fff" />
                        <Text style={styles.newChatText}>New Chat</Text>
                    </TouchableOpacity>

                    {/* Chat List */}
                    <ScrollView style={styles.chatList} contentContainerStyle={styles.chatListContent}>
                        {chats.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="chatCircle" size={48} color={TEXT_SECONDARY} />
                                <Text style={styles.emptyText}>No chats yet</Text>
                                <Text style={styles.emptySubtext}>Start a new chat to begin</Text>
                            </View>
                        ) : (
                            chats.map((chat) => (
                                <View
                                    key={chat.id}
                                    style={[
                                        styles.chatItem,
                                        currentChatId === chat.id && styles.chatItemActive,
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.chatItemContent}
                                        onPress={() => {
                                            onSelectChat(chat.id);
                                            onClose();
                                        }}
                                    >
                                        <View style={styles.chatItemHeader}>
                                            <Text
                                                style={[
                                                    styles.chatTitle,
                                                    currentChatId === chat.id && styles.chatTitleActive,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {chat.title}
                                            </Text>
                                            <Text style={styles.chatDate}>{formatDate(chat.updatedAt)}</Text>
                                        </View>
                                        <Text style={styles.chatPreview} numberOfLines={2}>
                                            {getLastMessagePreview(chat)}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDelete(chat.id)}
                                    >
                                        <Icon name="trash" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sidebar: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    closeButton: {
        padding: 4,
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: PRIMARY_COLOR,
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 12,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    newChatText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    chatList: {
        width: '100%',
    },
    chatListContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: TEXT_DARK,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: TEXT_SECONDARY,
        marginTop: 4,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    chatItemActive: {
        backgroundColor: '#F3F4F6',
        borderColor: '#0F1115',
    },
    chatItemContent: {
        flex: 1,
        padding: 12,
    },
    chatItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    chatTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    chatTitleActive: {
        color: PRIMARY_COLOR,
    },
    chatDate: {
        fontSize: 12,
        color: TEXT_SECONDARY,
        marginLeft: 8,
    },
    chatPreview: {
        fontSize: 13,
        color: TEXT_SECONDARY,
        lineHeight: 18,
    },
    deleteButton: {
        padding: 12,
    },
});
