// BIZRA Genesis Node - k6 Load Testing Script
// Phase 1, Sprint 1.2 - Baseline Performance Measurement
//
// Purpose: Establish honest performance baseline for Express.js API
// Target: 500-1K RPS realistic goal (NOT 523K)
// Run: k6 run load-tests/k6-baseline.js

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
  stages: [
    // Warm-up: Gradually increase to 50 RPS
    { duration: '30s', target: 50 },

    // Baseline test: Hold at 100 RPS for 2 minutes
    { duration: '2m', target: 100 },

    // Moderate load: Increase to 500 RPS
    { duration: '1m', target: 500 },

    // Hold at 500 RPS for 2 minutes
    { duration: '2m', target: 500 },

    // Stress test: Push to 1K RPS
    { duration: '1m', target: 1000 },

    // Hold at 1K RPS for 1 minute
    { duration: '1m', target: 1000 },

    // Cool down
    { duration: '30s', target: 0 },
  ],

  thresholds: {
    // 95% of requests should complete within 300ms
    'http_req_duration': ['p(95)<300'],

    // 99% of requests should complete within 500ms
    'http_req_duration': ['p(99)<500'],

    // Error rate should be less than 1%
    'errors': ['rate<0.01'],

    // 95% of requests should succeed (status 200-299)
    'http_req_failed': ['rate<0.05'],
  },
};

// ============================================================================
// Environment Configuration
// ============================================================================

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

// ============================================================================
// Test Scenarios
// ============================================================================

export default function () {
  // Scenario 1: Health Check (lightweight, should always succeed)
  testHealthEndpoint();

  // Scenario 2: API endpoints (moderate load)
  testApiEndpoints();

  // Small delay between scenarios
  sleep(Math.random() * 0.5);
}

// ============================================================================
// Health Check Test
// ============================================================================

function testHealthEndpoint() {
  const healthUrl = `${BASE_URL}/health`;

  const startTime = Date.now();
  const response = http.get(healthUrl);
  const duration = Date.now() - startTime;

  // Record metrics
  apiDuration.add(duration);
  requestCounter.add(1);

  // Validate response
  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
}

// ============================================================================
// API Endpoints Test
// ============================================================================

function testApiEndpoints() {
  const endpoints = [
    '/api/health',
    '/api/impact/validate',
    '/api/achievements',
  ];

  // Randomly select an endpoint
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const url = `${BASE_URL}${endpoint}`;

  const startTime = Date.now();

  let response;
  if (endpoint === '/api/impact/validate') {
    // POST request with sample data
    response = http.post(url, JSON.stringify({
      candidateId: 'test-candidate-001',
      scores: {
        accuracy: 0.95,
        safety: 0.98,
        efficiency: 0.92,
        excellence: 0.96
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    // GET request
    response = http.get(url);
  }

  const duration = Date.now() - startTime;

  // Record metrics
  apiDuration.add(duration);
  requestCounter.add(1);

  // Validate response
  const success = check(response, {
    'API status is 2xx or 3xx': (r) => r.status >= 200 && r.status < 400,
    'API response time <500ms': () => duration < 500,
  });

  errorRate.add(!success);
}

// ============================================================================
// Test Teardown
// ============================================================================

export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  return {
    'load-tests/results/baseline-summary.json': JSON.stringify(data, null, 2),
    'load-tests/results/baseline-summary.txt': generateTextSummary(data, timestamp),
    stdout: generateTextSummary(data, timestamp),
  };
}

function generateTextSummary(data, timestamp) {
  const summary = data.metrics;

  return `
# BIZRA Genesis Node - Load Test Baseline Results

**Test Date**: ${timestamp}
**Test Duration**: ${formatDuration(data.state.testRunDurationMs)}
**Target System**: Express.js API (Node.js backend)

## Summary Statistics

**Requests**:
- Total Requests: ${summary.http_reqs ? summary.http_reqs.values.count : 'N/A'}
- Requests/sec: ${summary.http_reqs ? summary.http_reqs.values.rate.toFixed(2) : 'N/A'} RPS
- Failed Requests: ${summary.http_req_failed ? (summary.http_req_failed.values.rate * 100).toFixed(2) : 'N/A'}%
- Error Rate: ${summary.errors ? (summary.errors.values.rate * 100).toFixed(2) : 'N/A'}%

**Response Times**:
- Min: ${summary.http_req_duration ? summary.http_req_duration.values.min.toFixed(2) : 'N/A'}ms
- Median (P50): ${summary.http_req_duration ? summary.http_req_duration.values.med.toFixed(2) : 'N/A'}ms
- P95: ${summary.http_req_duration ? summary.http_req_duration.values['p(95)'].toFixed(2) : 'N/A'}ms
- P99: ${summary.http_req_duration ? summary.http_req_duration.values['p(99)'].toFixed(2) : 'N/A'}ms
- Max: ${summary.http_req_duration ? summary.http_req_duration.values.max.toFixed(2) : 'N/A'}ms
- Avg: ${summary.http_req_duration ? summary.http_req_duration.values.avg.toFixed(2) : 'N/A'}ms

**Data Transfer**:
- Data Received: ${formatBytes(summary.data_received ? summary.data_received.values.count : 0)}
- Data Sent: ${formatBytes(summary.data_sent ? summary.data_sent.values.count : 0)}

## Threshold Results

${formatThresholds(data.thresholds)}

## Conclusion

${generateConclusion(summary)}

---

*Generated with إحسان (Excellence) • Measured with k6 • Verified with Science*
`;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatThresholds(thresholds) {
  if (!thresholds) return 'No thresholds configured';

  let output = '';
  for (const [name, threshold] of Object.entries(thresholds)) {
    const passed = threshold.ok ? '✅ PASS' : '❌ FAIL';
    output += `- ${name}: ${passed}\n`;
  }
  return output || 'No thresholds evaluated';
}

function generateConclusion(summary) {
  const rps = summary.http_reqs ? summary.http_reqs.values.rate : 0;
  const p95 = summary.http_req_duration ? summary.http_req_duration.values['p(95)'] : 0;
  const errorRate = summary.errors ? summary.errors.values.rate : 0;

  let conclusion = '';

  if (rps < 100) {
    conclusion += '⚠️ **LOW THROUGHPUT**: Achieved <100 RPS. Investigate bottlenecks.\n';
  } else if (rps < 500) {
    conclusion += '🟡 **MODERATE THROUGHPUT**: Achieved ' + rps.toFixed(0) + ' RPS. Room for improvement.\n';
  } else if (rps < 1000) {
    conclusion += '✅ **GOOD THROUGHPUT**: Achieved ' + rps.toFixed(0) + ' RPS. Meets initial goals.\n';
  } else {
    conclusion += '🚀 **EXCELLENT THROUGHPUT**: Achieved ' + rps.toFixed(0) + ' RPS. Exceeds expectations!\n';
  }

  if (p95 > 500) {
    conclusion += '⚠️ **HIGH LATENCY**: P95 >500ms. Optimize response times.\n';
  } else if (p95 > 300) {
    conclusion += '🟡 **MODERATE LATENCY**: P95 = ' + p95.toFixed(0) + 'ms. Acceptable but improvable.\n';
  } else {
    conclusion += '✅ **LOW LATENCY**: P95 = ' + p95.toFixed(0) + 'ms. Excellent performance!\n';
  }

  if (errorRate > 0.01) {
    conclusion += '❌ **HIGH ERROR RATE**: ' + (errorRate * 100).toFixed(2) + '%. Address stability issues.\n';
  } else {
    conclusion += '✅ **STABLE**: Error rate <1%. System is reliable.\n';
  }

  conclusion += '\n**Recommendation**: ';
  if (rps >= 500 && p95 <= 300 && errorRate <= 0.01) {
    conclusion += 'System meets Phase 1 performance goals. Proceed to Phase 2.';
  } else {
    conclusion += 'Optimize bottlenecks before proceeding to Phase 2.';
  }

  return conclusion;
}
