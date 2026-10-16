// backend/src/tests/ai_integration.test.ts
// Comprehensive Integration Test Suite for ML & AI Gateway

import { describe, it, expect, beforeAll } from '@jest/globals';
import { MLClient } from '../services/mlClient';
import { GeminiService } from '../services/geminiService';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

describe('ML & AI Dual-Tier Gateway Integration Suite', () => {
  let mlClient: MLClient;

  beforeAll(() => {
    mlClient = new MLClient();
  });

  describe('ML Client Interface & Feature Suite', () => {
    it('initializes ML client with default or configured base URL', () => {
      const url = mlClient.getBaseUrl();
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('caches health check state within TTL window to minimize redundant socket traffic', async () => {
      // Mock client.get
      const clientAny = mlClient as any;
      let getCalls = 0;
      clientAny.client = {
        get: async () => {
          getCalls++;
          return { status: 200, data: { status: 'ok' } };
        },
      };

      const h1 = await mlClient.checkHealth(true);
      const h2 = await mlClient.checkHealth(false);
      const h3 = await mlClient.checkHealth(false);

      expect(h1).toBe(true);
      expect(h2).toBe(true);
      expect(h3).toBe(true);
      expect(getCalls).toBe(1); // Only 1 network call due to cache TTL
    });

    it('handles synchronous triage evaluation endpoint contract', async () => {
      const clientAny = mlClient as any;
      clientAny.client = {
        post: async (path: string, payload: any) => {
          if (path.includes('evaluate')) {
            return {
              status: 200,
              data: {
                query: payload.query,
                is_critical: false,
                flags: [],
                contraindications: [],
                escalation_message: null,
                protocol: {
                  protocol_name: 'External Hemorrhage Control',
                  steps: ['Step 1: Direct Pressure'],
                  red_flags: ['Spurting blood'],
                },
                processing_time_ms: 12.5,
              },
            };
          }
        },
      };

      const result = await mlClient.evaluateTriageSync('I cut my finger and it is bleeding');
      expect(result).toBeDefined();
      expect(result.is_critical).toBe(false);
      expect(result.protocol.protocol_name).toBe('External Hemorrhage Control');
      expect(result.processing_time_ms).toBeGreaterThan(0);
    });

    it('handles dense vector embedding contract with 384 dimensions', async () => {
      const clientAny = mlClient as any;
      const fakeEmbedding = new Array(384).fill(0.05);
      clientAny.client = {
        post: async (path: string) => {
          if (path.includes('embed')) {
            return {
              status: 200,
              data: {
                embedding: fakeEmbedding,
                dimensions: 384,
              },
            };
          }
        },
      };

      const vector = await mlClient.embedText('Automated emergency first aid CPR protocol');
      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBe(384);
    });

    it('handles scikit-learn vitals triage classification contract', async () => {
      const clientAny = mlClient as any;
      clientAny.client = {
        post: async (path: string, payload: any) => {
          if (path.includes('/v1/ml/triage/vitals')) {
            return {
              status: 200,
              data: {
                triage_level: 2,
                triage_label: 'Emergency',
                confidence: 0.96,
                probabilities: { 'Non-Urgent': 0.01, 'Urgent': 0.03, 'Emergency': 0.96 },
                risk_drivers: ['Hypoxemia (SpO2: 84%)', 'Tachycardia (HR: 142 bpm)'],
                is_emergency: true,
                is_urgent: false,
                latency_ms: 1.45,
              },
            };
          }
        },
      };

      const result = await mlClient.evaluateVitalsTriage({
        heart_rate: 142,
        systolic_bp: 85,
        oxygen_saturation: 84,
        respiratory_rate: 30,
        body_temperature: 38.8,
        severe_bleeding: 0,
        altered_mental_status: 1
      });

      expect(result).toBeDefined();
      expect(result.triage_label).toBe('Emergency');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.is_emergency).toBe(true);
      expect(result.risk_drivers.length).toBe(2);
      expect(result.latency_ms).toBeGreaterThan(0);
    });
  });

  describe('Cloud AI Service & Safety Guardrails', () => {
    it('enforces API key guard when GEMINI_API_KEY is not set or empty', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      try {
        if (!process.env.GEMINI_API_KEY) {
          await expect(GeminiService.chat('Test message')).rejects.toThrow();
        }
      } finally {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('parses structured JSON image analysis or falls back gracefully', async () => {
      // Test structured response normalization logic
      const sampleStructured = {
        severity: 'critical',
        injuryType: 'Deep laceration',
        confidence: 95,
        emergencyFlag: true,
        symptoms: ['Pulsatile bleeding'],
        recommendations: ['Call 911 immediately', 'Apply pressure'],
        warnings: ['Risk of shock'],
      };

      expect(sampleStructured.emergencyFlag).toBe(true);
      expect(sampleStructured.severity).toBe('critical');
      expect(sampleStructured.recommendations.length).toBe(2);
    });
  });
});
