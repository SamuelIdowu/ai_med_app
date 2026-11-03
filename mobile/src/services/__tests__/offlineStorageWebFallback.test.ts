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

/**
 * PHI vault policy (Nov-2026 audit): the vault master key may ONLY live in
 * SecureStore. When SecureStore is unavailable (web / degraded keystore) the
 * vault fails hard into memory only — it must never persist the key (or PHI)
 * to AsyncStorage, which is plaintext-readable.
 */
describe('Offline Storage vault key policy', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await SecureStore.deleteItemAsync('laso_phi_vault_key');
    await SecureStore.deleteItemAsync('healthpulse_phi_vault_key');
    (Platform as any).OS = 'web';
  });

  it('never persists the vault key or PHI payloads where SecureStore is unavailable', async () => {
    const storage = new OfflineStorage();

    // Memory-only queueing still works so the user isn't blocked mid-session.
    await storage.queueOfflineEncounter({
      id: 'web-encounter',
      chiefComplaint: 'Minor burn on forearm',
      symptoms: ['redness'],
      severity: 'minor',
      createdAt: Date.now(),
    });

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('laso_phi_vault_key')).toBeNull();
    expect(await AsyncStorage.getItem('healthpulse_phi_vault_key')).toBeNull();

    // No encrypted (or plaintext) PHI payload may be written either.
    expect(await AsyncStorage.getItem('@offline_encounters_queue')).toBeNull();

    // The queued encounter survives in memory for sync/retry.
    const pending = await storage.getPendingEncounters();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('web-encounter');
  });
});
