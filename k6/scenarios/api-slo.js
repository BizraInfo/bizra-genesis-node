/**
 * BIZRA Genesis Node - K6 Synthetic Scenario
 * Generates live traffic to verify Grafana panels render with data
 * Low VU count (5) - we're testing wire-up, not load limits
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

// Configuration
export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    // Just verify connectivity, not performance
    'http_req_duration': ['p(95)<2000'],  // 2s is generous for test env
    'errors': ['rate<0.05'],  // 5% error rate acceptable for test
  },
};

// Base URL from environment
const API_BASE = __ENV.API_URL || 'http://localhost:3006';

/**
 * Main scenario - generate traffic to populate metrics
 */
export default function () {
  // Health check
  {
    const res = http.get(`${API_BASE}/health`);
    const success = check(res, {
      'health status is 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
  }

  sleep(0.5);

  // Validation API - Genesis validation
  {
    const res = http.get(`${API_BASE}/validate/genesis`);
    const success = check(res, {
      'genesis validation responds': (r) => r.status === 200 || r.status === 400,
    });
    errorRate.add(!success);
  }

  sleep(0.5);

  // Validation API - PoI validation (will fail with test data, but generates metrics)
  {
    const payload = JSON.stringify({
      poi_id: 'test-poi-001',
      node_id: 'test-node-001',
      signatures: ['test-sig'],
      metadata: {
        timestamp: Date.now()
      }
    });

    const res = http.post(`${API_BASE}/validate/poi`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    // We expect this to fail validation (400), but generate metrics
    const success = check(res, {
      'poi validation responds': (r) => r.status === 200 || r.status === 400,
    });
    errorRate.add(!success);
    apiDuration.add(res.timings.duration);
  }

  sleep(1);

  // Metrics endpoint
  {
    const res = http.get(`${API_BASE}/metrics`);
    const success = check(res, {
      'metrics endpoint responds': (r) => r.status === 200,
      'metrics contain prometheus format': (r) => r.body.includes('# HELP') || r.body.includes('# TYPE'),
    });
    errorRate.add(!success);
  }

  sleep(0.5);
}

/**
 * Setup - runs once before test
 */
export function setup() {
  console.log('🚀 Starting BIZRA synthetic scenario');
  console.log(`   API Base: ${API_BASE}`);
  console.log(`   VUs: ${options.vus}`);
  console.log(`   Duration: ${options.duration}`);

  // Verify API is reachable
  const res = http.get(`${API_BASE}/health`);
  if (res.status !== 200) {
    console.error(`❌ API not reachable at ${API_BASE}/health (status: ${res.status})`);
    console.error('   Make sure the BIZRA Genesis Node is running');
    throw new Error('API not reachable');
  }

  console.log('✅ API reachable, starting scenario\n');
}

/**
 * Teardown - runs once after test
 */
export function teardown(data) {
  console.log('\n✅ Synthetic scenario complete');
  console.log('   Grafana panels should now show data');
}
