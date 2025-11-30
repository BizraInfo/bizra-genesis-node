// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - POI REWARDS API HANDLERS                           ║
// ║  Reward distribution endpoint handlers                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension,
    Json,
};
use std::sync::Arc;
use chrono::Utc;
use uuid::Uuid;

use crate::{
    api::middleware::jwt::AuthenticatedUser,
    rewards::{RewardError, RewardService},
    AppState,
};

use super::types::{EpochDistributionSummary, SettlementBatch, EpochListItem, EpochListQuery, RewardEpochStatus};

#[tracing::instrument(skip(state, user))]
pub async fn distribute_epoch_handler(
    State(state): State<AppState>,
    Path(epoch_id): Path<Uuid>,
    Extension(user): Extension<Arc<AuthenticatedUser>>,
) -> Result<(StatusCode, Json<EpochDistributionSummary>), (StatusCode, String)> {
    // Basic authz: require admin role
    if !user.roles.iter().any(|r| r == "admin") {
        return Err((StatusCode::FORBIDDEN, "Forbidden".into()));
    }

    let now = Utc::now();

    // 1) Run atomic close + distribute
    match state
        .reward_service
        .close_and_distribute_epoch(epoch_id, now)
        .await
    {
        Ok(()) => {
            // proceed to build summary
        }
        Err(RewardError::EpochNotFound) => {
            return Err((StatusCode::NOT_FOUND, "Epoch not found".into()));
        }
        Err(RewardError::EpochNotActive(_)) => {
            // Already closed/distributed / invalid state for distribution
            return Err((
                StatusCode::CONFLICT,
                "Epoch is not active (already closed or distributed)".into(),
            ));
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to distribute epoch rewards");
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Failed to distribute epoch rewards: {e}"),
            ));
        }
    }

    // 2) Fetch distribution summary
    let epoch = sqlx::query!(
        r#"
        SELECT
            id,
            total_pool,
            status as "status: RewardEpochStatus",
            closed_at,
            distributed_at
        FROM poi_reward_epoch
        WHERE id = $1
        "#,
        epoch_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to load epoch after distribution");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to load epoch summary".into(),
        )
    })?;

    let agg = sqlx::query!(
        r#"
        SELECT
            COUNT(*)::bigint as "contributors!",
            COALESCE(SUM(pcs.total_score), 0)::NUMERIC(38,18) as "total_score!",
            COALESCE(SUM(pr.amount), 0)::NUMERIC(38,18)      as "total_distributed!"
        FROM poi_contributor_scores pcs
        JOIN poi_rewards pr
          ON pr.epoch_id = pcs.epoch_id
         AND pr.contributor_id = pcs.contributor_id
        WHERE pcs.epoch_id = $1
        "#,
        epoch_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to load epoch aggregates");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to load epoch aggregates".into(),
        )
    })?;

    let summary = EpochDistributionSummary {
        epoch_id: epoch.id,
        status: epoch.status,
        total_pool: epoch.total_pool,
        contributors: agg.contributors,
        total_score: agg.total_score,
        total_distributed: agg.total_distributed,
        closed_at: epoch.closed_at,
        distributed_at: epoch.distributed_at,
    };

    Ok((StatusCode::OK, Json(summary)))
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTLEMENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

#[tracing::instrument(skip(state, user))]
pub async fn submit_epoch_settlement_handler(
    State(state): State<AppState>,
    Path(epoch_id): Path<Uuid>,
    Extension(user): Extension<Arc<AuthenticatedUser>>,
) -> Result<(StatusCode, Json<SettlementBatch>), (StatusCode, String)> {
    // Basic authz: require admin role
    if !user.roles.iter().any(|r| r == "admin") {
        return Err((StatusCode::FORBIDDEN, "Forbidden".into()));
    }

    // Submit settlement batch to ledger/external system
    match state
        .settlement_service
        .submit_settlement(epoch_id)
        .await
    {
        Ok(batch) => Ok((StatusCode::OK, Json(batch))),
        Err(crate::rewards::SettlementError::AlreadySettled(_)) => {
            return Err((
                StatusCode::CONFLICT,
                "Settlement already submitted for this epoch".into(),
            ));
        }
        Err(crate::rewards::SettlementError::NoPendingSettlements(_)) => {
            return Err((
                StatusCode::BAD_REQUEST,
                "No pending rewards to settle in this epoch".into(),
            ));
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to submit epoch settlement");
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Failed to submit settlement: {e}"),
            ));
        }
    }
}

#[tracing::instrument(skip(state, user))]
pub async fn confirm_epoch_settlement_handler(
    State(state): State<AppState>,
    Path(epoch_id): Path<Uuid>,
    Extension(user): Extension<Arc<AuthenticatedUser>>,
) -> Result<StatusCode, (StatusCode, String)> {
    // Basic authz: require admin role
    if !user.roles.iter().any(|r| r == "admin") {
        return Err((StatusCode::FORBIDDEN, "Forbidden".into()));
    }

    // Confirm settlement (called after external system acknowledges)
    match state
        .settlement_service
        .confirm_settlement(epoch_id)
        .await
    {
        Ok(()) => Ok(StatusCode::OK),
        Err(crate::rewards::SettlementError::NoPendingSettlements(_)) => {
            return Err((
                StatusCode::BAD_REQUEST,
                "No submitted settlements to confirm".into(),
            ));
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to confirm epoch settlement");
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Failed to confirm settlement: {e}"),
            ));
        }
    }
}

#[tracing::instrument(skip(state))]
pub async fn get_epoch_settlement_handler(
    State(state): State<AppState>,
    Path(epoch_id): Path<Uuid>,
) -> Result<Json<Option<SettlementBatch>>, (StatusCode, String)> {
    // Get settlement status (can be queried by admins and possibly contributors)
    match state
        .settlement_service
        .get_epoch_settlement(epoch_id)
        .await
    {
        Ok(settlement) => Ok(Json(settlement)),
        Err(e) => {
            tracing::error!(error = %e, "Failed to get epoch settlement");
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to get settlement status: {e}"),
            ))
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// EPOCH LISTING HANDLER
// ═══════════════════════════════════════════════════════════════════════════

#[tracing::instrument(skip(state))]
pub async fn list_epochs_handler(
    State(state): State<AppState>,
    query: axum::extract::Query<EpochListQuery>,
) -> Result<Json<Vec<EpochListItem>>, (StatusCode, String)> {
    // Build WHERE clause based on optional status filter
    let status_filter = query.status.as_ref().map(|s| s.as_str());
    
    let epochs = if let Some(status) = status_filter {
        sqlx::query_as!(
            EpochListItem,
            r#"
            SELECT
                id,
                start_timestamp,
                end_timestamp,
                total_pool,
                status as "status: RewardEpochStatus",
                created_at,
                closed_at,
                distributed_at,
                settlement_batch_id
            FROM poi_reward_epoch
            WHERE status = $1
            ORDER BY created_at DESC
            "#,
            status
        )
        .fetch_all(&state.db)
        .await
    } else {
        sqlx::query_as!(
            EpochListItem,
            r#"
            SELECT
                id,
                start_timestamp,
                end_timestamp,
                total_pool,
                status as "status: RewardEpochStatus",
                created_at,
                closed_at,
                distributed_at,
                settlement_batch_id
            FROM poi_reward_epoch
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&state.db)
        .await
    };

    match epochs {
        Ok(epochs) => Ok(Json(epochs)),
        Err(e) => {
            tracing::error!(error = %e, "Failed to list reward epochs");
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to list epochs: {e}"),
            ))
        }
    }
}
