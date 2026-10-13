import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cast to any to bypass potential type definition mismatch
const FS = FileSystem as any;
const PHOTOS_DIR = (FS.documentDirectory || '') + 'photos/';

export const StorageService = {
    // Ensure the directory exists
    init: async () => {
        if (!FS.documentDirectory) return; // Guard against null

        const dirInfo = await FS.getInfoAsync(PHOTOS_DIR);
        if (!dirInfo.exists) {
            await FS.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
        }
    },

    savePhoto: async (uri: string): Promise<string> => {
        await StorageService.init();
        if (!FS.documentDirectory) throw new Error('Filesystem not available');

        const filename = uri.split('/').pop();
        const newPath = PHOTOS_DIR + filename;

        await FS.moveAsync({
            from: uri,
            to: newPath
        });

        return newPath;
    },

    storeMetadata: async (photoId: string, metadata: any) => {
        if (Platform.OS === 'web') {
            await AsyncStorage.setItem(`photo_meta_${photoId}`, JSON.stringify(metadata));
        } else {
            await SecureStore.setItemAsync(`photo_meta_${photoId}`, JSON.stringify(metadata));
        }
    },

    getAllPhotos: async (): Promise<string[]> => {
        await StorageService.init();
        if (!FS.documentDirectory) return [];
        return await FS.readDirectoryAsync(PHOTOS_DIR);
    },

    deleteAllPhotos: async () => {
        await StorageService.init();
        if (!FS.documentDirectory) return;

        try {
            // Delete the entire directory and recreate it
            await FS.deleteAsync(PHOTOS_DIR, { idempotent: true });
            await StorageService.init();
        } catch (e) {
            console.error('Failed to delete photos', e);
        }
    }
};
