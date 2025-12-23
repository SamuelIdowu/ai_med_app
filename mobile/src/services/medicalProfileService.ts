
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export interface MedicalProfile {
    id?: string;
    email?: string;
    fullName: string;
    dob: string;
    bloodType: string;
    gender: string;
    genotype: string;
    weight?: string;
    height?: string;
    allergies: string[];
    medications: string[];
    conditions: string[];
    emergencyContact: {
        name: string;
        relationship: string;
        phone: string;
    };
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
                    const profile: MedicalProfile = {
                        email: apiData.users?.email || '',
                        fullName: apiData.users?.name || '',
                        dob: apiData.dob,
                        bloodType: apiData.blood_type,
                        gender: apiData.gender || 'Male',
                        genotype: apiData.genotype || 'AA',
                        weight: apiData.weight,
                        height: apiData.height,
                        allergies: apiData.allergies || [],
                        medications: apiData.medications || [],
                        conditions: apiData.conditions || [],
                        emergencyContact: (apiData.emergency_contacts && apiData.emergency_contacts.length > 0)
                            ? apiData.emergency_contacts[0]
                            : { name: '', relationship: '', phone: '' },
                        photoUrl: apiData.photo_url
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

            // Map to API format
            const apiPayload = {
                fullName: profile.fullName, // handled specially in backend for users table
                dob: profile.dob,
                blood_type: profile.bloodType,
                gender: profile.gender,
                genotype: profile.genotype,
                weight: profile.weight,
                height: profile.height,
                allergies: profile.allergies,
                medications: profile.medications,
                conditions: profile.conditions,
                emergency_contacts: [profile.emergencyContact],
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
