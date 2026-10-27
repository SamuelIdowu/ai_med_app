import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { supabase } from './supabase';

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
  emergencyNotes?: string; // Urgent instructions for first responders/paramedics
  emergencyContact: EmergencyContact; // Primary ICE
  secondaryEmergencyContact?: EmergencyContact; // Secondary / Backup ICE
  photoUrl?: string;
}

const STORAGE_KEY = '@medical_profile';

const calculateAge = (dob?: string): number | null => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 && age <= 120 ? age : null;
};

export const buildMedicalProfileContext = (profile: MedicalProfile | null): string | undefined => {
  if (!profile) return undefined;

  const lines: string[] = [];
  const age = calculateAge(profile.dob);
  if (age !== null) lines.push(`Age: ${age}`);
  if (profile.bloodType && profile.bloodType !== 'Unknown') {
    lines.push(`Blood type: ${profile.bloodType}`);
  }
  if (profile.allergies?.length) lines.push(`Allergies: ${profile.allergies.join(', ')}`);
  if (profile.medications?.length) {
    lines.push(`Current medications: ${profile.medications.join(', ')}`);
  }
  if (profile.conditions?.length) {
    lines.push(`Medical conditions: ${profile.conditions.join(', ')}`);
  }
  if (profile.medicalDirectives?.length) {
    lines.push(`Medical directives: ${profile.medicalDirectives.join(', ')}`);
  }
  if (profile.emergencyNotes?.trim()) {
    lines.push(`Emergency notes: ${profile.emergencyNotes.trim()}`);
  }

  return lines.length > 0 ? lines.join('\n') : undefined;
};

export const MedicalProfileService = {
  getProfile: async (): Promise<MedicalProfile | null> => {
    try {
      // Only attempt backend fetch when an authenticated session exists
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
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
                : Array.isArray(apiData.directives)
                  ? apiData.directives
                  : [],
              emergencyNotes: apiData.emergency_notes || '',
              emergencyContact:
                contacts.length > 0 ? contacts[0] : { name: '', relationship: '', phone: '' },
              secondaryEmergencyContact: contacts.length > 1 ? contacts[1] : undefined,
              photoUrl: apiData.photo_url || '',
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
      } else {
        console.log('[MedicalProfileService] No session — skipping backend fetch (guest mode).');
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
        photo_url: profile.photoUrl,
      };

      // Sync to Backend (authenticated users only)
      const {
        data: { session: saveSession },
      } = await supabase.auth.getSession();
      if (saveSession?.access_token) {
        try {
          await api.post('/profile', apiPayload);
        } catch (apiError) {
          console.error('Failed to sync profile to backend', apiError);
        }
      } else {
        console.log(
          '[MedicalProfileService] No session \u2014 profile saved locally only (guest mode).',
        );
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
  },
};
