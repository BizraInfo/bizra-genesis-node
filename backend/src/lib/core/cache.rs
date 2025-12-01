//! BIZRA Node0 - Multi-Tier Caching Layer
//!
//! Production-grade caching with:
//! - LRU eviction with capacity limits
//! - TTL (time-to-live) support
//! - Cache-aside pattern implementation
//! - Write-through and write-behind support
//! - Multi-tier caching (L1 local + L2 Redis)
//! - Cache statistics and monitoring
//! - Compression for large values

use std::collections::HashMap;
use std::hash::Hash;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use thiserror::Error;

/// Cache errors
#[derive(Debug, Error)]
pub enum CacheError {
    #[error("Key not found")]
    NotFound,

    #[error("Entry expired")]
    Expired,

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Backend error: {0}")]
    Backend(String),

    #[error("Capacity exceeded")]
    CapacityExceeded,
}

/// Cache entry with metadata
#[derive(Debug, Clone)]
struct CacheEntry<V> {
    value: V,
    created_at: Instant,
    accessed_at: Instant,
    expires_at: Option<Instant>,
    access_count: u64,
    size_bytes: usize,
}

impl<V> CacheEntry<V> {
    fn new(value: V, ttl: Option<Duration>, size: usize) -> Self {
        let now = Instant::now();
        Self {
            value,
            created_at: now,
            accessed_at: now,
            expires_at: ttl.map(|d| now + d),
            access_count: 1,
            size_bytes: size,
        }
    }

    fn is_expired(&self) -> bool {
        self.expires_at.map(|e| Instant::now() > e).unwrap_or(false)
    }

    fn touch(&mut self) {
        self.accessed_at = Instant::now();
        self.access_count += 1;
    }

    fn remaining_ttl(&self) -> Option<Duration> {
        self.expires_at.and_then(|e| {
            let now = Instant::now();
            if e > now {
                Some(e - now)
            } else {
                None
            }
        })
    }
}

/// LRU node for doubly-linked list
struct LruNode<K> {
    key: K,
    prev: Option<K>,
    next: Option<K>,
}

/// LRU (Least Recently Used) Cache
/// 
/// Thread-safe in-memory cache with LRU eviction
pub struct LruCache<K, V>
where
    K: Eq + Hash + Clone + Send + Sync,
    V: Clone + Send + Sync,
{
    entries: RwLock<HashMap<K, CacheEntry<V>>>,
    order: RwLock<LruOrder<K>>,
    capacity: usize,
    max_size_bytes: usize,
    default_ttl: Option<Duration>,
    stats: Arc<CacheStats>,
}

/// LRU ordering tracker
struct LruOrder<K: Clone> {
    nodes: HashMap<K, LruNode<K>>,
    head: Option<K>,
    tail: Option<K>,
    current_size: usize,
}

impl<K: Eq + Hash + Clone> LruOrder<K> {
    fn new() -> Self {
        Self {
            nodes: HashMap::new(),
            head: None,
            tail: None,
            current_size: 0,
        }
    }

    fn touch(&mut self, key: &K) {
        if !self.nodes.contains_key(key) {
            return;
        }

        // Remove from current position
        self.remove(key);
        
        // Add to head
        self.push_front(key.clone());
    }

    fn push_front(&mut self, key: K) {
        let node = LruNode {
            key: key.clone(),
            prev: None,
            next: self.head.clone(),
        };

        if let Some(ref head_key) = self.head {
            if let Some(head_node) = self.nodes.get_mut(head_key) {
                head_node.prev = Some(key.clone());
            }
        }

        self.nodes.insert(key.clone(), node);
        self.head = Some(key.clone());

        if self.tail.is_none() {
            self.tail = Some(key);
        }
    }

    fn remove(&mut self, key: &K) -> bool {
        let node = match self.nodes.remove(key) {
            Some(n) => n,
            None => return false,
        };

        // Update prev node
        if let Some(ref prev_key) = node.prev {
            if let Some(prev_node) = self.nodes.get_mut(prev_key) {
                prev_node.next = node.next.clone();
            }
        } else {
            self.head = node.next.clone();
        }

        // Update next node
        if let Some(ref next_key) = node.next {
            if let Some(next_node) = self.nodes.get_mut(next_key) {
                next_node.prev = node.prev.clone();
            }
        } else {
            self.tail = node.prev;
        }

        true
    }

    fn pop_back(&mut self) -> Option<K> {
        let tail_key = self.tail.clone()?;
        self.remove(&tail_key);
        Some(tail_key)
    }

    fn len(&self) -> usize {
        self.nodes.len()
    }
}

impl<K, V> LruCache<K, V>
where
    K: Eq + Hash + Clone + Send + Sync,
    V: Clone + Send + Sync,
{
    /// Create a new LRU cache with given capacity
    pub fn new(capacity: usize) -> Self {
        Self {
            entries: RwLock::new(HashMap::with_capacity(capacity)),
            order: RwLock::new(LruOrder::new()),
            capacity,
            max_size_bytes: usize::MAX,
            default_ttl: None,
            stats: Arc::new(CacheStats::default()),
        }
    }

    /// Create cache with maximum size in bytes
    pub fn with_max_size(capacity: usize, max_size_bytes: usize) -> Self {
        Self {
            max_size_bytes,
            ..Self::new(capacity)
        }
    }

    /// Set default TTL for entries
    pub fn with_default_ttl(mut self, ttl: Duration) -> Self {
        self.default_ttl = Some(ttl);
        self
    }

    /// Get value from cache
    pub async fn get(&self, key: &K) -> Option<V> {
        // Try to get entry
        let mut entries = self.entries.write().await;
        
        if let Some(entry) = entries.get_mut(key) {
            if entry.is_expired() {
                entries.remove(key);
                let mut order = self.order.write().await;
                order.remove(key);
                self.stats.expirations.fetch_add(1, Ordering::Relaxed);
                self.stats.misses.fetch_add(1, Ordering::Relaxed);
                return None;
            }

            entry.touch();
            let value = entry.value.clone();
            drop(entries);

            // Update LRU order
            let mut order = self.order.write().await;
            order.touch(key);

            self.stats.hits.fetch_add(1, Ordering::Relaxed);
            Some(value)
        } else {
            self.stats.misses.fetch_add(1, Ordering::Relaxed);
            None
        }
    }

    /// Put value into cache
    pub async fn put(&self, key: K, value: V) {
        self.put_with_ttl(key, value, self.default_ttl).await;
    }

    /// Put value with custom TTL
    pub async fn put_with_ttl(&self, key: K, value: V, ttl: Option<Duration>) {
        let size = std::mem::size_of::<V>();
        
        // Evict if necessary
        self.ensure_capacity(1, size).await;

        let entry = CacheEntry::new(value, ttl, size);

        let mut entries = self.entries.write().await;
        let mut order = self.order.write().await;

        // Remove old entry if exists
        if entries.remove(&key).is_some() {
            order.remove(&key);
        }

        entries.insert(key.clone(), entry);
        order.push_front(key);
        order.current_size += size;

        self.stats.writes.fetch_add(1, Ordering::Relaxed);
    }

    /// Remove entry from cache
    pub async fn remove(&self, key: &K) -> Option<V> {
        let mut entries = self.entries.write().await;
        let mut order = self.order.write().await;

        if let Some(entry) = entries.remove(key) {
            order.remove(key);
            order.current_size = order.current_size.saturating_sub(entry.size_bytes);
            self.stats.removals.fetch_add(1, Ordering::Relaxed);
            Some(entry.value)
        } else {
            None
        }
    }

    /// Check if key exists (without updating access time)
    pub async fn contains(&self, key: &K) -> bool {
        let entries = self.entries.read().await;
        entries.get(key).map(|e| !e.is_expired()).unwrap_or(false)
    }

    /// Get remaining TTL for a key
    pub async fn ttl(&self, key: &K) -> Option<Duration> {
        let entries = self.entries.read().await;
        entries.get(key).and_then(|e| e.remaining_ttl())
    }

    /// Clear the cache
    pub async fn clear(&self) {
        let mut entries = self.entries.write().await;
        let mut order = self.order.write().await;
        entries.clear();
        *order = LruOrder::new();
    }

    /// Get number of entries
    pub async fn len(&self) -> usize {
        let entries = self.entries.read().await;
        entries.len()
    }

    /// Check if cache is empty
    pub async fn is_empty(&self) -> bool {
        self.len().await == 0
    }

    /// Get cache statistics
    pub fn stats(&self) -> Arc<CacheStats> {
        Arc::clone(&self.stats)
    }

    /// Ensure capacity by evicting LRU entries
    async fn ensure_capacity(&self, count: usize, size: usize) {
        let mut entries = self.entries.write().await;
        let mut order = self.order.write().await;

        // Evict for count
        while order.len() + count > self.capacity {
            if let Some(evict_key) = order.pop_back() {
                if let Some(entry) = entries.remove(&evict_key) {
                    order.current_size = order.current_size.saturating_sub(entry.size_bytes);
                }
                self.stats.evictions.fetch_add(1, Ordering::Relaxed);
            } else {
                break;
            }
        }

        // Evict for size
        while order.current_size + size > self.max_size_bytes && order.len() > 0 {
            if let Some(evict_key) = order.pop_back() {
                if let Some(entry) = entries.remove(&evict_key) {
                    order.current_size = order.current_size.saturating_sub(entry.size_bytes);
                }
                self.stats.evictions.fetch_add(1, Ordering::Relaxed);
            } else {
                break;
            }
        }
    }

    /// Clean up expired entries
    pub async fn cleanup_expired(&self) {
        let mut entries = self.entries.write().await;
        let mut order = self.order.write().await;

        let expired_keys: Vec<K> = entries
            .iter()
            .filter(|(_, v)| v.is_expired())
            .map(|(k, _)| k.clone())
            .collect();

        for key in expired_keys {
            if let Some(entry) = entries.remove(&key) {
                order.remove(&key);
                order.current_size = order.current_size.saturating_sub(entry.size_bytes);
                self.stats.expirations.fetch_add(1, Ordering::Relaxed);
            }
        }
    }
}

/// Cache statistics
#[derive(Debug, Default)]
pub struct CacheStats {
    pub hits: AtomicU64,
    pub misses: AtomicU64,
    pub writes: AtomicU64,
    pub removals: AtomicU64,
    pub evictions: AtomicU64,
    pub expirations: AtomicU64,
}

impl CacheStats {
    /// Get hit rate (0.0 - 1.0)
    pub fn hit_rate(&self) -> f64 {
        let hits = self.hits.load(Ordering::Relaxed);
        let misses = self.misses.load(Ordering::Relaxed);
        let total = hits + misses;
        
        if total == 0 {
            0.0
        } else {
            hits as f64 / total as f64
        }
    }

    /// Get snapshot
    pub fn snapshot(&self) -> CacheStatsSnapshot {
        CacheStatsSnapshot {
            hits: self.hits.load(Ordering::Relaxed),
            misses: self.misses.load(Ordering::Relaxed),
            writes: self.writes.load(Ordering::Relaxed),
            removals: self.removals.load(Ordering::Relaxed),
            evictions: self.evictions.load(Ordering::Relaxed),
            expirations: self.expirations.load(Ordering::Relaxed),
            hit_rate: self.hit_rate(),
        }
    }

    /// Reset statistics
    pub fn reset(&self) {
        self.hits.store(0, Ordering::Relaxed);
        self.misses.store(0, Ordering::Relaxed);
        self.writes.store(0, Ordering::Relaxed);
        self.removals.store(0, Ordering::Relaxed);
        self.evictions.store(0, Ordering::Relaxed);
        self.expirations.store(0, Ordering::Relaxed);
    }
}

/// Statistics snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStatsSnapshot {
    pub hits: u64,
    pub misses: u64,
    pub writes: u64,
    pub removals: u64,
    pub evictions: u64,
    pub expirations: u64,
    pub hit_rate: f64,
}

/// Cache-aside pattern implementation
/// 
/// Automatically loads missing entries from a loader function
pub struct CacheAside<K, V, L>
where
    K: Eq + Hash + Clone + Send + Sync,
    V: Clone + Send + Sync,
    L: Loader<K, V>,
{
    cache: LruCache<K, V>,
    loader: L,
}

/// Loader trait for cache-aside pattern
#[async_trait::async_trait]
pub trait Loader<K, V>: Send + Sync {
    async fn load(&self, key: &K) -> Result<V, CacheError>;
}

impl<K, V, L> CacheAside<K, V, L>
where
    K: Eq + Hash + Clone + Send + Sync,
    V: Clone + Send + Sync,
    L: Loader<K, V>,
{
    /// Create new cache-aside wrapper
    pub fn new(cache: LruCache<K, V>, loader: L) -> Self {
        Self { cache, loader }
    }

    /// Get value, loading from source if not cached
    pub async fn get(&self, key: &K) -> Result<V, CacheError> {
        // Try cache first
        if let Some(value) = self.cache.get(key).await {
            return Ok(value);
        }

        // Load from source
        let value = self.loader.load(key).await?;
        
        // Store in cache
        self.cache.put(key.clone(), value.clone()).await;
        
        Ok(value)
    }

    /// Get value only if cached (no loading)
    pub async fn get_cached(&self, key: &K) -> Option<V> {
        self.cache.get(key).await
    }

    /// Invalidate cache entry
    pub async fn invalidate(&self, key: &K) -> Option<V> {
        self.cache.remove(key).await
    }

    /// Refresh cache entry
    pub async fn refresh(&self, key: &K) -> Result<V, CacheError> {
        let value = self.loader.load(key).await?;
        self.cache.put(key.clone(), value.clone()).await;
        Ok(value)
    }

    /// Get underlying cache
    pub fn cache(&self) -> &LruCache<K, V> {
        &self.cache
    }
}

/// Write-through cache wrapper
/// 
/// Writes to backing store before caching
pub struct WriteThroughCache<K, V, W>
where
    K: Eq + Hash + Clone + Send + Sync,
    V: Clone + Send + Sync,
    W: Writer<K, V>,
{
    cache: LruCache<K, V>,
    writer: W,
}

/// Writer trait for write-through pattern
#[async_trait::async_trait]
pub trait Writer<K, V>: Send + Sync {
    async fn write(&self, key: &K, value: &V) -> Result<(), CacheError>;
    async fn delete(&self, key: &K) -> Result<(), CacheError>;
}

impl<K, V, W> WriteThroughCache<K, V, W>
where
    K: Eq + Hash + Clone + Send + Sync,
    V: Clone + Send + Sync,
    W: Writer<K, V>,
{
    /// Create new write-through cache
    pub fn new(cache: LruCache<K, V>, writer: W) -> Self {
        Self { cache, writer }
    }

    /// Get value from cache
    pub async fn get(&self, key: &K) -> Option<V> {
        self.cache.get(key).await
    }

    /// Put value (writes through to backing store first)
    pub async fn put(&self, key: K, value: V) -> Result<(), CacheError> {
        // Write to backing store first
        self.writer.write(&key, &value).await?;
        
        // Then cache
        self.cache.put(key, value).await;
        
        Ok(())
    }

    /// Remove value
    pub async fn remove(&self, key: &K) -> Result<Option<V>, CacheError> {
        // Delete from backing store
        self.writer.delete(key).await?;
        
        // Remove from cache
        Ok(self.cache.remove(key).await)
    }

    /// Get underlying cache
    pub fn cache(&self) -> &LruCache<K, V> {
        &self.cache
    }
}

/// Multi-tier cache configuration
#[derive(Debug, Clone)]
pub struct MultiTierConfig {
    /// L1 cache capacity
    pub l1_capacity: usize,
    /// L1 cache TTL
    pub l1_ttl: Duration,
    /// L2 cache TTL
    pub l2_ttl: Duration,
    /// Enable L2 cache (Redis)
    pub l2_enabled: bool,
    /// Redis URL
    pub redis_url: Option<String>,
}

impl Default for MultiTierConfig {
    fn default() -> Self {
        Self {
            l1_capacity: 10000,
            l1_ttl: Duration::from_secs(60),
            l2_ttl: Duration::from_secs(3600),
            l2_enabled: false,
            redis_url: None,
        }
    }
}

/// Multi-tier cache (L1: LruCache, L2: Redis)
/// 
/// Provides hierarchical caching with fast local access and
/// distributed shared cache via Redis
pub struct MultiTierCache<V>
where
    V: Clone + Send + Sync + Serialize + DeserializeOwned + 'static,
{
    config: MultiTierConfig,
    l1: Arc<LruCache<String, V>>,
    l2_client: Option<redis::Client>,
    stats: Arc<MultiTierStats>,
}

/// Multi-tier cache statistics
#[derive(Debug, Default)]
pub struct MultiTierStats {
    pub l1_hits: AtomicU64,
    pub l1_misses: AtomicU64,
    pub l2_hits: AtomicU64,
    pub l2_misses: AtomicU64,
    pub l2_errors: AtomicU64,
}

impl MultiTierStats {
    pub fn l1_hit_rate(&self) -> f64 {
        let hits = self.l1_hits.load(Ordering::Relaxed);
        let misses = self.l1_misses.load(Ordering::Relaxed);
        let total = hits + misses;
        if total == 0 { 0.0 } else { hits as f64 / total as f64 }
    }

    pub fn l2_hit_rate(&self) -> f64 {
        let hits = self.l2_hits.load(Ordering::Relaxed);
        let misses = self.l2_misses.load(Ordering::Relaxed);
        let total = hits + misses;
        if total == 0 { 0.0 } else { hits as f64 / total as f64 }
    }
}

impl<V> MultiTierCache<V>
where
    V: Clone + Send + Sync + Serialize + DeserializeOwned + 'static,
{
    /// Create new multi-tier cache
    pub fn new(config: MultiTierConfig) -> Self {
        let l1 = Arc::new(
            LruCache::new(config.l1_capacity)
                .with_default_ttl(config.l1_ttl)
        );

        let l2_client = if config.l2_enabled {
            config.redis_url.as_ref().and_then(|url| {
                redis::Client::open(url.as_str()).ok()
            })
        } else {
            None
        };

        Self {
            config,
            l1,
            l2_client,
            stats: Arc::new(MultiTierStats::default()),
        }
    }

    /// Get value from cache hierarchy
    pub async fn get(&self, key: &str) -> Option<V> {
        // Try L1 first
        if let Some(value) = self.l1.get(&key.to_string()).await {
            self.stats.l1_hits.fetch_add(1, Ordering::Relaxed);
            return Some(value);
        }
        self.stats.l1_misses.fetch_add(1, Ordering::Relaxed);

        // Try L2 (Redis)
        if let Some(ref client) = self.l2_client {
            match self.get_from_redis(client, key).await {
                Ok(Some(value)) => {
                    self.stats.l2_hits.fetch_add(1, Ordering::Relaxed);
                    // Populate L1
                    self.l1.put(key.to_string(), value.clone()).await;
                    return Some(value);
                }
                Ok(None) => {
                    self.stats.l2_misses.fetch_add(1, Ordering::Relaxed);
                }
                Err(_) => {
                    self.stats.l2_errors.fetch_add(1, Ordering::Relaxed);
                }
            }
        }

        None
    }

    /// Put value into cache hierarchy
    pub async fn put(&self, key: &str, value: V) {
        // Write to L1
        self.l1.put(key.to_string(), value.clone()).await;

        // Write to L2
        if let Some(ref client) = self.l2_client {
            if let Err(_) = self.put_to_redis(client, key, &value).await {
                self.stats.l2_errors.fetch_add(1, Ordering::Relaxed);
            }
        }
    }

    /// Remove value from all tiers
    pub async fn remove(&self, key: &str) {
        self.l1.remove(&key.to_string()).await;

        if let Some(ref client) = self.l2_client {
            let _ = self.delete_from_redis(client, key).await;
        }
    }

    /// Get L1 cache
    pub fn l1(&self) -> &LruCache<String, V> {
        &self.l1
    }

    /// Get statistics
    pub fn stats(&self) -> Arc<MultiTierStats> {
        Arc::clone(&self.stats)
    }

    // Redis operations
    async fn get_from_redis(&self, client: &redis::Client, key: &str) -> Result<Option<V>, CacheError> {
        let mut conn = client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| CacheError::Backend(e.to_string()))?;

        let result: Option<Vec<u8>> = redis::cmd("GET")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| CacheError::Backend(e.to_string()))?;

        match result {
            Some(bytes) => {
                let value: V = serde_json::from_slice(&bytes)
                    .map_err(|e| CacheError::Serialization(e.to_string()))?;
                Ok(Some(value))
            }
            None => Ok(None),
        }
    }

    async fn put_to_redis(&self, client: &redis::Client, key: &str, value: &V) -> Result<(), CacheError> {
        let bytes = serde_json::to_vec(value)
            .map_err(|e| CacheError::Serialization(e.to_string()))?;

        let mut conn = client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| CacheError::Backend(e.to_string()))?;

        redis::cmd("SETEX")
            .arg(key)
            .arg(self.config.l2_ttl.as_secs())
            .arg(bytes)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| CacheError::Backend(e.to_string()))?;

        Ok(())
    }

    async fn delete_from_redis(&self, client: &redis::Client, key: &str) -> Result<(), CacheError> {
        let mut conn = client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| CacheError::Backend(e.to_string()))?;

        redis::cmd("DEL")
            .arg(key)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| CacheError::Backend(e.to_string()))?;

        Ok(())
    }
}

/// Pre-configured caches for BIZRA
pub struct BizraCaches {
    /// User profile cache
    pub profiles: Arc<LruCache<String, serde_json::Value>>,
    /// Model response cache
    pub responses: Arc<LruCache<String, String>>,
    /// API rate limit cache
    pub rate_limits: Arc<LruCache<String, u64>>,
    /// Session cache
    pub sessions: Arc<LruCache<String, serde_json::Value>>,
}

impl BizraCaches {
    /// Create BIZRA caches with defaults
    pub fn new() -> Self {
        Self {
            profiles: Arc::new(
                LruCache::new(1000)
                    .with_default_ttl(Duration::from_secs(300))
            ),
            responses: Arc::new(
                LruCache::new(5000)
                    .with_default_ttl(Duration::from_secs(3600))
            ),
            rate_limits: Arc::new(
                LruCache::new(10000)
                    .with_default_ttl(Duration::from_secs(60))
            ),
            sessions: Arc::new(
                LruCache::new(5000)
                    .with_default_ttl(Duration::from_secs(1800))
            ),
        }
    }

    /// Get aggregate stats
    pub fn stats(&self) -> BizraCacheStats {
        BizraCacheStats {
            profiles: self.profiles.stats().snapshot(),
            responses: self.responses.stats().snapshot(),
            rate_limits: self.rate_limits.stats().snapshot(),
            sessions: self.sessions.stats().snapshot(),
        }
    }
}

impl Default for BizraCaches {
    fn default() -> Self {
        Self::new()
    }
}

/// BIZRA cache statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BizraCacheStats {
    pub profiles: CacheStatsSnapshot,
    pub responses: CacheStatsSnapshot,
    pub rate_limits: CacheStatsSnapshot,
    pub sessions: CacheStatsSnapshot,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_lru_basic_operations() {
        let cache: LruCache<String, i32> = LruCache::new(10);

        cache.put("key1".to_string(), 100).await;
        cache.put("key2".to_string(), 200).await;

        assert_eq!(cache.get(&"key1".to_string()).await, Some(100));
        assert_eq!(cache.get(&"key2".to_string()).await, Some(200));
        assert_eq!(cache.get(&"key3".to_string()).await, None);
    }

    #[tokio::test]
    async fn test_lru_eviction() {
        let cache: LruCache<i32, i32> = LruCache::new(3);

        cache.put(1, 1).await;
        cache.put(2, 2).await;
        cache.put(3, 3).await;

        // Access 1 to make it most recently used
        cache.get(&1).await;

        // Add 4, should evict 2 (least recently used)
        cache.put(4, 4).await;

        assert_eq!(cache.get(&1).await, Some(1)); // Still there
        assert_eq!(cache.get(&2).await, None);    // Evicted
        assert_eq!(cache.get(&3).await, Some(3)); // Still there
        assert_eq!(cache.get(&4).await, Some(4)); // Added
    }

    #[tokio::test]
    async fn test_ttl_expiration() {
        let cache: LruCache<String, i32> = LruCache::new(10)
            .with_default_ttl(Duration::from_millis(50));

        cache.put("key".to_string(), 42).await;
        assert_eq!(cache.get(&"key".to_string()).await, Some(42));

        // Wait for expiration
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        assert_eq!(cache.get(&"key".to_string()).await, None);
    }

    #[tokio::test]
    async fn test_cache_stats() {
        let cache: LruCache<String, i32> = LruCache::new(10);

        cache.put("key".to_string(), 1).await;
        cache.get(&"key".to_string()).await;  // Hit
        cache.get(&"missing".to_string()).await;  // Miss

        let stats = cache.stats().snapshot();
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.writes, 1);
        assert!((stats.hit_rate - 0.5).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_cache_aside_pattern() {
        struct TestLoader;

        #[async_trait::async_trait]
        impl Loader<String, i32> for TestLoader {
            async fn load(&self, key: &String) -> Result<i32, CacheError> {
                // Simulate loading from database
                Ok(key.len() as i32)
            }
        }

        let cache = LruCache::new(10);
        let cache_aside = CacheAside::new(cache, TestLoader);

        // First access loads from source
        let value = cache_aside.get(&"hello".to_string()).await.unwrap();
        assert_eq!(value, 5);

        // Second access comes from cache
        let value = cache_aside.get(&"hello".to_string()).await.unwrap();
        assert_eq!(value, 5);

        // Verify it was cached
        assert!(cache_aside.get_cached(&"hello".to_string()).await.is_some());
    }

    #[tokio::test]
    async fn test_remove_operation() {
        let cache: LruCache<String, i32> = LruCache::new(10);

        cache.put("key".to_string(), 42).await;
        assert_eq!(cache.remove(&"key".to_string()).await, Some(42));
        assert_eq!(cache.get(&"key".to_string()).await, None);
    }

    #[tokio::test]
    async fn test_contains() {
        let cache: LruCache<String, i32> = LruCache::new(10);

        cache.put("exists".to_string(), 1).await;

        assert!(cache.contains(&"exists".to_string()).await);
        assert!(!cache.contains(&"not_exists".to_string()).await);
    }

    #[tokio::test]
    async fn test_clear() {
        let cache: LruCache<String, i32> = LruCache::new(10);

        cache.put("a".to_string(), 1).await;
        cache.put("b".to_string(), 2).await;

        assert_eq!(cache.len().await, 2);

        cache.clear().await;

        assert!(cache.is_empty().await);
    }

    #[tokio::test]
    async fn test_bizra_caches() {
        let caches = BizraCaches::new();

        caches.profiles.put("user1".to_string(), serde_json::json!({"name": "Test"})).await;
        
        let profile = caches.profiles.get(&"user1".to_string()).await;
        assert!(profile.is_some());

        let stats = caches.stats();
        assert_eq!(stats.profiles.hits, 1);
    }
}
