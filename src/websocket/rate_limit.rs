// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - RATE LIMITING                                      ║
// ║  Token bucket rate limiting for WebSocket messages                       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use std::collections::HashMap;
use std::time::{Duration, Instant};

/// Token bucket rate limiter
#[derive(Debug, Clone)]
pub struct TokenBucket {
    /// Maximum tokens
    capacity: u32,
    /// Current tokens
    tokens: u32,
    /// Token refill rate (tokens per second)
    refill_rate: u32,
    /// Last refill time
    last_refill: Instant,
}

impl TokenBucket {
    /// Create new token bucket
    pub fn new(capacity: u32, refill_rate: u32) -> Self {
        Self {
            capacity,
            tokens: capacity,
            refill_rate,
            last_refill: Instant::now(),
        }
    }

    /// Refill tokens based on elapsed time
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill);
        let tokens_to_add = (elapsed.as_secs_f64() * self.refill_rate as f64) as u32;

        if tokens_to_add > 0 {
            self.tokens = (self.tokens + tokens_to_add).min(self.capacity);
            self.last_refill = now;
        }
    }

    /// Try to consume tokens
    pub fn try_consume(&mut self, count: u32) -> bool {
        self.refill();

        if self.tokens >= count {
            self.tokens -= count;
            true
        } else {
            false
        }
    }

    /// Get current token count
    pub fn tokens(&mut self) -> u32 {
        self.refill();
        self.tokens
    }

    /// Get time until next token is available
    pub fn time_until_available(&self) -> Option<Duration> {
        if self.tokens >= 1 {
            None
        } else {
            let time_per_token = Duration::from_secs_f64(1.0 / self.refill_rate as f64);
            Some(time_per_token)
        }
    }
}

/// Rate limiter for multiple clients
pub struct RateLimiter {
    /// Rate limiters per session
    limiters: HashMap<String, TokenBucket>,
    /// Default capacity
    capacity: u32,
    /// Default refill rate
    refill_rate: u32,
    /// Cleanup interval
    last_cleanup: Instant,
}

impl RateLimiter {
    /// Create new rate limiter
    pub fn new(capacity: u32, refill_rate: u32) -> Self {
        Self {
            limiters: HashMap::new(),
            capacity,
            refill_rate,
            last_cleanup: Instant::now(),
        }
    }

    /// Check if request is allowed for session
    pub fn check_rate_limit(&mut self, session_id: &str) -> bool {
        // Clean up old limiters periodically
        if self.last_cleanup.elapsed() > Duration::from_secs(300) {
            self.cleanup_old_limiters();
        }

        let limiter = self
            .limiters
            .entry(session_id.to_string())
            .or_insert_with(|| TokenBucket::new(self.capacity, self.refill_rate));

        limiter.try_consume(1)
    }

    /// Get remaining tokens for session
    pub fn remaining_tokens(&mut self, session_id: &str) -> u32 {
        self.limiters
            .get_mut(session_id)
            .map(|limiter| limiter.tokens())
            .unwrap_or(self.capacity)
    }

    /// Remove rate limiter for session
    pub fn remove_session(&mut self, session_id: &str) {
        self.limiters.remove(session_id);
    }

    /// Clean up inactive limiters
    fn cleanup_old_limiters(&mut self) {
        // Remove limiters that haven't been used in 5 minutes
        let cutoff = Instant::now() - Duration::from_secs(300);
        self.limiters
            .retain(|_, limiter| limiter.last_refill > cutoff);
        self.last_cleanup = Instant::now();
    }

    /// Get number of active limiters
    pub fn active_limiters(&self) -> usize {
        self.limiters.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_token_bucket_creation() {
        let bucket = TokenBucket::new(10, 5);
        assert_eq!(bucket.capacity, 10);
        assert_eq!(bucket.tokens, 10);
        assert_eq!(bucket.refill_rate, 5);
    }

    #[test]
    fn test_token_consumption() {
        let mut bucket = TokenBucket::new(10, 5);

        assert!(bucket.try_consume(5));
        assert_eq!(bucket.tokens, 5);

        assert!(bucket.try_consume(5));
        assert_eq!(bucket.tokens, 0);

        assert!(!bucket.try_consume(1));
    }

    #[test]
    fn test_token_refill() {
        let mut bucket = TokenBucket::new(10, 10);

        // Consume all tokens
        bucket.try_consume(10);
        assert_eq!(bucket.tokens, 0);

        // Wait for refill
        thread::sleep(Duration::from_millis(200));

        // Should have refilled some tokens (at least 1)
        assert!(bucket.tokens() > 0);
    }

    #[test]
    fn test_token_bucket_max_capacity() {
        let mut bucket = TokenBucket::new(5, 100);

        // Wait to accumulate tokens
        thread::sleep(Duration::from_millis(100));

        // Should not exceed capacity
        assert!(bucket.tokens() <= 5);
    }

    #[test]
    fn test_rate_limiter_creation() {
        let limiter = RateLimiter::new(10, 5);
        assert_eq!(limiter.capacity, 10);
        assert_eq!(limiter.refill_rate, 5);
        assert_eq!(limiter.active_limiters(), 0);
    }

    #[test]
    fn test_rate_limiter_check() {
        let mut limiter = RateLimiter::new(3, 1);

        assert!(limiter.check_rate_limit("session1"));
        assert!(limiter.check_rate_limit("session1"));
        assert!(limiter.check_rate_limit("session1"));
        assert!(!limiter.check_rate_limit("session1"));

        assert_eq!(limiter.active_limiters(), 1);
    }

    #[test]
    fn test_rate_limiter_multiple_sessions() {
        let mut limiter = RateLimiter::new(2, 1);

        assert!(limiter.check_rate_limit("session1"));
        assert!(limiter.check_rate_limit("session2"));

        assert_eq!(limiter.active_limiters(), 2);
    }

    #[test]
    fn test_rate_limiter_remove_session() {
        let mut limiter = RateLimiter::new(10, 5);

        limiter.check_rate_limit("session1");
        assert_eq!(limiter.active_limiters(), 1);

        limiter.remove_session("session1");
        assert_eq!(limiter.active_limiters(), 0);
    }

    #[test]
    fn test_remaining_tokens() {
        let mut limiter = RateLimiter::new(10, 5);

        assert_eq!(limiter.remaining_tokens("session1"), 10);

        limiter.check_rate_limit("session1");
        assert_eq!(limiter.remaining_tokens("session1"), 9);
    }
}
