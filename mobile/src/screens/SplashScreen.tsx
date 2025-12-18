import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../services/storage';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');

export const SplashScreen = () => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: false, // Temporarily disabled for debugging
            }),
            Animated.delay(1500),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
            }),
        ]).start(); // No callback needed, AppNavigator handles switch when loading=false
    }, [fadeAnim]);

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
        <View style={styles.container}>
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                <Text style={styles.logoText}>First Aid</Text>
                <Text style={styles.tagline}>Fast. Offline. Reliable.</Text>
            </Animated.View>

            {__DEV__ && (
                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                    <Text style={styles.resetText}>Reset App (Dev)</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#E53935',
        marginBottom: 10,
    },
    tagline: {
        fontSize: 18,
        color: '#555',
    },
    resetButton: {
        position: 'absolute',
        bottom: 50,
        padding: 10,
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    resetText: {
        color: '#666',
        fontSize: 12,
    },
});
