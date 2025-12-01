// synthesis_orchestrator/src/persistence/router.rs
// Router state repository for Thompson Sampling persistence

use crate::persistence::traits::{RouterRepositoryTrait, RouterState};
use crate::persistence::{DbError, DbResult};
use async_trait::async_trait;
use sqlx::PgPool;

/// Router state repository
///
/// Manages Thompson Sampling Beta distribution parameters for AI model routing.
/// Provides atomic operations for updating α/β parameters and ensuring
/// router state survives system restarts.
#[derive(Clone)]
pub struct RouterRepository {
    pool: PgPool,
}

impl RouterRepository {
    /// Creates a new router repository
    ///
    /// # Arguments
    ///
    /// * `pool` - PostgreSQL connection pool
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl RouterRepositoryTrait for RouterRepository {
    /// Updates router state for a model
    ///
    /// # Arguments
    ///
    /// * `model` - Model name
    /// * `alpha` - Beta distribution α parameter (successes + 1)
    /// * `beta` - Beta distribution β parameter (failures + 1)
    ///
    /// # Returns
    ///
    /// * `Ok(())` - State updated successfully
    /// * `Err(DbError)` - Database error
    async fn update_state(&self, model: &str, alpha: f64, beta: f64) -> DbResult<()> {
        sqlx::query!(
            r#"
            INSERT INTO router_state (model_name, alpha, beta)
            VALUES ($1, $2, $3)
            ON CONFLICT (model_name)
            DO UPDATE SET
                alpha = EXCLUDED.alpha,
                beta = EXCLUDED.beta,
                last_updated = NOW()
            "#,
            model,
            alpha,
            beta
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update router state for {}: {}", model, e);
            DbError::Connection(e)
        })?;

        tracing::debug!(
            "Router state updated: {} (α={:.1}, β={:.1})",
            model,
            alpha,
            beta
        );
        Ok(())
    }

    /// Retrieves router state for a model
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
    async fn get_state(&self, model: &str) -> DbResult<Option<RouterState>> {
        let row = sqlx::query!(
            r#"
            SELECT
                model_name,
                alpha,
                beta,
                win_rate,
                total_trials,
                enabled
            FROM router_state
            WHERE model_name = $1
            "#,
            model
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch router state for {}: {}", model, e);
            DbError::Connection(e)
        })?;

        Ok(row.map(|r| RouterState {
            model_name: r.model_name,
            alpha: r.alpha,
            beta: r.beta,
            win_rate: r.win_rate.unwrap_or(0.5),
            total_trials: r.total_trials.unwrap_or(0),
            enabled: r.enabled,
        }))
    }

    /// Retrieves all router states
    ///
    /// # Returns
    ///
    /// Vector of all router states ordered by win rate descending
    async fn get_all_states(&self) -> DbResult<Vec<RouterState>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                model_name,
                alpha,
                beta,
                win_rate,
                total_trials,
                enabled
            FROM router_state
            ORDER BY win_rate DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch all router states: {}", e);
            DbError::Connection(e)
        })?;

        Ok(rows
            .into_iter()
            .map(|r| RouterState {
                model_name: r.model_name,
                alpha: r.alpha,
                beta: r.beta,
                win_rate: r.win_rate.unwrap_or(0.5),
                total_trials: r.total_trials.unwrap_or(0),
                enabled: r.enabled,
            })
            .collect())
    }

    /// Increments success count (alpha)
    ///
    /// Atomically increments α by 1.0, representing a successful synthesis.
    ///
    /// # Arguments
    ///
    /// * `model` - Model name
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Success count incremented
    /// * `Err(DbError)` - Model not found or database error
    async fn increment_success(&self, model: &str) -> DbResult<()> {
        let result = sqlx::query!(
            r#"
            UPDATE router_state
            SET alpha = alpha + 1.0,
                last_updated = NOW()
            WHERE model_name = $1
            "#,
            model
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to increment success for {}: {}", model, e);
            DbError::Connection(e)
        })?;

        if result.rows_affected() == 0 {
            return Err(DbError::NotFound(format!(
                "Model not found in router state: {}",
                model
            )));
        }

        tracing::debug!("Router state: {} success incremented", model);
        Ok(())
    }

    /// Increments failure count (beta)
    ///
    /// Atomically increments β by 1.0, representing a failed synthesis.
    ///
    /// # Arguments
    ///
    /// * `model` - Model name
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Failure count incremented
    /// * `Err(DbError)` - Model not found or database error
    async fn increment_failure(&self, model: &str) -> DbResult<()> {
        let result = sqlx::query!(
            r#"
            UPDATE router_state
            SET beta = beta + 1.0,
                last_updated = NOW()
            WHERE model_name = $1
            "#,
            model
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to increment failure for {}: {}", model, e);
            DbError::Connection(e)
        })?;

        if result.rows_affected() == 0 {
            return Err(DbError::NotFound(format!(
                "Model not found in router state: {}",
                model
            )));
        }

        tracing::debug!("Router state: {} failure incremented", model);
        Ok(())
    }

    /// Initializes a new model with default prior
    ///
    /// Creates router state with uniform prior Beta(1, 1) for new models.
    ///
    /// # Arguments
    ///
    /// * `model` - Model name to initialize
    /// * `model_type` - Optional model type ('ollama', 'openai', etc.)
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Model initialized successfully
    /// * `Err(DbError)` - Database error
    async fn initialize_model(&self, model: &str, model_type: Option<&str>) -> DbResult<()> {
        sqlx::query!(
            r#"
            INSERT INTO router_state (model_name, model_type, alpha, beta)
            VALUES ($1, $2, 1.0, 1.0)
            ON CONFLICT (model_name) DO NOTHING
            "#,
            model,
            model_type
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to initialize model {}: {}", model, e);
            DbError::Connection(e)
        })?;

        tracing::info!(
            "Router state initialized: {} (type: {:?})",
            model,
            model_type
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL instance
    async fn test_initialize_model() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());

        let pool = PgPool::connect(&database_url).await.unwrap();
        let repo = RouterRepository::new(pool);

        let result = repo.initialize_model("test-model", Some("ollama")).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL instance
    async fn test_increment_success() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());

        let pool = PgPool::connect(&database_url).await.unwrap();
        let repo = RouterRepository::new(pool.clone());

        // Use unique test model name to avoid state leakage
        let test_model = format!(
            "test-increment-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );

        // Initialize first
        repo.initialize_model(&test_model, None).await.unwrap();

        // Then increment
        let result = repo.increment_success(&test_model).await;
        assert!(result.is_ok());

        // Verify state updated
        let state = repo.get_state(&test_model).await.unwrap().unwrap();
        assert_eq!(state.alpha, 2.0); // Started at 1.0, incremented by 1.0

        // Cleanup: delete the test model
        let _ = sqlx::query!("DELETE FROM router_state WHERE model_name = $1", test_model)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL instance
    async fn test_get_all_states() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());

        let pool = PgPool::connect(&database_url).await.unwrap();
        let repo = RouterRepository::new(pool);

        let result = repo.get_all_states().await;
        assert!(result.is_ok());
    }
}
