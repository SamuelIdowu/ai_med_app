
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MedicalProfileService, MedicalProfile } from '../services/medicalProfileService';

const PRIMARY_COLOR = '#e53734';
const BG_LIGHT = '#f8f6f6';
const CARD_LIGHT = '#ffffff';
const TEXT_LIGHT = '#1b0e0e';
const TEXT_SECONDARY = '#6b5f5f';
const BORDER_COLOR = '#e5e7eb';

export const MedicalProfileScreen = () => {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<MedicalProfile>({
        fullName: '',
        dob: '',
        bloodType: '',
        allergies: [],
        medications: [],
        conditions: [],
        emergencyContact: { name: '', relationship: '', phone: '' },
        photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJA9LSpd2KSkkgCREqeITv1KwHr5lafiLSeZfGHAP1FAiqSw2UIcMoAU0hk6J6tmyJ6Oynqte1ZEQpXdibIhFAI4fEf_UeYkLFREEzUX_ox4G3lfqDzwy4Z096KAg0GzhrqHUhnvkPKHEelsPnze8wUpzFymzsvCn3jwJiqr_0mWP4ibABKR538A7Lq_zH0StNQ0JZxAHxZdArKwrQaQb6f2kgxZ2OKu7dr0aYDdGLLu04kVy2Uu8pcIPNZ7rTZ3GDEhWeo0eMhI0',
    });

    // Input states for chips
    const [allergyInput, setAllergyInput] = useState('');
    const [medicationInput, setMedicationInput] = useState('');
    const [conditionInput, setConditionInput] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const savedProfile = await MedicalProfileService.getProfile();
        if (savedProfile) {
            setProfile(savedProfile);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            await MedicalProfileService.saveProfile(profile);
            Alert.alert('Success', 'Profile saved successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to save profile');
        }
    };

    const addChip = (field: 'allergies' | 'medications' | 'conditions', value: string, setter: (val: string) => void) => {
        if (!value.trim()) return;
        setProfile(prev => ({
            ...prev,
            [field]: [...prev[field], value.trim()]
        }));
        setter('');
    };

    const removeChip = (field: 'allergies' | 'medications' | 'conditions', index: number) => {
        setProfile(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const updateContact = (field: keyof typeof profile.emergencyContact, value: string) => {
        setProfile(prev => ({
            ...prev,
            emergencyContact: { ...prev.emergencyContact, [field]: value }
        }));
    };

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "Permission to access camera roll is required!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setProfile(prev => ({ ...prev, photoUrl: result.assets[0].uri }));
        }
    };

    const handleDownloadData = () => {
        Alert.alert("Download Data", "Your medical profile data is being prepared for download.");
    };

    const handleDeleteData = () => {
        Alert.alert(
            "Delete Data",
            "Are you sure you want to delete your medical profile? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await MedicalProfileService.clearProfile();
                            setProfile({
                                fullName: '',
                                dob: '',
                                bloodType: '',
                                allergies: [],
                                medications: [],
                                conditions: [],
                                emergencyContact: { name: '', relationship: '', phone: '' },
                            });
                            Alert.alert("Success", "Your data has been deleted.");
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete data.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <StatusBar style="dark" />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('Home');
                        }
                    }}
                    style={styles.backButton}
                >
                    <MaterialCommunityIcons name="chevron-left" size={32} color={TEXT_LIGHT} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Medical Profile</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                    <MaterialCommunityIcons name="cog" size={28} color={TEXT_LIGHT} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: profile.photoUrl }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editAvatarButton} onPress={handlePickImage}>
                            <MaterialCommunityIcons name="pencil" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{profile.fullName || 'Alex Doe'}</Text>
                        <Text style={styles.profileEmail}>alex.doe@email.com</Text>
                    </View>
                </View>

                {/* Personal Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Alex Doe"
                            value={profile.fullName}
                            onChangeText={(text) => setProfile({ ...profile, fullName: text })}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Date of Birth</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="YYYY-MM-DD"
                                value={profile.dob}
                                onChangeText={(text) => setProfile({ ...profile, dob: text })}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Blood Type</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="O+"
                                value={profile.bloodType}
                                onChangeText={(text) => setProfile({ ...profile, bloodType: text })}
                            />
                        </View>
                    </View>
                </View>

                {/* Allergies */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Allergies</Text>
                    <View style={styles.chipContainer}>
                        {profile.allergies.map((item, index) => (
                            <View key={index} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                                <TouchableOpacity onPress={() => removeChip('allergies', index)}>
                                    <MaterialCommunityIcons name="close" size={16} color={PRIMARY_COLOR} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                    <View style={styles.addChipContainer}>
                        <TextInput
                            style={styles.chipInput}
                            placeholder="Add allergy..."
                            value={allergyInput}
                            onChangeText={setAllergyInput}
                            onSubmitEditing={() => addChip('allergies', allergyInput, setAllergyInput)}
                        />
                        <TouchableOpacity onPress={() => addChip('allergies', allergyInput, setAllergyInput)}>
                            <MaterialCommunityIcons name="plus-circle" size={32} color={PRIMARY_COLOR} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Chronic Conditions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Chronic Conditions</Text>
                    <View style={styles.chipContainer}>
                        {profile.conditions.map((item, index) => (
                            <View key={index} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                                <TouchableOpacity onPress={() => removeChip('conditions', index)}>
                                    <MaterialCommunityIcons name="close" size={16} color={PRIMARY_COLOR} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                    <View style={styles.addChipContainer}>
                        <TextInput
                            style={styles.chipInput}
                            placeholder="Add condition..."
                            value={conditionInput}
                            onChangeText={setConditionInput}
                            onSubmitEditing={() => addChip('conditions', conditionInput, setConditionInput)}
                        />
                        <TouchableOpacity onPress={() => addChip('conditions', conditionInput, setConditionInput)}>
                            <MaterialCommunityIcons name="plus-circle" size={32} color={PRIMARY_COLOR} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Medications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Medications</Text>
                    <View style={styles.chipContainer}>
                        {profile.medications.map((item, index) => (
                            <View key={index} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                                <TouchableOpacity onPress={() => removeChip('medications', index)}>
                                    <MaterialCommunityIcons name="close" size={16} color={PRIMARY_COLOR} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                    <View style={styles.addChipContainer}>
                        <TextInput
                            style={styles.chipInput}
                            placeholder="Add medication..."
                            value={medicationInput}
                            onChangeText={setMedicationInput}
                            onSubmitEditing={() => addChip('medications', medicationInput, setMedicationInput)}
                        />
                        <TouchableOpacity onPress={() => addChip('medications', medicationInput, setMedicationInput)}>
                            <MaterialCommunityIcons name="plus-circle" size={32} color={PRIMARY_COLOR} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Emergency Contact */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Emergency Contact</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contact's Name"
                            value={profile.emergencyContact.name}
                            onChangeText={(text) => updateContact('name', text)}
                        />
                    </View>
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Relationship</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Spouse"
                                value={profile.emergencyContact.relationship}
                                onChangeText={(text) => updateContact('relationship', text)}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Phone</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="555-0123"
                                keyboardType="phone-pad"
                                value={profile.emergencyContact.phone}
                                onChangeText={(text) => updateContact('phone', text)}
                            />
                        </View>
                    </View>
                </View>


            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerButtons}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Save Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadData}>
                        <Text style={styles.downloadButtonText}>Download My Data</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteData}>
                        <Text style={styles.deleteButtonText}>Delete My Data</Text>
                    </TouchableOpacity>
                </View>
            </View>
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
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: BG_LIGHT,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEXT_LIGHT,
        flex: 1,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEXT_LIGHT,
        marginBottom: 12,
    },
    inputGroup: {
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: TEXT_SECONDARY,
        marginBottom: 6,
    },
    input: {
        backgroundColor: CARD_LIGHT,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: TEXT_LIGHT,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(229, 55, 52, 0.1)',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 6,
    },
    chipText: {
        color: PRIMARY_COLOR,
        fontWeight: '500',
    },
    addChipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chipInput: {
        flex: 1,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: BORDER_COLOR,
        paddingVertical: 8,
        fontSize: 16,
        color: TEXT_LIGHT,
    },
    footer: {
        padding: 16,
        backgroundColor: BG_LIGHT,
        borderTopWidth: 1,
        borderTopColor: BORDER_COLOR,
    },
    saveButton: {
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footerButtons: {
        flexDirection: 'column',
        gap: 12,
    },
    downloadButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    downloadButtonText: {
        color: PRIMARY_COLOR,
        fontSize: 16,
        fontWeight: '500',
    },
    deleteButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    deleteButtonText: {
        color: '#dc2626',
        fontSize: 16,
        fontWeight: '500',
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: '#eee',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: PRIMARY_COLOR,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: BG_LIGHT,
    },
    profileInfo: {
        alignItems: 'center',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: TEXT_LIGHT,
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 16,
        color: TEXT_SECONDARY,
    },
});
