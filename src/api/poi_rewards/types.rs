// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - POI REWARDS API TYPES                               ║
// ║  Types for reward distribution endpoints and responses                    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;
use bigdecimal::BigDecimal;

// Re-export from rewards module
pub use crate::rewards::SettlementBatch;

// Define RewardEpochStatus enum for database mapping
#[derive(Debug, Clone, Copy, sqlx::Type, serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
#[sqlx(type_name = "poi_reward_epoch_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum RewardEpochStatus {
    Active,
    Closed,
    Distributed,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct EpochDistributionSummary {
    pub epoch_id: Uuid,
    pub status: RewardEpochStatus,
    pub total_pool: BigDecimal,
    pub contributors: i64,
    pub total_score: BigDecimal,
    pub total_distributed: BigDecimal,
    pub closed_at: Option<DateTime<Utc>>,
    pub distributed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct RewardEpoch {
    pub id: Uuid,
    pub start_timestamp: DateTime<Utc>,
    pub end_timestamp: DateTime<Utc>,
    pub total_pool: BigDecimal,
    pub status: RewardEpochStatus,
    pub created_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
    pub distributed_at: Option<DateTime<Utc>>,
}

// ═══════════════════════════════════════════════════════════════════════════
// EPOCH LIST TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, serde::Deserialize, utoipa::IntoParams)]
pub struct EpochListQuery {
    pub status: Option<String>,
}

#[derive(Debug, serde::Serialize, utoipa::ToSchema)]
pub struct EpochListItem {
    pub id: Uuid,
    pub start_timestamp: DateTime<Utc>,
    pub end_timestamp: DateTime<Utc>,
    pub total_pool: BigDecimal,
    pub status: RewardEpochStatus,
    pub created_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
    pub distributed_at: Option<DateTime<Utc>>,
    pub settlement_batch_id: Option<String>,
}
