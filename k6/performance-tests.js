/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA GENESIS NODE - UNIFIED PERFORMANCE TESTS                           ║
 * ║  CI/CD-integrated performance testing with SLO validation                 ║
 * ║  Version: 1.0.0 - Elite Full-Stack Blueprint                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * This is the main entry point for k6 performance tests in CI/CD pipelines.
 * It supports multiple test scenarios via environment variables and tags.
 *
 * USAGE:
 *   k6 run --tag test_type=functional k6/performance-tests.js
 *   k6 run --tag test_type=performance_validation k6/performance-tests.js
 *   k6 run --tag test_type=chaos k6/performance-tests.js
 *   k6 run --tag test_type=load_testing k6/performance-tests.js
 *
 * ENVIRONMENT VARIABLES:
 *   BASE_URL:      API base URL (default: http://127.0.0.1:8080)
 *   K6_DURATION:   Test duration in seconds (default: 60)
 *   K6_VUS:        Virtual users (default: 10)
 *   TEST_TYPE:     Test type override (functional, performance_validation, chaos, load_testing)
 *
 * SLO TARGETS (from ops/slo.yaml):
 *   - P95 Latency: < 500ms
 *   - P99 Latency: < 1000ms
 *   - Error Rate:  < 1%
 *   - Availability: 99.95%
 */

import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import exec from 'k6/execution';

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM METRICS (aligned with Prometheus metrics)
// ═══════════════════════════════════════════════════════════════════════════

// Error tracking
const errorRate = new Rate('errors');
const http4xxErrors = new Counter('http_4xx_errors');
const http5xxErrors = new Counter('http_5xx_errors');

// Latency tracking by endpoint
const healthLatency = new Trend('health_latency_ms', true);
const metricsLatency = new Trend('metrics_latency_ms', true);
const sapeLatency = new Trend('sape_execution_latency_ms', true);
const agentLatency = new Trend('agent_status_latency_ms', true);

// Throughput
const successfulRequests = new Counter('successful_requests');
const totalRequests = new Counter('total_requests');

// SLO tracking
const sloViolations = new Counter('slo_violations');
const p95Violations = new Counter('p95_violations');

// ═══════════════════════════════════════════════════════════════════════════
// SLO CONFIGURATION (from ops/slo.yaml)
// ═══════════════════════════════════════════════════════════════════════════

const SLO = {
  latency: {
    p50_ms: 50,
    p95_ms: 500,
    p99_ms: 1000,
    max_ms: 5000,
  },
  error_rate: 0.01,  // 1%
  availability: 99.95,
  throughput_rps: 1000,
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const TEST_TYPE = __ENV.TEST_TYPE || __ENV.test_type || 'functional';
const K6_DURATION = parseInt(__ENV.K6_DURATION || '60');
const K6_VUS = parseInt(__ENV.K6_VUS || '10');

// Test configurations by type
const testConfigs = {
  functional_validation: {
    vus: 1,
    duration: '30s',
    thresholds: {
      'http_req_failed': ['rate<0.10'],  // Allow 10% for functional tests
      'http_req_duration': ['p(95)<2000'],  // 2s generous for functional
    },
  },
  performance_validation: {
    stages: [
      { duration: '30s', target: 1 },    // Warm-up
      { duration: '2m', target: 100 },   // Ramp to normal load
      { duration: '3m', target: 100 },   // Sustain
      { duration: '2m', target: 250 },   // Push to higher load
      { duration: '2m', target: 500 },   // Peak load
      { duration: '1m', target: 0 },     // Ramp down
    ],
    thresholds: {
      'http_req_failed': ['rate<0.01'],
      'http_req_duration': ['p(50)<50', 'p(95)<500', 'p(99)<1000'],
      'health_latency_ms': ['p(95)<100'],
      'sape_execution_latency_ms': ['p(95)<500'],
      'errors': ['rate<0.01'],
    },
  },
  chaos_testing: {
    vus: 50,
    duration: '5m',
    thresholds: {
      'http_req_failed': ['rate<0.05'],  // 5% for chaos
      'http_req_duration': ['p(95)<1000'],
      'errors': ['rate<0.05'],
    },
  },
  load_testing: {
    scenarios: {
      constant_arrival: {
        executor: 'constant-arrival-rate',
        rate: 500,
        timeUnit: '1s',
        duration: '5m',
        preAllocatedVUs: 200,
        maxVUs: 1000,
      },
    },
    thresholds: {
      'http_req_failed': ['rate<0.01'],
      'http_req_duration': ['p(95)<500', 'p(99)<1000'],
      'errors': ['rate<0.01'],
    },
  },
};

// Build options based on test type
const config = testConfigs[TEST_TYPE] || testConfigs.functional_validation;

export const options = {
  // Apply configuration based on test type
  ...(config.stages && { stages: config.stages }),
  ...(config.vus && !config.stages && { vus: config.vus }),
  ...(config.duration && !config.stages && { duration: config.duration }),
  ...(config.scenarios && { scenarios: config.scenarios }),

  // Always apply thresholds
  thresholds: config.thresholds,

  // Tags for filtering
  tags: {
    test_type: TEST_TYPE,
    environment: 'ci',
    service: 'bizra-genesis-node',
  },

  // Summary configuration
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)'],
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Make an HTTP request with metrics tracking
 */
function makeRequest(method, url, params = {}, metricTrend = null) {
  totalRequests.add(1);

  let response;
  const startTime = Date.now();

  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, params.body || null, params);
  }

  const duration = Date.now() - startTime;

  // Track metrics
  if (metricTrend) {
    metricTrend.add(duration);
  }

  // Track errors
  if (response.status >= 400 && response.status < 500) {
    http4xxErrors.add(1);
    errorRate.add(1);
  } else if (response.status >= 500) {
    http5xxErrors.add(1);
    errorRate.add(1);
    sloViolations.add(1);
  } else {
    errorRate.add(0);
    successfulRequests.add(1);
  }

  // Track P95 violations
  if (duration > SLO.latency.p95_ms) {
    p95Violations.add(1);
  }

  return response;
}

/**
 * Generate SAPE execution payload
 */
function generateSapePayload() {
  return JSON.stringify({
    task_id: `task-${exec.vu.idInInstance}-${Date.now()}`,
    action: 'validate',
    parameters: {
      depth: 'standard',
      format: 'json',
      ihsan_floor: 0.7,
    },
    metadata: {
      source: 'k6-performance-test',
      timestamp: new Date().toISOString(),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

export default function () {
  // Health Check - Always run (most frequent)
  group('Health Check', () => {
    const res = makeRequest('GET', `${BASE_URL}/health`, {
      tags: { endpoint: 'health' },
    }, healthLatency);

    check(res, {
      'health status is 200': (r) => r.status === 200,
      'health response has status': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch {
          return false;
        }
      },
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });
  });

  sleep(0.1);

  // Metrics Endpoint
  group('Metrics', () => {
    const res = makeRequest('GET', `${BASE_URL}/metrics`, {
      tags: { endpoint: 'metrics' },
    }, metricsLatency);

    check(res, {
      'metrics status is 200': (r) => r.status === 200,
      'metrics is prometheus format': (r) =>
        r.body && (r.body.includes('# HELP') || r.body.includes('# TYPE')),
    });
  });

  sleep(0.1);

  // SAPE Execution (if test type requires it)
  if (TEST_TYPE !== 'functional_validation') {
    group('SAPE Execution', () => {
      const payload = generateSapePayload();

      const res = makeRequest('POST', `${BASE_URL}/sape/execute`, {
        body: payload,
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'sape_execute' },
      }, sapeLatency);

      check(res, {
        'sape responds (200 or 400)': (r) => r.status === 200 || r.status === 400,
        'sape response time < 500ms': (r) => r.timings.duration < 500,
      });
    });

    sleep(0.1);
  }

  // Agent Status (if test type requires load)
  if (TEST_TYPE === 'performance_validation' || TEST_TYPE === 'load_testing') {
    group('Agent Status', () => {
      const res = makeRequest('GET', `${BASE_URL}/agents/status`, {
        tags: { endpoint: 'agents_status' },
      }, agentLatency);

      check(res, {
        'agents status responds': (r) => r.status === 200 || r.status === 404,
        'agent response time < 100ms': (r) => r.timings.duration < 100,
      });
    });

    sleep(0.1);
  }

  // Chaos-specific scenarios
  if (TEST_TYPE === 'chaos_testing') {
    group('Chaos - Rapid Fire', () => {
      // Send multiple rapid requests
      for (let i = 0; i < 5; i++) {
        makeRequest('GET', `${BASE_URL}/health`, {
          tags: { endpoint: 'health', chaos: 'rapid_fire' },
        });
      }
    });

    // Random sleep to create chaos patterns
    sleep(Math.random() * 0.5);
  }

  // Variable sleep based on test type
  const sleepTime = {
    functional_validation: 1,
    performance_validation: 0.2,
    chaos_testing: 0.1,
    load_testing: 0.05,
  };

  sleep(sleepTime[TEST_TYPE] || 0.5);
}

// ═══════════════════════════════════════════════════════════════════════════
// LIFECYCLE HOOKS
// ═══════════════════════════════════════════════════════════════════════════

export function setup() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  BIZRA GENESIS NODE - PERFORMANCE TEST                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📋 Test Type: ${TEST_TYPE}`);
  console.log(`🌐 Base URL:  ${BASE_URL}`);
  console.log(`👥 VUs:       ${options.vus || 'staged'}`);
  console.log(`⏱️  Duration:  ${options.duration || 'staged'}`);
  console.log('');
  console.log('📊 SLO Targets:');
  console.log(`   P50 Latency: < ${SLO.latency.p50_ms}ms`);
  console.log(`   P95 Latency: < ${SLO.latency.p95_ms}ms`);
  console.log(`   P99 Latency: < ${SLO.latency.p99_ms}ms`);
  console.log(`   Error Rate:  < ${SLO.error_rate * 100}%`);
  console.log('');

  // Verify API is reachable
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.error(`❌ API not reachable at ${BASE_URL}/health`);
    console.error(`   Status: ${healthCheck.status}`);
    fail('API not reachable - aborting test');
  }

  console.log('✅ API health check passed');
  console.log('🚀 Starting performance test...');
  console.log('');

  return {
    startTime: Date.now(),
    testType: TEST_TYPE,
  };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 PERFORMANCE TEST COMPLETE - ${data.testType}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   Duration: ${duration.toFixed(1)}s`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM SUMMARY HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export function handleSummary(data) {
  // Build JSON report for CI/CD
  const report = {
    timestamp: new Date().toISOString(),
    test_type: TEST_TYPE,
    base_url: BASE_URL,
    slo_targets: SLO,
    results: {
      total_requests: data.metrics.http_reqs?.values.count || 0,
      requests_per_second: data.metrics.http_reqs?.values.rate || 0,
      failed_requests: data.metrics.http_req_failed?.values.rate || 0,
      latency: {
        avg: data.metrics.http_req_duration?.values.avg,
        min: data.metrics.http_req_duration?.values.min,
        med: data.metrics.http_req_duration?.values.med,
        max: data.metrics.http_req_duration?.values.max,
        p90: data.metrics.http_req_duration?.values['p(90)'],
        p95: data.metrics.http_req_duration?.values['p(95)'],
        p99: data.metrics.http_req_duration?.values['p(99)'],
      },
      errors: {
        rate: data.metrics.errors?.values.rate || 0,
        http_4xx: data.metrics.http_4xx_errors?.values.count || 0,
        http_5xx: data.metrics.http_5xx_errors?.values.count || 0,
      },
      slo_violations: data.metrics.slo_violations?.values.count || 0,
      p95_violations: data.metrics.p95_violations?.values.count || 0,
    },
    thresholds_passed: true,
  };

  // Check threshold results
  if (data.thresholds) {
    for (const [name, threshold] of Object.entries(data.thresholds)) {
      if (!threshold.ok) {
        report.thresholds_passed = false;
        break;
      }
    }
  }

  // Calculate SLO compliance
  report.slo_compliance = {
    latency_p50: (report.results.latency.med || 0) <= SLO.latency.p50_ms,
    latency_p95: (report.results.latency.p95 || 0) <= SLO.latency.p95_ms,
    latency_p99: (report.results.latency.p99 || 0) <= SLO.latency.p99_ms,
    error_rate: (report.results.errors.rate || 0) <= SLO.error_rate,
  };
  report.slo_compliance.overall =
    report.slo_compliance.latency_p50 &&
    report.slo_compliance.latency_p95 &&
    report.slo_compliance.latency_p99 &&
    report.slo_compliance.error_rate;

  // Generate text summary
  const textReport = generateTextSummary(data, report);

  return {
    'stdout': textReport,
    'performance_results.json': JSON.stringify(report, null, 2),
  };
}

function generateTextSummary(data, report) {
  const metrics = data.metrics;

  let output = `
╔═══════════════════════════════════════════════════════════════════════════╗
║  BIZRA GENESIS NODE - PERFORMANCE TEST RESULTS                            ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 Test Configuration:
   Type:     ${TEST_TYPE}
   Base URL: ${BASE_URL}
   Time:     ${report.timestamp}

📊 Request Metrics:
   Total Requests:    ${report.results.total_requests}
   Requests/second:   ${report.results.requests_per_second.toFixed(2)} RPS
   Failed Requests:   ${(report.results.failed_requests * 100).toFixed(2)}%

⏱️  Latency Metrics:
   Average:  ${report.results.latency.avg?.toFixed(2) || 'N/A'}ms
   Median:   ${report.results.latency.med?.toFixed(2) || 'N/A'}ms
   P90:      ${report.results.latency.p90?.toFixed(2) || 'N/A'}ms
   P95:      ${report.results.latency.p95?.toFixed(2) || 'N/A'}ms  (SLO: <${SLO.latency.p95_ms}ms)
   P99:      ${report.results.latency.p99?.toFixed(2) || 'N/A'}ms  (SLO: <${SLO.latency.p99_ms}ms)
   Max:      ${report.results.latency.max?.toFixed(2) || 'N/A'}ms

❌ Error Metrics:
   Error Rate:   ${(report.results.errors.rate * 100).toFixed(2)}%  (SLO: <${SLO.error_rate * 100}%)
   HTTP 4xx:     ${report.results.errors.http_4xx}
   HTTP 5xx:     ${report.results.errors.http_5xx}
   SLO Violations: ${report.results.slo_violations}

🎯 SLO Compliance:
   P50 Latency:  ${report.slo_compliance.latency_p50 ? '✅ PASS' : '❌ FAIL'}
   P95 Latency:  ${report.slo_compliance.latency_p95 ? '✅ PASS' : '❌ FAIL'}
   P99 Latency:  ${report.slo_compliance.latency_p99 ? '✅ PASS' : '❌ FAIL'}
   Error Rate:   ${report.slo_compliance.error_rate ? '✅ PASS' : '❌ FAIL'}

   Overall:      ${report.slo_compliance.overall ? '✅ SLO COMPLIANT' : '❌ SLO VIOLATED'}

📈 Threshold Results:
`;

  if (data.thresholds) {
    for (const [name, threshold] of Object.entries(data.thresholds)) {
      output += `   ${threshold.ok ? '✅' : '❌'} ${name}\n`;
    }
  }

  output += `
═══════════════════════════════════════════════════════════════════════════
${report.thresholds_passed && report.slo_compliance.overall
  ? '🎉 ALL TESTS PASSED - PERFORMANCE VALIDATED'
  : '⚠️  SOME TESTS FAILED - REVIEW REQUIRED'}
═══════════════════════════════════════════════════════════════════════════
`;

  return output;
}
