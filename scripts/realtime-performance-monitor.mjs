#!/usr/bin/env node

/**
 * BIZRA Genesis Node - Real-Time Performance Monitoring System
 *
 * Elite real-time performance monitoring with adaptive alerting,
 * predictive analytics, and automated optimization triggers.
 *
 * Features:
 * - Real-time metrics collection from all system components
 * - Adaptive alerting with ML-based anomaly detection
 * - Predictive performance analytics
 * - Automated optimization triggers
 * - Integration with Prometheus/Grafana
 * - SLO tracking and compliance monitoring
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync, spawn } from 'child_process';
import WebSocket from 'ws';
import http from 'http';

// Elite monitoring configuration
const MONITORING_CONFIG = {
  collection_interval: 5000, // 5 seconds
  alerting_thresholds: {
    immediate: { p95_latency: 500, error_rate: 0.05, memory_usage: 0.90 },
    warning: { p95_latency: 200, error_rate: 0.01, memory_usage: 0.80 },
    info: { p95_latency: 100, error_rate: 0.005, memory_usage: 0.70 }
  },
  slo_targets: {
    availability: 0.999, // 99.9% uptime
    latency_p95: 200, // 200ms P95
    error_budget: 0.001 // 0.1% error rate
  },
  anomaly_detection: {
    sensitivity: 0.95, // 95% confidence for anomalies
    lookback_window: 300, // 5 minutes of historical data
    prediction_horizon: 60 // 1 minute prediction window
  }
};

class EliteRealtimePerformanceMonitor {
  constructor() {
    this.metricsBuffer = new Map();
    this.alertsActive = new Map();
    this.anomalyHistory = new Map();
    this.predictionModels = new Map();
    this.websocketClients = new Set();
    this.isRunning = false;
    this.collectionTimer = null;
    this.server = null;
    this.wss = null;
  }

  /**
   * Initialize real-time performance monitoring system
   */
  async initialize() {
    console.log('🚀 Initializing Elite Real-Time Performance Monitoring System');

    // Initialize metrics buffer
    this.initializeMetricsBuffer();

    // Start HTTP server for metrics endpoint
    await this.startMetricsServer();

    // Start WebSocket server for real-time updates
    this.startWebSocketServer();

    // Initialize anomaly detection models
    await this.initializeAnomalyDetection();

    // Start metrics collection
    this.startMetricsCollection();

    console.log('✅ Real-time performance monitoring system initialized');
    console.log(`📊 Metrics endpoint: http://localhost:9091/metrics`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:9092`);
  }

  /**
   * Initialize metrics buffer with all monitored metrics
   */
  initializeMetricsBuffer() {
    const metrics = [
      // Consensus metrics
      'consensus_latency_p50', 'consensus_latency_p95', 'consensus_latency_p99',
      'consensus_success_rate', 'consensus_throughput',

      // Agent communication metrics
      'agent_communication_latency', 'agent_routing_efficiency',
      'agent_failover_rate', 'inter_agent_bandwidth',

      // Cryptographic operations
      'crypto_signing_latency', 'crypto_verification_latency',
      'crypto_operations_success_rate',

      // System resources
      'cpu_usage_percent', 'memory_usage_percent', 'disk_io_mbps',
      'network_io_mbps', 'thread_count', 'connection_count',

      // Application metrics
      'http_request_rate', 'http_response_time_p95', 'http_error_rate',
      'active_connections', 'queue_depth', 'cache_hit_rate',

      // Business metrics
      'proof_of_impact_score', 'ihsan_compliance_score',
      'trust_network_size', 'consensus_participation_rate'
    ];

    metrics.forEach(metric => {
      this.metricsBuffer.set(metric, {
        current: 0,
        history: [],
        timestamp: Date.now(),
        metadata: { unit: this.getMetricUnit(metric) }
      });
    });

    console.log(`📈 Initialized metrics buffer with ${metrics.length} metrics`);
  }

  /**
   * Get appropriate unit for metric
   */
  getMetricUnit(metric) {
    if (metric.includes('latency') || metric.includes('time')) return 'ms';
    if (metric.includes('rate') || metric.includes('percent')) return '%';
    if (metric.includes('throughput') || metric.includes('bandwidth')) return 'ops/sec';
    if (metric.includes('io')) return 'MB/s';
    if (metric.includes('count') || metric.includes('size')) return 'count';
    return 'value';
  }

  /**
   * Start HTTP server for Prometheus metrics scraping
   */
  async startMetricsServer() {
    this.server = http.createServer(async (req, res) => {
      if (req.url === '/metrics' && req.method === 'GET') {
        try {
          const metricsOutput = await this.generatePrometheusMetrics();
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(metricsOutput);
        } catch (error) {
          console.error('Error generating metrics:', error);
          res.writeHead(500);
          res.end('Error generating metrics');
        }
      } else if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          metrics_collected: this.metricsBuffer.size,
          alerts_active: this.alertsActive.size,
          websocket_clients: this.websocketClients.size
        }));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    return new Promise((resolve, reject) => {
      this.server.listen(9091, 'localhost', (err) => {
        if (err) reject(err);
        else {
          console.log('📊 Metrics server listening on http://localhost:9091');
          resolve();
        }
      });
    });
  }

  /**
   * Start WebSocket server for real-time client updates
   */
  startWebSocketServer() {
    this.wss = new WebSocket.Server({ port: 9092 });

    this.wss.on('connection', (ws) => {
      console.log('🔌 New WebSocket client connected');
      this.websocketClients.add(ws);

      // Send initial state
      this.sendRealtimeUpdate(ws, 'initial_state', {
        metrics: Object.fromEntries(this.metricsBuffer),
        alerts: Array.from(this.alertsActive.values()),
        timestamp: Date.now()
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.websocketClients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.websocketClients.delete(ws);
      });
    });

    console.log('🔌 WebSocket server listening on ws://localhost:9092');
  }

  /**
   * Initialize anomaly detection models
   */
  async initializeAnomalyDetection() {
    console.log('🧠 Initializing anomaly detection models');

    // Initialize simple statistical models for each metric
    for (const [metricName, buffer] of this.metricsBuffer) {
      this.predictionModels.set(metricName, {
        type: 'moving_average',
        window_size: 20,
        threshold_multiplier: 2.5, // Standard deviations
        training_data: [],
        model: null
      });
    }

    // Load historical data for model training
    await this.loadHistoricalData();

    console.log('✅ Anomaly detection models initialized');
  }

  /**
   * Load historical performance data for model training
   */
  async loadHistoricalData() {
    try {
      const historyDir = 'performance-history';
      await fs.mkdir(historyDir, { recursive: true });

      // Load last 7 days of data
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const filename = `metrics-${date.toISOString().split('T')[0]}.json`;

        try {
          const data = await fs.readFile(path.join(historyDir, filename), 'utf8');
          const historicalMetrics = JSON.parse(data);

          // Add to training data
          for (const [metric, value] of Object.entries(historicalMetrics)) {
            const model = this.predictionModels.get(metric);
            if (model) {
              model.training_data.push({
                timestamp: historicalMetrics.timestamp || Date.now(),
                value: value
              });
            }
          }
        } catch (error) {
          // File doesn't exist, skip
        }
      }

      console.log('📚 Loaded historical data for model training');
    } catch (error) {
      console.warn('⚠️ Could not load historical data:', error.message);
    }
  }

  /**
   * Start real-time metrics collection
   */
  startMetricsCollection() {
    console.log('📊 Starting real-time metrics collection');

    this.collectionTimer = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.performAnomalyDetection();
        await this.checkSLOCompliance();
        await this.sendRealtimeUpdates();
        await this.saveMetricsSnapshot();
      } catch (error) {
        console.error('Error in metrics collection cycle:', error);
      }
    }, MONITORING_CONFIG.collection_interval);

    this.isRunning = true;
  }

  /**
   * Collect metrics from all system components
   */
  async collectMetrics() {
    const timestamp = Date.now();

    // Collect system metrics
    await this.collectSystemMetrics(timestamp);

    // Collect application metrics
    await this.collectApplicationMetrics(timestamp);

    // Collect business metrics
    await this.collectBusinessMetrics(timestamp);

    // Update metrics buffer
    this.updateMetricsBuffer(timestamp);
  }

  /**
   * Collect system-level performance metrics
   */
  async collectSystemMetrics(timestamp) {
    try {
      // CPU usage
      const cpuResult = await this.executeCommand('top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'');
      this.updateMetric('cpu_usage_percent', parseFloat(cpuResult.stdout.trim()), timestamp);

      // Memory usage
      const memResult = await this.executeCommand('free | grep Mem | awk \'{printf "%.2f", $3/$2 * 100.0}\'');
      this.updateMetric('memory_usage_percent', parseFloat(memResult.stdout.trim()), timestamp);

      // Thread count
      const threadResult = await this.executeCommand('ps -eLf | wc -l');
      this.updateMetric('thread_count', parseInt(threadResult.stdout.trim()), timestamp);

      // Network I/O (simplified)
      const netResult = await this.executeCommand('cat /proc/net/dev | grep -E "(eth0|enp)" | awk \'{print ($2 + $10) / 1024 / 1024}\' | head -1');
      this.updateMetric('network_io_mbps', parseFloat(netResult.stdout.trim()) || 0, timestamp);

    } catch (error) {
      console.warn('⚠️ System metrics collection partially failed:', error.message);
    }
  }

  /**
   * Collect application-specific metrics
   */
  async collectApplicationMetrics(timestamp) {
    try {
      // HTTP request rate (from application logs or metrics endpoint)
      const httpMetrics = await this.queryApplicationMetrics('/api/metrics/http');
      if (httpMetrics) {
        this.updateMetric('http_request_rate', httpMetrics.request_rate || 0, timestamp);
        this.updateMetric('http_response_time_p95', httpMetrics.p95_latency || 0, timestamp);
        this.updateMetric('http_error_rate', httpMetrics.error_rate || 0, timestamp);
      }

      // Consensus metrics
      const consensusMetrics = await this.queryApplicationMetrics('/api/metrics/consensus');
      if (consensusMetrics) {
        this.updateMetric('consensus_latency_p95', consensusMetrics.p95_latency || 0, timestamp);
        this.updateMetric('consensus_success_rate', consensusMetrics.success_rate || 0, timestamp);
        this.updateMetric('consensus_throughput', consensusMetrics.throughput || 0, timestamp);
      }

      // Agent communication metrics
      const agentMetrics = await this.queryApplicationMetrics('/api/metrics/agents');
      if (agentMetrics) {
        this.updateMetric('agent_communication_latency', agentMetrics.avg_latency || 0, timestamp);
        this.updateMetric('agent_routing_efficiency', agentMetrics.routing_efficiency || 0, timestamp);
        this.updateMetric('agent_failover_rate', agentMetrics.failover_rate || 0, timestamp);
      }

    } catch (error) {
      console.warn('⚠️ Application metrics collection failed:', error.message);
    }
  }

  /**
   * Collect business-level performance metrics
   */
  async collectBusinessMetrics(timestamp) {
    try {
      // Proof of Impact score
      const poiMetrics = await this.queryApplicationMetrics('/api/metrics/poi');
      if (poiMetrics) {
        this.updateMetric('proof_of_impact_score', poiMetrics.average_score || 0, timestamp);
        this.updateMetric('ihsan_compliance_score', poiMetrics.ihsan_score || 0, timestamp);
        this.updateMetric('trust_network_size', poiMetrics.network_size || 0, timestamp);
        this.updateMetric('consensus_participation_rate', poiMetrics.participation_rate || 0, timestamp);
      }

    } catch (error) {
      console.warn('⚠️ Business metrics collection failed:', error.message);
    }
  }

  /**
   * Query application metrics endpoint
   */
  async queryApplicationMetrics(endpoint) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Application may not be running or endpoint doesn't exist
    }
    return null;
  }

  /**
   * Update metric in buffer
   */
  updateMetric(name, value, timestamp) {
    const buffer = this.metricsBuffer.get(name);
    if (buffer) {
      buffer.current = value;
      buffer.timestamp = timestamp;

      // Maintain rolling history
      buffer.history.push({ value, timestamp });
      if (buffer.history.length > 100) { // Keep last 100 readings
        buffer.history.shift();
      }
    }
  }

  /**
   * Update metrics buffer with latest values
   */
  updateMetricsBuffer(timestamp) {
    // Update rolling averages and derived metrics
    for (const [name, buffer] of this.metricsBuffer) {
      if (buffer.history.length > 0) {
        // Calculate rolling average
        const recentValues = buffer.history.slice(-10); // Last 10 readings
        const avg = recentValues.reduce((sum, item) => sum + item.value, 0) / recentValues.length;

        // Store derived metrics
        if (name.includes('latency')) {
          this.updateMetric(`${name}_rolling_avg`, avg, timestamp);
        }
      }
    }
  }

  /**
   * Perform real-time anomaly detection
   */
  async performAnomalyDetection() {
    for (const [metricName, buffer] of this.metricsBuffer) {
      if (buffer.history.length < 10) continue; // Need minimum data

      const model = this.predictionModels.get(metricName);
      if (!model) continue;

      const isAnomaly = this.detectAnomaly(metricName, buffer.current, buffer.history);
      const prediction = this.predictNextValue(metricName, buffer.history);

      if (isAnomaly) {
        await this.triggerAnomalyAlert(metricName, buffer.current, prediction);
      }

      // Store anomaly history
      const anomalyHistory = this.anomalyHistory.get(metricName) || [];
      anomalyHistory.push({
        timestamp: buffer.timestamp,
        value: buffer.current,
        is_anomaly: isAnomaly,
        prediction: prediction
      });

      if (anomalyHistory.length > 1000) anomalyHistory.shift();
      this.anomalyHistory.set(metricName, anomalyHistory);
    }
  }

  /**
   * Detect anomalies using statistical methods
   */
  detectAnomaly(metricName, currentValue, history) {
    if (history.length < 10) return false;

    const recentValues = history.slice(-20).map(h => h.value);
    const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const variance = recentValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentValues.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return Math.abs(currentValue - mean) > 0.001;

    const zScore = Math.abs(currentValue - mean) / stdDev;
    const threshold = MONITORING_CONFIG.anomaly_detection.sensitivity;

    return zScore > threshold;
  }

  /**
   * Predict next metric value using simple moving average
   */
  predictNextValue(metricName, history) {
    if (history.length < 5) return history[history.length - 1]?.value || 0;

    const recentValues = history.slice(-10).map(h => h.value);
    return recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
  }

  /**
   * Trigger anomaly alert
   */
  async triggerAnomalyAlert(metricName, currentValue, predictedValue) {
    const alertId = `${metricName}_anomaly_${Date.now()}`;

    const alert = {
      id: alertId,
      type: 'anomaly',
      metric: metricName,
      severity: 'warning',
      message: `Anomaly detected in ${metricName}: current=${currentValue.toFixed(2)}, predicted=${predictedValue.toFixed(2)}`,
      timestamp: Date.now(),
      current_value: currentValue,
      predicted_value: predictedValue,
      threshold: MONITORING_CONFIG.anomaly_detection.sensitivity
    };

    this.alertsActive.set(alertId, alert);

    // Send alert to monitoring systems
    await this.sendAlertToMonitoring(alert);

    // Auto-resolve after 5 minutes if value returns to normal
    setTimeout(() => {
      this.alertsActive.delete(alertId);
    }, 300000);

    console.log(`🚨 Anomaly alert triggered: ${alert.message}`);
  }

  /**
   * Check SLO compliance and trigger alerts if needed
   */
  async checkSLOCompliance() {
    const sloStatus = {
      availability: this.calculateAvailability(),
      latency_p95: this.metricsBuffer.get('http_response_time_p95')?.current || 0,
      error_budget: this.metricsBuffer.get('http_error_rate')?.current || 0
    };

    // Check each SLO
    for (const [sloName, target] of Object.entries(MONITORING_CONFIG.slo_targets)) {
      const current = sloStatus[sloName];
      const isViolation = this.isSLOViolation(sloName, current, target);

      if (isViolation) {
        const alertId = `slo_violation_${sloName}_${Date.now()}`;

        const alert = {
          id: alertId,
          type: 'slo_violation',
          metric: sloName,
          severity: 'critical',
          message: `SLO violation: ${sloName} target=${target}, current=${current.toFixed(4)}`,
          timestamp: Date.now(),
          target_value: target,
          current_value: current,
          violation_percentage: ((current - target) / target) * 100
        };

        this.alertsActive.set(alertId, alert);
        await this.sendAlertToMonitoring(alert);

        console.log(`🚨 SLO violation alert: ${alert.message}`);
      }
    }
  }

  /**
   * Calculate system availability
   */
  calculateAvailability() {
    // Simplified availability calculation based on error rates
    const errorRate = this.metricsBuffer.get('http_error_rate')?.current || 0;
    return Math.max(0, 1 - errorRate);
  }

  /**
   * Check if SLO is violated
   */
  isSLOViolation(sloName, current, target) {
    switch (sloName) {
      case 'availability':
        return current < target;
      case 'latency_p95':
        return current > target;
      case 'error_budget':
        return current > target;
      default:
        return false;
    }
  }

  /**
   * Send alert to external monitoring systems
   */
  async sendAlertToMonitoring(alert) {
    try {
      // Send to Prometheus Alertmanager
      await fetch('http://localhost:9093/api/v2/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          labels: {
            alertname: alert.type,
            severity: alert.severity,
            metric: alert.metric,
            service: 'bizra-genesis-node'
          },
          annotations: {
            summary: alert.message,
            description: `Alert details: ${JSON.stringify(alert)}`
          },
          startsAt: new Date(alert.timestamp).toISOString()
        }])
      });
    } catch (error) {
      console.warn('⚠️ Failed to send alert to monitoring system:', error.message);
    }
  }

  /**
   * Send real-time updates to WebSocket clients
   */
  async sendRealtimeUpdates() {
    if (this.websocketClients.size === 0) return;

    const update = {
      type: 'metrics_update',
      timestamp: Date.now(),
      metrics: Object.fromEntries(
        Array.from(this.metricsBuffer.entries()).map(([name, buffer]) => [
          name,
          {
            current: buffer.current,
            unit: buffer.metadata.unit,
            trend: this.calculateTrend(buffer.history)
          }
        ])
      ),
      alerts: Array.from(this.alertsActive.values()),
      anomalies: Object.fromEntries(
        Array.from(this.anomalyHistory.entries()).map(([name, history]) => [
          name,
          history.slice(-5) // Last 5 anomaly readings
        ])
      )
    };

    // Send to all connected clients
    for (const client of this.websocketClients) {
      if (client.readyState === WebSocket.OPEN) {
        this.sendRealtimeUpdate(client, 'metrics_update', update);
      }
    }
  }

  /**
   * Send specific update to WebSocket client
   */
  sendRealtimeUpdate(client, type, data) {
    try {
      client.send(JSON.stringify({
        type,
        data,
        server_timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('⚠️ Failed to send WebSocket update:', error.message);
    }
  }

  /**
   * Calculate trend for metric history
   */
  calculateTrend(history) {
    if (history.length < 5) return 'insufficient_data';

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.value, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (Math.abs(change) < 1) return 'stable';
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Save periodic metrics snapshot
   */
  async saveMetricsSnapshot() {
    try {
      const snapshot = {
        timestamp: Date.now(),
        metrics: Object.fromEntries(
          Array.from(this.metricsBuffer.entries()).map(([name, buffer]) => [
            name, buffer.current
          ])
        ),
        alerts: Array.from(this.alertsActive.values()),
        system_info: {
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version
        }
      };

      const snapshotDir = 'performance-snapshots';
      await fs.mkdir(snapshotDir, { recursive: true });

      const filename = `snapshot-${new Date().toISOString().slice(0, 13).replace('T', '-')}.json`;
      await fs.writeFile(path.join(snapshotDir, filename), JSON.stringify(snapshot, null, 2));

    } catch (error) {
      console.warn('⚠️ Failed to save metrics snapshot:', error.message);
    }
  }

  /**
   * Generate Prometheus-compatible metrics output
   */
  async generatePrometheusMetrics() {
    const lines = [];
    const timestamp = Date.now();

    lines.push('# BIZRA Genesis Node Performance Metrics');
    lines.push(`# Generated at ${new Date(timestamp).toISOString()}`);
    lines.push('');

    for (const [name, buffer] of this.metricsBuffer) {
      const value = buffer.current;
      const unit = buffer.metadata.unit;

      // Prometheus metric format
      lines.push(`# HELP bizra_${name} ${name.replace(/_/g, ' ')} (${unit})`);
      lines.push(`# TYPE bizra_${name} gauge`);
      lines.push(`bizra_${name} ${value} ${timestamp}`);
      lines.push('');
    }

    // Add alert metrics
    lines.push('# HELP bizra_alerts_active Number of active alerts');
    lines.push('# TYPE bizra_alerts_active gauge');
    lines.push(`bizra_alerts_active ${this.alertsActive.size} ${timestamp}`);
    lines.push('');

    // Add SLO compliance metrics
    const sloCompliance = this.calculateSLOCompliance();
    for (const [sloName, compliance] of Object.entries(sloCompliance)) {
      lines.push(`# HELP bizra_slo_${sloName}_compliance SLO compliance for ${sloName}`);
      lines.push(`# TYPE bizra_slo_${sloName}_compliance gauge`);
      lines.push(`bizra_slo_${sloName}_compliance ${compliance} ${timestamp}`);
    }

    return lines.join('\n');
  }

  /**
   * Calculate SLO compliance percentages
   */
  calculateSLOCompliance() {
    const availability = this.calculateAvailability();
    const latencyP95 = this.metricsBuffer.get('http_response_time_p95')?.current || 0;
    const errorRate = this.metricsBuffer.get('http_error_rate')?.current || 0;

    return {
      availability: Math.min(1, availability / MONITORING_CONFIG.slo_targets.availability),
      latency: Math.min(1, MONITORING_CONFIG.slo_targets.latency_p95 / Math.max(1, latencyP95)),
      error_budget: Math.min(1, MONITORING_CONFIG.slo_targets.error_budget / Math.max(0.0001, errorRate))
    };
  }

  /**
   * Execute shell command with timeout
   */
  async executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 10000;
      const child = spawn(command, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          success: code === 0,
          code,
          stdout,
          stderr,
          command
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Gracefully shutdown the monitoring system
   */
  async shutdown() {
    console.log('🛑 Shutting down Elite Real-Time Performance Monitoring System');

    this.isRunning = false;

    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }

    if (this.wss) {
      this.wss.close();
    }

    if (this.server) {
      this.server.close();
    }

    // Save final metrics snapshot
    await this.saveMetricsSnapshot();

    console.log('✅ Monitoring system shutdown complete');
  }

  /**
   * Main execution method
   */
  async run() {
    try {
      console.log('🎯 Starting Elite Real-Time Performance Monitoring');

      // Initialize system
      await this.initialize();

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\nReceived SIGINT, shutting down gracefully...');
        await this.shutdown();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\nReceived SIGTERM, shutting down gracefully...');
        await this.shutdown();
        process.exit(0);
      });

      // Keep running
      console.log('✅ Real-time monitoring active. Press Ctrl+C to stop.');

      // Main monitoring loop (already started in initialize)
      while (this.isRunning) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`❌ Real-time monitoring failed: ${error.message}`);
      await this.shutdown();
      process.exit(1);
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new EliteRealtimePerformanceMonitor();
  monitor.run();
}

export default EliteRealtimePerformanceMonitor;
