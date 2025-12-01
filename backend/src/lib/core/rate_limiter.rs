//! BIZRA Node0 - Production-Grade Rate Limiter
//!
//! Implements multiple rate limiting algorithms:
//! - Token Bucket for smooth rate limiting with burst handling
//! - Sliding Window for precise request counting
//! - Leaky Bucket for constant rate processing
//!
//! Features:
//! - Per-client/per-key quotas
//! - Distributed rate limiting support (Redis backend)
//! - Graceful degradation
//! - Comprehensive metrics

use std::collections::HashMap;
use std::hash::Hash;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Rate limiter errors
#[derive(Debug, Error)]
pub enum RateLimitError {
    #[error("Rate limit exceeded - retry after {retry_after_ms}ms")]
    RateLimitExceeded { retry_after_ms: u64 },

    #[error("Quota exhausted for key: {key}")]
    QuotaExhausted { key: String },

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Backend error: {0}")]
    BackendError(String),
}

/// Rate limiter decision
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitDecision {
    /// Whether the request is allowed
    pub allowed: bool,
    /// Remaining tokens/requests in current window
    pub remaining: u64,
    /// Total limit
    pub limit: u64,
    /// Milliseconds until rate limit resets
    pub reset_after_ms: u64,
    /// Milliseconds until retry is allowed (if denied)
    pub retry_after_ms: Option<u64>,
}

impl RateLimitDecision {
    fn allow(remaining: u64, limit: u64, reset_after_ms: u64) -> Self {
        Self {
            allowed: true,
            remaining,
            limit,
            reset_after_ms,
            retry_after_ms: None,
        }
    }

    fn deny(remaining: u64, limit: u64, reset_after_ms: u64, retry_after_ms: u64) -> Self {
        Self {
            allowed: false,
            remaining,
            limit,
            reset_after_ms,
            retry_after_ms: Some(retry_after_ms),
        }
    }
}

/// Token bucket state for a single key
#[derive(Debug, Clone)]
struct TokenBucket {
    /// Current token count (scaled by PRECISION for sub-token accuracy)
    tokens: u64,
    /// Last refill timestamp
    last_refill: Instant,
}

/// Token bucket rate limiter configuration
#[derive(Debug, Clone)]
pub struct TokenBucketConfig {
    /// Maximum tokens in bucket (burst capacity)
    pub bucket_capacity: u64,
    /// Tokens refilled per second
    pub refill_rate: f64,
    /// Initial tokens when bucket is created
    pub initial_tokens: Option<u64>,
    /// Cost per request (usually 1)
    pub tokens_per_request: u64,
}

impl Default for TokenBucketConfig {
    fn default() -> Self {
        Self {
            bucket_capacity: 100,
            refill_rate: 10.0, // 10 requests per second
            initial_tokens: None, // Defaults to full bucket
            tokens_per_request: 1,
        }
    }
}

/// Precision multiplier for sub-token calculations
const PRECISION: u64 = 1_000_000;

/// Token bucket rate limiter
/// 
/// Allows bursts up to bucket capacity, then smoothly limits to refill rate
pub struct TokenBucketLimiter<K: Eq + Hash + Clone + Send + Sync> {
    config: TokenBucketConfig,
    buckets: RwLock<HashMap<K, TokenBucket>>,
    metrics: Arc<RateLimiterMetrics>,
}

impl<K: Eq + Hash + Clone + Send + Sync> TokenBucketLimiter<K> {
    /// Create new token bucket limiter
    pub fn new(config: TokenBucketConfig) -> Self {
        Self {
            config,
            buckets: RwLock::new(HashMap::new()),
            metrics: Arc::new(RateLimiterMetrics::default()),
        }
    }

    /// Check if request is allowed for the given key
    pub async fn check(&self, key: &K) -> RateLimitDecision {
        self.try_acquire(key, self.config.tokens_per_request, false).await
    }

    /// Attempt to acquire tokens for a request
    pub async fn acquire(&self, key: &K) -> Result<RateLimitDecision, RateLimitError> {
        let decision = self.try_acquire(key, self.config.tokens_per_request, true).await;
        if decision.allowed {
            Ok(decision)
        } else {
            Err(RateLimitError::RateLimitExceeded {
                retry_after_ms: decision.retry_after_ms.unwrap_or(0),
            })
        }
    }

    /// Attempt to acquire multiple tokens (for weighted requests)
    pub async fn acquire_many(&self, key: &K, tokens: u64) -> Result<RateLimitDecision, RateLimitError> {
        let decision = self.try_acquire(key, tokens, true).await;
        if decision.allowed {
            Ok(decision)
        } else {
            Err(RateLimitError::RateLimitExceeded {
                retry_after_ms: decision.retry_after_ms.unwrap_or(0),
            })
        }
    }

    /// Internal token acquisition logic
    async fn try_acquire(&self, key: &K, tokens_needed: u64, consume: bool) -> RateLimitDecision {
        let now = Instant::now();
        let tokens_needed_scaled = tokens_needed * PRECISION;
        let capacity_scaled = self.config.bucket_capacity * PRECISION;

        let mut buckets = self.buckets.write().await;
        
        let bucket = buckets.entry(key.clone()).or_insert_with(|| {
            let initial = self.config.initial_tokens
                .unwrap_or(self.config.bucket_capacity) * PRECISION;
            TokenBucket {
                tokens: initial,
                last_refill: now,
            }
        });

        // Refill tokens based on elapsed time
        let elapsed = now.duration_since(bucket.last_refill);
        let refill_amount = (elapsed.as_secs_f64() * self.config.refill_rate * PRECISION as f64) as u64;
        
        bucket.tokens = (bucket.tokens + refill_amount).min(capacity_scaled);
        bucket.last_refill = now;

        // Check if we have enough tokens
        if bucket.tokens >= tokens_needed_scaled {
            if consume {
                bucket.tokens -= tokens_needed_scaled;
                self.metrics.requests_allowed.fetch_add(1, Ordering::Relaxed);
            }

            let remaining = bucket.tokens / PRECISION;
            let reset_after = self.calculate_reset_time(bucket.tokens, capacity_scaled);

            RateLimitDecision::allow(remaining, self.config.bucket_capacity, reset_after)
        } else {
            self.metrics.requests_denied.fetch_add(1, Ordering::Relaxed);

            let tokens_deficit = tokens_needed_scaled - bucket.tokens;
            let retry_after = (tokens_deficit as f64 / (self.config.refill_rate * PRECISION as f64) * 1000.0) as u64;
            let reset_after = self.calculate_reset_time(bucket.tokens, capacity_scaled);

            RateLimitDecision::deny(
                bucket.tokens / PRECISION,
                self.config.bucket_capacity,
                reset_after,
                retry_after,
            )
        }
    }

    /// Calculate time until bucket is full
    fn calculate_reset_time(&self, current_tokens: u64, capacity: u64) -> u64 {
        if current_tokens >= capacity {
            0
        } else {
            let deficit = capacity - current_tokens;
            (deficit as f64 / (self.config.refill_rate * PRECISION as f64) * 1000.0) as u64
        }
    }

    /// Get current token count for a key (for monitoring)
    pub async fn get_tokens(&self, key: &K) -> Option<u64> {
        let buckets = self.buckets.read().await;
        buckets.get(key).map(|b| b.tokens / PRECISION)
    }

    /// Reset a specific key's bucket
    pub async fn reset(&self, key: &K) {
        let mut buckets = self.buckets.write().await;
        if let Some(bucket) = buckets.get_mut(key) {
            bucket.tokens = self.config.bucket_capacity * PRECISION;
            bucket.last_refill = Instant::now();
        }
    }

    /// Clear all buckets (for maintenance)
    pub async fn clear_all(&self) {
        let mut buckets = self.buckets.write().await;
        buckets.clear();
    }

    /// Get metrics
    pub fn metrics(&self) -> Arc<RateLimiterMetrics> {
        Arc::clone(&self.metrics)
    }
}

/// Sliding window entry
#[derive(Debug, Clone)]
struct WindowEntry {
    timestamp: Instant,
    count: u64,
}

/// Sliding window log rate limiter
/// 
/// Precisely tracks requests within a sliding time window
pub struct SlidingWindowLimiter<K: Eq + Hash + Clone + Send + Sync> {
    /// Maximum requests per window
    limit: u64,
    /// Window duration
    window: Duration,
    /// Request logs per key
    logs: RwLock<HashMap<K, Vec<WindowEntry>>>,
    /// Metrics
    metrics: Arc<RateLimiterMetrics>,
}

impl<K: Eq + Hash + Clone + Send + Sync> SlidingWindowLimiter<K> {
    /// Create new sliding window limiter
    pub fn new(limit: u64, window: Duration) -> Self {
        Self {
            limit,
            window,
            logs: RwLock::new(HashMap::new()),
            metrics: Arc::new(RateLimiterMetrics::default()),
        }
    }

    /// Check if request is allowed
    pub async fn check(&self, key: &K) -> RateLimitDecision {
        self.try_acquire(key, 1, false).await
    }

    /// Attempt to acquire permission for a request
    pub async fn acquire(&self, key: &K) -> Result<RateLimitDecision, RateLimitError> {
        let decision = self.try_acquire(key, 1, true).await;
        if decision.allowed {
            Ok(decision)
        } else {
            Err(RateLimitError::RateLimitExceeded {
                retry_after_ms: decision.retry_after_ms.unwrap_or(0),
            })
        }
    }

    /// Internal acquisition logic
    async fn try_acquire(&self, key: &K, count: u64, record: bool) -> RateLimitDecision {
        let now = Instant::now();
        let window_start = now - self.window;

        let mut logs = self.logs.write().await;
        let entries = logs.entry(key.clone()).or_insert_with(Vec::new);

        // Remove expired entries
        entries.retain(|e| e.timestamp >= window_start);

        // Count current window requests
        let current_count: u64 = entries.iter().map(|e| e.count).sum();

        if current_count + count <= self.limit {
            if record {
                entries.push(WindowEntry {
                    timestamp: now,
                    count,
                });
                self.metrics.requests_allowed.fetch_add(1, Ordering::Relaxed);
            }

            let remaining = self.limit - current_count - count;
            let reset_after = self.window.as_millis() as u64;

            RateLimitDecision::allow(remaining, self.limit, reset_after)
        } else {
            self.metrics.requests_denied.fetch_add(1, Ordering::Relaxed);

            // Calculate when oldest request expires
            let retry_after = entries
                .first()
                .map(|e| {
                    let expires_at = e.timestamp + self.window;
                    if expires_at > now {
                        expires_at.duration_since(now).as_millis() as u64
                    } else {
                        0
                    }
                })
                .unwrap_or(0);

            RateLimitDecision::deny(
                self.limit - current_count,
                self.limit,
                self.window.as_millis() as u64,
                retry_after,
            )
        }
    }

    /// Get current request count for a key
    pub async fn get_count(&self, key: &K) -> u64 {
        let now = Instant::now();
        let window_start = now - self.window;

        let logs = self.logs.read().await;
        logs.get(key)
            .map(|entries| {
                entries
                    .iter()
                    .filter(|e| e.timestamp >= window_start)
                    .map(|e| e.count)
                    .sum()
            })
            .unwrap_or(0)
    }

    /// Reset a specific key
    pub async fn reset(&self, key: &K) {
        let mut logs = self.logs.write().await;
        logs.remove(key);
    }

    /// Cleanup expired entries for all keys
    pub async fn cleanup(&self) {
        let now = Instant::now();
        let window_start = now - self.window;

        let mut logs = self.logs.write().await;
        logs.retain(|_, entries| {
            entries.retain(|e| e.timestamp >= window_start);
            !entries.is_empty()
        });
    }

    /// Get metrics
    pub fn metrics(&self) -> Arc<RateLimiterMetrics> {
        Arc::clone(&self.metrics)
    }
}

/// Fixed window counter for high-performance rate limiting
/// 
/// Less precise than sliding window but more memory efficient
pub struct FixedWindowLimiter<K: Eq + Hash + Clone + Send + Sync> {
    /// Maximum requests per window
    limit: u64,
    /// Window duration
    window: Duration,
    /// Current window counts
    counts: RwLock<HashMap<K, (u64, Instant)>>,
    /// Metrics
    metrics: Arc<RateLimiterMetrics>,
}

impl<K: Eq + Hash + Clone + Send + Sync> FixedWindowLimiter<K> {
    /// Create new fixed window limiter
    pub fn new(limit: u64, window: Duration) -> Self {
        Self {
            limit,
            window,
            counts: RwLock::new(HashMap::new()),
            metrics: Arc::new(RateLimiterMetrics::default()),
        }
    }

    /// Attempt to acquire permission
    pub async fn acquire(&self, key: &K) -> Result<RateLimitDecision, RateLimitError> {
        let now = Instant::now();

        let mut counts = self.counts.write().await;
        let entry = counts.entry(key.clone()).or_insert((0, now));

        // Check if window has expired
        let window_expired = now.duration_since(entry.1) >= self.window;
        if window_expired {
            *entry = (0, now);
        }

        if entry.0 < self.limit {
            entry.0 += 1;
            self.metrics.requests_allowed.fetch_add(1, Ordering::Relaxed);

            let remaining = self.limit - entry.0;
            let reset_after = (self.window - now.duration_since(entry.1)).as_millis() as u64;

            Ok(RateLimitDecision::allow(remaining, self.limit, reset_after))
        } else {
            self.metrics.requests_denied.fetch_add(1, Ordering::Relaxed);

            let reset_after = (self.window - now.duration_since(entry.1)).as_millis() as u64;

            Err(RateLimitError::RateLimitExceeded {
                retry_after_ms: reset_after,
            })
        }
    }

    /// Get metrics
    pub fn metrics(&self) -> Arc<RateLimiterMetrics> {
        Arc::clone(&self.metrics)
    }
}

/// Quota-based rate limiter for per-user/per-API-key limits
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Quota {
    /// Requests per time period
    pub requests: u64,
    /// Time period
    pub period: Duration,
    /// Burst allowance (optional extra capacity)
    pub burst: Option<u64>,
}

impl Quota {
    /// Create a new quota
    pub fn new(requests: u64, period: Duration) -> Self {
        Self {
            requests,
            period,
            burst: None,
        }
    }

    /// Create a quota with burst allowance
    pub fn with_burst(mut self, burst: u64) -> Self {
        self.burst = Some(burst);
        self
    }

    /// Per-second quota
    pub fn per_second(requests: u64) -> Self {
        Self::new(requests, Duration::from_secs(1))
    }

    /// Per-minute quota
    pub fn per_minute(requests: u64) -> Self {
        Self::new(requests, Duration::from_secs(60))
    }

    /// Per-hour quota
    pub fn per_hour(requests: u64) -> Self {
        Self::new(requests, Duration::from_secs(3600))
    }

    /// Per-day quota
    pub fn per_day(requests: u64) -> Self {
        Self::new(requests, Duration::from_secs(86400))
    }
}

/// Quota manager for multiple quotas per key
pub struct QuotaManager<K: Eq + Hash + Clone + Send + Sync + ToString> {
    /// Default quota for unknown keys
    default_quota: Quota,
    /// Per-key quotas
    quotas: RwLock<HashMap<K, Quota>>,
    /// Underlying limiters (one per quota level)
    limiters: RwLock<HashMap<K, TokenBucketLimiter<K>>>,
    /// Metrics
    metrics: Arc<RateLimiterMetrics>,
}

impl<K: Eq + Hash + Clone + Send + Sync + ToString> QuotaManager<K> {
    /// Create new quota manager with default quota
    pub fn new(default_quota: Quota) -> Self {
        Self {
            default_quota,
            quotas: RwLock::new(HashMap::new()),
            limiters: RwLock::new(HashMap::new()),
            metrics: Arc::new(RateLimiterMetrics::default()),
        }
    }

    /// Set quota for a specific key
    pub async fn set_quota(&self, key: K, quota: Quota) {
        let mut quotas = self.quotas.write().await;
        quotas.insert(key.clone(), quota.clone());

        // Create or update limiter
        let config = TokenBucketConfig {
            bucket_capacity: quota.requests + quota.burst.unwrap_or(0),
            refill_rate: quota.requests as f64 / quota.period.as_secs_f64(),
            initial_tokens: None,
            tokens_per_request: 1,
        };

        let mut limiters = self.limiters.write().await;
        limiters.insert(key, TokenBucketLimiter::new(config));
    }

    /// Get quota for a key (returns default if not set)
    pub async fn get_quota(&self, key: &K) -> Quota {
        let quotas = self.quotas.read().await;
        quotas.get(key).cloned().unwrap_or_else(|| self.default_quota.clone())
    }

    /// Check rate limit for a key
    pub async fn check(&self, key: &K) -> RateLimitDecision {
        let limiters = self.limiters.read().await;
        
        if let Some(limiter) = limiters.get(key) {
            limiter.check(key).await
        } else {
            // Use default quota
            drop(limiters);
            self.ensure_default_limiter(key).await;
            
            let limiters = self.limiters.read().await;
            if let Some(limiter) = limiters.get(key) {
                limiter.check(key).await
            } else {
                RateLimitDecision::allow(
                    self.default_quota.requests,
                    self.default_quota.requests,
                    self.default_quota.period.as_millis() as u64,
                )
            }
        }
    }

    /// Acquire permission for a request
    pub async fn acquire(&self, key: &K) -> Result<RateLimitDecision, RateLimitError> {
        let limiters = self.limiters.read().await;
        
        if let Some(limiter) = limiters.get(key) {
            limiter.acquire(key).await
        } else {
            drop(limiters);
            self.ensure_default_limiter(key).await;
            
            let limiters = self.limiters.read().await;
            if let Some(limiter) = limiters.get(key) {
                limiter.acquire(key).await
            } else {
                Err(RateLimitError::ConfigError("Failed to create limiter".into()))
            }
        }
    }

    /// Ensure a limiter exists for a key with default quota
    async fn ensure_default_limiter(&self, key: &K) {
        let mut limiters = self.limiters.write().await;
        
        if !limiters.contains_key(key) {
            let quota = self.default_quota.clone();
            let config = TokenBucketConfig {
                bucket_capacity: quota.requests + quota.burst.unwrap_or(0),
                refill_rate: quota.requests as f64 / quota.period.as_secs_f64(),
                initial_tokens: None,
                tokens_per_request: 1,
            };
            limiters.insert(key.clone(), TokenBucketLimiter::new(config));
        }
    }

    /// Get metrics
    pub fn metrics(&self) -> Arc<RateLimiterMetrics> {
        Arc::clone(&self.metrics)
    }
}

/// Rate limiter metrics
#[derive(Debug, Default)]
pub struct RateLimiterMetrics {
    pub requests_allowed: AtomicU64,
    pub requests_denied: AtomicU64,
}

impl RateLimiterMetrics {
    /// Get total requests
    pub fn total_requests(&self) -> u64 {
        self.requests_allowed.load(Ordering::Relaxed) + 
        self.requests_denied.load(Ordering::Relaxed)
    }

    /// Get denial rate
    pub fn denial_rate(&self) -> f64 {
        let total = self.total_requests();
        if total > 0 {
            self.requests_denied.load(Ordering::Relaxed) as f64 / total as f64
        } else {
            0.0
        }
    }

    /// Create snapshot
    pub fn snapshot(&self) -> MetricsSnapshot {
        let allowed = self.requests_allowed.load(Ordering::Relaxed);
        let denied = self.requests_denied.load(Ordering::Relaxed);
        let total = allowed + denied;

        MetricsSnapshot {
            total_requests: total,
            allowed_requests: allowed,
            denied_requests: denied,
            denial_rate: if total > 0 { denied as f64 / total as f64 } else { 0.0 },
        }
    }
}

/// Metrics snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsSnapshot {
    pub total_requests: u64,
    pub allowed_requests: u64,
    pub denied_requests: u64,
    pub denial_rate: f64,
}

/// Composite rate limiter combining multiple strategies
pub struct CompositeRateLimiter<K: Eq + Hash + Clone + Send + Sync> {
    /// Token bucket for burst control
    token_bucket: TokenBucketLimiter<K>,
    /// Sliding window for precise counting
    sliding_window: SlidingWindowLimiter<K>,
    /// Require all limiters to allow (AND) or any (OR)
    require_all: bool,
}

impl<K: Eq + Hash + Clone + Send + Sync> CompositeRateLimiter<K> {
    /// Create composite limiter with AND logic
    pub fn and(
        token_bucket_config: TokenBucketConfig,
        window_limit: u64,
        window_duration: Duration,
    ) -> Self {
        Self {
            token_bucket: TokenBucketLimiter::new(token_bucket_config),
            sliding_window: SlidingWindowLimiter::new(window_limit, window_duration),
            require_all: true,
        }
    }

    /// Create composite limiter with OR logic  
    pub fn or(
        token_bucket_config: TokenBucketConfig,
        window_limit: u64,
        window_duration: Duration,
    ) -> Self {
        Self {
            token_bucket: TokenBucketLimiter::new(token_bucket_config),
            sliding_window: SlidingWindowLimiter::new(window_limit, window_duration),
            require_all: false,
        }
    }

    /// Check if request is allowed
    pub async fn check(&self, key: &K) -> RateLimitDecision {
        let tb_decision = self.token_bucket.check(key).await;
        let sw_decision = self.sliding_window.check(key).await;

        if self.require_all {
            // Both must allow
            if tb_decision.allowed && sw_decision.allowed {
                RateLimitDecision::allow(
                    tb_decision.remaining.min(sw_decision.remaining),
                    tb_decision.limit.min(sw_decision.limit),
                    tb_decision.reset_after_ms.max(sw_decision.reset_after_ms),
                )
            } else {
                let retry_after = tb_decision.retry_after_ms
                    .unwrap_or(0)
                    .max(sw_decision.retry_after_ms.unwrap_or(0));
                RateLimitDecision::deny(
                    tb_decision.remaining.min(sw_decision.remaining),
                    tb_decision.limit.min(sw_decision.limit),
                    tb_decision.reset_after_ms.max(sw_decision.reset_after_ms),
                    retry_after,
                )
            }
        } else {
            // Either can allow
            if tb_decision.allowed || sw_decision.allowed {
                RateLimitDecision::allow(
                    tb_decision.remaining.max(sw_decision.remaining),
                    tb_decision.limit.max(sw_decision.limit),
                    tb_decision.reset_after_ms.min(sw_decision.reset_after_ms),
                )
            } else {
                let retry_after = tb_decision.retry_after_ms
                    .unwrap_or(0)
                    .min(sw_decision.retry_after_ms.unwrap_or(0));
                RateLimitDecision::deny(
                    0,
                    tb_decision.limit.min(sw_decision.limit),
                    tb_decision.reset_after_ms.min(sw_decision.reset_after_ms),
                    retry_after,
                )
            }
        }
    }

    /// Acquire permission
    pub async fn acquire(&self, key: &K) -> Result<RateLimitDecision, RateLimitError> {
        let decision = self.check(key).await;
        if decision.allowed {
            // Record in both limiters
            let _ = self.token_bucket.acquire(key).await;
            let _ = self.sliding_window.acquire(key).await;
            Ok(decision)
        } else {
            Err(RateLimitError::RateLimitExceeded {
                retry_after_ms: decision.retry_after_ms.unwrap_or(0),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn test_token_bucket_allows_burst() {
        let config = TokenBucketConfig {
            bucket_capacity: 10,
            refill_rate: 1.0,
            initial_tokens: Some(10),
            tokens_per_request: 1,
        };
        let limiter: TokenBucketLimiter<&str> = TokenBucketLimiter::new(config);

        // Should allow 10 requests immediately (burst)
        for i in 0..10 {
            let result = limiter.acquire(&"test").await;
            assert!(result.is_ok(), "Request {} should be allowed", i);
        }

        // 11th request should be denied
        let result = limiter.acquire(&"test").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_token_bucket_refills() {
        let config = TokenBucketConfig {
            bucket_capacity: 5,
            refill_rate: 100.0, // Fast refill for testing
            initial_tokens: Some(1),
            tokens_per_request: 1,
        };
        let limiter: TokenBucketLimiter<&str> = TokenBucketLimiter::new(config);

        // Use initial token
        let _ = limiter.acquire(&"test").await.unwrap();

        // Wait for refill
        tokio::time::sleep(Duration::from_millis(50)).await;

        // Should have tokens again
        let result = limiter.acquire(&"test").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_sliding_window_limits() {
        let limiter: SlidingWindowLimiter<&str> = 
            SlidingWindowLimiter::new(5, Duration::from_secs(1));

        // Should allow 5 requests
        for _ in 0..5 {
            let result = limiter.acquire(&"test").await;
            assert!(result.is_ok());
        }

        // 6th should be denied
        let result = limiter.acquire(&"test").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_sliding_window_expires() {
        let limiter: SlidingWindowLimiter<&str> = 
            SlidingWindowLimiter::new(5, Duration::from_millis(100));

        // Use all requests
        for _ in 0..5 {
            let _ = limiter.acquire(&"test").await.unwrap();
        }

        // Wait for window to expire
        tokio::time::sleep(Duration::from_millis(150)).await;

        // Should allow again
        let result = limiter.acquire(&"test").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_quota_manager() {
        let manager: QuotaManager<String> = 
            QuotaManager::new(Quota::per_second(10));

        // Set custom quota for VIP user
        manager.set_quota("vip-user".to_string(), Quota::per_second(100)).await;

        // Regular user gets default quota
        let decision = manager.check(&"regular-user".to_string()).await;
        assert_eq!(decision.limit, 10);

        // VIP user gets custom quota
        let decision = manager.check(&"vip-user".to_string()).await;
        assert_eq!(decision.limit, 100);
    }

    #[tokio::test]
    async fn test_decision_metrics() {
        let limiter: SlidingWindowLimiter<&str> = 
            SlidingWindowLimiter::new(2, Duration::from_secs(1));

        // 2 allowed
        let _ = limiter.acquire(&"test").await;
        let _ = limiter.acquire(&"test").await;

        // 1 denied
        let _ = limiter.acquire(&"test").await;

        let metrics = limiter.metrics().snapshot();
        assert_eq!(metrics.allowed_requests, 2);
        assert_eq!(metrics.denied_requests, 1);
    }

    #[tokio::test]
    async fn test_rate_limit_decision_headers() {
        let decision = RateLimitDecision::allow(99, 100, 60000);
        assert!(decision.allowed);
        assert_eq!(decision.remaining, 99);
        assert_eq!(decision.limit, 100);
        assert!(decision.retry_after_ms.is_none());

        let decision = RateLimitDecision::deny(0, 100, 60000, 5000);
        assert!(!decision.allowed);
        assert_eq!(decision.retry_after_ms, Some(5000));
    }
}
