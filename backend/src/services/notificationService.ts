import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { getSupabaseAdmin } from '../db/client';

const expo = new Expo();

export const registerToken = async (userId: string, token: string) => {
  if (!Expo.isExpoPushToken(token)) {
    throw new Error('Push token is not a valid Expo push token');
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('users').update({ push_token: token }).eq('id', userId);

  if (error) throw error;
  return { success: true };
};

export const getUserNotifications = async (userId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const markAsRead = async (notificationId: string, userId: string) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;
  return { success: true };
};

export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'alert' | 'success' = 'info',
  data: any = {},
) => {
  const supabase = getSupabaseAdmin();

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    throw userError;
  }

  if (!userData?.push_token) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('No push token found for user');
    }
  }

  const { error: dbError } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    read: false,
    data,
  });

  if (dbError) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error saving notification to DB');
    }
  }

  if (userData?.push_token) {
    try {
      const messages: ExpoPushMessage[] = [
        {
          to: userData.push_token,
          sound: 'default',
          title,
          body: message,
          data: { ...data, type },
        },
      ];
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error sending push notification');
      }
    }
  }

  return { success: true };
};
