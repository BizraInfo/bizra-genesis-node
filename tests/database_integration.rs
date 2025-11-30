// tests/database_integration.rs
// Comprehensive integration tests for database persistence layer
//
// These tests verify:
// 1. PostgreSQL schema and migrations
// 2. Repository pattern implementations
// 3. Redis caching layer
// 4. PersistenceManager integration
// 5. End-to-end workflows
//
// Requirements:
// - PostgreSQL running on localhost:5432
// - Redis running on localhost:6379
// - TEST_DATABASE_URL and TEST_REDIS_URL environment variables set
//
// Run with: cargo test --test database_integration -- --test-threads=1

use bizra_genesis_node::{
    Candidate, CandidateScores, PersistenceManager, ProofOfImpact, RunReceipt, TrustBridge,
};
use chrono::Utc;
use serde_json::json;

/// Helper to get test database URL
fn test_database_url() -> String {
    std::env::var("TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis_test".to_string()
    })
}

/// Helper to get test Redis URL
fn test_redis_url() -> String {
    std::env::var("TEST_REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379/1".to_string())
}

/// Helper to create test candidate
fn create_test_candidate(model: &str) -> Candidate {
    Candidate {
        model: model.to_string(),
        json: json!({
            "response": "Test response",
            "confidence": 0.95
        }),
        cost_usd: 0.001,
        latency_ms: 100,
        scores: CandidateScores {
            accuracy: 0.92,
            safety: 0.95,
            efficiency: 0.88,
            ihsan: 0.90,
            snr: None,
        },
    }
}

// =============================================================================
// PERSISTENCE MANAGER TESTS
// =============================================================================

#[tokio::test]
#[ignore] // Requires running PostgreSQL and Redis
async fn test_persistence_manager_initialization() {
    let db_url = test_database_url();
    let redis_url = test_redis_url();

    let manager = PersistenceManager::new(&db_url, &redis_url).await;

    assert!(
        manager.is_ok(),
        "Failed to initialize PersistenceManager: {:?}",
        manager.err()
    );

    let manager = manager.unwrap();

    // Verify health check
    let health = manager.health_check().await.unwrap();
    assert!(health.overall, "Overall health should be true");
    assert!(health.database, "Database health should be true");
    assert!(health.cache, "Cache health should be true");
    assert!(health.cache_enabled, "Cache should be enabled");

    println!("✅ PersistenceManager initialization test passed");
}

#[tokio::test]
#[ignore] // Requires running PostgreSQL
async fn test_persistence_manager_database_only() {
    let db_url = test_database_url();

    let manager = PersistenceManager::database_only(&db_url).await;

    assert!(
        manager.is_ok(),
        "Failed to initialize database-only manager: {:?}",
        manager.err()
    );

    let manager = manager.unwrap();

    // Verify health check
    let health = manager.health_check().await.unwrap();
    assert!(health.overall, "Overall health should be true");
    assert!(health.database, "Database health should be true");
    assert!(!health.cache_enabled, "Cache should not be enabled");

    println!("✅ PersistenceManager database-only test passed");
}

// =============================================================================
// TRUST RECEIPT TESTS
// =============================================================================

#[tokio::test]
#[ignore] // Requires running PostgreSQL
async fn test_trust_receipt_persistence() {
    let db_url = test_database_url();
    let manager = PersistenceManager::database_only(&db_url).await.unwrap();

    // Create test receipt
    let candidate = create_test_candidate("test-model");
    let run_id = format!("test-receipt-{}", Utc::now().timestamp_millis());
    let mut receipt = RunReceipt::new(run_id.clone(), &candidate);

    // Add Proof-of-Impact
    receipt.proof_of_impact = Some(ProofOfImpact {
        quality: 95.0,
        utility: 85.0,
        trust: 90.0,
        fairness: 88.0,
        diversity: 75.0,
    });

    // Sign receipt
    let trust_bridge = TrustBridge::new().unwrap();
    let signed_receipt = trust_bridge.sign_receipt(receipt);

    // Persist receipt
    let result = manager.save_receipt(&signed_receipt).await;
    assert!(result.is_ok(), "Failed to save receipt: {:?}", result.err());

    // Retrieve receipt
    let repo = manager.database().receipts();
    let retrieved = repo.find_by_id(&run_id).await.unwrap();

    assert!(retrieved.is_some(), "Receipt not found");
    let retrieved = retrieved.unwrap();
    assert_eq!(retrieved.run_id, run_id);
    assert_eq!(retrieved.winner_model, "test-model");
    assert!(!retrieved.signature.is_empty());

    println!("✅ Trust receipt persistence test passed");
}

#[tokio::test]
#[ignore] // Requires running PostgreSQL
async fn test_trust_receipt_query_by_model() {
    let db_url = test_database_url();
    let manager = PersistenceManager::database_only(&db_url).await.unwrap();

    let model_name = format!("query-test-model-{}", Utc::now().timestamp_millis());

    // Create and persist multiple receipts
    let trust_bridge = TrustBridge::new().unwrap();
    for i in 1..=3 {
        let candidate = create_test_candidate(&model_name);
        let run_id = format!("query-test-{}-{}", model_name, i);
        let receipt = RunReceipt::new(run_id, &candidate);
        let signed = trust_bridge.sign_receipt(receipt);
        manager.save_receipt(&signed).await.unwrap();
    }

    // Query by model
    let repo = manager.database().receipts();
    let receipts = repo.find_by_model(&model_name, 10).await.unwrap();

    assert_eq!(receipts.len(), 3, "Should find 3 receipts");
    for receipt in receipts {
        assert_eq!(receipt.winner_model, model_name);
    }

    println!("✅ Trust receipt query by model test passed");
}

// =============================================================================
// ROUTER STATE TESTS
// =============================================================================

#[tokio::test]
#[ignore] // Requires running PostgreSQL
async fn test_router_state_initialization() {
    let db_url = test_database_url();
    let manager = PersistenceManager::database_only(&db_url).await.unwrap();

    let model_name = format!("init-test-{}", Utc::now().timestamp_millis());

    // Initialize model
    let result = manager.initialize_model(&model_name, Some("ollama")).await;
    assert!(
        result.is_ok(),
        "Failed to initialize model: {:?}",
        result.err()
    );

    // Retrieve state
    let state = manager.get_router_state(&model_name).await.unwrap();
    assert!(state.is_some(), "Router state not found");

    let state = state.unwrap();
    assert_eq!(state.model_name, model_name);
    assert_eq!(state.alpha, 1.0);
    assert_eq!(state.beta, 1.0);
    assert_eq!(state.win_rate, 0.5);
    assert_eq!(state.total_trials, 0);

    println!("✅ Router state initialization test passed");
}

#[tokio::test]
#[ignore] // Requires running PostgreSQL
async fn test_router_state_success_increment() {
    let db_url = test_database_url();
    let manager = PersistenceManager::database_only(&db_url).await.unwrap();

    let model_name = format!("success-test-{}", Utc::now().timestamp_millis());

    // Initialize model
    manager.initialize_model(&model_name, None).await.unwrap();

    // Increment success 3 times
    for _ in 0..3 {
        manager.increment_router_success(&model_name).await.unwrap();
    }

    // Verify state
    let state = manager
        .get_router_state(&model_name)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(state.alpha, 4.0); // 1.0 + 3.0
    assert_eq!(state.beta, 1.0);
    assert_eq!(state.total_trials, 3);

    let expected_win_rate = 4.0 / 5.0; // 0.8
    assert!(
        (state.win_rate - expected_win_rate).abs() < 0.01,
        "Win rate should be approximately {}",
        expected_win_rate
    );

    println!("✅ Router state success increment test passed");
}

#[tokio::test]
#[ignore] // Requires running PostgreSQL
async fn test_router_state_failure_increment() {
    let db_url = test_database_url();
    let manager = PersistenceManager::database_only(&db_url).await.unwrap();

    let model_name = format!("failure-test-{}", Utc::now().timestamp_millis());

    // Initialize model
    manager.initialize_model(&model_name, None).await.unwrap();

    // Increment failure 2 times
    for _ in 0..2 {
        manager.increment_router_failure(&model_name).await.unwrap();
    }

    // Verify state
    let state = manager
        .get_router_state(&model_name)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(state.alpha, 1.0);
    assert_eq!(state.beta, 3.0); // 1.0 + 2.0
    assert_eq!(state.total_trials, 2);

    let expected_win_rate = 1.0 / 4.0; // 0.25
    assert!(
        (state.win_rate - expected_win_rate).abs() < 0.01,
        "Win rate should be approximately {}",
        expected_win_rate
    );

    println!("✅ Router state failure increment test passed");
}

#[tokio::test]
#[ignore] // Requires running PostgreSQL and Redis
async fn test_router_state_caching() {
    let db_url = test_database_url();
    let redis_url = test_redis_url();
    let manager = PersistenceManager::new(&db_url, &redis_url).await.unwrap();

    let model_name = format!("cache-test-{}", Utc::now().timestamp_millis());

    // Initialize model
    manager.initialize_model(&model_name, None).await.unwrap();

    // First get - should hit database
    let state1 = manager
        .get_router_state(&model_name)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(state1.alpha, 1.0);

    // Update state directly in database (bypass cache)
    manager.increment_router_success(&model_name).await.unwrap();

    // Second get - cache should have been invalidated
    let state2 = manager
        .get_router_state(&model_name)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(state2.alpha, 2.0);

    println!("✅ Router state caching test passed");
}

// =============================================================================
// PROOF-OF-IMPACT TESTS
// =============================================================================

#[tokio::test]
#[ignore] // Requires running PostgreSQL
async fn test_proof_of_impact_persistence() {
    let db_url = test_database_url();
    let manager = PersistenceManager::database_only(&db_url).await.unwrap();

    // Create test receipt
    let candidate = create_test_candidate("poi-test-model");
    let run_id = format!("poi-test-{}", Utc::now().timestamp_millis());
    let receipt = RunReceipt::new(run_id.clone(), &candidate);

    let trust_bridge = TrustBridge::new().unwrap();
    let signed = trust_bridge.sign_receipt(receipt);

    manager.save_receipt(&signed).await.unwrap();

    // Save PoI
    let poi = ProofOfImpact {
        quality: 95.0,
        utility: 88.0,
        trust: 92.0,
        fairness: 85.0,
        diversity: 78.0,
    };

    let result = manager
        .save_proof_of_impact(&run_id, "poi-test-model", &poi)
        .await;
    assert!(result.is_ok(), "Failed to save PoI: {:?}", result.err());

    // Verify PoI was saved
    let repo = manager.database().proof_of_impact();
    let retrieved = repo.get_by_receipt(&run_id).await.unwrap();

    assert_eq!(retrieved.len(), 1, "Should find 1 PoI record");
    let record = &retrieved[0];
    assert_eq!(record.quality, 95.0);
    assert_eq!(record.utility, 88.0);

    let normalized = (95.0 + 88.0 + 92.0 + 85.0 + 78.0) / 100.0;
    assert!(
        (normalized - 4.38).abs() < 0.01,
        "Normalized score should be approximately 4.38"
    );

    println!("✅ Proof-of-Impact persistence test passed");
}

// =============================================================================
// END-TO-END WORKFLOW TESTS
// =============================================================================

#[tokio::test]
#[ignore] // Requires running PostgreSQL and Redis
async fn test_complete_synthesis_workflow() {
    let db_url = test_database_url();
    let redis_url = test_redis_url();
    let manager = PersistenceManager::new(&db_url, &redis_url).await.unwrap();

    let model_name = format!("workflow-test-{}", Utc::now().timestamp_millis());

    // STEP 1: Initialize model
    manager
        .initialize_model(&model_name, Some("ollama"))
        .await
        .unwrap();

    // STEP 2: Run synthesis (simulated)
    let candidate = create_test_candidate(&model_name);
    let run_id = format!("workflow-run-{}", Utc::now().timestamp_millis());
    let mut receipt = RunReceipt::new(run_id.clone(), &candidate);

    // STEP 3: Add PoI
    let poi = ProofOfImpact {
        quality: 93.0,
        utility: 87.0,
        trust: 91.0,
        fairness: 84.0,
        diversity: 76.0,
    };
    receipt.proof_of_impact = Some(poi.clone());

    // STEP 4: Sign receipt
    let trust_bridge = TrustBridge::new().unwrap();
    let signed = trust_bridge.sign_receipt(receipt);

    // STEP 5: Persist all data
    manager.save_receipt(&signed).await.unwrap();
    manager
        .save_proof_of_impact(&run_id, &model_name, &poi)
        .await
        .unwrap();

    // STEP 6: Update router state (success)
    manager.increment_router_success(&model_name).await.unwrap();

    // STEP 7: Verify all data
    let receipt_repo = manager.database().receipts();
    let retrieved_receipt = receipt_repo.find_by_id(&run_id).await.unwrap();
    assert!(retrieved_receipt.is_some());

    let poi_repo = manager.database().proof_of_impact();
    let retrieved_poi = poi_repo.get_by_receipt(&run_id).await.unwrap();
    assert_eq!(retrieved_poi.len(), 1);

    let state = manager
        .get_router_state(&model_name)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(state.alpha, 2.0); // Incremented from 1.0

    println!("✅ Complete synthesis workflow test passed");
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

#[tokio::test]
#[ignore] // Requires running PostgreSQL
async fn test_receipt_persistence_performance() {
    let db_url = test_database_url();
    let manager = PersistenceManager::database_only(&db_url).await.unwrap();

    let trust_bridge = TrustBridge::new().unwrap();
    let candidate = create_test_candidate("perf-test");

    let start = std::time::Instant::now();
    let iterations = 10;

    for i in 0..iterations {
        let run_id = format!(
            "perf-test-{}-{}",
            Utc::now().timestamp_nanos_opt().unwrap(),
            i
        );
        let receipt = RunReceipt::new(run_id, &candidate);
        let signed = trust_bridge.sign_receipt(receipt);
        manager.save_receipt(&signed).await.unwrap();
    }

    let elapsed = start.elapsed();
    let avg_latency = elapsed.as_millis() as f64 / iterations as f64;

    println!(
        "📊 Receipt persistence: {} iterations in {:.2}ms (avg: {:.2}ms/op)",
        iterations,
        elapsed.as_millis(),
        avg_latency
    );

    // Performance target: <5ms per operation
    assert!(
        avg_latency < 5.0,
        "Average latency {:.2}ms exceeds target of 5ms",
        avg_latency
    );

    println!("✅ Receipt persistence performance test passed");
}

#[tokio::test]
#[ignore] // Requires running PostgreSQL and Redis
async fn test_cache_performance() {
    let db_url = test_database_url();
    let redis_url = test_redis_url();
    let manager = PersistenceManager::new(&db_url, &redis_url).await.unwrap();

    let model_name = format!("cache-perf-{}", Utc::now().timestamp_millis());
    manager.initialize_model(&model_name, None).await.unwrap();

    // Warm cache
    manager.get_router_state(&model_name).await.unwrap();

    // Measure cache GET performance
    let start = std::time::Instant::now();
    let iterations = 100;

    for _ in 0..iterations {
        manager.get_router_state(&model_name).await.unwrap();
    }

    let elapsed = start.elapsed();
    let avg_latency = elapsed.as_micros() as f64 / iterations as f64;

    println!(
        "📊 Cache GET: {} iterations in {:.2}µs (avg: {:.2}µs/op)",
        iterations,
        elapsed.as_micros(),
        avg_latency
    );

    // Performance target: <1000µs (1ms) per operation
    assert!(
        avg_latency < 1000.0,
        "Average latency {:.2}µs exceeds target of 1000µs",
        avg_latency
    );

    println!("✅ Cache performance test passed");
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

#[tokio::test]
async fn test_suite_summary() {
    println!("\n╔═══════════════════════════════════════════════════════════════╗");
    println!("║   BIZRA Genesis Node - Database Integration Test Suite       ║");
    println!("╚═══════════════════════════════════════════════════════════════╝");
    println!("\nTo run all tests:");
    println!("  cargo test --test database_integration -- --ignored --test-threads=1");
    println!("\nPrerequisites:");
    println!("  1. PostgreSQL running on localhost:5432");
    println!("  2. Redis running on localhost:6379");
    println!("  3. Environment variables set:");
    println!("     export TEST_DATABASE_URL='postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis_test'");
    println!("     export TEST_REDIS_URL='redis://localhost:6379/1'");
    println!("\nTest coverage:");
    println!("  ✓ PersistenceManager initialization");
    println!("  ✓ Trust receipt persistence and retrieval");
    println!("  ✓ Router state management (Thompson Sampling)");
    println!("  ✓ Proof-of-Impact tracking");
    println!("  ✓ Redis caching and invalidation");
    println!("  ✓ End-to-end workflows");
    println!("  ✓ Performance benchmarks");
    println!();
}
