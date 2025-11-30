// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - RATE LIMITING TESTS                                 ║
// ║  Comprehensive tests for rate limiting middleware                         ║
// ║  Professional Elite Test Suite                                            ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

// ═══════════════════════════════════════════════════════════════════════════
// Rate Limiter Mock for Testing
// ═══════════════════════════════════════════════════════════════════════════

/// Simple rate limiter implementation for testing
pub struct TestRateLimiter {
    /// Maximum requests per window
    max_requests: usize,
    /// Window duration
    window: Duration,
    /// Request counts per client
    counts: Arc<RwLock<HashMap<String, ClientState>>>,
}

#[derive(Clone)]
struct ClientState {
    count: usize,
    window_start: Instant,
}

impl TestRateLimiter {
    pub fn new(max_requests: usize, window: Duration) -> Self {
        Self {
            max_requests,
            window,
            counts: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Check if a request is allowed for a given client
    pub async fn check(&self, client_id: &str) -> RateLimitResult {
        let mut counts = self.counts.write().await;
        let now = Instant::now();

        let state = counts.entry(client_id.to_string()).or_insert(ClientState {
            count: 0,
            window_start: now,
        });

        // Check if window has expired
        if now.duration_since(state.window_start) >= self.window {
            state.count = 0;
            state.window_start = now;
        }

        state.count += 1;

        if state.count > self.max_requests {
            let retry_after = self
                .window
                .saturating_sub(now.duration_since(state.window_start));
            RateLimitResult::Limited {
                retry_after,
                limit: self.max_requests,
                remaining: 0,
            }
        } else {
            RateLimitResult::Allowed {
                limit: self.max_requests,
                remaining: self.max_requests - state.count,
                reset: state.window_start + self.window,
            }
        }
    }

    /// Reset limits for a specific client
    pub async fn reset(&self, client_id: &str) {
        let mut counts = self.counts.write().await;
        counts.remove(client_id);
    }

    /// Reset all limits
    pub async fn reset_all(&self) {
        let mut counts = self.counts.write().await;
        counts.clear();
    }
}

#[derive(Debug, Clone)]
pub enum RateLimitResult {
    Allowed {
        limit: usize,
        remaining: usize,
        reset: Instant,
    },
    Limited {
        retry_after: Duration,
        limit: usize,
        remaining: usize,
    },
}

impl RateLimitResult {
    pub fn is_allowed(&self) -> bool {
        matches!(self, RateLimitResult::Allowed { .. })
    }

    pub fn is_limited(&self) -> bool {
        matches!(self, RateLimitResult::Limited { .. })
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Basic Rate Limiting Tests
// ═══════════════════════════════════════════════════════════════════════════

mod basic_tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limiter_allows_under_limit() {
        let limiter = TestRateLimiter::new(10, Duration::from_secs(60));

        for i in 0..10 {
            let result = limiter.check("client-1").await;
            assert!(result.is_allowed(), "Request {} should be allowed", i + 1);
        }
    }

    #[tokio::test]
    async fn test_rate_limiter_blocks_over_limit() {
        let limiter = TestRateLimiter::new(5, Duration::from_secs(60));

        // Use up the limit
        for _ in 0..5 {
            let result = limiter.check("client-1").await;
            assert!(result.is_allowed());
        }

        // Next request should be limited
        let result = limiter.check("client-1").await;
        assert!(result.is_limited());
    }

    #[tokio::test]
    async fn test_rate_limiter_tracks_remaining() {
        let limiter = TestRateLimiter::new(10, Duration::from_secs(60));

        let result = limiter.check("client-1").await;
        if let RateLimitResult::Allowed { remaining, .. } = result {
            assert_eq!(remaining, 9);
        } else {
            panic!("Should be allowed");
        }

        // Make 4 more requests
        for _ in 0..4 {
            let _ = limiter.check("client-1").await;
        }

        let result = limiter.check("client-1").await;
        if let RateLimitResult::Allowed { remaining, .. } = result {
            assert_eq!(remaining, 4);
        } else {
            panic!("Should be allowed");
        }
    }

    #[tokio::test]
    async fn test_rate_limiter_per_client() {
        let limiter = TestRateLimiter::new(2, Duration::from_secs(60));

        // Client 1 uses their limit
        let _ = limiter.check("client-1").await;
        let _ = limiter.check("client-1").await;
        let result = limiter.check("client-1").await;
        assert!(result.is_limited());

        // Client 2 should still be able to make requests
        let result = limiter.check("client-2").await;
        assert!(result.is_allowed());
    }

    #[tokio::test]
    async fn test_rate_limiter_reset() {
        let limiter = TestRateLimiter::new(1, Duration::from_secs(60));

        // Use up the limit
        let _ = limiter.check("client-1").await;
        let result = limiter.check("client-1").await;
        assert!(result.is_limited());

        // Reset
        limiter.reset("client-1").await;

        // Should be allowed again
        let result = limiter.check("client-1").await;
        assert!(result.is_allowed());
    }

    #[tokio::test]
    async fn test_rate_limiter_reset_all() {
        let limiter = TestRateLimiter::new(1, Duration::from_secs(60));

        // Both clients use their limits
        let _ = limiter.check("client-1").await;
        let _ = limiter.check("client-2").await;

        // Both should be limited
        assert!(limiter.check("client-1").await.is_limited());
        assert!(limiter.check("client-2").await.is_limited());

        // Reset all
        limiter.reset_all().await;

        // Both should be allowed
        assert!(limiter.check("client-1").await.is_allowed());
        assert!(limiter.check("client-2").await.is_allowed());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Window Expiration Tests
// ═══════════════════════════════════════════════════════════════════════════

mod window_tests {
    use super::*;

    #[tokio::test]
    async fn test_window_expiration_resets_count() {
        // Very short window for testing
        let limiter = TestRateLimiter::new(2, Duration::from_millis(50));

        // Use up the limit
        let _ = limiter.check("client-1").await;
        let _ = limiter.check("client-1").await;
        assert!(limiter.check("client-1").await.is_limited());

        // Wait for window to expire
        tokio::time::sleep(Duration::from_millis(60)).await;

        // Should be allowed again
        let result = limiter.check("client-1").await;
        assert!(result.is_allowed());
    }

    #[tokio::test]
    async fn test_retry_after_header_calculation() {
        let limiter = TestRateLimiter::new(1, Duration::from_secs(10));

        // Use up the limit
        let _ = limiter.check("client-1").await;

        // Get limited result
        let result = limiter.check("client-1").await;

        if let RateLimitResult::Limited { retry_after, .. } = result {
            // Retry after should be approximately 10 seconds (window duration)
            assert!(retry_after.as_secs() <= 10);
            assert!(retry_after.as_secs() >= 8); // Allow some tolerance
        } else {
            panic!("Should be limited");
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Concurrent Access Tests
// ═══════════════════════════════════════════════════════════════════════════

mod concurrent_tests {
    use super::*;

    #[tokio::test]
    async fn test_concurrent_requests_same_client() {
        let limiter = Arc::new(TestRateLimiter::new(10, Duration::from_secs(60)));

        let mut handles = vec![];

        // Spawn 20 concurrent requests for the same client
        for _ in 0..20 {
            let limiter_clone = limiter.clone();
            let handle = tokio::spawn(async move { limiter_clone.check("client-1").await });
            handles.push(handle);
        }

        // Collect results
        let mut allowed_count = 0;
        let mut limited_count = 0;

        for handle in handles {
            let result = handle.await.unwrap();
            if result.is_allowed() {
                allowed_count += 1;
            } else {
                limited_count += 1;
            }
        }

        // Should allow exactly 10 requests
        assert_eq!(allowed_count, 10);
        assert_eq!(limited_count, 10);
    }

    #[tokio::test]
    async fn test_concurrent_requests_different_clients() {
        let limiter = Arc::new(TestRateLimiter::new(5, Duration::from_secs(60)));

        let mut handles = vec![];

        // Spawn requests for 10 different clients
        for i in 0..10 {
            let limiter_clone = limiter.clone();
            let client_id = format!("client-{}", i);
            let handle = tokio::spawn(async move { limiter_clone.check(&client_id).await });
            handles.push(handle);
        }

        // All should be allowed (different clients)
        for handle in handles {
            let result = handle.await.unwrap();
            assert!(result.is_allowed());
        }
    }

    #[tokio::test]
    async fn test_high_concurrency_stress() {
        let limiter = Arc::new(TestRateLimiter::new(100, Duration::from_secs(60)));
        let counter = Arc::new(AtomicUsize::new(0));

        let mut handles = vec![];

        // Spawn 500 concurrent requests
        for i in 0..500 {
            let limiter_clone = limiter.clone();
            let counter_clone = counter.clone();
            let client_id = format!("client-{}", i % 10); // 10 different clients

            let handle = tokio::spawn(async move {
                let result = limiter_clone.check(&client_id).await;
                if result.is_allowed() {
                    counter_clone.fetch_add(1, Ordering::SeqCst);
                }
            });
            handles.push(handle);
        }

        // Wait for all to complete
        for handle in handles {
            handle.await.unwrap();
        }

        // Each of 10 clients should get 100 allowed requests = 1000
        // But we only made 500 total requests, so at most 500 can be allowed
        let allowed = counter.load(Ordering::SeqCst);
        assert!(allowed <= 500);
        assert!(allowed >= 100); // At least some should succeed
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Edge Case Tests
// ═══════════════════════════════════════════════════════════════════════════

mod edge_case_tests {
    use super::*;

    #[tokio::test]
    async fn test_zero_limit() {
        // Zero limit should immediately rate limit
        let limiter = TestRateLimiter::new(0, Duration::from_secs(60));

        let result = limiter.check("client-1").await;
        assert!(result.is_limited());
    }

    #[tokio::test]
    async fn test_very_high_limit() {
        let limiter = TestRateLimiter::new(1_000_000, Duration::from_secs(60));

        for _ in 0..1000 {
            let result = limiter.check("client-1").await;
            assert!(result.is_allowed());
        }
    }

    #[tokio::test]
    async fn test_very_short_window() {
        let limiter = TestRateLimiter::new(5, Duration::from_millis(1));

        // Make requests
        for _ in 0..5 {
            let _ = limiter.check("client-1").await;
        }

        // Small delay to ensure window resets
        tokio::time::sleep(Duration::from_millis(5)).await;

        // Should be allowed again
        let result = limiter.check("client-1").await;
        assert!(result.is_allowed());
    }

    #[tokio::test]
    async fn test_empty_client_id() {
        let limiter = TestRateLimiter::new(10, Duration::from_secs(60));

        let result = limiter.check("").await;
        assert!(result.is_allowed());
    }

    #[tokio::test]
    async fn test_special_characters_in_client_id() {
        let limiter = TestRateLimiter::new(10, Duration::from_secs(60));

        let special_ids = vec![
            "client/with/slashes",
            "client.with.dots",
            "client:with:colons",
            "client@with@at",
            "client with spaces",
            "client\twith\ttabs",
            "🔐emoji🔐client",
        ];

        for id in special_ids {
            let result = limiter.check(id).await;
            assert!(result.is_allowed(), "Failed for client ID: {}", id);
        }
    }

    #[tokio::test]
    async fn test_very_long_client_id() {
        let limiter = TestRateLimiter::new(10, Duration::from_secs(60));

        let long_id = "a".repeat(10000);
        let result = limiter.check(&long_id).await;
        assert!(result.is_allowed());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Sliding Window Algorithm Tests (for future implementation)
// ═══════════════════════════════════════════════════════════════════════════

mod sliding_window_tests {
    use super::*;

    /// Sliding window rate limiter (more accurate than fixed window)
    pub struct SlidingWindowLimiter {
        max_requests: usize,
        window: Duration,
        timestamps: Arc<RwLock<HashMap<String, Vec<Instant>>>>,
    }

    impl SlidingWindowLimiter {
        pub fn new(max_requests: usize, window: Duration) -> Self {
            Self {
                max_requests,
                window,
                timestamps: Arc::new(RwLock::new(HashMap::new())),
            }
        }

        pub async fn check(&self, client_id: &str) -> bool {
            let mut timestamps = self.timestamps.write().await;
            let now = Instant::now();

            let client_timestamps = timestamps
                .entry(client_id.to_string())
                .or_insert_with(Vec::new);

            // Remove timestamps outside the window
            client_timestamps.retain(|&t| now.duration_since(t) < self.window);

            if client_timestamps.len() < self.max_requests {
                client_timestamps.push(now);
                true
            } else {
                false
            }
        }
    }

    #[tokio::test]
    async fn test_sliding_window_basic() {
        let limiter = SlidingWindowLimiter::new(5, Duration::from_secs(10));

        for i in 0..5 {
            assert!(
                limiter.check("client-1").await,
                "Request {} should be allowed",
                i + 1
            );
        }

        // 6th request should be denied
        assert!(!limiter.check("client-1").await);
    }

    #[tokio::test]
    async fn test_sliding_window_gradual_recovery() {
        let limiter = SlidingWindowLimiter::new(2, Duration::from_millis(100));

        // Use up the limit
        assert!(limiter.check("client-1").await);
        assert!(limiter.check("client-1").await);
        assert!(!limiter.check("client-1").await);

        // Wait for half the window
        tokio::time::sleep(Duration::from_millis(60)).await;

        // Still limited (old requests still in window)
        assert!(!limiter.check("client-1").await);

        // Wait for full window
        tokio::time::sleep(Duration::from_millis(100)).await;

        // Should be allowed (old requests expired)
        assert!(limiter.check("client-1").await);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Token Bucket Algorithm Tests (for future implementation)
// ═══════════════════════════════════════════════════════════════════════════

mod token_bucket_tests {
    use super::*;

    /// Token bucket rate limiter (allows bursts)
    pub struct TokenBucketLimiter {
        bucket_size: usize,
        refill_rate: f64, // tokens per second
        buckets: Arc<RwLock<HashMap<String, TokenBucket>>>,
    }

    struct TokenBucket {
        tokens: f64,
        last_refill: Instant,
    }

    impl TokenBucketLimiter {
        pub fn new(bucket_size: usize, refill_rate: f64) -> Self {
            Self {
                bucket_size,
                refill_rate,
                buckets: Arc::new(RwLock::new(HashMap::new())),
            }
        }

        pub async fn check(&self, client_id: &str) -> bool {
            let mut buckets = self.buckets.write().await;
            let now = Instant::now();

            let bucket = buckets.entry(client_id.to_string()).or_insert(TokenBucket {
                tokens: self.bucket_size as f64,
                last_refill: now,
            });

            // Refill tokens based on elapsed time
            let elapsed = now.duration_since(bucket.last_refill).as_secs_f64();
            bucket.tokens =
                (bucket.tokens + elapsed * self.refill_rate).min(self.bucket_size as f64);
            bucket.last_refill = now;

            if bucket.tokens >= 1.0 {
                bucket.tokens -= 1.0;
                true
            } else {
                false
            }
        }
    }

    #[tokio::test]
    async fn test_token_bucket_burst() {
        let limiter = TokenBucketLimiter::new(10, 1.0); // 10 tokens, refill 1/sec

        // Should allow burst of 10 requests
        for i in 0..10 {
            assert!(
                limiter.check("client-1").await,
                "Request {} should be allowed",
                i + 1
            );
        }

        // 11th request should be denied
        assert!(!limiter.check("client-1").await);
    }

    #[tokio::test]
    async fn test_token_bucket_refill() {
        let limiter = TokenBucketLimiter::new(2, 10.0); // 2 tokens, refill 10/sec

        // Use up tokens
        assert!(limiter.check("client-1").await);
        assert!(limiter.check("client-1").await);
        assert!(!limiter.check("client-1").await);

        // Wait for refill
        tokio::time::sleep(Duration::from_millis(200)).await;

        // Should have refilled ~2 tokens
        assert!(limiter.check("client-1").await);
    }
}
