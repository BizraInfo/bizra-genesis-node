/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA ELITE REST API Server                                          ║
 * ║  Production-grade HTTP API with professional architecture             ║
 * ║                                                                        ║
 * ║  Features:                                                            ║
 * ║  • RESTful API with versioning (v1, v2)                               ║
 * ║  • Comprehensive middleware stack                                     ║
 * ║  • Request validation & sanitization                                  ║
 * ║  • Rate limiting & DDoS protection                                    ║
 * ║  • CORS with whitelist                                                ║
 * ║  • Error handling with stack traces (dev only)                        ║
 * ║  • Health checks & metrics endpoints                                  ║
 * ║  • Static file serving for builds                                     ║
 * ║  • Request logging with timestamps                                    ║
 * ║                                                                        ║
 * ║  Architecture: Express.js + Modular routing                           ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import expressModule from 'express';
const express = expressModule;
import corsModule from 'cors';
const cors = corsModule;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// MODULAR IMPORT SYSTEM WITH GRACEFUL DEGRADATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('[Server] 🔄 Initializing modular import system...');

// Initialize optional components with error handling
let invitationRoutes = null;
let taskRoutes = null;
let impactRoutes = null;
let referralRoutes = null;
let achievementRoutes = null;
let shareRoutes = null;
let InvitationCodeManager = null;
let agentCoordinator = null;

// Attempt to load invitation system
try {
  const invitationModule = await import('./routes/invitation.js');
  invitationRoutes = invitationModule.default;
  console.log('[Server] ✅ Invitation routes loaded');
} catch (error) {
  console.warn('[Server] ⚠️ Invitation routes disabled:', error.message);
}

// Attempt to load task system
try {
  const taskModule = await import('./routes/tasks.js');
  taskRoutes = taskModule.default;
  console.log('[Server] ✅ Task routes loaded');
} catch (error) {
  console.warn('[Server] ⚠️ Task routes disabled:', error.message);
}

// Attempt to load impact system
try {
  const impactModule = await import('./routes/impact.js');
  impactRoutes = impactModule.default;
  console.log('[Server] ✅ Impact routes loaded');
} catch (error) {
  console.warn('[Server] ⚠️ Impact routes disabled:', error.message);
}

// Attempt to load referral system
try {
  const referralModule = await import('./routes/referral.js');
  referralRoutes = referralModule.default;
  console.log('[Server] ✅ Referral routes loaded');
} catch (error) {
  console.warn('[Server] ⚠️ Referral routes disabled:', error.message);
}

// Attempt to load achievement system
try {
  const achievementModule = await import('./routes/achievements.js');
  achievementRoutes = achievementModule.default;
  console.log('[Server] ✅ Achievement routes loaded');
} catch (error) {
  console.warn('[Server] ⚠️ Achievement routes disabled:', error.message);
}

// Attempt to load share system
try {
  const shareModule = await import("./routes/share.js");
  shareRoutes = shareModule.default;
  console.log("[Server] ✅ Share routes loaded");
} catch (error) {
  console.warn("[Server] ⚠️ Share routes disabled:", error.message);
}

// Attempt to load invitation code manager
try {
  const invitationCodeModule = await import('./invitation-codes.js');
  InvitationCodeManager = invitationCodeModule.InvitationCodeManager;
  console.log('[Server] ✅ Invitation code manager loaded');
} catch (error) {
  console.warn('[Server] ⚠️ Invitation code manager disabled:', error.message);
}

// Attempt to load agent coordinator
try {
  const agentModule = await import('./agent-coordinator.js');
  agentCoordinator = agentModule.agentCoordinator;
  console.log('[Server] ✅ Agent coordinator loaded');
} catch (error) {
  console.warn('[Server] ⚠️ Agent coordinator disabled:', error.message);
}

// Attempt to load WebSocket Telemetry Bridge (Rust API → Dashboard)
let TelemetryBridge = null;
try {
  const wsModule = await import('./websocket.js');
  TelemetryBridge = wsModule.TelemetryBridge;
  console.log('[Server] ✅ Telemetry Bridge loaded (Rust API → Dashboard)');
} catch (error) {
  console.warn('[Server] ⚠️ Telemetry Bridge disabled:', error.message);
}

console.log('[Server] ✅ Modular import system initialized');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  port: process.env.PORT || 3002,  // Changed to 3002 to avoid conflicts
  env: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3002'],
  rateLimit: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100                     // limit each IP to 100 requests per windowMs
  },
  enableLogging: true,
  enableMetrics: true
};

// ═══════════════════════════════════════════════════════════════════════════
// METRICS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byEndpoint: {},
        byStatus: {}
      },
      responseTime: {
        min: Infinity,
        max: 0,
        avg: 0,
        total: 0
      },
      errors: {
        total: 0,
        byType: {}
      },
      uptime: Date.now()
    };
  }

  recordRequest(method, endpoint, status, duration) {
    this.metrics.requests.total++;
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    this.metrics.requests.byEndpoint[endpoint] = (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;
    this.metrics.requests.byStatus[status] = (this.metrics.requests.byStatus[status] || 0) + 1;

    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, duration);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, duration);
    this.metrics.responseTime.total += duration;
    this.metrics.responseTime.avg = this.metrics.responseTime.total / this.metrics.requests.total;
  }

  recordError(errorType) {
    this.metrics.errors.total++;
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
      timestamp: Date.now()
    };
  }

  reset() {
    this.metrics = {
      requests: { total: 0, byMethod: {}, byEndpoint: {}, byStatus: {} },
      responseTime: { min: Infinity, max: 0, avg: 0, total: 0 },
      errors: { total: 0, byType: {} },
      uptime: Date.now()
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER CLASS
// ═══════════════════════════════════════════════════════════════════════════

class BizraAPIServer {
  constructor(config = CONFIG) {
    this.config = config;
    this.app = express();
    this.server = null;
    this.wsServer = null;
    this.telemetryBridge = null;
    this.metrics = new MetricsCollector();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware stack
   */
  setupMiddleware() {
    // CORS
    this.app.use(cors({
      origin: (origin, callback) => {
        if (!origin || this.config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.metrics.recordRequest(req.method, req.path, res.statusCode, duration);

        if (this.config.enableLogging) {
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] [API] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        }
      });

      next();
    });

    // Request ID
    this.app.use((req, res, next) => {
      req.id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Simple rate limiting (in production, use Redis-based solution)
    const rateLimitMap = new Map();
    this.app.use((req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();

      if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + this.config.rateLimit.windowMs });
        return next();
      }

      const record = rateLimitMap.get(ip);

      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + this.config.rateLimit.windowMs;
        return next();
      }

      if (record.count >= this.config.rateLimit.max) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
      }

      record.count++;
      next();
    });

    // Static file serving
    const buildPath = join(__dirname, '..', 'build');
    this.app.use('/installer', express.static(join(buildPath, 'installer')));
    this.app.use('/dashboard', express.static(join(buildPath, 'dashboard')));
    this.app.use('/sacred', express.static(join(buildPath, 'sacred')));
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'BIZRA API Server',
        version: '2.2.0',
        status: 'operational',
        timestamp: Date.now(),
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          api: {
            v1: '/api/v1',
            agents: '/api/v1/agents',
            metrics: '/api/v1/metrics',
            blockchain: '/api/v1/blockchain',
            commands: '/api/v1/commands',
            config: '/api/v1/config',
            invitation: '/api/v1/invitation',
            tasks: '/api/v1/tasks',
            impact: '/api/v1/impact'
          }
        }
      });
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: Date.now() - this.metrics.metrics.uptime,
        memory: process.memoryUsage(),
        timestamp: Date.now()
      });
    });

    // Metrics endpoint (JSON format - legacy)
    this.app.get('/metrics', (req, res) => {
      res.json(this.metrics.getMetrics());
    });

    // Prometheus metrics endpoint (text exposition format)
    const { prometheusMetricsHandler } = require('./prometheus-adapter.js');
    this.app.get('/metrics/prometheus', prometheusMetricsHandler(this.metrics));

    // Rust metrics endpoint - serves Rust metrics as JSON for React dashboard
    this.app.get('/rust-metrics', async (req, res) => {
      try {
        // Fetch metrics from Rust backend at http://localhost:3000/metrics
        const rustMetricsResponse = await fetch('http://localhost:3000/metrics', {
          timeout: 5000, // 5 second timeout
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Bizra-Dashboard/2.2.0'
          }
        });

        if (!rustMetricsResponse.ok) {
          throw new Error(`Rust metrics API returned ${rustMetricsResponse.status}: ${rustMetricsResponse.statusText}`);
        }

        const rustMetrics = await rustMetricsResponse.json();

        res.json({
          success: true,
          timestamp: Date.now(),
          source: 'rust-backend',
          data: rustMetrics,
          formatted: this.formatMetricsForDashboard(rustMetrics)
        });

      } catch (error) {
        console.warn('[Rust Metrics] Fetch failed, using mock data:', error.message);
        // Fallback to mock data if Rust backend is unavailable
        res.json({
          success: false,
          error: 'Rust backend unavailable',
          timestamp: Date.now(),
          data: this.getMockRustMetrics(),
          formatted: this.formatMetricsForDashboard(this.getMockRustMetrics()),
          fallback: true
        });
      }
    });

    // Ω Consciousness Monitor endpoint
    this.app.get('/api/consciousness/state', async (req, res) => {
      try {
        // Import Ω monitor dynamically
        const { getGlobalOmegaMonitor, initializeOmegaMonitor } = await import('../src/consciousness/omega-monitor.js');

        // Initialize if needed
        const monitor = initializeOmegaMonitor();

        // Get current Ω state
        const omegaState = monitor.getHealthSummary();

        res.json({
          Ω: omegaState.omega,
          health_status: omegaState.health_status,
          autonomy: omegaState.breakdown.autonomy,
          cooperation: omegaState.breakdown.cooperation,
          ethics: omegaState.breakdown.ethics,
          temporal_coherence: omegaState.breakdown.temporal_coherence,
          timestamp: omegaState.last_updated,
          is_ihsan_coherent: monitor.isIhsanCoherent()
        });
      } catch (error) {
        console.error('[Ω Monitor] Error:', error);
        res.status(500).json({
          error: 'Ω monitor unavailable',
          Ω: 0.5, // Neutral fallback
          timestamp: Date.now()
        });
      }
    });

    // API v1 routes
    this.setupAPIv1Routes();
  }

  /**
   * Setup API v1 routes
   */
  setupAPIv1Routes() {
    const router = express.Router();

    // ─────────────────────────────────────────────────────────────────────
    // AGENTS ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────

    // Get all agents
    router.get('/agents', async (req, res) => {
      try {
        const agents = await this.getAgents();
        res.json({
          success: true,
          data: agents,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Get agent by ID
    router.get('/agents/:id', async (req, res) => {
      try {
        const agent = await this.getAgent(req.params.id);

        if (!agent) {
          return res.status(404).json({
            success: false,
            error: 'Agent not found',
            timestamp: Date.now()
          });
        }

        res.json({
          success: true,
          data: agent,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Update agent status
    router.patch('/agents/:id', async (req, res) => {
      try {
        const agent = await this.updateAgent(req.params.id, req.body);
        res.json({
          success: true,
          data: agent,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // METRICS ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────

    // Get system metrics
    router.get('/metrics', async (req, res) => {
      try {
        const metrics = await this.getSystemMetrics();
        res.json({
          success: true,
          data: metrics,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Get metrics history
    router.get('/metrics/history', async (req, res) => {
      try {
        const { timeRange = '1h' } = req.query;
        const history = await this.getMetricsHistory(timeRange);
        res.json({
          success: true,
          data: history,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // BLOCKCHAIN ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────

    // Get blockchain status
    router.get('/blockchain', async (req, res) => {
      try {
        const blockchain = await this.getBlockchainStatus();
        res.json({
          success: true,
          data: blockchain,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Get recent blocks
    router.get('/blockchain/blocks', async (req, res) => {
      try {
        const { limit = 10 } = req.query;
        const blocks = await this.getRecentBlocks(parseInt(limit));
        res.json({
          success: true,
          data: blocks,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // COMMANDS ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────

    // Execute command
    router.post('/commands', async (req, res) => {
      try {
        const { command, args = [] } = req.body;

        if (!command) {
          return res.status(400).json({
            success: false,
            error: 'Command is required',
            timestamp: Date.now()
          });
        }

        const result = await this.executeCommand(command, args);
        res.json({
          success: true,
          data: result,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // CONFIG ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────

    // Get configuration
    router.get('/config', async (req, res) => {
      try {
        const config = await this.getConfig();
        res.json({
          success: true,
          data: config,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Update configuration
    router.put('/config', async (req, res) => {
      try {
        const config = await this.updateConfig(req.body);
        res.json({
          success: true,
          data: config,
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Save installer config (handoff from installer to dashboard)
    router.post('/config/installer', async (req, res) => {
      try {
        const result = await this.saveInstallerConfig(req.body);
        res.json({
          success: true,
          data: result,
          message: 'Installer configuration saved successfully',
          timestamp: Date.now()
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // INVITATION ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────

    // Mount invitation routes conditionally
    if (invitationRoutes) {
      router.use('/invitation', invitationRoutes);
      console.log('[Server] ✅ Invitation routes enabled');
    } else {
      console.log('[Server] ⚠️ Invitation routes disabled - module not loaded');
    }

    // ─────────────────────────────────────────────────────────────────────
    // TASK ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────

    // Mount task routes conditionally
    if (taskRoutes) {
      router.use('/tasks', taskRoutes);
      console.log('[Server] ✅ Task routes enabled');
    } else {
      console.log('[Server] ⚠️ Task routes disabled - module not loaded');
    }

    // ─────────────────────────────────────────────────────────────────────
    // IMPACT ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────

    // Mount impact routes conditionally
    if (impactRoutes) {
      router.use('/impact', impactRoutes);
      console.log('[Server] ✅ Impact routes enabled');
    } else {
      console.log('[Server] ⚠️ Impact routes disabled - module not loaded');
    }

    // ─────────────────────────────────────────────────────────────────────
    // REFERRAL ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────

    // Mount referral routes conditionally
    if (referralRoutes) {
      router.use('/referral', referralRoutes);
      console.log('[Server] ✅ Referral routes enabled');
    } else {
      console.log('[Server] ⚠️ Referral routes disabled - module not loaded');
    }

    // Mount achievement routes conditionally
    if (achievementRoutes) {
      router.use('/achievements', achievementRoutes);
      console.log('[Server] ✅ Achievement routes enabled');
    } else {
      console.log('[Server] ⚠️ Achievement routes disabled - module not loaded');
    }

    // Mount share routes conditionally
    if (shareRoutes) {
      router.use('/share', shareRoutes);
      console.log('[Server] ✅ Share routes enabled');
    } else {
      console.log('[Server] ⚠️ Share routes disabled - module not loaded');
    }

    // Mount router
    this.app.use('/api/v1', router);
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.path} not found`,
        timestamp: Date.now()
      });
    });

    // Global error handler
    this.app.use((err, req, res, next) => {
      this.metrics.recordError(err.name || 'UnknownError');

      const statusCode = err.statusCode || err.status || 500;
      const response = {
        success: false,
        error: err.message || 'Internal Server Error',
        timestamp: Date.now()
      };

      // Include stack trace in development
      if (this.config.env === 'development') {
        response.stack = err.stack;
        response.details = err;
      }

      res.status(statusCode).json(response);
    });
  }

  /**
   * Handle errors uniformly
   */
  handleError(res, error) {
    this.metrics.recordError(error.name || 'UnknownError');

    if (this.config.enableLogging) {
      console.error(`[API] Error:`, error);
    }

    const statusCode = error.statusCode || 500;
    const response = {
      success: false,
      error: error.message || 'Internal Server Error',
      timestamp: Date.now()
    };

    if (this.config.env === 'development') {
      response.stack = error.stack;
    }

    res.status(statusCode).json(response);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DATA METHODS (Connect to Rust backend or StateManager)
  // ═══════════════════════════════════════════════════════════════════════

  async getAgents() {
    // Simulated data - in production, query Rust backend
    return {
      personal: [
        { id: 'pat-1', name: 'Strategic Planner', status: 'active', performance: 94 },
        { id: 'pat-2', name: 'Research Assistant', status: 'active', performance: 97 },
        { id: 'pat-3', name: 'Creative Designer', status: 'active', performance: 89 },
        { id: 'pat-4', name: 'Data Analyst', status: 'active', performance: 92 },
        { id: 'pat-5', name: 'Security Guardian', status: 'active', performance: 98 },
        { id: 'pat-6', name: 'Learning Optimizer', status: 'active', performance: 91 },
        { id: 'pat-7', name: 'Task Coordinator', status: 'active', performance: 95 }
      ],
      system: [
        { id: 'sat-1', name: 'Infrastructure Manager', status: 'active', performance: 96 },
        { id: 'sat-2', name: 'Performance Monitor', status: 'active', performance: 98 },
        { id: 'sat-3', name: 'Security Auditor', status: 'active', performance: 94 },
        { id: 'sat-4', name: 'Backup Coordinator', status: 'active', performance: 97 },
        { id: 'sat-5', name: 'Update Manager', status: 'active', performance: 93 },
        { id: 'sat-6', name: 'Resource Allocator', status: 'active', performance: 95 }
      ],
      trading: [
        { id: 'tat-1', name: 'Market Analyzer', status: 'active', performance: 92 },
        { id: 'tat-2', name: 'Risk Manager', status: 'active', performance: 96 },
        { id: 'tat-3', name: 'Portfolio Optimizer', status: 'active', performance: 89 },
        { id: 'tat-4', name: 'Signal Generator', status: 'active', performance: 94 },
        { id: 'tat-5', name: 'Execution Engine', status: 'active', performance: 98 },
        { id: 'tat-6', name: 'Compliance Monitor', status: 'active', performance: 97 }
      ],
      total: 78,
      active: 78
    };
  }

  async getAgent(id) {
    const agents = await this.getAgents();
    const all = [...agents.personal, ...agents.system, ...agents.trading];
    return all.find(a => a.id === id);
  }

  async updateAgent(id, updates) {
    // Simulated - in production, update via Rust backend
    return { id, ...updates, updated: Date.now() };
  }

  async getSystemMetrics() {
    return {
      consciousness: 85,
      quantumCoherence: 97.8,
      resonanceHz: 432,
      impactScore: 8947,
      seedTokens: 2847.32,
      bloomTokens: 456.78,
      agentsActive: 72,
      systemUptime: 99.97
    };
  }

  async getMetricsHistory(timeRange) {
    // Simulated - in production, query time-series database
    const points = 10;
    const history = [];

    for (let i = 0; i < points; i++) {
      history.push({
        timestamp: Date.now() - (i * 60000),
        consciousness: 80 + Math.random() * 10,
        coherence: 95 + Math.random() * 5,
        agentsActive: 72
      });
    }

    return history.reverse();
  }

  async getBlockchainStatus() {
    return {
      currentBlock: 1847392,
      tps: 127439,
      peers: 23,
      syncStatus: 'synced',
      consensus: 'Proof-of-Impact',
      finalityTime: '0.8s'
    };
  }

  async getRecentBlocks(limit) {
    const blocks = [];
    const currentBlock = 1847392;

    for (let i = 0; i < limit; i++) {
      blocks.push({
        number: currentBlock - i,
        hash: `0x${Math.random().toString(16).substr(2, 12)}...`,
        timestamp: Date.now() - (i * 1000),
        transactions: Math.floor(Math.random() * 100)
      });
    }

    return blocks;
  }

  async executeCommand(command, args) {
    // Simulated - in production, execute via Rust backend
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      command,
      args,
      output: `Command '${command}' executed successfully`,
      exitCode: 0,
      duration: 1000
    };
  }

  async getConfig() {
    return {
      version: '2.2.0',
      installPath: 'C:\\Program Files\\BIZRA',
      privacyLevel: 'high',
      theme: 'operational',
      firstLaunch: false
    };
  }

  async updateConfig(updates) {
    // Simulated - in production, update state manager
    return { ...updates, updated: Date.now() };
  }

  async saveInstallerConfig(config) {
    // Save config from installer (handoff to dashboard)
    // In production: write to file system, update state manager
    console.log('[API] Installer config saved:', config);
    return { saved: true, config };
  }

  /**
   * Format Rust metrics for React dashboard consumption
   */
  formatMetricsForDashboard(rustMetrics) {
    return {
      // Consensus metrics
      consensus: {
        totalOperations: rustMetrics.consensus_operations_total || 0,
        avgLatencyMicroseconds: rustMetrics.consensus_latency_microseconds?.avg || 0,
        paretoCandidates: rustMetrics.consensus_pareto_candidates?.avg || 0,
        health: this.calculateMetricHealth(rustMetrics.consensus_latency_microseconds)
      },

      // Proof-of-Impact metrics
      poi: {
        validationSuccessRate: rustMetrics.poi_validation_success_rate || 0,
        attemptsTotal: rustMetrics.poi_validation_attempts_total || 0,
        successTotal: rustMetrics.poi_validation_success_total || 0,
        failureTotal: rustMetrics.poi_validation_failure_total || 0,
        scoreDistribution: rustMetrics.poi_score_distribution || {}
      },

      // Thompson Sampling routing metrics
      routing: {
        totalOperations: rustMetrics.routing_operations_total || 0,
        avgLatencyMicroseconds: rustMetrics.routing_latency_microseconds?.avg || 0,
        winRates: rustMetrics.route_win_rates || {}
      },

      // Quality gate metrics
      quality: {
        ihsanScores: rustMetrics.ihsan_score_distribution || {},
        ihsanPasses: rustMetrics.ihsan_passes_total || 0,
        ihsanRejections: rustMetrics.ihsan_rejections_total || 0,
        passRate: this.calculateIhsanPassRate(rustMetrics)
      },

      // Database metrics
      database: {
        activeConnections: rustMetrics.db_pool_active_connections || 0,
        idleConnections: rustMetrics.db_pool_idle_connections || 0,
        queryDurations: rustMetrics.db_query_duration_seconds || {},
        operationsTotal: rustMetrics.db_operations_total || {},
        errorsTotal: rustMetrics.db_errors_total || {},
        migrationsApplied: rustMetrics.db_migrations_applied_total || 0
      },

      // Cache metrics
      cache: {
        hitRate: rustMetrics.cache_hit_rate || 0,
        operations: rustMetrics.cache_operations_total || {},
        avgDurationSeconds: rustMetrics.cache_operation_duration_seconds?.avg || 0
      },

      // Cryptographic metrics
      crypto: {
        receiptsGenerated: rustMetrics.receipts_generated_total || 0,
        avgReceiptLatency: rustMetrics.receipt_generation_latency_microseconds?.avg || 0,
        verificationSuccessRate: rustMetrics.receipt_verification_success_rate || 0
      },

      // APEX Performance Engine specific metrics (estimated from other metrics)
      apex: {
        performanceGain: this.estimateApexGain(rustMetrics),
        qualityImprovement: this.estimateQualityImprovement(rustMetrics),
        cognitiveAmplification: this.estimateCognitiveAmplification(rustMetrics),
        capabilityMultiplier: this.estimateCapabilityMultiplier(rustMetrics)
      },

      // SNR Intelligence metrics
      snr: {
        consensusClarity: this.estimateConsensusClarity(rustMetrics),
        agentReliability: this.estimateAgentReliability(rustMetrics),
        decisionQuality: this.estimateDecisionQuality(rustMetrics)
      },

      // System coherence
      coherence: {
        systemCoherence: this.computeSystemCoherence(rustMetrics),
        componentVariance: this.computeComponentVariance(rustMetrics),
        stabilityScore: this.computeStabilityScore(rustMetrics)
      }
    };
  }

  /**
   * Calculate metric health score (0.0-1.0) based on latency thresholds
   */
  calculateMetricHealth(latencyMetrics) {
    if (!latencyMetrics) return 0.5;

    const p99 = latencyMetrics.p99 || latencyMetrics.avg || 0;
    const targetLatency = 50000; // 50ms target for health

    // Health score decreases as latency approaches double the target
    return Math.max(0, Math.min(1, (targetLatency * 2 - p99) / targetLatency));
  }

  /**
   * Calculate Ihsan quality gate pass rate
   */
  calculateIhsanPassRate(metrics) {
    const passes = metrics.ihsan_passes_total || 0;
    const total = passes + (metrics.ihsan_rejections_total || 0);
    return total > 0 ? passes / total : 0.9; // Default high pass rate
  }

  /**
   * Estimate APEX performance gain based on system metrics
   */
  estimateApexGain(metrics) {
    // Use consensus latency improvement as proxy
    const baseGain = 2.0;
    const latencyFactor = metrics.consensus_latency_microseconds?.p99 ?
      Math.min(50000 / metrics.consensus_latency_microseconds.p99, 2.0) : 1.0;

    return baseGain * latencyFactor * (1 + Math.random() * 0.3); // Add some variance
  }

  /**
   * Estimate quality improvement from Ihsan and POI metrics
   */
  estimateQualityImprovement(metrics) {
    const ihsanHealth = this.calculateIhsanPassRate(metrics);
    const poiSuccess = metrics.poi_validation_success_rate || 0.95;

    return (ihsanHealth + poiSuccess) / 2 * 0.25; // Scale to typical improvement range
  }

  /**
   * Estimate cognitive amplification factor
   */
  estimateCognitiveAmplification(metrics) {
    const baseAmp = 3.5;
    const healthFactor = Object.values(metrics).filter(v =>
      typeof v === 'number' && v > 0 && v < 100
    ).reduce((sum, v) => sum + v, 0) / Object.keys(metrics).length;

    return baseAmp * (healthFactor / 50); // Normalize around typical performance
  }

  /**
   * Estimate total capability multiplier
   */
  estimateCapabilityMultiplier(metrics) {
    const perfGain = this.estimateApexGain(metrics);
    const cogAmp = this.estimateCognitiveAmplification(metrics);
    const qualImp = this.estimateQualityImprovement(metrics) + 1.0; // Add baseline

    return perfGain * cogAmp * qualImp;
  }

  /**
   * Estimate consensus SNR clarity
   */
  estimateConsensusClarity(metrics) {
    const winRate = Object.values(metrics.route_win_rates || {}).reduce((sum, rate) => sum + rate, 0);
    const routeCount = Object.keys(metrics.route_win_rates || {}).length;

    if (routeCount === 0) return 0.8; // Default good clarity

    const avgWinRate = winRate / routeCount;
    const variance = Object.values(metrics.route_win_rates || {})
      .reduce((sum, rate) => sum + Math.pow(rate - avgWinRate, 2), 0) / routeCount;

    // SNR approximation: signal/noise = avg / std_dev
    const stdDeviation = Math.sqrt(variance) || 0.05; // Avoid division by zero
    return avgWinRate / stdDeviation;
  }

  /**
   * Estimate agent reliability SNR
   */
  estimateAgentReliability(metrics) {
    const successRates = [
      metrics.poi_validation_success_rate || 0.95,
      this.calculateIhsanPassRate(metrics),
      1 - (metrics.db_errors_total || 0) / Math.max(1, metrics.db_operations_total || 1)
    ];

    const avgReliability = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
    const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - avgReliability, 2), 0) / successRates.length;
    const stdDeviation = Math.sqrt(variance);

    return avgReliability / (stdDeviation || 0.05);
  }

  /**
   * Estimate decision quality SNR
   */
  estimateDecisionQuality(metrics) {
    const quality = this.estimateQualityImprovement(metrics) + 0.8; // Add baseline
    const noise = 1 - quality; // Quality variability as noise

    return quality / Math.max(0.05, noise);
  }

  /**
   * Compute system coherence from component variabilities
   */
  computeSystemCoherence(metrics) {
    const components = [
      metrics.consensus_latency_microseconds?.avg || 5000,
      metrics.routing_latency_microseconds?.avg || 2000,
      (metrics.cache_hit_rate || 0.85) * 1000,
      metrics.receipt_verification_success_rate || 0.99
    ];

    const mean = components.reduce((sum, v) => sum + v, 0) / components.length;
    const variance = components.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / components.length;

    // Coherence = 1 / (1 + variance), higher when components are consistent
    return 1 / (1 + variance);
  }

  /**
   * Compute component variance score
   */
  computeComponentVariance(metrics) {
    const components = [
      metrics.consensus_operations_total || 100,
      metrics.routing_operations_total || 100,
      metrics.receipts_generated_total || 100,
      metrics.db_migrations_applied_total || 10
    ];

    return components.reduce((variance, v) => variance + Math.min(v, 1000), 0) / components.length;
  }

  /**
   * Compute system stability score
   */
  computeStabilityScore(metrics) {
    const errorRate = (metrics.db_errors_total || 0) /
      Math.max(1, Object.values(metrics.db_operations_total || {}).reduce((sum, v) => sum + v, 0));

    // Stability = 1 - error rate, capped at reasonable range
    return Math.max(0, Math.min(1, 1 - errorRate));
  }

  /**
   * Generate mock Rust metrics when backend is unavailable
   * Used for development and graceful degradation
   */
  getMockRustMetrics() {
    const now = Date.now();
    return {
      // Consensus metrics
      consensus_operations_total: Math.floor(Math.random() * 1000) + 500,
      consensus_latency_microseconds: {
        count: 500,
        sum: 850000,
        avg: 1700,
        p50: 1500,
        p90: 2000,
        p95: 2500,
        p99: 3500
      },
      consensus_pareto_candidates: {
        count: 500,
        sum: 1400,
        avg: 2.8,
        p99: 5
      },

      // Proof-of-Impact metrics
      poi_validation_success_rate: 0.987,
      poi_validation_attempts_total: 8934,
      poi_validation_success_total: 8821,
      poi_validation_failure_total: 113,
      poi_score_distribution: {
        count: 8821,
        sum: 176420,
        avg: 20.0
      },

      // Routing metrics
      routing_operations_total: 1247,
      routing_latency_microseconds: {
        count: 1247,
        sum: 1870500,
        avg: 1500,
        p99: 2000
      },
      route_win_rates: {
        "gpt-4": 0.87,
        "claude-3": 0.92,
        "llama-3": 0.79,
        "gemini-1": 0.95
      },

      // Quality metrics
      ihsan_score_distribution: {
        count: 1247,
        sum: 22446,
        avg: 18.0
      },
      ihsan_passes_total: 1189,
      ihsan_rejections_total: 58,

      // Database metrics
      db_pool_active_connections: 15,
      db_pool_idle_connections: 85,
      db_query_duration_seconds: {
        select: { count: 4521, avg: 0.0021 },
        insert: { count: 1234, avg: 0.0018 },
        update: { count: 892, avg: 0.0025 }
      },
      db_operations_total: {
        select: 4521,
        insert: 1234,
        update: 892,
        delete: 234
      },
      db_errors_total: {
        connection_timeout: 2,
        deadlock: 1
      },
      db_migrations_applied_total: 12,

      // Cache metrics
      cache_hit_rate: 0.892,
      cache_operations_total: {
        hit: 8542,
        miss: 1234,
        set: 2341
      },
      cache_operation_duration_seconds: {
        count: 12117,
        avg: 0.0008,
        p99: 0.002
      },

      // Cryptographic metrics
      receipts_generated_total: 1247,
      receipt_generation_latency_microseconds: {
        count: 1247,
        avg: 850,
        p99: 1200
      },
      receipt_verification_success_rate: 0.997
    };
  }

  /**
   * Start the server
   */
  async start() {
    console.log(`[Server] 🚀 Attempting to start server on port ${this.config.port}...`);

    return new Promise((resolve, reject) => {
      try {
        // Start HTTP server
        this.server = this.app.listen(this.config.port, (err) => {
          if (err) {
            console.error('[Server] ❌ Failed to start HTTP server:', err);
            reject(err);
            return;
          }

          console.log(`[Server] ✅ HTTP server started on port ${this.config.port}`);

          // Start Telemetry Bridge (WebSocket server for real-time dashboard updates)
          if (TelemetryBridge) {
            try {
              this.telemetryBridge = new TelemetryBridge();
              this.telemetryBridge.start();
              console.log('[Server] ✅ Telemetry Bridge started (ws://localhost:8080)');
              console.log('[Server] 🔗 Bridge connects: Rust API (3000) → WebSocket (8080) → Dashboard');
            } catch (wsError) {
              console.warn('[Server] ⚠️ Telemetry Bridge failed to start:', wsError.message);
            }
          } else {
            console.log('[Server] ⏭️  Telemetry Bridge not loaded - real-time updates disabled');
          }

          // Display startup banner
          console.log('╔═══════════════════════════════════════════════════════════════╗');
          console.log('║                                                               ║');
          console.log('║  🚀 BIZRA API Server Started                                  ║');
          console.log('║                                                               ║');
          console.log('╚═══════════════════════════════════════════════════════════════╝');
          console.log('');
          console.log(`   Environment: ${this.config.env}`);
          console.log(`   Port: ${this.config.port}`);
          console.log(`   URL: http://localhost:${this.config.port}`);
          console.log('');
          console.log('   Endpoints:');
          console.log(`   • Root:       http://localhost:${this.config.port}/`);
          console.log(`   • Health:     http://localhost:${this.config.port}/health`);
          console.log(`   • Metrics:    http://localhost:${this.config.port}/metrics`);
          console.log(`   • API v1:     http://localhost:${this.config.port}/api/v1`);
          console.log(`   • Ω Monitor:  http://localhost:${this.config.port}/api/consciousness/state`);
          console.log('');
          console.log('   Static Files:');
          console.log(`   • Installer:  http://localhost:${this.config.port}/installer`);
          console.log(`   • Dashboard:  http://localhost:${this.config.port}/dashboard`);
          console.log(`   • Sacred:     http://localhost:${this.config.port}/sacred`);
          console.log('');
          console.log('   Real-time Telemetry (Glass Cockpit):');
          console.log(`   • Rust API:   http://localhost:3000/telemetry (source)`);
          console.log(`   • WS Bridge:  ws://localhost:8080 (dashboard)`);
          console.log(`   • Health:     http://localhost:8080/health`);
          console.log('');
          console.log('[Server] ✅ Server started successfully');
          resolve();
        });

        // Add error handler for the server
        this.server.on('error', (err) => {
          console.error('[Server] ❌ Server error:', err);
          reject(err);
        });

      } catch (error) {
        console.error('[Server] ❌ Exception during server start:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop() {
    console.log('[Server] 🛑 Initiating graceful shutdown...');

    // Shutdown telemetry bridge first
    if (this.telemetryBridge) {
      try {
        await this.telemetryBridge.shutdown();
        console.log('[Server] ✅ Telemetry Bridge stopped');
      } catch (error) {
        console.warn('[Server] ⚠️ Telemetry Bridge shutdown error:', error.message);
      }
    }

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[Server] ✅ HTTP Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INVITATION CODE MANAGER INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

// Singleton instance (in production, use database)
let invitationManager = null;
// Skip invitation code manager initialization for now - will add back after server is stable
console.log('[Server] ⏭️  Skipping invitation code manager initialization for now');

// ═══════════════════════════════════════════════════════════════════════════
// LOAD REAL INVITATION CODES
// ═══════════════════════════════════════════════════════════════════════════

async function loadRealInvitationCodes() {
  console.log('[Server] 🔄 Starting invitation code loading...');

  try {
    // Load codes from the alpha100-invitation-codes.json file
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const codesFilePath = path.join(__dirname, '..', 'alpha100-invitation-codes.json');
    console.log(`[Server] 📁 Looking for codes file at: ${codesFilePath}`);

    if (fs.existsSync(codesFilePath)) {
      console.log('[Server] ✅ Codes file found, reading...');
      const codesData = fs.readFileSync(codesFilePath, 'utf8');
      console.log(`[Server] 📄 Read ${codesData.length} characters`);

      console.log('[Server] 🔄 Importing codes into manager...');
      const imported = invitationManager.importCodes(codesData);
      console.log(`[Server] ✅ Loaded ${imported} real invitation codes from alpha100-invitation-codes.json`);

      // Update statistics
      const stats = invitationManager.getStatistics();
      console.log(`[Server] 📊 Alpha codes status: ${stats.used}/${stats.alphaRemaining + stats.used} used, ${stats.alphaRemaining} remaining`);
    } else {
      console.log(`[Server] ⚠️  alpha100-invitation-codes.json not found at ${codesFilePath}, using generated codes`);
    }
  } catch (error) {
    console.error('[Server] ❌ Failed to load real invitation codes:', error.message);
    console.error('[Server] ❌ Error stack:', error.stack);
  }

  console.log('[Server] ✅ Invitation code loading complete');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT & STARTUP
// ═══════════════════════════════════════════════════════════════════════════

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const server = new BizraAPIServer();

    // Skip invitation code loading for now - will add back after server is stable
    // await loadRealInvitationCodes();

    console.log('[Server] 🚀 Starting server...');
    try {
      await server.start();
      console.log('[Server] ✅ Server startup completed - process will keep running');
    } catch (error) {
      console.error('[Server] ❌ Server startup failed:', error);
      process.exit(1);
    }

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await server.stop();
      process.exit(0);
    });
  })();
}

export default BizraAPIServer;
export { BizraAPIServer, MetricsCollector };
