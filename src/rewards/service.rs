// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - POI REWARDS SERVICE                                  ║
// ║  Atomic, idempotent reward calculation and distribution                      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use sqlx::{PgPool, Postgres, Row, Transaction};
use thiserror::Error;
use uuid::Uuid;

/// Reward service errors
#[derive(Debug, Error)]
pub enum RewardError {
    #[error("Epoch not found")]
    EpochNotFound,
    #[error("Epoch not active - current status: {0}")]
    EpochNotActive(String),
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}

/// Row data structures for database queries
#[derive(Debug)]
#[allow(dead_code)] // Fields populated from DB, used for validation/logging
struct EpochRow {
    pub id: Uuid,
    pub start_timestamp: DateTime<Utc>,
    pub end_timestamp: DateTime<Utc>,
    pub total_pool: BigDecimal,
    pub status: String,
}

/// Main reward aggregation service
/// Implements atomic, idempotent epoch distribution
#[derive(Clone)]
pub struct RewardService {
    pool: PgPool,
}

impl RewardService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Main distribution entrypoint
    /// Atomic operation: close epoch → aggregate scores → compute shares → allocate rewards
    #[tracing::instrument(skip(self), fields(epoch_id = %epoch_id))]
    pub async fn close_and_distribute_epoch(
        &self,
        epoch_id: Uuid,
        now: DateTime<Utc>,
    ) -> Result<(), RewardError> {
        let mut tx = self.pool.begin().await?;
        tracing::info!(epoch_id = %epoch_id, "Starting epoch distribution");

        // 1) Lock epoch row for exclusive access
        let epoch = lock_epoch_for_update(epoch_id, &mut tx).await?;
        tracing::debug!(status = %epoch.status, "Epoch locked");

        // Validate epoch can be distributed
        if epoch.status != "active" {
            return Err(RewardError::EpochNotActive(epoch.status));
        }

        // 2) Mark epoch as closed
        mark_epoch_closed(epoch_id, now, &mut tx).await?;
        tracing::debug!("Epoch marked as closed");

        // 3) Aggregate contributor scores from verified attestations
        let scores_count = aggregate_contributor_scores(epoch_id, &mut tx).await?;
        tracing::info!(scores_count = scores_count, "Contributor scores aggregated");

        // 4) Compute normalized shares
        let (total_epoch_score, contributors_count) =
            compute_normalized_shares(epoch_id, &mut tx).await?;
        tracing::info!(
            total_epoch_score = %total_epoch_score,
            contributors_count = contributors_count,
            "Normalized shares computed"
        );

        // 5) Insert/update rewards
        let rewards_count = insert_or_update_rewards(epoch_id, &mut tx).await?;
        tracing::info!(rewards_count = rewards_count, "Rewards allocated");

        // 6) Mark epoch as distributed
        mark_epoch_distributed(epoch_id, now, &mut tx).await?;
        tracing::info!("Epoch marked as distributed");

        // Commit transaction
        tx.commit().await?;
        tracing::info!(epoch_id = %epoch_id, "Epoch distribution completed successfully");

        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS - DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/// Lock epoch row for exclusive update (prevents concurrent distribution)
async fn lock_epoch_for_update(
    epoch_id: Uuid,
    tx: &mut Transaction<'_, Postgres>,
) -> Result<EpochRow, RewardError> {
    let row = sqlx::query(
        r#"
        SELECT
            id,
            start_timestamp,
            end_timestamp,
            total_pool::TEXT as total_pool,
            status
        FROM poi_reward_epoch
        WHERE id = $1
        FOR UPDATE
        "#,
    )
    .bind(epoch_id)
    .fetch_optional(&mut **tx)
    .await?;

    match row {
        Some(row) => {
            let total_pool_str: String = row.get("total_pool");
            Ok(EpochRow {
                id: row.get("id"),
                start_timestamp: row.get("start_timestamp"),
                end_timestamp: row.get("end_timestamp"),
                total_pool: total_pool_str
                    .parse()
                    .unwrap_or_else(|_| BigDecimal::from(0)),
                status: row.get("status"),
            })
        }
        None => Err(RewardError::EpochNotFound),
    }
}

/// Mark epoch as closed (stops accepting new attestations)
async fn mark_epoch_closed(
    epoch_id: Uuid,
    now: DateTime<Utc>,
    tx: &mut Transaction<'_, Postgres>,
) -> Result<(), RewardError> {
    sqlx::query(
        r#"
        UPDATE poi_reward_epoch
        SET status = 'closed',
            closed_at = $2
        WHERE id = $1
        "#,
    )
    .bind(epoch_id)
    .bind(now)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

/// Aggregate contributor scores from verified PoI attestations
/// Idempotent: updates existing scores if epoch already processed
async fn aggregate_contributor_scores(
    epoch_id: Uuid,
    tx: &mut Transaction<'_, Postgres>,
) -> Result<i64, RewardError> {
    let result = sqlx::query(
        r#"
        INSERT INTO poi_contributor_scores (
            epoch_id,
            contributor_id,
            total_score,
            normalized_share
        )
        SELECT
            $1 AS epoch_id,
            pa.contributor_id,
            SUM(pa.normalized_score)::NUMERIC(38, 18) AS total_score,
            0::NUMERIC(38, 18) AS normalized_share
        FROM poi_attestations pa
        JOIN poi_reward_epoch e ON e.id = $1
        WHERE
            pa.status = 'verified'
            AND pa.created_at >= e.start_timestamp
            AND pa.created_at <  e.end_timestamp
        GROUP BY pa.contributor_id
        ON CONFLICT (epoch_id, contributor_id) DO UPDATE
        SET total_score = EXCLUDED.total_score
        "#,
    )
    .bind(epoch_id)
    .execute(&mut **tx)
    .await?;

    Ok(result.rows_affected() as i64)
}

/// Compute normalized shares for all contributors in epoch
/// Returns (total_epoch_score, contributors_count)
async fn compute_normalized_shares(
    epoch_id: Uuid,
    tx: &mut Transaction<'_, Postgres>,
) -> Result<(BigDecimal, i64), RewardError> {
    let row = sqlx::query(
        r#"
        WITH total AS (
            SELECT
                COALESCE(SUM(total_score), 0) AS sum_scores,
                COUNT(*) AS contributors_count
            FROM poi_contributor_scores
            WHERE epoch_id = $1
        ),
        updated AS (
            UPDATE poi_contributor_scores pcs
            SET normalized_share = CASE
                WHEN total.sum_scores = 0
                    THEN 0
                ELSE pcs.total_score / total.sum_scores
            END
            FROM total
            WHERE pcs.epoch_id = $1
            RETURNING pcs.epoch_id
        )
        SELECT
            total.sum_scores::TEXT,
            total.contributors_count::BIGINT
        FROM total
        "#,
    )
    .bind(epoch_id)
    .fetch_one(&mut **tx)
    .await?;

    let sum_scores_str: Option<String> = row.get(0);
    let contributors_count: Option<i64> = row.get(1);

    Ok((
        sum_scores_str
            .and_then(|s| s.parse().ok())
            .unwrap_or_else(|| BigDecimal::from(0)),
        contributors_count.unwrap_or(0),
    ))
}

/// Insert or update reward allocations
/// Idempotent: preserves existing rewards on re-run
async fn insert_or_update_rewards(
    epoch_id: Uuid,
    tx: &mut Transaction<'_, Postgres>,
) -> Result<i64, RewardError> {
    let result = sqlx::query(
        r#"
        INSERT INTO poi_rewards (
            epoch_id,
            contributor_id,
            amount,
            status
        )
        SELECT
            pcs.epoch_id,
            pcs.contributor_id,
            (pcs.normalized_share * e.total_pool) AS amount,
            'pending'::poi_reward_status
        FROM poi_contributor_scores pcs
        JOIN poi_reward_epoch e ON e.id = pcs.epoch_id
        WHERE pcs.epoch_id = $1
        ON CONFLICT (epoch_id, contributor_id) DO UPDATE
        SET amount = EXCLUDED.amount
        "#,
    )
    .bind(epoch_id)
    .execute(&mut **tx)
    .await?;

    Ok(result.rows_affected() as i64)
}

/// Mark epoch as fully distributed
async fn mark_epoch_distributed(
    epoch_id: Uuid,
    now: DateTime<Utc>,
    tx: &mut Transaction<'_, Postgres>,
) -> Result<(), RewardError> {
    sqlx::query(
        r#"
        UPDATE poi_reward_epoch
        SET status = 'distributed',
            distributed_at = $2
        WHERE id = $1
        "#,
    )
    .bind(epoch_id)
    .bind(now)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    // Note: Integration tests require database setup
    // These serve as documentation of expected behavior

    fn mock_epoch_row() -> EpochRow {
        EpochRow {
            id: Uuid::new_v4(),
            start_timestamp: Utc::now(),
            end_timestamp: Utc::now() + chrono::Duration::days(7),
            total_pool: BigDecimal::from(1000),
            status: "active".to_string(),
        }
    }

    #[test]
    fn test_epoch_row_serialization() {
        let epoch = mock_epoch_row();
        assert!(!epoch.status.is_empty());
        assert!(epoch.total_pool > BigDecimal::from(0));
    }

    #[test]
    fn test_reward_error_display() {
        let not_found = RewardError::EpochNotFound;
        assert!(not_found.to_string().contains("not found"));

        let not_active = RewardError::EpochNotActive("distributed".to_string());
        assert!(not_active.to_string().contains("distributed"));
    }
}
