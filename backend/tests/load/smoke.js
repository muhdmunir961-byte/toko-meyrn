// Smoke test: unauthenticated liveness/readiness and public storefront.
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const health = http.get(`${BASE}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const ready = http.get(`${BASE}/ready`);
  check(ready, { 'ready 200': (r) => r.status === 200 });
}