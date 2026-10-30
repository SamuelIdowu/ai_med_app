import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import {
  useFonts,
  MontserratAlternates_400Regular,
  MontserratAlternates_500Medium,
  MontserratAlternates_600SemiBold,
  MontserratAlternates_700Bold,
  MontserratAlternates_800ExtraBold,
} from '@expo-google-fonts/montserrat-alternates';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import './src/theme/fontPatch';
import { theme, ThemeProvider } from './src/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { registerForPushNotificationsAsync, saveTokenToBackend, addNotificationListeners } from './src/services/NotificationService';
import * as Notifications from 'expo-notifications';
import { EmergencyErrorBoundary } from './src/components/ui/EmergencyErrorBoundary';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    MontserratAlternates_400Regular,
    MontserratAlternates_500Medium,
    MontserratAlternates_600SemiBold,
    MontserratAlternates_700Bold,
    MontserratAlternates_800ExtraBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const [fontTimeout, setFontTimeout] = useState(false);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => setFontTimeout(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        saveTokenToBackend(token);
      }
    });

    const { notificationListener, responseListener } = addNotificationListeners();

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  if (!fontsLoaded && !fontError && !fontTimeout) {
    const isDark = theme.colors.canvas.background === '#061011' || theme.colors.canvas.background === '#0B0F19';
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.canvas.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      </View>
    );
  }

  return (
    <EmergencyErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </EmergencyErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
