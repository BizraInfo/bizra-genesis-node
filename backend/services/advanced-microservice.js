/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  Advanced Microservice with Circuit Breaker, Rate Limiting & Monitoring   ║
 * ║  Demonstrates:                                                           ║
 * ║  • Circuit Breaker pattern for resilience                                ║
 * ║  • Advanced rate limiting with token buckets                             ║
 * ║  • Performance monitoring and metrics                                    ║
 * ║  • Graceful degradation strategies                                       ║
 * ║  • Health checks and auto-recovery                                       ║
 * ║  • Professional error handling                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { setTimeout as delay } from 'timers/promises';

/**
 * Advanced Circuit Breaker with configurable thresholds and recovery strategies
 */
class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      failureThreshold: options.failureThreshold || 5,           // Failures before opening
      recoveryTimeout: options.recoveryTimeout || 60000,         // Time before trying half-open
      expectedError: options.expectedError || null,              // Error types to count as failures
      healthCheck: options.healthCheck || null,                  // Custom health check function
      halfOpenMaxCalls: options.halfOpenMaxCalls || 3,          // Max calls in half-open state
      ...options
    };
    
    this.state = 'CLOSED';        // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenCalls = 0;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      stateChanges: []
    };
    
    this.resetTimer = null;
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute(fn, ...args) {
    this.metrics.totalRequests++;
    const startTime = Date.now();
    
    try {
      // Check state and execute
      const result = await this._executeWithStateCheck(fn, ...args);
      
      // Record success
      this._recordSuccess(Date.now() - startTime);
      this.metrics.successfulRequests++;
      
      return result;
    } catch (error) {
      // Record failure
      const latency = Date.now() - startTime;
      this._recordFailure(error, latency);
      this.metrics.failedRequests++;
      
      throw error;
    }
  }

  /**
   * Execute based on current state
   */
  async _executeWithStateCheck(fn, ...args) {
    switch (this.state) {
      case 'OPEN':
        return this._handleOpenState(fn, ...args);
      case 'HALF_OPEN':
        return this._handleHalfOpenState(fn, ...args);
      case 'CLOSED':
      default:
        return this._handleClosedState(fn, ...args);
    }
  }

  /**
   * Handle OPEN state - reject immediately
   */
  async _handleOpenState(fn, ...args) {
    if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeout) {
      this._transitionTo('HALF_OPEN');
      return this._executeWithStateCheck(fn, ...args);
    }
    
    throw new CircuitBreakerOpenError(
      `Circuit breaker is OPEN. Last failure: ${new Date(this.lastFailureTime).toISOString()}`
    );
  }

  /**
   * Handle HALF_OPEN state - allow limited requests
   */
  async _handleHalfOpenState(fn, ...args) {
    this.halfOpenCalls++;
    
    if (this.halfOpenCalls > this.config.halfOpenMaxCalls) {
      throw new Error('Circuit breaker: half-open call limit exceeded');
    }
    
    try {
      const result = await fn(...args);
      this._transitionTo('CLOSED');
      return result;
    } catch (error) {
      this._transitionTo('OPEN');
      throw error;
    }
  }

  /**
   * Handle CLOSED state - execute normally
   */
  async _handleClosedState(fn, ...args) {
    return fn(...args);
  }

  /**
   * Record successful operation
   */
  _recordSuccess(latency) {
    this.successCount++;
    this.failureCount = 0; // Reset failure count on success
    
    // Update average latency
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageLatency = ((this.metrics.averageLatency * (totalRequests - 1)) + latency) / totalRequests;
    
    // Auto-close in half-open state
    if (this.state === 'HALF_OPEN' && this.successCount >= this.config.halfOpenMaxCalls) {
      this._transitionTo('CLOSED');
    }
  }

  /**
   * Record failed operation
   */
  _recordFailure(error, latency) {
    this.failureCount++;
    
    // Check if failure should be counted
    if (this._shouldCountFailure(error)) {
      if (this.failureCount >= this.config.failureThreshold) {
        this._transitionTo('OPEN');
      }
    }
    
    // Update average latency
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageLatency = ((this.metrics.averageLatency * (totalRequests - 1)) + latency) / totalRequests;
  }

  /**
   * Check if error should count as failure
   */
  _shouldCountFailure(error) {
    if (!this.config.expectedError) return true;
    
    if (typeof this.config.expectedError === 'function') {
      return this.config.expectedError(error);
    }
    
    return error.name !== this.config.expectedError;
  }

  /**
   * Transition to new state
   */
  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.lastFailureTime = Date.now();
    
    this.metrics.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: this.lastFailureTime,
      reason: this._getTransitionReason(newState)
    });
    
    // Reset counters
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCount = 0;
      this.halfOpenCalls = 0;
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenCalls = 0;
    }
    
    // Emit state change event
    this.emit('stateChange', { from: oldState, to: newState, timestamp: this.lastFailureTime });
    
    console.log(`[CircuitBreaker] State changed: ${oldState} → ${newState}`);
  }

  /**
   * Get reason for state transition
   */
  _getTransitionReason(newState) {
    switch (newState) {
      case 'OPEN':
        return `Failure threshold exceeded (${this.failureCount}/${this.config.failureThreshold})`;
      case 'HALF_OPEN':
        return `Recovery timeout elapsed (${this.config.recoveryTimeout}ms)`;
      case 'CLOSED':
        return `Successful requests in half-open state`;
      default:
        return 'Unknown';
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      metrics: { ...this.metrics },
      config: { ...this.config }
    };
  }

  /**
   * Reset circuit breaker manually
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = 0;
    
    this.metrics.stateChanges.push({
      from: 'MANUAL_RESET',
      to: 'CLOSED',
      timestamp: Date.now(),
      reason: 'Manual reset'
    });
    
    this.emit('stateChange', { from: 'MANUAL_RESET', to: 'CLOSED', timestamp: Date.now() });
  }
}

/**
 * Advanced Token Bucket Rate Limiter with multiple strategies
 */
class AdvancedRateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      capacity: options.capacity || 100,              // Maximum tokens
      refillRate: options.refillRate || 10,          // Tokens per second
      refillInterval: options.refillInterval || 1000, // Refill interval in ms
      burstLimit: options.burstLimit || null,        // Optional burst limit
      tieredLimits: options.tieredLimits || null,    // Different limits per user tier
      customStrategy: options.customStrategy || null, // Custom rate limiting logic
      ...options
    };
    
    this.buckets = new Map(); // User ID -> bucket state
    this.timers = new Map();  // Refill timers
    this.metrics = {
      requestsAllowed: 0,
      requestsRejected: 0,
      averageWaitTime: 0,
      activeUsers: 0
    };
    
    // Start global refill timer
    this._startGlobalRefill();
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(userId, options = {}) {
    const {
      cost = 1,              // Token cost of this request
      priority = 'normal',   // Request priority
      tier = 'free'          // User tier
    } = options;
    
    const bucket = this._getOrCreateBucket(userId, tier);
    const startTime = Date.now();
    
    // Apply tier-based limits
    if (this.config.tieredLimits && this.config.tieredLimits[tier]) {
      const tierConfig = this.config.tieredLimits[tier];
      bucket.capacity = tierConfig.capacity;
      bucket.refillRate = tierConfig.refillRate;
    }
    
    // Check burst limits
    if (this.config.burstLimit) {
      const recentRequests = this._getRecentRequests(userId, this.config.burstLimit.windowMs);
      if (recentRequests >= this.config.burstLimit.maxRequests) {
        this.metrics.requestsRejected++;
        this.emit('limitExceeded', { userId, reason: 'burst_limit', cost, priority, tier });
        throw new RateLimitExceededError('Burst limit exceeded');
      }
    }
    
    // Custom strategy
    if (this.config.customStrategy) {
      const strategyResult = await this.config.customStrategy(bucket, options);
      if (!strategyResult.allowed) {
        this.metrics.requestsRejected++;
        this.emit('limitExceeded', { userId, reason: 'custom_strategy', ...strategyResult });
        throw new RateLimitExceededError(strategyResult.message || 'Custom rate limit exceeded');
      }
    }
    
    // Wait for tokens if insufficient
    if (bucket.tokens < cost) {
      const waitTime = this._calculateWaitTime(bucket, cost);
      
      // Check if wait time is acceptable
      if (waitTime > options.maxWaitTime || waitTime > 5000) { // 5 second max wait
        this.metrics.requestsRejected++;
        this.emit('limitExceeded', { userId, reason: 'wait_time', waitTime, cost, priority, tier });
        throw new RateLimitExceededError('Wait time too long');
      }
      
      await delay(waitTime);
      this._refillBucket(bucket, waitTime);
    }
    
    // Consume tokens
    bucket.tokens -= cost;
    bucket.lastRequest = Date.now();
    
    // Record request
    bucket.requests.push({ timestamp: Date.now(), cost, priority });
    this._cleanupOldRequests(bucket);
    
    // Update metrics
    this.metrics.requestsAllowed++;
    const waitTime = Date.now() - startTime;
    this.metrics.averageWaitTime = (this.metrics.averageWaitTime + waitTime) / 2;
    
    this.emit('requestAllowed', { userId, cost, priority, tier, waitTime });
    
    return {
      allowed: true,
      cost,
      remaining: bucket.tokens,
      waitTime,
      resetTime: this._getResetTime(bucket)
    };
  }

  /**
   * Get or create bucket for user
   */
  _getOrCreateBucket(userId, tier) {
    if (!this.buckets.has(userId)) {
      const bucket = {
        tokens: this.config.capacity,
        lastRefill: Date.now(),
        userId,
        tier,
        requests: [],
        created: Date.now()
      };
      
      this.buckets.set(userId, bucket);
      this.metrics.activeUsers++;
      
      // Set up user-specific refill timer
      const refillInterval = Math.max(this.config.refillInterval, 100); // Min 100ms
      const timer = setInterval(() => {
        this._refillBucket(bucket, refillInterval);
      }, refillInterval);
      
      this.timers.set(userId, timer);
    }
    
    return this.buckets.get(userId);
  }

  /**
   * Refill bucket with new tokens
   */
  _refillBucket(bucket, timeDelta) {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    
    if (timePassed <= 0) return;
    
    const tokensToAdd = (bucket.refillRate * timePassed) / 1000;
    const newTokenCount = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    const actualTokensAdded = newTokenCount - bucket.tokens;
    
    bucket.tokens = newTokenCount;
    bucket.lastRefill = now;
    
    if (actualTokensAdded > 0) {
      this.emit('bucketRefilled', { 
        userId: bucket.userId, 
        tokensAdded: actualTokensAdded,
        remaining: bucket.tokens 
      });
    }
  }

  /**
   * Global refill timer
   */
  _startGlobalRefill() {
    setInterval(() => {
      const now = Date.now();
      this.buckets.forEach((bucket, userId) => {
        this._refillBucket(bucket, now - bucket.lastRefill);
      });
    }, this.config.refillInterval);
  }

  /**
   * Calculate wait time for tokens
   */
  _calculateWaitTime(bucket, cost) {
    const deficit = cost - bucket.tokens;
    const timePerToken = 1000 / bucket.refillRate; // ms per token
    return Math.ceil(deficit * timePerToken);
  }

  /**
   * Get reset time for bucket
   */
  _getResetTime(bucket) {
    const timeToFullCapacity = (bucket.capacity - bucket.tokens) / bucket.refillRate * 1000;
    return Date.now() + timeToFullCapacity;
  }

  /**
   * Get recent requests for burst checking
   */
  _getRecentRequests(userId, windowMs) {
    const bucket = this.buckets.get(userId);
    if (!bucket) return 0;
    
    const cutoff = Date.now() - windowMs;
    return bucket.requests.filter(req => req.timestamp > cutoff).length;
  }

  /**
   * Clean up old requests
   */
  _cleanupOldRequests(bucket) {
    const cutoff = Date.now() - (this.config.burstLimit?.windowMs || 60000); // Default 1 minute
    bucket.requests = bucket.requests.filter(req => req.timestamp > cutoff);
  }

  /**
   * Get rate limiter status
   */
  getStatus() {
    return {
      activeUsers: this.buckets.size,
      metrics: { ...this.metrics },
      config: { ...this.config },
      buckets: Array.from(this.buckets.entries()).map(([userId, bucket]) => ({
        userId,
        tokens: bucket.tokens,
        capacity: bucket.capacity,
        tier: bucket.tier,
        lastRequest: bucket.lastRequest
      }))
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
    this.buckets.clear();
  }
}

/**
 * Performance Monitor with advanced metrics collection
 */
class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      collectionInterval: options.collectionInterval || 1000,
      retentionPeriod: options.retentionPeriod || 3600000, // 1 hour
      alertThresholds: options.alertThresholds || {
        cpuUsage: 80,
        memoryUsage: 85,
        responseTime: 2000,
        errorRate: 5
      },
      ...options
    };
    
    this.metrics = {
      requests: [],
      responseTimes: [],
      errorCounts: {},
      resourceUsage: {},
      customMetrics: {}
    };
    
    this.alerts = [];
    this.monitoring = false;
    
    this._startMonitoring();
  }

  /**
   * Record request metrics
   */
  recordRequest(endpoint, method, statusCode, responseTime, userId = null) {
    const metric = {
      timestamp: Date.now(),
      endpoint,
      method,
      statusCode,
      responseTime,
      userId
    };
    
    this.metrics.requests.push(metric);
    this._cleanupOldMetrics();
    
    // Check for alerts
    this._checkAlerts(metric);
    
    this.emit('requestRecorded', metric);
  }

  /**
   * Record error
   */
  recordError(errorType, context = {}) {
    const metric = {
      timestamp: Date.now(),
      errorType,
      context,
      count: 1
    };
    
    this.metrics.errorCounts[errorType] = (this.metrics.errorCounts[errorType] || 0) + 1;
    
    this.emit('errorRecorded', metric);
  }

  /**
   * Record custom metric
   */
  recordCustomMetric(name, value, tags = {}) {
    const metric = {
      timestamp: Date.now(),
      name,
      value,
      tags
    };
    
    if (!this.metrics.customMetrics[name]) {
      this.metrics.customMetrics[name] = [];
    }
    
    this.metrics.customMetrics[name].push(metric);
    this._cleanupOldMetrics();
    
    this.emit('customMetricRecorded', metric);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeRange = 300000) { // 5 minutes default
    const cutoff = Date.now() - timeRange;
    
    const recentRequests = this.metrics.requests.filter(req => req.timestamp > cutoff);
    
    if (recentRequests.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        endpoints: []
      };
    }
    
    const responseTimes = recentRequests.map(req => req.responseTime);
    const errors = recentRequests.filter(req => req.statusCode >= 400);
    
    const summary = {
      totalRequests: recentRequests.length,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      responseTimePercentiles: {
        p50: this._calculatePercentile(responseTimes, 50),
        p95: this._calculatePercentile(responseTimes, 95),
        p99: this._calculatePercentile(responseTimes, 99)
      },
      errorRate: (errors.length / recentRequests.length) * 100,
      endpoints: this._getEndpointStats(recentRequests),
      errorBreakdown: this._getErrorBreakdown(recentRequests),
      timeRange
    };
    
    return summary;
  }

  /**
   * Start monitoring
   */
  _startMonitoring() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    
    // Resource usage monitoring
    setInterval(() => {
      const usage = process.resourceUsage();
      const memUsage = process.memoryUsage();
      
      const resourceMetric = {
        timestamp: Date.now(),
        cpu: (usage.userCPU + usage.systemCPU) * 1000, // Convert to microseconds
        memory: memUsage.heapUsed,
        systemMemory: memUsage.rss,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      };
      
      this.metrics.resourceUsage[Date.now()] = resourceMetric;
      
      // Check resource alerts
      this._checkResourceAlerts(resourceMetric);
      
    }, this.config.collectionInterval);
  }

  /**
   * Check for alerts
   */
  _checkAlerts(metric) {
    const alerts = [];
    
    // Response time alerts
    if (metric.responseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        type: 'slow_response',
        severity: 'warning',
        message: `Slow response time: ${metric.responseTime}ms on ${metric.endpoint}`,
        metric
      });
    }
    
    // Error rate alerts
    const recentRequests = this.metrics.requests.slice(-100);
    const errorRate = (recentRequests.filter(req => req.statusCode >= 400).length / recentRequests.length) * 100;
    
    if (errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate: ${errorRate.toFixed(2)}%`,
        metric: { errorRate }
      });
    }
    
    // Emit alerts
    alerts.forEach(alert => {
      this.alerts.push({ ...alert, timestamp: Date.now() });
      this.emit('alert', alert);
    });
  }

  /**
   * Check resource alerts
   */
  _checkResourceAlerts(resourceMetric) {
    const memUsageMB = resourceMetric.memory / (1024 * 1024);
    const systemMemUsageMB = resourceMetric.systemMemory / (1024 * 1024);
    
    if (memUsageMB > this.config.alertThresholds.memoryUsage) {
      this.emit('alert', {
        type: 'high_memory_usage',
        severity: 'warning',
        message: `High memory usage: ${memUsageMB.toFixed(2)}MB`,
        metric: resourceMetric
      });
    }
  }

  /**
   * Calculate percentile
   */
  _calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Get endpoint statistics
   */
  _getEndpointStats(requests) {
    const endpointMap = new Map();
    
    requests.forEach(req => {
      if (!endpointMap.has(req.endpoint)) {
        endpointMap.set(req.endpoint, {
          endpoint: req.endpoint,
          totalRequests: 0,
          totalResponseTime: 0,
          errors: 0,
          methods: new Set()
        });
      }
      
      const stats = endpointMap.get(req.endpoint);
      stats.totalRequests++;
      stats.totalResponseTime += req.responseTime;
      stats.methods.add(req.method);
      
      if (req.statusCode >= 400) {
        stats.errors++;
      }
    });
    
    return Array.from(endpointMap.values()).map(stats => ({
      ...stats,
      averageResponseTime: stats.totalResponseTime / stats.totalRequests,
      errorRate: (stats.errors / stats.totalRequests) * 100,
      methods: Array.from(stats.methods)
    }));
  }

  /**
   * Get error breakdown
   */
  _getErrorBreakdown(requests) {
    const errorMap = new Map();
    
    requests.forEach(req => {
      if (req.statusCode >= 400) {
        const statusGroup = `${Math.floor(req.statusCode / 100)}xx`;
        errorMap.set(statusGroup, (errorMap.get(statusGroup) || 0) + 1);
      }
    });
    
    return Object.fromEntries(errorMap);
  }

  /**
   * Cleanup old metrics
   */
  _cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.retentionPeriod;
    
    // Cleanup requests
    this.metrics.requests = this.metrics.requests.filter(req => req.timestamp > cutoff);
    
    // Cleanup custom metrics
    Object.keys(this.metrics.customMetrics).forEach(name => {
      this.metrics.customMetrics[name] = this.metrics.customMetrics[name].filter(
        metric => metric.timestamp > cutoff
      );
    });
    
    // Cleanup resource usage
    Object.keys(this.metrics.resourceUsage).forEach(timestamp => {
      if (parseInt(timestamp) < cutoff) {
        delete this.metrics.resourceUsage[timestamp];
      }
    });
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      monitoring: this.monitoring,
      metricsCount: this.metrics.requests.length,
      customMetricsCount: Object.keys(this.metrics.customMetrics).length,
      alertsCount: this.alerts.length,
      recentAlerts: this.alerts.slice(-10),
      config: { ...this.config }
    };
  }
}

/**
 * Advanced Microservice with all patterns integrated
 */
class AdvancedMicroservice extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.serviceConfig = {
      name: config.name || 'advanced-microservice',
      version: config.version || '1.0.0',
      port: config.port || 3003,
      environment: config.environment || 'development',
      ...config
    };
    
    // Initialize components
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.rateLimiter = new AdvancedRateLimiter(config.rateLimiter);
    this.performanceMonitor = new PerformanceMonitor(config.monitoring);
    
    this.routes = new Map();
    this.middleware = [];
    this.healthChecks = new Map();
    
    this._setupEventHandlers();
  }

  /**
   * Setup event handlers for monitoring and alerts
   */
  _setupEventHandlers() {
    // Circuit breaker events
    this.circuitBreaker.on('stateChange', ({ from, to, timestamp, reason }) => {
      console.log(`[${this.serviceConfig.name}] Circuit Breaker: ${from} → ${to} (${reason})`);
      this.performanceMonitor.recordCustomMetric('circuit_breaker_state_change', 1, { 
        from, to, service: this.serviceConfig.name 
      });
    });
    
    // Rate limiter events
    this.rateLimiter.on('limitExceeded', ({ userId, reason, cost, priority, tier }) => {
      console.log(`[${this.serviceConfig.name}] Rate limit exceeded for user ${userId}: ${reason}`);
      this.performanceMonitor.recordError('rate_limit_exceeded', { userId, reason, cost, priority, tier });
    });
    
    // Performance monitoring alerts
    this.performanceMonitor.on('alert', (alert) => {
      console.warn(`[${this.serviceConfig.name}] Alert: ${alert.message}`);
      this.performanceMonitor.recordCustomMetric('alert_triggered', 1, { 
        type: alert.type, 
        severity: alert.severity,
        service: this.serviceConfig.name 
      });
    });
  }

  /**
   * Add route with circuit breaker and rate limiting
   */
  addRoute(path, handler, options = {}) {
    const routeConfig = {
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      rateLimit: { cost: 1 },
      circuitBreaker: true,
      timeout: 30000,
      retryCount: 3,
      ...options
    };
    
    const wrappedHandler = async (req, res) => {
      const startTime = Date.now();
      const userId = req.userId || req.ip;
      
      try {
        // Rate limiting check
        const rateLimitResult = await this.rateLimiter.checkLimit(userId, {
          cost: routeConfig.rateLimit.cost,
          priority: routeConfig.rateLimit.priority || 'normal',
          tier: req.userTier || 'free'
        });
        
        res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
        res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime);
        
        // Execute handler with circuit breaker
        const result = await this.circuitBreaker.execute(async () => {
          // Timeout wrapper
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Handler timeout')), routeConfig.timeout);
          });
          
          const handlerPromise = handler(req, res);
          
          return Promise.race([handlerPromise, timeoutPromise]);
        });
        
        const responseTime = Date.now() - startTime;
        
        // Record successful request
        this.performanceMonitor.recordRequest(
          path, 
          req.method, 
          res.statusCode || 200, 
          responseTime, 
          userId
        );
        
        return result;
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // Record failed request
        this.performanceMonitor.recordRequest(
          path, 
          req.method, 
          error.statusCode || 500, 
          responseTime, 
          userId
        );
        
        // Handle specific error types
        if (error instanceof CircuitBreakerOpenError) {
          res.status(503).json({
            error: 'Service Temporarily Unavailable',
            message: 'Circuit breaker is open',
            retryAfter: 60
          });
        } else if (error instanceof RateLimitExceededError) {
          res.status(429).json({
            error: 'Too Many Requests',
            message: error.message
          });
        } else {
          res.status(error.statusCode || 500).json({
            error: 'Internal Server Error',
            message: this.serviceConfig.environment === 'development' ? error.message : 'Something went wrong'
          });
        }
        
        throw error;
      }
    };
    
    this.routes.set(path, {
      handler: wrappedHandler,
      config: routeConfig,
      path
    });
    
    return this;
  }

  /**
   * Add health check
   */
  addHealthCheck(name, checkFn) {
    this.healthChecks.set(name, checkFn);
    return this;
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    const checks = {};
    
    for (const [name, checkFn] of this.healthChecks) {
      try {
        const result = await checkFn();
        checks[name] = {
          status: 'healthy',
          ...result
        };
      } catch (error) {
        checks[name] = {
          status: 'unhealthy',
          error: error.message
        };
      }
    }
    
    const overallStatus = Object.values(checks).every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';
    
    return {
      service: this.serviceConfig.name,
      version: this.serviceConfig.version,
      status: overallStatus,
      timestamp: Date.now(),
      checks,
      circuitBreaker: this.circuitBreaker.getStatus(),
      rateLimiter: this.rateLimiter.getStatus(),
      performance: this.performanceMonitor.getPerformanceSummary()
    };
  }

  /**
   * Start the microservice
   */
  async start() {
    console.log(`[${this.serviceConfig.name}] Starting advanced microservice...`);
    
    // Setup default health checks
    this.addHealthCheck('circuit_breaker', () => {
      const status = this.circuitBreaker.getStatus();
      return {
        state: status.state,
        failureCount: status.failureCount
      };
    });
    
    this.addHealthCheck('rate_limiter', () => {
      const status = this.rateLimiter.getStatus();
      return {
        activeUsers: status.activeUsers,
        requestsAllowed: status.metrics.requestsAllowed
      };
    });
    
    this.addHealthCheck('performance_monitor', () => {
      const summary = this.performanceMonitor.getPerformanceSummary();
      return {
        totalRequests: summary.totalRequests,
        averageResponseTime: summary.averageResponseTime,
        errorRate: summary.errorRate
      };
    });
    
    console.log(`[${this.serviceConfig.name}] ✅ Advanced microservice started`);
    console.log(`   Name: ${this.serviceConfig.name}`);
    console.log(`   Version: ${this.serviceConfig.version}`);
    console.log(`   Routes: ${this.routes.size}`);
    console.log(`   Health Checks: ${this.healthChecks.size}`);
    
    return this;
  }

  /**
   * Stop the microservice
   */
  async stop() {
    console.log(`[${this.serviceConfig.name}] Stopping advanced microservice...`);
    
    // Cleanup resources
    this.rateLimiter.cleanup();
    
    console.log(`[${this.serviceConfig.name}] ✅ Advanced microservice stopped`);
    return this;
  }
}

// Custom error classes
class CircuitBreakerOpenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

class RateLimitExceededError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

// Export classes and factory function
export {
  CircuitBreaker,
  AdvancedRateLimiter,
  PerformanceMonitor,
  AdvancedMicroservice,
  CircuitBreakerOpenError,
  RateLimitExceededError
};

// Factory function for creating configured microservice
export function createMicroservice(config = {}) {
  return new AdvancedMicroservice(config);
}

export default AdvancedMicroservice;