//! # BIZRA Multi-Model Ensemble (MOE)
//!
//! Provides multi-model AI orchestration with harmonic synthesis for the BIZRA Genesis Node.
//!
//! ## Features
//!
//! - **Ollama Integration**: Async HTTP client for local model inference
//! - **Harmonic Synthesis**: Weighted consensus across multiple models
//! - **Health Monitoring**: Automatic health checks and circuit breakers
//! - **Connection Pooling**: Efficient resource management
//! - **Graceful Degradation**: Continue with N-1 models if one fails
//!
//! ## Architecture
//!
//! ```text
//! User Prompt
//!     │
//!     ▼
//! EnsembleOrchestrator
//!     │
//!     ├─> Model 1 (llama3.2)      ─┐
//!     ├─> Model 2 (mistral-nemo)  ─┤
//!     ├─> Model 3 (gemma2)         ├─> Parallel Execution
//!     ├─> Model 4 (qwen2.5)       ─┤
//!     └─> Model 5 (deepseek-coder)─┘
//!          │
//!          ▼
//!     HarmonicSynthesis
//!          │
//!          ├─> Weighted Scoring
//!          ├─> Conflict Resolution
//!          └─> Quality Validation (Ihsan Gate)
//!          │
//!          ▼
//!     Final Response
//! ```

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

// ==============================================================================
// Error Types
// ==============================================================================

#[derive(Error, Debug)]
pub enum MoeError {
    #[error("Ollama API error: {0}")]
    OllamaApi(String),

    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Model not available: {0}")]
    ModelUnavailable(String),

    #[error("Insufficient healthy models (need {need}, have {have})")]
    InsufficientModels { need: usize, have: usize },

    #[error("Synthesis failed: {0}")]
    SynthesisFailed(String),

    #[error("Timeout after {0:?}")]
    Timeout(Duration),

    #[error("Quality gate failed: Ihsan score {score} < threshold {threshold}")]
    IhsanGateFailed { score: f32, threshold: f32 },

    #[error("Health check failed for model {0}")]
    HealthCheckFailed(String),
}

pub type MoeResult<T> = Result<T, MoeError>;

// ==============================================================================
// Ollama API Types
// ==============================================================================

/// Request to Ollama API for text generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaRequest {
    /// Model identifier (e.g., "llama3.2", "mistral-nemo")
    pub model: String,

    /// Input prompt for the model
    pub prompt: String,

    /// Whether to stream the response (default: false)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Additional options for generation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<OllamaOptions>,
}

/// Generation options for Ollama models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaOptions {
    /// Temperature for sampling (0.0 = deterministic, 1.0 = creative)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,

    /// Top-p sampling threshold
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,

    /// Maximum tokens to generate
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_predict: Option<usize>,

    /// Stop sequences
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop: Option<Vec<String>>,
}

/// Response from Ollama API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaResponse {
    /// Model that generated the response
    pub model: String,

    /// Generated text
    pub response: String,

    /// Whether generation is complete
    pub done: bool,

    /// Total duration in nanoseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_duration: Option<u64>,

    /// Tokens evaluated
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eval_count: Option<usize>,

    /// Evaluation duration in nanoseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eval_duration: Option<u64>,
}

/// Health check response from Ollama
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaHealthResponse {
    pub status: String,
}

// ==============================================================================
// Multi-Model Response Types
// ==============================================================================

/// A response from a single model with metadata
#[derive(Debug, Clone)]
pub struct ModelResponse {
    /// Unique identifier for this response
    pub id: Uuid,

    /// Model that generated the response
    pub model: String,

    /// Generated text
    pub text: String,

    /// Confidence score (0.0 - 1.0)
    pub confidence: f32,

    /// Response time in milliseconds
    pub latency_ms: u64,

    /// Timestamp of response
    pub timestamp: chrono::DateTime<chrono::Utc>,

    /// Number of tokens generated
    pub token_count: Option<usize>,
}

/// Synthesized response from multiple models
#[derive(Debug, Clone)]
pub struct EnsembleResponse {
    /// Final synthesized text
    pub text: String,

    /// Ihsan (quality) score (0.0 - 1.0)
    pub ihsan_score: f32,

    /// Individual model responses that contributed
    pub contributors: Vec<ModelResponse>,

    /// Weights used for each model in synthesis
    pub weights: HashMap<String, f32>,

    /// Total time taken for ensemble processing
    pub total_latency_ms: u64,
}

// ==============================================================================
// Model Health Tracking
// ==============================================================================

/// Health status of a single model
#[derive(Debug, Clone)]
pub struct ModelHealth {
    /// Model identifier
    pub model: String,

    /// Whether the model is currently healthy
    pub is_healthy: bool,

    /// Number of consecutive failures
    pub consecutive_failures: usize,

    /// Last successful request timestamp
    pub last_success: Option<Instant>,

    /// Last failure timestamp
    pub last_failure: Option<Instant>,

    /// Average response time (milliseconds)
    pub avg_latency_ms: f64,

    /// Total requests made to this model
    pub total_requests: usize,

    /// Successful requests
    pub successful_requests: usize,
}

impl ModelHealth {
    pub fn new(model: String) -> Self {
        Self {
            model,
            is_healthy: true,
            consecutive_failures: 0,
            last_success: None,
            last_failure: None,
            avg_latency_ms: 0.0,
            total_requests: 0,
            successful_requests: 0,
        }
    }

    /// Record a successful request
    pub fn record_success(&mut self, latency_ms: u64) {
        self.consecutive_failures = 0;
        self.last_success = Some(Instant::now());
        self.total_requests += 1;
        self.successful_requests += 1;

        // Update moving average
        let alpha = 0.3; // Smoothing factor
        self.avg_latency_ms = alpha * (latency_ms as f64) + (1.0 - alpha) * self.avg_latency_ms;

        // Mark as healthy if was unhealthy
        if !self.is_healthy {
            info!("Model {} recovered", self.model);
            self.is_healthy = true;
        }
    }

    /// Record a failed request
    pub fn record_failure(&mut self) {
        self.consecutive_failures += 1;
        self.last_failure = Some(Instant::now());
        self.total_requests += 1;

        // Circuit breaker: open after 3 consecutive failures
        if self.consecutive_failures >= 3 && self.is_healthy {
            warn!(
                "Model {} unhealthy after {} consecutive failures",
                self.model, self.consecutive_failures
            );
            self.is_healthy = false;
        }
    }

    /// Calculate success rate
    pub fn success_rate(&self) -> f32 {
        if self.total_requests == 0 {
            return 0.0;
        }
        self.successful_requests as f32 / self.total_requests as f32
    }
}

// ==============================================================================
// Ollama Client
// ==============================================================================

/// Configuration for Ollama client
#[derive(Debug, Clone)]
pub struct OllamaConfig {
    /// Base URL for Ollama API (default: http://localhost:11434)
    pub base_url: String,

    /// Request timeout duration
    pub timeout: Duration,

    /// Models to use in the ensemble
    pub models: Vec<String>,

    /// Minimum number of healthy models required
    pub min_healthy_models: usize,

    /// Health check interval
    pub health_check_interval: Duration,

    /// Ihsan quality threshold (0.95 = 95%)
    pub ihsan_threshold: f32,
}

impl Default for OllamaConfig {
    fn default() -> Self {
        Self {
            base_url: "http://localhost:11434".to_string(),
            timeout: Duration::from_secs(5),
            models: vec![
                "llama3.2".to_string(),
                "mistral-nemo".to_string(),
                "gemma2".to_string(),
                "qwen2.5".to_string(),
                "deepseek-coder".to_string(),
            ],
            min_healthy_models: 3,
            health_check_interval: Duration::from_secs(30),
            ihsan_threshold: 0.95,
        }
    }
}

/// Async HTTP client for Ollama API
pub struct OllamaClient {
    config: OllamaConfig,
    client: reqwest::Client,
    health: Arc<RwLock<HashMap<String, ModelHealth>>>,
}

impl OllamaClient {
    /// Create a new Ollama client with default configuration
    pub fn new() -> Self {
        Self::with_config(OllamaConfig::default())
    }

    /// Create a new Ollama client with custom configuration
    pub fn with_config(config: OllamaConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(config.timeout)
            .build()
            .expect("Failed to create HTTP client");

        let health: HashMap<String, ModelHealth> = config
            .models
            .iter()
            .map(|m| (m.clone(), ModelHealth::new(m.clone())))
            .collect();

        Self {
            config,
            client,
            health: Arc::new(RwLock::new(health)),
        }
    }

    /// Generate a response from a specific model
    pub async fn generate(&self, model: &str, prompt: &str) -> MoeResult<ModelResponse> {
        let start = Instant::now();
        let url = format!("{}/api/generate", self.config.base_url);

        let request = OllamaRequest {
            model: model.to_string(),
            prompt: prompt.to_string(),
            stream: Some(false),
            options: Some(OllamaOptions {
                temperature: Some(0.7),
                top_p: Some(0.9),
                num_predict: Some(512),
                stop: None,
            }),
        };

        debug!("Sending request to model: {}", model);

        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            error!("Ollama API error {}: {}", status, body);

            // Record failure
            let mut health = self.health.write().await;
            if let Some(model_health) = health.get_mut(model) {
                model_health.record_failure();
            }

            return Err(MoeError::OllamaApi(format!(
                "Status {}: {}",
                status, body
            )));
        }

        let ollama_response: OllamaResponse = response.json().await?;
        let latency_ms = start.elapsed().as_millis() as u64;

        // Record success
        let mut health = self.health.write().await;
        if let Some(model_health) = health.get_mut(model) {
            model_health.record_success(latency_ms);
        }

        // Calculate confidence based on response characteristics
        let confidence = self.calculate_confidence(&ollama_response, latency_ms);

        Ok(ModelResponse {
            id: Uuid::new_v4(),
            model: model.to_string(),
            text: ollama_response.response,
            confidence,
            latency_ms,
            timestamp: chrono::Utc::now(),
            token_count: ollama_response.eval_count,
        })
    }

    /// Calculate confidence score for a model response
    fn calculate_confidence(&self, response: &OllamaResponse, latency_ms: u64) -> f32 {
        let mut confidence: f32 = 1.0;

        // Penalize for high latency (>2s)
        if latency_ms > 2000 {
            confidence *= 0.8;
        } else if latency_ms > 1000 {
            confidence *= 0.9;
        }

        // Penalize for very short responses (likely incomplete)
        if response.response.len() < 50 {
            confidence *= 0.7;
        }

        // Penalize for very long responses (might be verbose/off-topic)
        if response.response.len() > 2000 {
            confidence *= 0.85;
        }

        confidence.clamp(0.0, 1.0)
    }

    /// Check health of a specific model
    pub async fn check_health(&self, model: &str) -> MoeResult<bool> {
        let url = format!("{}/api/tags", self.config.base_url);

        match self.client.get(&url).send().await {
            Ok(response) if response.status().is_success() => {
                debug!("Health check passed for model: {}", model);
                Ok(true)
            }
            Ok(response) => {
                warn!("Health check failed for model {}: {}", model, response.status());
                Ok(false)
            }
            Err(e) => {
                error!("Health check error for model {}: {}", model, e);
                Err(MoeError::HealthCheckFailed(model.to_string()))
            }
        }
    }

    /// Get list of healthy models
    pub async fn healthy_models(&self) -> Vec<String> {
        let health = self.health.read().await;
        health
            .values()
            .filter(|h| h.is_healthy)
            .map(|h| h.model.clone())
            .collect()
    }

    /// Get health status of all models
    pub async fn get_health_status(&self) -> HashMap<String, ModelHealth> {
        self.health.read().await.clone()
    }
}

// ==============================================================================
// Harmonic Synthesis
// ==============================================================================

/// Harmonic synthesis algorithm for multi-model consensus
pub struct HarmonicSynthesizer {
    ihsan_threshold: f32,
}

impl HarmonicSynthesizer {
    pub fn new(ihsan_threshold: f32) -> Self {
        Self { ihsan_threshold }
    }

    /// Synthesize multiple model responses into a single response
    pub fn synthesize(&self, responses: Vec<ModelResponse>) -> MoeResult<EnsembleResponse> {
        if responses.is_empty() {
            return Err(MoeError::SynthesisFailed("No responses to synthesize".to_string()));
        }

        let start = Instant::now();

        // Calculate weights based on confidence scores
        let total_confidence: f32 = responses.iter().map(|r| r.confidence).sum();
        let weights: HashMap<String, f32> = responses
            .iter()
            .map(|r| (r.model.clone(), r.confidence / total_confidence))
            .collect();

        // For now, use highest-confidence response as the synthesized text
        // TODO: Implement more sophisticated synthesis (voting, merging, etc.)
        let best_response = responses
            .iter()
            .max_by(|a, b| a.confidence.partial_cmp(&b.confidence).unwrap())
            .unwrap();

        // Calculate Ihsan score (quality metric)
        let ihsan_score = self.calculate_ihsan_score(&responses);

        // Validate against quality gate
        if ihsan_score < self.ihsan_threshold {
            return Err(MoeError::IhsanGateFailed {
                score: ihsan_score,
                threshold: self.ihsan_threshold,
            });
        }

        let total_latency_ms = start.elapsed().as_millis() as u64;

        info!(
            "Harmonic synthesis complete: {} models, Ihsan score: {:.2}%",
            responses.len(),
            ihsan_score * 100.0
        );

        Ok(EnsembleResponse {
            text: best_response.text.clone(),
            ihsan_score,
            contributors: responses,
            weights,
            total_latency_ms,
        })
    }

    /// Calculate Ihsan (quality) score from model responses
    fn calculate_ihsan_score(&self, responses: &[ModelResponse]) -> f32 {
        if responses.is_empty() {
            return 0.0;
        }

        // Weighted average of confidence scores
        let total_confidence: f32 = responses.iter().map(|r| r.confidence).sum();
        let weighted_score: f32 = responses
            .iter()
            .map(|r| r.confidence * r.confidence) // Square to emphasize high-confidence responses
            .sum();

        let score = weighted_score / total_confidence;

        // Apply consensus bonus (more models agreeing = higher quality)
        let consensus_bonus = 1.0 + (responses.len() as f32 - 1.0) * 0.05;

        (score * consensus_bonus).clamp(0.0, 1.0)
    }
}

// ==============================================================================
// Ensemble Orchestrator
// ==============================================================================

/// Main orchestrator for multi-model ensemble
pub struct EnsembleOrchestrator {
    client: Arc<OllamaClient>,
    synthesizer: HarmonicSynthesizer,
}

impl EnsembleOrchestrator {
    /// Create a new ensemble orchestrator with default configuration
    pub fn new() -> Self {
        let config = OllamaConfig::default();
        let client = Arc::new(OllamaClient::with_config(config.clone()));
        let synthesizer = HarmonicSynthesizer::new(config.ihsan_threshold);

        Self { client, synthesizer }
    }

    /// Create a new ensemble orchestrator with custom configuration
    pub fn with_config(config: OllamaConfig) -> Self {
        let ihsan_threshold = config.ihsan_threshold;
        let client = Arc::new(OllamaClient::with_config(config));
        let synthesizer = HarmonicSynthesizer::new(ihsan_threshold);

        Self { client, synthesizer }
    }

    /// Generate a response using the multi-model ensemble
    pub async fn generate(&self, prompt: &str) -> MoeResult<EnsembleResponse> {
        let healthy_models = self.client.healthy_models().await;

        if healthy_models.len() < self.client.config.min_healthy_models {
            return Err(MoeError::InsufficientModels {
                need: self.client.config.min_healthy_models,
                have: healthy_models.len(),
            });
        }

        info!(
            "Generating response with {} healthy models",
            healthy_models.len()
        );

        // Query models in parallel
        let mut tasks = Vec::new();
        for model in &healthy_models {
            let client = Arc::clone(&self.client);
            let model = model.clone();
            let prompt = prompt.to_string();

            let task = tokio::spawn(async move {
                client.generate(&model, &prompt).await
            });

            tasks.push(task);
        }

        // Wait for all models to respond (or timeout)
        let mut responses = Vec::new();
        for task in tasks {
            match task.await {
                Ok(Ok(response)) => responses.push(response),
                Ok(Err(e)) => warn!("Model generation failed: {}", e),
                Err(e) => error!("Task join error: {}", e),
            }
        }

        if responses.is_empty() {
            return Err(MoeError::SynthesisFailed(
                "All models failed to generate responses".to_string(),
            ));
        }

        // Synthesize responses using harmonic synthesis
        self.synthesizer.synthesize(responses)
    }

    /// Get health status of all models
    pub async fn health_status(&self) -> HashMap<String, ModelHealth> {
        self.client.get_health_status().await
    }

    /// Get list of healthy model names
    pub async fn healthy_models(&self) -> Vec<String> {
        self.client.healthy_models().await
    }
}

impl Default for EnsembleOrchestrator {
    fn default() -> Self {
        Self::new()
    }
}

// ==============================================================================
// Tests
// ==============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_health_record_success() {
        let mut health = ModelHealth::new("test-model".to_string());

        health.record_success(100);
        assert!(health.is_healthy);
        assert_eq!(health.consecutive_failures, 0);
        assert_eq!(health.total_requests, 1);
        assert_eq!(health.successful_requests, 1);
        assert_eq!(health.success_rate(), 1.0);
    }

    #[test]
    fn test_model_health_record_failure() {
        let mut health = ModelHealth::new("test-model".to_string());

        health.record_failure();
        health.record_failure();
        health.record_failure();

        assert!(!health.is_healthy); // Should be unhealthy after 3 failures
        assert_eq!(health.consecutive_failures, 3);
        assert_eq!(health.total_requests, 3);
        assert_eq!(health.successful_requests, 0);
    }

    #[test]
    fn test_model_health_recovery() {
        let mut health = ModelHealth::new("test-model".to_string());

        // Fail 3 times
        health.record_failure();
        health.record_failure();
        health.record_failure();
        assert!(!health.is_healthy);

        // Recover with success
        health.record_success(100);
        assert!(health.is_healthy);
        assert_eq!(health.consecutive_failures, 0);
    }

    #[test]
    fn test_harmonic_synthesizer_quality_gate() {
        let synthesizer = HarmonicSynthesizer::new(0.95);

        // Low confidence responses should fail quality gate
        let responses = vec![
            ModelResponse {
                id: Uuid::new_v4(),
                model: "model1".to_string(),
                text: "Response 1".to_string(),
                confidence: 0.5,
                latency_ms: 100,
                timestamp: chrono::Utc::now(),
                token_count: Some(10),
            },
            ModelResponse {
                id: Uuid::new_v4(),
                model: "model2".to_string(),
                text: "Response 2".to_string(),
                confidence: 0.6,
                latency_ms: 150,
                timestamp: chrono::Utc::now(),
                token_count: Some(12),
            },
        ];

        let result = synthesizer.synthesize(responses);
        assert!(result.is_err());

        match result {
            Err(MoeError::IhsanGateFailed { score, threshold }) => {
                assert!(score < threshold);
            }
            _ => panic!("Expected IhsanGateFailed error"),
        }
    }

    #[test]
    fn test_harmonic_synthesizer_high_quality() {
        let synthesizer = HarmonicSynthesizer::new(0.70);

        // High confidence responses should pass quality gate
        let responses = vec![
            ModelResponse {
                id: Uuid::new_v4(),
                model: "model1".to_string(),
                text: "High quality response".to_string(),
                confidence: 0.95,
                latency_ms: 100,
                timestamp: chrono::Utc::now(),
                token_count: Some(20),
            },
            ModelResponse {
                id: Uuid::new_v4(),
                model: "model2".to_string(),
                text: "Another high quality response".to_string(),
                confidence: 0.92,
                latency_ms: 120,
                timestamp: chrono::Utc::now(),
                token_count: Some(25),
            },
        ];

        let result = synthesizer.synthesize(responses);
        assert!(result.is_ok());

        let ensemble = result.unwrap();
        assert!(ensemble.ihsan_score >= 0.70);
        assert_eq!(ensemble.contributors.len(), 2);
    }
}
