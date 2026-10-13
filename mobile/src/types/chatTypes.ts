export interface Message {
    role: 'user' | 'model';
    text: string;
    timestamp: number;
    mediaUri?: string;
    mediaType?: 'image' | 'video';
}

export interface Chat {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

export interface ChatsStorage {
    chats: Chat[];
    currentChatId: string | null;
}
