// synthesis_orchestrator/src/persistence/cache.rs
// Redis caching layer for high-performance hot data access

use crate::persistence::{DbError, DbResult};
use redis::aio::ConnectionManager;
use redis::{AsyncCommands, Client};
use serde::{de::DeserializeOwned, Serialize};

/// Redis cache manager for hot data caching
///
/// Provides high-performance in-memory caching layer for frequently accessed data:
/// - Router state (Thompson Sampling parameters)
/// - Agent metrics (real-time health and performance)
/// - Recent consensus results
///
/// # Performance
///
/// - GET: <1ms P95 latency (in-memory lookup)
/// - SET: <2ms P95 latency (async write-back)
/// - TTL: Configurable expiration for cache freshness
///
/// # Architecture
///
/// - **Primary Storage**: PostgreSQL (source of truth)
/// - **Cache Layer**: Redis (performance optimization)
/// - **Pattern**: Cache-aside with write-through support
///
/// # Examples
///
/// ```no_run
/// use bizra_genesis_node::persistence::RedisCache;
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let cache = RedisCache::new("redis://localhost:6379").await?;
///
///     // Cache router state
///     cache.set_router_alpha("gpt-4", 15.0, 300).await?;
///     let alpha = cache.get_router_alpha("gpt-4").await?;
///
///     println!("Alpha: {:?}", alpha);
///     Ok(())
/// }
/// ```
pub struct RedisCache {
    conn: ConnectionManager,
}

impl RedisCache {
    /// Creates a new Redis cache connection
    ///
    /// # Arguments
    ///
    /// * `redis_url` - Redis connection string (e.g., "redis://localhost:6379")
    ///
    /// # Returns
    ///
    /// * `Ok(RedisCache)` - Successfully connected cache
    /// * `Err(DbError)` - Connection failed
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use bizra_genesis_node::persistence::RedisCache;
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let cache = RedisCache::new("redis://localhost:6379").await?;
    ///     Ok(())
    /// }
    /// ```
    pub async fn new(redis_url: &str) -> DbResult<Self> {
        let client = Client::open(redis_url).map_err(|e| {
            DbError::Connection(sqlx::Error::Configuration(
                format!("Redis connection failed: {}", e).into(),
            ))
        })?;

        let conn = ConnectionManager::new(client).await.map_err(|e| {
            DbError::Connection(sqlx::Error::Configuration(
                format!("Redis connection manager failed: {}", e).into(),
            ))
        })?;

        tracing::info!("Redis cache initialized: {}", redis_url);
        Ok(Self { conn })
    }

    /// Checks Redis health
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Redis is healthy
    /// * `Err(DbError)` - Redis is unreachable
    pub async fn health_check(&mut self) -> DbResult<()> {
        let _: String = self.conn.get("__health_check__").await.map_err(|e| {
            DbError::Connection(sqlx::Error::Configuration(
                format!("Redis health check failed: {}", e).into(),
            ))
        })?;

        Ok(())
    }

    // ==========================================================================
    // Router State Caching (Thompson Sampling Parameters)
    // ==========================================================================

    /// Gets router alpha parameter from cache
    ///
    /// # Arguments
    ///
    /// * `model_name` - The model identifier
    ///
    /// # Returns
    ///
    /// * `Ok(Some(f64))` - Alpha value found in cache
    /// * `Ok(None)` - Cache miss
    /// * `Err(DbError)` - Redis error
    pub async fn get_router_alpha(&mut self, model_name: &str) -> DbResult<Option<f64>> {
        let key = format!("router:alpha:{}", model_name);
        let value: Option<f64> = self.conn.get(&key).await.map_err(|e| {
            DbError::Connection(sqlx::Error::Configuration(
                format!("Redis GET failed: {}", e).into(),
            ))
        })?;

        if value.is_some() {
            tracing::debug!("Cache HIT: {}", key);
        } else {
            tracing::debug!("Cache MISS: {}", key);
        }

        Ok(value)
    }

    /// Sets router alpha parameter in cache
    ///
    /// # Arguments
    ///
    /// * `model_name` - The model identifier
    /// * `alpha` - Alpha value (successes + 1)
    /// * `ttl_seconds` - Time-to-live in seconds
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Value cached successfully
    /// * `Err(DbError)` - Redis error
    pub async fn set_router_alpha(
        &mut self,
        model_name: &str,
        alpha: f64,
        ttl_seconds: u64,
    ) -> DbResult<()> {
        let key = format!("router:alpha:{}", model_name);

        redis::cmd("SETEX")
            .arg(&key)
            .arg(ttl_seconds)
            .arg(alpha)
            .query_async(&mut self.conn)
            .await?;

        Ok(())
    }

    /// Gets router beta parameter from cache
    ///
    /// # Arguments
    ///
    /// * `model_name` - The model identifier
    ///
    /// # Returns
    ///
    /// * `Ok(Some(f64))` - Beta value found in cache
    /// * `Ok(None)` - Cache miss
    /// * `Err(DbError)` - Redis error
    pub async fn get_router_beta(&mut self, model_name: &str) -> DbResult<Option<f64>> {
        let key = format!("router:beta:{}", model_name);
        let value: Option<f64> = self.conn.get(&key).await.map_err(|e| {
            DbError::Connection(sqlx::Error::Configuration(
                format!("Redis GET failed: {}", e).into(),
            ))
        })?;

        if value.is_some() {
            tracing::debug!("Cache HIT: {}", key);
        }

        Ok(value)
    }

    /// Sets router beta parameter in cache
    ///
    /// # Arguments
    ///
    /// * `model_name` - The model identifier
    /// * `beta` - Beta value (failures + 1)
    /// * `ttl_seconds` - Time-to-live in seconds
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Value cached successfully
    /// * `Err(DbError)` - Redis error
    pub async fn set_router_beta(
        &mut self,
        model_name: &str,
        beta: f64,
        ttl_seconds: u64,
    ) -> DbResult<()> {
        let key = format!("router:beta:{}", model_name);
        self.conn
            .set_ex::<_, _, ()>(&key, beta, ttl_seconds)
            .await
            .map_err(|e| {
                DbError::Connection(sqlx::Error::Configuration(
                    format!("Redis SET failed: {}", e).into(),
                ))
            })?;

        tracing::debug!("Cache SET: {} = {}", key, beta);
        Ok(())
    }

    /// Invalidates router cache for a model
    ///
    /// # Arguments
    ///
    /// * `model_name` - The model identifier
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Cache invalidated
    /// * `Err(DbError)` - Redis error
    pub async fn invalidate_router_cache(&mut self, model_name: &str) -> DbResult<()> {
        let alpha_key = format!("router:alpha:{}", model_name);
        let beta_key = format!("router:beta:{}", model_name);

        let _: () = self.conn.del(&[&alpha_key, &beta_key]).await.map_err(|e| {
            DbError::Connection(sqlx::Error::Configuration(
                format!("Redis DEL failed: {}", e).into(),
            ))
        })?;

        tracing::debug!("Cache INVALIDATED: router:{}", model_name);
        Ok(())
    }

    // ==========================================================================
    // Agent Metrics Caching
    // ==========================================================================

    /// Gets agent health status from cache
    ///
    /// # Arguments
    ///
    /// * `agent_id` - The agent identifier
    ///
    /// # Returns
    ///
    /// * `Ok(Some(String))` - Health status found ('healthy', 'degraded', 'failed')
    /// * `Ok(None)` - Cache miss
    /// * `Err(DbError)` - Redis error
    pub async fn get_agent_health(&mut self, agent_id: &str) -> DbResult<Option<String>> {
        let key = format!("agent:health:{}", agent_id);
        let value: Option<String> = self.conn.get(&key).await.map_err(|e| {
            DbError::Connection(sqlx::Error::Configuration(
                format!("Redis GET failed: {}", e).into(),
            ))
        })?;

        Ok(value)
    }

    /// Sets agent health status in cache
    ///
    /// # Arguments
    ///
    /// * `agent_id` - The agent identifier
    /// * `health_status` - Health status ('healthy', 'degraded', 'failed')
    /// * `ttl_seconds` - Time-to-live in seconds
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Value cached successfully
    /// * `Err(DbError)` - Redis error
    pub async fn set_agent_health(
        &mut self,
        agent_id: &str,
        health_status: &str,
        ttl_seconds: u64,
    ) -> DbResult<()> {
        let key = format!("agent:health:{}", agent_id);
        self.conn
            .set_ex::<_, _, ()>(&key, health_status, ttl_seconds)
            .await
            .map_err(|e| {
                DbError::Connection(sqlx::Error::Configuration(
                    format!("Redis SET failed: {}", e).into(),
                ))
            })?;

        tracing::debug!("Cache SET: {} = {}", key, health_status);
        Ok(())
    }

    // ==========================================================================
    // Generic JSON Caching
    // ==========================================================================

    /// Gets a JSON value from cache
    ///
    /// # Arguments
    ///
    /// * `key` - Cache key
    ///
    /// # Returns
    ///
    /// * `Ok(Some(T))` - Value found and deserialized
    /// * `Ok(None)` - Cache miss
    /// * `Err(DbError)` - Redis or deserialization error
    pub async fn get_json<T: DeserializeOwned>(&mut self, key: &str) -> DbResult<Option<T>> {
        let value: Option<String> = self.conn.get(key).await.map_err(|e| {
            DbError::Connection(sqlx::Error::Configuration(
                format!("Redis GET failed: {}", e).into(),
            ))
        })?;

        match value {
            Some(json_str) => {
                let deserialized = serde_json::from_str(&json_str)?;
                tracing::debug!("Cache HIT: {} (JSON)", key);
                Ok(Some(deserialized))
            }
            None => {
                tracing::debug!("Cache MISS: {} (JSON)", key);
                Ok(None)
            }
        }
    }

    /// Sets a JSON value in cache
    ///
    /// # Arguments
    ///
    /// * `key` - Cache key
    /// * `value` - Value to serialize and cache
    /// * `ttl_seconds` - Time-to-live in seconds
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Value cached successfully
    /// * `Err(DbError)` - Redis or serialization error
    pub async fn set_json<T: Serialize>(
        &mut self,
        key: &str,
        value: &T,
        ttl_seconds: u64,
    ) -> DbResult<()> {
        let json_str = serde_json::to_string(value)?;
        self.conn
            .set_ex::<_, _, ()>(key, json_str, ttl_seconds)
            .await
            .map_err(|e| {
                DbError::Connection(sqlx::Error::Configuration(
                    format!("Redis SET failed: {}", e).into(),
                ))
            })?;

        tracing::debug!("Cache SET: {} (JSON)", key);
        Ok(())
    }

    /// Deletes a key from cache
    ///
    /// # Arguments
    ///
    /// * `key` - Cache key to delete
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Key deleted
    /// * `Err(DbError)` - Redis error
    pub async fn delete(&mut self, key: &str) -> DbResult<()> {
        let _: () = self.conn.del(key).await.map_err(|e| {
            DbError::Connection(sqlx::Error::Configuration(
                format!("Redis DEL failed: {}", e).into(),
            ))
        })?;

        tracing::debug!("Cache DEL: {}", key);
        Ok(())
    }

    /// Flushes all cache entries (USE WITH CAUTION)
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Cache flushed
    /// * `Err(DbError)` - Redis error
    pub async fn flush_all(&mut self) -> DbResult<()> {
        redis::cmd("FLUSHDB").query_async(&mut self.conn).await?;

        tracing::warn!("Cache FLUSHED: all keys deleted");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires running Redis instance
    async fn test_redis_cache() {
        let redis_url = std::env::var("TEST_REDIS_URL")
            .unwrap_or_else(|_| "redis://localhost:6379".to_string());

        let mut cache = RedisCache::new(&redis_url).await.unwrap();

        // Test router alpha/beta
        cache
            .set_router_alpha("test-model", 10.0, 60)
            .await
            .unwrap();
        cache.set_router_beta("test-model", 5.0, 60).await.unwrap();

        let alpha = cache.get_router_alpha("test-model").await.unwrap();
        let beta = cache.get_router_beta("test-model").await.unwrap();

        assert_eq!(alpha, Some(10.0));
        assert_eq!(beta, Some(5.0));

        // Test cache invalidation
        cache.invalidate_router_cache("test-model").await.unwrap();

        let alpha_after = cache.get_router_alpha("test-model").await.unwrap();
        assert_eq!(alpha_after, None);
    }

    #[tokio::test]
    #[ignore] // Requires running Redis instance
    async fn test_json_caching() {
        let redis_url = std::env::var("TEST_REDIS_URL")
            .unwrap_or_else(|_| "redis://localhost:6379".to_string());

        let mut cache = RedisCache::new(&redis_url).await.unwrap();

        #[derive(Debug, Serialize, serde::Deserialize, PartialEq)]
        struct TestData {
            value: i32,
        }

        let data = TestData { value: 42 };
        cache.set_json("test:data", &data, 60).await.unwrap();

        let retrieved: Option<TestData> = cache.get_json("test:data").await.unwrap();
        assert_eq!(retrieved, Some(data));
    }
}
