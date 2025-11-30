/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA MODEL CONFIGURATION MANAGER                                    ║
 * ║  Centralized configuration for all AI model providers                 ║
 * ║                                                                        ║
 * ║  Standard: Elite Practitioner - Secure Config Management              ║
 * ║  Phase: 3.1 - Day 1 Foundation Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Default configuration values
 */
const DEFAULTS = {
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 60 seconds
    halfOpenMaxCalls: 3,
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    burstSize: 10,
    adaptive: true,
  },
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
  timeout: {
    requestTimeoutMs: 120000, // 2 minutes
    streamTimeoutMs: 300000, // 5 minutes
  },
};

/**
 * Model configurations for each provider
 */
const MODEL_CONFIGS = {
  ollama: {
    provider: 'ollama',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    models: [
      {
        id: 'llama3.2:latest',
        name: 'Llama 3.2',
        version: 'latest',
        contextWindow: 128000,
        maxTokens: 4096,
        capabilities: {
          streaming: true,
          functionCalling: false,
          vision: false,
          json: true,
          languages: ['en'],
        },
        pricing: {
          inputCostPer1M: 0, // Local model, no cost
          outputCostPer1M: 0,
        },
      },
    ],
    ...DEFAULTS,
  },
  openai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    organization: process.env.OPENAI_ORG_ID,
    models: [
      {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        version: '0125',
        contextWindow: 128000,
        maxTokens: 4096,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: true,
          json: true,
          languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'],
        },
        pricing: {
          inputCostPer1M: 10.0,
          outputCostPer1M: 30.0,
        },
      },
    ],
    ...DEFAULTS,
  },
};

/**
 * Configuration Manager
 */
export class ConfigurationManager {
  constructor() {
    this.configs = new Map();
    this.loadConfigurations();
  }

  /**
   * Load all provider configurations
   */
  loadConfigurations() {
    for (const [provider, config] of Object.entries(MODEL_CONFIGS)) {
      this.configs.set(provider, this.validateConfig(config));
    }
  }

  /**
   * Get configuration for a provider
   * @param {string} provider
   * @returns {Object|null}
   */
  getConfig(provider) {
    return this.configs.get(provider) || null;
  }

  /**
   * Get all enabled providers
   * @returns {string[]}
   */
  getEnabledProviders() {
    return Array.from(this.configs.keys()).filter(provider => {
      const config = this.configs.get(provider);
      return this.isProviderEnabled(config);
    });
  }

  /**
   * Check if provider is enabled
   * @param {Object} config
   * @returns {boolean}
   */
  isProviderEnabled(config) {
    switch (config.provider) {
      case 'ollama':
        // Ollama is enabled if accessible
        return true;
      case 'openai':
        return !!config.apiKey;
      default:
        return false;
    }
  }

  /**
   * Validate provider configuration
   * @param {Object} config
   * @returns {Object}
   */
  validateConfig(config) {
    if (!config.provider) {
      throw new Error('Provider type is required');
    }

    if (!config.models || config.models.length === 0) {
      throw new Error(`No models configured for provider: ${config.provider}`);
    }

    // Validate each model config
    for (const model of config.models) {
      this.validateModelConfig(model);
    }

    return config;
  }

  /**
   * Validate model configuration
   * @param {Object} model
   */
  validateModelConfig(model) {
    const required = ['id', 'name', 'contextWindow', 'maxTokens', 'capabilities', 'pricing'];
    for (const field of required) {
      if (!model[field]) {
        throw new Error(`Missing required field: ${field} in model config`);
      }
    }
  }

  /**
   * Get model configuration
   * @param {string} provider
   * @param {string} modelId
   * @returns {Object|null}
   */
  getModelConfig(provider, modelId) {
    const config = this.getConfig(provider);
    if (!config) return null;

    return config.models.find(m => m.id === modelId) || null;
  }
}

// Singleton instance
export const configManager = new ConfigurationManager();

// Export default configs
export { DEFAULTS, MODEL_CONFIGS };
