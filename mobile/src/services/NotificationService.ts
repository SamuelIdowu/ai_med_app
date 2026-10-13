import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase'; // Correct path

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
        try {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        } catch (e) {
            console.warn('Could not set notification channel (Expo Go limitation):', e);
        }
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        // Get the token — requires a real projectId and a development build (not Expo Go on Android SDK 53+)
        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId;

            if (!projectId) {
                console.warn(
                    'Push token skipped: no projectId found in app config. ' +
                    'Add extra.eas.projectId to app.json and use a development build for Android push notifications.'
                );
                return;
            }

            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            console.log('Expo Push Token:', token);
        } catch (e) {
            console.warn('Push token unavailable (Expo Go does not support Android remote push in SDK 53+):', e);
        }

    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
};

export const saveTokenToBackend = async (token: string) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Call backend API to register token
        // Use the backend URL from env or config
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000/api/v1';

        const response = await fetch(`${backendUrl}/notifications/register-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            throw new Error('Failed to register token with backend');
        }

        console.log("Token registered with backend successfully");

    } catch (error) {
        console.error('Error saving token to backend:', error);
    }
};

export const addNotificationListeners = () => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification Received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification Tapped:', response);
        // Navigate to specific screen if needed
    });

    return { notificationListener, responseListener };
};
