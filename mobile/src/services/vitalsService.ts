import { api } from './api';
import { supabase } from './supabase';
import { TimeSegment } from '../components/charts/TimeSegmentControl';

export interface VitalsDataPoint {
  label: string;
  value: number;
}

export interface VitalsTelemetry {
  segment: TimeSegment;
  currentHeartRate: number | null;
  heartRateStatus: string;
  heartRatePoints: VitalsDataPoint[];
  average: number | null;
  min: number | null;
  max: number | null;
  readingCount: number;
  dataSource: 'backend';
}

export interface VitalReadingInput {
  metric: keyof Pick<VitalsTriageInput, 'heart_rate' | 'systolic_bp' | 'diastolic_bp' | 'oxygen_saturation' | 'respiratory_rate' | 'body_temperature' | 'pain_score'>;
  value: number;
  recordedAt: string;
  source: 'manual' | 'healthkit' | 'health_connect' | 'device';
  externalId: string;
  encounterId?: string;
}

export interface VitalsTriageInput {
  heart_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  body_temperature?: number;
  pain_score?: number;
  severe_bleeding?: number;
  altered_mental_status?: number;
  age?: number;
}

export interface VitalsTriageResponse {
  triage_level: number;
  triage_label: 'Non-Urgent' | 'Urgent' | 'Emergency' | string;
  confidence: number;
  probabilities: Record<string, number>;
  risk_drivers: string[];
  is_emergency: boolean;
  is_urgent: boolean;
  latency_ms: number;
}

export const VitalsService = {
  evaluateVitalsTriage: async (input: VitalsTriageInput): Promise<VitalsTriageResponse> => {
    const response = await api.post('/ai/triage/vitals', input);
    return response.data;
  },

  getVitalsTelemetry: async (segment: TimeSegment = 'Hourly'): Promise<VitalsTelemetry | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    try {
      const response = await api.get('/analytics/vitals', { params: { segment } });
      return response.data?.dataSource === 'backend' ? response.data : null;
    } catch {
      return null;
    }
  },

  recordReadings: async (readings: VitalReadingInput[]): Promise<void> => {
    if (!readings.length) return;
    await api.post('/analytics/vitals/readings', { readings });
  },
};
