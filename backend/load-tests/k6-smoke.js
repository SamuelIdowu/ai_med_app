import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '15s',
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests must complete below 300ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Health check endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health status is healthy': (r) => {
      try {
        return JSON.parse(r.body).status === 'healthy';
      } catch (e) {
        return false;
      }
    },
  });

  // 2. Auth check endpoint
  const authPayload = JSON.stringify({ email: 'smoke-test@healthpulse.test' });
  const authRes = http.post(`${BASE_URL}/api/v1/auth/check`, authPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(authRes, {
    'auth check status is 200': (r) => r.status === 200,
    'auth check response has exists flag': (r) => {
      try {
        return typeof JSON.parse(r.body).exists === 'boolean';
      } catch (e) {
        return false;
      }
    },
  });

  // 3. Welcome root
  const rootRes = http.get(`${BASE_URL}/`);
  check(rootRes, {
    'root status is 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
