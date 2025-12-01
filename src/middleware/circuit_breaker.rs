// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - CIRCUIT BREAKER PATTERN                            ║
// ║  Enterprise-grade resilience with adaptive failure detection              ║
// ║  Implements: Closed → Open → Half-Open state machine with exponential     ║
// ║  backoff and sliding window failure tracking                              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

/// Circuit breaker states following the standard pattern
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    /// Circuit is closed - requests flow normally
    Closed,
    /// Circuit is open - requests are rejected immediately
    Open,
    /// Circuit is half-open - limited requests allowed to test recovery
    HalfOpen,
}

impl std::fmt::Display for CircuitState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CircuitState::Closed => write!(f, "CLOSED"),
            CircuitState::Open => write!(f, "OPEN"),
            CircuitState::HalfOpen => write!(f, "HALF_OPEN"),
        }
    }
}

/// Circuit breaker configuration with sensible defaults
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Failure threshold percentage to trip the circuit (0.0 - 1.0)
    pub failure_threshold: f64,
    /// Minimum number of requests before evaluating failure rate
    pub min_request_volume: u64,
    /// Duration to keep circuit open before attempting half-open
    pub open_duration: Duration,
    /// Number of successful requests needed in half-open to close
    pub half_open_success_threshold: u64,
    /// Maximum requests allowed in half-open state
    pub half_open_max_requests: u64,
    /// Sliding window duration for failure tracking
    pub window_duration: Duration,
    /// Enable exponential backoff for repeated failures
    pub exponential_backoff: bool,
    /// Maximum backoff multiplier
    pub max_backoff_multiplier: f64,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 0.5, // 50% failure rate trips circuit
            min_request_volume: 10, // Need at least 10 requests
            open_duration: Duration::from_secs(30),
            half_open_success_threshold: 3,
            half_open_max_requests: 5,
            window_duration: Duration::from_secs(60),
            exponential_backoff: true,
            max_backoff_multiplier: 8.0,
        }
    }
}

impl CircuitBreakerConfig {
    /// Aggressive configuration for high-availability systems
    pub fn aggressive() -> Self {
        Self {
            failure_threshold: 0.3, // Trip at 30% failures
            min_request_volume: 5,
            open_duration: Duration::from_secs(10),
            half_open_success_threshold: 2,
            half_open_max_requests: 3,
            window_duration: Duration::from_secs(30),
            exponential_backoff: true,
            max_backoff_multiplier: 4.0,
        }
    }

    /// Conservative configuration for less critical systems
    pub fn conservative() -> Self {
        Self {
            failure_threshold: 0.7, // Trip at 70% failures
            min_request_volume: 20,
            open_duration: Duration::from_secs(60),
            half_open_success_threshold: 5,
            half_open_max_requests: 10,
            window_duration: Duration::from_secs(120),
            exponential_backoff: false,
            max_backoff_multiplier: 2.0,
        }
    }
}

/// Individual request outcome for sliding window tracking
#[derive(Debug, Clone)]
struct RequestOutcome {
    timestamp: Instant,
    success: bool,
    latency_ms: u64,
}

/// Circuit breaker statistics
#[derive(Debug, Clone, Default)]
pub struct CircuitBreakerStats {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub rejected_requests: u64,
    pub state_transitions: u64,
    pub avg_latency_ms: f64,
    pub current_failure_rate: f64,
}

/// Thread-safe circuit breaker implementation
pub struct CircuitBreaker {
    name: String,
    config: CircuitBreakerConfig,
    state: RwLock<CircuitState>,
    /// Sliding window of recent request outcomes
    window: RwLock<VecDeque<RequestOutcome>>,
    /// Timestamp when circuit was opened
    opened_at: RwLock<Option<Instant>>,
    /// Current backoff multiplier for exponential backoff
    backoff_multiplier: RwLock<f64>,
    /// Consecutive successful requests in half-open state
    half_open_successes: AtomicU64,
    /// Total requests in half-open state
    half_open_requests: AtomicU64,
    /// Statistics
    stats: RwLock<CircuitBreakerStats>,
}

impl CircuitBreaker {
    /// Create a new circuit breaker with the given name and configuration
    pub fn new(name: impl Into<String>, config: CircuitBreakerConfig) -> Self {
        Self {
            name: name.into(),
            config,
            state: RwLock::new(CircuitState::Closed),
            window: RwLock::new(VecDeque::new()),
            opened_at: RwLock::new(None),
            backoff_multiplier: RwLock::new(1.0),
            half_open_successes: AtomicU64::new(0),
            half_open_requests: AtomicU64::new(0),
            stats: RwLock::new(CircuitBreakerStats::default()),
        }
    }

    /// Create with default configuration
    pub fn with_defaults(name: impl Into<String>) -> Self {
        Self::new(name, CircuitBreakerConfig::default())
    }

    /// Get current circuit state
    pub async fn state(&self) -> CircuitState {
        // Check for state transitions first
        self.check_state_transition().await;
        *self.state.read().await
    }

    /// Check if request should be allowed
    pub async fn allow_request(&self) -> bool {
        let state = self.state().await;

        match state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                let mut stats = self.stats.write().await;
                stats.rejected_requests += 1;
                false
            }
            CircuitState::HalfOpen => {
                let current = self.half_open_requests.fetch_add(1, Ordering::SeqCst);
                if current < self.config.half_open_max_requests {
                    true
                } else {
                    let mut stats = self.stats.write().await;
                    stats.rejected_requests += 1;
                    false
                }
            }
        }
    }

    /// Record a successful request
    pub async fn record_success(&self, latency_ms: u64) {
        let state = *self.state.read().await;

        // Add to sliding window
        {
            let mut window = self.window.write().await;
            window.push_back(RequestOutcome {
                timestamp: Instant::now(),
                success: true,
                latency_ms,
            });
            self.prune_window(&mut window);
        }

        // Update statistics
        {
            let mut stats = self.stats.write().await;
            stats.total_requests += 1;
            stats.successful_requests += 1;
            self.update_avg_latency(&mut stats, latency_ms);
        }

        // Handle half-open success
        if state == CircuitState::HalfOpen {
            let successes = self.half_open_successes.fetch_add(1, Ordering::SeqCst) + 1;
            debug!(
                "[{}] Half-open success {}/{}",
                self.name, successes, self.config.half_open_success_threshold
            );

            if successes >= self.config.half_open_success_threshold {
                self.transition_to(CircuitState::Closed).await;
            }
        }
    }

    /// Record a failed request
    pub async fn record_failure(&self, latency_ms: u64) {
        let state = *self.state.read().await;

        // Add to sliding window
        {
            let mut window = self.window.write().await;
            window.push_back(RequestOutcome {
                timestamp: Instant::now(),
                success: false,
                latency_ms,
            });
            self.prune_window(&mut window);
        }

        // Update statistics
        {
            let mut stats = self.stats.write().await;
            stats.total_requests += 1;
            stats.failed_requests += 1;
            self.update_avg_latency(&mut stats, latency_ms);
        }

        // Check if we should trip the circuit
        match state {
            CircuitState::Closed => {
                let failure_rate = self.calculate_failure_rate().await;
                let volume = self.window.read().await.len() as u64;

                if volume >= self.config.min_request_volume
                    && failure_rate >= self.config.failure_threshold
                {
                    warn!(
                        "[{}] Failure rate {:.1}% exceeds threshold {:.1}%, opening circuit",
                        self.name,
                        failure_rate * 100.0,
                        self.config.failure_threshold * 100.0
                    );
                    self.transition_to(CircuitState::Open).await;
                }
            }
            CircuitState::HalfOpen => {
                // Single failure in half-open immediately reopens
                warn!(
                    "[{}] Failure in half-open state, reopening circuit",
                    self.name
                );
                self.transition_to(CircuitState::Open).await;
            }
            CircuitState::Open => {
                // Already open, nothing to do
            }
        }
    }

    /// Execute a function with circuit breaker protection
    pub async fn call<F, T, E>(&self, f: F) -> Result<T, CircuitBreakerError<E>>
    where
        F: std::future::Future<Output = Result<T, E>>,
    {
        if !self.allow_request().await {
            return Err(CircuitBreakerError::CircuitOpen {
                circuit_name: self.name.clone(),
                state: self.state().await,
            });
        }

        let start = Instant::now();
        let result = f.await;
        let latency_ms = start.elapsed().as_millis() as u64;

        match &result {
            Ok(_) => {
                self.record_success(latency_ms).await;
                result.map_err(CircuitBreakerError::Inner)
            }
            Err(_) => {
                self.record_failure(latency_ms).await;
                result.map_err(CircuitBreakerError::Inner)
            }
        }
    }

    /// Get current statistics
    pub async fn stats(&self) -> CircuitBreakerStats {
        let mut stats = self.stats.read().await.clone();
        stats.current_failure_rate = self.calculate_failure_rate().await;
        stats
    }

    /// Force reset the circuit breaker to closed state
    pub async fn reset(&self) {
        info!("[{}] Circuit breaker manually reset", self.name);

        *self.state.write().await = CircuitState::Closed;
        *self.opened_at.write().await = None;
        *self.backoff_multiplier.write().await = 1.0;
        self.half_open_successes.store(0, Ordering::SeqCst);
        self.half_open_requests.store(0, Ordering::SeqCst);
        self.window.write().await.clear();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════

    async fn check_state_transition(&self) {
        let state = *self.state.read().await;

        if state == CircuitState::Open {
            let opened_at = *self.opened_at.read().await;
            if let Some(opened_at) = opened_at {
                let backoff = *self.backoff_multiplier.read().await;
                let effective_duration = self.config.open_duration.mul_f64(backoff);

                if opened_at.elapsed() >= effective_duration {
                    self.transition_to(CircuitState::HalfOpen).await;
                }
            }
        }
    }

    async fn transition_to(&self, new_state: CircuitState) {
        let old_state = *self.state.read().await;

        if old_state == new_state {
            return;
        }

        info!(
            "[{}] Circuit state transition: {} → {}",
            self.name, old_state, new_state
        );

        // Handle state-specific logic
        match new_state {
            CircuitState::Open => {
                *self.opened_at.write().await = Some(Instant::now());

                // Apply exponential backoff if enabled
                if self.config.exponential_backoff && old_state != CircuitState::Closed {
                    let mut backoff = self.backoff_multiplier.write().await;
                    *backoff = (*backoff * 2.0).min(self.config.max_backoff_multiplier);
                    debug!(
                        "[{}] Exponential backoff applied: {:.1}x",
                        self.name, *backoff
                    );
                }
            }
            CircuitState::HalfOpen => {
                self.half_open_successes.store(0, Ordering::SeqCst);
                self.half_open_requests.store(0, Ordering::SeqCst);
            }
            CircuitState::Closed => {
                *self.opened_at.write().await = None;
                *self.backoff_multiplier.write().await = 1.0;
                self.half_open_successes.store(0, Ordering::SeqCst);
                self.half_open_requests.store(0, Ordering::SeqCst);
            }
        }

        *self.state.write().await = new_state;

        let mut stats = self.stats.write().await;
        stats.state_transitions += 1;
    }

    fn prune_window(&self, window: &mut VecDeque<RequestOutcome>) {
        let cutoff = Instant::now() - self.config.window_duration;
        while let Some(front) = window.front() {
            if front.timestamp < cutoff {
                window.pop_front();
            } else {
                break;
            }
        }
    }

    async fn calculate_failure_rate(&self) -> f64 {
        let window = self.window.read().await;

        if window.is_empty() {
            return 0.0;
        }

        let failures = window.iter().filter(|o| !o.success).count();
        failures as f64 / window.len() as f64
    }

    fn update_avg_latency(&self, stats: &mut CircuitBreakerStats, latency_ms: u64) {
        let n = stats.total_requests as f64;
        stats.avg_latency_ms = ((n - 1.0) * stats.avg_latency_ms + latency_ms as f64) / n;
    }
}

/// Error type for circuit breaker operations
#[derive(Debug)]
pub enum CircuitBreakerError<E> {
    /// Circuit is open or half-open limit reached
    CircuitOpen {
        circuit_name: String,
        state: CircuitState,
    },
    /// Inner operation failed
    Inner(E),
}

impl<E: std::fmt::Display> std::fmt::Display for CircuitBreakerError<E> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CircuitBreakerError::CircuitOpen {
                circuit_name,
                state,
            } => {
                write!(
                    f,
                    "Circuit '{}' is {} - request rejected",
                    circuit_name, state
                )
            }
            CircuitBreakerError::Inner(e) => write!(f, "{}", e),
        }
    }
}

impl<E: std::error::Error + 'static> std::error::Error for CircuitBreakerError<E> {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            CircuitBreakerError::Inner(e) => Some(e),
            _ => None,
        }
    }
}

/// Circuit breaker registry for managing multiple circuits
pub struct CircuitBreakerRegistry {
    circuits: RwLock<std::collections::HashMap<String, Arc<CircuitBreaker>>>,
}

impl CircuitBreakerRegistry {
    pub fn new() -> Self {
        Self {
            circuits: RwLock::new(std::collections::HashMap::new()),
        }
    }

    /// Get or create a circuit breaker
    pub async fn get_or_create(
        &self,
        name: &str,
        config: CircuitBreakerConfig,
    ) -> Arc<CircuitBreaker> {
        {
            let circuits = self.circuits.read().await;
            if let Some(circuit) = circuits.get(name) {
                return circuit.clone();
            }
        }

        let circuit = Arc::new(CircuitBreaker::new(name, config));
        self.circuits
            .write()
            .await
            .insert(name.to_string(), circuit.clone());
        circuit
    }

    /// Get all circuit states for monitoring
    pub async fn get_all_states(&self) -> Vec<(String, CircuitState, CircuitBreakerStats)> {
        let circuits = self.circuits.read().await;
        let mut states = Vec::new();

        for (name, circuit) in circuits.iter() {
            let state = circuit.state().await;
            let stats = circuit.stats().await;
            states.push((name.clone(), state, stats));
        }

        states
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

    #[tokio::test]
    async fn test_circuit_breaker_creation() {
        let cb = CircuitBreaker::with_defaults("test");
        assert_eq!(cb.state().await, CircuitState::Closed);
    }

    #[tokio::test]
    async fn test_success_keeps_circuit_closed() {
        let cb = CircuitBreaker::with_defaults("test");

        for _ in 0..10 {
            cb.record_success(100).await;
        }

        assert_eq!(cb.state().await, CircuitState::Closed);
        let stats = cb.stats().await;
        assert_eq!(stats.successful_requests, 10);
        assert_eq!(stats.failed_requests, 0);
    }

    #[tokio::test]
    async fn test_failures_open_circuit() {
        let config = CircuitBreakerConfig {
            failure_threshold: 0.5,
            min_request_volume: 5,
            ..Default::default()
        };
        let cb = CircuitBreaker::new("test", config);

        // Add 5 failures (100% failure rate)
        for _ in 0..5 {
            cb.record_failure(100).await;
        }

        assert_eq!(cb.state().await, CircuitState::Open);
    }

    #[tokio::test]
    async fn test_mixed_requests_below_threshold() {
        let config = CircuitBreakerConfig {
            failure_threshold: 0.5,
            min_request_volume: 10,
            ..Default::default()
        };
        let cb = CircuitBreaker::new("test", config);

        // Add 7 successes and 3 failures (30% failure rate, below 50% threshold)
        for _ in 0..7 {
            cb.record_success(100).await;
        }
        for _ in 0..3 {
            cb.record_failure(100).await;
        }

        assert_eq!(cb.state().await, CircuitState::Closed);
    }

    #[tokio::test]
    async fn test_allow_request_when_open() {
        let config = CircuitBreakerConfig {
            failure_threshold: 0.5,
            min_request_volume: 2,
            ..Default::default()
        };
        let cb = CircuitBreaker::new("test", config);

        // Open the circuit
        cb.record_failure(100).await;
        cb.record_failure(100).await;

        assert!(!cb.allow_request().await);
    }

    #[tokio::test]
    async fn test_call_with_success() {
        let cb = CircuitBreaker::with_defaults("test");

        let result: Result<i32, CircuitBreakerError<&str>> = cb.call(async { Ok(42) }).await;

        assert!(matches!(result, Ok(42)));
        let stats = cb.stats().await;
        assert_eq!(stats.successful_requests, 1);
    }

    #[tokio::test]
    async fn test_call_with_failure() {
        let cb = CircuitBreaker::with_defaults("test");

        let result: Result<i32, CircuitBreakerError<&str>> = cb.call(async { Err("error") }).await;

        assert!(matches!(result, Err(CircuitBreakerError::Inner("error"))));
        let stats = cb.stats().await;
        assert_eq!(stats.failed_requests, 1);
    }

    #[tokio::test]
    async fn test_reset() {
        let config = CircuitBreakerConfig {
            failure_threshold: 0.5,
            min_request_volume: 2,
            ..Default::default()
        };
        let cb = CircuitBreaker::new("test", config);

        // Open the circuit
        cb.record_failure(100).await;
        cb.record_failure(100).await;
        assert_eq!(cb.state().await, CircuitState::Open);

        // Reset
        cb.reset().await;
        assert_eq!(cb.state().await, CircuitState::Closed);
    }

    #[tokio::test]
    async fn test_registry() {
        let registry = CircuitBreakerRegistry::new();

        let cb1 = registry
            .get_or_create("service1", CircuitBreakerConfig::default())
            .await;
        let cb2 = registry
            .get_or_create("service1", CircuitBreakerConfig::default())
            .await;

        // Should be the same instance
        assert!(Arc::ptr_eq(&cb1, &cb2));

        let states = registry.get_all_states().await;
        assert_eq!(states.len(), 1);
    }
}
