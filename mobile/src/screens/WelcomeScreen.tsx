import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const { height, width } = Dimensions.get('window');

export const WelcomeScreen = () => {
    const navigation = useNavigation<any>();
    const { enterGuestMode } = useAuth();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Simple float animation for the main image/icon
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 10,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={styles.content}>

                {/* Illustration Area */}
                <Animated.View style={[styles.imageContainer, { opacity: fadeAnim, transform: [{ translateY: floatAnim }] }]}>
                    {/* Placeholder for the vector art in design (pills, doctor kit, etc) */}
                    <View style={styles.circleDecoration} />
                    {/* Using a placeholder text/icon if no image asset available, but structure allows for Image */}
                    {/* <Image source={require('../assets/hero.png')} style={styles.heroImage} resizeMode="contain" /> */}
                    <Text style={{ fontSize: 80 }}>💊</Text>
                    <Text style={{ fontSize: 80, position: 'absolute', top: 40, right: 60 }}>🩺</Text>
                </Animated.View>

                {/* Text Area */}
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Find the best{"\n"}doctor and medicine{"\n"}for you.</Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('Signup')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>Get Started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={enterGuestMode}
                        style={{ padding: 10 }}
                    >
                        <Text style={styles.linkText}>Skip</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 60,
    },
    imageContainer: {
        flex: 2,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    circleDecoration: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: (width * 0.8) / 2,
        backgroundColor: COLORS.inputBackground, // Subtle gray circle behind
        zIndex: -1,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontFamily: 'System', // Use default bold if custom font not loaded
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
        lineHeight: 40,
    },
    actions: {
        alignItems: 'center',
        gap: 16,
    },
    primaryButton: {
        backgroundColor: COLORS.textPrimary, // Dark button as per the 2nd image (Get Started is dark Navy/Black)
        // Or if matching the 1st image blue theme:
        // backgroundColor: COLORS.primary, 
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    linkText: {
        color: COLORS.placeholder,
        fontSize: 14,
    }
});
