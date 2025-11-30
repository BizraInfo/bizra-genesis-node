// src/models/traits.rs
// Trait definitions for AI model providers

use crate::models::errors::ModelResult;
use crate::models::types::{
    CompletionOptions, CompletionResponse, ModelInfo, ProviderHealth, StreamChunk,
};
use async_trait::async_trait;
use futures::stream::Stream;
use std::pin::Pin;

/// Core trait that all AI model providers must implement
///
/// This trait provides a unified interface for interacting with different
/// AI model providers (Ollama, OpenAI, Anthropic, etc.) through a common API.
///
/// # Examples
///
/// ```no_run
/// use bizra_genesis_node::models::{ModelProvider, CompletionOptions};
///
/// async fn generate_text<P: ModelProvider>(provider: &P) -> Result<String, Box<dyn std::error::Error>> {
///     let options = CompletionOptions::default();
///     let response = provider.complete(
///         "gpt-4",
///         "Explain quantum computing in simple terms",
///         &options
///     ).await?;
///
///     Ok(response.content)
/// }
/// ```
#[async_trait]
pub trait ModelProvider: Send + Sync {
    /// Returns the provider's unique name (e.g., "ollama", "openai", "anthropic")
    ///
    /// This name is used for identification, logging, and metrics.
    fn provider_name(&self) -> &str;

    /// Lists all models available from this provider
    ///
    /// # Errors
    ///
    /// Returns an error if the provider is unreachable or the request fails.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use bizra_genesis_node::models::ModelProvider;
    /// # async fn example<P: ModelProvider>(provider: &P) -> Result<(), Box<dyn std::error::Error>> {
    /// let models = provider.list_models().await?;
    /// for model in models {
    ///     println!("Model: {} (context: {} tokens)", model.name, model.context_length);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    async fn list_models(&self) -> ModelResult<Vec<ModelInfo>>;

    /// Generates a completion (non-streaming)
    ///
    /// # Arguments
    ///
    /// * `model` - Model identifier (e.g., "gpt-4", "llama3:8b")
    /// * `prompt` - Input prompt for the model
    /// * `options` - Completion configuration options
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - The model is not found or unavailable
    /// - The request fails due to network issues
    /// - Rate limits are exceeded
    /// - Authentication fails
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use bizra_genesis_node::models::{ModelProvider, CompletionOptions};
    /// # async fn example<P: ModelProvider>(provider: &P) -> Result<(), Box<dyn std::error::Error>> {
    /// let options = CompletionOptions {
    ///     temperature: 0.7,
    ///     max_tokens: 1024,
    ///     ..Default::default()
    /// };
    ///
    /// let response = provider.complete(
    ///     "gpt-4",
    ///     "Write a haiku about Rust programming",
    ///     &options
    /// ).await?;
    ///
    /// println!("Response: {}", response.content);
    /// println!("Tokens: {} input, {} output",
    ///          response.usage.input_tokens,
    ///          response.usage.output_tokens);
    /// # Ok(())
    /// # }
    /// ```
    async fn complete(
        &self,
        model: &str,
        prompt: &str,
        options: &CompletionOptions,
    ) -> ModelResult<CompletionResponse>;

    /// Generates a completion with streaming
    ///
    /// Returns a stream of chunks that can be processed as they arrive,
    /// enabling real-time display of generated text.
    ///
    /// # Arguments
    ///
    /// * `model` - Model identifier
    /// * `prompt` - Input prompt for the model
    /// * `options` - Completion configuration options
    ///
    /// # Returns
    ///
    /// A stream of `StreamChunk` items. The final chunk will have:
    /// - `finish_reason` set to indicate why generation stopped
    /// - `usage` set with token count statistics
    ///
    /// # Errors
    ///
    /// Returns an error if the initial request fails. Stream errors are
    /// yielded as items in the stream.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use bizra_genesis_node::models::{ModelProvider, CompletionOptions};
    /// # use futures::StreamExt;
    /// # async fn example<P: ModelProvider>(provider: &P) -> Result<(), Box<dyn std::error::Error>> {
    /// let options = CompletionOptions::default();
    /// let mut stream = provider.complete_stream(
    ///     "gpt-4",
    ///     "Write a story about a robot",
    ///     &options
    /// ).await?;
    ///
    /// while let Some(chunk) = stream.next().await {
    ///     let chunk = chunk?;
    ///     print!("{}", chunk.delta);
    ///
    ///     if chunk.is_final() {
    ///         if let Some(usage) = chunk.usage {
    ///             println!("\nTotal tokens: {}", usage.total_tokens);
    ///         }
    ///     }
    /// }
    /// # Ok(())
    /// # }
    /// ```
    async fn complete_stream(
        &self,
        model: &str,
        prompt: &str,
        options: &CompletionOptions,
    ) -> ModelResult<Pin<Box<dyn Stream<Item = ModelResult<StreamChunk>> + Send>>>;

    /// Gets detailed information about a specific model
    ///
    /// # Arguments
    ///
    /// * `model` - Model identifier
    ///
    /// # Errors
    ///
    /// Returns an error if the model is not found or the request fails.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use bizra_genesis_node::models::ModelProvider;
    /// # async fn example<P: ModelProvider>(provider: &P) -> Result<(), Box<dyn std::error::Error>> {
    /// let info = provider.model_info("gpt-4").await?;
    /// println!("Context length: {} tokens", info.context_length);
    /// println!("Cost: ${:.4}/1K input, ${:.4}/1K output",
    ///          info.cost_per_1k_input,
    ///          info.cost_per_1k_output);
    /// # Ok(())
    /// # }
    /// ```
    async fn model_info(&self, model: &str) -> ModelResult<ModelInfo>;

    /// Calculates the cost for a given number of tokens
    ///
    /// # Arguments
    ///
    /// * `model` - Model identifier
    /// * `input_tokens` - Number of input/prompt tokens
    /// * `output_tokens` - Number of output/completion tokens
    ///
    /// # Returns
    ///
    /// The total cost in USD for the given token counts.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use bizra_genesis_node::models::ModelProvider;
    /// # async fn example<P: ModelProvider>(provider: &P) -> Result<(), Box<dyn std::error::Error>> {
    /// let cost = provider.calculate_cost("gpt-4", 1000, 500).await?;
    /// println!("Estimated cost: ${:.6}", cost);
    /// # Ok(())
    /// # }
    /// ```
    async fn calculate_cost(
        &self,
        model: &str,
        input_tokens: usize,
        output_tokens: usize,
    ) -> ModelResult<f64> {
        // Default implementation using model_info
        let info = self.model_info(model).await?;
        Ok(info.calculate_cost(input_tokens, output_tokens))
    }

    /// Performs a health check on the provider
    ///
    /// This should be a lightweight operation that verifies:
    /// - Provider API is reachable
    /// - Authentication is valid
    /// - Models are available
    ///
    /// # Errors
    ///
    /// May return an error if the health check request itself fails,
    /// but providers should aim to return a degraded/unhealthy status
    /// rather than an error when possible.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use bizra_genesis_node::models::ModelProvider;
    /// # async fn example<P: ModelProvider>(provider: &P) -> Result<(), Box<dyn std::error::Error>> {
    /// let health = provider.health_check().await?;
    ///
    /// if health.status.is_operational() {
    ///     println!("Provider {} is operational ({} models available)",
    ///              health.provider,
    ///              health.models_available);
    /// } else {
    ///     println!("Provider {} is unhealthy: {:?}",
    ///              health.provider,
    ///              health.error);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    async fn health_check(&self) -> ModelResult<ProviderHealth>;

    /// Estimates token count for a given text
    ///
    /// This is a best-effort estimation that may not match the exact
    /// tokenization used by the model. Providers may override this
    /// with more accurate tokenizers.
    ///
    /// # Arguments
    ///
    /// * `text` - Text to count tokens for
    /// * `model` - Model to use for tokenization (optional)
    ///
    /// # Returns
    ///
    /// Estimated token count
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use bizra_genesis_node::models::ModelProvider;
    /// # async fn example<P: ModelProvider>(provider: &P) -> Result<(), Box<dyn std::error::Error>> {
    /// let text = "Hello, world! This is a test.";
    /// let tokens = provider.estimate_tokens(text, Some("gpt-4")).await?;
    /// println!("Estimated tokens: {}", tokens);
    /// # Ok(())
    /// # }
    /// ```
    async fn estimate_tokens(&self, text: &str, _model: Option<&str>) -> ModelResult<usize> {
        // Simple default implementation: ~4 chars per token (rough estimate)
        // Providers should override with actual tokenizers
        Ok((text.len() as f64 / 4.0).ceil() as usize)
    }

    /// Checks if a specific model is available
    ///
    /// # Arguments
    ///
    /// * `model` - Model identifier to check
    ///
    /// # Returns
    ///
    /// `true` if the model is available, `false` otherwise
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use bizra_genesis_node::models::ModelProvider;
    /// # async fn example<P: ModelProvider>(provider: &P) -> Result<(), Box<dyn std::error::Error>> {
    /// if provider.is_model_available("gpt-4").await? {
    ///     println!("GPT-4 is available");
    /// } else {
    ///     println!("GPT-4 is not available");
    /// }
    /// # Ok(())
    /// # }
    /// ```
    async fn is_model_available(&self, model: &str) -> ModelResult<bool> {
        let models = self.list_models().await?;
        Ok(models.iter().any(|m| m.name == model))
    }

    /// Validates completion options for a specific model
    ///
    /// Checks if the provided options are valid for the given model,
    /// such as max_tokens not exceeding context length.
    ///
    /// # Arguments
    ///
    /// * `model` - Model identifier
    /// * `options` - Options to validate
    ///
    /// # Errors
    ///
    /// Returns an error if options are invalid for the model
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use bizra_genesis_node::models::{ModelProvider, CompletionOptions};
    /// # async fn example<P: ModelProvider>(provider: &P) -> Result<(), Box<dyn std::error::Error>> {
    /// let options = CompletionOptions {
    ///     max_tokens: 100000, // Too many!
    ///     ..Default::default()
    /// };
    ///
    /// match provider.validate_options("gpt-4", &options).await {
    ///     Ok(_) => println!("Options are valid"),
    ///     Err(e) => println!("Invalid options: {}", e),
    /// }
    /// # Ok(())
    /// # }
    /// ```
    async fn validate_options(&self, model: &str, options: &CompletionOptions) -> ModelResult<()> {
        let info = self.model_info(model).await?;

        // Check if max_tokens is reasonable
        if options.max_tokens > info.context_length {
            return Err(crate::models::errors::ModelError::InvalidRequest {
                message: format!(
                    "max_tokens ({}) exceeds model context length ({})",
                    options.max_tokens, info.context_length
                ),
                field: Some("max_tokens".to_string()),
            });
        }

        // Check temperature range
        if options.temperature < 0.0 || options.temperature > 2.0 {
            return Err(crate::models::errors::ModelError::InvalidRequest {
                message: format!(
                    "temperature ({}) must be between 0.0 and 2.0",
                    options.temperature
                ),
                field: Some("temperature".to_string()),
            });
        }

        Ok(())
    }
}

/// Extension trait for batch operations
#[async_trait]
pub trait BatchModelProvider: ModelProvider {
    /// Generates multiple completions in a single batch request
    ///
    /// This can be more efficient than multiple individual requests
    /// when supported by the provider.
    ///
    /// # Arguments
    ///
    /// * `model` - Model identifier
    /// * `prompts` - List of prompts to complete
    /// * `options` - Completion options (applied to all prompts)
    ///
    /// # Returns
    ///
    /// A vector of responses corresponding to each prompt
    ///
    /// # Errors
    ///
    /// Returns an error if the batch request fails
    async fn complete_batch(
        &self,
        model: &str,
        prompts: &[String],
        options: &CompletionOptions,
    ) -> ModelResult<Vec<CompletionResponse>>;
}

#[cfg(test)]
mod tests {
    use super::*;

    // Mock provider for testing trait default implementations
    struct MockProvider;

    #[async_trait]
    impl ModelProvider for MockProvider {
        fn provider_name(&self) -> &str {
            "mock"
        }

        async fn list_models(&self) -> ModelResult<Vec<ModelInfo>> {
            Ok(vec![
                ModelInfo::new("mock-model", "mock", 8192).with_cost(0.01, 0.02)
            ])
        }

        async fn complete(
            &self,
            _model: &str,
            _prompt: &str,
            _options: &CompletionOptions,
        ) -> ModelResult<CompletionResponse> {
            unimplemented!()
        }

        async fn complete_stream(
            &self,
            _model: &str,
            _prompt: &str,
            _options: &CompletionOptions,
        ) -> ModelResult<Pin<Box<dyn Stream<Item = ModelResult<StreamChunk>> + Send>>> {
            unimplemented!()
        }

        async fn model_info(&self, model: &str) -> ModelResult<ModelInfo> {
            Ok(ModelInfo::new(model, "mock", 8192).with_cost(0.01, 0.02))
        }

        async fn health_check(&self) -> ModelResult<ProviderHealth> {
            unimplemented!()
        }
    }

    #[tokio::test]
    async fn test_default_calculate_cost() {
        let provider = MockProvider;
        let cost = provider
            .calculate_cost("mock-model", 1000, 500)
            .await
            .unwrap();
        assert!((cost - 0.02).abs() < 0.001); // 0.01 + 0.01 = 0.02
    }

    #[tokio::test]
    async fn test_default_is_model_available() {
        let provider = MockProvider;
        assert!(provider.is_model_available("mock-model").await.unwrap());
        assert!(!provider.is_model_available("nonexistent").await.unwrap());
    }

    #[tokio::test]
    async fn test_default_validate_options() {
        let provider = MockProvider;

        // Valid options
        let valid_options = CompletionOptions::default();
        assert!(provider
            .validate_options("mock-model", &valid_options)
            .await
            .is_ok());

        // Invalid: max_tokens too high
        let invalid_options = CompletionOptions {
            max_tokens: 100000,
            ..Default::default()
        };
        assert!(provider
            .validate_options("mock-model", &invalid_options)
            .await
            .is_err());

        // Invalid: temperature out of range
        let invalid_temp = CompletionOptions {
            temperature: 3.0,
            ..Default::default()
        };
        assert!(provider
            .validate_options("mock-model", &invalid_temp)
            .await
            .is_err());
    }

    #[tokio::test]
    async fn test_default_estimate_tokens() {
        let provider = MockProvider;
        let tokens = provider
            .estimate_tokens("Hello, world!", None)
            .await
            .unwrap();
        assert!((3..=4).contains(&tokens)); // ~4 chars per token
    }
}
