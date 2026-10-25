import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { OfflineStorage } from '../offlineStorage';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store[key] || null),
      setItem: jest.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn(async (key: string) => {
        delete store[key];
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
    },
  };
});

describe('Offline Storage web key fallback', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await SecureStore.deleteItemAsync('laso_phi_vault_key');
    await SecureStore.deleteItemAsync('healthpulse_phi_vault_key');
    (Platform as any).OS = 'web';
  });

  it('stores the vault key in AsyncStorage and never touches SecureStore on web', async () => {
    const storage = new OfflineStorage();

    await storage.queueOfflineEncounter({
      id: 'web-encounter',
      chiefComplaint: 'Minor burn on forearm',
      symptoms: ['redness'],
      severity: 'minor',
      createdAt: Date.now(),
    });

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

    const storedKey = await AsyncStorage.getItem('laso_phi_vault_key');
    expect(storedKey).toMatch(/^[0-9a-f]{64}$/);

    const rawPayload = await AsyncStorage.getItem('@offline_encounters_queue');
    expect(rawPayload).toMatch(/^enc:v2:/);
    expect(rawPayload).not.toContain('Minor burn on forearm');

    const pending = await storage.getPendingEncounters();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('web-encounter');
  });
});
