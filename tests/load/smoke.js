/**
 * k6 smoke test — minimal run to verify the target responds.
 * Run: k6 run tests/load/smoke.js
 * Optional: BASE_URL=http://localhost:5173 k6 run tests/load/smoke.js
 */
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';

export const options = {
  vus: 2,
  duration: '5s',
};

export default function () {
  const res = http.get(BASE_URL);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
