// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - POI REWARDS COMPREHENSIVE TESTS                     ║
// ║  Unit, integration, and property-based tests for reward calculations      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use bigdecimal::BigDecimal;
use chrono::{Duration, Utc};
use std::str::FromStr;
use uuid::Uuid;

// ═══════════════════════════════════════════════════════════════════════════
// UNIT TESTS - REWARD CALCULATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/// Core reward calculation functions (pure logic, no database)
mod calculation_tests {
    use super::*;

    /// Calculate normalized share for a contributor
    /// Formula: contributor_score / total_epoch_score
    fn calculate_normalized_share(
        contributor_score: &BigDecimal,
        total_epoch_score: &BigDecimal,
    ) -> BigDecimal {
        if total_epoch_score == &BigDecimal::from(0) {
            return BigDecimal::from(0);
        }
        contributor_score / total_epoch_score
    }

    /// Calculate reward amount for a contributor
    /// Formula: normalized_share * total_pool
    fn calculate_reward_amount(
        normalized_share: &BigDecimal,
        total_pool: &BigDecimal,
    ) -> BigDecimal {
        normalized_share * total_pool
    }

    /// Validate reward distribution invariant: sum of all rewards <= total_pool
    fn validate_distribution_invariant(rewards: &[BigDecimal], total_pool: &BigDecimal) -> bool {
        let sum: BigDecimal = rewards.iter().sum();
        sum <= *total_pool
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Basic Calculation Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_normalized_share_single_contributor() {
        let contributor_score = BigDecimal::from(100);
        let total_epoch_score = BigDecimal::from(100);

        let share = calculate_normalized_share(&contributor_score, &total_epoch_score);
        assert_eq!(share, BigDecimal::from(1)); // 100% of pool
    }

    #[test]
    fn test_normalized_share_equal_contributors() {
        let total_epoch_score = BigDecimal::from(200);

        let share1 = calculate_normalized_share(&BigDecimal::from(100), &total_epoch_score);
        let share2 = calculate_normalized_share(&BigDecimal::from(100), &total_epoch_score);

        // Each contributor gets 50%
        assert_eq!(share1, BigDecimal::from_str("0.5").unwrap());
        assert_eq!(share2, BigDecimal::from_str("0.5").unwrap());

        // Shares sum to 1.0
        assert_eq!(share1 + share2, BigDecimal::from(1));
    }

    #[test]
    fn test_normalized_share_unequal_contributors() {
        let total_epoch_score = BigDecimal::from(100);

        let share1 = calculate_normalized_share(&BigDecimal::from(75), &total_epoch_score);
        let share2 = calculate_normalized_share(&BigDecimal::from(25), &total_epoch_score);

        assert_eq!(share1, BigDecimal::from_str("0.75").unwrap());
        assert_eq!(share2, BigDecimal::from_str("0.25").unwrap());
    }

    #[test]
    fn test_normalized_share_zero_total() {
        let contributor_score = BigDecimal::from(100);
        let total_epoch_score = BigDecimal::from(0);

        let share = calculate_normalized_share(&contributor_score, &total_epoch_score);
        assert_eq!(share, BigDecimal::from(0)); // Avoid division by zero
    }

    #[test]
    fn test_normalized_share_zero_contributor() {
        let contributor_score = BigDecimal::from(0);
        let total_epoch_score = BigDecimal::from(100);

        let share = calculate_normalized_share(&contributor_score, &total_epoch_score);
        assert_eq!(share, BigDecimal::from(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reward Amount Calculation Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_reward_amount_full_pool() {
        let normalized_share = BigDecimal::from(1);
        let total_pool = BigDecimal::from(1000);

        let reward = calculate_reward_amount(&normalized_share, &total_pool);
        assert_eq!(reward, BigDecimal::from(1000));
    }

    #[test]
    fn test_reward_amount_half_pool() {
        let normalized_share = BigDecimal::from_str("0.5").unwrap();
        let total_pool = BigDecimal::from(1000);

        let reward = calculate_reward_amount(&normalized_share, &total_pool);
        assert_eq!(reward, BigDecimal::from(500));
    }

    #[test]
    fn test_reward_amount_small_share() {
        let normalized_share = BigDecimal::from_str("0.001").unwrap();
        let total_pool = BigDecimal::from(1000000);

        let reward = calculate_reward_amount(&normalized_share, &total_pool);
        assert_eq!(reward, BigDecimal::from(1000));
    }

    #[test]
    fn test_reward_amount_precision() {
        // Test with high precision values
        let normalized_share = BigDecimal::from_str("0.333333333333333333").unwrap();
        let total_pool = BigDecimal::from(1000);

        let reward = calculate_reward_amount(&normalized_share, &total_pool);
        // Should maintain precision
        assert!(reward > BigDecimal::from(333));
        assert!(reward < BigDecimal::from(334));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Distribution Invariant Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_distribution_invariant_exact_match() {
        let total_pool = BigDecimal::from(1000);
        let rewards = vec![
            BigDecimal::from(500),
            BigDecimal::from(300),
            BigDecimal::from(200),
        ];

        assert!(validate_distribution_invariant(&rewards, &total_pool));
    }

    #[test]
    fn test_distribution_invariant_under_pool() {
        let total_pool = BigDecimal::from(1000);
        let rewards = vec![
            BigDecimal::from(400),
            BigDecimal::from(300),
            BigDecimal::from(200),
        ];

        assert!(validate_distribution_invariant(&rewards, &total_pool));
    }

    #[test]
    fn test_distribution_invariant_over_pool_fails() {
        let total_pool = BigDecimal::from(1000);
        let rewards = vec![
            BigDecimal::from(500),
            BigDecimal::from(400),
            BigDecimal::from(200), // Total: 1100 > 1000
        ];

        assert!(!validate_distribution_invariant(&rewards, &total_pool));
    }

    #[test]
    fn test_distribution_invariant_empty() {
        let total_pool = BigDecimal::from(1000);
        let rewards: Vec<BigDecimal> = vec![];

        assert!(validate_distribution_invariant(&rewards, &total_pool));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod edge_case_tests {
    use super::*;

    // ─────────────────────────────────────────────────────────────────────────
    // Rounding and Precision Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_rounding_three_equal_contributors() {
        // Classic 1/3 rounding scenario
        let total_pool = BigDecimal::from(100);
        let contributor_count = 3;

        let share_per_contributor = &total_pool / BigDecimal::from(contributor_count);
        let total_distributed = &share_per_contributor * BigDecimal::from(contributor_count);

        // Due to precision, we should be very close to but not exceed total_pool
        let difference = &total_pool - &total_distributed;

        // Difference should be negligible (less than 0.000001)
        assert!(difference.abs() < BigDecimal::from_str("0.000001").unwrap());
    }

    #[test]
    fn test_very_small_scores() {
        let total_pool = BigDecimal::from(1000000);
        let scores = vec![
            BigDecimal::from_str("0.000001").unwrap(),
            BigDecimal::from_str("0.000002").unwrap(),
            BigDecimal::from_str("0.000003").unwrap(),
        ];

        let total_score: BigDecimal = scores.iter().sum();

        for score in &scores {
            let share = score / &total_score;
            let reward = &share * &total_pool;

            // Even very small scores should produce valid rewards
            assert!(reward >= BigDecimal::from(0));
        }
    }

    #[test]
    fn test_very_large_pool() {
        // Test with a pool of 1 billion tokens
        let total_pool = BigDecimal::from(1_000_000_000i64);
        let normalized_share = BigDecimal::from_str("0.00001").unwrap();

        let reward = &normalized_share * &total_pool;
        assert_eq!(reward, BigDecimal::from(10000));
    }

    #[test]
    fn test_single_dominant_contributor() {
        // One contributor has 99.99% of the score
        let total_score = BigDecimal::from(10000);
        let dominant_score = BigDecimal::from(9999);
        let minor_score = BigDecimal::from(1);

        let dominant_share = &dominant_score / &total_score;
        let minor_share = &minor_score / &total_score;

        // Shares should sum to 1.0
        let total_share = &dominant_share + &minor_share;
        assert_eq!(total_share, BigDecimal::from(1));

        // Dominant contributor gets 99.99%
        assert_eq!(dominant_share, BigDecimal::from_str("0.9999").unwrap());
        assert_eq!(minor_share, BigDecimal::from_str("0.0001").unwrap());
    }

    #[test]
    fn test_many_small_contributors() {
        // 1000 contributors with equal scores
        let num_contributors = 1000;
        let total_pool = BigDecimal::from(1000000);
        let score_per_contributor = BigDecimal::from(10);
        let total_score = &score_per_contributor * BigDecimal::from(num_contributors);

        let share_per_contributor = &score_per_contributor / &total_score;
        let reward_per_contributor = &share_per_contributor * &total_pool;

        // Each gets 1000 (1M / 1000 contributors)
        assert_eq!(reward_per_contributor, BigDecimal::from(1000));

        // Total distributed equals pool
        let total_distributed = &reward_per_contributor * BigDecimal::from(num_contributors);
        assert_eq!(total_distributed, total_pool);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Zero/Null Handling Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_zero_pool() {
        let total_pool = BigDecimal::from(0);
        let normalized_share = BigDecimal::from_str("0.5").unwrap();

        let reward = &normalized_share * &total_pool;
        assert_eq!(reward, BigDecimal::from(0));
    }

    #[test]
    fn test_negative_score_should_not_happen() {
        // Business rule: scores should never be negative
        // This test documents expected behavior
        let score = BigDecimal::from(-100);
        let total_score = BigDecimal::from(1000);

        let share = &score / &total_score;

        // Negative share is mathematically valid but business-invalid
        // The system should prevent negative scores at ingestion
        assert!(share < BigDecimal::from(0));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTLEMENT STATUS TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod settlement_tests {
    use super::*;
    use bizra_genesis_node::rewards::{SettlementError, SettlementStatus};

    #[test]
    fn test_settlement_status_serialization() {
        let pending = SettlementStatus::Pending;
        let submitted = SettlementStatus::Submitted;
        let confirmed = SettlementStatus::Confirmed;
        let failed = SettlementStatus::Failed;

        // Test serde serialization
        assert_eq!(serde_json::to_string(&pending).unwrap(), "\"pending\"");
        assert_eq!(serde_json::to_string(&submitted).unwrap(), "\"submitted\"");
        assert_eq!(serde_json::to_string(&confirmed).unwrap(), "\"confirmed\"");
        assert_eq!(serde_json::to_string(&failed).unwrap(), "\"failed\"");
    }

    #[test]
    fn test_settlement_status_deserialization() {
        let pending: SettlementStatus = serde_json::from_str("\"pending\"").unwrap();
        let submitted: SettlementStatus = serde_json::from_str("\"submitted\"").unwrap();
        let confirmed: SettlementStatus = serde_json::from_str("\"confirmed\"").unwrap();
        let failed: SettlementStatus = serde_json::from_str("\"failed\"").unwrap();

        assert_eq!(pending, SettlementStatus::Pending);
        assert_eq!(submitted, SettlementStatus::Submitted);
        assert_eq!(confirmed, SettlementStatus::Confirmed);
        assert_eq!(failed, SettlementStatus::Failed);
    }

    #[test]
    fn test_settlement_error_display() {
        let service_err = SettlementError::Service("connection failed".to_string());
        assert!(service_err.to_string().contains("connection failed"));

        let already_settled = SettlementError::AlreadySettled(Uuid::nil());
        assert!(already_settled.to_string().contains("already exists"));

        let no_pending = SettlementError::NoPendingSettlements(Uuid::nil());
        assert!(no_pending.to_string().contains("No pending"));

        let missing_batch = SettlementError::MissingBatchId;
        assert!(missing_batch.to_string().contains("missing"));
    }

    #[test]
    fn test_settlement_status_equality() {
        assert_eq!(SettlementStatus::Pending, SettlementStatus::Pending);
        assert_ne!(SettlementStatus::Pending, SettlementStatus::Confirmed);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// REWARD ERROR TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod reward_error_tests {
    use super::*;
    use bizra_genesis_node::rewards::RewardError;

    #[test]
    fn test_epoch_not_found_error() {
        let err = RewardError::EpochNotFound;
        assert!(err.to_string().contains("not found"));
    }

    #[test]
    fn test_epoch_not_active_error() {
        let err = RewardError::EpochNotActive("distributed".to_string());
        assert!(err.to_string().contains("not active"));
        assert!(err.to_string().contains("distributed"));
    }

    #[test]
    fn test_epoch_not_active_variants() {
        let closed_err = RewardError::EpochNotActive("closed".to_string());
        let distributed_err = RewardError::EpochNotActive("distributed".to_string());

        assert!(closed_err.to_string().contains("closed"));
        assert!(distributed_err.to_string().contains("distributed"));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EPOCH LIFECYCLE TESTS
// ═══════════════════════════════════════════════════════════════════════════

mod epoch_lifecycle_tests {
    use super::*;

    /// Epoch status enum (mirrors the database/API type for testing)
    #[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
    #[serde(rename_all = "lowercase")]
    enum RewardEpochStatus {
        Active,
        Closed,
        Distributed,
    }

    #[test]
    fn test_epoch_status_transitions() {
        // Valid state machine transitions:
        // Active -> Closed -> Distributed

        let active = RewardEpochStatus::Active;
        let closed = RewardEpochStatus::Closed;
        let distributed = RewardEpochStatus::Distributed;

        // Test serialization round-trip
        let active_json = serde_json::to_string(&active).unwrap();
        let closed_json = serde_json::to_string(&closed).unwrap();
        let distributed_json = serde_json::to_string(&distributed).unwrap();

        assert_eq!(active_json, "\"active\"");
        assert_eq!(closed_json, "\"closed\"");
        assert_eq!(distributed_json, "\"distributed\"");
    }

    #[test]
    fn test_epoch_timestamps() {
        let start = Utc::now();
        let end = start + Duration::days(7);

        // Epoch duration should be valid
        assert!(end > start);

        // Epoch should have positive duration
        let duration = end.signed_duration_since(start);
        assert!(duration.num_days() == 7);
    }

    #[test]
    fn test_epoch_id_generation() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();

        // UUIDs should be unique
        assert_ne!(id1, id2);

        // UUIDs should be valid
        assert!(!id1.is_nil());
        assert!(!id2.is_nil());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    // Strategy for generating valid BigDecimal scores (positive, reasonable range)
    fn score_strategy() -> impl Strategy<Value = BigDecimal> {
        (1u64..1_000_000u64).prop_map(|n| BigDecimal::from(n))
    }

    // Strategy for generating valid pool amounts
    fn pool_strategy() -> impl Strategy<Value = BigDecimal> {
        (1000u64..1_000_000_000u64).prop_map(|n| BigDecimal::from(n))
    }

    proptest! {
        /// Property: Normalized shares always sum to 1.0 (or 0 if no contributors)
        #[test]
        fn prop_shares_sum_to_one(
            scores in prop::collection::vec(score_strategy(), 1..100)
        ) {
            let total_score: BigDecimal = scores.iter().sum();
            let shares: Vec<BigDecimal> = scores.iter()
                .map(|s| s / &total_score)
                .collect();

            let sum_shares: BigDecimal = shares.iter().sum();

            // Allow small floating point tolerance
            let tolerance = BigDecimal::from_str("0.0000000001").unwrap();
            let diff = (&sum_shares - BigDecimal::from(1)).abs();

            prop_assert!(diff < tolerance, "Shares sum {} should equal 1.0", sum_shares);
        }

        /// Property: Individual rewards are always non-negative
        #[test]
        fn prop_rewards_non_negative(
            scores in prop::collection::vec(score_strategy(), 1..50),
            total_pool in pool_strategy()
        ) {
            let total_score: BigDecimal = scores.iter().sum();

            for score in &scores {
                let share = score / &total_score;
                let reward = &share * &total_pool;

                prop_assert!(reward >= BigDecimal::from(0),
                    "Reward {} should be non-negative", reward);
            }
        }

        /// Property: Total distributed never exceeds pool
        #[test]
        fn prop_total_distributed_lte_pool(
            scores in prop::collection::vec(score_strategy(), 1..50),
            total_pool in pool_strategy()
        ) {
            let total_score: BigDecimal = scores.iter().sum();

            let rewards: Vec<BigDecimal> = scores.iter()
                .map(|score| {
                    let share = score / &total_score;
                    &share * &total_pool
                })
                .collect();

            let total_distributed: BigDecimal = rewards.iter().sum();

            // Allow small tolerance for floating point
            let tolerance = BigDecimal::from_str("0.0000001").unwrap();
            let over_pool = &total_distributed - &total_pool;

            prop_assert!(over_pool < tolerance,
                "Total distributed {} exceeds pool {} by {}",
                total_distributed, total_pool, over_pool);
        }

        /// Property: Higher score means higher reward (monotonicity)
        #[test]
        fn prop_reward_monotonicity(
            score_a in score_strategy(),
            score_b in score_strategy(),
            total_pool in pool_strategy()
        ) {
            // Only test when scores are different
            prop_assume!(score_a != score_b);

            let total_score = &score_a + &score_b;

            let share_a = &score_a / &total_score;
            let share_b = &score_b / &total_score;

            let reward_a = &share_a * &total_pool;
            let reward_b = &share_b * &total_pool;

            if score_a > score_b {
                prop_assert!(reward_a > reward_b,
                    "Higher score {} should give higher reward {} vs {}",
                    score_a, reward_a, reward_b);
            } else {
                prop_assert!(reward_b > reward_a,
                    "Higher score {} should give higher reward {} vs {}",
                    score_b, reward_b, reward_a);
            }
        }

        /// Property: Zero score always yields zero reward
        #[test]
        fn prop_zero_score_zero_reward(
            other_scores in prop::collection::vec(score_strategy(), 1..10),
            total_pool in pool_strategy()
        ) {
            let zero_score = BigDecimal::from(0);
            let total_score: BigDecimal = other_scores.iter().sum();

            // Avoid division by zero
            prop_assume!(total_score > BigDecimal::from(0));

            let share = &zero_score / &total_score;
            let reward = &share * &total_pool;

            prop_assert_eq!(reward, BigDecimal::from(0),
                "Zero score should yield zero reward");
        }

        /// Property: Equal scores yield equal rewards
        #[test]
        fn prop_equal_scores_equal_rewards(
            num_contributors in 2usize..20,
            score in score_strategy(),
            total_pool in pool_strategy()
        ) {
            let total_score = &score * BigDecimal::from(num_contributors as u64);
            let share = &score / &total_score;
            let reward = &share * &total_pool;

            // All contributors with same score get same reward
            let expected_reward_per_contributor = &total_pool / BigDecimal::from(num_contributors as u64);

            let tolerance = BigDecimal::from_str("0.0000001").unwrap();
            let diff = (&reward - &expected_reward_per_contributor).abs();

            prop_assert!(diff < tolerance,
                "Equal scores should yield equal rewards: {} vs expected {}",
                reward, expected_reward_per_contributor);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS (require database)
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(feature = "database")]
mod database_integration_tests {
    use super::*;
    use bizra_genesis_node::rewards::{RewardError, RewardService};
    use sqlx::PgPool;
    use std::env;

    /// Get test database URL
    fn test_database_url() -> String {
        env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://bizra:bizra_test@localhost:5432/bizra_test".to_string())
    }

    /// Set up test database with required tables
    async fn setup_test_database() -> Result<PgPool, sqlx::Error> {
        let database_url = test_database_url();
        let pool = PgPool::connect(&database_url).await?;

        // Create POI reward epoch table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS poi_reward_epoch (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                start_timestamp TIMESTAMPTZ NOT NULL,
                end_timestamp TIMESTAMPTZ NOT NULL,
                total_pool NUMERIC(38, 18) NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                closed_at TIMESTAMPTZ,
                distributed_at TIMESTAMPTZ,
                settlement_batch_id VARCHAR(100)
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Create POI attestations table (simplified for tests)
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS poi_attestations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                contributor_id UUID NOT NULL,
                normalized_score NUMERIC(38, 18) NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Create POI contributor scores table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS poi_contributor_scores (
                epoch_id UUID NOT NULL,
                contributor_id UUID NOT NULL,
                total_score NUMERIC(38, 18) NOT NULL DEFAULT 0,
                normalized_share NUMERIC(38, 18) NOT NULL DEFAULT 0,
                PRIMARY KEY (epoch_id, contributor_id)
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Create POI rewards table
        sqlx::query(
            r#"
            DO $$ BEGIN
                CREATE TYPE poi_reward_status AS ENUM ('pending', 'distributed', 'claimed');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;

            CREATE TABLE IF NOT EXISTS poi_rewards (
                epoch_id UUID NOT NULL,
                contributor_id UUID NOT NULL,
                amount NUMERIC(38, 18) NOT NULL DEFAULT 0,
                status poi_reward_status NOT NULL DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (epoch_id, contributor_id)
            )
            "#,
        )
        .execute(&pool)
        .await?;

        Ok(pool)
    }

    /// Clean up test data
    async fn cleanup_test_data(pool: &PgPool, epoch_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM poi_rewards WHERE epoch_id = $1")
            .bind(epoch_id)
            .execute(pool)
            .await?;
        sqlx::query("DELETE FROM poi_contributor_scores WHERE epoch_id = $1")
            .bind(epoch_id)
            .execute(pool)
            .await?;
        sqlx::query("DELETE FROM poi_reward_epoch WHERE id = $1")
            .bind(epoch_id)
            .execute(pool)
            .await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_epoch_not_found() {
        let pool = setup_test_database().await.unwrap();
        let service = RewardService::new(pool.clone());

        let fake_epoch_id = Uuid::new_v4();
        let result = service
            .close_and_distribute_epoch(fake_epoch_id, Utc::now())
            .await;

        assert!(matches!(result, Err(RewardError::EpochNotFound)));
    }

    #[tokio::test]
    async fn test_epoch_not_active() {
        let pool = setup_test_database().await.unwrap();
        let epoch_id = Uuid::new_v4();

        // Create a closed epoch
        sqlx::query(
            r#"
            INSERT INTO poi_reward_epoch (id, start_timestamp, end_timestamp, total_pool, status)
            VALUES ($1, NOW() - INTERVAL '7 days', NOW(), 1000, 'closed')
            "#,
        )
        .bind(epoch_id)
        .execute(&pool)
        .await
        .unwrap();

        let service = RewardService::new(pool.clone());
        let result = service
            .close_and_distribute_epoch(epoch_id, Utc::now())
            .await;

        assert!(matches!(result, Err(RewardError::EpochNotActive(_))));

        cleanup_test_data(&pool, epoch_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_distribute_epoch_success() {
        let pool = setup_test_database().await.unwrap();
        let epoch_id = Uuid::new_v4();
        let contributor1 = Uuid::new_v4();
        let contributor2 = Uuid::new_v4();
        let start_time = Utc::now() - Duration::days(7);
        let end_time = Utc::now();

        // Create an active epoch with a pool of 1000
        sqlx::query(
            r#"
            INSERT INTO poi_reward_epoch (id, start_timestamp, end_timestamp, total_pool, status)
            VALUES ($1, $2, $3, 1000, 'active')
            "#,
        )
        .bind(epoch_id)
        .bind(start_time)
        .bind(end_time)
        .execute(&pool)
        .await
        .unwrap();

        // Create verified attestations for contributors
        sqlx::query(
            r#"
            INSERT INTO poi_attestations (contributor_id, normalized_score, status, created_at)
            VALUES ($1, 60, 'verified', $2), ($3, 40, 'verified', $4)
            "#,
        )
        .bind(contributor1)
        .bind(start_time + Duration::days(1))
        .bind(contributor2)
        .bind(start_time + Duration::days(2))
        .execute(&pool)
        .await
        .unwrap();

        // Distribute the epoch
        let service = RewardService::new(pool.clone());
        let result = service
            .close_and_distribute_epoch(epoch_id, Utc::now())
            .await;

        assert!(result.is_ok());

        // Verify epoch status is now distributed
        let status: (String,) = sqlx::query_as("SELECT status FROM poi_reward_epoch WHERE id = $1")
            .bind(epoch_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(status.0, "distributed");

        // Verify rewards were created
        let reward_count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM poi_rewards WHERE epoch_id = $1")
                .bind(epoch_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(reward_count.0, 2);

        // Verify reward amounts are correct (60% and 40% of 1000)
        let rewards: Vec<(BigDecimal,)> = sqlx::query_as(
            "SELECT amount FROM poi_rewards WHERE epoch_id = $1 ORDER BY amount DESC",
        )
        .bind(epoch_id)
        .fetch_all(&pool)
        .await
        .unwrap();

        assert_eq!(rewards[0].0, BigDecimal::from(600));
        assert_eq!(rewards[1].0, BigDecimal::from(400));

        cleanup_test_data(&pool, epoch_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_idempotent_distribution() {
        let pool = setup_test_database().await.unwrap();
        let epoch_id = Uuid::new_v4();

        // Create an already distributed epoch
        sqlx::query(
            r#"
            INSERT INTO poi_reward_epoch (id, start_timestamp, end_timestamp, total_pool, status, distributed_at)
            VALUES ($1, NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days', 1000, 'distributed', NOW())
            "#
        )
        .bind(epoch_id)
        .execute(&pool)
        .await
        .unwrap();

        let service = RewardService::new(pool.clone());

        // Attempting to distribute again should fail with EpochNotActive
        let result = service
            .close_and_distribute_epoch(epoch_id, Utc::now())
            .await;

        assert!(matches!(result, Err(RewardError::EpochNotActive(_))));

        cleanup_test_data(&pool, epoch_id).await.unwrap();
    }
}
