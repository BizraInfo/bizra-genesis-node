// synthesis_orchestrator/src/persistence/mod.rs
// Database persistence layer for BIZRA Genesis Node
//
// Provides repository pattern abstractions for PostgreSQL and Redis,
// with compile-time query verification via SQLx and connection pooling.

use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Pool, Postgres};
use std::time::Duration;

pub mod agents;
pub mod cache;
pub mod consensus;
pub mod integration;
pub mod poi;
pub mod receipts;
pub mod router;
pub mod traits;

// Re-export commonly used types
pub use agents::AgentRepository;
pub use cache::RedisCache;
pub use consensus::ConsensusRepository;
pub use integration::{PersistenceManager, HealthStatus};
pub use poi::ProofOfImpactRepository;
pub use receipts::ReceiptRepository;
pub use router::RouterRepository;

/// Database error type
pub type DbResult<T> = Result<T, DbError>;

/// Database-specific errors
#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("Database connection error: {0}")]
    Connection(#[from] sqlx::Error),

    #[error("Record not found: {0}")]
    NotFound(String),

    #[error("Constraint violation: {0}")]
    ConstraintViolation(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Pool error: {0}")]
    Pool(String),
}

/// Database connection pool manager
///
/// Manages PostgreSQL connection pool with optimized settings for
/// high-concurrency workloads (10,000+ concurrent users).
///
/// # Configuration
///
/// - **Max Connections**: 100 (configurable via DATABASE_MAX_CONNECTIONS)
/// - **Min Connections**: 10 (maintained warm pool)
/// - **Acquire Timeout**: 30s
/// - **Idle Timeout**: 10 minutes
/// - **Max Lifetime**: 30 minutes (prevents connection leaks)
///
/// # Examples
///
/// ```no_run
/// use bizra_genesis_node::persistence::DatabasePool;
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let pool = DatabasePool::new("postgres://user:pass@localhost/bizra").await?;
///
///     // Pool is now ready for repositories
///     let receipts = pool.receipts();
///
///     Ok(())
/// }
/// ```
pub struct DatabasePool {
    pg_pool: PgPool,
}

impl DatabasePool {
    /// Creates a new database pool from connection string
    ///
    /// # Arguments
    ///
    /// * `database_url` - PostgreSQL connection string (e.g., "postgres://user:pass@localhost/db")
    ///
    /// # Returns
    ///
    /// * `Ok(DatabasePool)` - Successfully initialized pool
    /// * `Err(DbError)` - Connection or configuration error
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use bizra_genesis_node::persistence::DatabasePool;
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let pool = DatabasePool::new("postgres://localhost/bizra").await?;
    ///     Ok(())
    /// }
    /// ```
    pub async fn new(database_url: &str) -> DbResult<Self> {
        let max_connections = std::env::var("DATABASE_MAX_CONNECTIONS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(100);

        let min_connections = std::env::var("DATABASE_MIN_CONNECTIONS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(10);

        let pg_pool = PgPoolOptions::new()
            .max_connections(max_connections)
            .min_connections(min_connections)
            .acquire_timeout(Duration::from_secs(30))
            .idle_timeout(Some(Duration::from_secs(600))) // 10 minutes
            .max_lifetime(Some(Duration::from_secs(1800))) // 30 minutes
            .connect(database_url)
            .await
            .map_err(|e| {
                tracing::error!("Failed to create database pool: {}", e);
                DbError::Pool(format!("Connection failed: {}", e))
            })?;

        tracing::info!(
            "Database pool initialized (max: {}, min: {})",
            max_connections,
            min_connections
        );

        Ok(Self { pg_pool })
    }

    /// Returns the underlying PostgreSQL connection pool
    ///
    /// # Returns
    ///
    /// Reference to the SQLx PgPool for direct query execution
    pub fn pool(&self) -> &PgPool {
        &self.pg_pool
    }

    /// Creates a new receipt repository
    ///
    /// # Returns
    ///
    /// ReceiptRepository instance for trust receipt operations
    pub fn receipts(&self) -> ReceiptRepository {
        ReceiptRepository::new(self.pg_pool.clone())
    }

    /// Creates a new router repository
    ///
    /// # Returns
    ///
    /// RouterRepository instance for Thompson Sampling state management
    pub fn router(&self) -> RouterRepository {
        RouterRepository::new(self.pg_pool.clone())
    }

    /// Creates a new consensus repository
    ///
    /// # Returns
    ///
    /// ConsensusRepository instance for consensus run tracking
    pub fn consensus(&self) -> ConsensusRepository {
        ConsensusRepository::new(self.pg_pool.clone())
    }

    /// Creates a new agent repository
    ///
    /// # Returns
    ///
    /// AgentRepository instance for AEGIS agent state management
    pub fn agents(&self) -> AgentRepository {
        AgentRepository::new(self.pg_pool.clone())
    }

    /// Creates a new Proof-of-Impact repository
    ///
    /// # Returns
    ///
    /// ProofOfImpactRepository instance for PoI analytics
    pub fn proof_of_impact(&self) -> ProofOfImpactRepository {
        ProofOfImpactRepository::new(self.pg_pool.clone())
    }

    /// Runs database migrations
    ///
    /// Applies all pending migrations from the `migrations/` directory.
    /// Should be called during application startup.
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Migrations applied successfully
    /// * `Err(DbError)` - Migration failed
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use bizra_genesis_node::persistence::DatabasePool;
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let pool = DatabasePool::new("postgres://localhost/bizra").await?;
    ///     pool.run_migrations().await?;
    ///     Ok(())
    /// }
    /// ```
    pub async fn run_migrations(&self) -> DbResult<()> {
        tracing::info!("Running database migrations...");

        sqlx::migrate!("./migrations")
            .run(&self.pg_pool)
            .await
            .map_err(|e| {
                tracing::error!("Migration failed: {}", e);
                DbError::Pool(format!("Migration error: {}", e))
            })?;

        tracing::info!("Database migrations completed successfully");
        Ok(())
    }

    /// Checks database health
    ///
    /// Executes a simple query to verify database connectivity and responsiveness.
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Database is healthy
    /// * `Err(DbError)` - Database is unreachable or unhealthy
    pub async fn health_check(&self) -> DbResult<()> {
        sqlx::query("SELECT 1")
            .execute(&self.pg_pool)
            .await
            .map_err(|e| {
                tracing::error!("Database health check failed: {}", e);
                DbError::Connection(e)
            })?;

        Ok(())
    }

    /// Returns pool statistics
    ///
    /// Provides metrics for monitoring connection pool health:
    /// - Size: Current number of connections
    /// - Idle: Number of idle connections
    /// - Connections: Total connections created
    pub fn pool_stats(&self) -> PoolStats {
        PoolStats {
            size: self.pg_pool.size(),
            idle: self.pg_pool.num_idle(),
        }
    }
}

/// Connection pool statistics
#[derive(Debug, Clone)]
pub struct PoolStats {
    /// Current pool size
    pub size: u32,
    /// Number of idle connections
    pub idle: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL instance
    async fn test_database_pool_creation() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());

        let pool = DatabasePool::new(&database_url).await;
        assert!(pool.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL instance
    async fn test_health_check() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());

        let pool = DatabasePool::new(&database_url).await.unwrap();
        let health = pool.health_check().await;
        assert!(health.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL instance
    async fn test_migrations() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());

        let pool = DatabasePool::new(&database_url).await.unwrap();
        let result = pool.run_migrations().await;
        assert!(result.is_ok());
    }
}
