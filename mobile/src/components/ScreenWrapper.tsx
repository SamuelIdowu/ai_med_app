import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/theme';

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
    lightObj = false
}) => {
    return (
        <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.container, style]}
        >
            <StatusBar style={lightObj ? 'light' : 'dark'} backgroundColor={statusBarColor} />
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
