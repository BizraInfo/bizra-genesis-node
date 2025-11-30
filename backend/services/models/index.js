/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA MODEL SERVICES - MODULE INDEX                                  ║
 * ║  Clean API surface for AI model integration                           ║
 * ║                                                                        ║
 * ║  Standard: Elite Practitioner - Zero-Cost Exports                     ║
 * ║  Phase: 3.1 - Day 1 Foundation Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

// Core exports
export { ModelProvider } from './ModelProvider.js';
export { ConfigurationManager, configManager, DEFAULTS, MODEL_CONFIGS } from './config.js';

// Type imports (for JSDoc)
// Note: types.js exports nothing at runtime, only provides JSDoc types

/**
 * Model Services API
 * 
 * @example
 * ```javascript
 * import { configManager } from './backend/services/models/index.js';
 * 
 * // Get enabled providers
 * const providers = configManager.getEnabledProviders();
 * 
 * // Get configuration
 * const ollamaConfig = configManager.getConfig('ollama');
 * ```
 */

// Re-export common utilities
export const ModelServices = {
  /**
   * Initialize model services
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('[ModelServices] 🚀 Initializing model services...');
    
    const enabledProviders = configManager.getEnabledProviders();
    console.log('[ModelServices] ✅ Enabled providers:', enabledProviders.join(', '));
    
    // Validate configurations
    for (const provider of enabledProviders) {
      const config = configManager.getConfig(provider);
      console.log(`[ModelServices] 📋 ${provider}: ${config.models.length} models configured`);
    }
  },

  /**
   * Get health status of all providers
   * @returns {Promise<Object>}
   */
  async getHealthStatus() {
    const status = {};
    const providers = configManager.getEnabledProviders();

    for (const provider of providers) {
      status[provider] = {
        enabled: true,
        status: 'unknown',
        message: 'Provider not yet implemented',
      };
    }

    return status;
  },
};
