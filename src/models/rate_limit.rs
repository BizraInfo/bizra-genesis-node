// BIZRA Genesis Node - Professional Elite Implementation
// Rate Limiting & Quota Management System
//
// Production-grade rate limiting using token bucket algorithm with:
// - Per-provider and per-model rate limits
// - Cost-based budget enforcement
// - Request quota management
// - Burst handling with configurable capacity
// - Thread-safe concurrent access
// - Real-time metrics tracking

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::{debug, warn};

use super::errors::{ModelError, ModelResult};

// ============================================================================
// Rate Limit Configuration
// ============================================================================

/// Configuration for rate limiting
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Maximum requests per second
    pub requests_per_second: f64,

    /// Maximum burst size (tokens in bucket)
    pub burst_capacity: usize,

    /// Maximum tokens per minute
    pub tokens_per_minute: Option<usize>,

    /// Maximum cost per minute (USD)
    pub cost_per_minute: Option<f64>,

    /// Maximum cost per hour (USD)
    pub cost_per_hour: Option<f64>,

    /// Maximum cost per day (USD)
    pub cost_per_day: Option<f64>,

    /// Whether to queue requests when rate limited
    pub enable_queue: bool,

    /// Maximum queue size
    pub max_queue_size: usize,

    /// Maximum wait time in queue (milliseconds)
    pub max_wait_ms: u64,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_second: 10.0,
            burst_capacity: 20,
            tokens_per_minute: None,
            cost_per_minute: None,
            cost_per_hour: Some(10.0), // $10/hour default
            cost_per_day: Some(100.0), // $100/day default
            enable_queue: true,
            max_queue_size: 100,
            max_wait_ms: 30_000, // 30 seconds
        }
    }
}

impl RateLimitConfig {
    /// Create a conservative rate limit config (low usage)
    pub fn conservative() -> Self {
        Self {
            requests_per_second: 1.0,
            burst_capacity: 5,
            tokens_per_minute: Some(50_000),
            cost_per_minute: Some(0.50),
            cost_per_hour: Some(10.0),
            cost_per_day: Some(50.0),
            enable_queue: true,
            max_queue_size: 50,
            max_wait_ms: 10_000,
        }
    }

    /// Create an aggressive rate limit config (high usage)
    pub fn aggressive() -> Self {
        Self {
            requests_per_second: 50.0,
            burst_capacity: 100,
            tokens_per_minute: Some(500_000),
            cost_per_minute: Some(10.0),
            cost_per_hour: Some(200.0),
            cost_per_day: Some(1000.0),
            enable_queue: true,
            max_queue_size: 500,
            max_wait_ms: 60_000,
        }
    }

    /// Create config for development (no limits)
    pub fn unlimited() -> Self {
        Self {
            requests_per_second: f64::INFINITY,
            burst_capacity: usize::MAX,
            tokens_per_minute: None,
            cost_per_minute: None,
            cost_per_hour: None,
            cost_per_day: None,
            enable_queue: false,
            max_queue_size: 0,
            max_wait_ms: 0,
        }
    }
}

// ============================================================================
// Token Bucket Implementation
// ============================================================================

/// Token bucket for rate limiting
#[derive(Debug)]
struct TokenBucket {
    /// Maximum tokens (burst capacity)
    capacity: f64,

    /// Current number of tokens
    tokens: f64,

    /// Tokens added per second (refill rate)
    refill_rate: f64,

    /// Last refill timestamp
    last_refill: Instant,
}

impl TokenBucket {
    /// Create a new token bucket
    fn new(capacity: usize, refill_rate: f64) -> Self {
        Self {
            capacity: capacity as f64,
            tokens: capacity as f64, // Start full
            refill_rate,
            last_refill: Instant::now(),
        }
    }

    /// Refill tokens based on elapsed time
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();

        let new_tokens = elapsed * self.refill_rate;
        self.tokens = (self.tokens + new_tokens).min(self.capacity);
        self.last_refill = now;
    }

    /// Try to consume tokens
    fn try_consume(&mut self, count: f64) -> bool {
        self.refill();

        if self.tokens >= count {
            self.tokens -= count;
            true
        } else {
            false
        }
    }

    /// Get current token count
    #[allow(dead_code)] // Token bucket available method - may be needed for future rate limit introspection
    fn available(&mut self) -> f64 {
        self.refill();
        self.tokens
    }

    /// Calculate time until tokens available
    fn time_until_available(&mut self, count: f64) -> Duration {
        self.refill();

        if self.tokens >= count {
            return Duration::ZERO;
        }

        let needed = count - self.tokens;
        let seconds = needed / self.refill_rate;
        Duration::from_secs_f64(seconds)
    }
}

// ============================================================================
// Cost Tracking
// ============================================================================

/// Time-windowed cost tracking
#[derive(Debug)]
struct CostTracker {
    /// Costs in the current minute
    minute_costs: Vec<(Instant, f64)>,

    /// Costs in the current hour
    hour_costs: Vec<(Instant, f64)>,

    /// Costs in the current day
    day_costs: Vec<(Instant, f64)>,
}

impl CostTracker {
    fn new() -> Self {
        Self {
            minute_costs: Vec::new(),
            hour_costs: Vec::new(),
            day_costs: Vec::new(),
        }
    }

    /// Record a cost
    fn record_cost(&mut self, cost: f64) {
        let now = Instant::now();
        self.minute_costs.push((now, cost));
        self.hour_costs.push((now, cost));
        self.day_costs.push((now, cost));
    }

    /// Clean up old entries and get total for time window
    fn get_cost(&mut self, window: Duration) -> f64 {
        let now = Instant::now();
        // Use checked_sub to avoid overflow when window is larger than elapsed time
        let cutoff = now.checked_sub(window).unwrap_or(now);

        // Clean and sum based on window
        if window <= Duration::from_secs(60) {
            self.minute_costs.retain(|(time, _)| *time >= cutoff);
            self.minute_costs.iter().map(|(_, cost)| cost).sum()
        } else if window <= Duration::from_secs(3600) {
            self.hour_costs.retain(|(time, _)| *time >= cutoff);
            self.hour_costs.iter().map(|(_, cost)| cost).sum()
        } else {
            self.day_costs.retain(|(time, _)| *time >= cutoff);
            self.day_costs.iter().map(|(_, cost)| cost).sum()
        }
    }

    /// Get cost for the last minute
    fn minute_cost(&mut self) -> f64 {
        self.get_cost(Duration::from_secs(60))
    }

    /// Get cost for the last hour
    fn hour_cost(&mut self) -> f64 {
        self.get_cost(Duration::from_secs(3600))
    }

    /// Get cost for the last day
    fn day_cost(&mut self) -> f64 {
        self.get_cost(Duration::from_secs(86400))
    }
}

// ============================================================================
// Token Quota Tracking
// ============================================================================

/// Token usage tracking for quota management
#[derive(Debug)]
struct TokenQuota {
    /// Tokens used in the current minute
    tokens_used: Vec<(Instant, usize)>,
}

impl TokenQuota {
    fn new() -> Self {
        Self {
            tokens_used: Vec::new(),
        }
    }

    /// Record token usage
    fn record_tokens(&mut self, tokens: usize) {
        let now = Instant::now();
        self.tokens_used.push((now, tokens));
    }

    /// Get tokens used in the last minute
    fn minute_tokens(&mut self) -> usize {
        let now = Instant::now();
        let cutoff = now - Duration::from_secs(60);

        self.tokens_used.retain(|(time, _)| *time >= cutoff);
        self.tokens_used.iter().map(|(_, tokens)| tokens).sum()
    }
}

// ============================================================================
// Rate Limiter
// ============================================================================

/// Rate limiter state
#[derive(Debug)]
struct RateLimiterState {
    /// Token bucket for request rate limiting
    bucket: TokenBucket,

    /// Cost tracking
    cost_tracker: CostTracker,

    /// Token quota tracking
    token_quota: TokenQuota,

    /// Total requests made
    total_requests: u64,

    /// Total tokens used
    total_tokens: usize,

    /// Total cost incurred
    total_cost: f64,

    /// Number of rate limit rejections
    rejections: u64,
}

impl RateLimiterState {
    fn new(config: &RateLimitConfig) -> Self {
        Self {
            bucket: TokenBucket::new(config.burst_capacity, config.requests_per_second),
            cost_tracker: CostTracker::new(),
            token_quota: TokenQuota::new(),
            total_requests: 0,
            total_tokens: 0,
            total_cost: 0.0,
            rejections: 0,
        }
    }
}

/// Professional-grade rate limiter with quota management
///
/// # Example
///
/// ```rust,no_run
/// use bizra_genesis_node::models::{RateLimiter, RateLimitConfig};
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let config = RateLimitConfig::default();
///     let limiter = RateLimiter::new(config);
///
///     // Check if request is allowed
///     if limiter.check_request("openai", "gpt-4").await? {
///         // Make API request
///         // ...
///         // Record usage
///         limiter.record_usage("openai", "gpt-4", 1500, 0.045).await;
///     }
///
///     Ok(())
/// }
/// ```
pub struct RateLimiter {
    config: RateLimitConfig,
    /// Per-provider rate limiters
    provider_limiters: Arc<RwLock<HashMap<String, RateLimiterState>>>,
    /// Per-model rate limiters
    model_limiters: Arc<RwLock<HashMap<String, RateLimiterState>>>,
}

impl RateLimiter {
    /// Create a new rate limiter
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            config,
            provider_limiters: Arc::new(RwLock::new(HashMap::new())),
            model_limiters: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Create with default configuration
    pub fn default_config() -> Self {
        Self::new(RateLimitConfig::default())
    }

    /// Check if a request is allowed
    ///
    /// Returns `true` if the request can proceed, `false` if rate limited.
    pub async fn check_request(&self, provider: &str, model: &str) -> ModelResult<bool> {
        // Check provider-level limits
        if !self.check_provider_limit(provider).await? {
            debug!(provider = provider, "Provider rate limit exceeded");
            return Ok(false);
        }

        // Check model-level limits
        if !self.check_model_limit(model).await? {
            debug!(model = model, "Model rate limit exceeded");
            return Ok(false);
        }

        Ok(true)
    }

    /// Wait until a request is allowed (with timeout)
    ///
    /// Returns `Ok(())` when request can proceed, or error if timeout exceeded.
    pub async fn wait_for_request(&self, provider: &str, model: &str) -> ModelResult<()> {
        let start = Instant::now();
        let timeout = Duration::from_millis(self.config.max_wait_ms);

        loop {
            if self.check_request(provider, model).await? {
                return Ok(());
            }

            if start.elapsed() >= timeout {
                return Err(ModelError::RateLimit {
                    provider: provider.to_string(),
                    retry_after_secs: Some(1),
                    message: format!("Rate limit exceeded, waited {}ms", self.config.max_wait_ms),
                });
            }

            // Calculate wait time
            let wait_time = {
                let mut providers = self.provider_limiters.write().await;
                let state = providers
                    .entry(provider.to_string())
                    .or_insert_with(|| RateLimiterState::new(&self.config));

                state.bucket.time_until_available(1.0)
            };

            // Wait for tokens to be available
            tokio::time::sleep(wait_time.min(Duration::from_millis(100))).await;
        }
    }

    /// Record usage after a successful request
    pub async fn record_usage(&self, provider: &str, model: &str, tokens: usize, cost: f64) {
        // Record provider usage
        {
            let mut providers = self.provider_limiters.write().await;
            let state = providers
                .entry(provider.to_string())
                .or_insert_with(|| RateLimiterState::new(&self.config));

            state.total_requests += 1;
            state.total_tokens += tokens;
            state.total_cost += cost;
            state.cost_tracker.record_cost(cost);
            state.token_quota.record_tokens(tokens);
        }

        // Record model usage
        {
            let mut models = self.model_limiters.write().await;
            let state = models
                .entry(model.to_string())
                .or_insert_with(|| RateLimiterState::new(&self.config));

            state.total_requests += 1;
            state.total_tokens += tokens;
            state.total_cost += cost;
            state.cost_tracker.record_cost(cost);
            state.token_quota.record_tokens(tokens);
        }
    }

    /// Get usage statistics for a provider
    pub async fn get_provider_stats(&self, provider: &str) -> Option<UsageStats> {
        let providers = self.provider_limiters.read().await;
        providers.get(provider).map(|state| UsageStats {
            total_requests: state.total_requests,
            total_tokens: state.total_tokens,
            total_cost: state.total_cost,
            rejections: state.rejections,
        })
    }

    /// Get usage statistics for a model
    pub async fn get_model_stats(&self, model: &str) -> Option<UsageStats> {
        let models = self.model_limiters.read().await;
        models.get(model).map(|state| UsageStats {
            total_requests: state.total_requests,
            total_tokens: state.total_tokens,
            total_cost: state.total_cost,
            rejections: state.rejections,
        })
    }

    /// Reset all rate limits and statistics
    pub async fn reset(&self) {
        let mut providers = self.provider_limiters.write().await;
        providers.clear();

        let mut models = self.model_limiters.write().await;
        models.clear();
    }

    // Private helper methods

    async fn check_provider_limit(&self, provider: &str) -> ModelResult<bool> {
        let mut providers = self.provider_limiters.write().await;
        let state = providers
            .entry(provider.to_string())
            .or_insert_with(|| RateLimiterState::new(&self.config));

        // Check request rate limit (token bucket)
        if !state.bucket.try_consume(1.0) {
            state.rejections += 1;
            return Ok(false);
        }

        // Check cost limits
        if let Some(max_cost) = self.config.cost_per_minute {
            if state.cost_tracker.minute_cost() >= max_cost {
                state.rejections += 1;
                warn!(
                    provider = provider,
                    cost = state.cost_tracker.minute_cost(),
                    limit = max_cost,
                    "Cost per minute limit exceeded"
                );
                return Ok(false);
            }
        }

        if let Some(max_cost) = self.config.cost_per_hour {
            if state.cost_tracker.hour_cost() >= max_cost {
                state.rejections += 1;
                warn!(
                    provider = provider,
                    cost = state.cost_tracker.hour_cost(),
                    limit = max_cost,
                    "Cost per hour limit exceeded"
                );
                return Ok(false);
            }
        }

        if let Some(max_cost) = self.config.cost_per_day {
            if state.cost_tracker.day_cost() >= max_cost {
                state.rejections += 1;
                warn!(
                    provider = provider,
                    cost = state.cost_tracker.day_cost(),
                    limit = max_cost,
                    "Cost per day limit exceeded"
                );
                return Ok(false);
            }
        }

        // Check token quota
        if let Some(max_tokens) = self.config.tokens_per_minute {
            if state.token_quota.minute_tokens() >= max_tokens {
                state.rejections += 1;
                warn!(
                    provider = provider,
                    tokens = state.token_quota.minute_tokens(),
                    limit = max_tokens,
                    "Tokens per minute limit exceeded"
                );
                return Ok(false);
            }
        }

        Ok(true)
    }

    async fn check_model_limit(&self, model: &str) -> ModelResult<bool> {
        let mut models = self.model_limiters.write().await;
        let state = models
            .entry(model.to_string())
            .or_insert_with(|| RateLimiterState::new(&self.config));

        // Check request rate limit
        if !state.bucket.try_consume(1.0) {
            state.rejections += 1;
            return Ok(false);
        }

        // Model-level limits use same config as provider-level
        // Could be extended with per-model configs if needed

        Ok(true)
    }
}

// ============================================================================
// Usage Statistics
// ============================================================================

/// Usage statistics for a provider or model
#[derive(Debug, Clone)]
pub struct UsageStats {
    /// Total requests made
    pub total_requests: u64,

    /// Total tokens used
    pub total_tokens: usize,

    /// Total cost incurred (USD)
    pub total_cost: f64,

    /// Number of rejected requests
    pub rejections: u64,
}

impl UsageStats {
    /// Calculate average tokens per request
    pub fn avg_tokens_per_request(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            self.total_tokens as f64 / self.total_requests as f64
        }
    }

    /// Calculate average cost per request
    pub fn avg_cost_per_request(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            self.total_cost / self.total_requests as f64
        }
    }

    /// Calculate rejection rate
    pub fn rejection_rate(&self) -> f64 {
        let total_attempts = self.total_requests + self.rejections;
        if total_attempts == 0 {
            0.0
        } else {
            self.rejections as f64 / total_attempts as f64
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_bucket_basic() {
        let mut bucket = TokenBucket::new(10, 1.0);

        // Should start full
        assert!(bucket.try_consume(5.0));
        assert!(bucket.try_consume(5.0));
        assert!(!bucket.try_consume(1.0)); // Empty
    }

    #[test]
    fn test_token_bucket_refill() {
        let mut bucket = TokenBucket::new(10, 10.0); // 10 tokens/sec

        bucket.try_consume(10.0); // Drain
        std::thread::sleep(Duration::from_millis(500)); // Wait 0.5s

        // Should have ~5 tokens
        assert!(bucket.try_consume(4.0));
        assert!(!bucket.try_consume(2.0)); // Not enough yet
    }

    #[tokio::test]
    async fn test_rate_limiter_basic() {
        let config = RateLimitConfig {
            requests_per_second: 10.0,
            burst_capacity: 5,
            ..Default::default()
        };

        let limiter = RateLimiter::new(config);

        // Should allow burst
        for _ in 0..5 {
            assert!(limiter.check_request("test", "model").await.unwrap());
        }

        // Should reject after burst
        assert!(!limiter.check_request("test", "model").await.unwrap());
    }

    #[tokio::test]
    async fn test_cost_tracking() {
        let config = RateLimitConfig {
            cost_per_minute: Some(1.0),
            ..Default::default()
        };

        let limiter = RateLimiter::new(config);

        // Record costs
        limiter.record_usage("test", "model", 1000, 0.5).await;
        assert!(limiter.check_request("test", "model").await.unwrap());

        limiter.record_usage("test", "model", 1000, 0.6).await;
        // Should exceed limit (1.1 > 1.0)
        assert!(!limiter.check_request("test", "model").await.unwrap());
    }

    #[tokio::test]
    async fn test_usage_stats() {
        let limiter = RateLimiter::default_config();

        limiter.record_usage("test", "model", 1000, 0.5).await;
        limiter.record_usage("test", "model", 2000, 1.0).await;

        let stats = limiter.get_provider_stats("test").await.unwrap();
        assert_eq!(stats.total_requests, 2);
        assert_eq!(stats.total_tokens, 3000);
        assert!((stats.total_cost - 1.5).abs() < 0.001);
    }

    #[test]
    fn test_config_presets() {
        let conservative = RateLimitConfig::conservative();
        assert_eq!(conservative.requests_per_second, 1.0);

        let aggressive = RateLimitConfig::aggressive();
        assert_eq!(aggressive.requests_per_second, 50.0);

        let unlimited = RateLimitConfig::unlimited();
        assert!(unlimited.requests_per_second.is_infinite());
    }
}
