// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - CIRCUIT BREAKER                                    ║
// ║  Resilience pattern for AI provider fault tolerance                       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use super::errors::{ModelError, ModelResult};

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER STATE
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/// Configuration for circuit breaker behavior
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Number of consecutive failures before opening circuit
    pub failure_threshold: u32,
    /// Duration to keep circuit open before trying half-open
    pub open_duration: Duration,
    /// Number of successful requests in half-open to close circuit
    pub success_threshold: u32,
    /// Timeout for individual requests
    pub request_timeout: Duration,
    /// Window for tracking failure rate
    pub failure_window: Duration,
    /// Maximum failure rate (0.0-1.0) before opening circuit
    pub failure_rate_threshold: f64,
    /// Minimum requests in window before considering failure rate
    pub min_requests_in_window: u32,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            open_duration: Duration::from_secs(30),
            success_threshold: 3,
            request_timeout: Duration::from_secs(30),
            failure_window: Duration::from_secs(60),
            failure_rate_threshold: 0.5,
            min_requests_in_window: 10,
        }
    }
}

impl CircuitBreakerConfig {
    /// Create config optimized for AI providers (longer timeouts, more tolerance)
    pub fn for_ai_provider() -> Self {
        Self {
            failure_threshold: 3,
            open_duration: Duration::from_secs(60),
            success_threshold: 2,
            request_timeout: Duration::from_secs(120), // AI completions can be slow
            failure_window: Duration::from_secs(120),
            failure_rate_threshold: 0.4,
            min_requests_in_window: 5,
        }
    }

    /// Create config for critical services (aggressive failure detection)
    pub fn for_critical_service() -> Self {
        Self {
            failure_threshold: 2,
            open_duration: Duration::from_secs(15),
            success_threshold: 5,
            request_timeout: Duration::from_secs(10),
            failure_window: Duration::from_secs(30),
            failure_rate_threshold: 0.3,
            min_requests_in_window: 5,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER METRICS
// ═══════════════════════════════════════════════════════════════════════════

/// Metrics for circuit breaker monitoring
#[derive(Debug, Clone)]
pub struct CircuitBreakerMetrics {
    /// Total number of requests
    pub total_requests: u64,
    /// Number of successful requests
    pub successful_requests: u64,
    /// Number of failed requests
    pub failed_requests: u64,
    /// Number of requests rejected due to open circuit
    pub rejected_requests: u64,
    /// Current failure rate (0.0-1.0)
    pub failure_rate: f64,
    /// Current circuit state
    pub state: CircuitState,
    /// Time circuit was last opened
    pub last_opened: Option<Instant>,
    /// Time circuit was last closed
    pub last_closed: Option<Instant>,
    /// Number of state transitions
    pub state_transitions: u64,
}

impl Default for CircuitBreakerMetrics {
    fn default() -> Self {
        Self {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            rejected_requests: 0,
            failure_rate: 0.0,
            state: CircuitState::Closed,
            last_opened: None,
            last_closed: None,
            state_transitions: 0,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST RECORD
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone)]
struct RequestRecord {
    timestamp: Instant,
    success: bool,
}

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/// Circuit breaker for a single provider/service
#[derive(Debug)]
pub struct CircuitBreaker {
    /// Provider/service identifier
    name: String,
    /// Configuration
    config: CircuitBreakerConfig,
    /// Current state
    state: RwLock<CircuitState>,
    /// Time circuit was opened (if open)
    opened_at: RwLock<Option<Instant>>,
    /// Consecutive failures counter
    consecutive_failures: RwLock<u32>,
    /// Consecutive successes in half-open state
    half_open_successes: RwLock<u32>,
    /// Request records for sliding window
    request_records: RwLock<Vec<RequestRecord>>,
    /// Metrics
    metrics: RwLock<CircuitBreakerMetrics>,
}

impl CircuitBreaker {
    /// Create a new circuit breaker
    pub fn new(name: impl Into<String>, config: CircuitBreakerConfig) -> Self {
        Self {
            name: name.into(),
            config,
            state: RwLock::new(CircuitState::Closed),
            opened_at: RwLock::new(None),
            consecutive_failures: RwLock::new(0),
            half_open_successes: RwLock::new(0),
            request_records: RwLock::new(Vec::new()),
            metrics: RwLock::new(CircuitBreakerMetrics::default()),
        }
    }

    /// Get the provider/service name
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Get current circuit state
    pub fn state(&self) -> CircuitState {
        *self.state.read()
    }

    /// Get current metrics
    pub fn metrics(&self) -> CircuitBreakerMetrics {
        self.metrics.read().clone()
    }

    /// Check if request should be allowed
    pub fn should_allow_request(&self) -> bool {
        self.check_state_transition();

        let state = *self.state.read();
        match state {
            CircuitState::Closed => true,
            CircuitState::Open => false,
            CircuitState::HalfOpen => true, // Allow limited requests in half-open
        }
    }

    /// Record a successful request
    pub fn record_success(&self) {
        let now = Instant::now();

        // Update request records
        {
            let mut records = self.request_records.write();
            records.push(RequestRecord {
                timestamp: now,
                success: true,
            });
            self.cleanup_old_records(&mut records, now);
        }

        // Update metrics
        {
            let mut metrics = self.metrics.write();
            metrics.total_requests += 1;
            metrics.successful_requests += 1;
            metrics.failure_rate = self.calculate_failure_rate();
        }

        // Reset failure counter
        *self.consecutive_failures.write() = 0;

        // Handle half-open state
        let state = *self.state.read();
        if state == CircuitState::HalfOpen {
            let mut successes = self.half_open_successes.write();
            *successes += 1;

            if *successes >= self.config.success_threshold {
                self.transition_to_closed();
            }
        }

        tracing::debug!(
            provider = %self.name,
            state = %self.state(),
            "Circuit breaker: request succeeded"
        );
    }

    /// Record a failed request
    pub fn record_failure(&self, error: &ModelError) {
        let now = Instant::now();

        // Only count retryable errors as circuit breaker failures
        if !error.is_retryable() {
            tracing::debug!(
                provider = %self.name,
                error = %error,
                "Circuit breaker: non-retryable error, not counting as failure"
            );
            return;
        }

        // Update request records
        {
            let mut records = self.request_records.write();
            records.push(RequestRecord {
                timestamp: now,
                success: false,
            });
            self.cleanup_old_records(&mut records, now);
        }

        // Update metrics
        {
            let mut metrics = self.metrics.write();
            metrics.total_requests += 1;
            metrics.failed_requests += 1;
            metrics.failure_rate = self.calculate_failure_rate();
        }

        // Update consecutive failures
        {
            let mut failures = self.consecutive_failures.write();
            *failures += 1;

            let state = *self.state.read();
            let failure_rate = self.calculate_failure_rate();
            let total_in_window = self.request_records.read().len() as u32;

            // Check if we should open the circuit
            let should_open = match state {
                CircuitState::Closed => {
                    *failures >= self.config.failure_threshold
                        || (total_in_window >= self.config.min_requests_in_window
                            && failure_rate >= self.config.failure_rate_threshold)
                }
                CircuitState::HalfOpen => true, // Any failure in half-open opens circuit
                CircuitState::Open => false,    // Already open
            };

            if should_open {
                drop(failures); // Release lock before transition
                self.transition_to_open();
            }
        }

        tracing::warn!(
            provider = %self.name,
            error = %error,
            state = %self.state(),
            consecutive_failures = %*self.consecutive_failures.read(),
            "Circuit breaker: request failed"
        );
    }

    /// Record a rejected request (circuit was open)
    pub fn record_rejection(&self) {
        let mut metrics = self.metrics.write();
        metrics.rejected_requests += 1;

        tracing::warn!(
            provider = %self.name,
            state = %self.state(),
            "Circuit breaker: request rejected (circuit open)"
        );
    }

    /// Manually reset the circuit breaker
    pub fn reset(&self) {
        self.transition_to_closed();
        *self.consecutive_failures.write() = 0;
        *self.half_open_successes.write() = 0;
        self.request_records.write().clear();

        tracing::info!(
            provider = %self.name,
            "Circuit breaker: manually reset"
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════

    fn check_state_transition(&self) {
        let state = *self.state.read();
        if state != CircuitState::Open {
            return;
        }

        // Check if we should transition to half-open
        let opened_at = *self.opened_at.read();
        if let Some(opened) = opened_at {
            if opened.elapsed() >= self.config.open_duration {
                self.transition_to_half_open();
            }
        }
    }

    fn transition_to_open(&self) {
        let mut state = self.state.write();
        if *state == CircuitState::Open {
            return; // Already open
        }

        let previous = *state;
        *state = CircuitState::Open;
        *self.opened_at.write() = Some(Instant::now());
        *self.half_open_successes.write() = 0;

        // Update metrics
        {
            let mut metrics = self.metrics.write();
            metrics.state = CircuitState::Open;
            metrics.last_opened = Some(Instant::now());
            metrics.state_transitions += 1;
        }

        tracing::error!(
            provider = %self.name,
            previous_state = %previous,
            "Circuit breaker: OPENED - requests will be rejected"
        );
    }

    fn transition_to_half_open(&self) {
        let mut state = self.state.write();
        if *state != CircuitState::Open {
            return;
        }

        *state = CircuitState::HalfOpen;
        *self.half_open_successes.write() = 0;

        // Update metrics
        {
            let mut metrics = self.metrics.write();
            metrics.state = CircuitState::HalfOpen;
            metrics.state_transitions += 1;
        }

        tracing::info!(
            provider = %self.name,
            "Circuit breaker: HALF_OPEN - testing recovery"
        );
    }

    fn transition_to_closed(&self) {
        let mut state = self.state.write();
        let previous = *state;
        *state = CircuitState::Closed;
        *self.opened_at.write() = None;
        *self.consecutive_failures.write() = 0;
        *self.half_open_successes.write() = 0;

        // Update metrics
        {
            let mut metrics = self.metrics.write();
            metrics.state = CircuitState::Closed;
            metrics.last_closed = Some(Instant::now());
            metrics.state_transitions += 1;
        }

        tracing::info!(
            provider = %self.name,
            previous_state = %previous,
            "Circuit breaker: CLOSED - service recovered"
        );
    }

    fn cleanup_old_records(&self, records: &mut Vec<RequestRecord>, now: Instant) {
        let cutoff = now - self.config.failure_window;
        records.retain(|r| r.timestamp > cutoff);
    }

    fn calculate_failure_rate(&self) -> f64 {
        let records = self.request_records.read();
        if records.is_empty() {
            return 0.0;
        }

        let failures = records.iter().filter(|r| !r.success).count();
        failures as f64 / records.len() as f64
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

/// Registry for managing multiple circuit breakers
#[derive(Debug, Clone)]
pub struct CircuitBreakerRegistry {
    breakers: Arc<RwLock<HashMap<String, Arc<CircuitBreaker>>>>,
    default_config: CircuitBreakerConfig,
}

impl Default for CircuitBreakerRegistry {
    fn default() -> Self {
        Self::new(CircuitBreakerConfig::for_ai_provider())
    }
}

impl CircuitBreakerRegistry {
    /// Create a new registry with default configuration
    pub fn new(default_config: CircuitBreakerConfig) -> Self {
        Self {
            breakers: Arc::new(RwLock::new(HashMap::new())),
            default_config,
        }
    }

    /// Get or create a circuit breaker for a provider
    pub fn get_or_create(&self, name: &str) -> Arc<CircuitBreaker> {
        // Fast path: check if exists
        {
            let breakers = self.breakers.read();
            if let Some(breaker) = breakers.get(name) {
                return Arc::clone(breaker);
            }
        }

        // Slow path: create new breaker
        let mut breakers = self.breakers.write();
        breakers
            .entry(name.to_string())
            .or_insert_with(|| Arc::new(CircuitBreaker::new(name, self.default_config.clone())))
            .clone()
    }

    /// Get a circuit breaker if it exists
    pub fn get(&self, name: &str) -> Option<Arc<CircuitBreaker>> {
        self.breakers.read().get(name).cloned()
    }

    /// Get all circuit breaker metrics
    pub fn all_metrics(&self) -> HashMap<String, CircuitBreakerMetrics> {
        self.breakers
            .read()
            .iter()
            .map(|(name, breaker)| (name.clone(), breaker.metrics()))
            .collect()
    }

    /// Check if any circuit is open
    pub fn any_open(&self) -> bool {
        self.breakers
            .read()
            .values()
            .any(|b| b.state() == CircuitState::Open)
    }

    /// Get names of all open circuits
    pub fn open_circuits(&self) -> Vec<String> {
        self.breakers
            .read()
            .iter()
            .filter(|(_, b)| b.state() == CircuitState::Open)
            .map(|(name, _)| name.clone())
            .collect()
    }

    /// Reset all circuit breakers
    pub fn reset_all(&self) {
        for breaker in self.breakers.read().values() {
            breaker.reset();
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION FOR WRAPPING CALLS
// ═══════════════════════════════════════════════════════════════════════════

/// Execute a fallible operation with circuit breaker protection
pub async fn with_circuit_breaker<T, F, Fut>(
    breaker: &CircuitBreaker,
    operation: F,
) -> ModelResult<T>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = ModelResult<T>>,
{
    // Check if request should be allowed
    if !breaker.should_allow_request() {
        breaker.record_rejection();
        return Err(ModelError::ProviderError {
            provider: breaker.name().to_string(),
            code: Some("CIRCUIT_OPEN".to_string()),
            message: format!(
                "Circuit breaker is open for provider '{}'. Service is temporarily unavailable.",
                breaker.name()
            ),
        });
    }

    // Execute the operation
    match operation().await {
        Ok(result) => {
            breaker.record_success();
            Ok(result)
        }
        Err(error) => {
            breaker.record_failure(&error);
            Err(error)
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_circuit_breaker_initial_state() {
        let breaker = CircuitBreaker::new("test", CircuitBreakerConfig::default());
        assert_eq!(breaker.state(), CircuitState::Closed);
        assert!(breaker.should_allow_request());
    }

    #[test]
    fn test_circuit_breaker_opens_on_failures() {
        let config = CircuitBreakerConfig {
            failure_threshold: 3,
            ..Default::default()
        };
        let breaker = CircuitBreaker::new("test", config);

        let error = ModelError::Timeout {
            duration_ms: 5000,
            operation: "test".to_string(),
        };

        // Record failures
        for _ in 0..3 {
            breaker.record_failure(&error);
        }

        assert_eq!(breaker.state(), CircuitState::Open);
        assert!(!breaker.should_allow_request());
    }

    #[test]
    fn test_circuit_breaker_success_resets_failures() {
        let config = CircuitBreakerConfig {
            failure_threshold: 5,
            ..Default::default()
        };
        let breaker = CircuitBreaker::new("test", config);

        let error = ModelError::Timeout {
            duration_ms: 5000,
            operation: "test".to_string(),
        };

        // Record some failures
        breaker.record_failure(&error);
        breaker.record_failure(&error);

        // Record success
        breaker.record_success();

        // Record more failures - should need 5 from start
        breaker.record_failure(&error);
        breaker.record_failure(&error);
        breaker.record_failure(&error);
        breaker.record_failure(&error);

        // Should still be closed (only 4 consecutive failures)
        assert_eq!(breaker.state(), CircuitState::Closed);

        // One more failure should open it
        breaker.record_failure(&error);
        assert_eq!(breaker.state(), CircuitState::Open);
    }

    #[test]
    fn test_non_retryable_errors_dont_trigger_circuit() {
        let config = CircuitBreakerConfig {
            failure_threshold: 1,
            ..Default::default()
        };
        let breaker = CircuitBreaker::new("test", config);

        // Authentication errors are not retryable
        let error = ModelError::Authentication {
            provider: "test".to_string(),
            message: "Invalid API key".to_string(),
        };

        // Multiple auth errors shouldn't open circuit
        for _ in 0..5 {
            breaker.record_failure(&error);
        }

        assert_eq!(breaker.state(), CircuitState::Closed);
    }

    #[test]
    fn test_circuit_breaker_registry() {
        let registry = CircuitBreakerRegistry::default();

        let breaker1 = registry.get_or_create("provider1");
        let breaker2 = registry.get_or_create("provider2");

        assert_eq!(breaker1.name(), "provider1");
        assert_eq!(breaker2.name(), "provider2");

        // Same name should return same breaker
        let breaker1_again = registry.get_or_create("provider1");
        assert_eq!(
            Arc::strong_count(&breaker1),
            Arc::strong_count(&breaker1_again)
        );
    }

    #[test]
    fn test_metrics_tracking() {
        let breaker = CircuitBreaker::new("test", CircuitBreakerConfig::default());

        breaker.record_success();
        breaker.record_success();

        let error = ModelError::Timeout {
            duration_ms: 5000,
            operation: "test".to_string(),
        };
        breaker.record_failure(&error);

        let metrics = breaker.metrics();
        assert_eq!(metrics.total_requests, 3);
        assert_eq!(metrics.successful_requests, 2);
        assert_eq!(metrics.failed_requests, 1);
    }

    #[test]
    fn test_manual_reset() {
        let config = CircuitBreakerConfig {
            failure_threshold: 1,
            ..Default::default()
        };
        let breaker = CircuitBreaker::new("test", config);

        let error = ModelError::Timeout {
            duration_ms: 5000,
            operation: "test".to_string(),
        };
        breaker.record_failure(&error);

        assert_eq!(breaker.state(), CircuitState::Open);

        breaker.reset();

        assert_eq!(breaker.state(), CircuitState::Closed);
        assert!(breaker.should_allow_request());
    }
}
