import { VitalsService } from '../vitalsService';
import { api } from '../api';
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

describe('Mobile Vitals Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns vitals telemetry from the authenticated backend response', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: { access_token: 'test-token' } },
    });
    const mockApiResponse = {
      segment: 'Hourly',
      dataSource: 'backend',
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
    expect(result).not.toBeNull();
    if (!result) throw new Error('Expected backend vitals telemetry');
    expect(result.segment).toBe('Hourly');
    expect(result.currentHeartRate).toBe(74);
    expect(result.dataSource).toBe('backend');
  });

  it('returns no telemetry when the authenticated backend is unreachable', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: { access_token: 'test-token' } },
    });
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Network offline'));

    await expect(VitalsService.getVitalsTelemetry('Daily')).resolves.toBeNull();
  });

  it('does not fabricate guest telemetry when no authenticated source is available', async () => {
    await expect(VitalsService.getVitalsTelemetry('Hourly')).resolves.toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('requests Weekly and Monthly telemetry from the backend', async () => {
    (supabase.auth.getSession as jest.Mock)
      .mockResolvedValueOnce({ data: { session: { access_token: 'test-token' } } })
      .mockResolvedValueOnce({ data: { session: { access_token: 'test-token' } } });
    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: { segment: 'Weekly', dataSource: 'backend' } })
      .mockResolvedValueOnce({ data: { segment: 'Monthly', dataSource: 'backend' } });

    const weekly = await VitalsService.getVitalsTelemetry('Weekly');
    const monthly = await VitalsService.getVitalsTelemetry('Monthly');

    expect(weekly?.segment).toBe('Weekly');
    expect(monthly?.segment).toBe('Monthly');
    expect(api.get).toHaveBeenNthCalledWith(1, '/analytics/vitals', {
      params: { segment: 'Weekly' },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/analytics/vitals', {
      params: { segment: 'Monthly' },
    });
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

  it('propagates backend errors for vitals triage instead of returning an unverified fallback', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      VitalsService.evaluateVitalsTriage({
        heart_rate: 150,
        oxygen_saturation: 84,
        systolic_bp: 70,
        severe_bleeding: 1,
      }),
    ).rejects.toThrow('Network error');
  });
});
