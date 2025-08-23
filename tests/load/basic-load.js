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

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  // Test health endpoint
  const healthResponse = http.get(`${BASE_URL}/health`);

  check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response is healthy': (r) => {
      try {
        return JSON.parse(r.body).status === 'healthy';
      } catch (e) {
        return false;
      }
    },
  });

  // Test invalid auth attempt (should fail gracefully)
  const authPayload = JSON.stringify({
    idToken: 'invalid-google-token-for-testing'
  });

  const authResponse = http.post(`${BASE_URL}/auth/google`, authPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(authResponse, {
    'auth handles invalid token': (r) => r.status >= 400 && r.status < 500,
    'auth response has error structure': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === false && body.error !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}
