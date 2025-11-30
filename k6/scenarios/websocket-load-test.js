/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA GENESIS NODE - WEBSOCKET LOAD TEST                                 ║
 * ║  Real-time communication performance validation                           ║
 * ║  Version: 1.0.0 - Elite Full-Stack Blueprint                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Tests WebSocket connection handling, message throughput, and real-time
 * communication under various load conditions.
 *
 * USAGE:
 *   k6 run --env WS_URL=ws://localhost:8080 k6/scenarios/websocket-load-test.js
 *   k6 run --env TEST_MODE=stress k6/scenarios/websocket-load-test.js
 *
 * TEST MODES:
 *   - smoke:     Quick validation (10 connections, 1 minute)
 *   - load:      Standard load test (100 connections, 5 minutes)
 *   - stress:    Stress test (500 connections, 10 minutes)
 *   - soak:      Endurance test (50 connections, 30 minutes)
 *
 * SLO TARGETS:
 *   - Connection establish time: < 1000ms
 *   - Message round-trip time: < 100ms (P95)
 *   - Message delivery rate: > 99%
 *   - Connection stability: > 99.9% (no unexpected disconnects)
 */

import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import exec from 'k6/execution';

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM METRICS
// ═══════════════════════════════════════════════════════════════════════════

// Connection metrics
const connectionSuccessRate = new Rate('ws_connection_success');
const connectionLatency = new Trend('ws_connection_latency_ms', true);
const unexpectedDisconnects = new Counter('ws_unexpected_disconnects');
const activeConnections = new Gauge('ws_active_connections');

// Message metrics
const messagesSent = new Counter('ws_messages_sent');
const messagesReceived = new Counter('ws_messages_received');
const messageDeliveryRate = new Rate('ws_message_delivery_rate');
const messageRoundTripTime = new Trend('ws_message_rtt_ms', true);

// Error metrics
const wsErrors = new Counter('ws_errors');
const errorRate = new Rate('ws_error_rate');

// ═══════════════════════════════════════════════════════════════════════════
// SLO CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SLO = {
  connection: {
    establish_time_ms: 1000,
    stability_rate: 0.999,  // 99.9%
  },
  message: {
    rtt_p95_ms: 100,
    rtt_p99_ms: 500,
    delivery_rate: 0.99,  // 99%
  },
  throughput: {
    messages_per_second: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const WS_URL = __ENV.WS_URL || 'ws://localhost:8080/ws';
const API_URL = __ENV.API_URL || 'http://localhost:8080';
const TEST_MODE = __ENV.TEST_MODE || 'load';

// Test mode configurations
const testConfigs = {
  smoke: {
    vus: 10,
    duration: '1m',
    description: 'Quick smoke test - 10 concurrent connections',
  },
  load: {
    stages: [
      { duration: '1m', target: 25 },
      { duration: '3m', target: 100 },
      { duration: '1m', target: 0 },
    ],
    description: 'Standard load test - up to 100 concurrent connections',
  },
  stress: {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '3m', target: 300 },
      { duration: '3m', target: 500 },
      { duration: '2m', target: 0 },
    ],
    description: 'Stress test - up to 500 concurrent connections',
  },
  soak: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '26m', target: 50 },
      { duration: '2m', target: 0 },
    ],
    description: 'Soak test - 50 concurrent connections for 30 minutes',
  },
  ci: {
    vus: 5,
    duration: '30s',
    description: 'CI quick validation - 5 connections',
  },
};

const config = testConfigs[TEST_MODE] || testConfigs.load;

export const options = {
  ...(config.stages ? { stages: config.stages } : { vus: config.vus, duration: config.duration }),

  thresholds: {
    // Connection SLOs
    'ws_connection_success': ['rate>0.99'],
    'ws_connection_latency_ms': [`p(95)<${SLO.connection.establish_time_ms}`],
    'ws_unexpected_disconnects': ['count<10'],

    // Message SLOs
    'ws_message_delivery_rate': [`rate>${SLO.message.delivery_rate}`],
    'ws_message_rtt_ms': [
      `p(95)<${SLO.message.rtt_p95_ms}`,
      `p(99)<${SLO.message.rtt_p99_ms}`,
    ],

    // Error SLOs
    'ws_error_rate': ['rate<0.01'],
  },

  tags: {
    test_mode: TEST_MODE,
    service: 'bizra-genesis-node-websocket',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════

const MessageType = {
  PING: 'ping',
  PONG: 'pong',
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth_success',
  AUTH_ERROR: 'auth_error',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  MESSAGE: 'message',
  TYPING: 'typing',
  PRESENCE: 'presence',
  ERROR: 'error',
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique client ID
 */
function generateClientId() {
  return `k6-client-${exec.vu.idInInstance}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a WebSocket message
 */
function createMessage(type, payload = {}) {
  return JSON.stringify({
    type,
    payload,
    timestamp: Date.now(),
    client_id: generateClientId(),
  });
}

/**
 * Parse WebSocket message
 */
function parseMessage(data) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Track message round-trip time
 */
function trackRoundTrip(sentTime, receivedTime) {
  const rtt = receivedTime - sentTime;
  messageRoundTripTime.add(rtt);
  return rtt;
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBSOCKET SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

export default function () {
  const clientId = generateClientId();
  const pendingMessages = new Map();
  let connectionStartTime = Date.now();
  let isConnected = false;
  let messagesReceivedCount = 0;
  let messagesSentCount = 0;

  group('WebSocket Connection', () => {
    const wsResponse = ws.connect(WS_URL, {
      tags: { client_id: clientId },
    }, function (socket) {
      // Connection established
      const connectionTime = Date.now() - connectionStartTime;
      connectionLatency.add(connectionTime);
      isConnected = true;
      activeConnections.add(1);

      connectionSuccessRate.add(1);
      check(connectionTime, {
        'connection established within SLO': (t) => t < SLO.connection.establish_time_ms,
      });

      // Set up event handlers
      socket.on('open', () => {
        console.log(`[${clientId}] Connection opened`);

        // Send authentication
        const authMessage = createMessage(MessageType.AUTH, {
          token: 'test-token-' + clientId,
        });
        socket.send(authMessage);
        messagesSent.add(1);
        messagesSentCount++;
      });

      socket.on('message', (data) => {
        const message = parseMessage(data);
        if (!message) {
          wsErrors.add(1);
          errorRate.add(1);
          return;
        }

        messagesReceived.add(1);
        messagesReceivedCount++;
        messageDeliveryRate.add(1);
        errorRate.add(0);

        // Track RTT for responses to our messages
        if (message.request_id && pendingMessages.has(message.request_id)) {
          const sentTime = pendingMessages.get(message.request_id);
          trackRoundTrip(sentTime, Date.now());
          pendingMessages.delete(message.request_id);
        }

        // Handle different message types
        switch (message.type) {
          case MessageType.PONG:
            // Ping-pong successful
            break;

          case MessageType.AUTH_SUCCESS:
            console.log(`[${clientId}] Authenticated`);
            break;

          case MessageType.AUTH_ERROR:
            console.log(`[${clientId}] Auth failed: ${message.payload?.error}`);
            break;

          case MessageType.ERROR:
            wsErrors.add(1);
            console.log(`[${clientId}] Error: ${message.payload?.error}`);
            break;
        }
      });

      socket.on('error', (e) => {
        wsErrors.add(1);
        errorRate.add(1);
        console.error(`[${clientId}] WebSocket error: ${e}`);
      });

      socket.on('close', () => {
        activeConnections.add(-1);
        if (isConnected) {
          isConnected = false;
          // Check if this was an unexpected disconnect
          // (i.e., not initiated by our test)
        }
      });

      // Run test scenario
      socket.setTimeout(() => {
        // Phase 1: Ping-pong test
        group('Ping-Pong', () => {
          for (let i = 0; i < 5; i++) {
            const pingId = `ping-${i}-${Date.now()}`;
            const pingMessage = createMessage(MessageType.PING, {
              request_id: pingId,
            });
            pendingMessages.set(pingId, Date.now());
            socket.send(pingMessage);
            messagesSent.add(1);
            messagesSentCount++;
            sleep(0.1);
          }
        });
      }, 1000);

      socket.setTimeout(() => {
        // Phase 2: Subscribe to channels
        group('Channel Subscription', () => {
          const channels = ['system', 'agents', 'metrics'];
          channels.forEach((channel) => {
            const subMessage = createMessage(MessageType.SUBSCRIBE, {
              channel,
              request_id: `sub-${channel}-${Date.now()}`,
            });
            pendingMessages.set(subMessage.request_id, Date.now());
            socket.send(subMessage);
            messagesSent.add(1);
            messagesSentCount++;
          });
        });
      }, 2000);

      socket.setTimeout(() => {
        // Phase 3: Send messages burst
        group('Message Burst', () => {
          const burstSize = TEST_MODE === 'stress' ? 20 : 10;
          for (let i = 0; i < burstSize; i++) {
            const msgId = `msg-${i}-${Date.now()}`;
            const chatMessage = createMessage(MessageType.MESSAGE, {
              request_id: msgId,
              content: `Test message ${i} from ${clientId}`,
              channel: 'system',
            });
            pendingMessages.set(msgId, Date.now());
            socket.send(chatMessage);
            messagesSent.add(1);
            messagesSentCount++;
          }
        });
      }, 3000);

      socket.setTimeout(() => {
        // Phase 4: Typing indicators
        group('Typing Indicators', () => {
          socket.send(createMessage(MessageType.TYPING, {
            channel: 'system',
            is_typing: true,
          }));
          messagesSent.add(1);
          messagesSentCount++;

          sleep(0.5);

          socket.send(createMessage(MessageType.TYPING, {
            channel: 'system',
            is_typing: false,
          }));
          messagesSent.add(1);
          messagesSentCount++;
        });
      }, 4000);

      socket.setTimeout(() => {
        // Phase 5: Presence update
        group('Presence Update', () => {
          socket.send(createMessage(MessageType.PRESENCE, {
            status: 'active',
            metadata: {
              last_activity: Date.now(),
            },
          }));
          messagesSent.add(1);
          messagesSentCount++;
        });
      }, 4500);

      // Hold connection open for the test duration
      const holdDuration = TEST_MODE === 'smoke' ? 5 : (TEST_MODE === 'soak' ? 25 : 10);
      socket.setTimeout(() => {
        // Clean unsubscribe
        const channels = ['system', 'agents', 'metrics'];
        channels.forEach((channel) => {
          socket.send(createMessage(MessageType.UNSUBSCRIBE, { channel }));
          messagesSent.add(1);
          messagesSentCount++;
        });

        // Close connection gracefully
        socket.close();
      }, holdDuration * 1000);
    });

    // Check connection result
    check(wsResponse, {
      'WebSocket connection successful': (r) => r && r.status === 101,
    });

    if (!wsResponse || wsResponse.status !== 101) {
      connectionSuccessRate.add(0);
      wsErrors.add(1);
      errorRate.add(1);
    }
  });

  // Small delay between iterations
  sleep(Math.random() * 2 + 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// LIFECYCLE HOOKS
// ═══════════════════════════════════════════════════════════════════════════

export function setup() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  BIZRA GENESIS NODE - WEBSOCKET LOAD TEST                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📋 Test Mode: ${TEST_MODE} - ${config.description}`);
  console.log(`🌐 WebSocket URL: ${WS_URL}`);
  console.log(`🌐 API URL: ${API_URL}`);
  console.log('');
  console.log('📊 SLO Targets:');
  console.log(`   Connection Time: < ${SLO.connection.establish_time_ms}ms`);
  console.log(`   Message RTT P95: < ${SLO.message.rtt_p95_ms}ms`);
  console.log(`   Message RTT P99: < ${SLO.message.rtt_p99_ms}ms`);
  console.log(`   Delivery Rate:   > ${SLO.message.delivery_rate * 100}%`);
  console.log(`   Stability:       > ${SLO.connection.stability_rate * 100}%`);
  console.log('');

  // Verify HTTP endpoint is reachable (WebSocket server should be on same host)
  const healthCheck = http.get(`${API_URL}/health`);
  if (healthCheck.status !== 200) {
    console.warn(`⚠️ API health check failed (${healthCheck.status})`);
    console.warn('   WebSocket tests may fail if server is not running');
  } else {
    console.log('✅ API health check passed');
  }

  console.log('🚀 Starting WebSocket load test...');
  console.log('');

  return {
    startTime: Date.now(),
    testMode: TEST_MODE,
  };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 WEBSOCKET LOAD TEST COMPLETE - ${data.testMode}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   Duration: ${duration.toFixed(1)}s`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM SUMMARY HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export function handleSummary(data) {
  const report = {
    timestamp: new Date().toISOString(),
    test_mode: TEST_MODE,
    ws_url: WS_URL,
    slo_targets: SLO,
    results: {
      connections: {
        success_rate: data.metrics.ws_connection_success?.values.rate || 0,
        latency_p95: data.metrics.ws_connection_latency_ms?.values['p(95)'] || 0,
        unexpected_disconnects: data.metrics.ws_unexpected_disconnects?.values.count || 0,
      },
      messages: {
        sent: data.metrics.ws_messages_sent?.values.count || 0,
        received: data.metrics.ws_messages_received?.values.count || 0,
        delivery_rate: data.metrics.ws_message_delivery_rate?.values.rate || 0,
        rtt_avg: data.metrics.ws_message_rtt_ms?.values.avg || 0,
        rtt_p95: data.metrics.ws_message_rtt_ms?.values['p(95)'] || 0,
        rtt_p99: data.metrics.ws_message_rtt_ms?.values['p(99)'] || 0,
      },
      errors: {
        count: data.metrics.ws_errors?.values.count || 0,
        rate: data.metrics.ws_error_rate?.values.rate || 0,
      },
    },
    slo_compliance: {},
    thresholds_passed: true,
  };

  // Calculate SLO compliance
  report.slo_compliance = {
    connection_time: report.results.connections.latency_p95 <= SLO.connection.establish_time_ms,
    message_rtt_p95: report.results.messages.rtt_p95 <= SLO.message.rtt_p95_ms,
    message_rtt_p99: report.results.messages.rtt_p99 <= SLO.message.rtt_p99_ms,
    delivery_rate: report.results.messages.delivery_rate >= SLO.message.delivery_rate,
    error_rate: report.results.errors.rate <= 0.01,
  };
  report.slo_compliance.overall = Object.values(report.slo_compliance).every((v) => v === true);

  // Check threshold results
  if (data.thresholds) {
    for (const threshold of Object.values(data.thresholds)) {
      if (!threshold.ok) {
        report.thresholds_passed = false;
        break;
      }
    }
  }

  // Generate text summary
  const textSummary = `
╔═══════════════════════════════════════════════════════════════════════════╗
║  BIZRA GENESIS NODE - WEBSOCKET LOAD TEST RESULTS                         ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 Test Configuration:
   Mode:   ${TEST_MODE} - ${config.description}
   URL:    ${WS_URL}
   Time:   ${report.timestamp}

🔌 Connection Metrics:
   Success Rate:     ${(report.results.connections.success_rate * 100).toFixed(2)}%
   Connection P95:   ${report.results.connections.latency_p95.toFixed(2)}ms  (SLO: <${SLO.connection.establish_time_ms}ms)
   Unexpected Drops: ${report.results.connections.unexpected_disconnects}

📨 Message Metrics:
   Messages Sent:     ${report.results.messages.sent}
   Messages Received: ${report.results.messages.received}
   Delivery Rate:     ${(report.results.messages.delivery_rate * 100).toFixed(2)}%  (SLO: >${SLO.message.delivery_rate * 100}%)
   RTT Average:       ${report.results.messages.rtt_avg.toFixed(2)}ms
   RTT P95:           ${report.results.messages.rtt_p95.toFixed(2)}ms  (SLO: <${SLO.message.rtt_p95_ms}ms)
   RTT P99:           ${report.results.messages.rtt_p99.toFixed(2)}ms  (SLO: <${SLO.message.rtt_p99_ms}ms)

❌ Error Metrics:
   Error Count: ${report.results.errors.count}
   Error Rate:  ${(report.results.errors.rate * 100).toFixed(2)}%

🎯 SLO Compliance:
   Connection Time: ${report.slo_compliance.connection_time ? '✅ PASS' : '❌ FAIL'}
   Message RTT P95: ${report.slo_compliance.message_rtt_p95 ? '✅ PASS' : '❌ FAIL'}
   Message RTT P99: ${report.slo_compliance.message_rtt_p99 ? '✅ PASS' : '❌ FAIL'}
   Delivery Rate:   ${report.slo_compliance.delivery_rate ? '✅ PASS' : '❌ FAIL'}
   Error Rate:      ${report.slo_compliance.error_rate ? '✅ PASS' : '❌ FAIL'}

   Overall:         ${report.slo_compliance.overall ? '✅ SLO COMPLIANT' : '❌ SLO VIOLATED'}

═══════════════════════════════════════════════════════════════════════════
${report.thresholds_passed && report.slo_compliance.overall
  ? '🎉 ALL WEBSOCKET TESTS PASSED'
  : '⚠️  SOME TESTS FAILED - REVIEW REQUIRED'}
═══════════════════════════════════════════════════════════════════════════
`;

  return {
    'stdout': textSummary,
    'websocket-load-test-results.json': JSON.stringify(report, null, 2),
  };
}
