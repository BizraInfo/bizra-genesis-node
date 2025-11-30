// BIZRA Genesis Node - Professional Elite Implementation
// OpenAI Model Provider
//
// Provides integration with OpenAI API for GPT-4, GPT-3.5 Turbo models.
// Supports streaming, rate limiting, cost tracking, and comprehensive error handling.

use async_trait::async_trait;
use futures::stream::{Stream, StreamExt};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::pin::Pin;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use tracing::{debug, error, warn};

use super::errors::{ModelError, ModelResult};
use super::traits::ModelProvider;
use super::types::{
    CompletionOptions, CompletionResponse, FinishReason, HealthStatus, ModelInfo, ProviderHealth,
    StreamChunk, TokenUsage,
};

// ============================================================================
// OpenAI API Types
// ============================================================================

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    frequency_penalty: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    presence_penalty: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop: Option<Vec<String>>,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from API response deserialization
struct OpenAIResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<OpenAIChoice>,
    usage: OpenAIUsage,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from API response deserialization
struct OpenAIChoice {
    index: usize,
    message: OpenAIMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: usize,
    completion_tokens: usize,
    total_tokens: usize,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from streaming API response
struct OpenAIStreamResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<OpenAIStreamChoice>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from streaming API response
struct OpenAIStreamChoice {
    index: usize,
    delta: OpenAIDelta,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from streaming API response
struct OpenAIDelta {
    #[serde(default)]
    role: Option<String>,
    #[serde(default)]
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIErrorResponse {
    error: OpenAIErrorDetail,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from API error response
struct OpenAIErrorDetail {
    message: String,
    #[serde(rename = "type")]
    error_type: String,
    #[serde(default)]
    code: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIModelsResponse {
    data: Vec<OpenAIModelData>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields populated from models list API response
struct OpenAIModelData {
    id: String,
    object: String,
    created: u64,
    owned_by: String,
}

// ============================================================================
// OpenAI Provider Configuration
// ============================================================================

#[derive(Debug, Clone)]
pub struct OpenAIConfig {
    /// API key for authentication
    pub api_key: String,
    /// Organization ID (optional)
    pub organization: Option<String>,
    /// API endpoint (default: https://api.openai.com/v1)
    pub endpoint: String,
    /// Request timeout in seconds (default: 30)
    pub timeout_secs: u64,
    /// Maximum retry attempts (default: 3)
    pub max_retries: u32,
    /// Initial backoff in milliseconds (default: 1000)
    pub initial_backoff_ms: u64,
    /// Maximum backoff in milliseconds (default: 60000)
    pub max_backoff_ms: u64,
}

impl OpenAIConfig {
    /// Create a new OpenAI configuration with API key
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            organization: None,
            endpoint: "https://api.openai.com/v1".to_string(),
            timeout_secs: 30,
            max_retries: 3,
            initial_backoff_ms: 1000,
            max_backoff_ms: 60000,
        }
    }

    /// Set organization ID
    pub fn with_organization(mut self, org_id: impl Into<String>) -> Self {
        self.organization = Some(org_id.into());
        self
    }

    /// Set custom endpoint (e.g., for Azure OpenAI)
    pub fn with_endpoint(mut self, endpoint: impl Into<String>) -> Self {
        self.endpoint = endpoint.into();
        self
    }
}

// ============================================================================
// Model Pricing (as of 2025-01)
// ============================================================================

fn get_model_pricing(model: &str) -> (f64, f64) {
    // Returns (input_cost_per_1k, output_cost_per_1k) in USD
    match model {
        // GPT-4 Turbo
        "gpt-4-turbo-preview" | "gpt-4-0125-preview" | "gpt-4-1106-preview" => (0.01, 0.03),
        "gpt-4-turbo" | "gpt-4-turbo-2024-04-09" => (0.01, 0.03),

        // GPT-4
        "gpt-4" | "gpt-4-0613" => (0.03, 0.06),
        "gpt-4-32k" | "gpt-4-32k-0613" => (0.06, 0.12),

        // GPT-3.5 Turbo
        "gpt-3.5-turbo" | "gpt-3.5-turbo-0125" => (0.0005, 0.0015),
        "gpt-3.5-turbo-1106" => (0.001, 0.002),
        "gpt-3.5-turbo-16k" => (0.003, 0.004),

        // Default (conservative estimate)
        _ => (0.01, 0.03),
    }
}

fn get_model_context_length(model: &str) -> usize {
    match model {
        // GPT-4 Turbo (128K context)
        "gpt-4-turbo-preview" | "gpt-4-0125-preview" | "gpt-4-1106-preview" => 128000,
        "gpt-4-turbo" | "gpt-4-turbo-2024-04-09" => 128000,

        // GPT-4 (8K context)
        "gpt-4" | "gpt-4-0613" => 8192,

        // GPT-4 32K
        "gpt-4-32k" | "gpt-4-32k-0613" => 32768,

        // GPT-3.5 Turbo (16K context)
        "gpt-3.5-turbo" | "gpt-3.5-turbo-0125" | "gpt-3.5-turbo-1106" => 16385,
        "gpt-3.5-turbo-16k" => 16385,

        // Default
        _ => 8192,
    }
}

// ============================================================================
// OpenAI Provider Implementation
// ============================================================================

/// OpenAI model provider
///
/// Connects to OpenAI API for GPT-4 and GPT-3.5 Turbo models.
///
/// # Example
///
/// ```rust,no_run
/// use bizra_genesis_node::models::{OpenAIProvider, OpenAIConfig, ModelProvider};
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let config = OpenAIConfig::new("sk-...");
///     let provider = OpenAIProvider::new(config);
///
///     // List available models
///     let models = provider.list_models().await?;
///     println!("Available models: {:?}", models);
///
///     Ok(())
/// }
/// ```
pub struct OpenAIProvider {
    config: OpenAIConfig,
    client: Client,
}

impl OpenAIProvider {
    /// Create a new OpenAI provider with configuration
    pub fn new(config: OpenAIConfig) -> Self {
        let mut headers = reqwest::header::HeaderMap::new();

        // Authorization header
        let auth_value = format!("Bearer {}", config.api_key);
        headers.insert(
            reqwest::header::AUTHORIZATION,
            reqwest::header::HeaderValue::from_str(&auth_value).expect("Invalid API key"),
        );

        // Organization header (if provided)
        if let Some(ref org) = config.organization {
            headers.insert(
                "OpenAI-Organization",
                reqwest::header::HeaderValue::from_str(org).expect("Invalid organization ID"),
            );
        }

        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_secs))
            .default_headers(headers)
            .build()
            .expect("Failed to create HTTP client");

        Self { config, client }
    }

    /// Create from API key (convenience method)
    pub fn from_api_key(api_key: impl Into<String>) -> Self {
        Self::new(OpenAIConfig::new(api_key))
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
                        provider = "openai",
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
                        provider = "openai",
                        attempts = attempts,
                        error = ?err,
                        "Request failed permanently"
                    );
                    return Err(err);
                }
            }
        }
    }

    /// Handle error responses from OpenAI API
    async fn handle_error_response(&self, response: reqwest::Response) -> ModelError {
        let status = response.status();

        // Try to parse OpenAI error format
        if let Ok(error_response) = response.json::<OpenAIErrorResponse>().await {
            let error = error_response.error;

            return match status {
                StatusCode::UNAUTHORIZED => ModelError::Authentication {
                    provider: "openai".to_string(),
                    message: error.message,
                },
                StatusCode::TOO_MANY_REQUESTS => {
                    // Extract retry-after from headers if available
                    ModelError::RateLimit {
                        provider: "openai".to_string(),
                        retry_after_secs: None, // Could parse from headers
                        message: error.message,
                    }
                }
                StatusCode::BAD_REQUEST => ModelError::InvalidRequest {
                    message: error.message,
                    field: None,
                },
                StatusCode::NOT_FOUND => ModelError::ModelNotFound {
                    provider: "openai".to_string(),
                    model: error.message,
                },
                StatusCode::INSUFFICIENT_STORAGE => ModelError::QuotaExceeded {
                    provider: "openai".to_string(),
                    message: error.message,
                },
                _ => ModelError::ProviderError {
                    provider: "openai".to_string(),
                    code: error.code,
                    message: error.message,
                },
            };
        }

        // Fallback to generic error
        let error_text = format!("HTTP {}", status);
        ModelError::ProviderError {
            provider: "openai".to_string(),
            code: Some(status.as_u16().to_string()),
            message: error_text,
        }
    }

    /// Convert finish reason from OpenAI to our enum
    fn convert_finish_reason(reason: Option<&str>) -> FinishReason {
        match reason {
            Some("stop") => FinishReason::Stop,
            Some("length") => FinishReason::Length,
            Some("content_filter") => FinishReason::ContentFilter,
            Some("function_call") | Some("tool_calls") => FinishReason::ToolCalls,
            _ => FinishReason::Stop,
        }
    }
}

// ============================================================================
// ModelProvider Trait Implementation
// ============================================================================

#[async_trait]
impl ModelProvider for OpenAIProvider {
    fn provider_name(&self) -> &str {
        "openai"
    }

    async fn list_models(&self) -> ModelResult<Vec<ModelInfo>> {
        debug!(provider = "openai", "Fetching model list");

        let operation = || async {
            let response = self
                .client
                .get(format!("{}/models", self.config.endpoint))
                .send()
                .await?;

            if !response.status().is_success() {
                return Err(self.handle_error_response(response).await);
            }

            let models_response = response.json::<OpenAIModelsResponse>().await.map_err(|e| {
                ModelError::ParseError {
                    message: format!("Failed to parse models list: {}", e),
                    raw_response: None,
                }
            })?;

            // Filter for GPT models only
            let models: Vec<ModelInfo> = models_response
                .data
                .iter()
                .filter(|m| m.id.starts_with("gpt-"))
                .map(|m| {
                    let (input_cost, output_cost) = get_model_pricing(&m.id);
                    let context_length = get_model_context_length(&m.id);

                    let mut capabilities = vec!["chat".to_string(), "completion".to_string()];
                    if m.id.contains("gpt-4") {
                        capabilities.push("reasoning".to_string());
                    }

                    let mut metadata = HashMap::new();
                    metadata.insert("owned_by".to_string(), m.owned_by.clone());
                    metadata.insert("created".to_string(), m.created.to_string());
                    metadata.insert("supports_streaming".to_string(), "true".to_string());

                    ModelInfo {
                        name: m.id.clone(),
                        provider: "openai".to_string(),
                        context_length,
                        cost_per_1k_input: input_cost,
                        cost_per_1k_output: output_cost,
                        capabilities,
                        family: Some(if m.id.contains("gpt-4") {
                            "gpt-4".to_string()
                        } else {
                            "gpt-3.5".to_string()
                        }),
                        parameters: None, // OpenAI doesn't expose this
                        metadata,
                    }
                })
                .collect();

            Ok(models)
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
            provider = "openai",
            model = model,
            prompt_len = prompt.len(),
            "Generating completion"
        );

        let start = Instant::now();

        let operation =
            || async {
                let request_body = OpenAIRequest {
                    model: model.to_string(),
                    messages: vec![
                        OpenAIMessage {
                            role: if options.system_message.is_some() {
                                "system".to_string()
                            } else {
                                "user".to_string()
                            },
                            content: options.system_message.clone().unwrap_or_default(),
                        },
                        OpenAIMessage {
                            role: "user".to_string(),
                            content: prompt.to_string(),
                        },
                    ],
                    temperature: Some(options.temperature),
                    max_tokens: Some(options.max_tokens),
                    top_p: Some(options.top_p),
                    frequency_penalty: Some(options.frequency_penalty),
                    presence_penalty: Some(options.presence_penalty),
                    stop: if options.stop_sequences.is_empty() {
                        None
                    } else {
                        Some(options.stop_sequences.clone())
                    },
                    stream: false,
                };

                let response = self
                    .client
                    .post(format!("{}/chat/completions", self.config.endpoint))
                    .json(&request_body)
                    .send()
                    .await?;

                if !response.status().is_success() {
                    return Err(self.handle_error_response(response).await);
                }

                let openai_response = response.json::<OpenAIResponse>().await.map_err(|e| {
                    ModelError::ParseError {
                        message: format!("Failed to parse response: {}", e),
                        raw_response: None,
                    }
                })?;

                let latency_ms = start.elapsed().as_millis() as u64;

                let choice =
                    openai_response
                        .choices
                        .first()
                        .ok_or_else(|| ModelError::ProviderError {
                            provider: "openai".to_string(),
                            code: None,
                            message: "No choices returned".to_string(),
                        })?;

                let mut metadata = HashMap::new();
                metadata.insert(
                    "response_id".to_string(),
                    serde_json::json!(openai_response.id),
                );
                metadata.insert(
                    "created".to_string(),
                    serde_json::json!(openai_response.created),
                );

                Ok(CompletionResponse {
                    content: choice.message.content.clone(),
                    model: openai_response.model.clone(),
                    provider: "openai".to_string(),
                    usage: TokenUsage {
                        input_tokens: openai_response.usage.prompt_tokens,
                        output_tokens: openai_response.usage.completion_tokens,
                        total_tokens: openai_response.usage.total_tokens,
                    },
                    finish_reason: Self::convert_finish_reason(choice.finish_reason.as_deref()),
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
            provider = "openai",
            model = model,
            prompt_len = prompt.len(),
            "Generating streaming completion"
        );

        let request_body = OpenAIRequest {
            model: model.to_string(),
            messages: vec![
                OpenAIMessage {
                    role: if options.system_message.is_some() {
                        "system".to_string()
                    } else {
                        "user".to_string()
                    },
                    content: options.system_message.clone().unwrap_or_default(),
                },
                OpenAIMessage {
                    role: "user".to_string(),
                    content: prompt.to_string(),
                },
            ],
            temperature: Some(options.temperature),
            max_tokens: Some(options.max_tokens),
            top_p: Some(options.top_p),
            frequency_penalty: Some(options.frequency_penalty),
            presence_penalty: Some(options.presence_penalty),
            stop: if options.stop_sequences.is_empty() {
                None
            } else {
                Some(options.stop_sequences.clone())
            },
            stream: true,
        };

        let response = self
            .client
            .post(format!("{}/chat/completions", self.config.endpoint))
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(self.handle_error_response(response).await);
        }

        let mut chunk_index = 0;
        let stream = response
            .bytes_stream()
            .filter_map(move |chunk_result| async move {
                let chunk = match chunk_result {
                    Ok(c) => c,
                    Err(e) => return Some(Err(ModelError::from(e))),
                };

                // Parse SSE format: "data: {...}\n\n"
                let chunk_str = String::from_utf8_lossy(&chunk);

                for line in chunk_str.lines() {
                    if let Some(json_str) = line.strip_prefix("data: ") {
                        if json_str.trim() == "[DONE]" {
                            // Stream complete
                            return None;
                        }

                        match serde_json::from_str::<OpenAIStreamResponse>(json_str) {
                            Ok(stream_response) => {
                                if let Some(choice) = stream_response.choices.first() {
                                    let current_index = chunk_index;
                                    chunk_index += 1;

                                    if let Some(finish_reason) = &choice.finish_reason {
                                        // Final chunk
                                        return Some(Ok(StreamChunk {
                                            delta: String::new(),
                                            model: stream_response.model.clone(),
                                            finish_reason: Some(Self::convert_finish_reason(Some(
                                                finish_reason,
                                            ))),
                                            usage: None, // OpenAI doesn't provide usage in stream
                                            index: current_index,
                                        }));
                                    }

                                    if let Some(content) = &choice.delta.content {
                                        return Some(Ok(StreamChunk {
                                            delta: content.clone(),
                                            model: stream_response.model.clone(),
                                            finish_reason: None,
                                            usage: None,
                                            index: current_index,
                                        }));
                                    }
                                }
                            }
                            Err(e) => {
                                return Some(Err(ModelError::ParseError {
                                    message: format!("Failed to parse stream chunk: {}", e),
                                    raw_response: Some(json_str.to_string()),
                                }));
                            }
                        }
                    }
                }

                None
            });

        Ok(Box::pin(stream))
    }

    async fn model_info(&self, model: &str) -> ModelResult<ModelInfo> {
        debug!(provider = "openai", model = model, "Fetching model info");

        // For common models, return cached info
        let (input_cost, output_cost) = get_model_pricing(model);
        let context_length = get_model_context_length(model);

        let mut capabilities = vec!["chat".to_string(), "completion".to_string()];
        if model.contains("gpt-4") {
            capabilities.push("reasoning".to_string());
        }

        Ok(ModelInfo {
            name: model.to_string(),
            provider: "openai".to_string(),
            context_length,
            cost_per_1k_input: input_cost,
            cost_per_1k_output: output_cost,
            capabilities,
            family: Some(if model.contains("gpt-4") {
                "gpt-4".to_string()
            } else {
                "gpt-3.5".to_string()
            }),
            parameters: None,
            metadata: HashMap::new(),
        })
    }

    async fn calculate_cost(
        &self,
        model: &str,
        input_tokens: usize,
        output_tokens: usize,
    ) -> ModelResult<f64> {
        let (input_cost_per_1k, output_cost_per_1k) = get_model_pricing(model);

        let input_cost = (input_tokens as f64 / 1000.0) * input_cost_per_1k;
        let output_cost = (output_tokens as f64 / 1000.0) * output_cost_per_1k;

        Ok(input_cost + output_cost)
    }

    async fn health_check(&self) -> ModelResult<ProviderHealth> {
        debug!(provider = "openai", "Performing health check");

        let start = Instant::now();

        let models_result = self.list_models().await;
        let latency_ms = start.elapsed().as_millis() as u64;

        match models_result {
            Ok(models) => {
                let mut details = HashMap::new();
                details.insert(
                    "endpoint".to_string(),
                    serde_json::json!(self.config.endpoint),
                );
                details.insert("model_count".to_string(), serde_json::json!(models.len()));
                details.insert(
                    "has_org".to_string(),
                    serde_json::json!(self.config.organization.is_some()),
                );

                Ok(ProviderHealth {
                    status: HealthStatus::Healthy,
                    provider: "openai".to_string(),
                    latency_ms,
                    models_available: models.len(),
                    error: None,
                    details,
                })
            }
            Err(err) => {
                let mut details = HashMap::new();
                details.insert(
                    "endpoint".to_string(),
                    serde_json::json!(self.config.endpoint),
                );
                details.insert(
                    "error_details".to_string(),
                    serde_json::json!(err.to_string()),
                );

                Ok(ProviderHealth {
                    status: HealthStatus::Unhealthy,
                    provider: "openai".to_string(),
                    latency_ms,
                    models_available: 0,
                    error: Some(err.to_string()),
                    details,
                })
            }
        }
    }

    async fn estimate_tokens(&self, text: &str, _model: Option<&str>) -> ModelResult<usize> {
        // OpenAI's tiktoken library would be ideal, but we'll use a simple approximation
        // GPT models: ~4 characters per token (English), ~0.75 tokens per word
        let char_estimate = (text.len() as f64 / 4.0).ceil() as usize;
        let word_count = text.split_whitespace().count();
        let word_estimate = (word_count as f64 * 0.75).ceil() as usize;

        // Use the higher estimate for safety
        Ok(char_estimate.max(word_estimate))
    }

    async fn is_model_available(&self, model: &str) -> ModelResult<bool> {
        // Check against known models
        let known_models = [
            "gpt-4-turbo-preview",
            "gpt-4-turbo",
            "gpt-4",
            "gpt-4-32k",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k",
        ];

        Ok(known_models.iter().any(|&m| model.starts_with(m)))
    }

    async fn validate_options(&self, model: &str, options: &CompletionOptions) -> ModelResult<()> {
        let context_length = get_model_context_length(model);

        // Validate max_tokens
        if options.max_tokens > context_length {
            return Err(ModelError::InvalidRequest {
                message: format!(
                    "max_tokens {} exceeds model context length {}",
                    options.max_tokens, context_length
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

        // Validate penalties
        if options.frequency_penalty < -2.0 || options.frequency_penalty > 2.0 {
            return Err(ModelError::InvalidRequest {
                message: "frequency_penalty must be between -2.0 and 2.0".to_string(),
                field: Some("frequency_penalty".to_string()),
            });
        }

        if options.presence_penalty < -2.0 || options.presence_penalty > 2.0 {
            return Err(ModelError::InvalidRequest {
                message: "presence_penalty must be between -2.0 and 2.0".to_string(),
                field: Some("presence_penalty".to_string()),
            });
        }

        Ok(())
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pricing_lookup() {
        let (input, output) = get_model_pricing("gpt-4-turbo");
        assert_eq!(input, 0.01);
        assert_eq!(output, 0.03);

        let (input, output) = get_model_pricing("gpt-3.5-turbo");
        assert_eq!(input, 0.0005);
        assert_eq!(output, 0.0015);
    }

    #[test]
    fn test_context_length() {
        assert_eq!(get_model_context_length("gpt-4-turbo"), 128000);
        assert_eq!(get_model_context_length("gpt-4"), 8192);
        assert_eq!(get_model_context_length("gpt-3.5-turbo"), 16385);
    }

    #[test]
    fn test_config_builder() {
        let config = OpenAIConfig::new("test-key")
            .with_organization("org-123")
            .with_endpoint("https://custom.api.com");

        assert_eq!(config.api_key, "test-key");
        assert_eq!(config.organization, Some("org-123".to_string()));
        assert_eq!(config.endpoint, "https://custom.api.com");
    }

    #[tokio::test]
    #[ignore] // Requires valid API key
    async fn test_health_check() {
        let api_key = std::env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY not set");
        let provider = OpenAIProvider::from_api_key(api_key);

        let health = provider.health_check().await.unwrap();
        assert_eq!(health.status, HealthStatus::Healthy);
        println!("Health: {:?}", health);
    }

    #[tokio::test]
    #[ignore] // Requires valid API key
    async fn test_completion() {
        let api_key = std::env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY not set");
        let provider = OpenAIProvider::from_api_key(api_key);
        let options = CompletionOptions::default();

        let response = provider
            .complete("gpt-3.5-turbo", "What is 2+2?", &options)
            .await
            .unwrap();

        assert!(!response.content.is_empty());
        println!("Response: {}", response.content);
        println!(
            "Cost: ${:.6}",
            provider
                .calculate_cost(
                    "gpt-3.5-turbo",
                    response.usage.input_tokens,
                    response.usage.output_tokens
                )
                .await
                .unwrap()
        );
    }
}
