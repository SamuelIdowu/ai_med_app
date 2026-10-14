import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const journeyLatency = new Trend('journey_duration');
const triageLatency = new Trend('journey_triage_duration');
const failureRate = new Rate('journey_failures');

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp to 20 concurrent patients
    { duration: '20s', target: 50 },  // 50 concurrent patients actively using app
    { duration: '20s', target: 100 }, // 100 concurrent patients in emergency surge
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    journey_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const startTime = Date.now();
  const headers = {
    'Content-Type': 'application/json',
    ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
  };

  group('Patient Emergency Workflow Journey', function () {
    // 1. Initial app launch / connectivity check
    const health = http.get(`${BASE_URL}/health`);
    const healthOk = check(health, { 'health check passes': (r) => r.status === 200 });
    if (!healthOk) failureRate.add(1);

    // 2. Authentication verify
    const authCheck = http.post(
      `${BASE_URL}/api/v1/auth/check`,
      JSON.stringify({ email: `patient-${__VU}@healthpulse.test` }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const authOk = check(authCheck, { 'auth lookup passes': (r) => r.status === 200 });
    if (!authOk) failureRate.add(1);

    if (AUTH_TOKEN) {
      // 3. Search medical facilities nearby
      const providers = http.get(`${BASE_URL}/api/v1/providers`, { headers });
      const provOk = check(providers, { 'providers returned': (r) => r.status === 200 });
      if (!provOk) failureRate.add(1);

      // 4. Create emergency encounter
      const encounterPayload = JSON.stringify({
        title: `Emergency Burn Assessment (VU ${__VU})`,
        severity: 'high',
        status: 'active',
        symptoms: ['second degree burn', 'blistering'],
      });
      const encounterRes = http.post(`${BASE_URL}/api/v1/encounters`, encounterPayload, { headers });
      const encOk = check(encounterRes, { 'encounter created': (r) => r.status === 201 });
      if (!encOk) failureRate.add(1);

      // 5. Query encounters list
      const listRes = http.get(`${BASE_URL}/api/v1/encounters`, { headers });
      const listOk = check(listRes, { 'encounters listed': (r) => r.status === 200 });
      if (!listOk) failureRate.add(1);
    }
  });

  const totalTime = Date.now() - startTime;
  journeyLatency.add(totalTime);

  sleep(0.5 + Math.random() * 0.5);
}
