/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA MODEL PROVIDER BASE CLASS                                      ║
 * ║  Abstract base class for all AI model providers                       ║
 * ║                                                                        ║
 * ║  Standard: Elite Practitioner - Zero-Cost Abstractions                ║
 * ║  Phase: 3.1 - Day 1 Foundation Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import EventEmitter from 'events';

/**
 * Abstract base class for model providers
 * All providers must extend this class and implement required methods
 */
export class ModelProvider extends EventEmitter {
  constructor(config) {
    super();
    
    if (this.constructor === ModelProvider) {
      throw new Error('ModelProvider is abstract and cannot be instantiated directly');
    }
    
    this.config = config;
    this.providerType = config.provider;
    this.circuitBreakerState = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      successCount: 0,
      totalLatencyMs: 0,
      latencies: [],
      costs: [],
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get provider-specific health status
   * @returns {Promise<ProviderHealth>}
   * @abstract
   */
  async getHealth() {
    throw new Error('getHealth() must be implemented by subclass');
  }

  /**
   * Complete a prompt with the model
   * @param {CompletionRequest} request
   * @returns {Promise<CompletionResponse>}
   * @abstract
   */
  async complete(request) {
    throw new Error('complete() must be implemented by subclass');
  }

  /**
   * Stream a completion
   * @param {CompletionRequest} request
   * @returns {AsyncGenerator<StreamChunk>}
   * @abstract
   */
  async *stream(request) {
    throw new Error('stream() must be implemented by subclass');
  }

  /**
   * Get available models
   * @returns {Promise<ModelConfig[]>}
   * @abstract
   */
  async getModels() {
    throw new Error('getModels() must be implemented by subclass');
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CONCRETE METHODS - Circuit breaker and metrics
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Execute request with circuit breaker protection
   * @param {Function} operation
   * @returns {Promise<*>}
   */
  async executeWithCircuitBreaker(operation) {
    if (this.circuitBreakerState === 'OPEN') {
      const now = Date.now();
      if (now - this.circuitOpenedAt < this.config.circuitBreakerTimeout) {
        throw new Error(`Circuit breaker OPEN for ${this.providerType}`);
      }
      this.circuitBreakerState = 'HALF_OPEN';
      this.emit('circuit:half_open', { provider: this.providerType });
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  onSuccess() {
    this.successCount++;
    this.metrics.successCount++;
    
    if (this.circuitBreakerState === 'HALF_OPEN') {
      if (this.successCount >= this.config.circuitBreakerSuccessThreshold) {
        this.circuitBreakerState = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.emit('circuit:closed', { provider: this.providerType });
      }
    }
  }

  /**
   * Handle failed operation
   * @param {Error} error
   */
  onFailure(error) {
    this.failureCount++;
    this.metrics.errorCount++;
    
    if (this.circuitBreakerState === 'HALF_OPEN') {
      this.circuitBreakerState = 'OPEN';
      this.circuitOpenedAt = Date.now();
      this.emit('circuit:open', { provider: this.providerType, error });
      return;
    }
    
    if (this.failureCount >= this.config.circuitBreakerFailureThreshold) {
      this.circuitBreakerState = 'OPEN';
      this.circuitOpenedAt = Date.now();
      this.emit('circuit:open', { provider: this.providerType, error });
    }
  }

  /**
   * Record request metrics
   * @param {number} latencyMs
   * @param {number} costUsd
   */
  recordMetrics(latencyMs, costUsd) {
    this.metrics.requestCount++;
    this.metrics.totalLatencyMs += latencyMs;
    this.metrics.latencies.push(latencyMs);
    this.metrics.costs.push(costUsd);
    
    // Keep only last 100 samples for percentile calculations
    if (this.metrics.latencies.length > 100) {
      this.metrics.latencies.shift();
      this.metrics.costs.shift();
    }
  }

  /**
   * Get provider metrics
   * @returns {ProviderMetrics}
   */
  getMetrics() {
    const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
    
    return {
      provider: this.providerType,
      requestCount: this.metrics.requestCount,
      errorCount: this.metrics.errorCount,
      successCount: this.metrics.successCount,
      successRate: this.metrics.requestCount > 0 
        ? this.metrics.successCount / this.metrics.requestCount 
        : 0,
      avgLatencyMs: this.metrics.requestCount > 0 
        ? this.metrics.totalLatencyMs / this.metrics.requestCount 
        : 0,
      p50LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0,
      p95LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0,
      p99LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0,
      totalCostUsd: this.metrics.costs.reduce((sum, cost) => sum + cost, 0),
      circuitBreakerState: this.circuitBreakerState,
    };
  }

  /**
   * Calculate cost for request/response
   * @param {CompletionRequest} request
   * @param {Usage} usage
   * @returns {number} Cost in USD
   */
  calculateCost(request, usage) {
    const model = this.config.models?.find(m => m.id === request.model);
    if (!model) return 0;

    const inputCost = (usage.promptTokens / 1_000_000) * model.pricing.inputCostPer1M;
    const outputCost = (usage.completionTokens / 1_000_000) * model.pricing.outputCostPer1M;
    const cachedCost = usage.cachedTokens 
      ? (usage.cachedTokens / 1_000_000) * (model.pricing.cachedInputCostPer1M || 0)
      : 0;

    return inputCost + outputCost + cachedCost;
  }

  /**
   * Validate request
   * @param {CompletionRequest} request
   * @returns {ValidationResult}
   */
  validateRequest(request) {
    const errors = [];
    const warnings = [];

    if (!request.model) {
      errors.push('Model is required');
    }

    if (!request.messages || !Array.isArray(request.messages)) {
      errors.push('Messages must be a non-empty array');
    }

    if (request.messages && request.messages.length === 0) {
      errors.push('Messages array cannot be empty');
    }

    if (request.temperature && (request.temperature < 0 || request.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (request.maxTokens && request.maxTokens < 1) {
      errors.push('maxTokens must be positive');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      successCount: 0,
      totalLatencyMs: 0,
      latencies: [],
      costs: [],
    };
  }
}
