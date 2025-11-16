// synthesis_orchestrator/src/persistence/receipts.rs
// Trust receipt repository implementation with compile-time query verification

use crate::persistence::traits::ReceiptRepositoryTrait;
use crate::persistence::{DbError, DbResult};
use crate::trust::RunReceipt;
use async_trait::async_trait;
use sqlx::PgPool;

/// Trust receipt repository
///
/// Provides persistence for cryptographic receipts with Ed25519 signatures.
/// All queries are verified at compile-time via SQLx macros.
#[derive(Clone)]
pub struct ReceiptRepository {
    pool: PgPool,
}

impl ReceiptRepository {
    /// Creates a new receipt repository
    ///
    /// # Arguments
    ///
    /// * `pool` - PostgreSQL connection pool
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ReceiptRepositoryTrait for ReceiptRepository {
    /// Inserts a new trust receipt
    ///
    /// # Arguments
    ///
    /// * `receipt` - Trust receipt to persist
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Receipt inserted successfully
    /// * `Err(DbError)` - Database error or constraint violation
    async fn insert(&self, receipt: &RunReceipt) -> DbResult<()> {
        let poi_json = receipt
            .proof_of_impact
            .as_ref()
            .map(|p| serde_json::to_value(p))
            .transpose()?;

        sqlx::query!(
            r#"
            INSERT INTO trust_receipts (
                run_id,
                inputs_sha256,
                winner_model,
                winner_json_sha256,
                consensus_hash_hex,
                policy_version,
                pattern_pack_sha256,
                timestamp_ms,
                public_key_der,
                signature,
                proof_of_impact
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (run_id) DO NOTHING
            "#,
            receipt.run_id,
            receipt.inputs_sha256,
            receipt.winner_model,
            receipt.winner_json_sha256,
            receipt.consensus_hash_hex,
            receipt.policy_version,
            receipt.pattern_pack_sha256,
            receipt.timestamp_ms as i64,
            receipt.public_key_der,
            receipt.signature,
            poi_json
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to insert receipt {}: {}", receipt.run_id, e);
            DbError::Connection(e)
        })?;

        tracing::debug!("Receipt inserted: {}", receipt.run_id);
        Ok(())
    }

    /// Retrieves a receipt by run_id
    ///
    /// # Arguments
    ///
    /// * `run_id` - Unique run identifier
    ///
    /// # Returns
    ///
    /// * `Ok(Some(RunReceipt))` - Receipt found
    /// * `Ok(None)` - Receipt not found
    /// * `Err(DbError)` - Database error
    async fn get(&self, run_id: &str) -> DbResult<Option<RunReceipt>> {
        let row = sqlx::query!(
            r#"
            SELECT
                run_id,
                inputs_sha256,
                winner_model,
                winner_json_sha256,
                consensus_hash_hex,
                policy_version,
                pattern_pack_sha256,
                timestamp_ms,
                public_key_der,
                signature,
                proof_of_impact
            FROM trust_receipts
            WHERE run_id = $1
            "#,
            run_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch receipt {}: {}", run_id, e);
            DbError::Connection(e)
        })?;

        Ok(row.map(|r| RunReceipt {
            run_id: r.run_id,
            inputs_sha256: r.inputs_sha256,
            winner_model: r.winner_model,
            winner_json_sha256: r.winner_json_sha256,
            consensus_hash_hex: r.consensus_hash_hex,
            policy_version: r.policy_version,
            pattern_pack_sha256: r.pattern_pack_sha256,
            timestamp_ms: r.timestamp_ms as u64,
            public_key_der: r.public_key_der,
            signature: r.signature,
            proof_of_impact: r
                .proof_of_impact
                .and_then(|v| serde_json::from_value(v).ok()),
        }))
    }

    /// Retrieves all receipts for a specific model
    ///
    /// # Arguments
    ///
    /// * `model` - Model name to filter by
    /// * `limit` - Maximum number of results
    ///
    /// # Returns
    ///
    /// Vector of receipts for the specified model
    async fn get_by_model(&self, model: &str, limit: i64) -> DbResult<Vec<RunReceipt>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                run_id,
                inputs_sha256,
                winner_model,
                winner_json_sha256,
                consensus_hash_hex,
                policy_version,
                pattern_pack_sha256,
                timestamp_ms,
                public_key_der,
                signature,
                proof_of_impact
            FROM trust_receipts
            WHERE winner_model = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
            model,
            limit
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch receipts by model {}: {}", model, e);
            DbError::Connection(e)
        })?;

        Ok(rows
            .into_iter()
            .map(|r| RunReceipt {
                run_id: r.run_id,
                inputs_sha256: r.inputs_sha256,
                winner_model: r.winner_model,
                winner_json_sha256: r.winner_json_sha256,
                consensus_hash_hex: r.consensus_hash_hex,
                policy_version: r.policy_version,
                pattern_pack_sha256: r.pattern_pack_sha256,
                timestamp_ms: r.timestamp_ms as u64,
                public_key_der: r.public_key_der,
                signature: r.signature,
                proof_of_impact: r
                    .proof_of_impact
                    .and_then(|v| serde_json::from_value(v).ok()),
            })
            .collect())
    }

    /// Retrieves recent receipts
    ///
    /// # Arguments
    ///
    /// * `limit` - Maximum number of results
    ///
    /// # Returns
    ///
    /// Vector of most recent receipts
    async fn get_recent(&self, limit: i64) -> DbResult<Vec<RunReceipt>> {
        let rows = sqlx::query!(
            r#"
            SELECT
                run_id,
                inputs_sha256,
                winner_model,
                winner_json_sha256,
                consensus_hash_hex,
                policy_version,
                pattern_pack_sha256,
                timestamp_ms,
                public_key_der,
                signature,
                proof_of_impact
            FROM trust_receipts
            ORDER BY created_at DESC
            LIMIT $1
            "#,
            limit
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch recent receipts: {}", e);
            DbError::Connection(e)
        })?;

        Ok(rows
            .into_iter()
            .map(|r| RunReceipt {
                run_id: r.run_id,
                inputs_sha256: r.inputs_sha256,
                winner_model: r.winner_model,
                winner_json_sha256: r.winner_json_sha256,
                consensus_hash_hex: r.consensus_hash_hex,
                policy_version: r.policy_version,
                pattern_pack_sha256: r.pattern_pack_sha256,
                timestamp_ms: r.timestamp_ms as u64,
                public_key_der: r.public_key_der,
                signature: r.signature,
                proof_of_impact: r
                    .proof_of_impact
                    .and_then(|v| serde_json::from_value(v).ok()),
            })
            .collect())
    }

    /// Counts total receipts
    ///
    /// # Returns
    ///
    /// Total number of receipts in database
    async fn count(&self) -> DbResult<i64> {
        let row = sqlx::query!("SELECT COUNT(*) as count FROM trust_receipts")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to count receipts: {}", e);
                DbError::Connection(e)
            })?;

        Ok(row.count.unwrap_or(0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::trust::ProofOfImpact;
    use crate::Candidate;
    use serde_json::json;

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL instance
    async fn test_insert_receipt() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());

        let pool = PgPool::connect(&database_url).await.unwrap();
        let repo = ReceiptRepository::new(pool);

        let candidate = Candidate {
            model: "test-model".to_string(),
            json: json!({"result": "test"}),
            cost_usd: 0.01,
            latency_ms: 1000,
            scores: crate::CandidateScores::default(),
        };

        let mut receipt = RunReceipt::new("test-run-123".to_string(), &candidate);
        receipt.proof_of_impact = Some(ProofOfImpact {
            quality: 90.0,
            utility: 85.0,
            trust: 88.0,
            fairness: 82.0,
            diversity: 78.0,
        });

        let result = repo.insert(&receipt).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires running PostgreSQL instance
    async fn test_get_receipt() {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/bizra_test".to_string());

        let pool = PgPool::connect(&database_url).await.unwrap();
        let repo = ReceiptRepository::new(pool);

        let result = repo.get("test-run-123").await;
        assert!(result.is_ok());
    }
}
