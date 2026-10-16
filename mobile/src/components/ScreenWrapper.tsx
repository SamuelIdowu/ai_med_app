import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../theme';

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: ViewStyle;
    statusBarColor?: string;
    lightObj?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    style,
    statusBarColor = 'transparent',
    lightObj
}) => {
    const isDark = theme.colors.canvas.background === '#061011' || theme.colors.canvas.background === '#0B0F19';
    return (
        <LinearGradient
            colors={[theme.colors.canvas.background, theme.colors.canvas.surfaceSubtle]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.container, style]}
        >
            <StatusBar style={lightObj !== undefined ? (lightObj ? 'light' : 'dark') : (isDark ? 'light' : 'dark')} backgroundColor={statusBarColor} />
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
