import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';

export const LoginScreen = () => {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        setLoading(false);

        if (error) {
            Alert.alert('Login Failed', error.message);
        }
        // Success handled by AuthContext listener automatically switching the stack
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome Back</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.textButton}
                onPress={() => navigation.navigate('Signup')}
            >
                <Text style={styles.textButtonText}>Don't have an account? Sign Up</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 40,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#eee',
        fontSize: 16,
    },
    primaryButton: {
        backgroundColor: '#E53935',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 10,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    textButton: {
        alignItems: 'center',
        padding: 10,
    },
    textButtonText: {
        color: '#E53935',
        fontSize: 16,
    },
});
