import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export const PrivacyPolicyScreen = () => {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={24} color="#1c1c1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.lastUpdated}>Last Updated: February 18, 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Introduction</Text>
                    <Text style={styles.paragraph}>
                        Welcome to AI Med App. We are committed to protecting your personal information and your right to privacy.
                        If you have any questions or concerns about our policy, or our practices with regards to your personal information,
                        please contact us.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Information We Collect</Text>
                    <Text style={styles.paragraph}>
                        We collect personal information that you voluntarily provide to us when registering at the Services expressing an interest in obtaining information about us or our products and services,
                        when participating in activities on the Services or otherwise contacting us.
                    </Text>
                    <Text style={styles.subTitle}>Personal Information Provided by You</Text>
                    <Text style={styles.paragraph}>
                        The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make and the products and features you use.
                        The personal information we collect can include the following:
                    </Text>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>Name and Contact Data</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>Health Data (Medical Profile, Encounters)</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>Credentials</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
                    <Text style={styles.paragraph}>
                        We use personal information collected via our Services for a variety of business purposes described below.
                        We process your personal information for these purposes in reliance on our legitimate business interests,
                        in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
                    </Text>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>To facilitate account creation and logon process.</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>To provide medical analysis and recommendations.</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>To send you administrative information.</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. How We Share Your Information</Text>
                    <Text style={styles.paragraph}>
                        We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Data Security</Text>
                    <Text style={styles.paragraph}>
                        We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process.
                        However, please also remember that we cannot guarantee that the internet itself is 100% secure.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.footer}>
                        If you have any questions about this Privacy Policy, please contact us.
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1c1c1e',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    lastUpdated: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1c1c1e',
        marginBottom: 12,
    },
    subTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1c1c1e',
        marginTop: 12,
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 15,
        color: '#444',
        lineHeight: 24,
        marginBottom: 8,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingLeft: 8,
    },
    bullet: {
        fontSize: 15,
        color: '#444',
        marginRight: 8,
        lineHeight: 24,
    },
    bulletText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 24,
        flex: 1,
    },
    footer: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
});
