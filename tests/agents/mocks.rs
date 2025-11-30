// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - MOCK AI BACKEND                                     ║
// ║  Configurable mock for testing agent behavior                             ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use async_trait::async_trait;
use bizra_genesis_node::ai_backend::AIBackend;
use bizra_genesis_node::types::{Candidate, CandidateScores, Task};
use serde_json::json;
use std::collections::HashMap;
use std::error::Error;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;

// ═══════════════════════════════════════════════════════════════════════════
// MockAIBackend - Configurable mock for comprehensive testing
// ═══════════════════════════════════════════════════════════════════════════

/// Mock AI backend with configurable behavior for testing
pub struct MockAIBackend {
    /// Custom responses per route
    responses: RwLock<HashMap<String, MockResponse>>,
    /// Global default response
    default_response: MockResponse,
    /// Whether to simulate errors
    should_fail: bool,
    /// Error message when failing
    error_message: String,
    /// Track call counts per route
    call_counts: RwLock<HashMap<String, AtomicUsize>>,
    /// Simulate latency (milliseconds)
    simulated_latency_ms: u32,
    /// Health status
    healthy: bool,
}

/// Configurable response for mock
#[derive(Clone)]
pub struct MockResponse {
    pub json: serde_json::Value,
    pub scores: CandidateScores,
    pub latency_ms: u32,
    pub cost_usd: f32,
}

impl Default for MockResponse {
    fn default() -> Self {
        Self {
            json: json!({
                "solution": "Mock solution",
                "reasoning": "Mock reasoning from AI backend",
                "confidence": 0.92
            }),
            scores: CandidateScores {
                accuracy: 0.90,
                safety: 0.95,
                efficiency: 0.88,
                ihsan: 0.91,
            },
            latency_ms: 150,
            cost_usd: 0.002,
        }
    }
}

impl MockAIBackend {
    /// Create a new mock backend with default settings
    pub fn new() -> Self {
        Self {
            responses: RwLock::new(HashMap::new()),
            default_response: MockResponse::default(),
            should_fail: false,
            error_message: String::new(),
            call_counts: RwLock::new(HashMap::new()),
            simulated_latency_ms: 0,
            healthy: true,
        }
    }

    /// Create a mock backend that always fails
    pub fn with_error(message: &str) -> Self {
        Self {
            responses: RwLock::new(HashMap::new()),
            default_response: MockResponse::default(),
            should_fail: true,
            error_message: message.to_string(),
            call_counts: RwLock::new(HashMap::new()),
            simulated_latency_ms: 0,
            healthy: false,
        }
    }

    /// Create a mock backend with custom default response
    pub fn with_response(response: MockResponse) -> Self {
        Self {
            responses: RwLock::new(HashMap::new()),
            default_response: response,
            should_fail: false,
            error_message: String::new(),
            call_counts: RwLock::new(HashMap::new()),
            simulated_latency_ms: 0,
            healthy: true,
        }
    }

    /// Add a custom response for a specific route
    pub async fn add_route_response(&self, route: &str, response: MockResponse) {
        self.responses
            .write()
            .await
            .insert(route.to_string(), response);
    }

    /// Set simulated latency
    pub fn with_latency(mut self, latency_ms: u32) -> Self {
        self.simulated_latency_ms = latency_ms;
        self
    }

    /// Get call count for a specific route
    pub async fn get_call_count(&self, route: &str) -> usize {
        self.call_counts
            .read()
            .await
            .get(route)
            .map(|c| c.load(Ordering::SeqCst))
            .unwrap_or(0)
    }

    /// Get total call count across all routes
    pub async fn get_total_calls(&self) -> usize {
        let counts = self.call_counts.read().await;
        counts.values().map(|c| c.load(Ordering::SeqCst)).sum()
    }

    /// Reset all call counts
    pub async fn reset_counts(&self) {
        self.call_counts.write().await.clear();
    }
}

impl Default for MockAIBackend {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AIBackend for MockAIBackend {
    async fn generate_candidates(
        &self,
        _task: &Task,
        route: &str,
        count: usize,
    ) -> Result<Vec<Candidate>, Box<dyn Error + Send + Sync>> {
        // Track call count
        {
            let mut counts = self.call_counts.write().await;
            counts
                .entry(route.to_string())
                .or_insert_with(|| AtomicUsize::new(0))
                .fetch_add(1, Ordering::SeqCst);
        }

        // Simulate latency
        if self.simulated_latency_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(
                self.simulated_latency_ms as u64,
            ))
            .await;
        }

        // Return error if configured
        if self.should_fail {
            return Err(self.error_message.clone().into());
        }

        // Get response (route-specific or default)
        let response = {
            let responses = self.responses.read().await;
            responses
                .get(route)
                .cloned()
                .unwrap_or_else(|| self.default_response.clone())
        };

        // Generate candidates
        let mut candidates = Vec::with_capacity(count);
        for i in 0..count {
            candidates.push(Candidate {
                model: format!("{}-mock-{}", route, i),
                json: response.json.clone(),
                scores: CandidateScores {
                    accuracy: response.scores.accuracy - (i as f32 * 0.02),
                    safety: response.scores.safety - (i as f32 * 0.01),
                    efficiency: response.scores.efficiency - (i as f32 * 0.015),
                    ihsan: response.scores.ihsan - (i as f32 * 0.01),
                },
                cost_usd: response.cost_usd * (i as f32 + 1.0),
                latency_ms: response.latency_ms + (i as u32 * 50),
            });
        }

        Ok(candidates)
    }

    fn name(&self) -> &'static str {
        "mock"
    }

    async fn health_check(&self) -> bool {
        self.healthy
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Specialized Mock Backends for Edge Case Testing
// ═══════════════════════════════════════════════════════════════════════════

/// Mock backend that returns low-quality scores (below Ihsan threshold)
pub struct LowQualityMockBackend;

#[async_trait]
impl AIBackend for LowQualityMockBackend {
    async fn generate_candidates(
        &self,
        _task: &Task,
        route: &str,
        count: usize,
    ) -> Result<Vec<Candidate>, Box<dyn Error + Send + Sync>> {
        let mut candidates = Vec::with_capacity(count);
        for i in 0..count {
            candidates.push(Candidate {
                model: format!("{}-low-quality-{}", route, i),
                json: json!({
                    "solution": "Low quality solution",
                    "confidence": 0.4
                }),
                scores: CandidateScores {
                    accuracy: 0.40,
                    safety: 0.50,
                    efficiency: 0.35,
                    ihsan: 0.42, // Below 0.85 threshold
                },
                cost_usd: 0.001,
                latency_ms: 50,
            });
        }
        Ok(candidates)
    }

    fn name(&self) -> &'static str {
        "low-quality-mock"
    }

    async fn health_check(&self) -> bool {
        true
    }
}

/// Mock backend that times out
pub struct TimeoutMockBackend {
    timeout_ms: u64,
}

impl TimeoutMockBackend {
    pub fn new(timeout_ms: u64) -> Self {
        Self { timeout_ms }
    }
}

#[async_trait]
impl AIBackend for TimeoutMockBackend {
    async fn generate_candidates(
        &self,
        _task: &Task,
        _route: &str,
        _count: usize,
    ) -> Result<Vec<Candidate>, Box<dyn Error + Send + Sync>> {
        // Simulate long-running operation that will timeout
        tokio::time::sleep(tokio::time::Duration::from_millis(self.timeout_ms)).await;
        Err("Operation timed out".into())
    }

    fn name(&self) -> &'static str {
        "timeout-mock"
    }

    async fn health_check(&self) -> bool {
        false
    }
}

/// Mock backend that fails intermittently
pub struct FlakeyMockBackend {
    fail_rate: f32,
    counter: AtomicUsize,
}

impl FlakeyMockBackend {
    pub fn new(fail_rate: f32) -> Self {
        Self {
            fail_rate,
            counter: AtomicUsize::new(0),
        }
    }
}

#[async_trait]
impl AIBackend for FlakeyMockBackend {
    async fn generate_candidates(
        &self,
        task: &Task,
        route: &str,
        count: usize,
    ) -> Result<Vec<Candidate>, Box<dyn Error + Send + Sync>> {
        let call_num = self.counter.fetch_add(1, Ordering::SeqCst);

        // Fail based on fail_rate
        if (call_num as f32 / 100.0) % 1.0 < self.fail_rate {
            return Err(format!("Intermittent failure (call {})", call_num).into());
        }

        // Return success
        let mock = MockAIBackend::new();
        mock.generate_candidates(task, route, count).await
    }

    fn name(&self) -> &'static str {
        "flakey-mock"
    }

    async fn health_check(&self) -> bool {
        true // May or may not work
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Builder Pattern for Test Setup
// ═══════════════════════════════════════════════════════════════════════════

/// Builder for creating configured mock backends
pub struct MockBackendBuilder {
    default_response: MockResponse,
    route_responses: HashMap<String, MockResponse>,
    should_fail: bool,
    error_message: String,
    latency_ms: u32,
    healthy: bool,
}

impl MockBackendBuilder {
    pub fn new() -> Self {
        Self {
            default_response: MockResponse::default(),
            route_responses: HashMap::new(),
            should_fail: false,
            error_message: String::new(),
            latency_ms: 0,
            healthy: true,
        }
    }

    pub fn with_default_response(mut self, response: MockResponse) -> Self {
        self.default_response = response;
        self
    }

    pub fn with_route_response(mut self, route: &str, response: MockResponse) -> Self {
        self.route_responses.insert(route.to_string(), response);
        self
    }

    pub fn failing(mut self, message: &str) -> Self {
        self.should_fail = true;
        self.error_message = message.to_string();
        self.healthy = false;
        self
    }

    pub fn with_latency(mut self, latency_ms: u32) -> Self {
        self.latency_ms = latency_ms;
        self
    }

    pub fn unhealthy(mut self) -> Self {
        self.healthy = false;
        self
    }

    pub fn with_ihsan_score(mut self, score: f32) -> Self {
        self.default_response.scores.ihsan = score;
        self
    }

    pub async fn build(self) -> MockAIBackend {
        let mock = MockAIBackend {
            responses: RwLock::new(self.route_responses),
            default_response: self.default_response,
            should_fail: self.should_fail,
            error_message: self.error_message,
            call_counts: RwLock::new(HashMap::new()),
            simulated_latency_ms: self.latency_ms,
            healthy: self.healthy,
        };
        mock
    }
}

impl Default for MockBackendBuilder {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests for the Mock Infrastructure
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_backend_basic() {
        let mock = MockAIBackend::new();
        let task = Task::example();

        let candidates = mock
            .generate_candidates(&task, "test", 3)
            .await
            .expect("Should generate candidates");

        assert_eq!(candidates.len(), 3);
        assert!(mock.health_check().await);
    }

    #[tokio::test]
    async fn test_mock_backend_with_error() {
        let mock = MockAIBackend::with_error("Test failure");
        let task = Task::example();

        let result = mock.generate_candidates(&task, "test", 1).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Test failure"));
    }

    #[tokio::test]
    async fn test_mock_backend_call_tracking() {
        let mock = MockAIBackend::new();
        let task = Task::example();

        mock.generate_candidates(&task, "route-a", 1)
            .await
            .unwrap();
        mock.generate_candidates(&task, "route-a", 1)
            .await
            .unwrap();
        mock.generate_candidates(&task, "route-b", 1)
            .await
            .unwrap();

        assert_eq!(mock.get_call_count("route-a").await, 2);
        assert_eq!(mock.get_call_count("route-b").await, 1);
        assert_eq!(mock.get_total_calls().await, 3);
    }

    #[tokio::test]
    async fn test_mock_backend_custom_response() {
        let response = MockResponse {
            json: json!({"custom": "response"}),
            scores: CandidateScores {
                accuracy: 0.99,
                safety: 0.99,
                efficiency: 0.99,
                ihsan: 0.99,
            },
            latency_ms: 10,
            cost_usd: 0.001,
        };

        let mock = MockAIBackend::with_response(response);
        let task = Task::example();

        let candidates = mock.generate_candidates(&task, "test", 1).await.unwrap();

        assert_eq!(candidates[0].scores.ihsan, 0.99);
        assert_eq!(candidates[0].json["custom"], "response");
    }

    #[tokio::test]
    async fn test_low_quality_mock_backend() {
        let mock = LowQualityMockBackend;
        let task = Task::example();

        let candidates = mock.generate_candidates(&task, "test", 1).await.unwrap();

        assert!(candidates[0].scores.ihsan < 0.85); // Below threshold
    }

    #[tokio::test]
    async fn test_mock_backend_builder() {
        let mock = MockBackendBuilder::new()
            .with_ihsan_score(0.95)
            .with_latency(100)
            .build()
            .await;

        let task = Task::example();
        let candidates = mock.generate_candidates(&task, "test", 1).await.unwrap();

        assert_eq!(candidates[0].scores.ihsan, 0.95);
    }

    #[tokio::test]
    async fn test_mock_backend_builder_failing() {
        let mock = MockBackendBuilder::new()
            .failing("Builder configured failure")
            .build()
            .await;

        let task = Task::example();
        let result = mock.generate_candidates(&task, "test", 1).await;

        assert!(result.is_err());
        assert!(!mock.health_check().await);
    }

    #[tokio::test]
    async fn test_mock_backend_route_specific_responses() {
        let mock = MockAIBackend::new();

        mock.add_route_response(
            "special-route",
            MockResponse {
                json: json!({"special": true}),
                scores: CandidateScores {
                    accuracy: 1.0,
                    safety: 1.0,
                    efficiency: 1.0,
                    ihsan: 1.0,
                },
                latency_ms: 5,
                cost_usd: 0.0001,
            },
        )
        .await;

        let task = Task::example();

        // Special route gets custom response
        let special_candidates = mock
            .generate_candidates(&task, "special-route", 1)
            .await
            .unwrap();
        assert_eq!(special_candidates[0].scores.ihsan, 1.0);

        // Other routes get default response
        let default_candidates = mock
            .generate_candidates(&task, "other-route", 1)
            .await
            .unwrap();
        assert!(default_candidates[0].scores.ihsan < 1.0);
    }
}
