
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Database } from './types';
import { api } from './api';

type EncounterInsert = Database['public']['Tables']['encounters']['Insert'];
type PhotoInsert = Database['public']['Tables']['photos']['Insert'];

const LOCAL_ENCOUNTERS_KEY = '@encounters';

export const EncounterService = {
    // Create a new encounter (Local First)
    createEncounter: async (
        category: string,
        notes: string,
        photoUris: string[] = []
    ) => {
        const timestamp = new Date().toISOString();
        const localId = `local_${Date.now()}`;

        const encounter: any = {
            id: localId,
            category,
            notes,
            created_at: timestamp,
            photos: photoUris,
            synced: false,
        };

        // 1. Save Locally
        try {
            const existingData = await AsyncStorage.getItem(LOCAL_ENCOUNTERS_KEY);
            const encounters = existingData ? JSON.parse(existingData) : [];
            encounters.push(encounter);
            await AsyncStorage.setItem(LOCAL_ENCOUNTERS_KEY, JSON.stringify(encounters));
        } catch (e) {
            console.error('Failed to save encounter locally', e);
            throw e;
        }

        // 2. Attempt Sync to Supabase (if online and logged in)
        let backendEncounter = null;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                backendEncounter = await EncounterService.syncEncounter(encounter, session.user.id);
            }
        } catch (e) {
            console.log('Sync failed, will retry later', e);
            // Silent fail for sync - we rely on local data
        }

        return { localId, backendEncounter };
    },

    // Sync a specific encounter to Supabase via Backend API
    syncEncounter: async (localEncounter: any, userId: string) => {
        if (localEncounter.synced) return localEncounter; // Return existing if already synced? Or maybe we can't easily retrieve the backend object here without more changes. 
        // Ideally we should store the backend ID locally after sync. 
        // For now, let's just proceed with the logic.

        try {
            // A. Create Encounter via API
            const response = await api.post('/encounters', {
                category: localEncounter.category,
                notes: localEncounter.notes,
                created_at: localEncounter.created_at,
                // type is handled by backend default or we can send it
            });

            const encounterData = response.data;

            // B. Upload Photos
            if (localEncounter.photos && localEncounter.photos.length > 0) {
                for (const uri of localEncounter.photos) {
                    const filename = uri.split('/').pop();

                    // 1. Get Signed Upload URL from Backend
                    const uploadAuthRes = await api.post(`/encounters/${encounterData.id}/photos`, {
                        fileName: filename
                    });

                    const { signedUrl, filePath } = uploadAuthRes.data;

                    const fileResponse = await fetch(uri);
                    const blob = await fileResponse.blob();

                    const uploadHeaders = {
                        'Content-Type': 'image/jpeg',
                    };

                    await fetch(signedUrl, {
                        method: 'PUT',
                        body: blob,
                        headers: uploadHeaders
                    });
                }
            }

            // Mark as synced (in local storage logic - handled by caller or state mgmt)
            // Here we just return the backend data
            return encounterData;
        } catch (e: any) {
            console.error('Sync failed', e.response?.data || e.message);
            throw e;
        }
    },

    getEncounters: async () => {
        try {
            const response = await api.get('/encounters');
            return response.data;
        } catch (e) {
            console.warn('Failed to fetch remote encounters, falling back to local', e);
            const json = await AsyncStorage.getItem(LOCAL_ENCOUNTERS_KEY);
            return json != null ? JSON.parse(json) : [];
        }
    },

    clearEncounters: async () => {
        try {
            await AsyncStorage.removeItem(LOCAL_ENCOUNTERS_KEY);
        } catch (e) {
            console.error('Failed to clear encounters', e);
        }
    },

    deleteEncounter: async (id: string) => {
        try {
            // 1. Remove from backend if not local
            if (!id.startsWith('local_')) {
                await api.delete(`/encounters/${id}`);
            }

            // 2. Remove from local storage
            const json = await AsyncStorage.getItem(LOCAL_ENCOUNTERS_KEY);
            if (json) {
                const encounters = JSON.parse(json);
                const filtered = encounters.filter((e: any) => e.id !== id);
                await AsyncStorage.setItem(LOCAL_ENCOUNTERS_KEY, JSON.stringify(filtered));
            }
        } catch (e) {
            console.error('Failed to delete encounter', e);
            throw e;
        }
    }
};
