/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA MODEL PROVIDER TYPE SYSTEM                                     ║
 * ║  World-Class Type Definitions for AI Model Integration                ║
 * ║                                                                        ║
 * ║  Standard: Elite Practitioner - 100% Type Safety                      ║
 * ║  Phase: 3.1 - Day 1 Foundation Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE MODEL PROVIDER TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Supported AI model providers
 * @typedef {'ollama' | 'openai' | 'anthropic' | 'grok' | 'gemini'} ProviderType
 */

/**
 * Model configuration
 * @typedef {Object} ModelConfig
 * @property {string} id - Unique model identifier
 * @property {string} name - Human-readable model name
 * @property {ProviderType} provider - Provider type
 * @property {string} version - Model version
 * @property {number} contextWindow - Maximum context window size
 * @property {number} maxTokens - Maximum output tokens
 * @property {ModelCapabilities} capabilities - Model capabilities
 * @property {ModelPricing} pricing - Pricing information
 */

/**
 * Model capabilities
 * @typedef {Object} ModelCapabilities
 * @property {boolean} streaming - Supports streaming
 * @property {boolean} functionCalling - Supports function calling
 * @property {boolean} vision - Supports vision/images
 * @property {boolean} json - Supports JSON mode
 * @property {string[]} languages - Supported languages
 */

/**
 * Model pricing structure
 * @typedef {Object} ModelPricing
 * @property {number} inputCostPer1M - Cost per 1M input tokens (USD)
 * @property {number} outputCostPer1M - Cost per 1M output tokens (USD)
 * @property {number} cachedInputCostPer1M - Cost per 1M cached input tokens (USD)
 */

/**
 * Completion request
 * @typedef {Object} CompletionRequest
 * @property {string} model - Model identifier
 * @property {Message[]} messages - Conversation messages
 * @property {number} [maxTokens] - Maximum tokens to generate
 * @property {number} [temperature] - Sampling temperature (0-2)
 * @property {number} [topP] - Nucleus sampling threshold
 * @property {number} [frequencyPenalty] - Frequency penalty (-2 to 2)
 * @property {number} [presencePenalty] - Presence penalty (-2 to 2)
 * @property {boolean} [stream] - Enable streaming
 * @property {boolean} [json] - Enable JSON mode
 * @property {string[]} [stop] - Stop sequences
 * @property {Object} [metadata] - Request metadata
 */

/**
 * Message in conversation
 * @typedef {Object} Message
 * @property {'system' | 'user' | 'assistant'} role - Message role
 * @property {string | MessageContent[]} content - Message content
 * @property {string} [name] - Optional sender name
 */

/**
 * Rich message content
 * @typedef {Object} MessageContent
 * @property {'text' | 'image'} type - Content type
 * @property {string} text - Text content (if type=text)
 * @property {ImageContent} image - Image content (if type=image)
 */

/**
 * Image content
 * @typedef {Object} ImageContent
 * @property {string} url - Image URL or data URI
 * @property {string} [detail] - Detail level (low/high/auto)
 */

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Completion response
 * @typedef {Object} CompletionResponse
 * @property {string} id - Response ID
 * @property {string} model - Model used
 * @property {Choice[]} choices - Response choices
 * @property {Usage} usage - Token usage statistics
 * @property {ResponseMetadata} metadata - Response metadata
 */

/**
 * Response choice
 * @typedef {Object} Choice
 * @property {number} index - Choice index
 * @property {Message} message - Response message
 * @property {'stop' | 'length' | 'content_filter'} finishReason - Why completion stopped
 */

/**
 * Token usage statistics
 * @typedef {Object} Usage
 * @property {number} promptTokens - Input tokens
 * @property {number} completionTokens - Output tokens
 * @property {number} totalTokens - Total tokens
 * @property {number} cachedTokens - Cached tokens (if applicable)
 */

/**
 * Response metadata
 * @typedef {Object} ResponseMetadata
 * @property {number} latencyMs - Request latency in milliseconds
 * @property {number} costUsd - Estimated cost in USD
 * @property {string} timestamp - ISO timestamp
 * @property {string} provider - Provider that handled request
 */

// ═══════════════════════════════════════════════════════════════════════════
// STREAMING TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Streaming chunk
 * @typedef {Object} StreamChunk
 * @property {string} id - Chunk ID
 * @property {string} model - Model identifier
 * @property {StreamChoice[]} choices - Streaming choices
 * @property {boolean} done - Whether stream is complete
 */

/**
 * Streaming choice
 * @typedef {Object} StreamChoice
 * @property {number} index - Choice index
 * @property {StreamDelta} delta - Content delta
 * @property {'stop' | 'length' | null} finishReason - Finish reason (null if streaming)
 */

/**
 * Content delta in stream
 * @typedef {Object} StreamDelta
 * @property {'system' | 'user' | 'assistant'} [role] - Role (only in first chunk)
 * @property {string} [content] - Content delta
 */

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Model provider error
 * @typedef {Object} ModelProviderError
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {ProviderType} provider - Provider that generated error
 * @property {boolean} retryable - Whether error is retryable
 * @property {number} [retryAfter] - Seconds to wait before retry
 * @property {Object} [details] - Additional error details
 */

/**
 * Error codes
 * @typedef {'RATE_LIMIT' | 'AUTHENTICATION' | 'INVALID_REQUEST' | 
 *           'MODEL_NOT_FOUND' | 'CONTEXT_LENGTH_EXCEEDED' | 
 *           'SERVER_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR'} ErrorCode
 */

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH & MONITORING TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Provider health status
 * @typedef {Object} ProviderHealth
 * @property {ProviderType} provider - Provider type
 * @property {'healthy' | 'degraded' | 'unhealthy'} status - Health status
 * @property {number} latencyMs - Average latency
 * @property {number} successRate - Success rate (0-1)
 * @property {number} requestCount - Total requests
 * @property {number} errorCount - Total errors
 * @property {string} lastCheck - Last health check timestamp
 * @property {string[]} availableModels - Available models
 */

/**
 * Provider metrics
 * @typedef {Object} ProviderMetrics
 * @property {number} p50LatencyMs - 50th percentile latency
 * @property {number} p95LatencyMs - 95th percentile latency
 * @property {number} p99LatencyMs - 99th percentile latency
 * @property {number} throughput - Requests per second
 * @property {number} totalCostUsd - Total cost
 */

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Circuit breaker state
 * @typedef {'CLOSED' | 'OPEN' | 'HALF_OPEN'} CircuitState
 */

/**
 * Circuit breaker config
 * @typedef {Object} CircuitBreakerConfig
 * @property {number} failureThreshold - Failures before opening (default: 5)
 * @property {number} successThreshold - Successes before closing (default: 2)
 * @property {number} timeout - Timeout in ms before half-open (default: 60000)
 * @property {number} halfOpenMaxCalls - Max calls in half-open (default: 3)
 */

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rate limit config
 * @typedef {Object} RateLimitConfig
 * @property {number} maxRequests - Max requests
 * @property {number} windowMs - Time window in ms
 * @property {number} [burstSize] - Burst capacity
 * @property {boolean} [adaptive] - Adaptive rate limiting
 */

/**
 * Rate limit status
 * @typedef {Object} RateLimitStatus
 * @property {boolean} allowed - Whether request is allowed
 * @property {number} remaining - Remaining requests in window
 * @property {number} resetAt - Window reset timestamp
 * @property {number} [retryAfter] - Seconds to wait if rate limited
 */

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY & VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quality scores
 * @typedef {Object} QualityScores
 * @property {number} accuracy - Accuracy score (0-1)
 * @property {number} safety - Safety score (0-1)
 * @property {number} efficiency - Efficiency score (0-1)
 * @property {number} ihsan - Ihsan (excellence) score (0-1)
 */

/**
 * Validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether request is valid
 * @property {string[]} errors - Validation errors
 * @property {string[]} warnings - Validation warnings
 */

// Export placeholder (ES6 modules)
export {};
