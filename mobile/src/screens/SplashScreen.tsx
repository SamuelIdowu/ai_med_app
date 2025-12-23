import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../services/storage';
import { supabase } from '../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';

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

        // Optional: Trigger exit animation before navigation if needed
        // For now, we rely on the parent logic to unmount this screen
    }, []);

    const handleReset = async () => {
        try {
            await StorageService.deleteAllPhotos();
            await AsyncStorage.clear();
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // AuthContext listener will handle navigation to Welcome
        } catch (error: any) {
            Alert.alert('Reset Failed', error.message);
        }
    };

    return (
        <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
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
                {/* You can replace this Text with an Image Logo if available */}
                <View style={styles.iconContainer}>
                    <Text style={styles.iconText}>+</Text>
                </View>

                <Text style={styles.logoText}>First Aid</Text>
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
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    iconText: {
        fontSize: 50,
        color: '#FFF',
        fontWeight: 'bold',
    },
    logoText: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        letterSpacing: 1,
    },
    resetButton: {
        position: 'absolute',
        bottom: 50,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    resetText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
