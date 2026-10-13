import AsyncStorage from '@react-native-async-storage/async-storage';
import firstAidContent from '../content/first-aid-content.json';

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

  // --- Outbox Queue for Offline Encounters ---

  async queueOfflineEncounter(encounter: OfflineEncounter): Promise<void> {
    try {
      const existing = await this.getPendingEncounters();
      const updated = [...existing.filter((e) => e.id !== encounter.id), { ...encounter, synced: false }];
      await AsyncStorage.setItem(STORAGE_KEY_ENCOUNTERS, JSON.stringify(updated));

      if (this.db) {
        this.db.runSync(
          `INSERT OR REPLACE INTO offline_encounters (id, patientId, chiefComplaint, symptoms, severity, notes, createdAt, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
          [
            encounter.id,
            encounter.patientId || '',
            encounter.chiefComplaint,
            JSON.stringify(encounter.symptoms),
            encounter.severity || 'moderate',
            encounter.notes || '',
            encounter.createdAt,
          ]
        );
      }
    } catch (err) {
      console.warn('Failed to queue offline encounter:', err);
    }
  }

  async getPendingEncounters(): Promise<OfflineEncounter[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_ENCOUNTERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async removePendingEncounter(id: string): Promise<void> {
    try {
      const current = await this.getPendingEncounters();
      const filtered = current.filter((e) => e.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY_ENCOUNTERS, JSON.stringify(filtered));

      if (this.db) {
        this.db.runSync(`DELETE FROM offline_encounters WHERE id = ?;`, [id]);
      }
    } catch (err) {
      console.warn('Failed to remove pending encounter:', err);
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
