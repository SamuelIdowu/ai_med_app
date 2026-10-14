import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// Custom metric trackers for granular performance analysis
const healthLatency = new Trend('latency_health');
const authCheckLatency = new Trend('latency_auth_check');
const providerLatency = new Trend('latency_providers');
const encountersLatency = new Trend('latency_encounters');
const errorRate = new Rate('custom_error_rate');
const requestCounter = new Counter('total_custom_requests');

export const options = {
  stages: [
    { duration: '10s', target: 25 },   // Ramp-up to 25 concurrent users
    { duration: '15s', target: 50 },   // Step up to 50 concurrent users
    { duration: '20s', target: 100 },  // Step up to 100 concurrent users
    { duration: '20s', target: 250 },  // Step up to 250 concurrent users
    { duration: '20s', target: 500 },  // Step up to 500 concurrent users
    { duration: '15s', target: 750 },  // Peak stress test at 750 concurrent users
    { duration: '10s', target: 1000 }, // Ultra-peak boundary test at 1000 concurrent users
    { duration: '15s', target: 0 },    // Ramp-down to 0 (recovery phase)
  ],
  thresholds: {
    // 95% of all requests must complete within 500ms
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Overall failed HTTP transactions must not exceed 2%
    http_req_failed: ['rate<0.02'],
    // Custom error rate
    custom_error_rate: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
  };

  // Scenario 1: Health check / Ping
  const resHealth = http.get(`${BASE_URL}/health`);
  healthLatency.add(resHealth.timings.duration);
  requestCounter.add(1);
  const healthOk = check(resHealth, {
    'health returns 200': (r) => r.status === 200,
  });
  if (!healthOk) errorRate.add(1);

  // Scenario 2: Auth check probe
  const emailProbe = `concurrent-user-${__VU}-${__ITER}@healthpulse-benchmark.local`;
  const resAuth = http.post(
    `${BASE_URL}/api/v1/auth/check`,
    JSON.stringify({ email: emailProbe }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  authCheckLatency.add(resAuth.timings.duration);
  requestCounter.add(1);
  const authOk = check(resAuth, {
    'auth check returns 200': (r) => r.status === 200,
  });
  if (!authOk) errorRate.add(1);

  // Scenario 3: Providers directory lookup (if token provided)
  if (AUTH_TOKEN) {
    const resProviders = http.get(`${BASE_URL}/api/v1/providers`, { headers: authHeaders });
    providerLatency.add(resProviders.timings.duration);
    requestCounter.add(1);
    const provOk = check(resProviders, {
      'providers returns 200': (r) => r.status === 200,
    });
    if (!provOk) errorRate.add(1);

    // Scenario 4: Encounters listing
    const resEncounters = http.get(`${BASE_URL}/api/v1/encounters`, { headers: authHeaders });
    encountersLatency.add(resEncounters.timings.duration);
    requestCounter.add(1);
    const encOk = check(resEncounters, {
      'encounters returns 200': (r) => r.status === 200,
    });
    if (!encOk) errorRate.add(1);
  }

  // Realistic think time between requests (jitter between 200ms - 800ms)
  sleep(0.2 + Math.random() * 0.6);
}
