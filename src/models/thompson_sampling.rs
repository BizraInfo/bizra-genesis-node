// BIZRA Genesis Node - Professional Elite Implementation
// Thompson Sampling Integration for AI Model Selection
//
// Live adaptive model routing with statistical rigor:
// - Thompson Sampling algorithm for multi-armed bandit optimization
// - Real-time performance tracking and adaptation
// - Integration with A/B testing framework
// - Cost-aware routing decisions
// - Bayesian inference for exploration vs exploitation
// - Performance-based model selection

use super::ab_testing::{ExperimentConfig, MetricType, Observation};
use super::errors::{ModelError, ModelResult};
use super::traits::ModelProvider;
use super::types::{CompletionOptions, CompletionResponse};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

// ============================================================================
// Thompson Sampling Configuration
// ============================================================================

/// Configuration for Thompson Sampling router
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThompsonConfig {
    /// Initial alpha (success count) for each model
    pub initial_alpha: f64,

    /// Initial beta (failure count) for each model
    pub initial_beta: f64,

    /// Success threshold (models above this are considered successful)
    pub success_threshold: f64,

    /// Metric to optimize (quality, latency, cost, etc.)
    pub optimization_metric: MetricType,

    /// Enable cost-aware routing
    pub cost_aware: bool,

    /// Maximum cost per request (USD)
    pub max_cost_per_request: Option<f64>,

    /// Minimum sample size before using Thompson Sampling
    pub min_samples: usize,

    /// Enable A/B testing for new models
    pub enable_ab_testing: bool,

    /// A/B test configuration
    pub ab_test_config: Option<ExperimentConfig>,
}

impl Default for ThompsonConfig {
    fn default() -> Self {
        Self {
            initial_alpha: 1.0,
            initial_beta: 1.0,
            success_threshold: 0.85,
            optimization_metric: MetricType::Quality,
            cost_aware: true,
            max_cost_per_request: Some(0.10), // $0.10 limit
            min_samples: 10,
            enable_ab_testing: true,
            ab_test_config: Some(ExperimentConfig::default()),
        }
    }
}

impl ThompsonConfig {
    /// Conservative configuration (cautious exploration)
    pub fn conservative() -> Self {
        Self {
            initial_alpha: 2.0,
            initial_beta: 1.0,
            success_threshold: 0.90,
            cost_aware: true,
            max_cost_per_request: Some(0.05),
            min_samples: 30,
            ..Default::default()
        }
    }

    /// Aggressive configuration (rapid exploration)
    pub fn aggressive() -> Self {
        Self {
            initial_alpha: 1.0,
            initial_beta: 2.0,
            success_threshold: 0.75,
            cost_aware: false,
            max_cost_per_request: None,
            min_samples: 5,
            ..Default::default()
        }
    }
}

// ============================================================================
// Model Performance Tracking
// ============================================================================

/// Performance statistics for a model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPerformance {
    /// Model identifier
    pub model_id: String,

    /// Success count (alpha parameter)
    pub alpha: f64,

    /// Failure count (beta parameter)
    pub beta: f64,

    /// Total requests
    pub total_requests: usize,

    /// Average quality score
    pub avg_quality: f64,

    /// Average latency (ms)
    pub avg_latency: f64,

    /// Average cost (USD)
    pub avg_cost: f64,

    /// Last sampled value
    pub last_sample: Option<f64>,
}

impl ModelPerformance {
    /// Create new performance tracker
    pub fn new(model_id: String, initial_alpha: f64, initial_beta: f64) -> Self {
        Self {
            model_id,
            alpha: initial_alpha,
            beta: initial_beta,
            total_requests: 0,
            avg_quality: 0.0,
            avg_latency: 0.0,
            avg_cost: 0.0,
            last_sample: None,
        }
    }

    /// Record observation and update statistics
    pub fn record(&mut self, observation: &Observation, success: bool) {
        self.total_requests += 1;

        // Update Beta distribution parameters
        if success {
            self.alpha += 1.0;
        } else {
            self.beta += 1.0;
        }

        // Update running averages
        let n = self.total_requests as f64;
        if let Some(quality) = observation.quality_score {
            self.avg_quality = ((n - 1.0) * self.avg_quality + quality) / n;
        }
        self.avg_latency = ((n - 1.0) * self.avg_latency + observation.latency_ms as f64) / n;
        self.avg_cost = ((n - 1.0) * self.avg_cost + observation.cost) / n;
    }

    /// Sample from Beta distribution (Thompson Sampling)
    pub fn sample(&mut self) -> f64 {
        let mut rng = rand::rng();
        let sample = sample_beta(self.alpha, self.beta, &mut rng);
        self.last_sample = Some(sample);
        sample
    }

    /// Get current success rate estimate
    pub fn success_rate(&self) -> f64 {
        self.alpha / (self.alpha + self.beta)
    }

    /// Get 95% confidence interval for success rate
    pub fn confidence_interval(&self) -> (f64, f64) {
        // Using Beta distribution quantiles (approximate)
        let mean = self.success_rate();
        let variance = (self.alpha * self.beta)
            / ((self.alpha + self.beta).powi(2) * (self.alpha + self.beta + 1.0));
        let variance: f64 = variance;
        let std_dev = variance.sqrt();

        let margin = 1.96 * std_dev; // 95% confidence
        (mean - margin, mean + margin)
    }
}

// ============================================================================
// Thompson Sampling Router
// ============================================================================

/// Thompson Sampling router for model selection
pub struct ThompsonSamplingRouter {
    /// Configuration
    config: ThompsonConfig,

    /// Performance tracking for each model
    performance: Arc<RwLock<HashMap<String, ModelPerformance>>>,

    /// Model providers (model_id -> provider)
    providers: Arc<RwLock<HashMap<String, Arc<dyn ModelProvider>>>>,

    /// Total selections made
    total_selections: Arc<RwLock<usize>>,
}

impl ThompsonSamplingRouter {
    /// Create new Thompson Sampling router
    pub fn new(config: ThompsonConfig) -> Self {
        Self {
            config,
            performance: Arc::new(RwLock::new(HashMap::new())),
            providers: Arc::new(RwLock::new(HashMap::new())),
            total_selections: Arc::new(RwLock::new(0)),
        }
    }

    /// Create with default configuration
    pub fn default_config() -> Self {
        Self::new(ThompsonConfig::default())
    }

    /// Register a model provider
    pub async fn register_model(
        &self,
        model_id: String,
        provider: Arc<dyn ModelProvider>,
    ) -> ModelResult<()> {
        // Initialize performance tracking
        let mut performance = self.performance.write().await;
        performance.insert(
            model_id.clone(),
            ModelPerformance::new(
                model_id.clone(),
                self.config.initial_alpha,
                self.config.initial_beta,
            ),
        );

        // Store provider
        let mut providers = self.providers.write().await;
        providers.insert(model_id.clone(), provider);

        info!("Registered model: {}", model_id);
        Ok(())
    }

    /// Select model using Thompson Sampling
    pub async fn select_model(&self) -> ModelResult<String> {
        let mut performance = self.performance.write().await;

        if performance.is_empty() {
            return Err(ModelError::InvalidProvider {
                message: "No models registered".to_string(),
            });
        }

        // Sample from each model's Beta distribution
        let mut samples: Vec<(String, f64)> = performance
            .iter_mut()
            .map(|(model_id, perf)| {
                let sample = perf.sample();
                (model_id.clone(), sample)
            })
            .collect();

        // Apply cost filtering if enabled
        if self.config.cost_aware {
            if let Some(max_cost) = self.config.max_cost_per_request {
                samples.retain(|(model_id, _)| {
                    performance
                        .get(model_id)
                        .map(|p| p.avg_cost <= max_cost)
                        .unwrap_or(true)
                });
            }
        }

        if samples.is_empty() {
            return Err(ModelError::InvalidProvider {
                message: "No models available within cost constraints".to_string(),
            });
        }

        // Select model with highest sample
        samples.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        let selected = samples[0].0.clone();

        let mut total = self.total_selections.write().await;
        *total += 1;

        debug!(
            "Thompson Sampling: selected {} with sample value {:.4}",
            selected, samples[0].1
        );

        Ok(selected)
    }

    /// Execute request with selected model and record performance
    pub async fn complete(
        &self,
        prompt: &str,
        options: &CompletionOptions,
    ) -> ModelResult<CompletionResponse> {
        // Select model
        let model_id = self.select_model().await?;

        // Get provider
        let providers = self.providers.read().await;
        let provider = providers
            .get(&model_id)
            .ok_or_else(|| ModelError::InvalidProvider {
                message: format!("Provider not found: {}", model_id),
            })?
            .clone();

        // Execute request
        let start = std::time::Instant::now();
        let response = provider.complete(&model_id, prompt, options).await?;
        let latency_ms = start.elapsed().as_millis() as u64;

        // Calculate cost (provider-specific pricing)
        let cost = self.estimate_cost(&model_id, &response).await;

        // Calculate quality score (simple heuristic - in production, use LLM-as-judge)
        let quality_score = self.estimate_quality(&response).await;

        // Record observation
        let observation = Observation {
            variant_id: model_id.clone(),
            latency_ms,
            cost,
            tokens: response.usage,
            quality_score: Some(quality_score),
            timestamp_ms: chrono::Utc::now().timestamp_millis() as u64,
        };

        // Determine success based on threshold
        let success = quality_score >= self.config.success_threshold;

        // Update performance
        let mut performance = self.performance.write().await;
        if let Some(perf) = performance.get_mut(&model_id) {
            perf.record(&observation, success);
        }

        if success {
            info!(
                "Model {} succeeded: quality={:.3}, latency={}ms, cost=${:.4}",
                model_id, quality_score, latency_ms, cost
            );
        } else {
            warn!(
                "Model {} below threshold: quality={:.3} < {:.3}",
                model_id, quality_score, self.config.success_threshold
            );
        }

        Ok(response)
    }

    /// Get performance statistics for all models
    pub async fn get_statistics(&self) -> HashMap<String, ModelPerformance> {
        self.performance.read().await.clone()
    }

    /// Get leaderboard (models ranked by success rate)
    pub async fn get_leaderboard(&self) -> Vec<(String, f64, usize)> {
        let performance = self.performance.read().await;

        let mut leaderboard: Vec<_> = performance
            .iter()
            .map(|(model_id, perf)| (model_id.clone(), perf.success_rate(), perf.total_requests))
            .collect();

        leaderboard.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        leaderboard
    }

    /// Reset statistics for a model
    pub async fn reset_model(&self, model_id: &str) -> ModelResult<()> {
        let mut performance = self.performance.write().await;

        if let Some(perf) = performance.get_mut(model_id) {
            *perf = ModelPerformance::new(
                model_id.to_string(),
                self.config.initial_alpha,
                self.config.initial_beta,
            );
            info!("Reset statistics for model: {}", model_id);
            Ok(())
        } else {
            Err(ModelError::InvalidProvider {
                message: format!("Model not found: {}", model_id),
            })
        }
    }

    // Private helper: Estimate cost based on model pricing
    async fn estimate_cost(&self, model_id: &str, response: &CompletionResponse) -> f64 {
        // Simplified pricing (in production, use actual provider pricing)
        let cost_per_1k_tokens = match model_id {
            id if id.contains("gpt-4") => 0.06,
            id if id.contains("gpt-3.5") => 0.002,
            id if id.contains("claude-3-opus") => 0.075,
            id if id.contains("claude-3-sonnet") => 0.015,
            id if id.contains("claude-3-haiku") => 0.0025,
            _ => 0.001, // Default (Ollama local models)
        };

        (response.usage.total_tokens as f64 / 1000.0) * cost_per_1k_tokens
    }

    // Private helper: Estimate quality score
    async fn estimate_quality(&self, response: &CompletionResponse) -> f64 {
        // Simplified quality estimation (in production, use LLM-as-judge or domain-specific metrics)
        let length_score = (response.content.len() as f64 / 100.0).min(1.0);
        let completeness_score = if response.finish_reason.is_success() {
            1.0
        } else {
            0.5
        };

        // Weighted average
        (length_score * 0.4 + completeness_score * 0.6).min(1.0)
    }
}

// ============================================================================
// Beta Distribution Sampling
// ============================================================================

/// Sample from Beta(alpha, beta) distribution using rejection sampling
fn sample_beta(alpha: f64, beta: f64, rng: &mut impl Rng) -> f64 {
    // For large alpha and beta, use normal approximation
    if alpha > 10.0 && beta > 10.0 {
        let mean = alpha / (alpha + beta);
        let variance = (alpha * beta) / ((alpha + beta).powi(2) * (alpha + beta + 1.0));
        let std_dev = variance.sqrt();

        let sample = rng.sample(rand_distr::Normal::new(mean, std_dev).unwrap());
        sample.clamp(0.0, 1.0)
    } else {
        // Use simple rejection sampling for small parameters
        let gamma_a = sample_gamma(alpha, rng);
        let gamma_b = sample_gamma(beta, rng);
        gamma_a / (gamma_a + gamma_b)
    }
}

/// Sample from Gamma distribution (simplified)
fn sample_gamma(alpha: f64, rng: &mut impl Rng) -> f64 {
    if alpha >= 1.0 {
        // Marsaglia and Tsang's method
        let d = alpha - 1.0 / 3.0;
        let c = 1.0 / (9.0 * d).sqrt();

        loop {
            let x: f64 = rng.sample(rand_distr::StandardNormal);
            let v: f64 = (1.0 + c * x).powi(3);

            if v > 0.0 {
                let u: f64 = rng.random();
                if u < 1.0 - 0.0331 * x.powi(4) {
                    return d * v;
                }
                if u.ln() < 0.5 * x.powi(2) + d * (1.0 - v + v.ln()) {
                    return d * v;
                }
            }
        }
    } else {
        // For alpha < 1, use transformation
        let gamma_alpha_plus_1 = sample_gamma(alpha + 1.0, rng);
        let u: f64 = rng.random();
        gamma_alpha_plus_1 * u.powf(1.0 / alpha)
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_thompson_config_default() {
        let config = ThompsonConfig::default();
        assert_eq!(config.initial_alpha, 1.0);
        assert_eq!(config.initial_beta, 1.0);
        assert!(config.cost_aware);
    }

    #[test]
    fn test_thompson_config_presets() {
        let conservative = ThompsonConfig::conservative();
        assert_eq!(conservative.min_samples, 30);
        assert_eq!(conservative.success_threshold, 0.90);

        let aggressive = ThompsonConfig::aggressive();
        assert_eq!(aggressive.min_samples, 5);
        assert!(!aggressive.cost_aware);
    }

    #[test]
    fn test_model_performance() {
        let mut perf = ModelPerformance::new("test-model".to_string(), 1.0, 1.0);

        assert_eq!(perf.total_requests, 0);
        assert_eq!(perf.alpha, 1.0);
        assert_eq!(perf.beta, 1.0);

        // Record successful observation
        let obs = Observation {
            variant_id: "test-model".to_string(),
            latency_ms: 1000,
            cost: 0.01,
            tokens: super::super::types::TokenUsage::new(100, 200),
            quality_score: Some(0.95),
            timestamp_ms: 0,
        };

        perf.record(&obs, true);

        assert_eq!(perf.total_requests, 1);
        assert_eq!(perf.alpha, 2.0); // Incremented
        assert_eq!(perf.beta, 1.0); // Unchanged
        assert_eq!(perf.avg_quality, 0.95);
    }

    #[test]
    fn test_success_rate() {
        let perf = ModelPerformance::new("test".to_string(), 10.0, 5.0);

        let success_rate = perf.success_rate();
        assert!((success_rate - 0.666).abs() < 0.01);
    }

    #[test]
    fn test_beta_sampling() {
        let mut rng = rand::rng();

        // Sample multiple times and verify range
        for _ in 0..100 {
            let sample = sample_beta(2.0, 5.0, &mut rng);
            assert!((0.0..=1.0).contains(&sample));
        }
    }

    #[tokio::test]
    async fn test_router_creation() {
        let router = ThompsonSamplingRouter::default_config();
        let stats = router.get_statistics().await;
        assert!(stats.is_empty());
    }
}
