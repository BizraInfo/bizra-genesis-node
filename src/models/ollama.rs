// BIZRA Genesis Node - Professional Elite Implementation
// Ollama Local Model Provider
//
// Provides integration with Ollama for local LLM inference.
// Supports Llama 3, Mistral, Phi-3, CodeLlama, and other Ollama-compatible models.

use async_trait::async_trait;
use futures::stream::{Stream, StreamExt};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::pin::Pin;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

use super::errors::{ModelError, ModelResult};
use super::traits::ModelProvider;
use super::types::{
    CompletionOptions, CompletionResponse, FinishReason, HealthStatus, ModelInfo, ProviderHealth,
    StreamChunk, TokenUsage,
};

// ============================================================================
// Ollama API Types
// ============================================================================

#[derive(Debug, Serialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaOptions>,
}

#[derive(Debug, Serialize)]
struct OllamaOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    num_predict: Option<i32>, // max_tokens in Ollama
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_k: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct OllamaGenerateResponse {
    #[serde(default)]
    model: String,
    #[serde(default)]
    response: String,
    #[serde(default)]
    done: bool,
    #[serde(default)]
    total_duration: Option<u64>, // nanoseconds
    #[serde(default)]
    load_duration: Option<u64>,
    #[serde(default)]
    prompt_eval_count: Option<usize>,
    #[serde(default)]
    eval_count: Option<usize>,
}

#[derive(Debug, Deserialize)]
struct OllamaListResponse {
    models: Vec<OllamaModelInfo>,
}

#[derive(Debug, Deserialize)]
struct OllamaModelInfo {
    name: String,
    #[serde(default)]
    size: u64,
    #[serde(default)]
    modified_at: String,
    #[serde(default)]
    details: OllamaModelDetails,
}

#[derive(Debug, Default, Deserialize)]
struct OllamaModelDetails {
    #[serde(default)]
    format: String,
    #[serde(default)]
    family: String,
    #[serde(default)]
    parameter_size: String,
}

#[derive(Debug, Deserialize)]
struct OllamaShowResponse {
    #[serde(default)]
    modelfile: String,
    #[serde(default)]
    parameters: String,
    #[serde(default)]
    template: String,
    #[serde(default)]
    details: OllamaModelDetails,
}

// ============================================================================
// Ollama Provider Configuration
// ============================================================================

#[derive(Debug, Clone)]
pub struct OllamaConfig {
    /// Ollama API endpoint (default: http://localhost:11434)
    pub endpoint: String,
    /// Request timeout in seconds (default: 60)
    pub timeout_secs: u64,
    /// Maximum retry attempts (default: 3)
    pub max_retries: u32,
    /// Initial backoff in milliseconds (default: 1000)
    pub initial_backoff_ms: u64,
    /// Maximum backoff in milliseconds (default: 30000)
    pub max_backoff_ms: u64,
    /// Connection pool size (default: 10)
    pub pool_size: usize,
}

impl Default for OllamaConfig {
    fn default() -> Self {
        Self {
            endpoint: "http://localhost:11434".to_string(),
            timeout_secs: 60,
            max_retries: 3,
            initial_backoff_ms: 1000,
            max_backoff_ms: 30000,
            pool_size: 10,
        }
    }
}

// ============================================================================
// Ollama Provider Implementation
// ============================================================================

/// Ollama local model provider
///
/// Connects to local Ollama instance for LLM inference.
/// Supports models like Llama 3, Mistral, Phi-3, CodeLlama, etc.
///
/// # Example
///
/// ```rust,no_run
/// use bizra_genesis_node::models::{OllamaProvider, ModelProvider};
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let provider = OllamaProvider::new("http://localhost:11434");
///
///     // List available models
///     let models = provider.list_models().await?;
///     println!("Available models: {:?}", models);
///
///     Ok(())
/// }
/// ```
pub struct OllamaProvider {
    config: OllamaConfig,
    client: Client,
}

impl OllamaProvider {
    /// Create a new Ollama provider with default configuration
    pub fn new(endpoint: &str) -> Self {
        let config = OllamaConfig {
            endpoint: endpoint.to_string(),
            ..Default::default()
        };
        Self::with_config(config)
    }

    /// Create a new Ollama provider with custom configuration
    pub fn with_config(config: OllamaConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_secs))
            .pool_max_idle_per_host(config.pool_size)
            .pool_idle_timeout(Duration::from_secs(90))
            .build()
            .expect("Failed to create HTTP client");

        Self { config, client }
    }

    /// Execute request with retry logic
    async fn execute_with_retry<F, Fut, T>(&self, operation: F) -> ModelResult<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = ModelResult<T>>,
    {
        let mut attempts = 0;
        let mut backoff_ms = self.config.initial_backoff_ms;

        loop {
            attempts += 1;

            match operation().await {
                Ok(result) => return Ok(result),
                Err(err) if err.is_retryable() && attempts < self.config.max_retries => {
                    warn!(
                        provider = "ollama",
                        attempt = attempts,
                        max_retries = self.config.max_retries,
                        error = ?err,
                        "Request failed, retrying..."
                    );

                    // Use suggested backoff from error if available
                    let sleep_ms = err.retry_after_ms().unwrap_or(backoff_ms);
                    sleep(Duration::from_millis(sleep_ms)).await;

                    // Exponential backoff with jitter
                    backoff_ms = (backoff_ms * 2).min(self.config.max_backoff_ms);
                    let jitter = fastrand::u64(0..backoff_ms / 4);
                    backoff_ms = backoff_ms.saturating_add(jitter);
                }
                Err(err) => {
                    error!(
                        provider = "ollama",
                        attempts = attempts,
                        error = ?err,
                        "Request failed permanently"
                    );
                    return Err(err);
                }
            }
        }
    }

    /// Convert Ollama model info to ModelInfo
    fn convert_model_info(&self, ollama_model: &OllamaModelInfo) -> ModelInfo {
        // Parse context length from model family (best effort)
        let context_length = match ollama_model.details.family.as_str() {
            "llama" => 4096,  // Llama 3 default
            "mistral" => 8192, // Mistral default
            "phi3" => 4096,    // Phi-3 default
            "codellama" => 16384, // CodeLlama default
            _ => 2048,         // Conservative default
        };

        // Determine capabilities based on model family
        let mut capabilities = vec!["completion".to_string()];
        if ollama_model.details.family.contains("code") {
            capabilities.push("code".to_string());
        }

        // Create metadata map
        let mut metadata = HashMap::new();
        metadata.insert("supports_streaming".to_string(), "true".to_string());
        metadata.insert("size_bytes".to_string(), ollama_model.size.to_string());
        if !ollama_model.modified_at.is_empty() {
            metadata.insert("modified_at".to_string(), ollama_model.modified_at.clone());
        }
        if !ollama_model.details.format.is_empty() {
            metadata.insert("format".to_string(), ollama_model.details.format.clone());
        }

        ModelInfo {
            name: ollama_model.name.clone(),
            provider: "ollama".to_string(),
            context_length,
            cost_per_1k_input: 0.0, // Ollama is free for local models
            cost_per_1k_output: 0.0,
            capabilities,
            family: if ollama_model.details.family.is_empty() {
                None
            } else {
                Some(ollama_model.details.family.clone())
            },
            parameters: if ollama_model.details.parameter_size.is_empty() {
                None
            } else {
                Some(ollama_model.details.parameter_size.clone())
            },
            metadata,
        }
    }

    /// Convert CompletionOptions to OllamaOptions
    fn convert_options(&self, options: &CompletionOptions) -> OllamaOptions {
        OllamaOptions {
            temperature: Some(options.temperature),
            num_predict: Some(options.max_tokens as i32),
            top_p: Some(options.top_p),
            top_k: options.top_k.map(|k| k as i32),
            stop: if options.stop_sequences.is_empty() {
                None
            } else {
                Some(options.stop_sequences.clone())
            },
        }
    }
}

// ============================================================================
// ModelProvider Trait Implementation
// ============================================================================

#[async_trait]
impl ModelProvider for OllamaProvider {
    fn provider_name(&self) -> &str {
        "ollama"
    }

    async fn list_models(&self) -> ModelResult<Vec<ModelInfo>> {
        debug!(provider = "ollama", "Fetching model list");

        let operation = || async {
            let response = self
                .client
                .get(format!("{}/api/tags", self.config.endpoint))
                .send()
                .await?;

            if !response.status().is_success() {
                return Err(self.handle_error_response(response).await);
            }

            let ollama_response = response
                .json::<OllamaListResponse>()
                .await
                .map_err(|e| {
                    ModelError::ParseError {
                        message: format!("Failed to parse model list: {}", e),
                        raw_response: None,
                    }
                })?;

            Ok(ollama_response
                .models
                .iter()
                .map(|m| self.convert_model_info(m))
                .collect())
        };

        self.execute_with_retry(operation).await
    }

    async fn complete(
        &self,
        model: &str,
        prompt: &str,
        options: &CompletionOptions,
    ) -> ModelResult<CompletionResponse> {
        debug!(
            provider = "ollama",
            model = model,
            prompt_len = prompt.len(),
            "Generating completion"
        );

        let start = Instant::now();

        let operation = || async {
            let request_body = OllamaGenerateRequest {
                model: model.to_string(),
                prompt: prompt.to_string(),
                stream: false,
                options: Some(self.convert_options(options)),
            };

            let response = self
                .client
                .post(format!("{}/api/generate", self.config.endpoint))
                .json(&request_body)
                .send()
                .await?;

            if !response.status().is_success() {
                return Err(self.handle_error_response(response).await);
            }

            let ollama_response = response
                .json::<OllamaGenerateResponse>()
                .await
                .map_err(|e| {
                    ModelError::ParseError {
                        message: format!("Failed to parse response: {}", e),
                        raw_response: None,
                    }
                })?;

            let latency_ms = start.elapsed().as_millis() as u64;

            let mut metadata = HashMap::new();
            if let Some(total_duration) = ollama_response.total_duration {
                metadata.insert("total_duration_ns".to_string(), serde_json::json!(total_duration));
            }
            if let Some(load_duration) = ollama_response.load_duration {
                metadata.insert("load_duration_ns".to_string(), serde_json::json!(load_duration));
            }

            Ok(CompletionResponse {
                content: ollama_response.response,
                model: model.to_string(),
                provider: "ollama".to_string(),
                usage: TokenUsage {
                    input_tokens: ollama_response.prompt_eval_count.unwrap_or(0),
                    output_tokens: ollama_response.eval_count.unwrap_or(0),
                    total_tokens: ollama_response.prompt_eval_count.unwrap_or(0)
                        + ollama_response.eval_count.unwrap_or(0),
                },
                finish_reason: FinishReason::Stop,
                latency_ms,
                timestamp_ms: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
                metadata,
            })
        };

        self.execute_with_retry(operation).await
    }

    async fn complete_stream(
        &self,
        model: &str,
        prompt: &str,
        options: &CompletionOptions,
    ) -> ModelResult<Pin<Box<dyn Stream<Item = ModelResult<StreamChunk>> + Send>>> {
        debug!(
            provider = "ollama",
            model = model,
            prompt_len = prompt.len(),
            "Generating streaming completion"
        );

        let request_body = OllamaGenerateRequest {
            model: model.to_string(),
            prompt: prompt.to_string(),
            stream: true,
            options: Some(self.convert_options(options)),
        };

        let response = self
            .client
            .post(format!("{}/api/generate", self.config.endpoint))
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(self.handle_error_response(response).await);
        }

        let mut chunk_index = 0;
        let stream = response
            .bytes_stream()
            .map(move |chunk_result| {
                let chunk = chunk_result?;

                let ollama_chunk: OllamaGenerateResponse =
                    serde_json::from_slice(&chunk).map_err(|e| {
                        ModelError::ParseError {
                            message: format!("Failed to parse stream chunk: {}", e),
                            raw_response: None,
                        }
                    })?;

                let current_index = chunk_index;
                chunk_index += 1;

                if ollama_chunk.done {
                    Ok(StreamChunk {
                        delta: String::new(),
                        model: ollama_chunk.model.clone(),
                        finish_reason: Some(FinishReason::Stop),
                        usage: Some(TokenUsage {
                            input_tokens: ollama_chunk.prompt_eval_count.unwrap_or(0),
                            output_tokens: ollama_chunk.eval_count.unwrap_or(0),
                            total_tokens: ollama_chunk.prompt_eval_count.unwrap_or(0)
                                + ollama_chunk.eval_count.unwrap_or(0),
                        }),
                        index: current_index,
                    })
                } else {
                    Ok(StreamChunk {
                        delta: ollama_chunk.response,
                        model: ollama_chunk.model.clone(),
                        finish_reason: None,
                        usage: None,
                        index: current_index,
                    })
                }
            });

        Ok(Box::pin(stream))
    }

    async fn model_info(&self, model: &str) -> ModelResult<ModelInfo> {
        debug!(provider = "ollama", model = model, "Fetching model info");

        // First check if model exists in list
        let models = self.list_models().await?;
        models
            .into_iter()
            .find(|m| m.name == model)
            .ok_or_else(|| ModelError::ModelNotFound {
                provider: "ollama".to_string(),
                model: model.to_string(),
            })
    }

    async fn calculate_cost(
        &self,
        _model: &str,
        _input_tokens: usize,
        _output_tokens: usize,
    ) -> ModelResult<f64> {
        // Ollama is free for local inference
        Ok(0.0)
    }

    async fn health_check(&self) -> ModelResult<ProviderHealth> {
        debug!(provider = "ollama", "Performing health check");

        let start = Instant::now();

        let models_result = self.list_models().await;
        let latency_ms = start.elapsed().as_millis() as u64;

        match models_result {
            Ok(models) => {
                let mut details = HashMap::new();
                details.insert("endpoint".to_string(), serde_json::json!(self.config.endpoint));
                details.insert("model_count".to_string(), serde_json::json!(models.len()));

                Ok(ProviderHealth {
                    status: HealthStatus::Healthy,
                    provider: "ollama".to_string(),
                    latency_ms,
                    models_available: models.len(),
                    error: None,
                    details,
                })
            }
            Err(err) => {
                let mut details = HashMap::new();
                details.insert("endpoint".to_string(), serde_json::json!(self.config.endpoint));
                details.insert("error_details".to_string(), serde_json::json!(err.to_string()));

                Ok(ProviderHealth {
                    status: HealthStatus::Unhealthy,
                    provider: "ollama".to_string(),
                    latency_ms,
                    models_available: 0,
                    error: Some(err.to_string()),
                    details,
                })
            }
        }
    }

    async fn estimate_tokens(&self, text: &str, _model: Option<&str>) -> ModelResult<usize> {
        // Simple estimation: ~4 characters per token (rough average for English)
        Ok((text.len() as f64 / 4.0).ceil() as usize)
    }

    async fn is_model_available(&self, model: &str) -> ModelResult<bool> {
        let models = self.list_models().await?;
        Ok(models.iter().any(|m| m.name == model))
    }

    async fn validate_options(
        &self,
        model: &str,
        options: &CompletionOptions,
    ) -> ModelResult<()> {
        // Get model info to check constraints
        let info = self.model_info(model).await?;

        // Validate max_tokens against context length (conservative check)
        let max_output = info.context_length / 2; // Reserve half for prompt
        if options.max_tokens > max_output {
            return Err(ModelError::InvalidRequest {
                message: format!(
                    "max_tokens {} exceeds model limit {} (context_length {})",
                    options.max_tokens, max_output, info.context_length
                ),
                field: Some("max_tokens".to_string()),
            });
        }

        // Validate temperature
        if options.temperature < 0.0 || options.temperature > 2.0 {
            return Err(ModelError::InvalidRequest {
                message: "temperature must be between 0.0 and 2.0".to_string(),
                field: Some("temperature".to_string()),
            });
        }

        // Validate top_p
        if options.top_p < 0.0 || options.top_p > 1.0 {
            return Err(ModelError::InvalidRequest {
                message: "top_p must be between 0.0 and 1.0".to_string(),
                field: Some("top_p".to_string()),
            });
        }

        Ok(())
    }
}

// ============================================================================
// Error Handling
// ============================================================================

impl OllamaProvider {
    /// Handle error responses from Ollama API
    async fn handle_error_response(&self, response: reqwest::Response) -> ModelError {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());

        match status {
            StatusCode::NOT_FOUND => ModelError::ModelNotFound {
                provider: "ollama".to_string(),
                model: error_text,
            },
            StatusCode::BAD_REQUEST => ModelError::InvalidRequest {
                message: error_text,
                field: None,
            },
            StatusCode::TOO_MANY_REQUESTS => ModelError::RateLimit {
                provider: "ollama".to_string(),
                retry_after_secs: None,
                message: error_text,
            },
            StatusCode::INTERNAL_SERVER_ERROR | StatusCode::BAD_GATEWAY => {
                ModelError::ProviderError {
                    provider: "ollama".to_string(),
                    code: Some(status.as_u16().to_string()),
                    message: error_text,
                }
            }
            StatusCode::SERVICE_UNAVAILABLE => ModelError::ProviderError {
                provider: "ollama".to_string(),
                code: Some("503".to_string()),
                message: "Service unavailable".to_string(),
            },
            _ => ModelError::ProviderError {
                provider: "ollama".to_string(),
                code: Some(status.as_u16().to_string()),
                message: format!("HTTP {}: {}", status, error_text),
            },
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires running Ollama instance
    async fn test_list_models() {
        let provider = OllamaProvider::new("http://localhost:11434");
        let models = provider.list_models().await.unwrap();
        assert!(!models.is_empty(), "Should have at least one model");
        println!("Available models: {:?}", models);
    }

    #[tokio::test]
    #[ignore] // Requires running Ollama instance with a model
    async fn test_completion() {
        let provider = OllamaProvider::new("http://localhost:11434");
        let options = CompletionOptions::default();

        let response = provider
            .complete("llama3", "What is 2+2?", &options)
            .await
            .unwrap();

        assert!(!response.content.is_empty());
        assert_eq!(response.model, "llama3");
        println!("Response: {}", response.content);
    }

    #[tokio::test]
    #[ignore] // Requires running Ollama instance
    async fn test_health_check() {
        let provider = OllamaProvider::new("http://localhost:11434");
        let health = provider.health_check().await.unwrap();

        assert_eq!(health.status, ProviderStatus::Healthy);
        assert!(health.latency_ms.is_some());
        println!("Health: {:?}", health);
    }

    #[test]
    fn test_config_builder() {
        let config = OllamaConfig {
            endpoint: "http://custom:11434".to_string(),
            timeout_secs: 120,
            max_retries: 5,
            ..Default::default()
        };

        let provider = OllamaProvider::with_config(config.clone());
        assert_eq!(provider.config.endpoint, "http://custom:11434");
        assert_eq!(provider.config.timeout_secs, 120);
        assert_eq!(provider.config.max_retries, 5);
    }

    #[test]
    fn test_token_estimation() {
        let provider = OllamaProvider::new("http://localhost:11434");
        let rt = tokio::runtime::Runtime::new().unwrap();

        let text = "Hello, world! This is a test.";
        let tokens = rt.block_on(provider.estimate_tokens(text, None)).unwrap();

        // ~4 chars per token, so 30 chars / 4 = 7.5 -> 8 tokens
        assert!(tokens >= 7 && tokens <= 10, "Token estimate should be reasonable");
    }
}
