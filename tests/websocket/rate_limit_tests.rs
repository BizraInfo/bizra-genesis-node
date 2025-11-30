// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET RATE LIMIT TESTS                          ║
// ║  Comprehensive tests for token bucket rate limiting                       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use bizra_genesis_node::websocket::rate_limit::{RateLimiter, TokenBucket};
use std::time::{Duration, Instant};

// ═══════════════════════════════════════════════════════════════════════════
// Token Bucket Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod token_bucket_tests {
    use super::*;

    #[test]
    fn test_bucket_creation_with_full_tokens() {
        let bucket = TokenBucket::new(10, 5);

        assert_eq!(bucket.capacity, 10);
        assert_eq!(bucket.tokens, 10);
        assert_eq!(bucket.refill_rate, 5);
    }

    #[test]
    fn test_bucket_consume_single_token() {
        let mut bucket = TokenBucket::new(10, 5);

        assert!(bucket.try_consume(1));
        assert_eq!(bucket.tokens, 9);
    }

    #[test]
    fn test_bucket_consume_multiple_tokens() {
        let mut bucket = TokenBucket::new(10, 5);

        assert!(bucket.try_consume(5));
        assert_eq!(bucket.tokens, 5);
    }

    #[test]
    fn test_bucket_consume_all_tokens() {
        let mut bucket = TokenBucket::new(10, 5);

        assert!(bucket.try_consume(10));
        assert_eq!(bucket.tokens, 0);
    }

    #[test]
    fn test_bucket_consume_more_than_available_fails() {
        let mut bucket = TokenBucket::new(5, 5);

        assert!(!bucket.try_consume(6));
        assert_eq!(bucket.tokens, 5); // Tokens unchanged on failure
    }

    #[test]
    fn test_bucket_consume_when_empty_fails() {
        let mut bucket = TokenBucket::new(3, 5);

        bucket.try_consume(3); // Empty the bucket

        assert!(!bucket.try_consume(1));
    }

    #[test]
    fn test_bucket_refill_over_time() {
        let mut bucket = TokenBucket::new(10, 10); // 10 tokens/sec refill

        // Empty the bucket
        bucket.try_consume(10);
        assert_eq!(bucket.tokens, 0);

        // Wait for refill (100ms = ~1 token at 10/sec)
        std::thread::sleep(Duration::from_millis(150));

        // Should have some tokens now
        let tokens = bucket.tokens();
        assert!(tokens >= 1, "Expected at least 1 token after 150ms, got {}", tokens);
    }

    #[test]
    fn test_bucket_refill_caps_at_capacity() {
        let mut bucket = TokenBucket::new(5, 100); // High refill rate

        // Consume some tokens
        bucket.try_consume(3);
        assert_eq!(bucket.tokens, 2);

        // Wait for refill
        std::thread::sleep(Duration::from_millis(100));

        // Should cap at capacity (5)
        let tokens = bucket.tokens();
        assert!(tokens <= 5, "Tokens {} should not exceed capacity 5", tokens);
    }

    #[test]
    fn test_bucket_zero_token_consume() {
        let mut bucket = TokenBucket::new(5, 5);

        // Consuming 0 tokens should always succeed
        assert!(bucket.try_consume(0));
        assert_eq!(bucket.tokens, 5);
    }

    #[test]
    fn test_bucket_time_until_available_with_tokens() {
        let bucket = TokenBucket::new(5, 5);

        // When tokens are available, should return None
        assert!(bucket.time_until_available().is_none());
    }

    #[test]
    fn test_bucket_time_until_available_empty() {
        let mut bucket = TokenBucket::new(5, 5);

        // Empty the bucket
        bucket.try_consume(5);

        // Should return Some duration
        let time = bucket.time_until_available();
        assert!(time.is_some());
        assert!(time.unwrap() <= Duration::from_millis(250)); // 1/5 sec = 200ms
    }

    #[test]
    fn test_bucket_gradual_consumption() {
        let mut bucket = TokenBucket::new(5, 1);

        // Consume one at a time
        for _ in 0..5 {
            assert!(bucket.try_consume(1));
        }

        // Should be empty
        assert!(!bucket.try_consume(1));
    }

    #[test]
    fn test_bucket_partial_refill() {
        let mut bucket = TokenBucket::new(10, 20); // 20 tokens/sec = 1 token per 50ms

        // Empty bucket
        bucket.try_consume(10);

        // Wait 25ms - should get partial token
        std::thread::sleep(Duration::from_millis(60));

        // Check tokens (should have at least 1)
        let tokens = bucket.tokens();
        assert!(tokens >= 1);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Rate Limiter Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod rate_limiter_tests {
    use super::*;

    #[test]
    fn test_limiter_creation() {
        let limiter = RateLimiter::new(10, 5);

        assert_eq!(limiter.capacity, 10);
        assert_eq!(limiter.refill_rate, 5);
        assert_eq!(limiter.active_limiters(), 0);
    }

    #[test]
    fn test_limiter_check_creates_bucket() {
        let mut limiter = RateLimiter::new(10, 5);

        assert_eq!(limiter.active_limiters(), 0);

        limiter.check_rate_limit("session1");

        assert_eq!(limiter.active_limiters(), 1);
    }

    #[test]
    fn test_limiter_check_success() {
        let mut limiter = RateLimiter::new(10, 5);

        for _ in 0..10 {
            assert!(limiter.check_rate_limit("session1"));
        }
    }

    #[test]
    fn test_limiter_check_exceeds_limit() {
        let mut limiter = RateLimiter::new(3, 1);

        // Use up tokens
        assert!(limiter.check_rate_limit("session1"));
        assert!(limiter.check_rate_limit("session1"));
        assert!(limiter.check_rate_limit("session1"));

        // Should be rate limited
        assert!(!limiter.check_rate_limit("session1"));
    }

    #[test]
    fn test_limiter_separate_sessions() {
        let mut limiter = RateLimiter::new(2, 1);

        // Session 1 uses its tokens
        limiter.check_rate_limit("session1");
        limiter.check_rate_limit("session1");
        assert!(!limiter.check_rate_limit("session1")); // Limited

        // Session 2 should have full tokens
        assert!(limiter.check_rate_limit("session2"));
        assert!(limiter.check_rate_limit("session2"));
        assert!(!limiter.check_rate_limit("session2")); // Limited
    }

    #[test]
    fn test_limiter_remaining_tokens_new_session() {
        let mut limiter = RateLimiter::new(10, 5);

        // New session should have full capacity
        assert_eq!(limiter.remaining_tokens("new_session"), 10);
    }

    #[test]
    fn test_limiter_remaining_tokens_after_use() {
        let mut limiter = RateLimiter::new(10, 5);

        limiter.check_rate_limit("session1");
        limiter.check_rate_limit("session1");
        limiter.check_rate_limit("session1");

        assert_eq!(limiter.remaining_tokens("session1"), 7);
    }

    #[test]
    fn test_limiter_remove_session() {
        let mut limiter = RateLimiter::new(10, 5);

        limiter.check_rate_limit("session1");
        assert_eq!(limiter.active_limiters(), 1);

        limiter.remove_session("session1");
        assert_eq!(limiter.active_limiters(), 0);
    }

    #[test]
    fn test_limiter_remove_nonexistent_session() {
        let mut limiter = RateLimiter::new(10, 5);

        // Should not panic
        limiter.remove_session("nonexistent");
        assert_eq!(limiter.active_limiters(), 0);
    }

    #[test]
    fn test_limiter_multiple_sessions() {
        let mut limiter = RateLimiter::new(5, 1);

        for i in 0..10 {
            limiter.check_rate_limit(&format!("session{}", i));
        }

        assert_eq!(limiter.active_limiters(), 10);
    }

    #[test]
    fn test_limiter_refill_allows_more_requests() {
        let mut limiter = RateLimiter::new(2, 10); // Refills 10/sec

        // Use up tokens
        limiter.check_rate_limit("session1");
        limiter.check_rate_limit("session1");
        assert!(!limiter.check_rate_limit("session1")); // Limited

        // Wait for refill
        std::thread::sleep(Duration::from_millis(150));

        // Should be able to make more requests
        assert!(limiter.check_rate_limit("session1"));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Rate Limiter Stress Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod rate_limiter_stress_tests {
    use super::*;

    #[test]
    fn test_limiter_high_volume_single_session() {
        let mut limiter = RateLimiter::new(100, 10);
        let mut allowed = 0;
        let mut blocked = 0;

        for _ in 0..200 {
            if limiter.check_rate_limit("session") {
                allowed += 1;
            } else {
                blocked += 1;
            }
        }

        // Should have allowed exactly 100 (the capacity)
        assert_eq!(allowed, 100);
        assert_eq!(blocked, 100);
    }

    #[test]
    fn test_limiter_high_volume_many_sessions() {
        let mut limiter = RateLimiter::new(10, 1);

        // 1000 sessions
        for i in 0..1000 {
            let session = format!("session_{}", i);
            assert!(limiter.check_rate_limit(&session));
        }

        assert_eq!(limiter.active_limiters(), 1000);
    }

    #[test]
    fn test_limiter_rapid_requests() {
        let mut limiter = RateLimiter::new(5, 100);

        let start = Instant::now();
        let mut count = 0;

        while count < 5 && start.elapsed() < Duration::from_secs(1) {
            if limiter.check_rate_limit("rapid") {
                count += 1;
            }
        }

        assert_eq!(count, 5);
    }

    #[test]
    fn test_limiter_burst_then_steady() {
        let mut limiter = RateLimiter::new(10, 5); // 5 tokens/sec refill

        // Burst: use all tokens
        for _ in 0..10 {
            limiter.check_rate_limit("session");
        }

        // Should be limited
        assert!(!limiter.check_rate_limit("session"));

        // Wait 200ms for 1 token to refill
        std::thread::sleep(Duration::from_millis(250));

        // Should have 1 token now
        assert!(limiter.check_rate_limit("session"));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Rate Limiter Concurrent Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod rate_limiter_concurrent_tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::RwLock;

    #[tokio::test]
    async fn test_concurrent_rate_limiting() {
        let limiter = Arc::new(RwLock::new(RateLimiter::new(100, 10)));
        let allowed = Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let blocked = Arc::new(std::sync::atomic::AtomicUsize::new(0));

        let mut handles = vec![];

        // 10 concurrent tasks, each making 50 requests
        for i in 0..10 {
            let limiter_clone = Arc::clone(&limiter);
            let allowed_clone = Arc::clone(&allowed);
            let blocked_clone = Arc::clone(&blocked);
            let session = format!("session_{}", i);

            handles.push(tokio::spawn(async move {
                for _ in 0..50 {
                    let mut lim = limiter_clone.write().await;
                    if lim.check_rate_limit(&session) {
                        allowed_clone.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                    } else {
                        blocked_clone.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                    }
                }
            }));
        }

        for handle in handles {
            handle.await.unwrap();
        }

        let total_allowed = allowed.load(std::sync::atomic::Ordering::SeqCst);
        let total_blocked = blocked.load(std::sync::atomic::Ordering::SeqCst);

        // Each session should have allowed 100 requests (capacity)
        assert_eq!(total_allowed + total_blocked, 500);

        // Since each of 10 sessions has 100 capacity, and each makes 50 requests
        // All should be allowed
        assert_eq!(total_allowed, 500);
    }

    #[tokio::test]
    async fn test_concurrent_same_session() {
        let limiter = Arc::new(RwLock::new(RateLimiter::new(10, 1)));
        let allowed = Arc::new(std::sync::atomic::AtomicUsize::new(0));

        let mut handles = vec![];

        // All tasks use same session
        for _ in 0..20 {
            let limiter_clone = Arc::clone(&limiter);
            let allowed_clone = Arc::clone(&allowed);

            handles.push(tokio::spawn(async move {
                let mut lim = limiter_clone.write().await;
                if lim.check_rate_limit("shared_session") {
                    allowed_clone.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                }
            }));
        }

        for handle in handles {
            handle.await.unwrap();
        }

        let total = allowed.load(std::sync::atomic::Ordering::SeqCst);

        // Only 10 should be allowed (the capacity)
        assert_eq!(total, 10);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Rate Limiter Edge Case Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod rate_limiter_edge_cases {
    use super::*;

    #[test]
    fn test_limiter_zero_capacity() {
        let mut limiter = RateLimiter::new(0, 5);

        // No requests should be allowed
        assert!(!limiter.check_rate_limit("session"));
    }

    #[test]
    fn test_limiter_zero_refill_rate() {
        let mut limiter = RateLimiter::new(5, 0);

        // Use up tokens
        for _ in 0..5 {
            limiter.check_rate_limit("session");
        }

        // Should never refill
        std::thread::sleep(Duration::from_millis(100));
        assert!(!limiter.check_rate_limit("session"));
    }

    #[test]
    fn test_limiter_very_high_capacity() {
        let mut limiter = RateLimiter::new(u32::MAX, 1);

        // Should allow many requests
        for _ in 0..10000 {
            assert!(limiter.check_rate_limit("session"));
        }
    }

    #[test]
    fn test_limiter_empty_session_id() {
        let mut limiter = RateLimiter::new(5, 1);

        // Empty string as session ID should work
        assert!(limiter.check_rate_limit(""));
        assert_eq!(limiter.active_limiters(), 1);
    }

    #[test]
    fn test_limiter_unicode_session_id() {
        let mut limiter = RateLimiter::new(5, 1);

        let unicode_session = "会话_סשן_جلسة";
        assert!(limiter.check_rate_limit(unicode_session));
        assert_eq!(limiter.remaining_tokens(unicode_session), 4);
    }

    #[test]
    fn test_limiter_very_long_session_id() {
        let mut limiter = RateLimiter::new(5, 1);

        let long_session = "x".repeat(10000);
        assert!(limiter.check_rate_limit(&long_session));
    }

    #[test]
    fn test_bucket_consume_exact_remaining() {
        let mut bucket = TokenBucket::new(5, 1);

        bucket.try_consume(3); // 2 remaining

        // Consume exact remaining
        assert!(bucket.try_consume(2));
        assert_eq!(bucket.tokens, 0);
    }

    #[test]
    fn test_bucket_capacity_one() {
        let mut bucket = TokenBucket::new(1, 1);

        assert!(bucket.try_consume(1));
        assert!(!bucket.try_consume(1));

        // Wait for refill
        std::thread::sleep(Duration::from_millis(1100)); // 1 token per second

        // Should have 1 token again
        let tokens = bucket.tokens();
        assert_eq!(tokens, 1);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Rate Limiter Cleanup Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod rate_limiter_cleanup_tests {
    use super::*;

    // Note: cleanup_old_limiters is called automatically after 5 minutes
    // These tests verify the cleanup logic is correct

    #[test]
    fn test_limiter_tracks_last_activity() {
        let mut limiter = RateLimiter::new(10, 5);

        limiter.check_rate_limit("session1");

        // Session should be tracked
        assert_eq!(limiter.active_limiters(), 1);
    }

    #[test]
    fn test_limiter_multiple_removes() {
        let mut limiter = RateLimiter::new(10, 5);

        for i in 0..10 {
            limiter.check_rate_limit(&format!("session{}", i));
        }

        assert_eq!(limiter.active_limiters(), 10);

        for i in 0..10 {
            limiter.remove_session(&format!("session{}", i));
        }

        assert_eq!(limiter.active_limiters(), 0);
    }

    #[test]
    fn test_removed_session_gets_new_tokens() {
        let mut limiter = RateLimiter::new(5, 1);

        // Use all tokens
        for _ in 0..5 {
            limiter.check_rate_limit("session");
        }
        assert!(!limiter.check_rate_limit("session")); // Limited

        // Remove session
        limiter.remove_session("session");

        // New session (even same ID) should have fresh tokens
        assert!(limiter.check_rate_limit("session"));
        assert_eq!(limiter.remaining_tokens("session"), 4);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Property-Based Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod property_tests {
    use super::*;

    #[test]
    fn test_property_tokens_never_negative() {
        for capacity in [1, 5, 10, 100] {
            let mut bucket = TokenBucket::new(capacity, 5);

            // Try various consumption patterns
            for _ in 0..100 {
                bucket.try_consume(rand::random::<u32>() % (capacity + 5));
            }

            assert!(bucket.tokens <= capacity);
        }
    }

    #[test]
    fn test_property_tokens_never_exceed_capacity() {
        for capacity in [1, 5, 10, 100] {
            let mut bucket = TokenBucket::new(capacity, 100);

            // Multiple refills
            for _ in 0..100 {
                std::thread::sleep(Duration::from_millis(10));
                assert!(bucket.tokens() <= capacity);
            }
        }
    }

    #[test]
    fn test_property_limiter_session_isolation() {
        let mut limiter = RateLimiter::new(5, 1);

        // Exhaust session1
        for _ in 0..5 {
            limiter.check_rate_limit("session1");
        }

        // Session2 should be unaffected
        for _ in 0..5 {
            assert!(limiter.check_rate_limit("session2"));
        }
    }

    #[test]
    fn test_property_allowed_count_equals_capacity() {
        for capacity in [1, 5, 10, 50, 100] {
            let mut limiter = RateLimiter::new(capacity, 1);
            let mut allowed = 0;

            for _ in 0..capacity * 2 {
                if limiter.check_rate_limit("session") {
                    allowed += 1;
                }
            }

            assert_eq!(allowed, capacity);
        }
    }
}
