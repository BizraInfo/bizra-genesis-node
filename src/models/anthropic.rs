// BIZRA Genesis Node - Professional Elite Implementation
// Anthropic Claude 3 Provider
//
// Production-grade integration with Anthropic's Claude 3 models (Opus, Sonnet, Haiku).
// Implements streaming, retry logic, cost tracking, and health monitoring.

use async_trait::async_trait;
use futures::stream::{Stream, StreamExt};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::pin::Pin;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tokio::time::sleep;
use tracing::warn;

use super::errors::{ModelError, ModelResult};
use super::traits::ModelProvider;
use super::types::{
    CompletionOptions, CompletionResponse, FinishReason, HealthStatus, ModelInfo, ProviderHealth,
    StreamChunk, TokenUsage,
};

// ============================================================================
// Configuration
// ============================================================================

/// Anthropic API configuration
#[derive(Clone, Debug)]
pub struct AnthropicConfig {
    /// Anthropic API key
    pub api_key: String,
    /// API endpoint (default: https://api.anthropic.com)
    pub endpoint: String,
    /// API version (default: 2023-06-01)
    pub api_version: String,
    /// Request timeout in seconds
    pub timeout_secs: u64,
    /// Maximum retry attempts on failure
    pub max_retries: u32,
    /// Initial backoff duration in milliseconds
    pub initial_backoff_ms: u64,
    /// Maximum backoff duration in milliseconds
    pub max_backoff_ms: u64,
}

impl AnthropicConfig {
    /// Create a new Anthropic configuration with API key
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            endpoint: "https://api.anthropic.com".to_string(),
            api_version: "2023-06-01".to_string(),
            timeout_secs: 60,
            max_retries: 3,
            initial_backoff_ms: 1000,
            max_backoff_ms: 60000,
        }
    }

    /// Set custom endpoint
    pub fn with_endpoint(mut self, endpoint: impl Into<String>) -> Self {
        self.endpoint = endpoint.into();
        self
    }

    /// Set API version
    pub fn with_version(mut self, version: impl Into<String>) -> Self {
        self.api_version = version.into();
        self
    }

    /// Set timeout
    pub fn with_timeout(mut self, timeout_secs: u64) -> Self {
        self.timeout_secs = timeout_secs;
        self
    }
}

impl Default for AnthropicConfig {
    fn default() -> Self {
        Self::new("")
    }
}

// ============================================================================
// API Request/Response Types
// ============================================================================

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_k: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop_sequences: Option<Vec<String>>,
    #[serde(default)]
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from API response deserialization
struct AnthropicResponse {
    id: String,
    #[serde(rename = "type")]
    response_type: String,
    role: String,
    content: Vec<ContentBlock>,
    model: String,
    stop_reason: Option<String>,
    usage: UsageInfo,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from API response deserialization
struct ContentBlock {
    #[serde(rename = "type")]
    block_type: String,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UsageInfo {
    input_tokens: usize,
    output_tokens: usize,
}

#[derive(Debug, Deserialize)]
struct AnthropicError {
    #[serde(rename = "type")]
    error_type: String,
    message: String,
}

#[derive(Debug, Deserialize)]
struct ErrorResponse {
    error: AnthropicError,
}

// Streaming event types
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
#[allow(dead_code)] // Variants used by serde deserialization
enum StreamEvent {
    #[serde(rename = "message_start")]
    MessageStart { message: MessageStartData },
    #[serde(rename = "content_block_start")]
    ContentBlockStart { index: usize },
    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { index: usize, delta: Delta },
    #[serde(rename = "content_block_stop")]
    ContentBlockStop { index: usize },
    #[serde(rename = "message_delta")]
    MessageDelta { delta: MessageDeltaData },
    #[serde(rename = "message_stop")]
    MessageStop,
    #[serde(rename = "ping")]
    Ping,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from streaming API response
struct MessageStartData {
    id: String,
    model: String,
    usage: UsageInfo,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from streaming API response
struct Delta {
    #[serde(rename = "type")]
    delta_type: String,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MessageDeltaData {
    stop_reason: Option<String>,
    usage: Option<UsageInfo>,
}

// ============================================================================
// Anthropic Provider
// ============================================================================

/// Anthropic Claude 3 model provider
///
/// # Example
///
/// ```rust,no_run
/// use bizra_genesis_node::models::{AnthropicProvider, AnthropicConfig, ModelProvider};
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let config = AnthropicConfig::new("sk-ant-...");
///     let provider = AnthropicProvider::new(config);
///
///     let models = provider.list_models().await?;
///     println!("Available models: {}", models.len());
///
///     let response = provider.complete(
///         "claude-3-opus-20240229",
///         "What is the capital of France?",
///         &Default::default()
///     ).await?;
///     println!("Response: {}", response.content);
///
///     Ok(())
/// }
/// ```
pub struct AnthropicProvider {
    config: AnthropicConfig,
    client: Client,
}

impl AnthropicProvider {
    /// Create a new Anthropic provider
    pub fn new(config: AnthropicConfig) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout_secs))
            .build()
            .unwrap();

        Self { config, client }
    }

    /// Create provider from API key
    pub fn from_api_key(api_key: impl Into<String>) -> Self {
        Self::new(AnthropicConfig::new(api_key))
    }

    /// Execute request with retry logic
    async fn execute_with_retry<F, Fut, T>(&self, operation: F) -> ModelResult<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = ModelResult<T>>,
    {
        let mut last_error_msg = None;

        for attempt in 0..self.config.max_retries {
            match operation().await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    // Only retry on retryable errors
                    if !e.is_retryable() {
                        return Err(e);
                    }

                    last_error_msg = Some(format!("{}", e));

                    if attempt < self.config.max_retries - 1 {
                        let backoff = self.calculate_backoff(attempt);
                        warn!(
                            attempt = attempt + 1,
                            backoff_ms = backoff.as_millis(),
                            error = ?e,
                            "Retrying Anthropic request"
                        );
                        sleep(backoff).await;
                    } else {
                        // Last attempt failed, return the error
                        return Err(e);
                    }
                }
            }
        }

        // This should never be reached, but provide a fallback
        Err(ModelError::Internal {
            message: last_error_msg.unwrap_or_else(|| "All retry attempts failed".to_string()),
        })
    }

    /// Calculate exponential backoff with jitter
    fn calculate_backoff(&self, attempt: u32) -> std::time::Duration {
        let base_ms = self.config.initial_backoff_ms;
        let max_ms = self.config.max_backoff_ms;

        let exponential_ms = base_ms * 2_u64.pow(attempt);
        let capped_ms = exponential_ms.min(max_ms);

        // Add jitter (±25%)
        let jitter = (rand::random::<f64>() * 0.5 - 0.25) * capped_ms as f64;
        let final_ms = (capped_ms as f64 + jitter).max(0.0) as u64;

        std::time::Duration::from_millis(final_ms)
    }

    /// Parse Anthropic error response
    fn parse_error(&self, status: StatusCode, body: &str) -> ModelError {
        if let Ok(error_response) = serde_json::from_str::<ErrorResponse>(body) {
            let error = error_response.error;
            match status {
                StatusCode::BAD_REQUEST => ModelError::InvalidRequest {
                    message: error.message,
                    field: None,
                },
                StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => ModelError::Authentication {
                    provider: "anthropic".to_string(),
                    message: error.message,
                },
                StatusCode::TOO_MANY_REQUESTS => ModelError::RateLimit {
                    provider: "anthropic".to_string(),
                    retry_after_secs: None,
                    message: error.message,
                },
                _ => ModelError::ProviderError {
                    provider: "anthropic".to_string(),
                    code: Some(error.error_type),
                    message: error.message,
                },
            }
        } else {
            ModelError::ProviderError {
                provider: "anthropic".to_string(),
                code: Some(status.as_str().to_string()),
                message: body.to_string(),
            }
        }
    }

    /// Convert finish reason
    fn convert_finish_reason(reason: Option<String>) -> FinishReason {
        match reason.as_deref() {
            Some("end_turn") => FinishReason::Stop,
            Some("max_tokens") => FinishReason::Length,
            Some("stop_sequence") => FinishReason::Stop,
            Some(other) => FinishReason::Other(other.to_string()),
            None => FinishReason::Other("unknown".to_string()),
        }
    }

    /// Get current timestamp in milliseconds
    fn current_timestamp_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }
}

#[async_trait]
impl ModelProvider for AnthropicProvider {
    fn provider_name(&self) -> &str {
        "anthropic"
    }

    async fn complete(
        &self,
        model: &str,
        prompt: &str,
        options: &CompletionOptions,
    ) -> ModelResult<CompletionResponse> {
        let start = Instant::now();

        let request = AnthropicRequest {
            model: model.to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            max_tokens: options.max_tokens,
            temperature: if options.temperature > 0.0 {
                Some(options.temperature)
            } else {
                None
            },
            top_p: if options.top_p < 1.0 {
                Some(options.top_p)
            } else {
                None
            },
            top_k: options.top_k.map(|k| k as u32),
            stop_sequences: if options.stop_sequences.is_empty() {
                None
            } else {
                Some(options.stop_sequences.clone())
            },
            stream: false,
        };

        let operation = || async {
            let response = self
                .client
                .post(format!("{}/v1/messages", self.config.endpoint))
                .header("x-api-key", &self.config.api_key)
                .header("anthropic-version", &self.config.api_version)
                .header("content-type", "application/json")
                .json(&request)
                .send()
                .await?;

            let status = response.status();
            let body = response.text().await?;

            if !status.is_success() {
                return Err(self.parse_error(status, &body));
            }

            let anthropic_response: AnthropicResponse =
                serde_json::from_str(&body).map_err(|e| ModelError::ParseError {
                    message: format!("Failed to parse Anthropic response: {}", e),
                    raw_response: Some(body.clone()),
                })?;

            // Extract text from content blocks
            let content = anthropic_response
                .content
                .iter()
                .filter_map(|block| block.text.clone())
                .collect::<Vec<_>>()
                .join("");

            Ok(CompletionResponse {
                content,
                model: anthropic_response.model,
                provider: "anthropic".to_string(),
                finish_reason: Self::convert_finish_reason(anthropic_response.stop_reason),
                usage: TokenUsage {
                    input_tokens: anthropic_response.usage.input_tokens,
                    output_tokens: anthropic_response.usage.output_tokens,
                    total_tokens: anthropic_response.usage.input_tokens
                        + anthropic_response.usage.output_tokens,
                },
                latency_ms: start.elapsed().as_millis() as u64,
                timestamp_ms: Self::current_timestamp_ms(),
                metadata: HashMap::new(),
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
        let request = AnthropicRequest {
            model: model.to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            max_tokens: options.max_tokens,
            temperature: if options.temperature > 0.0 {
                Some(options.temperature)
            } else {
                None
            },
            top_p: if options.top_p < 1.0 {
                Some(options.top_p)
            } else {
                None
            },
            top_k: options.top_k.map(|k| k as u32),
            stop_sequences: if options.stop_sequences.is_empty() {
                None
            } else {
                Some(options.stop_sequences.clone())
            },
            stream: true,
        };

        let response = self
            .client
            .post(format!("{}/v1/messages", self.config.endpoint))
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", &self.config.api_version)
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await?;
            return Err(self.parse_error(status, &body));
        }

        let model_name = model.to_string();
        let stream = response.bytes_stream();
        let mut chunk_index = 0;

        let chunk_stream = stream.map(move |chunk_result| {
            let chunk = chunk_result?;
            let text = String::from_utf8_lossy(&chunk);

            // Parse SSE format: "event: ...\ndata: {...}\n\n"
            let mut delta = String::new();
            let mut finish_reason = None;
            let mut usage = None;

            for line in text.lines() {
                if let Some(json_str) = line.strip_prefix("data: ") {
                    if let Ok(event) = serde_json::from_str::<StreamEvent>(json_str) {
                        match event {
                            StreamEvent::ContentBlockDelta { delta: d, .. } => {
                                if let Some(text) = d.text {
                                    delta.push_str(&text);
                                }
                            }
                            StreamEvent::MessageDelta { delta: d } => {
                                finish_reason = d.stop_reason;
                                if let Some(u) = d.usage {
                                    usage = Some(TokenUsage {
                                        input_tokens: 0,
                                        output_tokens: u.output_tokens,
                                        total_tokens: u.output_tokens,
                                    });
                                }
                            }
                            StreamEvent::MessageStart { message } => {
                                usage = Some(TokenUsage {
                                    input_tokens: message.usage.input_tokens,
                                    output_tokens: 0,
                                    total_tokens: message.usage.input_tokens,
                                });
                            }
                            _ => {}
                        }
                    }
                }
            }

            let index = chunk_index;
            chunk_index += 1;

            Ok(StreamChunk {
                delta,
                model: model_name.clone(),
                finish_reason: finish_reason.map(|r| Self::convert_finish_reason(Some(r))),
                usage,
                index,
            })
        });

        Ok(Box::pin(chunk_stream))
    }

    async fn list_models(&self) -> ModelResult<Vec<ModelInfo>> {
        // Anthropic doesn't have a models endpoint yet, so we return hardcoded list
        Ok(vec![
            self.model_info("claude-3-opus-20240229").await?,
            self.model_info("claude-3-sonnet-20240229").await?,
            self.model_info("claude-3-haiku-20240307").await?,
        ])
    }

    async fn model_info(&self, model: &str) -> ModelResult<ModelInfo> {
        let (context_length, cost_input, cost_output, family, capabilities, parameters) =
            match model {
                "claude-3-opus-20240229" => (
                    200000,
                    0.015,
                    0.075,
                    Some("claude-3-opus".to_string()),
                    vec!["chat".to_string(), "reasoning".to_string()],
                    Some("Unknown".to_string()),
                ),
                "claude-3-sonnet-20240229" => (
                    200000,
                    0.003,
                    0.015,
                    Some("claude-3-sonnet".to_string()),
                    vec!["chat".to_string(), "coding".to_string()],
                    Some("Unknown".to_string()),
                ),
                "claude-3-haiku-20240307" => (
                    200000,
                    0.00025,
                    0.00125,
                    Some("claude-3-haiku".to_string()),
                    vec!["chat".to_string(), "fast".to_string()],
                    Some("Unknown".to_string()),
                ),
                _ => {
                    return Err(ModelError::ModelNotFound {
                        provider: "anthropic".to_string(),
                        model: model.to_string(),
                    })
                }
            };

        let mut metadata = HashMap::new();
        metadata.insert("supports_streaming".to_string(), "true".to_string());
        metadata.insert("max_output_tokens".to_string(), "4096".to_string());

        Ok(ModelInfo {
            name: model.to_string(),
            provider: "anthropic".to_string(),
            context_length,
            cost_per_1k_input: cost_input,
            cost_per_1k_output: cost_output,
            family,
            capabilities,
            parameters,
            metadata,
        })
    }

    async fn health_check(&self) -> ModelResult<ProviderHealth> {
        let start = Instant::now();

        // Simple health check with minimal request
        let request = AnthropicRequest {
            model: "claude-3-haiku-20240307".to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: "Hi".to_string(),
            }],
            max_tokens: 10,
            temperature: None,
            top_p: None,
            top_k: None,
            stop_sequences: None,
            stream: false,
        };

        let response = self
            .client
            .post(format!("{}/v1/messages", self.config.endpoint))
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", &self.config.api_version)
            .header("content-type", "application/json")
            .json(&request)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await;

        let latency_ms = start.elapsed().as_millis() as u64;

        match response {
            Ok(resp) if resp.status().is_success() => Ok(ProviderHealth {
                provider: "anthropic".to_string(),
                status: HealthStatus::Healthy,
                latency_ms,
                models_available: 3,
                error: None,
                details: HashMap::new(),
            }),
            Ok(resp) => {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                Ok(ProviderHealth {
                    provider: "anthropic".to_string(),
                    status: HealthStatus::Degraded,
                    latency_ms,
                    models_available: 3,
                    error: Some(format!("HTTP {}: {}", status, body)),
                    details: HashMap::new(),
                })
            }
            Err(e) => Ok(ProviderHealth {
                provider: "anthropic".to_string(),
                status: HealthStatus::Unhealthy,
                latency_ms: 0,
                models_available: 0,
                error: Some(e.to_string()),
                details: HashMap::new(),
            }),
        }
    }

    async fn calculate_cost(
        &self,
        model: &str,
        input_tokens: usize,
        output_tokens: usize,
    ) -> ModelResult<f64> {
        let (cost_per_1k_input, cost_per_1k_output) = match model {
            "claude-3-opus-20240229" => (0.015, 0.075),
            "claude-3-sonnet-20240229" => (0.003, 0.015),
            "claude-3-haiku-20240307" => (0.00025, 0.00125),
            _ => {
                return Err(ModelError::ModelNotFound {
                    provider: "anthropic".to_string(),
                    model: model.to_string(),
                })
            }
        };

        let input_cost = (input_tokens as f64 / 1000.0) * cost_per_1k_input;
        let output_cost = (output_tokens as f64 / 1000.0) * cost_per_1k_output;

        Ok(input_cost + output_cost)
    }

    async fn is_model_available(&self, model: &str) -> ModelResult<bool> {
        Ok(matches!(
            model,
            "claude-3-opus-20240229" | "claude-3-sonnet-20240229" | "claude-3-haiku-20240307"
        ))
    }

    async fn estimate_tokens(&self, text: &str, _model: Option<&str>) -> ModelResult<usize> {
        // Claude uses approximately 4 characters per token (rough estimate)
        Ok((text.len() as f64 / 4.0).ceil() as usize)
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_creation() {
        let config = AnthropicConfig::new("sk-ant-test");
        assert_eq!(config.api_key, "sk-ant-test");
        assert_eq!(config.endpoint, "https://api.anthropic.com");
        assert_eq!(config.api_version, "2023-06-01");
    }

    #[test]
    fn test_config_builder() {
        let config = AnthropicConfig::new("sk-ant-test")
            .with_endpoint("https://custom.endpoint.com")
            .with_version("2024-01-01")
            .with_timeout(120);

        assert_eq!(config.endpoint, "https://custom.endpoint.com");
        assert_eq!(config.api_version, "2024-01-01");
        assert_eq!(config.timeout_secs, 120);
    }

    #[tokio::test]
    async fn test_model_info() {
        let provider = AnthropicProvider::from_api_key("test-key");

        let opus_info = provider.model_info("claude-3-opus-20240229").await.unwrap();
        assert_eq!(opus_info.provider, "anthropic");
        assert_eq!(opus_info.context_length, 200000);
        assert_eq!(opus_info.cost_per_1k_input, 0.015);

        let sonnet_info = provider
            .model_info("claude-3-sonnet-20240229")
            .await
            .unwrap();
        assert_eq!(sonnet_info.cost_per_1k_input, 0.003);

        let haiku_info = provider
            .model_info("claude-3-haiku-20240307")
            .await
            .unwrap();
        assert_eq!(haiku_info.cost_per_1k_input, 0.00025);
    }

    #[tokio::test]
    async fn test_cost_calculation() {
        let provider = AnthropicProvider::from_api_key("test-key");

        // Opus: 1000 input, 500 output
        let cost = provider
            .calculate_cost("claude-3-opus-20240229", 1000, 500)
            .await
            .unwrap();
        assert_eq!(cost, 0.015 + 0.0375); // $0.0525

        // Haiku: 10000 input, 2000 output
        let cost = provider
            .calculate_cost("claude-3-haiku-20240307", 10000, 2000)
            .await
            .unwrap();
        assert_eq!(cost, 0.0025 + 0.0025); // $0.005
    }

    #[tokio::test]
    async fn test_model_availability() {
        let provider = AnthropicProvider::from_api_key("test-key");

        assert!(provider
            .is_model_available("claude-3-opus-20240229")
            .await
            .unwrap());
        assert!(provider
            .is_model_available("claude-3-sonnet-20240229")
            .await
            .unwrap());
        assert!(provider
            .is_model_available("claude-3-haiku-20240307")
            .await
            .unwrap());
        assert!(!provider
            .is_model_available("nonexistent-model")
            .await
            .unwrap());
    }

    #[tokio::test]
    async fn test_token_estimation() {
        let provider = AnthropicProvider::from_api_key("test-key");

        let text = "Hello, world!";
        let tokens = provider.estimate_tokens(text, None).await.unwrap();
        assert!(tokens > 0);
        assert!(tokens <= text.len()); // Should be fewer tokens than characters
    }

    #[test]
    fn test_provider_name() {
        let provider = AnthropicProvider::from_api_key("test-key");
        assert_eq!(provider.provider_name(), "anthropic");
    }
}
