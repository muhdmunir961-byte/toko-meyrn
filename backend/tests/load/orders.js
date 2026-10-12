// Authenticated read scenario: list seller products (a representative DB-bound path).
// Requires K6_TOKEN (JWT from /auth/login or a scoped API key).
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.K6_TOKEN;

if (!TOKEN) {
  throw new Error('K6_TOKEN is required for authenticated scenarios');
}

export const options = {
  scenarios: {
    products: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 },
        { duration: '60s', target: 20 },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300'],
  },
};

export default function () {
  const res = http.get(`${BASE}/api/v1/seller/products`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  check(res, {
    'products 200': (r) => r.status === 200,
    'json body': (r) => {
      try {
        return Array.isArray(r.json());
      } catch {
        return false;
      }
    },
  });
}