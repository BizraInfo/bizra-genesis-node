//! BIZRA Node0 - Production-Grade Circuit Breaker
//!
//! Implements the circuit breaker pattern with:
//! - Sliding window failure rate calculation
//! - Half-open state with probe requests
//! - Adaptive thresholds based on service behavior
//! - Comprehensive metrics and observability
//!
//! Design influenced by Netflix Hystrix and resilience4j patterns.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Circuit breaker states following standard state machine pattern
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CircuitState {
    /// Normal operation - requests flow through
    Closed,
    /// Failure threshold exceeded - requests are blocked
    Open,
    /// Testing recovery - limited requests allowed
    HalfOpen,
}

impl std::fmt::Display for CircuitState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Closed => write!(f, "CLOSED"),
            Self::Open => write!(f, "OPEN"),
            Self::HalfOpen => write!(f, "HALF-OPEN"),
        }
    }
}

/// Circuit breaker configuration with sensible defaults
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Number of calls to track in sliding window
    pub sliding_window_size: usize,
    /// Failure rate threshold (0.0 - 1.0) to open circuit
    pub failure_rate_threshold: f64,
    /// Minimum number of calls before evaluating failure rate
    pub minimum_call_count: usize,
    /// Duration to wait in open state before testing recovery
    pub wait_duration_in_open: Duration,
    /// Number of permitted calls in half-open state
    pub permitted_calls_in_half_open: usize,
    /// Success rate threshold in half-open to close circuit
    pub success_rate_threshold_in_half_open: f64,
    /// Enable adaptive thresholds based on historical performance
    pub adaptive_thresholds: bool,
    /// Slow call duration threshold
    pub slow_call_duration_threshold: Duration,
    /// Slow call rate threshold to contribute to failures
    pub slow_call_rate_threshold: f64,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            sliding_window_size: 100,
            failure_rate_threshold: 0.5,
            minimum_call_count: 10,
            wait_duration_in_open: Duration::from_secs(30),
            permitted_calls_in_half_open: 5,
            success_rate_threshold_in_half_open: 0.6,
            adaptive_thresholds: true,
            slow_call_duration_threshold: Duration::from_secs(5),
            slow_call_rate_threshold: 0.5,
        }
    }
}

/// Builder pattern for circuit breaker configuration
pub struct CircuitBreakerConfigBuilder {
    config: CircuitBreakerConfig,
}

impl CircuitBreakerConfigBuilder {
    pub fn new() -> Self {
        Self {
            config: CircuitBreakerConfig::default(),
        }
    }

    pub fn sliding_window_size(mut self, size: usize) -> Self {
        self.config.sliding_window_size = size;
        self
    }

    pub fn failure_rate_threshold(mut self, rate: f64) -> Self {
        self.config.failure_rate_threshold = rate.clamp(0.0, 1.0);
        self
    }

    pub fn minimum_call_count(mut self, count: usize) -> Self {
        self.config.minimum_call_count = count;
        self
    }

    pub fn wait_duration_in_open(mut self, duration: Duration) -> Self {
        self.config.wait_duration_in_open = duration;
        self
    }

    pub fn permitted_calls_in_half_open(mut self, count: usize) -> Self {
        self.config.permitted_calls_in_half_open = count.max(1);
        self
    }

    pub fn slow_call_threshold(mut self, duration: Duration, rate: f64) -> Self {
        self.config.slow_call_duration_threshold = duration;
        self.config.slow_call_rate_threshold = rate.clamp(0.0, 1.0);
        self
    }

    pub fn adaptive_thresholds(mut self, enabled: bool) -> Self {
        self.config.adaptive_thresholds = enabled;
        self
    }

    pub fn build(self) -> CircuitBreakerConfig {
        self.config
    }
}

impl Default for CircuitBreakerConfigBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Outcome of a recorded call
#[derive(Debug, Clone, Copy)]
enum CallOutcome {
    Success { duration: Duration },
    Failure { duration: Duration },
    Timeout,
}

/// Sliding window entry for call tracking
#[derive(Debug, Clone, Copy)]
struct WindowEntry {
    outcome: CallOutcome,
    timestamp: Instant,
}

/// Circuit breaker metrics for observability
#[derive(Debug, Default)]
pub struct CircuitBreakerMetrics {
    pub total_calls: AtomicU64,
    pub successful_calls: AtomicU64,
    pub failed_calls: AtomicU64,
    pub rejected_calls: AtomicU64,
    pub slow_calls: AtomicU64,
    pub state_transitions: AtomicU64,
    pub last_failure_time_epoch_ms: AtomicU64,
    pub last_success_time_epoch_ms: AtomicU64,
}

impl CircuitBreakerMetrics {
    /// Snapshot metrics for reporting
    pub fn snapshot(&self) -> MetricsSnapshot {
        let total = self.total_calls.load(Ordering::Relaxed);
        let success = self.successful_calls.load(Ordering::Relaxed);
        let failed = self.failed_calls.load(Ordering::Relaxed);
        let rejected = self.rejected_calls.load(Ordering::Relaxed);
        let slow = self.slow_calls.load(Ordering::Relaxed);

        MetricsSnapshot {
            total_calls: total,
            successful_calls: success,
            failed_calls: failed,
            rejected_calls: rejected,
            slow_calls: slow,
            success_rate: if total > 0 {
                success as f64 / total as f64
            } else {
                1.0
            },
            failure_rate: if total > 0 {
                failed as f64 / total as f64
            } else {
                0.0
            },
            state_transitions: self.state_transitions.load(Ordering::Relaxed),
        }
    }
}

/// Immutable snapshot of metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsSnapshot {
    pub total_calls: u64,
    pub successful_calls: u64,
    pub failed_calls: u64,
    pub rejected_calls: u64,
    pub slow_calls: u64,
    pub success_rate: f64,
    pub failure_rate: f64,
    pub state_transitions: u64,
}

/// Errors returned by circuit breaker operations
#[derive(Debug, Error)]
pub enum CircuitBreakerError {
    #[error("Circuit breaker is OPEN - service unavailable")]
    CircuitOpen { retry_after_ms: u64 },

    #[error("Half-open call limit exceeded")]
    HalfOpenLimitExceeded,

    #[error("Call execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Call timed out after {0:?}")]
    Timeout(Duration),
}

/// Internal mutable state protected by RwLock
struct CircuitBreakerState {
    current_state: CircuitState,
    sliding_window: VecDeque<WindowEntry>,
    opened_at: Option<Instant>,
    half_open_calls: usize,
    half_open_successes: usize,
    /// Adaptive threshold adjustment factor
    adaptive_factor: f64,
    /// Historical failure rates for adaptation
    historical_failure_rates: VecDeque<f64>,
}

impl CircuitBreakerState {
    fn new(window_size: usize) -> Self {
        Self {
            current_state: CircuitState::Closed,
            sliding_window: VecDeque::with_capacity(window_size),
            opened_at: None,
            half_open_calls: 0,
            half_open_successes: 0,
            adaptive_factor: 1.0,
            historical_failure_rates: VecDeque::with_capacity(10),
        }
    }
}

/// Production-grade circuit breaker with advanced features
pub struct CircuitBreaker {
    name: String,
    config: CircuitBreakerConfig,
    state: RwLock<CircuitBreakerState>,
    metrics: Arc<CircuitBreakerMetrics>,
}

impl CircuitBreaker {
    /// Create a new circuit breaker with the given name and configuration
    pub fn new(name: impl Into<String>, config: CircuitBreakerConfig) -> Self {
        let window_size = config.sliding_window_size;
        Self {
            name: name.into(),
            config,
            state: RwLock::new(CircuitBreakerState::new(window_size)),
            metrics: Arc::new(CircuitBreakerMetrics::default()),
        }
    }

    /// Create a circuit breaker with default configuration
    pub fn with_defaults(name: impl Into<String>) -> Self {
        Self::new(name, CircuitBreakerConfig::default())
    }

    /// Get the circuit breaker name
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Get current circuit state
    pub async fn state(&self) -> CircuitState {
        let state = self.state.read().await;
        state.current_state
    }

    /// Get metrics reference
    pub fn metrics(&self) -> Arc<CircuitBreakerMetrics> {
        Arc::clone(&self.metrics)
    }

    /// Check if a call is permitted (non-blocking check)
    pub async fn is_call_permitted(&self) -> bool {
        let state = self.state.read().await;
        match state.current_state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                if let Some(opened_at) = state.opened_at {
                    opened_at.elapsed() >= self.config.wait_duration_in_open
                } else {
                    false
                }
            }
            CircuitState::HalfOpen => {
                state.half_open_calls < self.config.permitted_calls_in_half_open
            }
        }
    }

    /// Acquire permission to make a call, returning an error if not permitted
    pub async fn acquire_permission(&self) -> Result<CallPermit, CircuitBreakerError> {
        let mut state = self.state.write().await;

        match state.current_state {
            CircuitState::Closed => Ok(CallPermit::new(self)),
            
            CircuitState::Open => {
                if let Some(opened_at) = state.opened_at {
                    let elapsed = opened_at.elapsed();
                    if elapsed >= self.config.wait_duration_in_open {
                        // Transition to half-open
                        state.current_state = CircuitState::HalfOpen;
                        state.half_open_calls = 1;
                        state.half_open_successes = 0;
                        self.metrics.state_transitions.fetch_add(1, Ordering::Relaxed);
                        tracing::info!(
                            "Circuit breaker '{}' transitioning OPEN -> HALF-OPEN",
                            self.name
                        );
                        Ok(CallPermit::new(self))
                    } else {
                        let remaining = self.config.wait_duration_in_open - elapsed;
                        self.metrics.rejected_calls.fetch_add(1, Ordering::Relaxed);
                        Err(CircuitBreakerError::CircuitOpen {
                            retry_after_ms: remaining.as_millis() as u64,
                        })
                    }
                } else {
                    self.metrics.rejected_calls.fetch_add(1, Ordering::Relaxed);
                    Err(CircuitBreakerError::CircuitOpen { retry_after_ms: 0 })
                }
            }
            
            CircuitState::HalfOpen => {
                if state.half_open_calls < self.config.permitted_calls_in_half_open {
                    state.half_open_calls += 1;
                    Ok(CallPermit::new(self))
                } else {
                    self.metrics.rejected_calls.fetch_add(1, Ordering::Relaxed);
                    Err(CircuitBreakerError::HalfOpenLimitExceeded)
                }
            }
        }
    }

    /// Execute a fallible operation through the circuit breaker
    pub async fn call<F, T, E>(&self, operation: F) -> Result<T, CircuitBreakerError>
    where
        F: std::future::Future<Output = Result<T, E>>,
        E: std::fmt::Display,
    {
        // Acquire permission
        let _permit = self.acquire_permission().await?;
        
        // Execute with timing
        let start = Instant::now();
        let result = operation.await;
        let duration = start.elapsed();

        // Record outcome
        match &result {
            Ok(_) => {
                self.record_success(duration).await;
            }
            Err(e) => {
                self.record_failure(duration, Some(e.to_string())).await;
                return Err(CircuitBreakerError::ExecutionFailed(e.to_string()));
            }
        }

        result.map_err(|e| CircuitBreakerError::ExecutionFailed(e.to_string()))
    }

    /// Execute with timeout
    pub async fn call_with_timeout<F, T, E>(
        &self,
        operation: F,
        timeout: Duration,
    ) -> Result<T, CircuitBreakerError>
    where
        F: std::future::Future<Output = Result<T, E>>,
        E: std::fmt::Display,
    {
        let _permit = self.acquire_permission().await?;
        let start = Instant::now();

        match tokio::time::timeout(timeout, operation).await {
            Ok(result) => {
                let duration = start.elapsed();
                match &result {
                    Ok(_) => self.record_success(duration).await,
                    Err(e) => self.record_failure(duration, Some(e.to_string())).await,
                }
                result.map_err(|e| CircuitBreakerError::ExecutionFailed(e.to_string()))
            }
            Err(_) => {
                self.record_failure(timeout, Some("timeout".to_string())).await;
                Err(CircuitBreakerError::Timeout(timeout))
            }
        }
    }

    /// Record a successful call
    pub async fn record_success(&self, duration: Duration) {
        let mut state = self.state.write().await;
        
        // Update metrics
        self.metrics.total_calls.fetch_add(1, Ordering::Relaxed);
        self.metrics.successful_calls.fetch_add(1, Ordering::Relaxed);
        self.metrics.last_success_time_epoch_ms.store(
            current_epoch_ms(),
            Ordering::Relaxed,
        );

        // Check for slow call
        let is_slow = duration >= self.config.slow_call_duration_threshold;
        if is_slow {
            self.metrics.slow_calls.fetch_add(1, Ordering::Relaxed);
        }

        // Add to sliding window
        self.add_to_window(
            &mut state,
            WindowEntry {
                outcome: CallOutcome::Success { duration },
                timestamp: Instant::now(),
            },
        );

        // Handle half-open state
        if state.current_state == CircuitState::HalfOpen {
            state.half_open_successes += 1;
            
            // Check if we can close the circuit
            if state.half_open_calls >= self.config.permitted_calls_in_half_open {
                let success_rate = state.half_open_successes as f64 / state.half_open_calls as f64;
                if success_rate >= self.config.success_rate_threshold_in_half_open {
                    self.transition_to_closed(&mut state);
                } else {
                    self.transition_to_open(&mut state);
                }
            }
        }
    }

    /// Record a failed call
    pub async fn record_failure(&self, duration: Duration, _reason: Option<String>) {
        let mut state = self.state.write().await;

        // Update metrics
        self.metrics.total_calls.fetch_add(1, Ordering::Relaxed);
        self.metrics.failed_calls.fetch_add(1, Ordering::Relaxed);
        self.metrics.last_failure_time_epoch_ms.store(
            current_epoch_ms(),
            Ordering::Relaxed,
        );

        // Add to sliding window
        self.add_to_window(
            &mut state,
            WindowEntry {
                outcome: CallOutcome::Failure { duration },
                timestamp: Instant::now(),
            },
        );

        // Evaluate failure rate and potentially open circuit
        match state.current_state {
            CircuitState::Closed => {
                if state.sliding_window.len() >= self.config.minimum_call_count {
                    let failure_rate = self.calculate_failure_rate(&state);
                    let threshold = self.get_effective_threshold(&state);

                    if failure_rate >= threshold {
                        self.transition_to_open(&mut state);
                    }
                }
            }
            CircuitState::HalfOpen => {
                // Any failure in half-open immediately opens circuit
                self.transition_to_open(&mut state);
            }
            CircuitState::Open => {
                // Already open, nothing to do
            }
        }
    }

    /// Add entry to sliding window, maintaining size limit
    fn add_to_window(&self, state: &mut CircuitBreakerState, entry: WindowEntry) {
        // Remove stale entries (older than window allows based on time)
        let cutoff = Instant::now() - Duration::from_secs(60); // 1 minute max
        while state
            .sliding_window
            .front()
            .map(|e| e.timestamp < cutoff)
            .unwrap_or(false)
        {
            state.sliding_window.pop_front();
        }

        // Add new entry
        state.sliding_window.push_back(entry);

        // Enforce size limit
        while state.sliding_window.len() > self.config.sliding_window_size {
            state.sliding_window.pop_front();
        }
    }

    /// Calculate current failure rate from sliding window
    fn calculate_failure_rate(&self, state: &CircuitBreakerState) -> f64 {
        if state.sliding_window.is_empty() {
            return 0.0;
        }

        let failures = state
            .sliding_window
            .iter()
            .filter(|e| matches!(e.outcome, CallOutcome::Failure { .. } | CallOutcome::Timeout))
            .count();

        // Also count slow calls as partial failures if threshold exceeded
        let slow_calls = state
            .sliding_window
            .iter()
            .filter(|e| {
                if let CallOutcome::Success { duration } = e.outcome {
                    duration >= self.config.slow_call_duration_threshold
                } else {
                    false
                }
            })
            .count();

        let slow_contribution = if state.sliding_window.len() > 0 {
            let slow_rate = slow_calls as f64 / state.sliding_window.len() as f64;
            if slow_rate >= self.config.slow_call_rate_threshold {
                slow_calls as f64 * 0.5 // Slow calls count as half-failures
            } else {
                0.0
            }
        } else {
            0.0
        };

        (failures as f64 + slow_contribution) / state.sliding_window.len() as f64
    }

    /// Get effective failure threshold (may be adapted)
    fn get_effective_threshold(&self, state: &CircuitBreakerState) -> f64 {
        if self.config.adaptive_thresholds {
            self.config.failure_rate_threshold * state.adaptive_factor
        } else {
            self.config.failure_rate_threshold
        }
    }

    /// Transition to closed state
    fn transition_to_closed(&self, state: &mut CircuitBreakerState) {
        let from_state = state.current_state;
        state.current_state = CircuitState::Closed;
        state.opened_at = None;
        state.half_open_calls = 0;
        state.half_open_successes = 0;

        // Adapt threshold based on recovery
        if self.config.adaptive_thresholds {
            // Increase tolerance slightly after successful recovery
            state.adaptive_factor = (state.adaptive_factor * 1.05).min(1.5);
            
            // Track historical rate
            let current_rate = self.calculate_failure_rate(state);
            state.historical_failure_rates.push_back(current_rate);
            if state.historical_failure_rates.len() > 10 {
                state.historical_failure_rates.pop_front();
            }
        }

        self.metrics.state_transitions.fetch_add(1, Ordering::Relaxed);
        tracing::info!(
            "Circuit breaker '{}' transitioning {} -> CLOSED",
            self.name,
            from_state
        );
    }

    /// Transition to open state
    fn transition_to_open(&self, state: &mut CircuitBreakerState) {
        let from_state = state.current_state;
        state.current_state = CircuitState::Open;
        state.opened_at = Some(Instant::now());
        state.half_open_calls = 0;
        state.half_open_successes = 0;

        // Adapt threshold based on frequent failures
        if self.config.adaptive_thresholds {
            // Decrease tolerance if we're opening frequently
            state.adaptive_factor = (state.adaptive_factor * 0.95).max(0.5);
        }

        self.metrics.state_transitions.fetch_add(1, Ordering::Relaxed);
        tracing::warn!(
            "Circuit breaker '{}' transitioning {} -> OPEN (wait {:?})",
            self.name,
            from_state,
            self.config.wait_duration_in_open
        );
    }

    /// Force the circuit to a specific state (for testing/admin purposes)
    pub async fn force_state(&self, new_state: CircuitState) {
        let mut state = self.state.write().await;
        let old_state = state.current_state;
        
        state.current_state = new_state;
        if new_state == CircuitState::Open {
            state.opened_at = Some(Instant::now());
        } else {
            state.opened_at = None;
        }
        state.half_open_calls = 0;
        state.half_open_successes = 0;

        self.metrics.state_transitions.fetch_add(1, Ordering::Relaxed);
        tracing::info!(
            "Circuit breaker '{}' forced {} -> {}",
            self.name,
            old_state,
            new_state
        );
    }

    /// Reset the circuit breaker to initial state
    pub async fn reset(&self) {
        let mut state = self.state.write().await;
        state.current_state = CircuitState::Closed;
        state.sliding_window.clear();
        state.opened_at = None;
        state.half_open_calls = 0;
        state.half_open_successes = 0;
        state.adaptive_factor = 1.0;
        state.historical_failure_rates.clear();

        tracing::info!("Circuit breaker '{}' reset", self.name);
    }
}

/// RAII permit for protected calls
pub struct CallPermit<'a> {
    _breaker: &'a CircuitBreaker,
}

impl<'a> CallPermit<'a> {
    fn new(breaker: &'a CircuitBreaker) -> Self {
        Self { _breaker: breaker }
    }
}

/// Get current epoch milliseconds
fn current_epoch_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Registry for managing multiple circuit breakers
pub struct CircuitBreakerRegistry {
    breakers: RwLock<std::collections::HashMap<String, Arc<CircuitBreaker>>>,
}

impl CircuitBreakerRegistry {
    /// Create a new empty registry
    pub fn new() -> Self {
        Self {
            breakers: RwLock::new(std::collections::HashMap::new()),
        }
    }

    /// Get or create a circuit breaker by name
    pub async fn get_or_create(
        &self,
        name: &str,
        config: CircuitBreakerConfig,
    ) -> Arc<CircuitBreaker> {
        // Try read lock first
        {
            let breakers = self.breakers.read().await;
            if let Some(breaker) = breakers.get(name) {
                return Arc::clone(breaker);
            }
        }

        // Need write lock to create
        let mut breakers = self.breakers.write().await;
        
        // Double-check in case another task created it
        if let Some(breaker) = breakers.get(name) {
            return Arc::clone(breaker);
        }

        let breaker = Arc::new(CircuitBreaker::new(name.to_string(), config));
        breakers.insert(name.to_string(), Arc::clone(&breaker));
        breaker
    }

    /// Get an existing circuit breaker
    pub async fn get(&self, name: &str) -> Option<Arc<CircuitBreaker>> {
        let breakers = self.breakers.read().await;
        breakers.get(name).cloned()
    }

    /// Get all registered circuit breakers
    pub async fn all(&self) -> Vec<Arc<CircuitBreaker>> {
        let breakers = self.breakers.read().await;
        breakers.values().cloned().collect()
    }

    /// Get aggregate metrics for all circuit breakers
    pub async fn aggregate_metrics(&self) -> Vec<(String, MetricsSnapshot)> {
        let breakers = self.breakers.read().await;
        breakers
            .iter()
            .map(|(name, breaker)| (name.clone(), breaker.metrics().snapshot()))
            .collect()
    }
}

impl Default for CircuitBreakerRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn test_circuit_breaker_starts_closed() {
        let cb = CircuitBreaker::with_defaults("test");
        assert_eq!(cb.state().await, CircuitState::Closed);
    }

    #[tokio::test]
    async fn test_circuit_breaker_opens_on_failures() {
        let config = CircuitBreakerConfigBuilder::new()
            .sliding_window_size(10)
            .minimum_call_count(5)
            .failure_rate_threshold(0.5)
            .build();

        let cb = CircuitBreaker::new("test", config);

        // Record 5 failures
        for _ in 0..5 {
            cb.record_failure(Duration::from_millis(100), None).await;
        }

        assert_eq!(cb.state().await, CircuitState::Open);
    }

    #[tokio::test]
    async fn test_circuit_breaker_rejects_when_open() {
        let config = CircuitBreakerConfigBuilder::new()
            .sliding_window_size(10)
            .minimum_call_count(5)
            .failure_rate_threshold(0.5)
            .wait_duration_in_open(Duration::from_secs(60))
            .build();

        let cb = CircuitBreaker::new("test", config);

        // Open the circuit
        for _ in 0..5 {
            cb.record_failure(Duration::from_millis(100), None).await;
        }

        // Should reject calls
        let result = cb.acquire_permission().await;
        assert!(matches!(result, Err(CircuitBreakerError::CircuitOpen { .. })));
    }

    #[tokio::test]
    async fn test_circuit_breaker_transitions_to_half_open() {
        let config = CircuitBreakerConfigBuilder::new()
            .sliding_window_size(10)
            .minimum_call_count(5)
            .failure_rate_threshold(0.5)
            .wait_duration_in_open(Duration::from_millis(50))
            .build();

        let cb = CircuitBreaker::new("test", config);

        // Open the circuit
        for _ in 0..5 {
            cb.record_failure(Duration::from_millis(100), None).await;
        }

        // Wait for open duration
        tokio::time::sleep(Duration::from_millis(100)).await;

        // Should transition to half-open
        let _permit = cb.acquire_permission().await.unwrap();
        assert_eq!(cb.state().await, CircuitState::HalfOpen);
    }

    #[tokio::test]
    async fn test_metrics_tracking() {
        let cb = CircuitBreaker::with_defaults("test");

        cb.record_success(Duration::from_millis(100)).await;
        cb.record_success(Duration::from_millis(100)).await;
        cb.record_failure(Duration::from_millis(100), None).await;

        let metrics = cb.metrics().snapshot();
        assert_eq!(metrics.total_calls, 3);
        assert_eq!(metrics.successful_calls, 2);
        assert_eq!(metrics.failed_calls, 1);
    }

    #[tokio::test]
    async fn test_registry() {
        let registry = CircuitBreakerRegistry::new();

        let cb1 = registry
            .get_or_create("service-a", CircuitBreakerConfig::default())
            .await;
        let cb2 = registry
            .get_or_create("service-a", CircuitBreakerConfig::default())
            .await;

        // Should return same instance
        assert!(Arc::ptr_eq(&cb1, &cb2));
    }

    #[tokio::test]
    async fn test_call_execution() {
        let cb = CircuitBreaker::with_defaults("test");

        // Successful call
        let result: Result<i32, CircuitBreakerError> = cb
            .call(async { Ok::<_, std::io::Error>(42) })
            .await;
        assert_eq!(result.unwrap(), 42);

        // Failed call
        let result: Result<i32, CircuitBreakerError> = cb
            .call(async {
                Err::<i32, _>(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    "test error",
                ))
            })
            .await;
        assert!(result.is_err());
    }
}
