// src/ai_backend.rs
// Professional Elite AI Backend Abstraction Layer
// Enables clean integration of MOE with Synthesis Orchestrator

use crate::types::{Candidate, Task};
use async_trait::async_trait;
use serde_json::json;
use std::error::Error;

/// AI Backend trait for generating candidates
/// Allows swapping between simulated, MOE, or other backends
#[async_trait]
pub trait AIBackend: Send + Sync {
    /// Generate candidates for a given task
    async fn generate_candidates(
        &self,
        task: &Task,
        route: &str,
        count: usize,
    ) -> Result<Vec<Candidate>, Box<dyn Error + Send + Sync>>;

    /// Get backend name for telemetry
    fn name(&self) -> &'static str;

    /// Check if backend is healthy
    async fn health_check(&self) -> bool;
}

/// Simulated backend for testing (original implementation)
pub struct SimulatedBackend;

#[async_trait]
impl AIBackend for SimulatedBackend {
    async fn generate_candidates(
        &self,
        _task: &Task,
        route: &str,
        count: usize,
    ) -> Result<Vec<Candidate>, Box<dyn Error + Send + Sync>> {
        let mut candidates = Vec::new();

        for i in 0..count {
            candidates.push(Candidate {
                model: format!("{}-candidate-{}", route, i),
                json: json!({
                    "task": "solution",
                    "index": i,
                    "quality": 0.8 + (i as f32 * 0.05),
                }),
                scores: crate::types::CandidateScores::default(),
                cost_usd: 0.01 * (i as f32 + 1.0),
                latency_ms: 1000 + (i * 200) as u32,
            });
        }

        Ok(candidates)
    }

    fn name(&self) -> &'static str {
        "simulated"
    }

    async fn health_check(&self) -> bool {
        true // Always healthy
    }
}

/// MOE Backend for real AI inference
/// Integrates with bizra-moe crate
pub struct MoeBackend {
    orchestrator: bizra_moe::EnsembleOrchestrator,
    /// Response cache for duplicate prompts
    cache: std::sync::Arc<tokio::sync::RwLock<std::collections::HashMap<String, CachedResponse>>>,
    /// Performance metrics
    metrics: std::sync::Arc<tokio::sync::RwLock<MoeMetrics>>,
}

/// Cached MOE response
struct CachedResponse {
    response: String,
    confidence: f32,
    timestamp: std::time::Instant,
    ttl: std::time::Duration,
}

impl CachedResponse {
    fn is_valid(&self) -> bool {
        self.timestamp.elapsed() < self.ttl
    }
}

/// MOE performance metrics
#[derive(Debug, Clone, Default)]
pub struct MoeMetrics {
    pub total_requests: usize,
    pub cache_hits: usize,
    pub cache_misses: usize,
    pub total_latency_ms: u64,
    pub successful_responses: usize,
    pub failed_responses: usize,
    pub avg_confidence: f32,
}

impl MoeMetrics {
    pub fn cache_hit_rate(&self) -> f32 {
        if self.total_requests == 0 {
            return 0.0;
        }
        self.cache_hits as f32 / self.total_requests as f32
    }

    pub fn success_rate(&self) -> f32 {
        let total = self.successful_responses + self.failed_responses;
        if total == 0 {
            return 0.0;
        }
        self.successful_responses as f32 / total as f32
    }

    pub fn avg_latency_ms(&self) -> f32 {
        if self.successful_responses == 0 {
            return 0.0;
        }
        self.total_latency_ms as f32 / self.successful_responses as f32
    }
}

impl Default for MoeBackend {
    fn default() -> Self {
        Self::new()
    }
}

impl MoeBackend {
    /// Create new MOE backend with default configuration
    pub fn new() -> Self {
        Self {
            orchestrator: bizra_moe::EnsembleOrchestrator::new(),
            cache: std::sync::Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new())),
            metrics: std::sync::Arc::new(tokio::sync::RwLock::new(MoeMetrics::default())),
        }
    }

    /// Create new MOE backend with custom configuration
    pub fn with_config(config: bizra_moe::OllamaConfig) -> Self {
        Self {
            orchestrator: bizra_moe::EnsembleOrchestrator::with_config(config),
            cache: std::sync::Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new())),
            metrics: std::sync::Arc::new(tokio::sync::RwLock::new(MoeMetrics::default())),
        }
    }

    /// Get current metrics
    pub async fn get_metrics(&self) -> MoeMetrics {
        self.metrics.read().await.clone()
    }

    /// Clear response cache
    pub async fn clear_cache(&self) {
        self.cache.write().await.clear();
    }

    /// Generate prompt from task
    fn task_to_prompt(task: &Task) -> String {
        // Convert task to natural language prompt
        let task_desc = if let Some(examples) = &task.examples {
            format!("Solve the task with examples: {:?}", examples)
        } else {
            "Complete the given task".to_string()
        };

        format!(
            "Task: {}\n\nPlease provide a solution in JSON format with the following structure:\n{{\n  \"solution\": \"your solution here\",\n  \"reasoning\": \"explanation of your approach\",\n  \"confidence\": 0.95\n}}",
            task_desc
        )
    }

    /// Check cache for existing response
    async fn check_cache(&self, prompt: &str) -> Option<CachedResponse> {
        let cache = self.cache.read().await;
        if let Some(cached) = cache.get(prompt) {
            if cached.is_valid() {
                return Some(CachedResponse {
                    response: cached.response.clone(),
                    confidence: cached.confidence,
                    timestamp: cached.timestamp,
                    ttl: cached.ttl,
                });
            }
        }
        None
    }

    /// Store response in cache
    async fn cache_response(&self, prompt: String, response: String, confidence: f32) {
        let cached = CachedResponse {
            response,
            confidence,
            timestamp: std::time::Instant::now(),
            ttl: std::time::Duration::from_secs(300), // 5 minute TTL
        };

        let mut cache = self.cache.write().await;
        cache.insert(prompt, cached);

        // Limit cache size to 1000 entries (LRU would be better)
        if cache.len() > 1000 {
            // Remove oldest entries
            let now = std::time::Instant::now();
            cache.retain(|_, v| {
                now.duration_since(v.timestamp) < std::time::Duration::from_secs(600)
            });
        }
    }

    /// Update metrics
    async fn update_metrics<F>(&self, update_fn: F)
    where
        F: FnOnce(&mut MoeMetrics),
    {
        let mut metrics = self.metrics.write().await;
        update_fn(&mut metrics);
    }
}

#[async_trait]
impl AIBackend for MoeBackend {
    async fn generate_candidates(
        &self,
        task: &Task,
        route: &str,
        count: usize,
    ) -> Result<Vec<Candidate>, Box<dyn Error + Send + Sync>> {
        let prompt = Self::task_to_prompt(task);

        // Update metrics
        self.update_metrics(|m| m.total_requests += 1).await;

        // Check cache first
        if let Some(cached) = self.check_cache(&prompt).await {
            tracing::debug!("Cache hit for prompt");
            self.update_metrics(|m| m.cache_hits += 1).await;

            // Return cached response as single candidate
            return Ok(vec![Candidate {
                model: format!("{}-moe-cached", route),
                json: serde_json::from_str(&cached.response)
                    .unwrap_or_else(|_| json!({"solution": cached.response})),
                scores: crate::types::CandidateScores {
                    accuracy: cached.confidence,
                    safety: cached.confidence,
                    efficiency: cached.confidence,
                    ihsan: cached.confidence,
                },
                cost_usd: 0.0, // Cached = free
                latency_ms: 0,
            }]);
        }

        self.update_metrics(|m| m.cache_misses += 1).await;

        let start = std::time::Instant::now();

        // Generate response using MOE
        match self.orchestrator.generate(&prompt).await {
            Ok(ensemble_response) => {
                let latency_ms = start.elapsed().as_millis() as u64;

                // Update success metrics
                self.update_metrics(|m| {
                    m.successful_responses += 1;
                    m.total_latency_ms += latency_ms;
                    m.avg_confidence = (m.avg_confidence * (m.successful_responses - 1) as f32
                        + ensemble_response.ihsan_score)
                        / m.successful_responses as f32;
                })
                .await;

                // Cache the response
                self.cache_response(
                    prompt.clone(),
                    ensemble_response.text.clone(),
                    ensemble_response.ihsan_score,
                )
                .await;

                // Convert MOE response to Candidates
                let mut candidates = Vec::new();

                // Main ensemble response as primary candidate
                let json_response =
                    serde_json::from_str(&ensemble_response.text).unwrap_or_else(|_| {
                        json!({
                            "solution": ensemble_response.text,
                            "confidence": ensemble_response.ihsan_score,
                        })
                    });

                candidates.push(Candidate {
                    model: format!("{}-moe-ensemble", route),
                    json: json_response,
                    scores: crate::types::CandidateScores {
                        accuracy: ensemble_response.ihsan_score,
                        safety: ensemble_response.ihsan_score,
                        efficiency: ensemble_response.ihsan_score * 0.95,
                        ihsan: ensemble_response.ihsan_score,
                    },
                    cost_usd: 0.001 * ensemble_response.contributors.len() as f32,
                    latency_ms: ensemble_response.total_latency_ms as u32,
                });

                // Individual model responses as additional candidates (if requested)
                if count > 1 {
                    for (_idx, contributor) in ensemble_response
                        .contributors
                        .iter()
                        .enumerate()
                        .take(count - 1)
                    {
                        let json_response =
                            serde_json::from_str(&contributor.text).unwrap_or_else(|_| {
                                json!({
                                    "solution": contributor.text.clone(),
                                    "confidence": contributor.confidence,
                                })
                            });

                        candidates.push(Candidate {
                            model: format!("{}-{}", route, contributor.model),
                            json: json_response,
                            scores: crate::types::CandidateScores {
                                accuracy: contributor.confidence,
                                safety: contributor.confidence,
                                efficiency: contributor.confidence * 0.9,
                                ihsan: contributor.confidence,
                            },
                            cost_usd: 0.001,
                            latency_ms: contributor.latency_ms as u32,
                        });
                    }
                }

                tracing::info!(
                    "MOE generated {} candidates in {}ms (Ihsan: {:.2})",
                    candidates.len(),
                    latency_ms,
                    ensemble_response.ihsan_score
                );

                Ok(candidates)
            }
            Err(e) => {
                self.update_metrics(|m| m.failed_responses += 1).await;

                tracing::error!("MOE generation failed: {}", e);
                Err(format!("MOE generation failed: {}", e).into())
            }
        }
    }

    fn name(&self) -> &'static str {
        "moe"
    }

    async fn health_check(&self) -> bool {
        // Check if any models are healthy
        let healthy_models = self.orchestrator.healthy_models().await;
        !healthy_models.is_empty()
    }
}

/// Hybrid backend that falls back from MOE to simulated
pub struct HybridBackend {
    moe: MoeBackend,
    simulated: SimulatedBackend,
}

impl HybridBackend {
    pub fn new(moe_config: bizra_moe::OllamaConfig) -> Self {
        Self {
            moe: MoeBackend::with_config(moe_config),
            simulated: SimulatedBackend,
        }
    }
}

#[async_trait]
impl AIBackend for HybridBackend {
    async fn generate_candidates(
        &self,
        task: &Task,
        route: &str,
        count: usize,
    ) -> Result<Vec<Candidate>, Box<dyn Error + Send + Sync>> {
        // Try MOE first
        match self.moe.generate_candidates(task, route, count).await {
            Ok(candidates) => {
                tracing::info!("Using MOE backend");
                Ok(candidates)
            }
            Err(e) => {
                tracing::warn!("MOE failed, falling back to simulated: {}", e);
                self.simulated.generate_candidates(task, route, count).await
            }
        }
    }

    fn name(&self) -> &'static str {
        "hybrid"
    }

    async fn health_check(&self) -> bool {
        self.moe.health_check().await || self.simulated.health_check().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_simulated_backend() {
        let backend = SimulatedBackend;
        let task = Task::example();

        let candidates = backend
            .generate_candidates(&task, "test-route", 3)
            .await
            .expect("Should generate candidates");

        assert_eq!(candidates.len(), 3);
        assert_eq!(backend.name(), "simulated");
        assert!(backend.health_check().await);
    }

    #[tokio::test]
    async fn test_moe_metrics() {
        let backend = MoeBackend::new();
        let metrics = backend.get_metrics().await;

        assert_eq!(metrics.total_requests, 0);
        assert_eq!(metrics.cache_hit_rate(), 0.0);
        assert_eq!(metrics.success_rate(), 0.0);
    }
}
