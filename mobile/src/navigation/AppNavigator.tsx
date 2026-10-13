import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import { SplashScreen } from '../screens/SplashScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { EmergencyStepScreen } from '../screens/EmergencyStepScreen';
import { EmergencySummaryScreen } from '../screens/EmergencySummaryScreen';
import { MedicalProfileScreen } from '../screens/MedicalProfileScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { PhotoInstructionsScreen } from '../screens/PhotoInstructionsScreen';
import { PhotoPreviewScreen } from '../screens/PhotoPreviewScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { PermissionsScreen } from '../screens/PermissionsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { CreateProfileScreen } from '../screens/CreateProfileScreen';
import { ReportPreviewScreen } from '../screens/ReportPreviewScreen';
import { ProviderListScreen } from '../screens/ProviderListScreen';
import { ProviderDetailScreen } from '../screens/ProviderDetailScreen';

import { SettingsScreen } from '../screens/SettingsScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { AIAnalysisScreen } from '../screens/AIAnalysisScreen';
import { AIChatScreen } from '../screens/AIChatScreen';
import { AIToolsScreen } from '../screens/AIToolsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { FirstAidListScreen } from '../screens/FirstAidListScreen';
import { WoundScannerScreen } from '../screens/WoundScannerScreen';
import { LiveTriageScreen } from '../screens/LiveTriageScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
    const { session, loading, isGuest } = useAuth();

    if (loading) {
        return <SplashScreen />;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!session && !isGuest ? (
                    // Auth Stack
                    <>
                        <Stack.Screen name="Welcome" component={WelcomeScreen} />
                        <Stack.Screen name="Permissions" component={PermissionsScreen} />
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Signup" component={SignupScreen} />
                        <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
                    </>
                ) : (
                    // App Stack
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="History" component={HistoryScreen} />
                        <Stack.Screen name="EmergencySteps" component={EmergencyStepScreen} />
                        <Stack.Screen name="EmergencySummary" component={EmergencySummaryScreen} />
                        <Stack.Screen name="MedicalProfile" component={MedicalProfileScreen} />
                        <Stack.Screen name="PhotoInstructions" component={PhotoInstructionsScreen} />
                        <Stack.Screen name="Camera" component={CameraScreen} />
                        <Stack.Screen name="ReportPreview" component={ReportPreviewScreen} />
                        <Stack.Screen name="ProviderList" component={ProviderListScreen} />
                        <Stack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                        <Stack.Screen name="PhotoPreview" component={PhotoPreviewScreen} />
                        <Stack.Screen name="AIAnalysis" component={AIAnalysisScreen} />
                        <Stack.Screen name="AIChat" component={AIChatScreen} />
                        <Stack.Screen name="AITools" component={AIToolsScreen} />
                        <Stack.Screen name="Notifications" component={NotificationsScreen} />
                        <Stack.Screen name="FirstAidList" component={FirstAidListScreen} />
                        <Stack.Screen name="WoundScanner" component={WoundScannerScreen} />
                        <Stack.Screen name="LiveTriage" component={LiveTriageScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
