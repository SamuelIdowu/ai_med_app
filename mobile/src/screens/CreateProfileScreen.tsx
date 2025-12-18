
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, Switch, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { MedicalProfileService } from '../services/medicalProfileService';

const PRIMARY_COLOR = '#E53734'; // Matching detailed UI color from PermissionsScreen/Welcome
const BG_LIGHT = '#F8F6F6';
const TEXT_DARK = '#1B0E0E';
const TEXT_SECONDARY = '#96504F';
const BORDER_COLOR = '#E6D1D0';

export const CreateProfileScreen = () => {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);

    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Profile State
    const [fullName, setFullName] = useState('');
    const [dob, setDob] = useState(''); // Simple text for MVP
    const [bloodType, setBloodType] = useState('');
    const [allergies, setAllergies] = useState<string[]>([]);
    const [conditions, setConditions] = useState<string[]>([]);
    const [medications, setMedications] = useState<string[]>([]);
    const [emergencyContactName, setEmergencyContactName] = useState('');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

    // Chip Inputs
    const [allergyInput, setAllergyInput] = useState('');
    const [conditionInput, setConditionInput] = useState('');
    const [medicationInput, setMedicationInput] = useState('');

    const addChip = (list: string[], setList: (l: string[]) => void, value: string, setValue: (v: string) => void) => {
        if (value.trim()) {
            setList([...list, value.trim()]);
            setValue('');
        }
    };

    const removeChip = (list: string[], setList: (l: string[]) => void, index: number) => {
        setList(list.filter((_, i) => i !== index));
    };

    const handleCreateProfile = async () => {
        if (!email || !password || !fullName) {
            Alert.alert('Missing Fields', 'Please fill in at least Email, Password, and Full Name.');
            return;
        }

        setLoading(true);

        try {
            // 1. Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            // 2. Save Medical Profile (Local)
            const profileData = {
                fullName,
                dob,
                bloodType,
                allergies,
                conditions,
                medications,
                emergencyContact: {
                    name: emergencyContactName,
                    relationship: '', // Optional for now
                    phone: emergencyContactPhone,
                },
                // Default avatar or logic to pick one could go here, for now using placeholder logic in Service or just undefined
            };

            await MedicalProfileService.saveProfile(profileData);

            // 3. Success
            Alert.alert('Success', 'Profile created successfully!', [
                {
                    text: 'OK',
                    onPress: () => {
                        // Navigation will handle Auth state change automatically via AppNavigator
                        // But if auto-login didn't happen (e.g. email confirmation required), we might land on Login.
                        // For MVP with Supabase defaults, usually requires confirmation unless disabled.
                        // We'll navigate to Login just in case if session isn't immediate.
                        navigation.navigate('Login');
                    }
                }
            ]);

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Details</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
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
                </View>

                {/* Personal Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        value={fullName}
                        onChangeText={setFullName}
                    />
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="Date of Birth (YYYY-MM-DD)"
                            value={dob}
                            onChangeText={setDob}
                        />
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="Blood Type (e.g. O+)"
                            value={bloodType}
                            onChangeText={setBloodType}
                        />
                    </View>
                </View>

                {/* Health Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Health Details</Text>

                    {/* Allergies */}
                    <Text style={styles.label}>Allergies</Text>
                    <View style={styles.chipRow}>
                        {allergies.map((item, i) => (
                            <TouchableOpacity key={i} onPress={() => removeChip(allergies, setAllergies, i)} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                                <MaterialIcons name="close" size={14} color={PRIMARY_COLOR} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.addInputContainer}>
                        <TextInput
                            style={styles.addInput}
                            placeholder="Add allergy..."
                            value={allergyInput}
                            onChangeText={setAllergyInput}
                            onSubmitEditing={() => addChip(allergies, setAllergies, allergyInput, setAllergyInput)}
                        />
                        <TouchableOpacity onPress={() => addChip(allergies, setAllergies, allergyInput, setAllergyInput)}>
                            <MaterialIcons name="add-circle" size={24} color={PRIMARY_COLOR} />
                        </TouchableOpacity>
                    </View>

                    {/* Conditions */}
                    <Text style={[styles.label, { marginTop: 12 }]}>Chronic Conditions</Text>
                    <View style={styles.chipRow}>
                        {conditions.map((item, i) => (
                            <TouchableOpacity key={i} onPress={() => removeChip(conditions, setConditions, i)} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                                <MaterialIcons name="close" size={14} color={PRIMARY_COLOR} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.addInputContainer}>
                        <TextInput
                            style={styles.addInput}
                            placeholder="Add condition..."
                            value={conditionInput}
                            onChangeText={setConditionInput}
                            onSubmitEditing={() => addChip(conditions, setConditions, conditionInput, setConditionInput)}
                        />
                        <TouchableOpacity onPress={() => addChip(conditions, setConditions, conditionInput, setConditionInput)}>
                            <MaterialIcons name="add-circle" size={24} color={PRIMARY_COLOR} />
                        </TouchableOpacity>
                    </View>

                    {/* Medications */}
                    <Text style={[styles.label, { marginTop: 12 }]}>Medications</Text>
                    <View style={styles.chipRow}>
                        {medications.map((item, i) => (
                            <TouchableOpacity key={i} onPress={() => removeChip(medications, setMedications, i)} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                                <MaterialIcons name="close" size={14} color={PRIMARY_COLOR} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.addInputContainer}>
                        <TextInput
                            style={styles.addInput}
                            placeholder="Add medication..."
                            value={medicationInput}
                            onChangeText={setMedicationInput}
                            onSubmitEditing={() => addChip(medications, setMedications, medicationInput, setMedicationInput)}
                        />
                        <TouchableOpacity onPress={() => addChip(medications, setMedications, medicationInput, setMedicationInput)}>
                            <MaterialIcons name="add-circle" size={24} color={PRIMARY_COLOR} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Emergency Contact */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Emergency Contact</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Contact Name"
                        value={emergencyContactName}
                        onChangeText={setEmergencyContactName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Contact Phone"
                        value={emergencyContactPhone}
                        onChangeText={setEmergencyContactPhone}
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={{ height: 40 }} />

                <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.disabledButton]}
                    onPress={handleCreateProfile}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Save Profile</Text>}
                </TouchableOpacity>

                <View style={{ height: 40 }} />

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_LIGHT,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: BG_LIGHT,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEXT_DARK,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEXT_DARK,
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: TEXT_DARK,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 8,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(229, 55, 52, 0.1)',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 4,
    },
    chipText: {
        color: PRIMARY_COLOR,
        fontWeight: '500',
        fontSize: 14,
    },
    addInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addInput: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_COLOR,
        paddingVertical: 8,
        fontSize: 16,
        color: TEXT_DARK,
    },
    primaryButton: {
        backgroundColor: PRIMARY_COLOR,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
