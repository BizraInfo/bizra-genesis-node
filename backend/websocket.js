/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA GENESIS NODE - WEBSOCKET TELEMETRY BRIDGE                         ║
 * ║  Real-time telemetry streaming from Rust API to React Dashboard          ║
 * ║  The "blood circulation" that brings the Silent Giant to life            ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Connects:                                                               ║
 * ║  • Rust API Server (http://localhost:3000/telemetry)                     ║
 * ║  • React Dashboard (ws://localhost:8080)                                 ║
 * ║                                                                          ║
 * ║  Features:                                                               ║
 * ║  • Automatic reconnection to Rust API                                    ║
 * ║  • Broadcast to all connected dashboard clients                          ║
 * ║  • Health check and circuit breaker                                      ║
 * ║  • Message type routing for agents, consensus, metrics                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // WebSocket server for dashboard clients
  WS_PORT: parseInt(process.env.WS_PORT || '8080', 10),

  // Rust API server telemetry endpoint
  RUST_API_URL: process.env.RUST_API_URL || 'http://localhost:3001',
  TELEMETRY_ENDPOINT: '/telemetry',

  // Polling interval for telemetry (milliseconds)
  POLL_INTERVAL: parseInt(process.env.POLL_INTERVAL || '1000', 10),

  // Reconnection settings
  MAX_RECONNECT_ATTEMPTS: 10,
  RECONNECT_DELAY: 2000,

  // Heartbeat interval (milliseconds)
  HEARTBEAT_INTERVAL: 30000,
};

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES - Matches frontend MessageType enum
// ═══════════════════════════════════════════════════════════════════════════

const MessageType = {
  Authenticate: 'authenticate',
  AuthResponse: 'auth_response',
  AgentMessage: 'agent_message',
  AgentResponse: 'agent_response',
  TypingIndicator: 'typing_indicator',
  PresenceUpdate: 'presence_update',
  SystemMessage: 'system_message',
  Error: 'error',
  Ping: 'ping',
  Pong: 'pong',
  // Custom telemetry types
  TelemetryUpdate: 'telemetry_update',
  ConsensusUpdate: 'consensus_update',
  MetricUpdate: 'metric_update',
};

// ═══════════════════════════════════════════════════════════════════════════
// TELEMETRY BRIDGE CLASS
// ═══════════════════════════════════════════════════════════════════════════

class TelemetryBridge {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // sessionId -> WebSocket
    this.pollInterval = null;
    this.lastTelemetry = null;
    this.isRustApiHealthy = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Start the WebSocket server and telemetry polling
   */
  async start() {
    console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║  BIZRA GENESIS NODE - WEBSOCKET TELEMETRY BRIDGE                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    // Create HTTP server for WebSocket upgrade
    const server = http.createServer((req, res) => {
      // Health check endpoint
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          rust_api_healthy: this.isRustApiHealthy,
          connected_clients: this.clients.size,
          last_telemetry: this.lastTelemetry?.timestamp || null,
        }));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Start server
    server.listen(CONFIG.WS_PORT, () => {
      console.log(`🔌 WebSocket server listening on ws://localhost:${CONFIG.WS_PORT}`);
      console.log(`📊 Health check: http://localhost:${CONFIG.WS_PORT}/health`);
      console.log(`🎯 Polling Rust API: ${CONFIG.RUST_API_URL}${CONFIG.TELEMETRY_ENDPOINT}`);
      console.log('');
    });

    // Start polling Rust API for telemetry
    this.startTelemetryPolling();

    // Start heartbeat
    this.startHeartbeat();

    console.log('✨ Telemetry Bridge is ALIVE - The blood is now circulating!');
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const sessionId = uuidv4();
    const clientInfo = {
      sessionId,
      connectedAt: new Date().toISOString(),
      ip: req.socket.remoteAddress,
      authenticated: false,
    };

    this.clients.set(sessionId, { ws, info: clientInfo });

    console.log(`🔗 Client connected: ${sessionId} (${this.clients.size} total)`);

    // Send initial telemetry if available
    if (this.lastTelemetry) {
      this.sendToClient(ws, MessageType.TelemetryUpdate, this.lastTelemetry);
    }

    // Handle incoming messages
    ws.on('message', (data) => {
      this.handleMessage(sessionId, data);
    });

    // Handle disconnection
    ws.on('close', () => {
      this.clients.delete(sessionId);
      console.log(`👋 Client disconnected: ${sessionId} (${this.clients.size} remaining)`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for ${sessionId}:`, error.message);
    });
  }

  /**
   * Handle incoming message from client
   */
  handleMessage(sessionId, data) {
    try {
      const message = JSON.parse(data.toString());
      const { message_type, payload } = message;

      switch (message_type) {
        case MessageType.Authenticate:
          this.handleAuth(sessionId, payload);
          break;

        case MessageType.Ping:
          this.sendToSession(sessionId, MessageType.Pong, { timestamp: Date.now() });
          break;

        case MessageType.AgentMessage:
          // Forward to Rust API (future enhancement)
          console.log(`📨 Agent message from ${sessionId}:`, payload);
          break;

        default:
          console.log(`❓ Unknown message type: ${message_type}`);
      }
    } catch (error) {
      console.error('Failed to parse message:', error.message);
    }
  }

  /**
   * Handle authentication
   */
  handleAuth(sessionId, payload) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    // For now, accept all tokens (production would validate JWT)
    const { token } = payload;

    if (token) {
      client.info.authenticated = true;
      this.sendToSession(sessionId, MessageType.AuthResponse, {
        success: true,
        user_id: `user-${sessionId.substring(0, 8)}`,
        session_id: sessionId,
      });
      console.log(`✅ Client authenticated: ${sessionId}`);
    } else {
      this.sendToSession(sessionId, MessageType.AuthResponse, {
        success: false,
        error: 'No token provided',
      });
    }
  }

  /**
   * Start polling Rust API for telemetry
   */
  startTelemetryPolling() {
    const pollTelemetry = async () => {
      try {
        const response = await fetch(
          `${CONFIG.RUST_API_URL}${CONFIG.TELEMETRY_ENDPOINT}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const telemetry = await response.json();
        this.lastTelemetry = telemetry;
        this.isRustApiHealthy = true;
        this.reconnectAttempts = 0;

        // Broadcast to all connected clients
        this.broadcast(MessageType.TelemetryUpdate, telemetry);

        // Also send metric updates for specific metrics
        this.sendMetricUpdates(telemetry);

        // Send consensus updates if state changed
        this.sendConsensusUpdate(telemetry);

      } catch (error) {
        this.handleRustApiError(error);
      }
    };

    // Initial poll
    pollTelemetry();

    // Start interval
    this.pollInterval = setInterval(pollTelemetry, CONFIG.POLL_INTERVAL);
  }

  /**
   * Send individual metric updates (for metric stream hooks)
   */
  sendMetricUpdates(telemetry) {
    // Latency metric
    this.broadcast(MessageType.SystemMessage, {
      type: 'metric_update',
      metric_type: 'latency',
      value: telemetry.latency_us,
      unit: 'μs',
      timestamp: Date.now(),
    });

    // Error rate metric
    this.broadcast(MessageType.SystemMessage, {
      type: 'metric_update',
      metric_type: 'error_rate',
      value: telemetry.error_rate,
      unit: '%',
      timestamp: Date.now(),
    });

    // Ihsan score metric
    this.broadcast(MessageType.SystemMessage, {
      type: 'metric_update',
      metric_type: 'ihsan_score',
      value: telemetry.ihsan_score,
      unit: 'score',
      timestamp: Date.now(),
    });
  }

  /**
   * Send consensus state update
   */
  sendConsensusUpdate(telemetry) {
    this.broadcast(MessageType.SystemMessage, {
      type: 'consensus_update',
      consensus_id: `epoch-${telemetry.epoch}`,
      status: telemetry.consensus_state.toLowerCase(),
      agents_voted: telemetry.active_agents.PAT + telemetry.active_agents.SAT,
      total_agents: 18,
      confidence_score: telemetry.ihsan_score,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle Rust API connection error
   */
  handleRustApiError(error) {
    this.isRustApiHealthy = false;
    this.reconnectAttempts++;

    if (this.reconnectAttempts <= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.warn(
        `⚠️ Rust API unreachable (attempt ${this.reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS}):`,
        error.message
      );
    } else {
      console.error('❌ Rust API connection failed after max attempts');
    }

    // Send error notification to clients
    this.broadcast(MessageType.SystemMessage, {
      type: 'notification',
      notification_type: 'warning',
      title: 'Rust API Connection',
      message: `Unable to reach Rust API: ${error.message}`,
      timestamp: Date.now(),
    });
  }

  /**
   * Start heartbeat to keep connections alive
   */
  startHeartbeat() {
    setInterval(() => {
      this.clients.forEach((client, sessionId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          this.sendToClient(client.ws, MessageType.Ping, { timestamp: Date.now() });
        }
      });
    }, CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(messageType, payload) {
    const message = this.createMessage(messageType, payload);
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  /**
   * Send message to specific session
   */
  sendToSession(sessionId, messageType, payload) {
    const client = this.clients.get(sessionId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      this.sendToClient(client.ws, messageType, payload);
    }
  }

  /**
   * Send message to specific WebSocket
   */
  sendToClient(ws, messageType, payload) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(this.createMessage(messageType, payload)));
    }
  }

  /**
   * Create standardized message structure
   */
  createMessage(messageType, payload) {
    return {
      message_type: messageType,
      payload,
      timestamp: Date.now(),
      message_id: uuidv4(),
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down Telemetry Bridge...');

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    // Close all client connections
    this.clients.forEach((client) => {
      client.ws.close(1000, 'Server shutting down');
    });

    if (this.wss) {
      this.wss.close();
    }

    console.log('✅ Telemetry Bridge shutdown complete');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

const bridge = new TelemetryBridge();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await bridge.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await bridge.shutdown();
  process.exit(0);
});

// Start the bridge
bridge.start().catch((error) => {
  console.error('Failed to start Telemetry Bridge:', error);
  process.exit(1);
});

export { TelemetryBridge, MessageType };
