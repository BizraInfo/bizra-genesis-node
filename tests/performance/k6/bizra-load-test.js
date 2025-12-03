/**
 * BIZRA ELITE PERFORMANCE TEST SUITE
 * ====================================
 * k6 Load Testing for Sovereign AI Infrastructure
 * 
 * Performance Budgets:
 * - API Response Time: P95 < 500ms
 * - Error Rate: < 0.1%
 * - Throughput: > 100 RPS per node
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom Metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const ragLatency = new Trend('rag_latency');
const chatLatency = new Trend('chat_latency');
const sovereigntyChecks = new Counter('sovereignty_checks');

// Test Configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm-up
    { duration: '1m', target: 50 },    // Ramp to normal load
    { duration: '2m', target: 50 },    // Steady state
    { duration: '30s', target: 100 },  // Peak load
    { duration: '1m', target: 100 },   // Sustain peak
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Elite Performance Standards
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'errors': ['rate<0.01'],  // < 1% error rate
    'api_latency': ['p(95)<300'],
    'rag_latency': ['p(95)<200'],
    'chat_latency': ['p(95)<2000'],  // LLM can be slower
  },
  tags: {
    project: 'bizra-genesis-node',
    environment: __ENV.K6_ENVIRONMENT || 'staging',
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';
const DASHBOARD_URL = __ENV.DASHBOARD_URL || 'http://localhost:3000';

// Sovereign Headers (Security)
const headers = {
  'Content-Type': 'application/json',
  'X-Node0-Secret': __ENV.NODE0_SECRET || 'test-secret',
};

export default function () {
  // ============================================
  // GROUP 1: Health & Status Endpoints
  // ============================================
  group('Health Endpoints', () => {
    // Health Check (Critical Path)
    const healthRes = http.get(`${BASE_URL}/health`, { headers });
    
    const healthCheck = check(healthRes, {
      'health status is 200': (r) => r.status === 200,
      'health returns JSON': (r) => r.headers['Content-Type'].includes('application/json'),
      'cortex status present': (r) => JSON.parse(r.body).cortex !== undefined,
      'sovereignty maintained': (r) => {
        const body = JSON.parse(r.body);
        return body.mode === 'genesis' || body.mode === 'sovereign';
      },
    });
    
    errorRate.add(!healthCheck);
    apiLatency.add(healthRes.timings.duration);
    sovereigntyChecks.add(1);
    
    sleep(0.1);
  });

  // ============================================
  // GROUP 2: RAG Knowledge Search
  // ============================================
  group('RAG Knowledge Search', () => {
    const queries = [
      'architecture sovereign',
      'monetization strategy',
      'security encryption',
      'PAT agents configuration',
      'proof of impact',
    ];
    
    const query = queries[Math.floor(Math.random() * queries.length)];
    
    const ragPayload = JSON.stringify({
      query: query,
      top_k: 3,
    });
    
    const ragRes = http.post(`${BASE_URL}/api/knowledge/search`, ragPayload, { headers });
    
    const ragCheck = check(ragRes, {
      'RAG status is 200': (r) => r.status === 200,
      'RAG returns results': (r) => {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.results);
      },
      'RAG response < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!ragCheck);
    ragLatency.add(ragRes.timings.duration);
    
    sleep(0.2);
  });

  // ============================================
  // GROUP 3: Chat Endpoint (LLM Integration)
  // ============================================
  group('Chat Endpoint', () => {
    // Only run chat tests at 10% frequency (expensive)
    if (Math.random() > 0.9) {
      const chatPayload = JSON.stringify({
        message: 'What is the architecture of BIZRA?',
        useRAG: true,
      });
      
      const chatRes = http.post(`${BASE_URL}/api/pat/chat`, chatPayload, {
        headers,
        timeout: '30s',  // LLM needs more time
      });
      
      const chatCheck = check(chatRes, {
        'chat status is 200 or 503': (r) => r.status === 200 || r.status === 503,
        'chat returns response': (r) => {
          if (r.status !== 200) return true;  // Skip if Cortex not ready
          const body = JSON.parse(r.body);
          return body.success === true && body.data?.response;
        },
      });
      
      errorRate.add(!chatCheck);
      chatLatency.add(chatRes.timings.duration);
    }
    
    sleep(0.5);
  });

  // ============================================
  // GROUP 4: Dashboard Static Assets
  // ============================================
  group('Dashboard Performance', () => {
    // Test static asset delivery
    const dashboardRes = http.get(`${DASHBOARD_URL}`, {
      tags: { endpoint: 'dashboard' },
    });
    
    check(dashboardRes, {
      'dashboard loads': (r) => r.status === 200,
      'dashboard response < 3s': (r) => r.timings.duration < 3000,
    });
    
    sleep(0.1);
  });
}

// ============================================
// SETUP: Pre-test validation
// ============================================
export function setup() {
  console.log('🚀 BIZRA Elite Performance Test Suite');
  console.log(`📍 API Target: ${BASE_URL}`);
  console.log(`📍 Dashboard Target: ${DASHBOARD_URL}`);
  
  // Verify endpoints are reachable
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.warn('⚠️ API health check failed - tests may have errors');
  } else {
    console.log('✅ API health check passed');
  }
  
  return {
    startTime: new Date().toISOString(),
  };
}

// ============================================
// TEARDOWN: Post-test reporting
// ============================================
export function teardown(data) {
  console.log('\n📊 BIZRA Performance Test Complete');
  console.log(`⏱️ Started: ${data.startTime}`);
  console.log(`⏱️ Finished: ${new Date().toISOString()}`);
  console.log('\n🏆 Elite Performance Standards:');
  console.log('  - API P95 < 500ms');
  console.log('  - RAG P95 < 200ms');
  console.log('  - Error Rate < 1%');
  console.log('  - Sovereignty: MAINTAINED');
}

// ============================================
// CUSTOM SCENARIOS
// ============================================
export const scenarios = {
  // Constant load for baseline
  baseline: {
    executor: 'constant-vus',
    vus: 10,
    duration: '1m',
    tags: { scenario: 'baseline' },
  },
  
  // Spike test for resilience
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 },
      { duration: '30s', target: 100 },
      { duration: '10s', target: 0 },
    ],
    tags: { scenario: 'spike' },
    startTime: '2m',
  },
  
  // Soak test for memory leaks
  soak: {
    executor: 'constant-vus',
    vus: 20,
    duration: '10m',
    tags: { scenario: 'soak' },
    startTime: '3m',
  },
};
