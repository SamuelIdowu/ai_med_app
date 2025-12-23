
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
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
    const [isEditing, setIsEditing] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [profile, setProfile] = useState<MedicalProfile>({
        email: '',
        fullName: '',
        dob: new Date().toISOString().split('T')[0], // Default to specific format if needed, usually string from backend
        bloodType: 'O+',
        gender: 'Male',
        genotype: 'AA',
        weight: '',
        height: '',
        allergies: [],
        medications: [],
        conditions: [],
        emergencyContact: { name: '', relationship: '', phone: '' },
        photoUrl: '',
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
            // Ensure compatibility with old data that might miss new fields
            setProfile(prev => ({
                ...prev, // Use defaults
                ...savedProfile,
            }));
        }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            await MedicalProfileService.saveProfile(profile);
            setIsEditing(false);
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
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
                                gender: 'Male',
                                genotype: 'AA',
                                weight: '',
                                height: '',
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
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                    <Text style={{ color: PRIMARY_COLOR, fontSize: 16, fontWeight: '600' }}>
                        {isEditing ? 'Cancel' : 'Edit'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={profile.photoUrl ? { uri: profile.photoUrl } : { uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuATadtnpGLy0gIduxb0wLuTjC4m3cugufnBvj_-eDt3VcCWxmlDfo-iJkZw2SQdXjMuzPDU6Lh4u8Ezc112KvkuSrZrU5o3yvW_pCzkvWCxeapuIOEPGj6rFXqgQiye46fwjvKwuLuZpnuQSpvNIBVmKGmMncLEBc0z_cZXIR5yoYCqfFcve26iQ3iqg2Y71PRKR3Cf8u5maCzGJEY-arVr4f3Je-7BAp-X31YCVJViOsoMN5Q5lHWLcP82NFa5nqAFJn7X23037JQ" }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editAvatarButton} onPress={handlePickImage} disabled={!isEditing}>
                            {isEditing && <MaterialCommunityIcons name="pencil" size={20} color="white" />}
                        </TouchableOpacity>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{profile.fullName || 'Guest'}</Text>
                        <Text style={styles.profileEmail}>{profile.email || ''}</Text>
                    </View>
                </View>

                {/* Personal Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    {/* Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                placeholder="Your Name"
                                value={profile.fullName}
                                onChangeText={(text) => setProfile({ ...profile, fullName: text })}
                            />
                        ) : (
                            <Text style={styles.valueText}>{profile.fullName}</Text>
                        )}
                    </View>

                    {/* DOB & Blood Type */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Date of Birth</Text>
                            {isEditing ? (
                                <>
                                    <TouchableOpacity
                                        style={styles.input}
                                        onPress={() => setShowDatePicker(prev => !prev)}
                                    >
                                        <Text style={{ color: TEXT_LIGHT }}>{profile.dob}</Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={new Date(profile.dob || Date.now())}
                                            mode="date"
                                            display="default"
                                            onChange={(event, date) => {
                                                setShowDatePicker(Platform.OS === 'ios');
                                                if (date) {
                                                    setProfile({ ...profile, dob: date.toISOString().split('T')[0] });
                                                }
                                            }}
                                        />
                                    )}
                                </>
                            ) : (
                                <Text style={styles.valueText}>{profile.dob}</Text>
                            )}
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Blood Type</Text>
                            {isEditing ? (
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={profile.bloodType}
                                        onValueChange={(itemValue) => setProfile({ ...profile, bloodType: itemValue })}
                                    >
                                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(type => (
                                            <Picker.Item key={type} label={type} value={type} />
                                        ))}
                                    </Picker>
                                </View>
                            ) : (
                                <Text style={styles.valueText}>{profile.bloodType}</Text>
                            )}
                        </View>
                    </View>

                    {/* Gender & Genotype */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Gender</Text>
                            {isEditing ? (
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={profile.gender}
                                        onValueChange={(val) => setProfile({ ...profile, gender: val })}
                                    >
                                        <Picker.Item label="Male" value="Male" />
                                        <Picker.Item label="Female" value="Female" />
                                        <Picker.Item label="Other" value="Other" />
                                    </Picker>
                                </View>
                            ) : (
                                <Text style={styles.valueText}>{profile.gender}</Text>
                            )}
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Genotype</Text>
                            {isEditing ? (
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={profile.genotype}
                                        onValueChange={(val) => setProfile({ ...profile, genotype: val })}
                                    >
                                        {['AA', 'AS', 'SS', 'AC', 'SC', 'CC'].map(g => (
                                            <Picker.Item key={g} label={g} value={g} />
                                        ))}
                                    </Picker>
                                </View>
                            ) : (
                                <Text style={styles.valueText}>{profile.genotype}</Text>
                            )}
                        </View>
                    </View>

                    {/* Weight & Height */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Weight (kg)</Text>
                            {isEditing ? (
                                <TextInput
                                    style={styles.input}
                                    placeholder="kg"
                                    keyboardType="numeric"
                                    value={profile.weight}
                                    onChangeText={(val) => setProfile({ ...profile, weight: val })}
                                />
                            ) : (
                                <Text style={styles.valueText}>{profile.weight ? `${profile.weight} kg` : '-'}</Text>
                            )}
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Height (cm)</Text>
                            {isEditing ? (
                                <TextInput
                                    style={styles.input}
                                    placeholder="cm"
                                    keyboardType="numeric"
                                    value={profile.height}
                                    onChangeText={(val) => setProfile({ ...profile, height: val })}
                                />
                            ) : (
                                <Text style={styles.valueText}>{profile.height ? `${profile.height} cm` : '-'}</Text>
                            )}
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
                                {isEditing && (
                                    <TouchableOpacity onPress={() => removeChip('allergies', index)}>
                                        <MaterialCommunityIcons name="close" size={16} color={PRIMARY_COLOR} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                    {isEditing && (
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
                    )}
                </View>

                {/* Chronic Conditions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Chronic Conditions</Text>
                    <View style={styles.chipContainer}>
                        {profile.conditions.map((item, index) => (
                            <View key={index} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                                {isEditing && (
                                    <TouchableOpacity onPress={() => removeChip('conditions', index)}>
                                        <MaterialCommunityIcons name="close" size={16} color={PRIMARY_COLOR} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                    {isEditing && (
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
                    )}
                </View>

                {/* Medications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Medications</Text>
                    <View style={styles.chipContainer}>
                        {profile.medications.map((item, index) => (
                            <View key={index} style={styles.chip}>
                                <Text style={styles.chipText}>{item}</Text>
                                {isEditing && (
                                    <TouchableOpacity onPress={() => removeChip('medications', index)}>
                                        <MaterialCommunityIcons name="close" size={16} color={PRIMARY_COLOR} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                    {isEditing && (
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
                    )}
                </View>

                {/* Emergency Contact */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Emergency Contact</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                placeholder="Contact's Name"
                                value={profile.emergencyContact.name}
                                onChangeText={(text) => updateContact('name', text)}
                            />
                        ) : (
                            <Text style={styles.valueText}>{profile.emergencyContact.name}</Text>
                        )}
                    </View>
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Relationship</Text>
                            {isEditing ? (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Spouse"
                                    value={profile.emergencyContact.relationship}
                                    onChangeText={(text) => updateContact('relationship', text)}
                                />
                            ) : (
                                <Text style={styles.valueText}>{profile.emergencyContact.relationship}</Text>
                            )}
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Phone</Text>
                            {isEditing ? (
                                <TextInput
                                    style={styles.input}
                                    placeholder="555-0123"
                                    keyboardType="phone-pad"
                                    value={profile.emergencyContact.phone}
                                    onChangeText={(text) => updateContact('phone', text)}
                                />
                            ) : (
                                <Text style={styles.valueText}>{profile.emergencyContact.phone}</Text>
                            )}
                        </View>
                    </View>
                </View>


            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerButtons}>
                    {isEditing && (
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    )}
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
    valueText: {
        fontSize: 16,
        color: TEXT_LIGHT,
        paddingVertical: 12,
        paddingHorizontal: 12, // Match input padding for alignment
        backgroundColor: 'transparent',
    },
    pickerContainer: {
        backgroundColor: CARD_LIGHT,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 8,
        overflow: 'hidden',
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
