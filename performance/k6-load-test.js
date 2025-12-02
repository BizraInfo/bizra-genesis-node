// BIZRA Node0 - Performance Test Suite (K6)
// Elite Load Testing Configuration
// Professional Standard: Comprehensive performance validation

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// ============================================
// CUSTOM METRICS
// ============================================
const apiLatency = new Trend('bizra_api_latency');
const patAgentLatency = new Trend('bizra_pat_agent_latency');
const dashboardLoadTime = new Trend('bizra_dashboard_load_time');
const errorRate = new Rate('bizra_error_rate');
const requestCount = new Counter('bizra_request_count');
const activeUsers = new Gauge('bizra_active_users');

// ============================================
// CONFIGURATION
// ============================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const DASHBOARD_URL = __ENV.DASHBOARD_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    // Smoke Test: Verify system is working
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { scenario: 'smoke' },
      exec: 'smokeTest',
    },
    
    // Load Test: Normal production load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },  // Ramp up
        { duration: '5m', target: 20 },  // Steady state
        { duration: '2m', target: 0 },   // Ramp down
      ],
      tags: { scenario: 'load' },
      exec: 'loadTest',
      startTime: '1m', // Start after smoke
    },
    
    // Stress Test: Find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '2m', target: 200 },
        { duration: '3m', target: 0 },
      ],
      tags: { scenario: 'stress' },
      exec: 'stressTest',
      startTime: '10m', // Start after load
    },
    
    // Soak Test: Long-running stability
    soak: {
      executor: 'constant-vus',
      vus: 30,
      duration: '30m',
      tags: { scenario: 'soak' },
      exec: 'soakTest',
      startTime: '25m', // Start after stress
    },
    
    // Spike Test: Sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },  // Spike
        { duration: '1m', target: 100 },   // Stay at peak
        { duration: '10s', target: 0 },    // Drop
      ],
      tags: { scenario: 'spike' },
      exec: 'spikeTest',
      startTime: '56m', // Start after soak
    },
  },
  
  thresholds: {
    // API Thresholds
    'http_req_duration{scenario:load}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{scenario:stress}': ['p(95)<1000', 'p(99)<2000'],
    
    // Custom Metrics Thresholds
    'bizra_api_latency': ['p(95)<500', 'p(99)<1000'],
    'bizra_pat_agent_latency': ['p(95)<2000', 'p(99)<5000'],
    'bizra_dashboard_load_time': ['p(95)<3000'],
    'bizra_error_rate': ['rate<0.01'], // < 1% error rate
    
    // Standard HTTP Thresholds
    'http_req_failed': ['rate<0.01'],
    'http_reqs': ['rate>100'], // At least 100 RPS
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function getAuthHeaders() {
  // In real scenario, this would be a real auth token
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  };
}

function checkResponse(res, name) {
  const success = check(res, {
    [`${name} status is 200`]: (r) => r.status === 200,
    [`${name} response time < 500ms`]: (r) => r.timings.duration < 500,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  requestCount.add(1);
  
  return success;
}

// ============================================
// TEST SCENARIOS
// ============================================

// Smoke Test - Basic functionality
export function smokeTest() {
  group('Smoke Test', () => {
    // Health check
    const healthRes = http.get(`${BASE_URL}/health`);
    checkResponse(healthRes, 'Health');
    apiLatency.add(healthRes.timings.duration);
    
    // API version
    const versionRes = http.get(`${BASE_URL}/api/version`);
    check(versionRes, {
      'Version endpoint works': (r) => r.status === 200 || r.status === 404,
    });
    
    sleep(1);
  });
}

// Load Test - Normal production traffic
export function loadTest() {
  activeUsers.add(__VU);
  
  group('API Endpoints', () => {
    // Health check
    const healthRes = http.get(`${BASE_URL}/health`);
    checkResponse(healthRes, 'Health');
    apiLatency.add(healthRes.timings.duration);
    
    // Services status
    const servicesRes = http.get(`${BASE_URL}/api/services/status`, {
      headers: getAuthHeaders(),
    });
    checkResponse(servicesRes, 'Services');
    apiLatency.add(servicesRes.timings.duration);
    
    // PAT agents list
    const agentsRes = http.get(`${BASE_URL}/api/pat/agents`, {
      headers: getAuthHeaders(),
    });
    checkResponse(agentsRes, 'PAT Agents');
    apiLatency.add(agentsRes.timings.duration);
    
    // Resources status
    const resourcesRes = http.get(`${BASE_URL}/api/resources/status`, {
      headers: getAuthHeaders(),
    });
    checkResponse(resourcesRes, 'Resources');
    apiLatency.add(resourcesRes.timings.duration);
  });
  
  group('Dashboard', () => {
    const dashRes = http.get(DASHBOARD_URL);
    check(dashRes, {
      'Dashboard loads': (r) => r.status === 200,
    });
    dashboardLoadTime.add(dashRes.timings.duration);
  });
  
  sleep(Math.random() * 3 + 1); // 1-4 second think time
}

// Stress Test - Find breaking point
export function stressTest() {
  activeUsers.add(__VU);
  
  group('High Load API Calls', () => {
    // Rapid fire health checks
    for (let i = 0; i < 5; i++) {
      const res = http.get(`${BASE_URL}/health`);
      apiLatency.add(res.timings.duration);
      
      if (res.status !== 200) {
        errorRate.add(1);
      }
      requestCount.add(1);
    }
    
    // Heavy endpoint
    const heavyRes = http.post(`${BASE_URL}/api/pat/query`, 
      JSON.stringify({
        query: 'Complex analysis request for stress testing',
        agent: 'MasterReasoner',
      }),
      { headers: getAuthHeaders() }
    );
    patAgentLatency.add(heavyRes.timings.duration);
    checkResponse(heavyRes, 'PAT Query');
  });
  
  sleep(0.5); // Minimal think time for stress
}

// Soak Test - Long-running stability
export function soakTest() {
  activeUsers.add(__VU);
  
  // Standard load test pattern, but for longer
  group('Soak Test - Standard Flow', () => {
    const endpoints = [
      '/health',
      '/api/services/status',
      '/api/pat/agents',
      '/api/resources/status',
    ];
    
    endpoints.forEach(endpoint => {
      const res = http.get(`${BASE_URL}${endpoint}`, {
        headers: getAuthHeaders(),
      });
      apiLatency.add(res.timings.duration);
      checkResponse(res, endpoint);
    });
  });
  
  // Memory-intensive operation
  group('Memory Check', () => {
    const largePayload = {
      data: 'x'.repeat(10000), // 10KB payload
      timestamp: Date.now(),
    };
    
    const res = http.post(`${BASE_URL}/api/echo`,
      JSON.stringify(largePayload),
      { headers: getAuthHeaders() }
    );
    
    check(res, {
      'Large payload handled': (r) => r.status === 200 || r.status === 404,
    });
  });
  
  sleep(2);
}

// Spike Test - Sudden traffic surge
export function spikeTest() {
  activeUsers.add(__VU);
  
  group('Spike - Critical Endpoints', () => {
    // Hit all endpoints simultaneously
    const responses = http.batch([
      ['GET', `${BASE_URL}/health`],
      ['GET', `${BASE_URL}/api/services/status`, null, { headers: getAuthHeaders() }],
      ['GET', `${BASE_URL}/api/pat/agents`, null, { headers: getAuthHeaders() }],
      ['GET', `${BASE_URL}/api/resources/status`, null, { headers: getAuthHeaders() }],
    ]);
    
    responses.forEach((res, i) => {
      apiLatency.add(res.timings.duration);
      if (res.status !== 200) {
        errorRate.add(1);
      }
      requestCount.add(1);
    });
    
    check(responses[0], {
      'Health endpoint survives spike': (r) => r.status === 200,
    });
  });
  
  sleep(0.1); // Very short think time during spike
}

// ============================================
// TEARDOWN & REPORTING
// ============================================
export function handleSummary(data) {
  return {
    'performance/k6-summary.html': htmlReport(data),
    'performance/k6-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const indent = opts?.indent || '';
  let summary = '\n';
  summary += '╔══════════════════════════════════════════════════════════════╗\n';
  summary += '║           BIZRA Node0 - Performance Test Summary             ║\n';
  summary += '╠══════════════════════════════════════════════════════════════╣\n';
  
  // Request statistics
  const reqs = data.metrics.http_reqs;
  if (reqs) {
    summary += `║ Total Requests: ${reqs.values.count.toLocaleString().padStart(10)}                            ║\n`;
    summary += `║ Request Rate:   ${(reqs.values.rate).toFixed(2).padStart(10)} req/s                       ║\n`;
  }
  
  // Latency statistics
  const duration = data.metrics.http_req_duration;
  if (duration) {
    summary += `║ Latency P50:    ${duration.values.med.toFixed(2).padStart(10)} ms                          ║\n`;
    summary += `║ Latency P95:    ${duration.values['p(95)'].toFixed(2).padStart(10)} ms                          ║\n`;
    summary += `║ Latency P99:    ${duration.values['p(99)'].toFixed(2).padStart(10)} ms                          ║\n`;
  }
  
  // Error rate
  const failed = data.metrics.http_req_failed;
  if (failed) {
    const errorPct = (failed.values.rate * 100).toFixed(2);
    const status = failed.values.rate < 0.01 ? '✅' : '❌';
    summary += `║ Error Rate:     ${errorPct.padStart(10)}% ${status}                          ║\n`;
  }
  
  summary += '╠══════════════════════════════════════════════════════════════╣\n';
  
  // Threshold results
  const thresholdsPassed = Object.entries(data.metrics)
    .filter(([_, m]) => m.thresholds)
    .every(([_, m]) => Object.values(m.thresholds).every(t => t.ok));
  
  if (thresholdsPassed) {
    summary += '║ ✅ ALL THRESHOLDS PASSED - SLOs Met                          ║\n';
  } else {
    summary += '║ ❌ THRESHOLD VIOLATIONS DETECTED - Review Required           ║\n';
  }
  
  summary += '╚══════════════════════════════════════════════════════════════╝\n';
  
  return summary;
}
