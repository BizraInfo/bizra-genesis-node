/**
 * BIZRA Genesis Node - K6 Performance Testing Suite
 * Document ID: BIZRA-NODE0-v1.0.1-GENESIS
 * 
 * Elite Performance Testing Standards:
 * - API endpoint load testing
 * - AI agent latency validation
 * - Sovereignty verification timing
 * - Stress testing for peak loads
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const patLatency = new Trend('pat_agent_latency');
const dbLatency = new Trend('database_latency');
const wsLatency = new Trend('websocket_latency');
const sovereigntyCheckLatency = new Trend('sovereignty_check_latency');
const requestCount = new Counter('requests');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test - quick validation
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
    
    // Load test - normal traffic
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '5m', target: 50 },   // Hold
        { duration: '2m', target: 100 },  // Push higher
        { duration: '5m', target: 100 },  // Hold at peak
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'load' },
    },
    
    // Stress test - find breaking point
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 500,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
    
    // Soak test - endurance
    soak: {
      executor: 'constant-vus',
      vus: 30,
      duration: '30m',
      tags: { test_type: 'soak' },
    },
  },
  
  // Thresholds - Elite performance requirements
  thresholds: {
    // Global thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95th < 500ms, 99th < 1s
    http_req_failed: ['rate<0.01'],                   // Less than 1% failure
    errors: ['rate<0.01'],                            // Error rate < 1%
    
    // API-specific thresholds
    'api_latency': ['p(50)<100', 'p(95)<300'],
    'pat_agent_latency': ['p(50)<300', 'p(95)<500'],  // AI responses
    'database_latency': ['p(95)<50'],
    'websocket_latency': ['p(95)<100'],
    'sovereignty_check_latency': ['p(95)<200'],
    
    // Request throughput
    'requests': ['count>1000'],  // Minimum requests in test
  },
};

// Environment configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3002';

// Test data
const testUsers = [
  { id: 'test-user-001', name: 'Genesis User' },
  { id: 'test-user-002', name: 'Sovereignty Tester' },
  { id: 'test-user-003', name: 'Load Runner' },
];

/**
 * Setup function - runs once at the start
 */
export function setup() {
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'API is healthy': (r) => r.status === 200,
  });
  
  return {
    startTime: Date.now(),
  };
}

/**
 * Main test function
 */
export default function(data) {
  // Select random test user
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  group('Health & Status Endpoints', () => {
    testHealthEndpoint();
    testServicesStatus();
    testResourcesStatus();
  });
  
  group('User API', () => {
    testUserProfile(user);
  });
  
  group('PAT Agent API', () => {
    testPATAgents();
    testPATChat(user);
  });
  
  group('Proof of Intelligence API', () => {
    testPoILog(user);
  });
  
  group('Sovereignty Verification', () => {
    testSovereigntyCheck(user);
  });
  
  sleep(Math.random() * 2);  // Variable think time
}

/**
 * Health endpoint test
 */
function testHealthEndpoint() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/health`);
  const duration = Date.now() - start;
  
  apiLatency.add(duration);
  requestCount.add(1);
  
  const success = check(res, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
    'health body is valid': (r) => r.json('status') === 'healthy',
  });
  
  errorRate.add(!success);
}

/**
 * Services status test
 */
function testServicesStatus() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/services/status`);
  const duration = Date.now() - start;
  
  apiLatency.add(duration);
  requestCount.add(1);
  
  const success = check(res, {
    'services status is 200': (r) => r.status === 200,
    'services response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
}

/**
 * Resources status test
 */
function testResourcesStatus() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/resources/status`);
  const duration = Date.now() - start;
  
  apiLatency.add(duration);
  dbLatency.add(duration);
  requestCount.add(1);
  
  const success = check(res, {
    'resources status is 200': (r) => r.status === 200,
    'resources response time < 100ms': (r) => r.timings.duration < 100,
    'CPU metrics present': (r) => r.json('cpu') !== undefined,
    'Memory metrics present': (r) => r.json('memory') !== undefined,
  });
  
  errorRate.add(!success);
}

/**
 * User profile test
 */
function testUserProfile(user) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/user/profile/${user.id}`);
  const duration = Date.now() - start;
  
  apiLatency.add(duration);
  requestCount.add(1);
  
  // 404 is acceptable for non-existent users
  const success = check(res, {
    'profile status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'profile response time < 150ms': (r) => r.timings.duration < 150,
  });
  
  errorRate.add(!success);
}

/**
 * PAT agents list test
 */
function testPATAgents() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/pat/agents`);
  const duration = Date.now() - start;
  
  apiLatency.add(duration);
  requestCount.add(1);
  
  const success = check(res, {
    'agents status is 200': (r) => r.status === 200,
    'agents response time < 200ms': (r) => r.timings.duration < 200,
    'agents is array': (r) => Array.isArray(r.json()),
  });
  
  errorRate.add(!success);
}

/**
 * PAT chat interaction test
 */
function testPATChat(user) {
  const payload = JSON.stringify({
    userId: user.id,
    message: 'Hello, PAT. What is my sovereignty score?',
    context: { test: true },
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/pat/chat`, payload, params);
  const duration = Date.now() - start;
  
  patLatency.add(duration);
  requestCount.add(1);
  
  const success = check(res, {
    'PAT chat status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'PAT response time < 500ms': (r) => r.timings.duration < 500,
    'PAT response has message': (r) => r.json('response') !== undefined || r.json('message') !== undefined,
  });
  
  errorRate.add(!success);
}

/**
 * Proof of Intelligence logging test
 */
function testPoILog(user) {
  const payload = JSON.stringify({
    userId: user.id,
    eventType: 'LEARNING',
    data: {
      action: 'performance_test',
      timestamp: new Date().toISOString(),
      metadata: { k6: true },
    },
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/poi/log`, payload, params);
  const duration = Date.now() - start;
  
  apiLatency.add(duration);
  dbLatency.add(duration);
  requestCount.add(1);
  
  const success = check(res, {
    'PoI log status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'PoI log response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
}

/**
 * Sovereignty verification test
 */
function testSovereigntyCheck(user) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/sovereignty/verify/${user.id}`);
  const duration = Date.now() - start;
  
  sovereigntyCheckLatency.add(duration);
  requestCount.add(1);
  
  const success = check(res, {
    'sovereignty check status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'sovereignty check time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
}

/**
 * WebSocket connection test (separate scenario)
 */
export function websocketTest() {
  const url = `${WS_URL}/telemetry`;
  
  const start = Date.now();
  const response = ws.connect(url, {}, function(socket) {
    socket.on('open', () => {
      wsLatency.add(Date.now() - start);
      
      // Send subscription message
      socket.send(JSON.stringify({
        type: 'subscribe',
        channels: ['telemetry', 'events'],
      }));
    });
    
    socket.on('message', (data) => {
      const parsed = JSON.parse(data);
      check(parsed, {
        'WS message has type': (m) => m.type !== undefined,
      });
    });
    
    socket.on('error', (e) => {
      errorRate.add(1);
    });
    
    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });
  
  check(response, {
    'WS connection successful': (r) => r && r.status === 101,
  });
}

/**
 * Teardown function - runs once at the end
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Test completed in ${duration.toFixed(2)} seconds`);
}
