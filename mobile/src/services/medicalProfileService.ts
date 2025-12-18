
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export interface MedicalProfile {
    id?: string;
    fullName: string;
    dob: string;
    bloodType: string;
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
            // Try fetching from persistent local storage first
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
            let profile = jsonValue != null ? JSON.parse(jsonValue) : null;

            // Attempt to fetch latest from backend
            try {
                const response = await api.get('/profile');
                if (response.data) {
                    profile = response.data;
                    // Update local storage
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
                }
            } catch (apiError: any) {
                console.log('Backend profile fetch failed, using local', {
                    message: apiError.message,
                    baseUrl: api.defaults.baseURL,
                    endpoint: '/profile',
                    code: apiError.code
                });
            }

            return profile;
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

            // Sync to Backend
            try {
                await api.post('/profile', profile);
            } catch (apiError) {
                console.error('Failed to sync profile', apiError);
                // We don't throw here to ensure local save is respected
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
