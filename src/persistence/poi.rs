// synthesis_orchestrator/src/persistence/poi.rs
// Proof-of-Impact repository for analytics

use crate::persistence::traits::{ProofOfImpactRecord, ProofOfImpactRepositoryTrait};
use crate::persistence::{DbError, DbResult};
use async_trait::async_trait;
use sqlx::PgPool;

/// Proof-of-Impact repository
///
/// Manages PoI analytics and reporting for value creation tracking.
#[derive(Clone)]
pub struct ProofOfImpactRepository {
    pool: PgPool,
}

impl ProofOfImpactRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ProofOfImpactRepositoryTrait for ProofOfImpactRepository {
    async fn insert(&self, poi: &ProofOfImpactRecord) -> DbResult<()> {
        sqlx::query!(
            r#"
            INSERT INTO proof_of_impact (
                receipt_id,
                model_name,
                quality,
                utility,
                trust,
                fairness,
                diversity,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
            poi.receipt_id,
            poi.model_name,
            poi.quality,
            poi.utility,
            poi.trust,
            poi.fairness,
            poi.diversity,
            poi.created_at
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to insert PoI for {}: {}", poi.receipt_id, e);
            DbError::Connection(e)
        })?;

        tracing::debug!(
            "PoI inserted: {} (score: {:.2})",
            poi.receipt_id,
            (poi.quality + poi.utility + poi.trust + poi.fairness + poi.diversity) / 100.0
        );
        Ok(())
    }

    async fn get_by_receipt(&self, receipt_id: &str) -> DbResult<Vec<ProofOfImpactRecord>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                receipt_id,
                model_name,
                quality,
                utility,
                trust,
                fairness,
                diversity,
                created_at
            FROM proof_of_impact
            WHERE receipt_id = $1
            "#,
            receipt_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch PoI for receipt {}: {}", receipt_id, e);
            DbError::Connection(e)
        })?;

        Ok(rows
            .into_iter()
            .map(|r| ProofOfImpactRecord {
                receipt_id: r.receipt_id,
                model_name: r.model_name,
                quality: r.quality,
                utility: r.utility,
                trust: r.trust,
                fairness: r.fairness,
                diversity: r.diversity,
                created_at: r.created_at.and_utc(),
            })
            .collect())
    }

    async fn avg_score_by_model(&self, model: &str) -> DbResult<Option<f64>> {
        let row = sqlx::query!(
            r#"
            SELECT AVG(normalized_score) as avg_score
            FROM proof_of_impact
            WHERE model_name = $1
            "#,
            model
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to calculate avg PoI for {}: {}", model, e);
            DbError::Connection(e)
        })?;

        Ok(row.avg_score.map(|v| v as f64))
    }

    async fn get_top_scores(&self, limit: i64) -> DbResult<Vec<ProofOfImpactRecord>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                receipt_id,
                model_name,
                quality,
                utility,
                trust,
                fairness,
                diversity,
                created_at
            FROM proof_of_impact
            ORDER BY normalized_score DESC
            LIMIT $1
            "#,
            limit
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch top PoI scores: {}", e);
            DbError::Connection(e)
        })?;

        Ok(rows
            .into_iter()
            .map(|r| ProofOfImpactRecord {
                receipt_id: r.receipt_id,
                model_name: r.model_name,
                quality: r.quality,
                utility: r.utility,
                trust: r.trust,
                fairness: r.fairness,
                diversity: r.diversity,
                created_at: r.created_at.and_utc(),
            })
            .collect())
    }
}
