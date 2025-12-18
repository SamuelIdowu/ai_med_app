import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

export const WelcomeScreen = () => {
    const navigation = useNavigation<any>();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F6F6" />
            <View style={styles.contentContainer}>
                {/* Logo Container */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoBackground}>
                        <MaterialIcons name="health-and-safety" size={48} color="#E53734" />
                    </View>

                    {/* HeadlineText */}
                    <Text style={styles.headline}>Your First Aid Companion</Text>

                    {/* BodyText */}
                    <Text style={styles.bodyText}>Reliable offline steps for emergencies.</Text>
                </View>

                {/* CTA Container */}
                <View style={styles.widthFull}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('Permissions')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>Get Started</Text>
                    </TouchableOpacity>

                    {/* MetaText */}
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.metaText}>
                            Already have an account? <Text style={styles.linkText}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F6F6',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 16,
    },
    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoBackground: {
        width: 80,
        height: 80,
        borderRadius: 12, // rounded-xl
        backgroundColor: 'rgba(229, 55, 52, 0.1)', // bg-primary/10
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    headline: {
        color: '#1B0E0E',
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: 38, // tracking-tight leads to tighter spacing, adjusting line height accordingly
        paddingBottom: 12,
    },
    bodyText: {
        color: 'rgba(27, 14, 14, 0.8)', // text-[#1b0e0e]/80
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 320,
    },
    widthFull: {
        width: '100%',
        paddingBottom: 24,
    },
    primaryButton: {
        backgroundColor: '#E53734', // bg-primary
        height: 48,
        borderRadius: 8, // rounded-lg
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#FBF8F8',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.24, // tracking-[0.015em] -> approx 0.015 * 16
    },
    metaText: {
        color: '#96504F',
        fontSize: 14,
        textAlign: 'center',
        textDecorationLine: 'underline',
        paddingTop: 4,
        paddingBottom: 12,
    },
    linkText: {
        // Inherits style, but explicit if needed
    }
});
