import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

type AuthMethod = 'email' | 'phone';

export const SignupScreen = () => {
    const navigation = useNavigation<any>();
    const [authMethod, setAuthMethod] = useState<AuthMethod>('email');

    // Email State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Phone State
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    // UI State
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleEmailSignup = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        setLoading(false);

        if (error) {
            if (error.message.includes('already registered') || error.message.includes('User already exists')) {
                Alert.alert(
                    'Account Exists',
                    'This email is already registered. Would you like to log in instead?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Log In', onPress: () => navigation.navigate('Login') }
                    ]
                );
            } else {
                Alert.alert('Signup Failed', error.message);
            }
        } else {
            Alert.alert('Success', 'Check your email for the confirmation link!');
            navigation.navigate('Login');
        }
    };

    const handleSendOtp = async () => {
        if (!phone) {
            Alert.alert('Error', 'Please enter a mobile number');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            phone: phone,
        });
        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            setOtpSent(true);
            Alert.alert('Success', 'OTP sent to your mobile number');
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode) {
            Alert.alert('Error', 'Please enter the verification code');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.verifyOtp({
            phone: phone,
            token: otpCode,
            type: 'sms',
        });
        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            // Successful verification (login/signup)
            // AuthContext should handle the rest, but if not auto-redirected:
            // navigation.navigate('MedicalProfile'); // example
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* Header */}
                    <View style={styles.headerRow}>
                        <TouchableOpacity
                            onPress={() => {
                                if (navigation.canGoBack()) {
                                    navigation.goBack();
                                } else {
                                    navigation.navigate('Welcome');
                                }
                            }}
                            style={styles.backButton}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join us and start your health journey today</Text>
                    </View>

                    {/* Toggle Auth Method */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, authMethod === 'email' && styles.toggleButtonActive]}
                            onPress={() => setAuthMethod('email')}
                        >
                            <Text style={[styles.toggleText, authMethod === 'email' && styles.toggleTextActive]}>Email</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, authMethod === 'phone' && styles.toggleButtonActive]}
                            onPress={() => setAuthMethod('phone')}
                        >
                            <Text style={[styles.toggleText, authMethod === 'phone' && styles.toggleTextActive]}>Mobile</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form */}
                    {authMethod === 'email' ? (
                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Email Address</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="jendoe.mobbin@gmail.com"
                                        placeholderTextColor="#999"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                    {email.includes('@') && (
                                        <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                                    )}
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Min. 8 characters"
                                        placeholderTextColor="#999"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        <MaterialCommunityIcons
                                            name={showPassword ? "eye-off" : "eye"}
                                            size={20}
                                            color="#666"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Confirm Password</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Min. 8 characters"
                                        placeholderTextColor="#999"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <MaterialCommunityIcons
                                            name={showConfirmPassword ? "eye-off" : "eye"}
                                            size={20}
                                            color="#666"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.termsText}>
                                By signing up, you agree to our Terms and Conditions and Privacy Policy.
                            </Text>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleEmailSignup}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Sign Up</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            {!otpSent ? (
                                <>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Mobile Number</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="+1 234 567 8900"
                                                placeholderTextColor="#999"
                                                value={phone}
                                                onChangeText={setPhone}
                                                keyboardType="phone-pad"
                                            />
                                        </View>
                                    </View>

                                    <Text style={styles.termsText}>
                                        We'll text you a code to verify your number.
                                    </Text>

                                    <TouchableOpacity
                                        style={styles.primaryButton}
                                        onPress={handleSendOtp}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.primaryButtonText}>Send Code</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Verification Code</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="123456"
                                                placeholderTextColor="#999"
                                                value={otpCode}
                                                onChangeText={setOtpCode}
                                                keyboardType="number-pad"
                                                maxLength={6}
                                            />
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.primaryButton}
                                        onPress={handleVerifyOtp}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.primaryButtonText}>Verify & Sign Up</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.textButton}
                                        onPress={() => setOtpSent(false)}
                                    >
                                        <Text style={styles.textButtonText}>Change Number</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.linkText}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    headerRow: {
        marginBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 4,
        marginBottom: 32,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleButtonActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    toggleTextActive: {
        color: '#E53935',
    },
    form: {
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginRight: 10,
    },
    termsText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 24,
        lineHeight: 18,
    },
    primaryButton: {
        backgroundColor: '#E53935',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#E53935',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    textButton: {
        alignItems: 'center',
        marginTop: 16,
    },
    textButtonText: {
        color: '#666',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 'auto',
        paddingTop: 24,
        paddingBottom: 24,
    },
    footerText: {
        color: '#666',
        fontSize: 16,
    },
    linkText: {
        color: '#E53935',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
