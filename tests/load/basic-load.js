import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // Test authentication endpoint
  const authPayload = JSON.stringify({
    email: `test${Math.random()}@example.com`,
    password: 'TestPassword123!'
  });

  const authResponse = http.post(`${BASE_URL}/api/auth/login`, authPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(authResponse, {
    'auth status is 200': (r) => r.status === 200,
    'auth response has token': (r) => JSON.parse(r.body).accessToken !== undefined,
  });

  sleep(1);
}
