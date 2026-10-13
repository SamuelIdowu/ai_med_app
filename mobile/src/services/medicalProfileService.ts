
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export interface EmergencyContact {
    name: string;
    relationship: string;
    phone: string;
}

export interface MedicalProfile {
    id?: string;
    email?: string;
    fullName: string;
    dob?: string;
    bloodType: string;
    gender?: string;
    genotype?: string; // Kept as optional for backwards compatibility with legacy local storage
    weight?: string;
    height?: string;
    allergies: string[];
    medications: string[];
    conditions: string[];
    medicalDirectives?: string[]; // E.g., 'Organ Donor', 'Carries EpiPen', 'Pacemaker Installed', 'Diabetic Alert'
    emergencyNotes?: string;      // Urgent instructions for first responders/paramedics
    emergencyContact: EmergencyContact;          // Primary ICE
    secondaryEmergencyContact?: EmergencyContact; // Secondary / Backup ICE
    photoUrl?: string;
}

const STORAGE_KEY = '@medical_profile';

export const MedicalProfileService = {
    getProfile: async (): Promise<MedicalProfile | null> => {
        try {
            // Attempt to fetch latest from backend
            try {
                const response = await api.get('/profile');
                if (response.data) {
                    const apiData = response.data;
                    const contacts: EmergencyContact[] = Array.isArray(apiData.emergency_contacts)
                        ? apiData.emergency_contacts
                        : [];

                    const profile: MedicalProfile = {
                        email: apiData.users?.email || '',
                        fullName: apiData.users?.name || '',
                        dob: apiData.dob,
                        bloodType: apiData.blood_type || 'Unknown',
                        gender: apiData.gender || 'Not specified',
                        weight: apiData.weight || '',
                        height: apiData.height || '',
                        allergies: Array.isArray(apiData.allergies) ? apiData.allergies : [],
                        medications: Array.isArray(apiData.medications) ? apiData.medications : [],
                        conditions: Array.isArray(apiData.conditions) ? apiData.conditions : [],
                        medicalDirectives: Array.isArray(apiData.medical_directives)
                            ? apiData.medical_directives
                            : (Array.isArray(apiData.directives) ? apiData.directives : []),
                        emergencyNotes: apiData.emergency_notes || '',
                        emergencyContact: contacts.length > 0
                            ? contacts[0]
                            : { name: '', relationship: '', phone: '' },
                        secondaryEmergencyContact: contacts.length > 1
                            ? contacts[1]
                            : undefined,
                        photoUrl: apiData.photo_url || ''
                    };

                    // Update local storage
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
                    return profile;
                }
            } catch (apiError: any) {
                console.log('Backend profile fetch failed, using local', {
                    message: apiError.message,
                    baseUrl: api.defaults.baseURL,
                    endpoint: '/profile',
                });
            }

            // Fallback to local storage
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (e) {
            console.error('Failed to fetch profile', e);
            return null;
        }
    },

    saveProfile: async (profile: MedicalProfile): Promise<void> => {
        try {
            // Save locally
            const jsonValue = JSON.stringify(profile);
            await AsyncStorage.setItem(STORAGE_KEY, jsonValue);

            // Assemble contacts array for API
            const emergencyContacts: EmergencyContact[] = [];
            if (profile.emergencyContact && profile.emergencyContact.name) {
                emergencyContacts.push(profile.emergencyContact);
            }
            if (profile.secondaryEmergencyContact && profile.secondaryEmergencyContact.name) {
                emergencyContacts.push(profile.secondaryEmergencyContact);
            }

            // Map to API format
            const apiPayload = {
                fullName: profile.fullName,
                dob: profile.dob,
                blood_type: profile.bloodType,
                gender: profile.gender,
                weight: profile.weight,
                height: profile.height,
                allergies: profile.allergies,
                medications: profile.medications,
                conditions: profile.conditions,
                medical_directives: profile.medicalDirectives || [],
                emergency_notes: profile.emergencyNotes || '',
                emergency_contacts: emergencyContacts,
                photo_url: profile.photoUrl
            };

            // Sync to Backend
            try {
                await api.post('/profile', apiPayload);
            } catch (apiError) {
                console.error('Failed to sync profile', apiError);
            }
        } catch (e) {
            console.error('Failed to save profile', e);
            throw e;
        }
    },

    clearProfile: async (): Promise<void> => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear profile', e);
        }
    }
};
