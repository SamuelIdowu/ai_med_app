import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../services/storage';
import { supabase } from '../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { Illustration } from '../components/Illustration';

const { width } = Dimensions.get('window');

export const SplashScreen = () => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, scaleAnim, slideAnim]);

    const handleReset = async () => {
        try {
            await StorageService.deleteAllPhotos();
            await AsyncStorage.clear();
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error: any) {
            Alert.alert('Reset Failed', error.message);
        }
    };

    return (
        <LinearGradient
            colors={[theme.colors.palette.eliteTeal, theme.colors.palette.darkSideMoon]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <Animated.View
                style={[
                    styles.contentContainer,
                    {
                        opacity: fadeAnim,
                        transform: [
                            { scale: scaleAnim },
                            { translateY: slideAnim }
                        ]
                    }
                ]}
            >
                <View style={styles.iconContainer}>
                    <Illustration
                        name="splashEmblem"
                        width={72}
                        height={72}
                        accessibilityLabel="Laso+ medical emblem"
                        fallback={<Text style={styles.iconText}>+</Text>}
                    />
                </View>
                <Text style={styles.tagline}>Fast. Offline. Reliable.</Text>
            </Animated.View>

            {__DEV__ && (
                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                    <Text style={styles.resetText}>Reset App (Dev)</Text>
                </TouchableOpacity>
            )}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.canvas.background,
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 88,
        height: 88,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    iconText: {
        fontSize: 54,
        color: theme.colors.palette.coralCoast,
        fontWeight: 'bold',
    },
    logoText: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.35)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    logoAccent: {
        color: theme.colors.palette.coralCoast,
    },
    tagline: {
        fontSize: 16,
        color: theme.colors.palette.blissfulBlue,
        letterSpacing: 1,
    },
    resetButton: {
        position: 'absolute',
        bottom: 50,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    resetText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
