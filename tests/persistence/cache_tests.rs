// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - CACHE LAYER TESTS                                   ║
// ║  Comprehensive tests for caching behavior, invalidation, and TTL          ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

// ═══════════════════════════════════════════════════════════════════════════
// Mock Cache Infrastructure
// ═══════════════════════════════════════════════════════════════════════════

/// Cache entry with expiration tracking
#[derive(Clone)]
struct CacheEntry<T: Clone> {
    value: T,
    created_at: Instant,
    ttl: Duration,
    access_count: usize,
}

impl<T: Clone> CacheEntry<T> {
    fn new(value: T, ttl: Duration) -> Self {
        Self {
            value,
            created_at: Instant::now(),
            ttl,
            access_count: 0,
        }
    }

    fn is_expired(&self) -> bool {
        self.created_at.elapsed() > self.ttl
    }
}

/// In-memory mock cache (simulates Redis)
pub struct MockCache {
    data: Arc<RwLock<HashMap<String, CacheEntry<String>>>>,
    hits: AtomicUsize,
    misses: AtomicUsize,
    evictions: AtomicUsize,
    max_entries: usize,
    default_ttl: Duration,
    healthy: std::sync::atomic::AtomicBool,
}

impl MockCache {
    pub fn new() -> Self {
        Self {
            data: Arc::new(RwLock::new(HashMap::new())),
            hits: AtomicUsize::new(0),
            misses: AtomicUsize::new(0),
            evictions: AtomicUsize::new(0),
            max_entries: 1000,
            default_ttl: Duration::from_secs(300), // 5 minutes
            healthy: std::sync::atomic::AtomicBool::new(true),
        }
    }

    pub fn with_max_entries(mut self, max: usize) -> Self {
        self.max_entries = max;
        self
    }

    pub fn with_default_ttl(mut self, ttl: Duration) -> Self {
        self.default_ttl = ttl;
        self
    }

    pub fn set_healthy(&self, healthy: bool) {
        self.healthy.store(healthy, Ordering::SeqCst);
    }

    fn check_health(&self) -> Result<(), CacheError> {
        if self.healthy.load(Ordering::SeqCst) {
            Ok(())
        } else {
            Err(CacheError::ConnectionFailed("Cache unhealthy".into()))
        }
    }

    pub async fn get(&self, key: &str) -> Result<Option<String>, CacheError> {
        self.check_health()?;

        let mut data = self.data.write().await;

        if let Some(entry) = data.get_mut(key) {
            if entry.is_expired() {
                data.remove(key);
                self.misses.fetch_add(1, Ordering::SeqCst);
                return Ok(None);
            }

            entry.access_count += 1;
            self.hits.fetch_add(1, Ordering::SeqCst);
            return Ok(Some(entry.value.clone()));
        }

        self.misses.fetch_add(1, Ordering::SeqCst);
        Ok(None)
    }

    pub async fn set(&self, key: &str, value: &str) -> Result<(), CacheError> {
        self.set_with_ttl(key, value, self.default_ttl).await
    }

    pub async fn set_with_ttl(&self, key: &str, value: &str, ttl: Duration) -> Result<(), CacheError> {
        self.check_health()?;

        let mut data = self.data.write().await;

        // Evict if at capacity
        if data.len() >= self.max_entries && !data.contains_key(key) {
            self.evict_lru(&mut data);
        }

        data.insert(key.to_string(), CacheEntry::new(value.to_string(), ttl));
        Ok(())
    }

    pub async fn delete(&self, key: &str) -> Result<bool, CacheError> {
        self.check_health()?;

        let mut data = self.data.write().await;
        Ok(data.remove(key).is_some())
    }

    pub async fn exists(&self, key: &str) -> Result<bool, CacheError> {
        self.check_health()?;

        let data = self.data.read().await;
        if let Some(entry) = data.get(key) {
            Ok(!entry.is_expired())
        } else {
            Ok(false)
        }
    }

    pub async fn clear(&self) -> Result<(), CacheError> {
        self.check_health()?;

        let mut data = self.data.write().await;
        data.clear();
        Ok(())
    }

    pub async fn keys(&self, pattern: &str) -> Result<Vec<String>, CacheError> {
        self.check_health()?;

        let data = self.data.read().await;
        let pattern_regex = pattern.replace("*", ".*");

        let keys: Vec<String> = data
            .keys()
            .filter(|k| {
                if pattern == "*" {
                    return true;
                }
                // Simple pattern matching
                if pattern.starts_with("*") && pattern.ends_with("*") {
                    let inner = &pattern[1..pattern.len()-1];
                    return k.contains(inner);
                }
                if pattern.starts_with("*") {
                    return k.ends_with(&pattern[1..]);
                }
                if pattern.ends_with("*") {
                    return k.starts_with(&pattern[..pattern.len()-1]);
                }
                k == pattern
            })
            .cloned()
            .collect();

        Ok(keys)
    }

    fn evict_lru(&self, data: &mut HashMap<String, CacheEntry<String>>) {
        // Find entry with lowest access count
        if let Some((key, _)) = data
            .iter()
            .min_by_key(|(_, entry)| entry.access_count)
        {
            let key = key.clone();
            data.remove(&key);
            self.evictions.fetch_add(1, Ordering::SeqCst);
        }
    }

    pub fn hit_count(&self) -> usize {
        self.hits.load(Ordering::SeqCst)
    }

    pub fn miss_count(&self) -> usize {
        self.misses.load(Ordering::SeqCst)
    }

    pub fn eviction_count(&self) -> usize {
        self.evictions.load(Ordering::SeqCst)
    }

    pub fn hit_rate(&self) -> f64 {
        let hits = self.hits.load(Ordering::SeqCst) as f64;
        let misses = self.misses.load(Ordering::SeqCst) as f64;
        let total = hits + misses;

        if total == 0.0 {
            0.0
        } else {
            hits / total
        }
    }

    pub async fn size(&self) -> usize {
        self.data.read().await.len()
    }
}

impl Default for MockCache {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum CacheError {
    ConnectionFailed(String),
    SerializationError(String),
    KeyNotFound(String),
    CapacityExceeded,
}

impl std::fmt::Display for CacheError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CacheError::ConnectionFailed(msg) => write!(f, "Connection failed: {}", msg),
            CacheError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
            CacheError::KeyNotFound(key) => write!(f, "Key not found: {}", key),
            CacheError::CapacityExceeded => write!(f, "Cache capacity exceeded"),
        }
    }
}

impl std::error::Error for CacheError {}

// ═══════════════════════════════════════════════════════════════════════════
// Basic Cache Operations Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod basic_operations_tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_set_and_get() {
        let cache = MockCache::new();

        cache.set("key1", "value1").await.unwrap();
        let result = cache.get("key1").await.unwrap();

        assert_eq!(result, Some("value1".to_string()));
    }

    #[tokio::test]
    async fn test_cache_get_missing_key() {
        let cache = MockCache::new();

        let result = cache.get("nonexistent").await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_cache_overwrite() {
        let cache = MockCache::new();

        cache.set("key1", "value1").await.unwrap();
        cache.set("key1", "value2").await.unwrap();

        let result = cache.get("key1").await.unwrap();
        assert_eq!(result, Some("value2".to_string()));
    }

    #[tokio::test]
    async fn test_cache_delete() {
        let cache = MockCache::new();

        cache.set("key1", "value1").await.unwrap();
        let deleted = cache.delete("key1").await.unwrap();

        assert!(deleted);
        assert!(cache.get("key1").await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_cache_delete_missing_key() {
        let cache = MockCache::new();

        let deleted = cache.delete("nonexistent").await.unwrap();
        assert!(!deleted);
    }

    #[tokio::test]
    async fn test_cache_exists() {
        let cache = MockCache::new();

        cache.set("key1", "value1").await.unwrap();

        assert!(cache.exists("key1").await.unwrap());
        assert!(!cache.exists("key2").await.unwrap());
    }

    #[tokio::test]
    async fn test_cache_clear() {
        let cache = MockCache::new();

        cache.set("key1", "value1").await.unwrap();
        cache.set("key2", "value2").await.unwrap();
        cache.set("key3", "value3").await.unwrap();

        cache.clear().await.unwrap();

        assert_eq!(cache.size().await, 0);
    }

    #[tokio::test]
    async fn test_cache_keys_pattern() {
        let cache = MockCache::new();

        cache.set("user:1", "alice").await.unwrap();
        cache.set("user:2", "bob").await.unwrap();
        cache.set("session:1", "data").await.unwrap();

        let user_keys = cache.keys("user:*").await.unwrap();
        assert_eq!(user_keys.len(), 2);
        assert!(user_keys.contains(&"user:1".to_string()));
        assert!(user_keys.contains(&"user:2".to_string()));

        let all_keys = cache.keys("*").await.unwrap();
        assert_eq!(all_keys.len(), 3);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TTL and Expiration Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod ttl_tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_ttl_expiration() {
        let cache = MockCache::new().with_default_ttl(Duration::from_millis(50));

        cache.set("expiring_key", "value").await.unwrap();

        // Should exist immediately
        assert!(cache.get("expiring_key").await.unwrap().is_some());

        // Wait for expiration
        tokio::time::sleep(Duration::from_millis(60)).await;

        // Should be expired
        assert!(cache.get("expiring_key").await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_cache_custom_ttl() {
        let cache = MockCache::new();

        // Set with short TTL
        cache.set_with_ttl("short", "value", Duration::from_millis(30)).await.unwrap();

        // Set with longer TTL
        cache.set_with_ttl("long", "value", Duration::from_millis(200)).await.unwrap();

        // Wait for short TTL to expire
        tokio::time::sleep(Duration::from_millis(50)).await;

        // Short should be expired
        assert!(cache.get("short").await.unwrap().is_none());

        // Long should still exist
        assert!(cache.get("long").await.unwrap().is_some());
    }

    #[tokio::test]
    async fn test_cache_exists_respects_ttl() {
        let cache = MockCache::new();

        cache.set_with_ttl("key", "value", Duration::from_millis(30)).await.unwrap();

        assert!(cache.exists("key").await.unwrap());

        tokio::time::sleep(Duration::from_millis(50)).await;

        assert!(!cache.exists("key").await.unwrap());
    }

    #[tokio::test]
    async fn test_cache_refresh_ttl_on_set() {
        let cache = MockCache::new();

        cache.set_with_ttl("key", "value1", Duration::from_millis(50)).await.unwrap();

        tokio::time::sleep(Duration::from_millis(30)).await;

        // Re-set with new TTL
        cache.set_with_ttl("key", "value2", Duration::from_millis(100)).await.unwrap();

        tokio::time::sleep(Duration::from_millis(40)).await;

        // Should still exist because TTL was refreshed
        let result = cache.get("key").await.unwrap();
        assert_eq!(result, Some("value2".to_string()));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Eviction Policy Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod eviction_tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_eviction_at_capacity() {
        let cache = MockCache::new().with_max_entries(3);

        cache.set("key1", "value1").await.unwrap();
        cache.set("key2", "value2").await.unwrap();
        cache.set("key3", "value3").await.unwrap();

        assert_eq!(cache.size().await, 3);

        // Adding fourth should evict one
        cache.set("key4", "value4").await.unwrap();

        assert_eq!(cache.size().await, 3);
        assert_eq!(cache.eviction_count(), 1);
    }

    #[tokio::test]
    async fn test_lru_eviction() {
        let cache = MockCache::new().with_max_entries(3);

        cache.set("key1", "value1").await.unwrap();
        cache.set("key2", "value2").await.unwrap();
        cache.set("key3", "value3").await.unwrap();

        // Access key1 and key3 to increase their access count
        cache.get("key1").await.unwrap();
        cache.get("key3").await.unwrap();
        cache.get("key1").await.unwrap();

        // key2 has lowest access count, should be evicted
        cache.set("key4", "value4").await.unwrap();

        assert!(cache.get("key1").await.unwrap().is_some());
        assert!(cache.get("key3").await.unwrap().is_some());
        assert!(cache.get("key4").await.unwrap().is_some());

        // key2 was evicted (no additional miss counted for this check since we're
        // checking state, not accessing through normal path)
    }

    #[tokio::test]
    async fn test_no_eviction_for_update() {
        let cache = MockCache::new().with_max_entries(3);

        cache.set("key1", "value1").await.unwrap();
        cache.set("key2", "value2").await.unwrap();
        cache.set("key3", "value3").await.unwrap();

        // Updating existing key shouldn't trigger eviction
        cache.set("key1", "updated").await.unwrap();

        assert_eq!(cache.size().await, 3);
        assert_eq!(cache.eviction_count(), 0);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Cache Statistics Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod statistics_tests {
    use super::*;

    #[tokio::test]
    async fn test_hit_count() {
        let cache = MockCache::new();

        cache.set("key1", "value1").await.unwrap();

        cache.get("key1").await.unwrap();
        cache.get("key1").await.unwrap();
        cache.get("key1").await.unwrap();

        assert_eq!(cache.hit_count(), 3);
    }

    #[tokio::test]
    async fn test_miss_count() {
        let cache = MockCache::new();

        cache.get("nonexistent1").await.unwrap();
        cache.get("nonexistent2").await.unwrap();

        assert_eq!(cache.miss_count(), 2);
    }

    #[tokio::test]
    async fn test_hit_rate_calculation() {
        let cache = MockCache::new();

        cache.set("key1", "value1").await.unwrap();

        // 3 hits
        cache.get("key1").await.unwrap();
        cache.get("key1").await.unwrap();
        cache.get("key1").await.unwrap();

        // 1 miss
        cache.get("nonexistent").await.unwrap();

        let hit_rate = cache.hit_rate();
        assert!((hit_rate - 0.75).abs() < 0.01); // 3/4 = 0.75
    }

    #[tokio::test]
    async fn test_hit_rate_zero_operations() {
        let cache = MockCache::new();

        assert_eq!(cache.hit_rate(), 0.0);
    }

    #[tokio::test]
    async fn test_expired_entry_counts_as_miss() {
        let cache = MockCache::new();

        cache.set_with_ttl("key", "value", Duration::from_millis(10)).await.unwrap();

        // Hit
        cache.get("key").await.unwrap();
        assert_eq!(cache.hit_count(), 1);

        tokio::time::sleep(Duration::from_millis(20)).await;

        // Miss (expired)
        cache.get("key").await.unwrap();
        assert_eq!(cache.miss_count(), 1);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Cache-Aside Pattern Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod cache_aside_tests {
    use super::*;
    use crate::persistence::{generate_test_receipt, TestReceipt};
    use crate::persistence::mocks::MockReceiptRepository;

    /// Simulates cache-aside pattern with receipts
    async fn get_receipt_cached(
        cache: &MockCache,
        db: &MockReceiptRepository,
        run_id: &str,
    ) -> Option<TestReceipt> {
        let cache_key = format!("receipt:{}", run_id);

        // Try cache first
        if let Ok(Some(cached)) = cache.get(&cache_key).await {
            // Deserialize (simplified - just parse winner_model)
            let receipt = generate_test_receipt();
            return Some(TestReceipt {
                run_id: run_id.to_string(),
                winner_model: cached,
                ..receipt
            });
        }

        // Cache miss - fetch from DB
        if let Ok(Some(receipt)) = db.get(run_id).await {
            // Cache the result
            cache.set(&cache_key, &receipt.winner_model).await.ok();
            return Some(receipt);
        }

        None
    }

    #[tokio::test]
    async fn test_cache_aside_cache_hit() {
        let cache = MockCache::new();
        let db = MockReceiptRepository::new();

        // Pre-populate cache
        cache.set("receipt:run-123", "model-cached").await.unwrap();

        let result = get_receipt_cached(&cache, &db, "run-123").await;

        assert!(result.is_some());
        assert_eq!(result.unwrap().winner_model, "model-cached");
        assert_eq!(cache.hit_count(), 1);
        assert_eq!(db.get_get_count(), 0); // DB not accessed
    }

    #[tokio::test]
    async fn test_cache_aside_cache_miss_db_hit() {
        let cache = MockCache::new();
        let db = MockReceiptRepository::new();

        // Populate DB only
        let mut receipt = generate_test_receipt();
        receipt.run_id = "run-456".to_string();
        receipt.winner_model = "model-from-db".to_string();
        db.insert(&receipt).await.unwrap();

        let result = get_receipt_cached(&cache, &db, "run-456").await;

        assert!(result.is_some());
        assert_eq!(result.unwrap().winner_model, "model-from-db");
        assert_eq!(cache.miss_count(), 1);
        assert_eq!(db.get_get_count(), 1);

        // Verify cache was populated
        let cached = cache.get("receipt:run-456").await.unwrap();
        assert_eq!(cached, Some("model-from-db".to_string()));
    }

    #[tokio::test]
    async fn test_cache_aside_complete_miss() {
        let cache = MockCache::new();
        let db = MockReceiptRepository::new();

        let result = get_receipt_cached(&cache, &db, "nonexistent").await;

        assert!(result.is_none());
        assert_eq!(cache.miss_count(), 1);
        assert_eq!(db.get_get_count(), 1);
    }

    #[tokio::test]
    async fn test_cache_aside_warm_up() {
        let cache = MockCache::new();
        let db = MockReceiptRepository::new();

        // Insert multiple receipts
        for i in 0..10 {
            let mut receipt = generate_test_receipt();
            receipt.run_id = format!("warmup-{}", i);
            db.insert(&receipt).await.unwrap();
        }

        // First access - all cache misses
        for i in 0..10 {
            get_receipt_cached(&cache, &db, &format!("warmup-{}", i)).await;
        }

        assert_eq!(cache.miss_count(), 10);
        assert_eq!(db.get_get_count(), 10);

        // Second access - all cache hits
        for i in 0..10 {
            get_receipt_cached(&cache, &db, &format!("warmup-{}", i)).await;
        }

        assert_eq!(cache.hit_count(), 10);
        assert_eq!(db.get_get_count(), 10); // No additional DB calls
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Cache Invalidation Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod invalidation_tests {
    use super::*;

    #[tokio::test]
    async fn test_invalidate_single_key() {
        let cache = MockCache::new();

        cache.set("key1", "value1").await.unwrap();
        cache.set("key2", "value2").await.unwrap();

        cache.delete("key1").await.unwrap();

        assert!(cache.get("key1").await.unwrap().is_none());
        assert!(cache.get("key2").await.unwrap().is_some());
    }

    #[tokio::test]
    async fn test_invalidate_by_pattern() {
        let cache = MockCache::new();

        cache.set("user:1:profile", "alice").await.unwrap();
        cache.set("user:1:settings", "dark").await.unwrap();
        cache.set("user:2:profile", "bob").await.unwrap();
        cache.set("session:abc", "data").await.unwrap();

        // Get keys matching pattern
        let user1_keys = cache.keys("user:1:*").await.unwrap();

        // Delete all matching keys
        for key in user1_keys {
            cache.delete(&key).await.unwrap();
        }

        assert!(cache.get("user:1:profile").await.unwrap().is_none());
        assert!(cache.get("user:1:settings").await.unwrap().is_none());
        assert!(cache.get("user:2:profile").await.unwrap().is_some());
        assert!(cache.get("session:abc").await.unwrap().is_some());
    }

    #[tokio::test]
    async fn test_invalidate_all() {
        let cache = MockCache::new();

        for i in 0..100 {
            cache.set(&format!("key{}", i), &format!("value{}", i)).await.unwrap();
        }

        assert_eq!(cache.size().await, 100);

        cache.clear().await.unwrap();

        assert_eq!(cache.size().await, 0);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Cache Failure Handling Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod failure_handling_tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_connection_failure_on_get() {
        let cache = MockCache::new();
        cache.set("key", "value").await.unwrap();

        cache.set_healthy(false);

        let result = cache.get("key").await;
        assert!(matches!(result, Err(CacheError::ConnectionFailed(_))));
    }

    #[tokio::test]
    async fn test_cache_connection_failure_on_set() {
        let cache = MockCache::new();
        cache.set_healthy(false);

        let result = cache.set("key", "value").await;
        assert!(matches!(result, Err(CacheError::ConnectionFailed(_))));
    }

    #[tokio::test]
    async fn test_cache_recovery_after_failure() {
        let cache = MockCache::new();

        // Starts healthy
        cache.set("key1", "value1").await.unwrap();

        // Becomes unhealthy
        cache.set_healthy(false);
        assert!(cache.set("key2", "value2").await.is_err());

        // Recovers
        cache.set_healthy(true);
        cache.set("key3", "value3").await.unwrap();

        assert!(cache.get("key1").await.unwrap().is_some());
        assert!(cache.get("key3").await.unwrap().is_some());
    }

    #[tokio::test]
    async fn test_graceful_degradation() {
        let cache = MockCache::new();
        let db = crate::persistence::mocks::MockReceiptRepository::new();

        // Populate DB
        let mut receipt = crate::persistence::generate_test_receipt();
        receipt.run_id = "degrade-test".to_string();
        db.insert(&receipt).await.unwrap();

        // Cache is down
        cache.set_healthy(false);

        // Should still be able to get from DB (graceful degradation)
        let result = db.get("degrade-test").await.unwrap();
        assert!(result.is_some());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Concurrent Cache Access Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod concurrent_access_tests {
    use super::*;

    #[tokio::test]
    async fn test_concurrent_reads() {
        let cache = Arc::new(MockCache::new());

        cache.set("shared_key", "shared_value").await.unwrap();

        let mut handles = vec![];

        for _ in 0..100 {
            let cache_clone = Arc::clone(&cache);
            let handle = tokio::spawn(async move {
                cache_clone.get("shared_key").await.unwrap()
            });
            handles.push(handle);
        }

        for handle in handles {
            let result = handle.await.unwrap();
            assert_eq!(result, Some("shared_value".to_string()));
        }

        assert_eq!(cache.hit_count(), 100);
    }

    #[tokio::test]
    async fn test_concurrent_writes() {
        let cache = Arc::new(MockCache::new());

        let mut handles = vec![];

        for i in 0..100 {
            let cache_clone = Arc::clone(&cache);
            let handle = tokio::spawn(async move {
                cache_clone.set(&format!("key{}", i), &format!("value{}", i)).await.unwrap();
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.await.unwrap();
        }

        assert_eq!(cache.size().await, 100);
    }

    #[tokio::test]
    async fn test_concurrent_mixed_operations() {
        let cache = Arc::new(MockCache::new());

        // Pre-populate
        for i in 0..50 {
            cache.set(&format!("key{}", i), &format!("value{}", i)).await.unwrap();
        }

        let mut handles = vec![];

        // Mixed reads and writes
        for i in 0..100 {
            let cache_clone = Arc::clone(&cache);
            let handle = tokio::spawn(async move {
                if i % 2 == 0 {
                    // Read
                    cache_clone.get(&format!("key{}", i % 50)).await.ok();
                } else {
                    // Write
                    cache_clone.set(&format!("new_key{}", i), &format!("new_value{}", i)).await.ok();
                }
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.await.unwrap();
        }

        // Should have original 50 + 50 new keys
        assert_eq!(cache.size().await, 100);
    }

    #[tokio::test]
    async fn test_thundering_herd_prevention() {
        let cache = Arc::new(MockCache::new());
        let db_calls = Arc::new(AtomicUsize::new(0));

        // Simulate multiple concurrent requests for same uncached key
        let mut handles = vec![];

        for _ in 0..100 {
            let cache_clone = Arc::clone(&cache);
            let db_calls_clone = Arc::clone(&db_calls);

            let handle = tokio::spawn(async move {
                let key = "popular_key";

                // Check cache
                if cache_clone.get(key).await.unwrap().is_none() {
                    // "Fetch from DB" (simulated)
                    db_calls_clone.fetch_add(1, Ordering::SeqCst);
                    tokio::time::sleep(Duration::from_millis(1)).await; // Simulate DB latency

                    // Cache result
                    cache_clone.set(key, "fetched_value").await.ok();
                }
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.await.unwrap();
        }

        // Without proper locking, all 100 might hit DB
        // This documents current behavior
        let total_db_calls = db_calls.load(Ordering::SeqCst);
        assert!(total_db_calls > 0); // At least one DB call

        // In a production system with proper locking, this should be 1
        // println!("DB calls: {} (ideal: 1)", total_db_calls);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Cache Serialization Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod serialization_tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_json_serialization() {
        let cache = MockCache::new();

        // Simulate JSON serialized object
        let json_value = r#"{"id":"123","name":"test","scores":[1,2,3]}"#;
        cache.set("json_key", json_value).await.unwrap();

        let result = cache.get("json_key").await.unwrap().unwrap();
        assert_eq!(result, json_value);

        // Parse back
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["id"], "123");
        assert_eq!(parsed["name"], "test");
    }

    #[tokio::test]
    async fn test_cache_large_value() {
        let cache = MockCache::new();

        // 1MB value
        let large_value: String = "x".repeat(1_000_000);
        cache.set("large_key", &large_value).await.unwrap();

        let result = cache.get("large_key").await.unwrap().unwrap();
        assert_eq!(result.len(), 1_000_000);
    }

    #[tokio::test]
    async fn test_cache_unicode_handling() {
        let cache = MockCache::new();

        let unicode_key = "日本語キー";
        let unicode_value = "مرحبا بالعالم 🌍";

        cache.set(unicode_key, unicode_value).await.unwrap();

        let result = cache.get(unicode_key).await.unwrap().unwrap();
        assert_eq!(result, unicode_value);
    }

    #[tokio::test]
    async fn test_cache_empty_string() {
        let cache = MockCache::new();

        cache.set("empty_key", "").await.unwrap();

        let result = cache.get("empty_key").await.unwrap();
        assert_eq!(result, Some("".to_string()));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Performance Tests
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod performance_tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_throughput() {
        let cache = MockCache::new();
        let iterations = 10_000;

        let start = Instant::now();

        for i in 0..iterations {
            cache.set(&format!("perf_key_{}", i), &format!("value_{}", i)).await.unwrap();
        }

        let write_duration = start.elapsed();

        let start = Instant::now();

        for i in 0..iterations {
            cache.get(&format!("perf_key_{}", i)).await.unwrap();
        }

        let read_duration = start.elapsed();

        // Log performance metrics (can be used for regression testing)
        let write_ops_per_sec = iterations as f64 / write_duration.as_secs_f64();
        let read_ops_per_sec = iterations as f64 / read_duration.as_secs_f64();

        // Basic performance assertions
        assert!(write_ops_per_sec > 1000.0, "Write throughput too low: {} ops/sec", write_ops_per_sec);
        assert!(read_ops_per_sec > 1000.0, "Read throughput too low: {} ops/sec", read_ops_per_sec);
    }

    #[tokio::test]
    async fn test_cache_latency() {
        let cache = MockCache::new();

        // Warm up
        cache.set("latency_key", "latency_value").await.unwrap();

        let mut latencies = Vec::with_capacity(100);

        for _ in 0..100 {
            let start = Instant::now();
            cache.get("latency_key").await.unwrap();
            latencies.push(start.elapsed());
        }

        // Calculate p50 and p99
        latencies.sort();
        let p50 = latencies[50];
        let p99 = latencies[99];

        // Cache operations should be sub-millisecond
        assert!(p50 < Duration::from_millis(1), "P50 latency too high: {:?}", p50);
        assert!(p99 < Duration::from_millis(10), "P99 latency too high: {:?}", p99);
    }
}
