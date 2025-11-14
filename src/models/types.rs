// src/models/types.rs
// Core data types for AI model providers

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

/// Information about an AI model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    /// Model identifier (e.g., "gpt-4", "llama3:8b")
    pub name: String,

    /// Provider name (e.g., "openai", "ollama", "anthropic")
    pub provider: String,

    /// Maximum context length in tokens
    pub context_length: usize,

    /// Cost per 1,000 input tokens (USD)
    pub cost_per_1k_input: f64,

    /// Cost per 1,000 output tokens (USD)
    pub cost_per_1k_output: f64,

    /// Model capabilities (e.g., ["chat", "completion", "function_calling"])
    pub capabilities: Vec<String>,

    /// Model family (e.g., "gpt-4", "claude-3", "llama-3")
    pub family: Option<String>,

    /// Model size in parameters (e.g., 8B, 70B)
    pub parameters: Option<String>,

    /// Additional metadata
    pub metadata: HashMap<String, String>,
}

impl ModelInfo {
    /// Creates a new ModelInfo with required fields
    pub fn new(name: impl Into<String>, provider: impl Into<String>, context_length: usize) -> Self {
        Self {
            name: name.into(),
            provider: provider.into(),
            context_length,
            cost_per_1k_input: 0.0,
            cost_per_1k_output: 0.0,
            capabilities: Vec::new(),
            family: None,
            parameters: None,
            metadata: HashMap::new(),
        }
    }

    /// Sets the cost information
    pub fn with_cost(mut self, input_cost: f64, output_cost: f64) -> Self {
        self.cost_per_1k_input = input_cost;
        self.cost_per_1k_output = output_cost;
        self
    }

    /// Adds a capability
    pub fn with_capability(mut self, capability: impl Into<String>) -> Self {
        self.capabilities.push(capability.into());
        self
    }

    /// Calculates the cost for given token counts
    pub fn calculate_cost(&self, input_tokens: usize, output_tokens: usize) -> f64 {
        let input_cost = (input_tokens as f64 / 1000.0) * self.cost_per_1k_input;
        let output_cost = (output_tokens as f64 / 1000.0) * self.cost_per_1k_output;
        input_cost + output_cost
    }
}

/// Options for model completion requests
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionOptions {
    /// Sampling temperature (0.0 = deterministic, 2.0 = very creative)
    pub temperature: f32,

    /// Maximum tokens to generate
    pub max_tokens: usize,

    /// Top-p (nucleus) sampling threshold
    pub top_p: f32,

    /// Top-k sampling (optional, provider-specific)
    pub top_k: Option<usize>,

    /// Stop sequences (generation stops when encountered)
    pub stop_sequences: Vec<String>,

    /// Frequency penalty (-2.0 to 2.0)
    pub frequency_penalty: f32,

    /// Presence penalty (-2.0 to 2.0)
    pub presence_penalty: f32,

    /// System message (for chat models)
    pub system_message: Option<String>,

    /// Additional provider-specific options
    pub extra: HashMap<String, serde_json::Value>,
}

impl Default for CompletionOptions {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 0.95,
            top_k: None,
            stop_sequences: Vec::new(),
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            system_message: None,
            extra: HashMap::new(),
        }
    }
}

impl CompletionOptions {
    /// Creates options optimized for creative generation
    pub fn creative() -> Self {
        Self {
            temperature: 1.0,
            top_p: 0.95,
            ..Default::default()
        }
    }

    /// Creates options optimized for deterministic/factual output
    pub fn deterministic() -> Self {
        Self {
            temperature: 0.0,
            top_p: 1.0,
            ..Default::default()
        }
    }

    /// Creates options optimized for code generation
    pub fn code_generation() -> Self {
        Self {
            temperature: 0.2,
            top_p: 0.95,
            max_tokens: 2048,
            ..Default::default()
        }
    }
}

/// Token usage statistics
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct TokenUsage {
    /// Number of input/prompt tokens
    pub input_tokens: usize,

    /// Number of output/completion tokens
    pub output_tokens: usize,

    /// Total tokens (input + output)
    pub total_tokens: usize,
}

impl TokenUsage {
    /// Creates a new TokenUsage
    pub fn new(input_tokens: usize, output_tokens: usize) -> Self {
        Self {
            input_tokens,
            output_tokens,
            total_tokens: input_tokens + output_tokens,
        }
    }

    /// Adds another TokenUsage to this one
    pub fn add(&mut self, other: &TokenUsage) {
        self.input_tokens += other.input_tokens;
        self.output_tokens += other.output_tokens;
        self.total_tokens += other.total_tokens;
    }
}

/// Reason why generation finished
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FinishReason {
    /// Model reached a natural stopping point
    Stop,

    /// Maximum token limit reached
    Length,

    /// Content was filtered by safety systems
    ContentFilter,

    /// Model invoked a function/tool
    ToolCalls,

    /// Error occurred during generation
    Error,

    /// Provider-specific reason
    Other(String),
}

impl FinishReason {
    /// Returns true if generation completed successfully
    pub fn is_success(&self) -> bool {
        matches!(self, FinishReason::Stop | FinishReason::ToolCalls)
    }

    /// Returns true if generation was cut off
    pub fn is_truncated(&self) -> bool {
        matches!(self, FinishReason::Length)
    }
}

/// Response from a completion request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionResponse {
    /// Generated content
    pub content: String,

    /// Model that generated the response
    pub model: String,

    /// Provider that served the request
    pub provider: String,

    /// Token usage statistics
    pub usage: TokenUsage,

    /// Why generation finished
    pub finish_reason: FinishReason,

    /// Time taken for the request (milliseconds)
    pub latency_ms: u64,

    /// Timestamp when response was received (Unix timestamp in milliseconds)
    pub timestamp_ms: u64,

    /// Additional metadata from provider
    pub metadata: HashMap<String, serde_json::Value>,
}

impl CompletionResponse {
    /// Calculates cost based on model info
    pub fn calculate_cost(&self, model_info: &ModelInfo) -> f64 {
        model_info.calculate_cost(self.usage.input_tokens, self.usage.output_tokens)
    }

    /// Returns tokens per second
    pub fn tokens_per_second(&self) -> f64 {
        if self.latency_ms == 0 {
            return 0.0;
        }
        (self.usage.output_tokens as f64) / (self.latency_ms as f64 / 1000.0)
    }
}

/// Chunk of a streaming response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    /// Content delta (new tokens)
    pub delta: String,

    /// Model generating the response
    pub model: String,

    /// Finish reason (only set on final chunk)
    pub finish_reason: Option<FinishReason>,

    /// Token usage (only set on final chunk)
    pub usage: Option<TokenUsage>,

    /// Chunk sequence number
    pub index: usize,
}

impl StreamChunk {
    /// Returns true if this is the final chunk
    pub fn is_final(&self) -> bool {
        self.finish_reason.is_some()
    }
}

/// Health status of a model provider
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    /// Provider is healthy and operational
    Healthy,

    /// Provider is degraded but operational
    Degraded,

    /// Provider is unhealthy and not operational
    Unhealthy,

    /// Provider health is unknown
    Unknown,
}

impl HealthStatus {
    /// Returns true if provider can serve requests
    pub fn is_operational(&self) -> bool {
        matches!(self, HealthStatus::Healthy | HealthStatus::Degraded)
    }
}

/// Provider health check response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderHealth {
    /// Overall health status
    pub status: HealthStatus,

    /// Provider name
    pub provider: String,

    /// Response time for health check (milliseconds)
    pub latency_ms: u64,

    /// Number of available models
    pub models_available: usize,

    /// Error message (if unhealthy)
    pub error: Option<String>,

    /// Additional details
    pub details: HashMap<String, serde_json::Value>,
}

/// Configuration for retry behavior
#[derive(Debug, Clone)]
pub struct RetryConfig {
    /// Maximum number of retry attempts
    pub max_retries: u32,

    /// Initial backoff duration
    pub initial_backoff: Duration,

    /// Maximum backoff duration
    pub max_backoff: Duration,

    /// Backoff multiplier
    pub backoff_multiplier: f64,

    /// Jitter factor (0.0-1.0)
    pub jitter: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_backoff: Duration::from_millis(1000),
            max_backoff: Duration::from_secs(60),
            backoff_multiplier: 2.0,
            jitter: 0.1,
        }
    }
}

impl RetryConfig {
    /// Calculates backoff duration for a given attempt
    pub fn backoff_duration(&self, attempt: u32) -> Duration {
        let base = self.initial_backoff.as_millis() as f64
            * self.backoff_multiplier.powi(attempt as i32);
        let max_ms = self.max_backoff.as_millis() as f64;
        let clamped_ms = base.min(max_ms);

        // Add jitter
        let jitter_range = clamped_ms * self.jitter;
        let jitter = (rand::random::<f64>() - 0.5) * jitter_range;
        let final_ms = (clamped_ms + jitter).max(0.0);

        Duration::from_millis(final_ms as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_info_cost_calculation() {
        let model = ModelInfo::new("gpt-4", "openai", 8192)
            .with_cost(0.03, 0.06); // $0.03 input, $0.06 output per 1K tokens

        // 1000 input, 500 output
        let cost = model.calculate_cost(1000, 500);
        assert!((cost - 0.06).abs() < 0.001); // 0.03 + 0.03 = 0.06
    }

    #[test]
    fn test_token_usage() {
        let mut usage = TokenUsage::new(100, 50);
        assert_eq!(usage.total_tokens, 150);

        usage.add(&TokenUsage::new(25, 25));
        assert_eq!(usage.input_tokens, 125);
        assert_eq!(usage.output_tokens, 75);
        assert_eq!(usage.total_tokens, 200);
    }

    #[test]
    fn test_finish_reason() {
        assert!(FinishReason::Stop.is_success());
        assert!(FinishReason::ToolCalls.is_success());
        assert!(!FinishReason::Error.is_success());

        assert!(FinishReason::Length.is_truncated());
        assert!(!FinishReason::Stop.is_truncated());
    }

    #[test]
    fn test_completion_options_presets() {
        let creative = CompletionOptions::creative();
        assert_eq!(creative.temperature, 1.0);

        let deterministic = CompletionOptions::deterministic();
        assert_eq!(deterministic.temperature, 0.0);

        let code = CompletionOptions::code_generation();
        assert_eq!(code.max_tokens, 2048);
    }

    #[test]
    fn test_tokens_per_second() {
        let response = CompletionResponse {
            content: "test".to_string(),
            model: "test-model".to_string(),
            provider: "test".to_string(),
            usage: TokenUsage::new(10, 100),
            finish_reason: FinishReason::Stop,
            latency_ms: 1000, // 1 second
            timestamp_ms: 0,
            metadata: HashMap::new(),
        };

        assert_eq!(response.tokens_per_second(), 100.0); // 100 tokens in 1 second
    }

    #[test]
    fn test_retry_config_backoff() {
        let config = RetryConfig::default();

        let backoff1 = config.backoff_duration(0);
        let backoff2 = config.backoff_duration(1);
        let backoff3 = config.backoff_duration(2);

        // Each backoff should be roughly 2x the previous (with jitter)
        assert!(backoff1.as_millis() >= 900 && backoff1.as_millis() <= 1100); // ~1000ms
        assert!(backoff2.as_millis() >= 1800 && backoff2.as_millis() <= 2200); // ~2000ms
        assert!(backoff3.as_millis() >= 3600 && backoff3.as_millis() <= 4400); // ~4000ms
    }

    #[test]
    fn test_health_status() {
        assert!(HealthStatus::Healthy.is_operational());
        assert!(HealthStatus::Degraded.is_operational());
        assert!(!HealthStatus::Unhealthy.is_operational());
        assert!(!HealthStatus::Unknown.is_operational());
    }
}
