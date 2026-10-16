// mobile/scripts/verify_offline_triage.ts
// Automated Verification Suite for Mobile Vitals Triage & Offline Fallback Engine

import { VitalsService, VitalsTriageInput } from '../src/services/vitalsService';
import { api } from '../src/services/api';

interface TestScenario {
  name: string;
  input: VitalsTriageInput;
  mockNetworkError: boolean;
  expectedLabel: string;
  expectedEmergency: boolean;
  expectedUrgent: boolean;
  expectedDriverSubstrings?: string[];
}

const scenarios: TestScenario[] = [
  {
    name: 'Normal Vitals - Offline Mode',
    input: {
      heart_rate: 72,
      systolic_bp: 120,
      diastolic_bp: 80,
      respiratory_rate: 16,
      oxygen_saturation: 98,
      body_temperature: 37.0,
      severe_bleeding: 0,
      altered_mental_status: 0,
    },
    mockNetworkError: true,
    expectedLabel: 'Non-Urgent',
    expectedEmergency: false,
    expectedUrgent: false,
  },
  {
    name: 'Critical Hypoxemia (SpO2: 84%) - Offline Mode',
    input: {
      heart_rate: 110,
      systolic_bp: 115,
      oxygen_saturation: 84,
      severe_bleeding: 0,
      altered_mental_status: 0,
    },
    mockNetworkError: true,
    expectedLabel: 'Emergency',
    expectedEmergency: true,
    expectedUrgent: true,
    expectedDriverSubstrings: ['Critical Hypoxemia', '84%'],
  },
  {
    name: 'Hypotensive Shock (Systolic BP: 78) - Offline Mode',
    input: {
      heart_rate: 130,
      systolic_bp: 78,
      oxygen_saturation: 95,
      severe_bleeding: 0,
      altered_mental_status: 0,
    },
    mockNetworkError: true,
    expectedLabel: 'Emergency',
    expectedEmergency: true,
    expectedUrgent: true,
    expectedDriverSubstrings: ['Hypotensive Shock', '78'],
  },
  {
    name: 'Severe Active Bleeding Flag - Offline Mode',
    input: {
      heart_rate: 95,
      systolic_bp: 118,
      oxygen_saturation: 97,
      severe_bleeding: 1,
      altered_mental_status: 0,
    },
    mockNetworkError: true,
    expectedLabel: 'Emergency',
    expectedEmergency: true,
    expectedUrgent: true,
    expectedDriverSubstrings: ['Severe Uncontrolled Bleeding'],
  },
  {
    name: 'Altered Mental Status Flag - Offline Mode',
    input: {
      heart_rate: 85,
      systolic_bp: 125,
      oxygen_saturation: 96,
      severe_bleeding: 0,
      altered_mental_status: 1,
    },
    mockNetworkError: true,
    expectedLabel: 'Emergency',
    expectedEmergency: true,
    expectedUrgent: true,
    expectedDriverSubstrings: ['Altered Mental Status'],
  },
  {
    name: 'Moderate Hypoxia & Tachycardia - Offline Urgent Tier',
    input: {
      heart_rate: 122,
      systolic_bp: 105,
      oxygen_saturation: 91,
      severe_bleeding: 0,
      altered_mental_status: 0,
    },
    mockNetworkError: true,
    expectedLabel: 'Urgent',
    expectedEmergency: false,
    expectedUrgent: true,
  },
  {
    name: 'Online Mode - Backend ML Service Response Passthrough',
    input: {
      heart_rate: 148,
      systolic_bp: 80,
      oxygen_saturation: 86,
      severe_bleeding: 1,
      altered_mental_status: 1,
    },
    mockNetworkError: false,
    expectedLabel: 'Emergency',
    expectedEmergency: true,
    expectedUrgent: true,
    expectedDriverSubstrings: ['Critical Hypoxemia', 'Severe Tachycardia'],
  },
];

async function runVerification() {
  console.log('===============================================================');
  console.log('🩺 MOBILE VITALS TRIAGE & OFFLINE RESILIENCE VERIFICATION');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const originalPost = api.post;

  for (const [idx, s] of scenarios.entries()) {
    process.stdout.write(`[Test ${idx + 1}/${scenarios.length}] ${s.name}... `);

    if (s.mockNetworkError) {
      (api.post as any) = async () => {
        const err: any = new Error('Network Error: Device Offline');
        err.code = 'ECONNREFUSED';
        throw err;
      };
    } else {
      (api.post as any) = async () => {
        return {
          status: 200,
          data: {
            triage_level: 2,
            triage_label: 'Emergency',
            confidence: 0.98,
            probabilities: { 'Non-Urgent': 0.01, Urgent: 0.01, Emergency: 0.98 },
            risk_drivers: ['Critical Hypoxemia', 'Severe Tachycardia'],
            is_emergency: true,
            is_urgent: true,
            latency_ms: 2.1,
          },
        };
      };
    }

    try {
      const result = await VitalsService.evaluateVitalsTriage(s.input);

      // Validate label
      if (result.triage_label !== s.expectedLabel) {
        throw new Error(`Expected label "${s.expectedLabel}" but got "${result.triage_label}"`);
      }

      // Validate emergency flag
      if (result.is_emergency !== s.expectedEmergency) {
        throw new Error(`Expected is_emergency=${s.expectedEmergency} but got ${result.is_emergency}`);
      }

      // Validate urgent flag
      if (result.is_urgent !== s.expectedUrgent) {
        throw new Error(`Expected is_urgent=${s.expectedUrgent} but got ${result.is_urgent}`);
      }

      // Validate driver strings if specified
      if (s.expectedDriverSubstrings) {
        for (const sub of s.expectedDriverSubstrings) {
          const match = result.risk_drivers.some(d => d.includes(sub));
          if (!match) {
            throw new Error(`Expected risk driver containing "${sub}", drivers were: [${result.risk_drivers.join(', ')}]`);
          }
        }
      }

      console.log('✅ PASSED');
      passed++;
    } catch (err: any) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  api.post = originalPost;

  console.log('\n===============================================================');
  console.log(`RESULTS: ${passed}/${scenarios.length} Passed (${failed} Failed)`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
