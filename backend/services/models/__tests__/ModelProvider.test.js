/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA MODEL PROVIDER TESTS                                           ║
 * ║  Comprehensive test suite for ModelProvider base class                ║
 * ║                                                                        ║
 * ║  Standard: Elite Practitioner - 95%+ Coverage                         ║
 * ║  Phase: 3.1 - Day 1 Foundation Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import { ModelProvider } from '../ModelProvider.js';
import { configManager } from '../config.js';

/**
 * Mock provider implementation for testing
 */
class MockProvider extends ModelProvider {
  constructor(config) {
    super(config);
    this.mockResponses = [];
  }

  async getHealth() {
    return {
      provider: this.providerType,
      status: 'healthy',
      latencyMs: 100,
      successRate: 0.99,
      requestCount: 100,
      errorCount: 1,
      lastCheck: new Date().toISOString(),
      availableModels: ['mock-model-1'],
    };
  }

  async complete(request) {
    return {
      id: 'mock-response-1',
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Mock response',
          },
          finishReason: 'stop',
        },
      ],
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      metadata: {
        latencyMs: 100,
        costUsd: 0.001,
        timestamp: new Date().toISOString(),
        provider: this.providerType,
      },
    };
  }

  async *stream(request) {
    yield {
      id: 'mock-stream-1',
      model: request.model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: 'Mock' },
          finishReason: null,
        },
      ],
      done: false,
    };

    yield {
      id: 'mock-stream-2',
      model: request.model,
      choices: [
        {
          index: 0,
          delta: { content: ' response' },
          finishReason: 'stop',
        },
      ],
      done: true,
    };
  }

  async getModels() {
    return [
      {
        id: 'mock-model-1',
        name: 'Mock Model 1',
        version: '1.0',
        contextWindow: 4096,
        maxTokens: 2048,
        capabilities: {
          streaming: true,
          functionCalling: false,
          vision: false,
          json: true,
          languages: ['en'],
        },
        pricing: {
          inputCostPer1M: 1.0,
          outputCostPer1M: 2.0,
        },
      },
    ];
  }
}

describe('ModelProvider Base Class', () => {
  let provider;
  let config;

  beforeEach(() => {
    config = {
      provider: 'mock',
      circuitBreakerFailureThreshold: 3,
      circuitBreakerSuccessThreshold: 2,
      circuitBreakerTimeout: 5000,
      models: [
        {
          id: 'mock-model-1',
          name: 'Mock Model 1',
          version: '1.0',
          contextWindow: 4096,
          maxTokens: 2048,
          capabilities: {
            streaming: true,
            functionCalling: false,
            vision: false,
            json: true,
            languages: ['en'],
          },
          pricing: {
            inputCostPer1M: 1.0,
            outputCostPer1M: 2.0,
          },
        },
      ],
    };
    provider = new MockProvider(config);
  });

  afterEach(() => {
    provider.resetMetrics();
  });

  describe('Constructor', () => {
    it('should initialize with config', () => {
      expect(provider.config).toEqual(config);
      expect(provider.providerType).toBe('mock');
      expect(provider.circuitBreakerState).toBe('CLOSED');
    });

    it('should throw error if instantiated directly', () => {
      expect(() => new ModelProvider(config)).toThrow();
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      // Simulate failures
      for (let i = 0; i < 3; i++) {
        provider.onFailure(new Error('Test error'));
      }

      expect(provider.circuitBreakerState).toBe('OPEN');
    });

    it('should close circuit after successful calls in half-open state', async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        provider.onFailure(new Error('Test error'));
      }

      // Transition to half-open
      provider.circuitBreakerState = 'HALF_OPEN';
      provider.successCount = 0;

      // Successful calls
      provider.onSuccess();
      provider.onSuccess();

      expect(provider.circuitBreakerState).toBe('CLOSED');
    });
  });

  describe('Metrics', () => {
    it('should record request metrics', () => {
      provider.recordMetrics(100, 0.001);
      provider.recordMetrics(150, 0.0015);

      const metrics = provider.getMetrics();
      expect(metrics.requestCount).toBe(0); // recordMetrics doesn't increment requestCount
      expect(metrics.totalCostUsd).toBe(0.0025);
    });

    it('should calculate percentiles correctly', () => {
      const latencies = [100, 150, 200, 250, 300];
      latencies.forEach(l => provider.recordMetrics(l, 0));

      const metrics = provider.getMetrics();
      expect(metrics.p50LatencyMs).toBeGreaterThan(0);
      expect(metrics.p99LatencyMs).toBeGreaterThan(0);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost correctly', () => {
      const request = { model: 'mock-model-1' };
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = provider.calculateCost(request, usage);
      expect(cost).toBeCloseTo(0.002, 4); // (1000/1M)*1.0 + (500/1M)*2.0
    });
  });

  describe('Request Validation', () => {
    it('should validate correct request', () => {
      const request = {
        model: 'mock-model-1',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
      };

      const result = provider.validateRequest(request);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject request without model', () => {
      const request = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = provider.validateRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model is required');
    });

    it('should reject request with invalid temperature', () => {
      const request = {
        model: 'mock-model-1',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 3.0,
      };

      const result = provider.validateRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Temperature must be between 0 and 2');
    });
  });
});

describe('Configuration Manager', () => {
  it('should load configurations', () => {
    const ollamaConfig = configManager.getConfig('ollama');
    expect(ollamaConfig).toBeTruthy();
    expect(ollamaConfig.provider).toBe('ollama');
  });

  it('should return enabled providers', () => {
    const providers = configManager.getEnabledProviders();
    expect(providers).toContain('ollama');
  });

  it('should get model configuration', () => {
    const modelConfig = configManager.getModelConfig('ollama', 'llama3.2:latest');
    expect(modelConfig).toBeTruthy();
    expect(modelConfig.name).toBe('Llama 3.2');
  });
});

console.log('[Tests] ✅ All ModelProvider tests defined. Run with Jest to execute.');
