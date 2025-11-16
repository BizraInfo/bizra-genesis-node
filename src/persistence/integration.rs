// synthesis_orchestrator/src/persistence/integration.rs
// Integration layer for connecting database persistence to the orchestrator

use crate::persistence::traits::*;
use crate::persistence::{DatabasePool, DbResult, RedisCache};
use crate::trust::{ProofOfImpact, RunReceipt};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Database-backed persistence manager
///
/// Integrates PostgreSQL and Redis persistence with the main orchestrator,
/// providing automatic state persistence for router, consensus, and receipts.
///
/// # Architecture
///
/// ```
/// SynthesisOrchestrator
///         │
///         ▼
/// PersistenceManager
///    ├─► PostgreSQL (DatabasePool)
///    │   ├─► trust_receipts
///    │   ├─► router_state
///    │   ├─► consensus_runs
///    │   ├─► agent_state
///    │   └─► proof_of_impact
///    │
///    └─► Redis (RedisCache)
///        ├─► router_state (hot cache)
///        ├─► agent_metrics (hot cache)
///        └─► consensus_results (hot cache)
/// ```
///
/// # Examples
///
/// ```no_run
/// use bizra_genesis_node::persistence::PersistenceManager;
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let manager = PersistenceManager::new(
///         "postgres://localhost/bizra",
///         "redis://localhost:6379"
///     ).await?;
///
///     // Manager now handles all persistence automatically
///     Ok(())
/// }
/// ```
pub struct PersistenceManager {
    /// PostgreSQL connection pool
    db: DatabasePool,

    /// Redis cache connection (optional)
    cache: Option<Arc<RwLock<RedisCache>>>,
}

impl PersistenceManager {
    /// Creates a new persistence manager with database and cache
    ///
    /// # Arguments
    ///
    /// * `database_url` - PostgreSQL connection string
    /// * `redis_url` - Redis connection string (optional)
    ///
    /// # Returns
    ///
    /// * `Ok(PersistenceManager)` - Successfully initialized
    /// * `Err(DbError)` - Connection failed
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use bizra_genesis_node::persistence::PersistenceManager;
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let manager = PersistenceManager::new(
    ///         "postgres://localhost/bizra",
    ///         "redis://localhost:6379"
    ///     ).await?;
    ///     Ok(())
    /// }
    /// ```
    pub async fn new(database_url: &str, redis_url: &str) -> DbResult<Self> {
        // Initialize PostgreSQL
        let db = DatabasePool::new(database_url).await?;

        // Run migrations automatically
        db.run_migrations().await?;

        // Initialize Redis (optional - graceful degradation if unavailable)
        let cache = match RedisCache::new(redis_url).await {
            Ok(cache) => {
                tracing::info!("Redis cache initialized successfully");
                Some(Arc::new(RwLock::new(cache)))
            }
            Err(e) => {
                tracing::warn!("Redis cache initialization failed: {:?}", e);
                tracing::warn!("Continuing without cache - performance may be degraded");
                None
            }
        };

        Ok(Self { db, cache })
    }

    /// Creates a persistence manager with database only (no cache)
    ///
    /// # Arguments
    ///
    /// * `database_url` - PostgreSQL connection string
    ///
    /// # Returns
    ///
    /// * `Ok(PersistenceManager)` - Successfully initialized
    /// * `Err(DbError)` - Connection failed
    pub async fn database_only(database_url: &str) -> DbResult<Self> {
        let db = DatabasePool::new(database_url).await?;
        db.run_migrations().await?;

        tracing::info!("Persistence manager initialized (database-only mode)");
        Ok(Self { db, cache: None })
    }

    /// Returns reference to the database pool
    pub fn database(&self) -> &DatabasePool {
        &self.db
    }

    /// Returns reference to the cache (if available)
    pub fn cache(&self) -> Option<Arc<RwLock<RedisCache>>> {
        self.cache.clone()
    }

    /// Persists a trust receipt to database
    ///
    /// # Arguments
    ///
    /// * `receipt` - The signed receipt to persist
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Receipt persisted successfully
    /// * `Err(DbError)` - Database error
    pub async fn save_receipt(&self, receipt: &RunReceipt) -> DbResult<()> {
        let repo = self.db.receipts();
        repo.insert(receipt).await?;

        tracing::info!(
            "Receipt persisted: {} (model: {})",
            receipt.run_id,
            receipt.winner_model
        );
        Ok(())
    }

    /// Persists Proof-of-Impact record
    ///
    /// # Arguments
    ///
    /// * `receipt_id` - Reference to the trust receipt
    /// * `model_name` - The model name
    /// * `poi` - Proof-of-Impact metrics
    ///
    /// # Returns
    ///
    /// * `Ok(())` - PoI persisted successfully
    /// * `Err(DbError)` - Database error
    pub async fn save_proof_of_impact(
        &self,
        receipt_id: &str,
        model_name: &str,
        poi: &ProofOfImpact,
    ) -> DbResult<()> {
        let repo = self.db.proof_of_impact();

        let mut record = ProofOfImpactRecord::from(poi);
        record.receipt_id = receipt_id.to_string();
        record.model_name = model_name.to_string();

        repo.insert(&record).await?;

        let normalized =
            (poi.quality + poi.utility + poi.trust + poi.fairness + poi.diversity) / 100.0;
        tracing::info!(
            "PoI persisted: {} (model: {}, score: {:.2})",
            receipt_id,
            model_name,
            normalized
        );

        Ok(())
    }

    /// Updates router state for a model
    ///
    /// Persists Thompson Sampling parameters to database and updates cache.
    ///
    /// # Arguments
    ///
    /// * `model` - Model name
    /// * `alpha` - Beta distribution α parameter
    /// * `beta` - Beta distribution β parameter
    ///
    /// # Returns
    ///
    /// * `Ok(())` - State updated successfully
    /// * `Err(DbError)` - Database error
    pub async fn update_router_state(&self, model: &str, alpha: f64, beta: f64) -> DbResult<()> {
        let repo = self.db.router();
        repo.update_state(model, alpha, beta).await?;

        // Update cache if available
        if let Some(cache) = &self.cache {
            let mut cache_guard = cache.write().await;
            let _ = cache_guard.set_router_alpha(model, alpha, 300).await;
            let _ = cache_guard.set_router_beta(model, beta, 300).await;
        }

        tracing::debug!(
            "Router state updated: {} (α={:.2}, β={:.2})",
            model,
            alpha,
            beta
        );
        Ok(())
    }

    /// Initializes a new model in router state
    ///
    /// # Arguments
    ///
    /// * `model` - Model name
    /// * `model_type` - Optional model type
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Model initialized
    /// * `Err(DbError)` - Database error
    pub async fn initialize_model(&self, model: &str, model_type: Option<&str>) -> DbResult<()> {
        let repo = self.db.router();
        repo.initialize_model(model, model_type).await?;

        tracing::info!(
            "Model initialized in router state: {} (type: {:?})",
            model,
            model_type
        );
        Ok(())
    }

    /// Increments router success count
    ///
    /// # Arguments
    ///
    /// * `model` - Model name
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Success incremented
    /// * `Err(DbError)` - Database error
    pub async fn increment_router_success(&self, model: &str) -> DbResult<()> {
        let repo = self.db.router();
        repo.increment_success(model).await?;

        // Invalidate cache
        if let Some(cache) = &self.cache {
            let mut cache_guard = cache.write().await;
            let _ = cache_guard.invalidate_router_cache(model).await;
        }

        tracing::debug!("Router success incremented: {}", model);
        Ok(())
    }

    /// Increments router failure count
    ///
    /// # Arguments
    ///
    /// * `model` - Model name
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Failure incremented
    /// * `Err(DbError)` - Database error
    pub async fn increment_router_failure(&self, model: &str) -> DbResult<()> {
        let repo = self.db.router();
        repo.increment_failure(model).await?;

        // Invalidate cache
        if let Some(cache) = &self.cache {
            let mut cache_guard = cache.write().await;
            let _ = cache_guard.invalidate_router_cache(model).await;
        }

        tracing::debug!("Router failure incremented: {}", model);
        Ok(())
    }

    /// Retrieves router state for a model (cache-first)
    ///
    /// # Arguments
    ///
    /// * `model` - Model name
    ///
    /// # Returns
    ///
    /// * `Ok(Some(RouterState))` - State found
    /// * `Ok(None)` - Model not found
    /// * `Err(DbError)` - Database error
    pub async fn get_router_state(&self, model: &str) -> DbResult<Option<RouterState>> {
        // Try cache first (if available)
        if let Some(cache) = &self.cache {
            let mut cache_guard = cache.write().await;
            if let Ok(Some(alpha)) = cache_guard.get_router_alpha(model).await {
                if let Ok(Some(beta)) = cache_guard.get_router_beta(model).await {
                    tracing::debug!("Router state from cache: {}", model);
                    return Ok(Some(RouterState {
                        model_name: model.to_string(),
                        alpha,
                        beta,
                        win_rate: alpha / (alpha + beta),
                        total_trials: ((alpha + beta - 2.0) as i32),
                        enabled: true,
                    }));
                }
            }
        }

        // Cache miss - fetch from database
        let repo = self.db.router();
        let state = repo.get_state(model).await?;

        // Warm cache if available
        if let Some(state_ref) = &state {
            if let Some(cache) = &self.cache {
                let mut cache_guard = cache.write().await;
                let _ = cache_guard
                    .set_router_alpha(model, state_ref.alpha, 300)
                    .await;
                let _ = cache_guard
                    .set_router_beta(model, state_ref.beta, 300)
                    .await;
            }
        }

        Ok(state)
    }

    /// Performs health check on all persistence layers
    ///
    /// # Returns
    ///
    /// * `Ok(HealthStatus)` - Health status of all components
    /// * `Err(DbError)` - Health check failed
    pub async fn health_check(&self) -> DbResult<HealthStatus> {
        // Check database
        let db_healthy = self.db.health_check().await.is_ok();

        // Check cache (optional)
        let cache_healthy = if let Some(cache) = &self.cache {
            let mut cache_guard = cache.write().await;
            cache_guard.health_check().await.is_ok()
        } else {
            true // N/A if not configured
        };

        let overall_healthy = db_healthy && cache_healthy;

        Ok(HealthStatus {
            overall: overall_healthy,
            database: db_healthy,
            cache: cache_healthy,
            cache_enabled: self.cache.is_some(),
        })
    }
}

/// Health status for persistence layers
#[derive(Debug, Clone)]
pub struct HealthStatus {
    /// Overall health (all components)
    pub overall: bool,
    /// Database health
    pub database: bool,
    /// Cache health
    pub cache: bool,
    /// Whether cache is enabled
    pub cache_enabled: bool,
}

impl std::fmt::Display for HealthStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Persistence Health: {} | Database: {} | Cache: {} ({})",
            if self.overall { "✅" } else { "❌" },
            if self.database { "✅" } else { "❌" },
            if self.cache { "✅" } else { "❌" },
            if self.cache_enabled {
                "enabled"
            } else {
                "disabled"
            }
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL
    async fn test_persistence_manager_creation() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());

        let manager = PersistenceManager::database_only(&database_url).await;
        assert!(manager.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL and Redis
    async fn test_full_stack_persistence() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());
        let redis_url = std::env::var("TEST_REDIS_URL")
            .unwrap_or_else(|_| "redis://localhost:6379/1".to_string());

        let manager = PersistenceManager::new(&database_url, &redis_url)
            .await
            .unwrap();

        // Initialize model
        manager
            .initialize_model("test-model", Some("ollama"))
            .await
            .unwrap();

        // Update state
        manager
            .update_router_state("test-model", 10.0, 5.0)
            .await
            .unwrap();

        // Retrieve (should hit cache)
        let state = manager.get_router_state("test-model").await.unwrap();
        assert!(state.is_some());
        assert_eq!(state.unwrap().alpha, 10.0);
    }

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL
    async fn test_health_check() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());

        let manager = PersistenceManager::database_only(&database_url)
            .await
            .unwrap();
        let health = manager.health_check().await.unwrap();

        assert!(health.database);
        assert!(health.overall);
    }
}
