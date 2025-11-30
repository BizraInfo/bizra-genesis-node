// synthesis_orchestrator/src/persistence/consensus.rs
// Consensus run repository implementation

use crate::persistence::traits::{ConsensusRepositoryTrait, ConsensusRun};
use crate::persistence::{DbError, DbResult};
use async_trait::async_trait;
use sqlx::PgPool;

/// Consensus run repository
///
/// Tracks consensus execution metrics and results for performance analysis.
#[derive(Clone)]
pub struct ConsensusRepository {
    pool: PgPool,
}

impl ConsensusRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ConsensusRepositoryTrait for ConsensusRepository {
    async fn insert(&self, run: &ConsensusRun) -> DbResult<()> {
        sqlx::query!(
            r#"
            INSERT INTO consensus_runs (
                run_id,
                input_hash,
                winner_model,
                candidates_count,
                consensus_latency_ms,
                total_latency_ms,
                candidates,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
            run.run_id,
            run.input_hash,
            run.winner_model,
            run.candidates_count,
            run.consensus_latency_ms,
            run.total_latency_ms,
            run.candidates,
            run.created_at
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to insert consensus run {}: {}", run.run_id, e);
            DbError::Connection(e)
        })?;

        tracing::debug!("Consensus run inserted: {}", run.run_id);
        Ok(())
    }

    async fn get(&self, run_id: &str) -> DbResult<Option<ConsensusRun>> {
        let row = sqlx::query!(
            r#"
            SELECT
                run_id,
                input_hash,
                winner_model,
                candidates_count,
                consensus_latency_ms,
                total_latency_ms,
                candidates,
                created_at
            FROM consensus_runs
            WHERE run_id = $1
            "#,
            run_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch consensus run {}: {}", run_id, e);
            DbError::Connection(e)
        })?;

        Ok(row.map(|r| ConsensusRun {
            run_id: r.run_id,
            input_hash: r.input_hash,
            winner_model: r.winner_model,
            candidates_count: r.candidates_count,
            consensus_latency_ms: r.consensus_latency_ms,
            total_latency_ms: r.total_latency_ms,
            candidates: r.candidates,
            created_at: r.created_at,
        }))
    }

    async fn get_recent(&self, limit: i64) -> DbResult<Vec<ConsensusRun>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                run_id,
                input_hash,
                winner_model,
                candidates_count,
                consensus_latency_ms,
                total_latency_ms,
                candidates,
                created_at
            FROM consensus_runs
            ORDER BY created_at DESC
            LIMIT $1
            "#,
            limit
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch recent consensus runs: {}", e);
            DbError::Connection(e)
        })?;

        Ok(rows
            .into_iter()
            .map(|r| ConsensusRun {
                run_id: r.run_id,
                input_hash: r.input_hash,
                winner_model: r.winner_model,
                candidates_count: r.candidates_count,
                consensus_latency_ms: r.consensus_latency_ms,
                total_latency_ms: r.total_latency_ms,
                candidates: r.candidates,
                created_at: r.created_at,
            })
            .collect())
    }

    async fn avg_latency_by_model(&self, model: &str) -> DbResult<Option<f64>> {
        let row = sqlx::query!(
            r#"
            SELECT AVG(consensus_latency_ms)::float8 as "avg_latency: f64"
            FROM consensus_runs
            WHERE winner_model = $1
            "#,
            model
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to calculate avg latency for {}: {}", model, e);
            DbError::Connection(e)
        })?;

        Ok(row.avg_latency)
    }
}
