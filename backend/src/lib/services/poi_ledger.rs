//! BIZRA Node0 - PoI Ledger Service
//! 
//! Manages Proof-of-Impact event logging and verification.

use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// PoI Event types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PoiEventType {
    TaskCompleted,
    ResourceContributed,
    KnowledgeShared,
    LearningSession,
    BugFixed,
    DocumentationWritten,
    OnboardingCompleted,
    PlanCreated,
    DailyCheckin,
    WeeklyReflection,
}

impl std::fmt::Display for PoiEventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::TaskCompleted => "task_completed",
            Self::ResourceContributed => "resource_contributed",
            Self::KnowledgeShared => "knowledge_shared",
            Self::LearningSession => "learning_session",
            Self::BugFixed => "bug_fixed",
            Self::DocumentationWritten => "documentation_written",
            Self::OnboardingCompleted => "onboarding_completed",
            Self::PlanCreated => "plan_created",
            Self::DailyCheckin => "daily_checkin",
            Self::WeeklyReflection => "weekly_reflection",
        };
        write!(f, "{}", s)
    }
}

/// PoI Event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoiEvent {
    pub id: Uuid,
    pub event_type: String,
    pub task_id: Option<String>,
    pub user_id: String,
    pub timestamp: DateTime<Utc>,
    pub impact_score: f64,
    pub ihsan_score: f64,
    pub duration_minutes: Option<i32>,
    pub resources_used: serde_json::Value,
    pub assets_produced: Vec<String>,
    pub description: Option<String>,
    pub verified: bool,
    pub verified_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub reward_bzc: f64,
    pub reward_imp: f64,
}

/// PoI Statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoiStats {
    pub total_events: i64,
    pub verified_events: i64,
    pub total_impact: f64,
    pub avg_ihsan: f64,
    pub total_minutes: i64,
    pub total_bzc: f64,
    pub total_imp: f64,
}

/// PoI Ledger Service
pub struct PoiLedger {
    pool: PgPool,
    ihsan_threshold: f64,
}

impl PoiLedger {
    /// Create new PoI Ledger service
    pub fn new(pool: PgPool) -> Self {
        let ihsan_threshold = std::env::var("POI_IHSAN_THRESHOLD")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.85);

        Self {
            pool,
            ihsan_threshold,
        }
    }

    /// Log a new PoI event
    pub async fn log_event(
        &self,
        event_type: PoiEventType,
        impact_score: f64,
        ihsan_score: f64,
        duration_minutes: Option<i32>,
        description: Option<String>,
        assets_produced: Vec<String>,
        resources_used: serde_json::Value,
    ) -> anyhow::Result<PoiEvent> {
        // Calculate rewards
        let (bzc_reward, imp_reward) = Self::calculate_rewards(
            impact_score,
            ihsan_score,
            duration_minutes.unwrap_or(1),
        );

        let event = sqlx::query_as!(
            PoiEvent,
            r#"
            INSERT INTO poi_ledger (
                event_type, impact_score, ihsan_score,
                duration_minutes, description, assets_produced,
                resources_used, reward_bzc, reward_imp
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING 
                id, event_type, task_id, user_id,
                timestamp, 
                impact_score::float8 as "impact_score!",
                ihsan_score::float8 as "ihsan_score!",
                duration_minutes,
                resources_used,
                assets_produced,
                description,
                verified,
                verified_at,
                rejection_reason,
                reward_bzc::float8 as "reward_bzc!",
                reward_imp::float8 as "reward_imp!"
            "#,
            event_type.to_string(),
            impact_score,
            ihsan_score,
            duration_minutes,
            description,
            &assets_produced,
            resources_used,
            bzc_reward,
            imp_reward,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(event)
    }

    /// Verify a PoI event (SAT PoI Verifier logic)
    pub async fn verify_event(&self, event_id: Uuid) -> anyhow::Result<bool> {
        // Get event
        let event = sqlx::query!(
            r#"
            SELECT ihsan_score::float8 as "ihsan_score!", impact_score::float8 as "impact_score!"
            FROM poi_ledger WHERE id = $1
            "#,
            event_id
        )
        .fetch_optional(&self.pool)
        .await?;

        let Some(event) = event else {
            return Err(anyhow::anyhow!("Event not found"));
        };

        // Check Ihsan threshold
        if event.ihsan_score >= self.ihsan_threshold {
            sqlx::query!(
                r#"
                UPDATE poi_ledger 
                SET verified = true, verified_at = NOW(),
                    verification_notes = 'Auto-verified: Ihsan score meets threshold'
                WHERE id = $1
                "#,
                event_id
            )
            .execute(&self.pool)
            .await?;

            Ok(true)
        } else {
            sqlx::query!(
                r#"
                UPDATE poi_ledger 
                SET verified = false,
                    rejection_reason = $1
                WHERE id = $2
                "#,
                format!(
                    "Ihsan score below threshold: {} < {}",
                    event.ihsan_score, self.ihsan_threshold
                ),
                event_id
            )
            .execute(&self.pool)
            .await?;

            Ok(false)
        }
    }

    /// Get PoI statistics for a user
    pub async fn get_stats(&self, user_id: &str) -> anyhow::Result<PoiStats> {
        let stats = sqlx::query!(
            r#"
            SELECT 
                COUNT(*)::bigint as "total_events!",
                COUNT(*) FILTER (WHERE verified = true)::bigint as "verified_events!",
                COALESCE(SUM(impact_score), 0)::float8 as "total_impact!",
                COALESCE(AVG(ihsan_score), 0)::float8 as "avg_ihsan!",
                COALESCE(SUM(duration_minutes), 0)::bigint as "total_minutes!",
                COALESCE(SUM(reward_bzc), 0)::float8 as "total_bzc!",
                COALESCE(SUM(reward_imp), 0)::float8 as "total_imp!"
            FROM poi_ledger
            WHERE user_id = $1
            "#,
            user_id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(PoiStats {
            total_events: stats.total_events,
            verified_events: stats.verified_events,
            total_impact: stats.total_impact,
            avg_ihsan: stats.avg_ihsan,
            total_minutes: stats.total_minutes,
            total_bzc: stats.total_bzc,
            total_imp: stats.total_imp,
        })
    }

    /// Get event timeline
    pub async fn get_timeline(
        &self,
        user_id: &str,
        limit: i64,
        offset: i64,
    ) -> anyhow::Result<Vec<PoiEvent>> {
        let events = sqlx::query_as!(
            PoiEvent,
            r#"
            SELECT 
                id, event_type, task_id, user_id, timestamp,
                impact_score::float8 as "impact_score!",
                ihsan_score::float8 as "ihsan_score!",
                duration_minutes,
                resources_used,
                assets_produced,
                description,
                verified,
                verified_at,
                rejection_reason,
                reward_bzc::float8 as "reward_bzc!",
                reward_imp::float8 as "reward_imp!"
            FROM poi_ledger
            WHERE user_id = $1
            ORDER BY timestamp DESC
            LIMIT $2 OFFSET $3
            "#,
            user_id,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(events)
    }

    /// Calculate rewards based on PoI metrics
    pub fn calculate_rewards(
        impact_score: f64,
        ihsan_score: f64,
        duration_minutes: i32,
    ) -> (f64, f64) {
        let bzc_rate = std::env::var("POI_BZC_RATE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.1);

        let imp_rate = std::env::var("POI_IMP_RATE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.5);

        // BZC (utility token) = impact * duration * rate
        let bzc_reward = impact_score * duration_minutes as f64 * bzc_rate;

        // IMP (soulbound) = ihsan * impact * rate
        let imp_reward = ihsan_score * impact_score * imp_rate;

        (bzc_reward, imp_reward)
    }

    /// Run batch verification (for SAT PoI Verifier background job)
    pub async fn batch_verify(&self) -> anyhow::Result<(i64, i64)> {
        let unverified = sqlx::query!(
            r#"
            SELECT id FROM poi_ledger 
            WHERE verified IS NULL OR verified = false
            AND rejection_reason IS NULL
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let total = unverified.len() as i64;
        let mut verified_count = 0i64;

        for row in unverified {
            if self.verify_event(row.id).await.unwrap_or(false) {
                verified_count += 1;
            }
        }

        Ok((verified_count, total))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_rewards() {
        let (bzc, imp) = PoiLedger::calculate_rewards(8.0, 0.9, 30);
        assert!(bzc > 0.0);
        assert!(imp > 0.0);
        
        // BZC = 8.0 * 30 * 0.1 = 24.0
        assert_eq!(bzc, 24.0);
        
        // IMP = 0.9 * 8.0 * 0.5 = 3.6
        assert_eq!(imp, 3.6);
    }

    #[test]
    fn test_poi_event_type_display() {
        assert_eq!(PoiEventType::TaskCompleted.to_string(), "task_completed");
        assert_eq!(PoiEventType::LearningSession.to_string(), "learning_session");
    }
}
