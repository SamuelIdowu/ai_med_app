import { Chat, Message } from '../types/chatTypes';
import { saveChat, loadAllChats, saveAllChats } from './chatStorage';

/**
 * Generate a unique chat ID
 */
const generateChatId = (): string => {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a chat title from the first user message
 */
export const generateChatTitle = (firstMessage: string): string => {
    const maxLength = 30;
    if (firstMessage.length <= maxLength) {
        return firstMessage;
    }
    return firstMessage.substring(0, maxLength) + '...';
};

/**
 * Create a new chat with initial welcome message
 */
export const createNewChat = async (): Promise<Chat> => {
    const now = Date.now();
    const welcomeMessage: Message = {
        role: 'model',
        text: 'I am ready to help. Describe the injury or situation, or upload a photo.',
        timestamp: now
    };

    const newChat: Chat = {
        id: generateChatId(),
        title: 'New Chat',
        messages: [welcomeMessage],
        createdAt: now,
        updatedAt: now
    };

    await saveChat(newChat);
    return newChat;
};

/**
 * Update chat messages and save to storage
 */
export const updateChatMessages = async (
    chatId: string,
    messages: Message[]
): Promise<void> => {
    const storage = await loadAllChats();
    const chat = storage.chats.find(c => c.id === chatId);

    if (!chat) {
        throw new Error(`Chat with ID ${chatId} not found`);
    }

    chat.messages = messages;
    chat.updatedAt = Date.now();

    // Auto-generate title from first user message if still "New Chat"
    if (chat.title === 'New Chat') {
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage) {
            chat.title = generateChatTitle(firstUserMessage.text);
        }
    }

    await saveChat(chat);
};

/**
 * Get all chats sorted by most recent
 */
export const getAllChats = async (): Promise<Chat[]> => {
    const storage = await loadAllChats();
    return storage.chats.sort((a, b) => b.updatedAt - a.updatedAt);
};

/**
 * Delete all chats (useful for clearing storage)
 */
export const deleteAllChats = async (): Promise<void> => {
    const storage = await loadAllChats();
    storage.chats = [];
    storage.currentChatId = null;
    await saveAllChats(storage);
};
