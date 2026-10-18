import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chat, ChatsStorage } from '../types/chatTypes';

const STORAGE_KEY = '@laso:chats';

/**
 * Load all chats from AsyncStorage
 */
export const loadAllChats = async (): Promise<ChatsStorage> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
            console.log('Context: chatStorage.ts:13 [loadAllChats] Loading chats from storage:', data.substring(0, 100) + '...');
            const parsed: ChatsStorage = JSON.parse(data);
            return parsed;
        }
        console.log('Context: chatStorage.ts:17 [loadAllChats] No chats found in storage.');
        return { chats: [], currentChatId: null };
    } catch (error) {
        console.error('Error loading chats:', error);
        return { chats: [], currentChatId: null };
    }
};

/**
 * Save all chats to AsyncStorage
 */
export const saveAllChats = async (storage: ChatsStorage): Promise<void> => {
    try {
        console.log('Context: chatStorage.ts:28 [saveAllChats] Saving chats to storage. Count:', storage.chats.length);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    } catch (error) {
        console.error('Error saving chats:', error);
        throw error;
    }
};

/**
 * Save or update a single chat
 */
export const saveChat = async (chat: Chat): Promise<void> => {
    try {
        const storage = await loadAllChats();
        const existingIndex = storage.chats.findIndex(c => c.id === chat.id);

        if (existingIndex >= 0) {
            storage.chats[existingIndex] = chat;
        } else {
            storage.chats.push(chat);
        }

        await saveAllChats(storage);
    } catch (error) {
        console.error('Error saving chat:', error);
        throw error;
    }
};

/**
 * Get a specific chat by ID
 */
export const getChatById = async (chatId: string): Promise<Chat | null> => {
    try {
        const storage = await loadAllChats();
        return storage.chats.find(c => c.id === chatId) || null;
    } catch (error) {
        console.error('Error getting chat:', error);
        return null;
    }
};

/**
 * Delete a chat by ID
 */
export const deleteChat = async (chatId: string): Promise<void> => {
    try {
        const storage = await loadAllChats();
        storage.chats = storage.chats.filter(c => c.id !== chatId);

        // If deleted chat was current, clear current chat ID
        if (storage.currentChatId === chatId) {
            storage.currentChatId = null;
        }

        await saveAllChats(storage);
    } catch (error) {
        console.error('Error deleting chat:', error);
        throw error;
    }
};

/**
 * Set the current active chat ID
 */
export const setCurrentChatId = async (chatId: string | null): Promise<void> => {
    try {
        const storage = await loadAllChats();
        storage.currentChatId = chatId;
        await saveAllChats(storage);
    } catch (error) {
        console.error('Error setting current chat:', error);
        throw error;
    }
};

/**
 * Get the current active chat ID
 */
export const getCurrentChatId = async (): Promise<string | null> => {
    try {
        const storage = await loadAllChats();
        return storage.currentChatId;
    } catch (error) {
        console.error('Error getting current chat ID:', error);
        return null;
    }
};
