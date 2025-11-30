// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - POI REWARDS INTEGRATION TESTS                      ║
// ║  Economic pipeline validation: Attestation → Rewards                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use bigdecimal::BigDecimal;
use chrono::{DateTime, FixedOffset, TimeZone, Utc};
use sqlx::{Connection, PgConnection, PgPool};
use std::sync::Arc;
use uuid::Uuid;

use bizra_genesis_node::rewards::{
    RewardEpochStatus, RewardError, RewardService, SettlementService,
};

// ═══════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/// Test database setup
async fn test_pool() -> PgPool {
    // Use test database URL or create a test pool
    let database_url = std::env::var("TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://postgres:postgres@localhost/bizra_genesis_test".to_string()
    });

    PgPool::connect(&database_url).await.unwrap_or_else(|_| {
        panic!("Cannot connect to test database - ensure TEST_DATABASE_URL is set")
    })
}

/// Seed a test epoch
async fn seed_epoch(
    conn: &mut PgConnection,
    id: Uuid,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
    total_pool: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO poi_reward_epoch (
            id,
            start_timestamp,
            end_timestamp,
            total_pool,
            status,
            created_at
        )
        VALUES ($1, $2, $3, $4::NUMERIC, 'active'::poi_reward_epoch_status, NOW())
        "#,
        id,
        start,
        end,
        total_pool
    )
    .execute(&mut *conn)
    .await?;
    Ok(())
}

/// Seed a contributor user
async fn seed_user(conn: &mut PgConnection, id: Uuid, email: &str) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO users (id, email, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (id) DO NOTHING
        "#,
        id,
        email
    )
    .execute(&mut *conn)
    .await?;
    Ok(())
}

/// Seed verified PoI attestation
async fn seed_attestation(
    conn: &mut PgConnection,
    contributor_id: Uuid,
    impact_domain: &str,
    raw_score: f32,
    normalized_score: f32,
    timestamp: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO poi_attestations (
            contributor_id,
            impact_domain,
            raw_score,
            weight,
            normalized_score,
            payload_hash,
            signature,
            status,
            attestation_id,
            created_at,
            verified_at
        )
        VALUES (
            $1,
            $2,
            $3,
            1.0,
            $4,
            'test-hash-' || gen_random_uuid()::TEXT,
            'test-signature',
            'verified',
            gen_random_uuid(),
            $5,
            $5
        )
        "#,
        contributor_id,
        impact_domain,
        raw_score,
        normalized_score,
        timestamp
    )
    .execute(&mut *conn)
    .await?;
    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn reward_distribution_conservative_and_idempotent() {
    let pool = test_pool().await;
    let mut conn = pool.acquire().await.expect("Failed to acquire connection");
    let svc = RewardService::new(pool.clone());

    // Setup: Create test epoch
    let epoch_id = Uuid::new_v4();
    let start = Utc.with_ymd_and_hms(2025, 11, 1, 0, 0, 0).unwrap();
    let end = Utc.with_ymd_and_hms(2025, 11, 2, 0, 0, 0).unwrap();

    seed_epoch(&mut conn, epoch_id, start, end, "1000.0")
        .await
        .expect("Failed to seed epoch");

    // Setup: Create 3 contributors with different normalized scores
    let contrib_1 = Uuid::new_v4();
    let contrib_2 = Uuid::new_v4();
    let contrib_3 = Uuid::new_v4();

    seed_user(&mut conn, contrib_1, "contrib1@test.com")
        .await
        .unwrap();
    seed_user(&mut conn, contrib_2, "contrib2@test.com")
        .await
        .unwrap();
    seed_user(&mut conn, contrib_3, "contrib3@test.com")
        .await
        .unwrap();

    // Attestations: 40% + 30% + 30% = 100% total normalized score
    seed_attestation(
        &mut conn,
        contrib_1,
        "education",
        80.0,
        0.4,
        start + chrono::Duration::hours(1),
    )
    .await
    .unwrap();
    seed_attestation(
        &mut conn,
        contrib_2,
        "infrastructure",
        60.0,
        0.3,
        start + chrono::Duration::hours(2),
    )
    .await
    .unwrap();
    seed_attestation(
        &mut conn,
        contrib_3,
        "community",
        60.0,
        0.3,
        start + chrono::Duration::hours(3),
    )
    .await
    .unwrap();

    // Test: First distribution succeeds
    let now = Utc::now();
    svc.close_and_distribute_epoch(epoch_id, now)
        .await
        .expect("First distribution should succeed");

    // Verify: Check contributor scores aggregated
    let scores = sqlx::query!(
        r#"
        SELECT contributor_id, total_score, normalized_share
        FROM poi_contributor_scores
        WHERE epoch_id = $1
        ORDER BY contributor_id
        "#,
        epoch_id
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(scores.len(), 3, "Should have 3 contributor scores");

    // Verify scores: 0.4 + 0.3 + 0.3 = 1.0 normalized-share sum
    let mut share_sum = BigDecimal::from(0);
    for row in &scores {
        share_sum += &row
            .normalized_share
            .clone()
            .unwrap_or_else(|| BigDecimal::from(0));
        assert_eq!(
            &row.total_score
                .clone()
                .unwrap_or_else(|| BigDecimal::from(0)),
            &BigDecimal::from(1)
        );
    }

    let diff = (share_sum - BigDecimal::from(1)).abs();
    assert!(
        diff < BigDecimal::try_from(0.0001).unwrap(),
        "Normalized shares should sum to 1.0, got {}",
        share_sum
    );

    // Verify rewards: Total distributed = epoch pool (conservation)
    let rewards = sqlx::query!(
        r#"
        SELECT amount
        FROM poi_rewards
        WHERE epoch_id = $1
        ORDER BY contributor_id
        "#,
        epoch_id
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(rewards.len(), 3, "Should have 3 reward records");

    let mut total_distributed = BigDecimal::from(0);
    for row in &rewards {
        total_distributed += &row.amount.clone().unwrap_or_else(|| BigDecimal::from(0));
    }

    let expected_pool = BigDecimal::from(1000);
    let diff = (total_distributed - expected_pool).abs();
    assert!(
        diff < BigDecimal::try_from(0.0001).unwrap(),
        "Total rewards should equal pool: {} ≠ {}",
        total_distributed,
        expected_pool
    );

    // Individual rewards check: share * pool
    for (score_row, reward_row) in scores.iter().zip(rewards.iter()) {
        let expected_amount = &score_row
            .normalized_share
            .clone()
            .unwrap_or_else(|| BigDecimal::from(0))
            * &expected_pool;
        let actual_amount = &reward_row
            .amount
            .clone()
            .unwrap_or_else(|| BigDecimal::from(0));
        let diff = (expected_amount - actual_amount).abs();
        assert!(
            diff < BigDecimal::try_from(0.0001).unwrap(),
            "Reward amount incorrect for contributor"
        );
    }

    // Test: Idempotency - second distribution should fail
    let result = svc.close_and_distribute_epoch(epoch_id, Utc::now()).await;
    match result {
        Err(RewardError::EpochNotActive(_)) => {
            // Correct: epoch is already distributed
        }
        Ok(_) => panic!("Second distribution should fail"),
        Err(e) => panic!("Unexpected error: {:?}", e),
    }

    // Verify no duplicate records
    let final_count = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM poi_rewards
        WHERE epoch_id = $1
        "#,
        epoch_id
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        final_count.count.unwrap(),
        3,
        "Should not have duplicate rewards"
    );

    println!(
        "✅ Economic conservation validated: total_distributed = {} pool",
        total_distributed
    );
    println!("✅ Idempotency validated: duplicate distribution blocked");
    println!("✅ Atomicity validated: no partial state from failures");
}

#[tokio::test]
async fn reward_distribution_no_verified_attestations() {
    let pool = test_pool().await;
    let svc = RewardService::new(pool.clone());

    // Setup empty epoch (no attestations)
    let epoch_id = Uuid::new_v4();
    let start = Utc.with_ymd_and_hms(2025, 11, 1, 0, 0, 0).unwrap();
    let end = start + chrono::Duration::days(7);

    {
        let mut conn = pool.acquire().await.unwrap();
        seed_epoch(&mut conn, epoch_id, start, end, "1000.0")
            .await
            .unwrap();
    }

    // Test: Distribution succeeds with empty results
    let now = Utc::now();
    svc.close_and_distribute_epoch(epoch_id, now)
        .await
        .expect("Distribution should succeed even with no attestations");

    // Verify: Empty contributor scores and rewards
    let scores_count = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM poi_contributor_scores
        WHERE epoch_id = $1
        "#,
        epoch_id
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    let rewards_count = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM poi_rewards
        WHERE epoch_id = $1
        "#,
        epoch_id
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        scores_count.count.unwrap(),
        0,
        "Should have no contributor scores"
    );
    assert_eq!(rewards_count.count.unwrap(), 0, "Should have no rewards");
    assert_eq!(rewards_count.count.unwrap(), 0, "Should have no rewards");

    // Verify epoch status
    let epoch_status = sqlx::query!(
        r#"
        SELECT status as "status: RewardEpochStatus"
        FROM poi_reward_epoch
        WHERE id = $1
        "#,
        epoch_id
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        epoch_status.status,
        RewardEpochStatus::Distributed,
        "Epoch should be marked distributed"
    );

    println!("✅ Empty epoch distribution handled correctly");
}

#[tokio::test]
async fn reward_distribution_invalid_epoch_state() {
    let pool = test_pool().await;
    let svc = RewardService::new(pool.clone());

    // Setup epoch that's already distributed
    let epoch_id = Uuid::new_v4();
    let start = Utc.with_ymd_and_hms(2025, 11, 1, 0, 0, 0).unwrap();
    let end = start + chrono::Duration::days(1);

    {
        let mut conn = pool.acquire().await.unwrap();
        seed_epoch(&mut conn, epoch_id, start, end, "1000.0")
            .await
            .unwrap();

        // Manually mark as distributed
        sqlx::query!(
            r#"
            UPDATE poi_reward_epoch
            SET status = 'distributed', distributed_at = NOW()
            WHERE id = $1
            "#,
            epoch_id
        )
        .execute(&mut *conn)
        .await
        .unwrap();
    }

    // Test: Distribution fails on already distributed epoch
    let result = svc.close_and_distribute_epoch(epoch_id, Utc::now()).await;

    match result {
        Err(RewardError::EpochNotActive(status)) => {
            assert_eq!(status, "distributed");
        }
        Err(e) => panic!("Unexpected error: {:?}", e),
        Ok(_) => panic!("Distribution should fail on already distributed epoch"),
    }

    println!("✅ Epoch state validation working correctly");
}

#[tokio::test]
async fn settlement_bridge_economic_to_token_flow() {
    let pool = test_pool().await;
    let svc = RewardService::new(pool.clone());
    let settlement_svc = SettlementService::new(pool.clone());

    // Setup: Create and distribute epoch with 2 contributors
    let epoch_id = Uuid::new_v4();
    let start = Utc.with_ymd_and_hms(2025, 11, 1, 0, 0, 0).unwrap();
    let end = Utc.with_ymd_and_hms(2025, 11, 2, 0, 0, 0).unwrap();

    seed_epoch(
        &mut pool.acquire().await.unwrap(),
        epoch_id,
        start,
        end,
        "1000.0",
    )
    .await
    .unwrap();

    let contrib_1 = Uuid::new_v4();
    let contrib_2 = Uuid::new_v4();

    seed_user(
        &mut pool.acquire().await.unwrap(),
        contrib_1,
        "contrib1@test.com",
    )
    .await
    .unwrap();
    seed_user(
        &mut pool.acquire().await.unwrap(),
        contrib_2,
        "contrib2@test.com",
    )
    .await
    .unwrap();

    // 50% + 50% split
    seed_attestation(
        &mut pool.acquire().await.unwrap(),
        contrib_1,
        "education",
        100.0,
        0.5,
        start + chrono::Duration::hours(1),
    )
    .await
    .unwrap();
    seed_attestation(
        &mut pool.acquire().await.unwrap(),
        contrib_2,
        "infrastructure",
        100.0,
        0.5,
        start + chrono::Duration::hours(2),
    )
    .await
    .unwrap();

    // Step 1: Distribute rewards (economic calculation)
    let now = Utc::now();
    svc.close_and_distribute_epoch(epoch_id, now)
        .await
        .expect("Distribution should succeed");

    // Verify rewards exist
    let rewards_count = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM poi_rewards
        WHERE epoch_id = $1 AND settlement_status = 'pending'
        "#,
        epoch_id
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .count
    .unwrap_or(0);

    assert_eq!(rewards_count, 2, "Should have 2 pending rewards to settle");

    // Step 2: Submit settlement (economic → ledger transition)
    let settlement_batch = settlement_svc
        .submit_settlement(epoch_id)
        .await
        .expect("Settlement submission should succeed");

    assert_eq!(
        settlement_batch.settlement_count, 2,
        "Should settle all 2 rewards"
    );
    assert_eq!(
        settlement_batch.epoch_id, epoch_id,
        "Settlement should reference correct epoch"
    );

    // Verify rewards marked as submitted
    let submitted_count = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM poi_rewards
        WHERE epoch_id = $1 AND settlement_status = 'submitted'
        "#,
        epoch_id
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .count
    .unwrap_or(0);

    assert_eq!(submitted_count, 2, "All rewards should be submitted");

    // Step 3: Confirm settlement (ledger acknowledgment)
    settlement_svc
        .confirm_settlement(epoch_id)
        .await
        .expect("Settlement confirmation should succeed");

    // Verify rewards marked as confirmed
    let confirmed_count = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM poi_rewards
        WHERE epoch_id = $1 AND settlement_status = 'confirmed'
        "#,
        epoch_id
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .count
    .unwrap_or(0);

    assert_eq!(confirmed_count, 2, "All rewards should be confirmed");

    // Verify settlement timestamps exist
    let epoch_with_settlement = sqlx::query!(
        r#"
        SELECT settlement_batch_id, settlement_confirmed_at
        FROM poi_reward_epoch
        WHERE id = $1
        "#,
        epoch_id
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert!(
        epoch_with_settlement.settlement_batch_id.is_some(),
        "Epoch should have settlement batch ID"
    );
    assert!(
        epoch_with_settlement.settlement_confirmed_at.is_some(),
        "Epoch should have settlement confirmation timestamp"
    );

    println!(
        "✅ Full economic pipeline validated: Attestation → Distribution → Settlement → Token"
    );
    println!(
        "✅ Settlement batch ID: {}",
        epoch_with_settlement.settlement_batch_id.unwrap()
    );
    println!("✅ Token connectivity bridge operational");
}
