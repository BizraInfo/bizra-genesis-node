//! BIZRA Genesis Node - Database E2E Smoke Tests
//!
//! End-to-end verification that database operations work predictably
//! and production-safe from application perspective.
//!
//! Phase ONE P1.1 Critical Success Factor: Zero unwraps, reliable operations.

use chrono::{DateTime, Utc};
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::env;
use uuid::Uuid;

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

async fn setup_pool() -> Pool<Postgres> {
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set for db_e2e_smoke tests");

    // Keep connections modest – this is a test, not a load bench.
    PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("failed to connect to database")
}

#[tokio::test]
async fn db_e2e_migrations_apply_cleanly() {
    let pool = setup_pool().await;

    MIGRATOR
        .run(&pool)
        .await
        .expect("db migrations should apply cleanly");
}

#[tokio::test]
async fn db_e2e_consensus_lifecycle() {
    let pool = setup_pool().await;
    MIGRATOR
        .run(&pool)
        .await
        .expect("db migrations should apply cleanly");

    // 1) Insert a consensus run (adapted to real schema)
    let consensus_id = Uuid::new_v4();
    let run_id = format!("db_e2e_consensus_{}", Uuid::new_v4().simple());
    let now = Utc::now();

    // Insert consensus run record
    sqlx::query!(
        r#"
        INSERT INTO consensus_runs (
            id, run_id, input_hash, input_size_bytes, winner_model,
            candidates_count, consensus_latency_ms, total_latency_ms, candidates
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
        consensus_id,
        run_id,
        "test_hash_12345678901234567890123456789012",
        1024,
        "gpt-4-turbo",
        3,
        150,
        450,
        serde_json::json!([
            {"model": "gpt-4", "score": 0.85},
            {"model": "claude-3", "score": 0.82},
            {"model": "gpt-4-turbo", "score": 0.90}
        ])
    )
    .execute(&pool)
    .await
    .expect("insert consensus run");

    // 2) Insert corresponding trust receipt
    let receipt_run_id = run_id.clone();
    sqlx::query!(
        r#"
        INSERT INTO trust_receipts (
            run_id, winner_model, inputs_sha256, winner_json_sha256,
            consensus_hash_hex, signature, public_key_der, timestamp_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        receipt_run_id,
        "gpt-4-turbo",
        "inputs_hash_abcdef1234567890abcdef1234567890",
        "winner_hash_fedcba0987654321fedcba0987654321",
        "consensus_hash_0123456789abcdef0123456789abcdef",
        vec![1u8, 2u8, 3u8], // dummy signature
        vec![4u8, 5u8, 6u8], // dummy public key
        now.timestamp_millis()
    )
    .execute(&pool)
    .await
    .expect("insert trust receipt");

    // 3) Insert router state for the winning model
    sqlx::query!(
        r#"
        INSERT INTO router_state (model_name, alpha, beta, model_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (model_name) DO UPDATE SET
            alpha = EXCLUDED.alpha,
            beta = EXCLUDED.beta
        "#,
        "gpt-4-turbo",
        15.0,
        3.0,
        "openai"
    )
    .execute(&pool)
    .await
    .expect("insert router state");

    // 4) Insert agent state
    sqlx::query!(
        r#"
        INSERT INTO agent_state (agent_id, agent_type, agent_name, agent_role, state)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (agent_id) DO NOTHING
        "#,
        "agent_001",
        "SAT",
        "Test Agent",
        "Synthesis Agent",
        serde_json::json!({"status": "active", "config": {"temperature": 0.7}})
    )
    .execute(&pool)
    .await
    .expect("insert agent state");

    // 5) Insert PoI record
    let poi_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO proof_of_impact (
            id, receipt_id, model_name, quality, utility, trust, fairness, diversity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        poi_id,
        run_id,
        "gpt-4-turbo",
        85.5,
        92.0,
        88.7,
        90.2,
        87.1
    )
    .execute(&pool)
    .await
    .expect("insert PoI record");

    // 6) Verify data integrity and relationships
    let (consensus_count, receipt_count, router_exists, agent_exists, poi_count) = sqlx::query!(
        r#"
        SELECT
            (SELECT COUNT(*) FROM consensus_runs WHERE id = $1) AS consensus_count,
            (SELECT COUNT(*) FROM trust_receipts WHERE run_id = $2) AS receipt_count,
            (SELECT COUNT(*) FROM router_state WHERE model_name = $3) AS router_count,
            (SELECT COUNT(*) FROM agent_state WHERE agent_id = $4) AS agent_count,
            (SELECT COUNT(*) FROM proof_of_impact WHERE receipt_id = $2) AS poi_count
        "#,
        consensus_id,
        run_id,
        "gpt-4-turbo",
        "agent_001"
    )
    .fetch_one(&pool)
    .await
    .expect("verify aggregate relationships");

    assert_eq!(
        consensus_count.unwrap_or(0),
        1,
        "One consensus run expected"
    );
    assert_eq!(receipt_count.unwrap_or(0), 1, "One trust receipt expected");
    assert_eq!(router_exists.unwrap_or(0), 1, "Router state should exist");
    assert_eq!(agent_exists.unwrap_or(0), 1, "Agent state should exist");
    assert_eq!(poi_count.unwrap_or(0), 1, "One PoI record expected");

    tracing::info!("✅ Consensus lifecycle and data relationships verified");
}

#[tokio::test]
async fn db_e2e_transaction_rollback_on_error() {
    let pool = setup_pool().await;
    MIGRATOR
        .run(&pool)
        .await
        .expect("db migrations should apply cleanly");

    let mut tx = pool.begin().await.expect("begin transaction");

    let test_run_id = format!("rollback_test_{}", Uuid::new_v4().simple());
    let now = Utc::now();

    // Valid insert operations within transaction
    let consensus_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO consensus_runs (
            id, run_id, input_hash, input_size_bytes, winner_model,
            candidates_count, consensus_latency_ms, total_latency_ms, candidates
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
        consensus_id,
        test_run_id,
        "rollback_hash_1234567890123456789012345678",
        512,
        "test-model",
        2,
        100,
        200,
        serde_json::json!([])
    )
    .execute(&mut *tx)
    .await
    .expect("insert consensus run");

    // Insert trust receipt
    sqlx::query!(
        r#"
        INSERT INTO trust_receipts (
            run_id, winner_model, inputs_sha256, winner_json_sha256,
            consensus_hash_hex, signature, public_key_der, timestamp_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        test_run_id,
        "test-model",
        "inputs_hash_rollbacktest12345678901234567890",
        "winner_hash_rollbackfedcba09876543210987654",
        "consensus_hash_rollback0123456789abcdef01234",
        vec![7u8, 8u8, 9u8],    // dummy signature
        vec![10u8, 11u8, 12u8], // dummy public key
        now.timestamp_millis()
    )
    .execute(&mut *tx)
    .await
    .expect("insert trust receipt");

    // Forced error - violate check constraint (quality > 100)
    let poi_result = sqlx::query(
        r#"
        INSERT INTO proof_of_impact (
            id, receipt_id, model_name, quality, utility, trust, fairness, diversity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(test_run_id)
    .bind("invalid-model")
    .bind(150.0) // Invalid: exceeds 100
    .bind(50.0)
    .bind(60.0)
    .bind(70.0)
    .bind(80.0)
    .execute(&mut *tx)
    .await;

    assert!(poi_result.is_err(), "expected constraint violation");

    // Rollback
    tx.rollback().await.expect("rollback should succeed");

    // Verify nothing was committed
    let (consensus_exists, receipt_exists) = sqlx::query!(
        r#"
        SELECT
            (SELECT COUNT(*) FROM consensus_runs WHERE id = $1) AS consensus_count,
            (SELECT COUNT(*) FROM trust_receipts WHERE run_id = $2) AS receipt_count
        "#,
        consensus_id,
        test_run_id
    )
    .fetch_one(&pool)
    .await
    .expect("check after rollback");

    assert_eq!(
        consensus_exists.unwrap_or(1),
        0,
        "No consensus should survive rollback"
    );
    assert_eq!(
        receipt_exists.unwrap_or(1),
        0,
        "No receipt should survive rollback"
    );

    tracing::info!("✅ Transaction rollback and constraint enforcement verified");
}

#[tokio::test]
async fn db_e2e_aggregate_queries() {
    let pool = setup_pool().await;
    MIGRATOR
        .run(&pool)
        .await
        .expect("db migrations should apply cleanly");

    // Insert test data for aggregation testing
    let base_timestamp = Utc::now();

    // Insert multiple records for analytics queries
    for i in 0..3 {
        let run_id = format!("agg_test_{}_{}", i, Uuid::new_v4().simple());
        let timestamp_offset = base_timestamp - chrono::Duration::hours(i as i64);

        // Consensus run
        let consensus_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO consensus_runs (
                id, run_id, input_hash, winner_model,
                candidates_count, consensus_latency_ms, total_latency_ms, candidates, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            "#,
            consensus_id,
            run_id,
            format!("hash_{}_{}", i, "x".repeat(30)),
            match i % 3 {
                0 => "gpt-4-turbo",
                1 => "claude-3-opus",
                _ => "gpt-4",
            },
            3,
            100 + i * 10,
            200 + i * 20,
            serde_json::json!([]),
            timestamp_offset
        )
        .execute(&pool)
        .await
        .unwrap();

        // Trust receipt
        sqlx::query!(
            r#"
            INSERT INTO trust_receipts (
                run_id, winner_model, inputs_sha256, winner_json_sha256,
                consensus_hash_hex, signature, public_key_der, timestamp_ms, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            "#,
            run_id,
            match i % 3 {
                0 => "gpt-4-turbo",
                1 => "claude-3-opus",
                _ => "gpt-4",
            },
            format!("input_hash_{}_{}", i, "a".repeat(28)),
            format!("winner_hash_{}_{}", i, "b".repeat(28)),
            format!("cons_hash_{}_{}", i, "c".repeat(28)),
            vec![i as u8],
            vec![i as u8 + 100],
            timestamp_offset.timestamp_millis(),
            timestamp_offset
        )
        .execute(&pool)
        .await
        .unwrap();

        // PoI record
        let poi_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO proof_of_impact (
                id, receipt_id, model_name, quality, utility, trust, fairness, diversity
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
            poi_id,
            run_id,
            match i % 3 {
                0 => "gpt-4-turbo",
                1 => "claude-3-opus",
                _ => "gpt-4",
            },
            75.0 + i as f32 * 5.0, // Different scores
            80.0 + i as f32 * 3.0,
            85.0 + i as f32 * 2.0,
            78.0 + i as f32 * 4.0,
            82.0 + i as f32 * 2.5
        )
        .execute(&pool)
        .await
        .unwrap();
    }

    // Test aggregation queries (representative of dashboard/reporting needs)

    // 1. Model performance aggregation
    let model_stats = sqlx::query!(
        r#"
        SELECT
            model_name,
            COUNT(*) as runs,
            AVG(quality) as avg_quality,
            MIN(quality) as min_quality,
            MAX(quality) as max_quality
        FROM proof_of_impact
        WHERE model_name IN ('gpt-4-turbo', 'claude-3-opus', 'gpt-4')
        GROUP BY model_name
        ORDER BY avg_quality DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .expect("aggregate model performance");

    assert!(
        !model_stats.is_empty(),
        "Should have model performance stats"
    );
    assert!(
        model_stats.len() >= 2,
        "Should have stats for multiple models"
    );

    // 2. Consensus performance over time
    let consensus_stats = sqlx::query!(
        r#"
        SELECT
            DATE(created_at) as date,
            COUNT(*) as total_runs,
            AVG(total_latency_ms) as avg_latency,
            MIN(consensus_latency_ms) as fastest_consensus,
            MAX(consensus_latency_ms) as slowest_consensus
        FROM consensus_runs
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .expect("aggregate consensus performance");

    assert!(!consensus_stats.is_empty(), "Should have consensus stats");
    assert!(
        consensus_stats[0].total_runs.unwrap_or(0) >= 3,
        "Should have today's runs"
    );

    // 3. Top performing models by average PoI score
    let top_models = sqlx::query!(
        r#"
        SELECT
            model_name,
            COUNT(*) as total_runs,
            AVG(normalized_score) as avg_normalized_poi
        FROM proof_of_impact
        GROUP BY model_name
        HAVING COUNT(*) >= 1
        ORDER BY avg_normalized_poi DESC
        LIMIT 3
        "#
    )
    .fetch_all(&pool)
    .await
    .expect("rank models by performance");

    assert!(!top_models.is_empty(), "Should have model rankings");
    assert!(
        top_models[0].avg_normalized_poi.unwrap() > 0.0,
        "Should have positive scores"
    );

    tracing::info!("✅ Database aggregation queries and analytics verified");
}
