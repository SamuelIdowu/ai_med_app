import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const expo = new Expo();

export const registerToken = async (userId: string, token: string) => {
    if (!Expo.isExpoPushToken(token)) {
        throw new Error(`Push token ${token} is not a valid Expo push token`);
    }

    const { error } = await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userId);

    if (error) throw error;
    return { success: true };
};

export const getUserNotifications = async (userId: string) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const markAsRead = async (notificationId: string, userId: string) => {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId); // Ensure ownership

    if (error) throw error;
    return { success: true };
};

export const sendNotification = async (
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'alert' | 'success' = 'info',
    data: any = {}
) => {
    // 1. Get user's push token
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', userId)
        .single();

    if (userError || !userData?.push_token) {
        console.warn(`No push token found for user ${userId}`);
        // Still save to DB history even if no push token
    }

    // 2. Save notification to DB history
    const { error: dbError } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            title,
            message,
            type,
            read: false
        });

    if (dbError) {
        console.error('Error saving notification to DB:', dbError);
    }

    // 3. Send via Expo if token exists
    if (userData?.push_token) {
        const messages: ExpoPushMessage[] = [{
            to: userData.push_token,
            sound: 'default',
            title,
            body: message,
            data: { ...data, type },
        }];

        try {
            const chunks = expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
                await expo.sendPushNotificationsAsync(chunk);
            }
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }

    return { success: true };
};
