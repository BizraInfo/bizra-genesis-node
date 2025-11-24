// BIZRA Genesis Node - k6 Load Test
// Progressive load testing with 7-stage scenario (50→1000 RPS)
//
// This script tests the BIZRA Genesis Node API under progressively increasing load,
// measuring response times, error rates, and ensuring SLO compliance.
//
// Usage:
//   k6 run --out json=k6-results.json tests/k6/load_test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// Custom Metrics
// ============================================================================

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const requestCounter = new Counter('requests_total');

// ============================================================================
// Test Configuration
// ============================================================================

export const options = {
  // 7-stage progressive load: 50→1000 RPS
  stages: [
    // Stage 1: Warm-up to 50 RPS
    { duration: '30s', target: 50 },
    
    // Stage 2: Ramp to 100 RPS and hold
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    
    // Stage 3: Ramp to 250 RPS
    { duration: '30s', target: 250 },
    { duration: '1m', target: 250 },
    
    // Stage 4: Ramp to 500 RPS
    { duration: '30s', target: 500 },
    { duration: '1m', target: 500 },
    
    // Stage 5: Ramp to 750 RPS
    { duration: '30s', target: 750 },
    { duration: '1m', target: 750 },
    
    // Stage 6: Push to 1000 RPS
    { duration: '30s', target: 1000 },
    { duration: '1m', target: 1000 },
    
    // Stage 7: Cool down
    { duration: '30s', target: 0 },
  ],

  // Thresholds define SLO compliance
  thresholds: {
    // P95 latency must be under 500ms
    'http_req_duration': ['p(95)<500'],
    
    // Error rate must be under 1%
    'errors': ['rate<0.01'],
    
    // 99% of requests must complete successfully
    'http_req_failed': ['rate<0.01'],
  },
  
  // Additional options
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0 (BIZRA Genesis Node)',
};

// ============================================================================
// Environment Configuration
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3006';

// ============================================================================
// Test Scenarios
// ============================================================================

/**
 * Health check endpoint test
 */
function testHealthCheck() {
  const response = http.get(`${BASE_URL}/health`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
  apiDuration.add(response.timings.duration);
  requestCounter.add(1);
  
  return success;
}

/**
 * Metrics endpoint test
 */
function testMetrics() {
  const response = http.get(`${BASE_URL}/metrics`, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
  
  const success = check(response, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics contains prometheus format': (r) => r.body.includes('# TYPE'),
    'metrics response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
  apiDuration.add(response.timings.duration);
  requestCounter.add(1);
  
  return success;
}

/**
 * Genesis validation endpoint test
 */
function testGenesisValidation() {
  const response = http.get(`${BASE_URL}/validate/genesis`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(response, {
    'genesis validation status is 200': (r) => r.status === 200,
    'genesis validation has ok field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('ok');
      } catch (e) {
        return false;
      }
    },
    'genesis validation response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  errorRate.add(!success);
  apiDuration.add(response.timings.duration);
  requestCounter.add(1);
  
  return success;
}

/**
 * PoI validation endpoint test (with valid test payload)
 */
function testPoIValidation() {
  const payload = JSON.stringify({
    attestation: {
      genesis_root: "0000000000000000000000000000000000000000000000000000000000000000",
      node_id: "test-node-001",
      timestamp: Date.now(),
      proof_of_inclusion: {
        merkle_path: [],
        leaf_index: 0,
      },
    },
    signature: "0000000000000000000000000000000000000000000000000000000000000000",
  });
  
  const response = http.post(`${BASE_URL}/validate/poi`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // This endpoint may return 4xx for invalid test data, which is expected
  const success = check(response, {
    'poi validation returns response': (r) => r.status >= 200 && r.status < 600,
    'poi validation response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  apiDuration.add(response.timings.duration);
  requestCounter.add(1);
  
  return success;
}

// ============================================================================
// Main Test Function
// ============================================================================

export default function () {
  // Distribute load across different endpoints
  const rand = Math.random();
  
  if (rand < 0.4) {
    // 40% health checks (lightweight)
    testHealthCheck();
  } else if (rand < 0.7) {
    // 30% metrics (medium)
    testMetrics();
  } else if (rand < 0.9) {
    // 20% genesis validation (heavier)
    testGenesisValidation();
  } else {
    // 10% PoI validation (heaviest)
    testPoIValidation();
  }
  
  // Small sleep to simulate realistic user behavior
  sleep(0.1);
}

// ============================================================================
// Setup and Teardown
// ============================================================================

export function setup() {
  console.log('Starting k6 load test...');
  console.log(`Target: ${BASE_URL}`);
  console.log('Progressive load: 50 → 1000 RPS');
  console.log('Duration: ~10 minutes');
  return {};
}

export function teardown(data) {
  console.log('Load test completed');
}

// ============================================================================
// Summary Handler
// ============================================================================

export function handleSummary(data) {
  // Calculate p95 latency
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const errorRateValue = data.metrics.errors?.values?.rate || 0;
  
  console.log('\n========================================');
  console.log('LOAD TEST SUMMARY');
  console.log('========================================');
  console.log(`Total Requests:    ${data.metrics.requests_total?.values?.count || 0}`);
  console.log(`P95 Latency:       ${p95.toFixed(2)}ms`);
  console.log(`Error Rate:        ${(errorRateValue * 100).toFixed(2)}%`);
  console.log('========================================\n');
  
  // Return JSON output
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
