import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

/**
 * BIZRA Genesis Node - Comprehensive Load Testing
 * Enterprise-grade performance testing with multiple scenarios
 */

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM METRICS
// ═══════════════════════════════════════════════════════════════════════════

const errorRate = new Rate('errors');
const synthesisSuccessRate = new Rate('synthesis_success');
const consensusLatency = new Trend('consensus_latency_ms');
const routingLatency = new Trend('routing_latency_ms');
const authLatency = new Trend('auth_latency_ms');
const apiRequests = new Counter('api_requests_total');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:8080';

// Test data
const testUsers = new SharedArray('users', function () {
  return [
    { email: 'user1@example.com', password: 'TestPassword123!' },
    { email: 'user2@example.com', password: 'TestPassword123!' },
    { email: 'user3@example.com', password: 'TestPassword123!' },
    { email: 'user4@example.com', password: 'TestPassword123!' },
    { email: 'user5@example.com', password: 'TestPassword123!' },
  ];
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const options = {
  scenarios: {
    // Scenario 1: Constant load baseline
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      startTime: '0s',
      exec: 'constantLoad',
    },

    // Scenario 2: Ramp-up stress test
    ramp_up_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      startTime: '6m',
      exec: 'rampUpStress',
    },

    // Scenario 3: Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '10s', target: 500 }, // Spike
        { duration: '2m', target: 500 },
        { duration: '10s', target: 10 },
      ],
      startTime: '23m',
      exec: 'spikeTest',
    },

    // Scenario 4: Soak test (long-running)
    soak_test: {
      executor: 'constant-vus',
      vus: 75,
      duration: '30m',
      startTime: '28m',
      exec: 'soakTest',
    },

    // Scenario 5: Synthesis-focused load
    synthesis_heavy: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 100,
      maxVUs: 300,
      startTime: '60m',
      exec: 'synthesisHeavy',
    },

    // Scenario 6: WebSocket stress
    websocket_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      startTime: '72m',
      exec: 'websocketStress',
    },
  },

  thresholds: {
    // HTTP request thresholds
    http_req_duration: [
      'p(95)<500',  // 95% of requests should complete within 500ms
      'p(99)<1000', // 99% of requests should complete within 1s
    ],
    http_req_failed: ['rate<0.01'], // Error rate should be less than 1%

    // Custom metric thresholds
    errors: ['rate<0.05'], // Overall error rate < 5%
    synthesis_success: ['rate>0.95'], // Synthesis success rate > 95%
    consensus_latency_ms: ['p(95)<100', 'p(99)<200'], // Consensus sub-100ms p95
    routing_latency_ms: ['p(95)<10', 'p(99)<25'], // Routing sub-10ms p95
    auth_latency_ms: ['p(95)<200'], // Auth sub-200ms p95

    // Scenario-specific thresholds
    'http_req_duration{scenario:synthesis_heavy}': ['p(95)<800'],
    'http_req_duration{scenario:spike_test}': ['p(95)<2000'],
  },

  // Performance budgets
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)'],
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function authenticate() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  const loginStart = Date.now();
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });

  authLatency.add(Date.now() - loginStart);
  apiRequests.add(1);

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'received token': (r) => r.json('tokens.accessToken') !== undefined,
  });

  if (loginRes.status === 200) {
    return loginRes.json('tokens.accessToken');
  }
  return null;
}

function makeAuthenticatedRequest(method, endpoint, token, body = null) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const params = { headers };

  let response;
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${endpoint}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${endpoint}`, body ? JSON.stringify(body) : null, params);
  } else if (method === 'PUT') {
    response = http.put(`${BASE_URL}${endpoint}`, body ? JSON.stringify(body) : null, params);
  } else if (method === 'DELETE') {
    response = http.del(`${BASE_URL}${endpoint}`, null, params);
  }

  apiRequests.add(1);
  errorRate.add(response.status >= 400);

  return response;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════

export function constantLoad() {
  const token = authenticate();
  if (!token) return;

  group('Health Checks', () => {
    const healthRes = http.get(`${BASE_URL}/api/v1/health`);
    check(healthRes, {
      'health check is 200': (r) => r.status === 200,
      'status is healthy': (r) => r.json('status') === 'healthy',
    });
  });

  group('Metrics Endpoint', () => {
    const metricsRes = makeAuthenticatedRequest('GET', '/api/v1/metrics', token);
    check(metricsRes, {
      'metrics retrieved': (r) => r.status === 200,
    });
  });

  group('Agent List', () => {
    const agentsRes = makeAuthenticatedRequest('GET', '/api/v1/agents', token);
    check(agentsRes, {
      'agents list retrieved': (r) => r.status === 200,
      'has agents': (r) => r.json('agents').length > 0,
    });
  });

  sleep(1);
}

export function rampUpStress() {
  const token = authenticate();
  if (!token) return;

  group('Mixed Workload', () => {
    // Health check
    makeAuthenticatedRequest('GET', '/api/v1/health', token);

    // Metrics
    makeAuthenticatedRequest('GET', '/api/v1/metrics', token);

    // Agents
    const agentsRes = makeAuthenticatedRequest('GET', '/api/v1/agents', token);

    if (agentsRes.status === 200 && agentsRes.json('agents').length > 0) {
      // Get first agent details
      const agentId = agentsRes.json('agents')[0].id;
      makeAuthenticatedRequest('GET', `/api/v1/agents/${agentId}`, token);
    }
  });

  sleep(0.5);
}

export function spikeTest() {
  const token = authenticate();
  if (!token) return;

  // Rapid-fire requests during spike
  for (let i = 0; i < 5; i++) {
    makeAuthenticatedRequest('GET', '/api/v1/health', token);
  }

  sleep(0.1);
}

export function soakTest() {
  const token = authenticate();
  if (!token) return;

  group('Sustained Load', () => {
    makeAuthenticatedRequest('GET', '/api/v1/metrics', token);
    sleep(1);

    makeAuthenticatedRequest('GET', '/api/v1/agents', token);
    sleep(1);

    makeAuthenticatedRequest('GET', '/api/v1/health', token);
    sleep(1);
  });
}

export function synthesisHeavy() {
  const token = authenticate();
  if (!token) return;

  group('Synthesis Operation', () => {
    const synthesisPayload = {
      task: {
        id: `task-${__VU}-${Date.now()}`,
        description: 'Analyze the impact of AI on modern software development',
        parameters: {
          depth: 'comprehensive',
          format: 'markdown',
        },
      },
      contract: {
        ihsan_floor: 0.7,
        accuracy_weight: 0.4,
        safety_weight: 0.3,
      },
      routes: ['gpt-4', 'claude-3', 'llama-3'],
    };

    const synthesisStart = Date.now();
    const synthesisRes = makeAuthenticatedRequest('POST', '/api/v1/synthesis', token, synthesisPayload);

    const synthesisTime = Date.now() - synthesisStart;

    const success = check(synthesisRes, {
      'synthesis successful': (r) => r.status === 200,
      'has winner': (r) => r.json('winner') !== undefined,
      'has receipt': (r) => r.json('receipt') !== undefined,
    });

    synthesisSuccessRate.add(success);

    if (success) {
      const response = synthesisRes.json();
      if (response.latency) {
        if (response.latency.consensus_ms) {
          consensusLatency.add(response.latency.consensus_ms);
        }
        if (response.latency.routing_ms) {
          routingLatency.add(response.latency.routing_ms);
        }
      }
    }
  });

  sleep(2);
}

export function websocketStress() {
  // Note: k6 doesn't have native WebSocket support in all scenarios
  // This is a placeholder for WebSocket stress testing
  // Use a dedicated WebSocket testing tool or extend k6 with xk6-websockets

  const token = authenticate();
  if (!token) return;

  group('WebSocket Simulation via HTTP', () => {
    // Simulate WebSocket-like traffic patterns
    for (let i = 0; i < 10; i++) {
      makeAuthenticatedRequest('GET', '/api/v1/agents', token);
      sleep(0.1);
    }
  });

  sleep(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP & TEARDOWN
// ═══════════════════════════════════════════════════════════════════════════

export function setup() {
  console.log('🚀 Starting BIZRA Genesis Node Load Test');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Test Duration: ~90 minutes`);

  // Verify system is accessible
  const healthCheck = http.get(`${BASE_URL}/api/v1/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`System not ready: ${healthCheck.status}`);
  }

  console.log('✅ System health check passed');

  return { timestamp: Date.now() };
}

export function teardown(data) {
  console.log('✅ Load test completed');
  console.log(`   Duration: ${(Date.now() - data.timestamp) / 1000 / 60} minutes`);
}

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE BUDGETS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export function handleSummary(data) {
  const budgets = {
    'http_req_duration_p95': 500,
    'http_req_duration_p99': 1000,
    'consensus_latency_ms_p95': 100,
    'routing_latency_ms_p95': 10,
    'synthesis_success_rate': 0.95,
    'errors_rate': 0.05,
  };

  const violations = [];

  for (const [metric, budget] of Object.entries(budgets)) {
    const actual = data.metrics[metric]?.values?.value || data.metrics[metric]?.values?.rate;

    if (actual !== undefined) {
      if (metric.includes('rate')) {
        if (actual > budget) {
          violations.push(`${metric}: ${actual.toFixed(4)} > ${budget}`);
        }
      } else {
        if (actual > budget) {
          violations.push(`${metric}: ${actual.toFixed(2)}ms > ${budget}ms`);
        }
      }
    }
  }

  if (violations.length > 0) {
    console.log('\n❌ Performance Budget Violations:');
    violations.forEach(v => console.log(`   ${v}`));
  } else {
    console.log('\n✅ All performance budgets met!');
  }

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
  };
}
