/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA GENESIS NODE - SLO COMPLIANCE LOAD TEST                            ║
 * ║  Production-grade performance validation against SLO targets              ║
 * ║  Version: 2.0.0 - Elite Full-Stack Blueprint                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * This test validates against the SLO targets defined in ops/slo.yaml:
 *
 * PERFORMANCE SLOs:
 * - P50 latency: < 100ms
 * - P95 latency: < 500ms
 * - P99 latency: < 1000ms
 * - Error rate: < 2%
 * - Throughput: > 1000 RPS (target: 5000 RPS)
 *
 * RELIABILITY SLOs:
 * - Availability: 99.95%
 *
 * USAGE:
 * k6 run --env API_URL=http://localhost:3000 k6/scenarios/slo-compliance-test.js
 *
 * MODES:
 * - smoke:   Quick validation (10 VUs, 1 minute)
 * - load:    Standard load test (100 VUs, 5 minutes)
 * - stress:  Stress test (500 VUs, 10 minutes)
 * - soak:    Endurance test (50 VUs, 30 minutes)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM METRICS (aligned with Prometheus metrics)
// ═══════════════════════════════════════════════════════════════════════════

// Error tracking
const errorRate = new Rate('slo_error_rate');
const http4xxRate = new Rate('slo_http_4xx_rate');
const http5xxRate = new Rate('slo_http_5xx_rate');

// Latency tracking
const healthLatency = new Trend('slo_health_latency_ms', true);
const authLatency = new Trend('slo_auth_latency_ms', true);
const apiLatency = new Trend('slo_api_latency_ms', true);

// Throughput tracking
const requestsTotal = new Counter('slo_requests_total');
const successfulRequests = new Counter('slo_successful_requests');

// SLO violation tracking
const sloViolations = new Counter('slo_violations_total');
const latencyViolations = new Counter('slo_latency_violations');

// ═══════════════════════════════════════════════════════════════════════════
// SLO THRESHOLDS (from ops/slo.yaml)
// ═══════════════════════════════════════════════════════════════════════════

const SLO = {
  latency: {
    p50_ms: 100,
    p95_ms: 500,
    p99_ms: 1000,
    max_ms: 5000,
  },
  error_rate: {
    client_error_rate: 0.05,  // 5%
    server_error_rate: 0.01,  // 1%
    total_error_rate: 0.02,   // 2%
  },
  throughput: {
    min_rps: 1000,
    target_rps: 5000,
  },
  availability: 99.95,
};

// ═══════════════════════════════════════════════════════════════════════════
// TEST CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const TEST_MODE = __ENV.TEST_MODE || 'load';
const API_BASE = __ENV.API_URL || 'http://localhost:3000';

// Test mode configurations
const testConfigs = {
  smoke: {
    vus: 10,
    duration: '1m',
    description: 'Quick smoke test',
  },
  load: {
    stages: [
      { duration: '1m', target: 50 },   // Ramp up
      { duration: '3m', target: 100 },  // Sustained load
      { duration: '1m', target: 0 },    // Ramp down
    ],
    description: 'Standard load test',
  },
  stress: {
    stages: [
      { duration: '2m', target: 100 },  // Ramp up
      { duration: '3m', target: 300 },  // Push to stress
      { duration: '3m', target: 500 },  // Peak stress
      { duration: '2m', target: 0 },    // Ramp down
    ],
    description: 'Stress test - find breaking point',
  },
  soak: {
    stages: [
      { duration: '2m', target: 50 },   // Ramp up
      { duration: '26m', target: 50 },  // Sustained load
      { duration: '2m', target: 0 },    // Ramp down
    ],
    description: 'Soak test - endurance validation',
  },
  ci: {
    vus: 20,
    duration: '30s',
    description: 'CI/CD quick validation',
  },
};

// Build options based on test mode
const config = testConfigs[TEST_MODE] || testConfigs.load;

export const options = {
  ...(config.stages ? { stages: config.stages } : { vus: config.vus, duration: config.duration }),

  // SLO-aligned thresholds
  thresholds: {
    // Latency SLOs
    'http_req_duration': [
      `p(50)<${SLO.latency.p50_ms}`,
      `p(95)<${SLO.latency.p95_ms}`,
      `p(99)<${SLO.latency.p99_ms}`,
    ],
    'slo_health_latency_ms': [`p(95)<${SLO.latency.p95_ms}`],
    'slo_auth_latency_ms': [`p(95)<${SLO.latency.p95_ms}`],
    'slo_api_latency_ms': [`p(95)<${SLO.latency.p95_ms}`],

    // Error rate SLOs
    'slo_error_rate': [`rate<${SLO.error_rate.total_error_rate}`],
    'slo_http_5xx_rate': [`rate<${SLO.error_rate.server_error_rate}`],
    'slo_http_4xx_rate': [`rate<${SLO.error_rate.client_error_rate}`],

    // Custom SLO violations
    'slo_violations_total': ['count<10'],
    'slo_latency_violations': ['count<50'],

    // Availability (via error rate)
    'http_req_failed': [`rate<${1 - (SLO.availability / 100)}`],
  },

  // Tags for organization
  tags: {
    test_mode: TEST_MODE,
    service: 'bizra-genesis-node',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if response meets SLO latency target
 */
function checkLatencySLO(response, threshold = SLO.latency.p95_ms) {
  const duration = response.timings.duration;
  if (duration > threshold) {
    latencyViolations.add(1);
    return false;
  }
  return true;
}

/**
 * Track response metrics
 */
function trackResponse(response, metricTrend) {
  requestsTotal.add(1);

  const status = response.status;
  const duration = response.timings.duration;

  // Track latency
  if (metricTrend) {
    metricTrend.add(duration);
  }

  // Track errors
  if (status >= 400 && status < 500) {
    http4xxRate.add(1);
    errorRate.add(1);
  } else if (status >= 500) {
    http5xxRate.add(1);
    errorRate.add(1);
    sloViolations.add(1);
  } else {
    http4xxRate.add(0);
    http5xxRate.add(0);
    errorRate.add(0);
    successfulRequests.add(1);
  }

  // Check latency SLO
  checkLatencySLO(response);
}

/**
 * Generate random test data
 */
function generateTestData() {
  const timestamp = Date.now();
  return {
    email: `test-${timestamp}-${Math.random().toString(36).substr(2, 9)}@bizra.test`,
    password: 'TestPassword123!',
    timestamp: timestamp,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

export default function () {
  const testData = generateTestData();

  // Health Check Scenario (most frequent)
  group('Health Check', function () {
    const response = http.get(`${API_BASE}/health`, {
      tags: { endpoint: 'health' },
    });

    const checks = check(response, {
      'health status is 200': (r) => r.status === 200,
      'health response time < P95': (r) => r.timings.duration < SLO.latency.p95_ms,
    });

    trackResponse(response, healthLatency);

    if (!checks) {
      sloViolations.add(1);
    }
  });

  sleep(0.1);

  // Metrics Endpoint
  group('Metrics', function () {
    const response = http.get(`${API_BASE}/metrics`, {
      tags: { endpoint: 'metrics' },
    });

    check(response, {
      'metrics status is 200': (r) => r.status === 200,
      'metrics contains prometheus format': (r) => r.body && r.body.includes('# HELP'),
    });

    trackResponse(response, apiLatency);
  });

  sleep(0.1);

  // Auth Registration Scenario (rate-limited, use sparingly)
  if (exec.scenario.iterationInInstance % 10 === 0) {
    group('Auth - Registration', function () {
      const payload = JSON.stringify({
        email: testData.email,
        password: testData.password,
      });

      const response = http.post(`${API_BASE}/auth/register`, payload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'auth_register' },
      });

      // Accept 200 (success), 400 (validation), or 429 (rate limited)
      check(response, {
        'registration responds correctly': (r) => [200, 201, 400, 429].includes(r.status),
        'registration response time < P95': (r) => r.timings.duration < SLO.latency.p95_ms,
      });

      trackResponse(response, authLatency);
    });
  }

  sleep(0.1);

  // SAT-LAB Outbox (if available)
  group('SAT-LAB', function () {
    const response = http.get(`${API_BASE}/api/sat/outbox`, {
      tags: { endpoint: 'sat_outbox' },
    });

    // Accept 200, 401 (unauthorized), or 404 (not found)
    check(response, {
      'sat outbox responds': (r) => [200, 401, 404].includes(r.status),
      'sat response time < P95': (r) => r.timings.duration < SLO.latency.p95_ms,
    });

    trackResponse(response, apiLatency);
  });

  // Variable sleep to simulate realistic traffic
  sleep(Math.random() * 0.5 + 0.2);
}

// ═══════════════════════════════════════════════════════════════════════════
// LIFECYCLE HOOKS
// ═══════════════════════════════════════════════════════════════════════════

export function setup() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  BIZRA GENESIS NODE - SLO COMPLIANCE TEST                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📋 Test Mode: ${TEST_MODE} - ${config.description}`);
  console.log(`🌐 API Base: ${API_BASE}`);
  console.log('');
  console.log('📊 SLO Targets:');
  console.log(`   P50 Latency: < ${SLO.latency.p50_ms}ms`);
  console.log(`   P95 Latency: < ${SLO.latency.p95_ms}ms`);
  console.log(`   P99 Latency: < ${SLO.latency.p99_ms}ms`);
  console.log(`   Error Rate: < ${SLO.error_rate.total_error_rate * 100}%`);
  console.log(`   Availability: ${SLO.availability}%`);
  console.log('');

  // Verify API is reachable
  const healthCheck = http.get(`${API_BASE}/health`);
  if (healthCheck.status !== 200) {
    console.error(`❌ API not reachable at ${API_BASE}/health`);
    console.error(`   Status: ${healthCheck.status}`);
    throw new Error('API not reachable - aborting test');
  }

  console.log('✅ API health check passed');
  console.log('🚀 Starting load test...');
  console.log('');

  return {
    startTime: Date.now(),
  };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 SLO COMPLIANCE TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   Duration: ${duration.toFixed(1)}s`);
  console.log('');
  console.log('📋 Check the k6 summary above for:');
  console.log('   - http_req_duration percentiles vs SLO targets');
  console.log('   - slo_error_rate vs 2% threshold');
  console.log('   - slo_violations_total count');
  console.log('');
  console.log('💡 If thresholds failed, review:');
  console.log('   1. ops/slo.yaml for target definitions');
  console.log('   2. Prometheus/Grafana for real-time metrics');
  console.log('   3. Application logs for error details');
  console.log('═══════════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM SUMMARY HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export function handleSummary(data) {
  // Generate JSON report for CI/CD integration
  const jsonReport = {
    timestamp: new Date().toISOString(),
    test_mode: TEST_MODE,
    api_url: API_BASE,
    slo_targets: SLO,
    results: {
      total_requests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
      failed_requests: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.passes : 0,
      latency: {
        p50: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(50)'] : null,
        p95: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : null,
        p99: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)'] : null,
      },
      error_rate: data.metrics.slo_error_rate ? data.metrics.slo_error_rate.values.rate : 0,
      slo_violations: data.metrics.slo_violations_total ? data.metrics.slo_violations_total.values.count : 0,
    },
    thresholds_passed: !Object.values(data.root_group.checks || {}).some(c => c.fails > 0),
  };

  // Determine SLO compliance
  const compliance = {
    latency_p50: jsonReport.results.latency.p50 <= SLO.latency.p50_ms,
    latency_p95: jsonReport.results.latency.p95 <= SLO.latency.p95_ms,
    latency_p99: jsonReport.results.latency.p99 <= SLO.latency.p99_ms,
    error_rate: jsonReport.results.error_rate <= SLO.error_rate.total_error_rate,
    overall: false,
  };
  compliance.overall = compliance.latency_p50 && compliance.latency_p95 &&
                       compliance.latency_p99 && compliance.error_rate;

  jsonReport.slo_compliance = compliance;

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6/reports/slo-compliance-report.json': JSON.stringify(jsonReport, null, 2),
  };
}

// Import text summary helper
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
