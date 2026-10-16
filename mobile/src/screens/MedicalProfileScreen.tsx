import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MedicalProfileService, MedicalProfile, EmergencyContact } from '../services/medicalProfileService';
import { useAuth } from '../context/AuthContext';
import { MedicalCard } from '../components/ui/MedicalCard';
import { BottomTabBar } from '../components/BottomTabBar';
import { theme } from '../theme';

const COMMON_DIRECTIVES = [
  'Organ Donor',
  'Pacemaker Installed',
  'Diabetic Alert',
  'Carries EpiPen',
  'Asthma Inhaler',
  'Blood Thinners',
  'Latex Allergy',
  'DNR Order',
];

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'];

export const MedicalProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditingModal, setIsEditingModal] = useState(false);

  // Active Profile State
  const [profile, setProfile] = useState<MedicalProfile>({
    email: user?.email || '',
    fullName: (user?.user_metadata as any)?.name || (user?.user_metadata as any)?.full_name || '',
    dob: '',
    bloodType: '',
    gender: '',
    weight: '',
    height: '',
    allergies: [],
    medications: [],
    conditions: [],
    medicalDirectives: [],
    emergencyNotes: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
    secondaryEmergencyContact: undefined,
    photoUrl: '',
  });

  // Edit Buffer State (used inside the edit modal)
  const [editForm, setEditForm] = useState<MedicalProfile>(profile);
  const [allergyInput, setAllergyInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [customDirectiveInput, setCustomDirectiveInput] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await MedicalProfileService.getProfile();
      if (savedProfile) {
        setProfile((prev) => ({
          ...prev,
          ...savedProfile,
          // Ensure arrays are initialized safely without fallback to old dummy data
          allergies: Array.isArray(savedProfile.allergies) ? savedProfile.allergies : (prev.allergies || []),
          medications: Array.isArray(savedProfile.medications) ? savedProfile.medications : (prev.medications || []),
          conditions: Array.isArray(savedProfile.conditions) ? savedProfile.conditions : (prev.conditions || []),
          medicalDirectives: Array.isArray(savedProfile.medicalDirectives) ? savedProfile.medicalDirectives : (prev.medicalDirectives || []),
        }));
      }
    } catch (e) {
      console.warn('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditForm({ ...profile });
    setAllergyInput('');
    setMedicationInput('');
    setConditionInput('');
    setCustomDirectiveInput('');
    setIsEditingModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      await MedicalProfileService.saveProfile(editForm);
      setProfile(editForm);
      setIsEditingModal(false);
      Alert.alert('Saved', 'Emergency medical profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save medical profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Camera roll access is needed to update photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setEditForm((prev) => ({ ...prev, photoUrl: result.assets[0].uri }));
    }
  };

  const handleDialContact = (phone: string, name: string) => {
    if (!phone) {
      Alert.alert('No Phone', `No phone number configured for ${name}.`);
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const telUrl = Platform.select({
      ios: `telprompt:${cleanPhone}`,
      default: `tel:${cleanPhone}`,
    });
    Linking.openURL(telUrl).catch(() => {
      Alert.alert('Call Failed', `Could not initiate call to ${phone}`);
    });
  };

  // Helper calculation for Age from DOB
  const calculateAge = (dobString?: string): string => {
    if (!dobString) return '';
    try {
      const birthDate = new Date(dobString);
      const diffMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(diffMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      return isNaN(age) ? '' : `${age} yrs`;
    } catch {
      return '';
    }
  };

  // Chip helpers for Edit Form
  const addChip = (
    field: 'allergies' | 'medications' | 'conditions' | 'medicalDirectives',
    value: string,
    clearFn: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setEditForm((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), trimmed],
    }));
    clearFn();
  };

  const removeChip = (
    field: 'allergies' | 'medications' | 'conditions' | 'medicalDirectives',
    index: number
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
  };

  const toggleDirective = (directive: string) => {
    setEditForm((prev) => {
      const current = prev.medicalDirectives || [];
      const exists = current.includes(directive);
      return {
        ...prev,
        medicalDirectives: exists
          ? current.filter((d) => d !== directive)
          : [...current, directive],
      };
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F1115" />
      </View>
    );
  }

  const ageStr = calculateAge(profile.dob);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* =================================================================== */}
      {/* 1. TOP HEADER */}
      {/* =================================================================== */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
          style={styles.backCircle}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#0F1115" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Medical Profile</Text>

        <TouchableOpacity
          onPress={handleOpenEditModal}
          style={styles.editPill}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="pencil-outline" size={16} color="#0F1115" />
          <Text style={styles.editPillText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================================== */}
        {/* 2. HERO PROFILE CARD (Photo, Name, Blood Group, Age) */}
        {/* =================================================================== */}
        <MedicalCard style={styles.heroCard}>
          <View style={styles.heroImageWrapper}>
            {profile.photoUrl ? (
              <Image
                source={{
                  uri: profile.photoUrl,
                }}
                style={styles.heroAvatar}
              />
            ) : (
              <View style={[styles.heroAvatar, styles.heroAvatarPlaceholder]}>
                <MaterialCommunityIcons name="account" size={72} color="#9CA3AF" />
              </View>
            )}
          </View>

          <View style={styles.heroCardBottom}>
            <View style={styles.heroNameCol}>
              <Text style={styles.heroName}>{profile.fullName || user?.email?.split('@')[0] || 'Patient'}</Text>
              <Text style={styles.heroSub}>
                {profile.gender || 'Patient'}
                {ageStr ? ` • ${ageStr}` : ''}
              </Text>
            </View>

            <View style={styles.bloodTypePill}>
              <MaterialCommunityIcons name="water" size={16} color="#0F1115" />
              <Text style={styles.bloodTypeText}>{profile.bloodType || '—'}</Text>
            </View>
          </View>
        </MedicalCard>

        {/* =================================================================== */}
        {/* 3. BIOMETRICS STATS SUMMARY (Height, Weight, Blood Group) */}
        {/* =================================================================== */}
        <View style={styles.biometricsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Blood Group</Text>
            <Text style={styles.statValue}>{profile.bloodType || '—'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Weight</Text>
            <Text style={styles.statValue}>{profile.weight ? `${profile.weight}` : '—'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Height</Text>
            <Text style={styles.statValue}>{profile.height ? `${profile.height}` : '—'}</Text>
          </View>
        </View>

        {/* =================================================================== */}
        {/* 4. EMERGENCY MEDICAL DIRECTIVES & ALERTS */}
        {/* =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="shield-alert-outline" size={18} color="#0F1115" />
            <Text style={styles.sectionHeader}>Emergency Directives & Alerts</Text>
          </View>

          {profile.medicalDirectives && profile.medicalDirectives.length > 0 ? (
            <View style={styles.pillWrap}>
              {profile.medicalDirectives.map((directive, index) => (
                <View key={index} style={styles.directiveBadge}>
                  <MaterialCommunityIcons name="alert-circle-check" size={15} color="#0F1115" />
                  <Text style={styles.directiveBadgeText}>{directive}</Text>
                </View>
              ))}
            </View>
          ) : (
            <MedicalCard style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No critical medical directives specified</Text>
            </MedicalCard>
          )}
        </View>

        {/* =================================================================== */}
        {/* 5. SEVERE ALLERGIES & CONTRAINDICATIONS */}
        {/* =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="alert-decagram-outline" size={18} color="#0F1115" />
            <Text style={styles.sectionHeader}>Severe Allergies</Text>
          </View>

          {profile.allergies && profile.allergies.length > 0 ? (
            <View style={styles.pillWrap}>
              {profile.allergies.map((allergy, index) => (
                <View key={index} style={styles.allergyBadge}>
                  <MaterialCommunityIcons name="close-circle-outline" size={14} color="#0F1115" />
                  <Text style={styles.allergyBadgeText}>{allergy}</Text>
                </View>
              ))}
            </View>
          ) : (
            <MedicalCard style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No known drug or environmental allergies</Text>
            </MedicalCard>
          )}
        </View>

        {/* =================================================================== */}
        {/* 6. CHRONIC CONDITIONS */}
        {/* =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="heart-pulse" size={18} color="#0F1115" />
            <Text style={styles.sectionHeader}>Chronic Medical Conditions</Text>
          </View>

          {profile.conditions && profile.conditions.length > 0 ? (
            <View style={styles.pillWrap}>
              {profile.conditions.map((condition, index) => (
                <View key={index} style={styles.conditionBadge}>
                  <Text style={styles.conditionBadgeText}>{condition}</Text>
                </View>
              ))}
            </View>
          ) : (
            <MedicalCard style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No chronic medical conditions listed</Text>
            </MedicalCard>
          )}
        </View>

        {/* =================================================================== */}
        {/* 7. CURRENT MEDICATIONS */}
        {/* =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="pill" size={18} color="#0F1115" />
            <Text style={styles.sectionHeader}>Current Medications</Text>
          </View>

          {profile.medications && profile.medications.length > 0 ? (
            profile.medications.map((med, index) => (
              <MedicalCard key={index} style={styles.medicationRow}>
                <View style={styles.medIconBox}>
                  <MaterialCommunityIcons name="pill" size={18} color="#0F1115" />
                </View>
                <Text style={styles.medicationText}>{med}</Text>
              </MedicalCard>
            ))
          ) : (
            <MedicalCard style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No active medications</Text>
            </MedicalCard>
          )}
        </View>

        {/* =================================================================== */}
        {/* 8. EMERGENCY NOTES FOR FIRST RESPONDERS */}
        {/* =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="notebook-outline" size={18} color="#0F1115" />
            <Text style={styles.sectionHeader}>Paramedic & Responder Notes</Text>
          </View>

          <MedicalCard style={styles.notesCard}>
            <Text style={styles.notesText}>
              {profile.emergencyNotes ||
                'No special emergency instructions provided. First responders should follow standard trauma protocols.'}
            </Text>
          </MedicalCard>
        </View>

        {/* =================================================================== */}
        {/* 9. EMERGENCY CONTACTS (ICE) - One-Tap Dial */}
        {/* =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="phone-alert-outline" size={18} color="#0F1115" />
            <Text style={styles.sectionHeader}>Emergency Contacts (ICE)</Text>
          </View>

          {/* Primary Contact */}
          {profile.emergencyContact?.name ? (
            <MedicalCard style={styles.contactCard}>
              <View style={styles.contactLeft}>
                <View style={styles.contactAvatar}>
                  <MaterialCommunityIcons name="account" size={20} color="#0F1115" />
                </View>
                <View style={styles.contactDetails}>
                  <View style={styles.contactBadgeRow}>
                    <Text style={styles.contactName}>
                      {profile.emergencyContact.name}
                    </Text>
                    <View style={styles.primaryPill}>
                      <Text style={styles.primaryPillText}>Primary</Text>
                    </View>
                  </View>
                  <Text style={styles.contactRelationship}>
                    {profile.emergencyContact.relationship || 'Emergency Contact'}
                  </Text>
                  <Text style={styles.contactPhone}>
                    {profile.emergencyContact.phone || 'No phone provided'}
                  </Text>
                </View>
              </View>

              {profile.emergencyContact.phone ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.callButton}
                  onPress={() =>
                    handleDialContact(
                      profile.emergencyContact?.phone || '',
                      profile.emergencyContact?.name || 'Primary Contact'
                    )
                  }
                >
                  <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </MedicalCard>
          ) : (
            <MedicalCard style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No primary emergency contact specified</Text>
            </MedicalCard>
          )}

          {/* Secondary Contact (Backup) */}
          {profile.secondaryEmergencyContact && profile.secondaryEmergencyContact.name ? (
            <MedicalCard style={[styles.contactCard, { marginTop: 10 }]}>
              <View style={styles.contactLeft}>
                <View style={styles.contactAvatar}>
                  <MaterialCommunityIcons name="account-outline" size={20} color="#0F1115" />
                </View>
                <View style={styles.contactDetails}>
                  <View style={styles.contactBadgeRow}>
                    <Text style={styles.contactName}>
                      {profile.secondaryEmergencyContact.name}
                    </Text>
                    <View style={styles.backupPill}>
                      <Text style={styles.backupPillText}>Backup</Text>
                    </View>
                  </View>
                  <Text style={styles.contactRelationship}>
                    {profile.secondaryEmergencyContact.relationship || 'Emergency Contact'}
                  </Text>
                  <Text style={styles.contactPhone}>
                    {profile.secondaryEmergencyContact.phone || 'No phone'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.callButton}
                onPress={() =>
                  handleDialContact(
                    profile.secondaryEmergencyContact?.phone || '',
                    profile.secondaryEmergencyContact?.name || 'Secondary Contact'
                  )
                }
              >
                <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </MedicalCard>
          ) : null}
        </View>

        {/* =================================================================== */}
        {/* 10. PRIVACY & SENSITIVITY SHIELD */}
        {/* =================================================================== */}
        <View style={styles.privacyBanner}>
          <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#0F1115" />
          <View style={styles.privacyTextCol}>
            <Text style={styles.privacyTitle}>Encrypted & Data-Minimized</Text>
            <Text style={styles.privacyDesc}>
              Genetic markers and non-essential identifiers are never stored. Your emergency health data remains locally cached on this device.
            </Text>
          </View>
        </View>

        {/* Space for bottom floating nav pill */}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* Floating Bottom Nav Pill */}
      <BottomTabBar activeRoute="Profile" />

      {/* =================================================================== */}
      {/* 11. FULL PROFILE EDIT MODAL */}
      {/* =================================================================== */}
      <Modal
        visible={isEditingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditingModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsEditingModal(false)}
              style={styles.modalHeaderCancel}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Edit Medical Profile</Text>
            <TouchableOpacity
              onPress={handleSaveProfile}
              style={styles.modalHeaderSave}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar Section */}
            <View style={styles.modalAvatarRow}>
              {editForm.photoUrl ? (
                <Image
                  source={{
                    uri: editForm.photoUrl,
                  }}
                  style={styles.modalAvatarImage}
                />
              ) : (
                <View style={[styles.modalAvatarImage, styles.modalAvatarPlaceholder]}>
                  <MaterialCommunityIcons name="account" size={32} color="#9CA3AF" />
                </View>
              )}
              <TouchableOpacity
                style={styles.modalChangePhotoBtn}
                onPress={handlePickImage}
              >
                <MaterialCommunityIcons name="camera" size={16} color="#0F1115" />
                <Text style={styles.modalChangePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Basic Information */}
            <Text style={styles.formSectionTitle}>Personal & Physical</Text>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Full Legal / Preferred Name</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.fullName}
                onChangeText={(val) => setEditForm((p) => ({ ...p, fullName: val }))}
                placeholder="e.g. Max Egger"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Date of Birth (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.dob}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, dob: val }))}
                  placeholder="1995-06-15"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Gender / Sex</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.gender}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, gender: val }))}
                  placeholder="Male / Female"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Blood Type Selection */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Blood Type</Text>
              <View style={styles.bloodTypePickerRow}>
                {BLOOD_TYPES.map((bt) => {
                  const isSelected = editForm.bloodType === bt;
                  return (
                    <TouchableOpacity
                      key={bt}
                      onPress={() => setEditForm((p) => ({ ...p, bloodType: bt }))}
                      style={[
                        styles.bloodTypeOption,
                        isSelected && styles.bloodTypeOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bloodTypeOptionText,
                          isSelected && styles.bloodTypeOptionTextSelected,
                        ]}
                      >
                        {bt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Weight</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.weight}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, weight: val }))}
                  placeholder="e.g. 74 kg"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Height</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.height}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, height: val }))}
                  placeholder="e.g. 180 cm"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Medical Directives Toggle / Presets */}
            <Text style={styles.formSectionTitle}>Directives & Alerts</Text>
            <View style={styles.directiveChipsGrid}>
              {COMMON_DIRECTIVES.map((directive) => {
                const isActive = (editForm.medicalDirectives || []).includes(directive);
                return (
                  <TouchableOpacity
                    key={directive}
                    onPress={() => toggleDirective(directive)}
                    style={[
                      styles.directiveToggleChip,
                      isActive && styles.directiveToggleChipActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isActive ? 'check' : 'plus'}
                      size={14}
                      color={isActive ? '#FFFFFF' : '#0F1115'}
                    />
                    <Text
                      style={[
                        styles.directiveToggleText,
                        isActive && styles.directiveToggleTextActive,
                      ]}
                    >
                      {directive}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Directive Input */}
            <View style={styles.chipInputRow}>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                value={customDirectiveInput}
                onChangeText={setCustomDirectiveInput}
                placeholder="Add custom alert..."
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={styles.addChipBtn}
                onPress={() =>
                  addChip('medicalDirectives', customDirectiveInput, () =>
                    setCustomDirectiveInput('')
                  )
                }
              >
                <Text style={styles.addChipBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Severe Allergies */}
            <Text style={styles.formSectionTitle}>Allergies</Text>
            <View style={styles.pillWrap}>
              {(editForm.allergies || []).map((item, idx) => (
                <View key={idx} style={styles.editPillChip}>
                  <Text style={styles.editPillChipText}>{item}</Text>
                  <TouchableOpacity
                    onPress={() => removeChip('allergies', idx)}
                    style={styles.removeChipIcon}
                  >
                    <MaterialCommunityIcons name="close" size={14} color="#0F1115" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.chipInputRow}>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                value={allergyInput}
                onChangeText={setAllergyInput}
                placeholder="e.g. Penicillin, Peanuts..."
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={styles.addChipBtn}
                onPress={() =>
                  addChip('allergies', allergyInput, () => setAllergyInput(''))
                }
              >
                <Text style={styles.addChipBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Chronic Conditions */}
            <Text style={styles.formSectionTitle}>Chronic Conditions</Text>
            <View style={styles.pillWrap}>
              {(editForm.conditions || []).map((item, idx) => (
                <View key={idx} style={styles.editPillChip}>
                  <Text style={styles.editPillChipText}>{item}</Text>
                  <TouchableOpacity
                    onPress={() => removeChip('conditions', idx)}
                    style={styles.removeChipIcon}
                  >
                    <MaterialCommunityIcons name="close" size={14} color="#0F1115" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.chipInputRow}>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                value={conditionInput}
                onChangeText={setConditionInput}
                placeholder="e.g. Asthma, Hypertension..."
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={styles.addChipBtn}
                onPress={() =>
                  addChip('conditions', conditionInput, () => setConditionInput(''))
                }
              >
                <Text style={styles.addChipBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Medications */}
            <Text style={styles.formSectionTitle}>Current Medications</Text>
            <View style={styles.pillWrap}>
              {(editForm.medications || []).map((item, idx) => (
                <View key={idx} style={styles.editPillChip}>
                  <Text style={styles.editPillChipText}>{item}</Text>
                  <TouchableOpacity
                    onPress={() => removeChip('medications', idx)}
                    style={styles.removeChipIcon}
                  >
                    <MaterialCommunityIcons name="close" size={14} color="#0F1115" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.chipInputRow}>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                value={medicationInput}
                onChangeText={setMedicationInput}
                placeholder="e.g. Salbutamol Inhaler..."
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={styles.addChipBtn}
                onPress={() =>
                  addChip('medications', medicationInput, () => setMedicationInput(''))
                }
              >
                <Text style={styles.addChipBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Responder Notes */}
            <Text style={styles.formSectionTitle}>Emergency Notes for Responders</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={editForm.emergencyNotes}
              onChangeText={(val) => setEditForm((p) => ({ ...p, emergencyNotes: val }))}
              placeholder="Instructions for paramedics, where emergency meds are kept, etc."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />

            {/* Primary Emergency Contact */}
            <Text style={styles.formSectionTitle}>Primary Emergency Contact</Text>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Contact Name</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.emergencyContact?.name}
                onChangeText={(val) =>
                  setEditForm((p) => ({
                    ...p,
                    emergencyContact: { ...p.emergencyContact, name: val },
                  }))
                }
                placeholder="e.g. Sarah Connor"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Relationship</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.emergencyContact?.relationship}
                  onChangeText={(val) =>
                    setEditForm((p) => ({
                      ...p,
                      emergencyContact: { ...p.emergencyContact, relationship: val },
                    }))
                  }
                  placeholder="Spouse, Parent, etc."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={[styles.formField, { flex: 1.2 }]}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.emergencyContact?.phone}
                  onChangeText={(val) =>
                    setEditForm((p) => ({
                      ...p,
                      emergencyContact: { ...p.emergencyContact, phone: val },
                    }))
                  }
                  placeholder="+1 (555) 000-0000"
                  keyboardType="phone-pad"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Secondary Emergency Contact */}
            <Text style={styles.formSectionTitle}>Secondary Emergency Contact (Backup)</Text>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Contact Name</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.secondaryEmergencyContact?.name || ''}
                onChangeText={(val) =>
                  setEditForm((p) => ({
                    ...p,
                    secondaryEmergencyContact: {
                      name: val,
                      relationship: p.secondaryEmergencyContact?.relationship || '',
                      phone: p.secondaryEmergencyContact?.phone || '',
                    },
                  }))
                }
                placeholder="e.g. Dr. Robert Kelly"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Relationship</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.secondaryEmergencyContact?.relationship || ''}
                  onChangeText={(val) =>
                    setEditForm((p) => ({
                      ...p,
                      secondaryEmergencyContact: {
                        name: p.secondaryEmergencyContact?.name || '',
                        relationship: val,
                        phone: p.secondaryEmergencyContact?.phone || '',
                      },
                    }))
                  }
                  placeholder="Sibling, Physician, etc."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={[styles.formField, { flex: 1.2 }]}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.secondaryEmergencyContact?.phone || ''}
                  onChangeText={(val) =>
                    setEditForm((p) => ({
                      ...p,
                      secondaryEmergencyContact: {
                        name: p.secondaryEmergencyContact?.name || '',
                        relationship: p.secondaryEmergencyContact?.relationship || '',
                        phone: val,
                      },
                    }))
                  }
                  placeholder="+1 (555) 000-0000"
                  keyboardType="phone-pad"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F1115',
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F1115',
  },
  contentScroll: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Hero Card
  heroCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  heroImageWrapper: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  heroAvatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  heroCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  heroNameCol: {
    flex: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F1115',
    marginBottom: 2,
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  bloodTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bloodTypeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F1115',
  },

  // Biometrics Row
  biometricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F1115',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F1115',
  },

  // Directives & Badges
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  directiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F1115',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  directiveBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#0F1115',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  allergyBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F1115',
  },
  conditionBadge: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  conditionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },

  // Medications
  medicationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  medIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F1115',
    flex: 1,
  },

  // Notes
  notesCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Contacts
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactDetails: {
    flex: 1,
  },
  contactBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F1115',
  },
  primaryPill: {
    backgroundColor: '#0F1115',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  backupPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  backupPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  contactRelationship: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F1115',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F1115',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // Empty state
  emptyCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyCardText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Privacy Banner
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginTop: 8,
  },
  privacyTextCol: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F1115',
    marginBottom: 2,
  },
  privacyDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },

  // ===========================================================================
  // EDIT MODAL STYLES
  // ===========================================================================
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderCancel: {
    padding: 4,
  },
  modalCancelText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F1115',
  },
  modalHeaderSave: {
    backgroundColor: '#0F1115',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  modalAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
  },
  modalAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalChangePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  modalChangePhotoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F1115',
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F1115',
    marginTop: 18,
    marginBottom: 10,
  },
  formField: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F1115',
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Blood Type Picker Options
  bloodTypePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bloodTypeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bloodTypeOptionSelected: {
    backgroundColor: '#0F1115',
    borderColor: '#0F1115',
  },
  bloodTypeOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  bloodTypeOptionTextSelected: {
    color: '#FFFFFF',
  },

  // Directive Toggle Chips
  directiveChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  directiveToggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  directiveToggleChipActive: {
    backgroundColor: '#0F1115',
    borderColor: '#0F1115',
  },
  directiveToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F1115',
  },
  directiveToggleTextActive: {
    color: '#FFFFFF',
  },

  // Chip input row
  chipInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  addChipBtn: {
    backgroundColor: '#0F1115',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChipBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editPillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editPillChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F1115',
  },
  removeChipIcon: {
    padding: 2,
  },
});
