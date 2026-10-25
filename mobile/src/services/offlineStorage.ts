import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { cbc, gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '@noble/ciphers/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import firstAidContent from '../content/first-aid-content.json';

const ENCRYPTION_PREFIX_V2 = 'enc:v2:';
const ENCRYPTION_PREFIX_V1 = 'enc:v1:';
const MASTER_KEY_STORAGE_ALIAS = 'laso_phi_vault_key';
const LEGACY_MASTER_KEY_STORAGE_ALIAS = 'healthpulse_phi_vault_key';
const KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
let cachedEncryptionKey: Uint8Array | null = null;

async function readStoredKey(alias: string): Promise<string | null> {
  if (Platform.OS !== 'web') {
    try {
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        const secureValue = await SecureStore.getItemAsync(alias);
        if (secureValue) return secureValue;
      }
    } catch {
      // Fall through to AsyncStorage if the native keystore is unavailable.
    }
  }
  return AsyncStorage.getItem(alias);
}

async function writeStoredKey(alias: string, value: string): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        await SecureStore.setItemAsync(alias, value);
        return;
      }
    } catch {
      // Fall through to AsyncStorage if the native keystore is unavailable.
    }
  }
  await AsyncStorage.setItem(alias, value);
}

async function getOrCreateEncryptionKey(): Promise<Uint8Array> {
  if (cachedEncryptionKey) return cachedEncryptionKey;

  let storedKey = await readStoredKey(MASTER_KEY_STORAGE_ALIAS);
  let migratedLegacyKey = false;

  if (!storedKey) {
    storedKey = await readStoredKey(LEGACY_MASTER_KEY_STORAGE_ALIAS);
    migratedLegacyKey = Boolean(storedKey);
  }

  if (storedKey) {
    const key = hexToBytes(storedKey);
    if (key.length !== KEY_LENGTH) {
      throw new Error('Offline vault key has an invalid length');
    }
    if (migratedLegacyKey) {
      await writeStoredKey(MASTER_KEY_STORAGE_ALIAS, storedKey);
    }
    cachedEncryptionKey = key;
    return key;
  }

  const key = Crypto.getRandomBytes(KEY_LENGTH);
  await writeStoredKey(MASTER_KEY_STORAGE_ALIAS, bytesToHex(key));
  cachedEncryptionKey = key;
  return key;
}

function encryptPayload(plaintext: string, key: Uint8Array): string {
  const nonce = Crypto.getRandomBytes(NONCE_LENGTH);
  const ciphertext = gcm(key, nonce).encrypt(utf8ToBytes(plaintext));
  return `${ENCRYPTION_PREFIX_V2}${bytesToHex(nonce)}:${bytesToHex(ciphertext)}`;
}

function decryptV2Payload(payload: string, key: Uint8Array): string {
  const parts = payload.slice(ENCRYPTION_PREFIX_V2.length).split(':');
  if (parts.length !== 2) throw new Error('Malformed offline vault payload');
  const nonce = hexToBytes(parts[0]);
  const ciphertext = hexToBytes(parts[1]);
  return bytesToUtf8(gcm(key, nonce).decrypt(ciphertext));
}

function decryptV1Payload(payload: string, key: Uint8Array): string {
  const parts = payload.slice(ENCRYPTION_PREFIX_V1.length).split(':');
  if (parts.length !== 2) throw new Error('Malformed legacy offline vault payload');
  const legacyKey = sha256(utf8ToBytes(bytesToHex(key)));
  const iv = hexToBytes(parts[0]);
  const ciphertext = hexToBytes(parts[1]);
  return bytesToUtf8(cbc(legacyKey, iv).decrypt(ciphertext));
}

function decryptPayload(payload: string, key: Uint8Array): string {
  if (!payload) return payload;
  if (payload.startsWith(ENCRYPTION_PREFIX_V2)) {
    return decryptV2Payload(payload, key);
  }
  if (payload.startsWith(ENCRYPTION_PREFIX_V1)) {
    return decryptV1Payload(payload, key);
  }
  // Pre-encryption rows may still contain plaintext JSON.
  return payload;
}

export interface OfflineGuide {
  id: string;
  topic: string;
  category: string;
  instructions: string[];
  urgency?: string;
  warning?: string;
}

export interface OfflineEncounter {
  id: string;
  patientId?: string;
  chiefComplaint: string;
  symptoms: string[];
  severity?: 'minor' | 'moderate' | 'serious' | 'critical';
  notes?: string;
  createdAt: number;
  synced?: boolean;
}

const STORAGE_KEY_ENCOUNTERS = '@offline_encounters_queue';

export class OfflineStorage {
  private inMemoryGuides: OfflineGuide[] = [];
  private db: any = null;
  private initialized = false;

  constructor() {
    this.seedGuides();
  }

  private seedGuides() {
    // 1. Core rapid guides matching clinical standards and test assertions
    const coreGuides: OfflineGuide[] = [
      {
        id: 'cpr-adult',
        topic: 'Adult CPR',
        category: 'cardiac',
        urgency: 'Immediate Life Threat',
        warning: 'Call 911 immediately. Check pulse & breathing.',
        instructions: [
          'Call 911 immediately.',
          'Place hands in center of chest.',
          'Push hard and fast (100-120 BPM) to the beat of "Stayin Alive".',
          'Continue until emergency responders arrive.',
        ],
      },
      {
        id: 'severe-bleeding',
        topic: 'Severe Bleeding',
        category: 'trauma',
        urgency: 'High Hemorrhage Risk',
        warning: 'Apply firm direct pressure immediately.',
        instructions: [
          'Apply direct firm pressure with sterile gauze or clean cloth.',
          'Do not remove soaked cloth; add more on top.',
          'Apply tourniquet 2-3 inches above wound if bleeding will not stop.',
        ],
      },
      {
        id: 'choking-adult',
        topic: 'Choking (Conscious Adult)',
        category: 'airway',
        urgency: 'Airway Obstruction',
        warning: 'Perform Heimlich maneuver immediately if unable to cough or breathe.',
        instructions: [
          'Stand behind the person and wrap arms around waist.',
          'Make a fist with one hand just above the navel.',
          'Grasp fist with other hand and give quick upward thrusts.',
          'Repeat until object is dislodged or patient becomes unresponsive.',
        ],
      },
      {
        id: 'burns-thermal',
        topic: 'Burns & Scalds',
        category: 'burns',
        urgency: 'Tissue Damage',
        warning: 'Do not use ice, butter, or oil on burns.',
        instructions: [
          'Cool the burn under cool running water for 10-20 minutes.',
          'Remove jewelry or tight items before swelling begins.',
          'Cover loosely with sterile, non-stick dressing or clean plastic wrap.',
          'Seek immediate medical care for burns larger than the palm or on face/joints.',
        ],
      },
      {
        id: 'anaphylaxis',
        topic: 'Anaphylaxis & Allergic Shock',
        category: 'allergic',
        urgency: 'Immediate Life Threat',
        warning: 'Administer epinephrine auto-injector without delay.',
        instructions: [
          'Inject EpiPen into outer mid-thigh and hold for 3 seconds.',
          'Call 911 immediately and report anaphylaxis.',
          'Have patient lie flat with legs elevated unless breathing is difficult.',
          'Prepare second dose if no improvement in 5-10 minutes.',
        ],
      },
      {
        id: 'seizure-response',
        topic: 'Seizure Response',
        category: 'neurological',
        urgency: 'Neurological Emergency',
        warning: 'Never restrain person or place anything in their mouth.',
        instructions: [
          'Ease the person to the floor and place something soft under head.',
          'Turn gently onto one side to keep airway clear.',
          'Clear area of hard or sharp objects.',
          'Time the seizure; call 911 if seizure lasts longer than 5 minutes.',
        ],
      },
    ];

    // 2. Incorporate full first-aid content JSON categories into offline search
    const jsonGuides: OfflineGuide[] = (firstAidContent?.categories || []).map((cat: any) => ({
      id: cat.id,
      topic: cat.title,
      category: cat.id,
      urgency: cat.urgency,
      warning: cat.warning,
      instructions: (cat.steps || []).map((s: any) => `${s.title}: ${s.content}`),
    }));

    // Merge avoiding duplicates by id
    const guideMap = new Map<string, OfflineGuide>();
    coreGuides.forEach((g) => guideMap.set(g.id, g));
    jsonGuides.forEach((g) => {
      if (!guideMap.has(g.id)) guideMap.set(g.id, g);
    });

    this.inMemoryGuides = Array.from(guideMap.values());
  }

  async initDatabase(): Promise<void> {
    if (this.initialized) return;
    try {
      // Attempt expo-sqlite if available in native runtime
      const SQLite = await import('expo-sqlite');
      if (SQLite && typeof (SQLite as any).openDatabaseSync === 'function') {
        this.db = (SQLite as any).openDatabaseSync('emergency_offline.db');
        this.db.execSync(`
          CREATE TABLE IF NOT EXISTS offline_guides (
            id TEXT PRIMARY KEY,
            topic TEXT NOT NULL,
            category TEXT NOT NULL,
            urgency TEXT,
            warning TEXT,
            instructions TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS offline_encounters (
            id TEXT PRIMARY KEY,
            patientId TEXT,
            chiefComplaint TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            severity TEXT,
            notes TEXT,
            createdAt INTEGER NOT NULL,
            synced INTEGER DEFAULT 0
          );
        `);
      }
    } catch {
      // In web, unit tests, or environments where native SQLite is absent,
      // fallback to memory and AsyncStorage safely.
    }
    this.initialized = true;
  }

  async getOfflineGuides(): Promise<OfflineGuide[]> {
    return this.inMemoryGuides;
  }

  async searchOfflineGuides(query: string): Promise<OfflineGuide[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.inMemoryGuides;
    return this.inMemoryGuides.filter(
      (g) =>
        g.topic.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        (g.instructions || []).some((inst) => inst.toLowerCase().includes(q))
    );
  }

  async getGuideById(id: string): Promise<OfflineGuide | null> {
    const guide = this.inMemoryGuides.find((g) => g.id === id);
    return guide || null;
  }

  private fallbackEncounters: OfflineEncounter[] = [];

  // --- Outbox Queue for Offline Encounters ---

  async queueOfflineEncounter(encounter: OfflineEncounter): Promise<void> {
    const updatedEncounter = { ...encounter, synced: false };
    this.fallbackEncounters = [...this.fallbackEncounters.filter((e) => e.id !== encounter.id), updatedEncounter];

    try {
      const key = await getOrCreateEncryptionKey();
      const existing = await this.getPendingEncounters();
      const updated = [...existing.filter((e) => e.id !== encounter.id), updatedEncounter];
      const serialized = JSON.stringify(updated);
      const encrypted = encryptPayload(serialized, key);
      await AsyncStorage.setItem(STORAGE_KEY_ENCOUNTERS, encrypted);

      if (this.db) {
        const encComplaint = encryptPayload(encounter.chiefComplaint, key);
        const encSymptoms = encryptPayload(JSON.stringify(encounter.symptoms), key);
        const encNotes = encryptPayload(encounter.notes || '', key);
        this.db.runSync(
          `INSERT OR REPLACE INTO offline_encounters (id, patientId, chiefComplaint, symptoms, severity, notes, createdAt, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
          [
            encounter.id,
            encounter.patientId || '',
            encComplaint,
            encSymptoms,
            encounter.severity || 'moderate',
            encNotes,
            encounter.createdAt,
          ]
        );
      }
    } catch (err) {
      // In-memory fallback handles queuing gracefully
    }
  }

  async getPendingEncounters(): Promise<OfflineEncounter[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_ENCOUNTERS);
      if (!raw) return this.fallbackEncounters;
      const key = await getOrCreateEncryptionKey();
      const decrypted = decryptPayload(raw, key);
      const parsed = JSON.parse(decrypted);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : this.fallbackEncounters;
    } catch {
      return this.fallbackEncounters;
    }
  }

  async removePendingEncounter(id: string): Promise<void> {
    this.fallbackEncounters = this.fallbackEncounters.filter((e) => e.id !== id);
    try {
      const key = await getOrCreateEncryptionKey();
      const current = await this.getPendingEncounters();
      const filtered = current.filter((e) => e.id !== id);
      const serialized = JSON.stringify(filtered);
      const encrypted = encryptPayload(serialized, key);
      await AsyncStorage.setItem(STORAGE_KEY_ENCOUNTERS, encrypted);

      if (this.db) {
        this.db.runSync(`DELETE FROM offline_encounters WHERE id = ?;`, [id]);
      }
    } catch (err) {
      // In-memory handled
    }
  }

  async syncPendingEncounters(
    syncFn: (encounter: OfflineEncounter) => Promise<boolean>
  ): Promise<number> {
    const pending = await this.getPendingEncounters();
    let syncedCount = 0;

    for (const item of pending) {
      try {
        const success = await syncFn(item);
        if (success) {
          await this.removePendingEncounter(item.id);
          syncedCount++;
        }
      } catch (err) {
        console.warn(`Sync failed for encounter ${item.id}:`, err);
      }
    }

    return syncedCount;
  }
}

export const offlineStorage = new OfflineStorage();
