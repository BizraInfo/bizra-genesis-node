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

    // =====================================================================
    // SimulatedBackend Tests
    // =====================================================================

    #[tokio::test]
    async fn test_simulated_backend_basic() {
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
    async fn test_simulated_backend_single_candidate() {
        let backend = SimulatedBackend;
        let task = Task::example();

        let candidates = backend
            .generate_candidates(&task, "route-a", 1)
            .await
            .unwrap();

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].model, "route-a-candidate-0");
    }

    #[tokio::test]
    async fn test_simulated_backend_candidate_quality_scaling() {
        let backend = SimulatedBackend;
        let task = Task::example();

        let candidates = backend
            .generate_candidates(&task, "test", 5)
            .await
            .unwrap();

        // Verify quality increases with index
        for (i, candidate) in candidates.iter().enumerate() {
            let expected_quality = 0.8 + (i as f32 * 0.05);
            assert_eq!(candidate.json["quality"], expected_quality);
        }
    }

    #[tokio::test]
    async fn test_simulated_backend_cost_scaling() {
        let backend = SimulatedBackend;
        let task = Task::example();

        let candidates = backend
            .generate_candidates(&task, "test", 3)
            .await
            .unwrap();

        assert_eq!(candidates[0].cost_usd, 0.01);
        assert_eq!(candidates[1].cost_usd, 0.02);
        assert_eq!(candidates[2].cost_usd, 0.03);
    }

    #[tokio::test]
    async fn test_simulated_backend_latency_scaling() {
        let backend = SimulatedBackend;
        let task = Task::example();

        let candidates = backend
            .generate_candidates(&task, "test", 3)
            .await
            .unwrap();

        assert_eq!(candidates[0].latency_ms, 1000);
        assert_eq!(candidates[1].latency_ms, 1200);
        assert_eq!(candidates[2].latency_ms, 1400);
    }

    #[tokio::test]
    async fn test_simulated_backend_json_structure() {
        let backend = SimulatedBackend;
        let task = Task::example();

        let candidates = backend
            .generate_candidates(&task, "test", 1)
            .await
            .unwrap();

        assert!(candidates[0].json.get("task").is_some());
        assert!(candidates[0].json.get("index").is_some());
        assert!(candidates[0].json.get("quality").is_some());
    }

    // =====================================================================
    // MoeMetrics Tests
    // =====================================================================

    #[test]
    fn test_moe_metrics_default() {
        let metrics = MoeMetrics::default();
        assert_eq!(metrics.total_requests, 0);
        assert_eq!(metrics.cache_hits, 0);
        assert_eq!(metrics.cache_misses, 0);
        assert_eq!(metrics.successful_responses, 0);
        assert_eq!(metrics.failed_responses, 0);
    }

    #[test]
    fn test_moe_metrics_cache_hit_rate_zero_requests() {
        let metrics = MoeMetrics::default();
        assert_eq!(metrics.cache_hit_rate(), 0.0);
    }

    #[test]
    fn test_moe_metrics_cache_hit_rate() {
        let metrics = MoeMetrics {
            total_requests: 10,
            cache_hits: 7,
            cache_misses: 3,
            ..Default::default()
        };
        assert_eq!(metrics.cache_hit_rate(), 0.7);
    }

    #[test]
    fn test_moe_metrics_success_rate_zero_responses() {
        let metrics = MoeMetrics::default();
        assert_eq!(metrics.success_rate(), 0.0);
    }

    #[test]
    fn test_moe_metrics_success_rate() {
        let metrics = MoeMetrics {
            successful_responses: 8,
            failed_responses: 2,
            ..Default::default()
        };
        assert_eq!(metrics.success_rate(), 0.8);
    }

    #[test]
    fn test_moe_metrics_avg_latency_zero_responses() {
        let metrics = MoeMetrics::default();
        assert_eq!(metrics.avg_latency_ms(), 0.0);
    }

    #[test]
    fn test_moe_metrics_avg_latency() {
        let metrics = MoeMetrics {
            total_latency_ms: 5000,
            successful_responses: 10,
            ..Default::default()
        };
        assert_eq!(metrics.avg_latency_ms(), 500.0);
    }

    // =====================================================================
    // CachedResponse Tests
    // =====================================================================

    #[test]
    fn test_cached_response_is_valid_fresh() {
        let cached = CachedResponse {
            response: "test".to_string(),
            confidence: 0.9,
            timestamp: std::time::Instant::now(),
            ttl: std::time::Duration::from_secs(300),
        };
        assert!(cached.is_valid());
    }

    #[test]
    fn test_cached_response_is_valid_expired() {
        let cached = CachedResponse {
            response: "test".to_string(),
            confidence: 0.9,
            timestamp: std::time::Instant::now() - std::time::Duration::from_secs(400),
            ttl: std::time::Duration::from_secs(300),
        };
        assert!(!cached.is_valid());
    }

    // =====================================================================
    // MoeBackend Tests
    // =====================================================================

    #[tokio::test]
    async fn test_moe_backend_new() {
        let backend = MoeBackend::new();
        assert_eq!(backend.name(), "moe");

        let metrics = backend.get_metrics().await;
        assert_eq!(metrics.total_requests, 0);
    }

    #[tokio::test]
    async fn test_moe_backend_with_config() {
        let config = bizra_moe::OllamaConfig::default();
        let backend = MoeBackend::with_config(config);
        assert_eq!(backend.name(), "moe");
    }

    #[tokio::test]
    async fn test_moe_backend_default() {
        let backend = MoeBackend::default();
        assert_eq!(backend.name(), "moe");
    }

    #[tokio::test]
    async fn test_moe_backend_get_metrics() {
        let backend = MoeBackend::new();
        let metrics = backend.get_metrics().await;

        assert_eq!(metrics.total_requests, 0);
        assert_eq!(metrics.cache_hits, 0);
        assert_eq!(metrics.cache_misses, 0);
    }

    #[tokio::test]
    async fn test_moe_backend_clear_cache() {
        let backend = MoeBackend::new();

        // Cache a response
        backend
            .cache_response(
                "test prompt".to_string(),
                "test response".to_string(),
                0.95,
            )
            .await;

        // Verify cached
        assert!(backend.check_cache("test prompt").await.is_some());

        // Clear cache
        backend.clear_cache().await;

        // Verify cache cleared
        assert!(backend.check_cache("test prompt").await.is_none());
    }

    #[test]
    fn test_moe_backend_task_to_prompt_with_examples() {
        let task = Task {
            examples: Some(vec![serde_json::json!({"test": "value"})]),
        };

        let prompt = MoeBackend::task_to_prompt(&task);
        assert!(prompt.contains("examples"));
        assert!(prompt.contains("JSON format"));
    }

    #[test]
    fn test_moe_backend_task_to_prompt_without_examples() {
        let task = Task { examples: None };

        let prompt = MoeBackend::task_to_prompt(&task);
        assert!(prompt.contains("Complete the given task"));
        assert!(prompt.contains("JSON format"));
    }

    #[tokio::test]
    async fn test_moe_backend_check_cache_miss() {
        let backend = MoeBackend::new();
        let result = backend.check_cache("nonexistent").await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_moe_backend_check_cache_hit() {
        let backend = MoeBackend::new();

        // Cache a response
        backend
            .cache_response("prompt1".to_string(), "response1".to_string(), 0.9)
            .await;

        // Check cache
        let result = backend.check_cache("prompt1").await;
        assert!(result.is_some());
        let cached = result.unwrap();
        assert_eq!(cached.response, "response1");
        assert_eq!(cached.confidence, 0.9);
    }

    #[tokio::test]
    async fn test_moe_backend_cache_expiration() {
        let backend = MoeBackend::new();

        // Cache with very short TTL (we'll manually create an expired entry)
        let expired_cache = CachedResponse {
            response: "old response".to_string(),
            confidence: 0.8,
            timestamp: std::time::Instant::now() - std::time::Duration::from_secs(400),
            ttl: std::time::Duration::from_secs(300),
        };

        // Manually insert expired entry
        {
            let mut cache = backend.cache.write().await;
            cache.insert("expired_prompt".to_string(), expired_cache);
        }

        // Should return None for expired entry
        let result = backend.check_cache("expired_prompt").await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_moe_backend_cache_size_limit() {
        let backend = MoeBackend::new();

        // Add many entries to trigger cleanup check
        for i in 0..1050 {
            backend
                .cache_response(format!("prompt-{}", i), format!("response-{}", i), 0.9)
                .await;
        }

        // Cache cleanup only removes entries older than 600s when size > 1000
        // Since all entries are fresh, they won't be removed
        // This test verifies cleanup logic exists (doesn't panic)
        let cache_size = backend.cache.read().await.len();
        assert!(cache_size > 0, "Cache should contain entries");

        // Verify cleanup code path was executed (size was checked)
        assert!(cache_size >= 1000, "All fresh entries should be retained");
    }

    #[tokio::test]
    async fn test_moe_backend_metrics_tracking() {
        let backend = MoeBackend::new();

        // Simulate some metrics updates
        backend.update_metrics(|m| {
            m.total_requests = 10;
            m.cache_hits = 3;
            m.cache_misses = 7;
            m.successful_responses = 8;
            m.failed_responses = 2;
            m.total_latency_ms = 4000;
            m.avg_confidence = 0.88;
        }).await;

        let metrics = backend.get_metrics().await;
        assert_eq!(metrics.total_requests, 10);
        assert_eq!(metrics.cache_hit_rate(), 0.3);
        assert_eq!(metrics.success_rate(), 0.8);
        assert_eq!(metrics.avg_latency_ms(), 500.0);
    }

    // =====================================================================
    // HybridBackend Tests
    // =====================================================================

    #[tokio::test]
    async fn test_hybrid_backend_creation() {
        let config = bizra_moe::OllamaConfig::default();
        let backend = HybridBackend::new(config);
        assert_eq!(backend.name(), "hybrid");
    }

    #[tokio::test]
    async fn test_hybrid_backend_health_check_simulated_healthy() {
        let config = bizra_moe::OllamaConfig::default();
        let backend = HybridBackend::new(config);

        // Simulated is always healthy
        let is_healthy = backend.health_check().await;
        assert!(is_healthy, "Hybrid should be healthy if simulated is healthy");
    }

    // Note: Full MOE integration tests require Ollama running
    // These are tested in integration tests when Ollama is available

    // =====================================================================
    // Integration Tests (Simulated-only)
    // =====================================================================

    #[tokio::test]
    async fn test_backend_trait_simulated() {
        let backend: Box<dyn AIBackend> = Box::new(SimulatedBackend);
        let task = Task::example();

        let candidates = backend
            .generate_candidates(&task, "test", 2)
            .await
            .unwrap();

        assert_eq!(candidates.len(), 2);
        assert!(backend.health_check().await);
    }

    #[tokio::test]
    async fn test_candidate_model_naming() {
        let backend = SimulatedBackend;
        let task = Task::example();

        let candidates = backend
            .generate_candidates(&task, "my-route", 3)
            .await
            .unwrap();

        assert!(candidates[0].model.contains("my-route"));
        assert!(candidates[1].model.contains("my-route"));
        assert!(candidates[2].model.contains("my-route"));
    }

    #[tokio::test]
    async fn test_moe_backend_clone_metrics() {
        let backend = MoeBackend::new();

        backend.update_metrics(|m| {
            m.total_requests = 5;
            m.cache_hits = 2;
        }).await;

        let metrics1 = backend.get_metrics().await;
        let metrics2 = backend.get_metrics().await;

        assert_eq!(metrics1.total_requests, metrics2.total_requests);
        assert_eq!(metrics1.cache_hits, metrics2.cache_hits);
    }

    #[test]
    fn test_moe_metrics_debug() {
        let metrics = MoeMetrics {
            total_requests: 10,
            cache_hits: 5,
            cache_misses: 5,
            total_latency_ms: 1000,
            successful_responses: 8,
            failed_responses: 2,
            avg_confidence: 0.92,
        };

        let debug_str = format!("{:?}", metrics);
        assert!(debug_str.contains("total_requests"));
        assert!(debug_str.contains("10"));
    }

    #[tokio::test]
    async fn test_concurrent_cache_access() {
        let backend = std::sync::Arc::new(MoeBackend::new());
        let mut handles = vec![];

        // Spawn 10 concurrent tasks
        for i in 0..10 {
            let backend_clone = std::sync::Arc::clone(&backend);
            let handle = tokio::spawn(async move {
                backend_clone
                    .cache_response(
                        format!("prompt-{}", i),
                        format!("response-{}", i),
                        0.9,
                    )
                    .await;
            });
            handles.push(handle);
        }

        // Wait for all tasks
        for handle in handles {
            handle.await.unwrap();
        }

        // Verify some entries exist
        let cache_size = backend.cache.read().await.len();
        assert!(cache_size > 0);
    }
}
