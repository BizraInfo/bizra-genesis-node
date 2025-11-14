// src/models/mod.rs
// AI Model Provider Integration Module
//
// This module provides a unified interface for interacting with multiple
// AI model providers (Ollama, OpenAI, Anthropic, etc.) through a common API.
//
// # Architecture
//
// ```
// ModelProvider Trait (traits.rs)
//        ↓
//   Implementations:
//   ├─ OllamaProvider (ollama.rs)
//   ├─ OpenAIProvider (openai.rs)
//   └─ AnthropicProvider (anthropic.rs)
//        ↓
//   ProviderRegistry (registry.rs)
//        ↓
//   SynthesisOrchestrator
// ```
//
// # Examples
//
// ```no_run
// use bizra_genesis_node::models::{ModelProvider, CompletionOptions};
//
// async fn example() -> Result<(), Box<dyn std::error::Error>> {
//     // Create provider
//     let provider = bizra_genesis_node::models::ollama::OllamaProvider::new("http://localhost:11434")?;
//
//     // List available models
//     let models = provider.list_models().await?;
//     println!("Available models: {}", models.len());
//
//     // Generate completion
//     let options = CompletionOptions::default();
//     let response = provider.complete(
//         "llama3:8b",
//         "Explain quantum entanglement",
//         &options
//     ).await?;
//
//     println!("Response: {}", response.content);
//     println!("Tokens: {}", response.usage.total_tokens);
//
//     Ok(())
// }
// ```

pub mod errors;
pub mod traits;
pub mod types;

// Provider implementations
pub mod ollama;
pub mod openai;
pub mod anthropic;
pub mod registry;
pub mod rate_limit;
pub mod streaming;
pub mod ab_testing;
pub mod thompson_sampling;

// Re-exports for convenience
pub use errors::{ModelError, ModelResult};
pub use traits::{BatchModelProvider, ModelProvider};
pub use types::{
    CompletionOptions, CompletionResponse, FinishReason, HealthStatus, ModelInfo, ProviderHealth,
    RetryConfig, StreamChunk, TokenUsage,
};

// Provider re-exports
pub use anthropic::{AnthropicConfig, AnthropicProvider};
pub use ollama::{OllamaConfig, OllamaProvider};
pub use openai::{OpenAIConfig, OpenAIProvider};
pub use rate_limit::{RateLimitConfig, RateLimiter, UsageStats};
pub use registry::{ModelRequirements, ProviderRegistry, SelectedModel, SelectionStrategy};
pub use streaming::{
    BackpressureHandler, BufferConfig, BufferStats, BufferedStream, StreamAggregator,
    StreamCombiner, StreamMetrics, StreamMonitor, StreamRetryHandler, collect_stream,
    collect_stream_with_metrics,
};
pub use ab_testing::{
    ComparisonResult, ExperimentConfig, ExperimentReport, MetricType, Observation, SummaryStats,
    Variant, VariantStats,
};
pub use thompson_sampling::{ModelPerformance, ThompsonConfig, ThompsonSamplingRouter};

/// Module version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Default timeout for model requests (30 seconds)
pub const DEFAULT_TIMEOUT_SECS: u64 = 30;

/// Default maximum retries for failed requests
pub const DEFAULT_MAX_RETRIES: u32 = 3;

/// Maximum context length supported by most models
pub const MAX_CONTEXT_LENGTH: usize = 128_000;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_exports() {
        // Verify key types are exported
        let _error: Option<ModelError> = None;
        let _result: ModelResult<()> = Ok(());
        let _options = CompletionOptions::default();
        let _usage = TokenUsage::new(100, 50);
    }

    #[test]
    fn test_constants() {
        assert!(DEFAULT_TIMEOUT_SECS > 0);
        assert!(DEFAULT_MAX_RETRIES > 0);
        assert!(MAX_CONTEXT_LENGTH > 0);
    }
}
