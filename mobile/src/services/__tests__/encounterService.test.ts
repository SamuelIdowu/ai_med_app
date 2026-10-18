import { EncounterService } from '../encounterService';
import { api } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

jest.mock('../api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: null },
      })),
    },
  },
}));

describe('Mobile Encounter Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEncounter', () => {
    it('saves encounter to local AsyncStorage first (offline-first design)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await EncounterService.createEncounter(
        'Burn',
        'Second-degree burn on forearm',
        ['file:///photo1.jpg']
      );

      expect(result.localId).toMatch(/^local_\d+/);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@encounters',
        expect.stringContaining('Second-degree burn on forearm')
      );
    });

    it('attempts to sync immediately if active user session is present', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'patient-uuid-123' },
          },
        },
      });

      (api.post as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'remote-encounter-uuid',
          category: 'Sprain',
          notes: 'Ankle inversion sprain',
          created_at: new Date().toISOString(),
        },
      });

      const result = await EncounterService.createEncounter('Sprain', 'Ankle inversion sprain');

      expect(result.localId).toBeDefined();
      expect(result.backendEncounter).toBeDefined();
      expect(result.backendEncounter.id).toBe('remote-encounter-uuid');
    });
  });

  describe('getEncounters', () => {
    it('fetches remote encounters when online', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
      });
      const mockRemote = [
        { id: 'enc-1', category: 'Cut', notes: 'Minor laceration' },
        { id: 'enc-2', category: 'Burn', notes: 'Thermal burn' },
      ];
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockRemote });

      const encounters = await EncounterService.getEncounters();
      expect(encounters).toEqual(mockRemote);
      expect(api.get).toHaveBeenCalledWith('/encounters');
    });

    it('falls back to local AsyncStorage encounters when backend is unreachable', async () => {
      (api.get as jest.Mock).mockRejectedValueOnce(new Error('Network offline'));
      const mockLocal = [
        { id: 'local_1', category: 'Insect Bite', notes: 'Bee sting' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockLocal));

      const encounters = await EncounterService.getEncounters();
      expect(encounters).toEqual(mockLocal);
    });
  });

  describe('deleteEncounter & clearEncounters', () => {
    it('deletes remote encounter via API and removes from local storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([
          { id: 'remote-1', category: 'Allergy' },
          { id: 'remote-2', category: 'Trauma' },
        ])
      );
      (api.delete as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

      await EncounterService.deleteEncounter('remote-1');

      expect(api.delete).toHaveBeenCalledWith('/encounters/remote-1');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@encounters',
        expect.not.stringContaining('remote-1')
      );
    });

    it('skips remote DELETE API call when deleting an unsynced local-only encounter', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ id: 'local_123', category: 'Rash' }])
      );

      await EncounterService.deleteEncounter('local_123');

      expect(api.delete).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@encounters', '[]');
    });

    it('clears all local encounters on request', async () => {
      await EncounterService.clearEncounters();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@encounters');
    });
  });
});
