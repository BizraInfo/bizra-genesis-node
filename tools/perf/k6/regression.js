import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.VUS || 20),
  duration: __ENV.DURATION || '2m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const endpoints = ['/health'];
  for (const ep of endpoints) {
    const res = http.get(`${BASE_URL}${ep}`);
    check(res, {
      'status 200': (r) => r.status === 200,
    });
  }
  sleep(0.2);
}
