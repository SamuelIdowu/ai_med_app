import { OfflineStorage, OfflineGuide, OfflineEncounter } from '../offlineStorage';

describe('Offline Storage Service', () => {
  let storage: OfflineStorage;

  beforeEach(() => {
    storage = new OfflineStorage();
  });

  it('instantiates storage engine with core table schema', () => {
    expect(storage).toBeDefined();
    expect(typeof storage.getOfflineGuides).toBe('function');
    expect(typeof storage.searchOfflineGuides).toBe('function');
  });

  it('retrieves pre-cached emergency guides including adult CPR and severe bleeding', async () => {
    const guides = await storage.getOfflineGuides();
    expect(guides.length).toBeGreaterThanOrEqual(2);

    const cpr = guides.find((g) => g.id === 'cpr-adult');
    expect(cpr).toBeDefined();
    expect(cpr?.topic).toBe('Adult CPR');
    expect(cpr?.category).toBe('cardiac');
    expect(cpr?.instructions.length).toBeGreaterThan(0);

    const bleeding = guides.find((g) => g.id === 'severe-bleeding');
    expect(bleeding).toBeDefined();
    expect(bleeding?.topic).toBe('Severe Bleeding');
    expect(bleeding?.category).toBe('trauma');
  });

  it('searches offline guides by topic, category, or instruction query', async () => {
    const results = await storage.searchOfflineGuides('cpr');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBe('cpr-adult');

    const traumaResults = await storage.searchOfflineGuides('trauma');
    expect(traumaResults.some((g) => g.id === 'severe-bleeding')).toBe(true);

    const tourniquetResults = await storage.searchOfflineGuides('tourniquet');
    expect(tourniquetResults.some((g) => g.id === 'severe-bleeding')).toBe(true);
  });

  it('finds guide by exact id', async () => {
    const guide = await storage.getGuideById('cpr-adult');
    expect(guide).not.toBeNull();
    expect(guide?.topic).toBe('Adult CPR');

    const nonExistent = await storage.getGuideById('non-existent-id');
    expect(nonExistent).toBeNull();
  });

  it('queues offline encounters and syncs via replay callback', async () => {
    const mockEncounter: OfflineEncounter = {
      id: 'enc-offline-1',
      patientId: 'patient-abc',
      chiefComplaint: 'Severe head trauma after bicycle fall',
      symptoms: ['Loss of consciousness', 'Bleeding scalp'],
      severity: 'critical',
      createdAt: Date.now(),
    };

    await storage.queueOfflineEncounter(mockEncounter);
    const pending = await storage.getPendingEncounters();
    expect(pending.some((e) => e.id === 'enc-offline-1')).toBe(true);

    // Test sync execution
    const syncCallback = jest.fn().mockImplementation(async (enc: OfflineEncounter) => {
      return enc.id === 'enc-offline-1';
    });

    const syncedCount = await storage.syncPendingEncounters(syncCallback);
    expect(syncedCount).toBe(1);
    expect(syncCallback).toHaveBeenCalledWith(expect.objectContaining({ id: 'enc-offline-1' }));

    const afterSync = await storage.getPendingEncounters();
    expect(afterSync.some((e) => e.id === 'enc-offline-1')).toBe(false);
  });
});
