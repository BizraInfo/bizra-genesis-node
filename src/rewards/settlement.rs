// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SETTLEMENT BRIDGE                                  ║
// ║  Ledger-agnostic settlement service for token distribution              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use thiserror::Error;
use uuid::Uuid;

/// Settlement statuses that work with any ledger system
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SettlementStatus {
    Pending,
    Submitted,
    Confirmed,
    Failed,
}

/// Settlement error types
#[derive(Debug, Error)]
pub enum SettlementError {
    #[error("Settlement service error: {0}")]
    Service(String),
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Settlement already exists for epoch {0}")]
    AlreadySettled(Uuid),
    #[error("No pending settlements found for epoch {0}")]
    NoPendingSettlements(Uuid),
    #[error("Settlement batch ID is missing from database")]
    MissingBatchId,
}

/// Settlement batch result - links rewards to ledger transactions
#[derive(Debug)]
pub struct SettlementBatch {
    pub batch_id: String,
    pub epoch_id: Uuid,
    pub settlement_count: i64,
    pub total_amount: BigDecimal,
    pub submitted_at: DateTime<Utc>,
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTLEMENT SERVICE - Ledger-agnostic reward distribution
// ═══════════════════════════════════════════════════════════════════════════

/// Settlement service for processing reward distributions
///
/// This service handles the bridge between POI rewards calculation
/// and actual token/value transfer on any ledger system.
///
/// # Design Philosophy
/// - Ledger-agnostic: Works with blockchain, traditional banking, or internal credits
/// - Idempotent: Safe to retry failed settlements
/// - Auditable: Every operation creates immutable records
#[derive(Clone)]
#[allow(dead_code)] // pool used in database feature
pub struct SettlementService {
    pool: PgPool,
}

impl SettlementService {
    /// Create new settlement service with database connection
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Submit a settlement batch for an epoch
    ///
    /// This collects all pending rewards for the epoch and prepares
    /// them for ledger submission. The actual transfer is ledger-specific.
    ///
    /// # Arguments
    /// * `epoch_id` - The POI epoch to settle
    ///
    /// # Returns
    /// * `SettlementBatch` - Details of the submitted batch
    pub async fn submit_batch(&self, epoch_id: Uuid) -> Result<SettlementBatch, SettlementError> {
        // Phase 1: Validate epoch is ready for settlement
        let epoch_ready = self.validate_epoch_ready(epoch_id).await?;
        if !epoch_ready {
            return Err(SettlementError::Service(format!(
                "Epoch {} is not ready for settlement",
                epoch_id
            )));
        }

        // Phase 2: Check for existing settlement
        if let Some(existing) = self.get_existing_settlement(epoch_id).await? {
            return Err(SettlementError::AlreadySettled(existing));
        }

        // Phase 3: Aggregate all pending rewards for this epoch
        let (settlement_count, total_amount) = self.aggregate_pending_rewards(epoch_id).await?;

        // Phase 4: Create settlement batch record
        let batch_id = format!("settlement_{}_{}", epoch_id, Utc::now().timestamp());
        let submitted_at = Utc::now();

        // Insert settlement batch into database
        sqlx::query!(
            r#"
            INSERT INTO settlement_batches (
                batch_id, epoch_id, status, settlement_count, total_amount,
                submitted_at, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
            batch_id,
            epoch_id,
            "pending",
            settlement_count,
            total_amount,
            submitted_at,
            Utc::now(),
            Utc::now()
        )
        .execute(&self.pool)
        .await?;

        // Phase 5: Update individual reward records to "settled"
        self.update_reward_statuses(epoch_id, &batch_id).await?;

        Ok(SettlementBatch {
            batch_id,
            epoch_id,
            settlement_count,
            total_amount,
            submitted_at,
        })
    }

    /// Get the status of a settlement batch
    pub async fn get_status(&self, batch_id: &str) -> Result<SettlementStatus, SettlementError> {
        // Query the settlement status from database
        let result = sqlx::query!(
            r#"
            SELECT status
            FROM settlement_batches
            WHERE batch_id = $1
            "#,
            batch_id
        )
        .fetch_optional(&self.pool)
        .await?;

        match result {
            Some(record) => {
                match record.status.as_str() {
                    "pending" => Ok(SettlementStatus::Pending),
                    "submitted" => Ok(SettlementStatus::Submitted),
                    "confirmed" => Ok(SettlementStatus::Confirmed),
                    "failed" => Ok(SettlementStatus::Failed),
                    _ => Ok(SettlementStatus::Pending), // Default fallback
                }
            }
            None => Err(SettlementError::Service(format!(
                "Settlement batch {} not found",
                batch_id
            ))),
        }
    }

    /// Confirm a settlement after ledger verification
    pub async fn confirm_settlement(&self, batch_id: &str) -> Result<(), SettlementError> {
        // Verify batch exists
        let current_status = self.get_status(batch_id).await?;
        if current_status != SettlementStatus::Submitted {
            return Err(SettlementError::Service(format!(
                "Can only confirm settlements that are submitted, current status: {:?}",
                current_status
            )));
        }

        // Update settlement status to confirmed
        sqlx::query!(
            r#"
            UPDATE settlement_batches
            SET status = 'confirmed', confirmed_at = $2, updated_at = $3
            WHERE batch_id = $1
            "#,
            batch_id,
            Utc::now(),
            Utc::now()
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Mark a settlement as failed with reason
    pub async fn fail_settlement(
        &self,
        batch_id: &str,
        reason: &str,
    ) -> Result<(), SettlementError> {
        // Verify batch exists
        let _current_status = self.get_status(batch_id).await?;

        // Update settlement status to failed
        sqlx::query!(
            r#"
            UPDATE settlement_batches
            SET status = 'failed', failure_reason = $2, updated_at = $3
            WHERE batch_id = $1
            "#,
            batch_id,
            reason,
            Utc::now()
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Submit settlement batch to ledger (placeholder for ledger integration)
    pub async fn submit_to_ledger(
        &self,
        _batch_id: &str,
        _ledger_config: serde_json::Value,
    ) -> Result<(), SettlementError> {
        // This would integrate with:
        // - Blockchain (Ethereum, Solana, etc.)
        // - Traditional banking APIs
        // - Internal credit ledger
        // - Token smart contracts

        // For now, just update status to submitted
        sqlx::query!(
            r#"
            UPDATE settlement_batches
            SET status = 'submitted', submitted_to_ledger_at = $2, updated_at = $3
            WHERE batch_id = $1
            "#,
            _batch_id,
            Utc::now(),
            Utc::now()
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Helper methods for submit_batch

    /// Validate that an epoch is ready for settlement
    async fn validate_epoch_ready(&self, epoch_id: Uuid) -> Result<bool, SettlementError> {
        // Check if epoch exists and has completed rewards
        let result = sqlx::query!(
            r#"
            SELECT COUNT(*) as reward_count
            FROM poi_rewards
            WHERE epoch_id = $1 AND status = 'pending'
            "#,
            epoch_id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(result.reward_count.unwrap_or(0) > 0)
    }

    /// Check if settlement already exists for this epoch
    async fn get_existing_settlement(
        &self,
        epoch_id: Uuid,
    ) -> Result<Option<Uuid>, SettlementError> {
        let result = sqlx::query!(
            r#"
            SELECT batch_id
            FROM settlement_batches
            WHERE epoch_id = $1
            LIMIT 1
            "#,
            epoch_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.and_then(|r| r.batch_id.parse().ok().map(|_| epoch_id)))
    }

    /// Aggregate pending rewards for this epoch
    async fn aggregate_pending_rewards(
        &self,
        epoch_id: Uuid,
    ) -> Result<(i64, BigDecimal), SettlementError> {
        let result = sqlx::query!(
            r#"
            SELECT
                COUNT(*) as settlement_count,
                COALESCE(SUM(amount), 0) as total_amount
            FROM poi_rewards
            WHERE epoch_id = $1 AND status = 'pending'
            "#,
            epoch_id
        )
        .fetch_one(&self.pool)
        .await?;

        let count = result.settlement_count.unwrap_or(0);
        let amount = result.total_amount.unwrap_or(BigDecimal::from(0));

        Ok((count, amount))
    }

    /// Update individual reward statuses to 'settled'
    async fn update_reward_statuses(
        &self,
        epoch_id: Uuid,
        batch_id: &str,
    ) -> Result<(), SettlementError> {
        sqlx::query!(
            r#"
            UPDATE poi_rewards
            SET status = 'settled', settlement_batch_id = $2, updated_at = $3
            WHERE epoch_id = $1 AND status = 'pending'
            "#,
            epoch_id,
            batch_id,
            Utc::now()
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
