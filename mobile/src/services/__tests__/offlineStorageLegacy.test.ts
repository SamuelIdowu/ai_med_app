import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import crypto from 'crypto';
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

const LEGACY_KEY_ALIAS = 'healthpulse_phi_vault_key';
const CURRENT_KEY_ALIAS = 'laso_phi_vault_key';
const QUEUE_KEY = '@offline_encounters_queue';

describe('Offline Storage legacy vault migration', () => {
  const legacyKeyHex = 'a'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('decrypts v1 AES-CBC payloads and migrates the key alias', async () => {
    const encounter = {
      id: 'legacy-encounter',
      chiefComplaint: 'Chest pain and shortness of breath',
      symptoms: ['Chest pain'],
      severity: 'serious',
      createdAt: 1700000000000,
    };

    const legacyKey = crypto.createHash('sha256').update(legacyKeyHex).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', legacyKey, iv);
    const encrypted = cipher.update(JSON.stringify([encounter]), 'utf8', 'hex') + cipher.final('hex');

    await SecureStore.setItemAsync(LEGACY_KEY_ALIAS, legacyKeyHex);
    await AsyncStorage.setItem(QUEUE_KEY, `enc:v1:${iv.toString('hex')}:${encrypted}`);

    const storage = new OfflineStorage();
    const pending = await storage.getPendingEncounters();

    expect(pending).toHaveLength(1);
    expect(pending[0].chiefComplaint).toBe('Chest pain and shortness of breath');
    expect(await SecureStore.getItemAsync(CURRENT_KEY_ALIAS)).toBe(legacyKeyHex);
  });

  it('does not return tampered v2 ciphertext as data', async () => {
    await SecureStore.setItemAsync(
      CURRENT_KEY_ALIAS,
      'b'.repeat(64)
    );
    await AsyncStorage.setItem(QUEUE_KEY, `enc:v2:${'00'.repeat(12)}:${'00'.repeat(48)}`);

    const storage = new OfflineStorage();
    const pending = await storage.getPendingEncounters();

    expect(pending).toEqual([]);
  });
});
