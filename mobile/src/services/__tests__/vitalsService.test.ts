import { VitalsService, VitalsTelemetry } from '../vitalsService';
import { api } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EncounterService } from '../encounterService';
import { supabase } from '../supabase';

jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
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

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store[key] || null),
      setItem: jest.fn(async (key: string, val: string) => {
        store[key] = val;
      }),
      removeItem: jest.fn(async (key: string) => {
        delete store[key];
      }),
      clear: jest.fn(async () => {}),
    },
  };
});

jest.mock('../encounterService', () => ({
  EncounterService: {
    getEncounters: jest.fn(async () => []),
  },
}));

describe('Mobile Vitals Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches vitals telemetry from backend API and caches response in AsyncStorage', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: { access_token: 'test-token' } },
    });
    const mockApiResponse = {
      currentHeartRate: 74,
      heartRateStatus: 'Normal resting range (±74)',
      heartRatePoints: [
        { label: '8am', value: 70 },
        { label: '10am', value: 75 },
      ],
      average: 73,
      min: 70,
      max: 75,
      sleepDuration: '7h 45m',
      sleepRings: [{ label: 'Deep', value: 20, color: '#4B5563' }],
      labBars: [{ label: 'Glucose', value: 95 }],
      labBadge: 'Normal',
      encounterCount: 2,
    };

    (api.get as jest.Mock).mockResolvedValueOnce({ data: mockApiResponse });

    const result = await VitalsService.getVitalsTelemetry('Hourly');

    expect(api.get).toHaveBeenCalledWith('/analytics/vitals', {
      params: { segment: 'Hourly' },
    });
    expect(result.segment).toBe('Hourly');
    expect(result.currentHeartRate).toBe(74);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('@cached_vitals_telemetry_Hourly'),
      expect.any(String)
    );
  });

  it('falls back to AsyncStorage cached payload when backend API is unreachable', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Network offline'));

    const cachedData: VitalsTelemetry = {
      segment: 'Daily',
      currentHeartRate: 68,
      heartRateStatus: 'Normal resting range (±68)',
      heartRatePoints: [{ label: 'Mon', value: 68 }],
      average: 68,
      min: 68,
      max: 68,
      sleepDuration: '8h 00m',
      sleepRings: [],
      labBars: [],
      labBadge: 'Normal',
      encounterCount: 1,
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedData));

    const result = await VitalsService.getVitalsTelemetry('Daily');

    expect(result.currentHeartRate).toBe(68);
    expect(result.segment).toBe('Daily');
  });

  it('computes algorithmic fallback when both API and AsyncStorage cache miss', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Offline'));
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    (EncounterService.getEncounters as jest.Mock).mockResolvedValueOnce([
      { id: 'enc-1', category: 'Burn' },
    ]);

    const result = await VitalsService.getVitalsTelemetry('Hourly');

    expect(result).toBeDefined();
    expect(result.heartRatePoints.length).toBeGreaterThan(0);
    expect(result.average).toBeGreaterThan(50);
    expect(result.sleepRings.length).toBe(3);
    expect(result.labBars.length).toBeGreaterThan(0);
  });

  it('supports Weekly and Monthly segments properly', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Offline'));
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const weekly = await VitalsService.getVitalsTelemetry('Weekly');
    expect(weekly.heartRatePoints.length).toBe(4);
    expect(weekly.heartRatePoints[0].label).toBe('Wk 1');

    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Offline'));
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const monthly = await VitalsService.getVitalsTelemetry('Monthly');
    expect(monthly.heartRatePoints.length).toBe(6);
    expect(monthly.heartRatePoints[0].label).toBe('Jan');
  });

  it('evaluates vitals triage via backend API successfully', async () => {
    const mockTriage = {
      triage_level: 2,
      triage_label: 'Emergency',
      confidence: 0.99,
      probabilities: { 'Non-Urgent': 0, Urgent: 0.01, Emergency: 0.99 },
      risk_drivers: ['Critical Hypoxemia (SpO2 82%)'],
      is_emergency: true,
      is_urgent: true,
      latency_ms: 3.2,
    };
    (api.post as jest.Mock).mockResolvedValueOnce({ data: mockTriage });

    const result = await VitalsService.evaluateVitalsTriage({
      heart_rate: 145,
      oxygen_saturation: 82,
      systolic_bp: 75,
      severe_bleeding: 1,
    });

    expect(api.post).toHaveBeenCalledWith('/ai/triage/vitals', {
      heart_rate: 145,
      oxygen_saturation: 82,
      systolic_bp: 75,
      severe_bleeding: 1,
    });
    expect(result.triage_label).toBe('Emergency');
    expect(result.is_emergency).toBe(true);
  });

  it('falls back to local clinical heuristics when backend is offline for vitals triage', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const result = await VitalsService.evaluateVitalsTriage({
      heart_rate: 150,
      oxygen_saturation: 84,
      systolic_bp: 70,
      severe_bleeding: 1,
    });

    expect(result.triage_label).toBe('Emergency');
    expect(result.is_emergency).toBe(true);
    expect(result.risk_drivers.length).toBeGreaterThan(0);
    expect(result.risk_drivers).toContain('Critical Hypoxemia (SpO2 84%)');
  });
});
