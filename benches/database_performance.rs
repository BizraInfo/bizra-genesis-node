// benches/database_performance.rs
// Performance regression tests for database persistence layer
//
// Run with: cargo bench --bench database_performance
//
// Ensures database operations meet performance targets:
// - Receipt INSERT: <5ms (target: 2-3ms)
// - Router UPDATE: <3ms (target: 2ms)
// - Cache GET: <1ms (target: <1ms)
// - Query SELECT: <5ms (target: 2-3ms)

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use bizra_genesis_node::{
    Candidate, CandidateScores, PersistenceManager, ProofOfImpact, RunReceipt, TrustBridge,
};
use serde_json::json;
use std::time::Duration;

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Get database URL from environment or use default
fn get_database_url() -> String {
    std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis".to_string()
    })
}

/// Get Redis URL from environment or use default
fn get_redis_url() -> String {
    std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379/0".to_string())
}

/// Create a test candidate for benchmarking
fn create_test_candidate(id: usize) -> Candidate {
    Candidate {
        model: format!("model-{}", id),
        json: json!({
            "result": format!("Test result {}", id),
            "confidence": 0.92,
        }),
        cost_usd: 0.001,
        latency_ms: 800,
        scores: CandidateScores {
            accuracy: 0.90,
            safety: 0.95,
            efficiency: 0.88,
            ihsan: 0.90,
        },
    }
}

/// Create a test receipt from candidate
fn create_test_receipt(id: usize) -> RunReceipt {
    let candidate = create_test_candidate(id);
    let mut receipt = RunReceipt::new(format!("bench-run-{:06}", id), &candidate);

    receipt.proof_of_impact = Some(ProofOfImpact {
        quality: 92.0,
        utility: 85.0,
        trust: 90.0,
        fairness: 88.0,
        diversity: 75.0,
    });

    receipt
}

/// Initialize persistence manager for benchmarks
async fn init_persistence() -> PersistenceManager {
    let db_url = get_database_url();
    let redis_url = get_redis_url();

    PersistenceManager::new(&db_url, &redis_url)
        .await
        .expect("Failed to initialize persistence")
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECEIPT PERSISTENCE BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

/// Benchmark: Trust receipt INSERT operation
/// Target: <5ms (goal: 2-3ms)
fn bench_receipt_insert(c: &mut Criterion) {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let manager = runtime.block_on(init_persistence());
    let trust_bridge = TrustBridge::new().unwrap();

    let mut group = c.benchmark_group("receipt_insert");
    group.measurement_time(Duration::from_secs(10));
    group.sample_size(100);

    group.bench_function("single_receipt", |b| {
        let mut id = 0;
        b.to_async(&runtime).iter(|| async {
            id += 1;
            let receipt = create_test_receipt(id);
            let signed = trust_bridge.sign_receipt(receipt);
            manager
                .save_receipt(&signed)
                .await
                .expect("Receipt insert failed");
            black_box(());
        });
    });

    group.finish();
}

/// Benchmark: Batch receipt inserts
/// Tests throughput under load
fn bench_receipt_batch_insert(c: &mut Criterion) {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let manager = runtime.block_on(init_persistence());
    let trust_bridge = TrustBridge::new().unwrap();

    let mut group = c.benchmark_group("receipt_batch_insert");
    group.measurement_time(Duration::from_secs(15));

    for batch_size in [10, 50, 100].iter() {
        group.throughput(Throughput::Elements(*batch_size as u64));
        group.bench_with_input(
            BenchmarkId::from_parameter(batch_size),
            batch_size,
            |b, &size| {
                let mut id = 0;
                b.to_async(&runtime).iter(|| async {
                    for _ in 0..size {
                        id += 1;
                        let receipt = create_test_receipt(id);
                        let signed = trust_bridge.sign_receipt(receipt);
                        manager
                            .save_receipt(&signed)
                            .await
                            .expect("Batch insert failed");
                    }
                    black_box(());
                });
            },
        );
    }

    group.finish();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER STATE BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

/// Benchmark: Router state UPDATE operation
/// Target: <3ms (goal: 2ms)
fn bench_router_state_update(c: &mut Criterion) {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let manager = runtime.block_on(init_persistence());

    // Initialize model
    runtime
        .block_on(manager.initialize_model("bench-model", Some("test")))
        .unwrap();

    let mut group = c.benchmark_group("router_state_update");
    group.measurement_time(Duration::from_secs(10));
    group.sample_size(100);

    group.bench_function("update_state", |b| {
        let mut alpha = 1.0;
        let mut beta = 1.0;
        b.to_async(&runtime).iter(|| async {
            alpha += 0.1;
            beta += 0.05;
            manager
                .update_router_state("bench-model", alpha, beta)
                .await
                .expect("Router update failed");
            black_box(());
        });
    });

    group.finish();
}

/// Benchmark: Router state INCREMENT operation
/// Target: <3ms (atomic operation)
fn bench_router_increment(c: &mut Criterion) {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let manager = runtime.block_on(init_persistence());

    runtime
        .block_on(manager.initialize_model("bench-model-inc", Some("test")))
        .unwrap();

    let mut group = c.benchmark_group("router_increment");
    group.measurement_time(Duration::from_secs(10));
    group.sample_size(100);

    group.bench_function("increment_success", |b| {
        b.to_async(&runtime).iter(|| async {
            manager
                .increment_router_success("bench-model-inc")
                .await
                .expect("Increment failed");
            black_box(());
        });
    });

    group.bench_function("increment_failure", |b| {
        b.to_async(&runtime).iter(|| async {
            manager
                .increment_router_failure("bench-model-inc")
                .await
                .expect("Increment failed");
            black_box(());
        });
    });

    group.finish();
}

/// Benchmark: Router state SELECT operation
/// Target: <5ms (should use cache for hot data)
fn bench_router_state_select(c: &mut Criterion) {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let manager = runtime.block_on(init_persistence());

    runtime
        .block_on(manager.initialize_model("bench-model-select", Some("test")))
        .unwrap();

    let mut group = c.benchmark_group("router_state_select");
    group.measurement_time(Duration::from_secs(10));
    group.sample_size(100);

    group.bench_function("get_state", |b| {
        b.to_async(&runtime).iter(|| async {
            let state = manager
                .get_router_state("bench-model-select")
                .await
                .expect("Select failed");
            black_box(state);
        });
    });

    group.finish();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF-OF-IMPACT BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

/// Benchmark: Proof-of-Impact INSERT operation
/// Target: <5ms
fn bench_poi_insert(c: &mut Criterion) {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let manager = runtime.block_on(init_persistence());

    let mut group = c.benchmark_group("poi_insert");
    group.measurement_time(Duration::from_secs(10));
    group.sample_size(100);

    group.bench_function("save_poi", |b| {
        let mut id = 0;
        b.to_async(&runtime).iter(|| async {
            id += 1;
            let run_id = format!("poi-bench-{:06}", id);
            let poi = ProofOfImpact {
                quality: 92.0,
                utility: 85.0,
                trust: 90.0,
                fairness: 88.0,
                diversity: 75.0,
            };
            manager
                .save_proof_of_impact(&run_id, "bench-model", &poi)
                .await
                .expect("PoI insert failed");
            black_box(());
        });
    });

    group.finish();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE PERFORMANCE BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

/// Benchmark: Cache hit performance
/// Target: <1ms (goal: <1ms)
fn bench_cache_operations(c: &mut Criterion) {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let manager = runtime.block_on(init_persistence());

    // Warm up cache
    runtime
        .block_on(manager.initialize_model("cache-bench", Some("test")))
        .unwrap();
    runtime
        .block_on(manager.get_router_state("cache-bench"))
        .unwrap();

    let mut group = c.benchmark_group("cache_operations");
    group.measurement_time(Duration::from_secs(10));
    group.sample_size(500); // Higher sample for fast operations

    group.bench_function("cache_hit", |b| {
        b.to_async(&runtime).iter(|| async {
            let state = manager
                .get_router_state("cache-bench")
                .await
                .expect("Cache read failed");
            black_box(state);
        });
    });

    group.finish();
}

// ═══════════════════════════════════════════════════════════════════════════════
// END-TO-END WORKFLOW BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

/// Benchmark: Complete synthesis cycle with persistence
/// Target: <50ms total (receipt + PoI + router update)
fn bench_complete_synthesis_cycle(c: &mut Criterion) {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let manager = runtime.block_on(init_persistence());
    let trust_bridge = TrustBridge::new().unwrap();

    runtime
        .block_on(manager.initialize_model("synthesis-bench", Some("test")))
        .unwrap();

    let mut group = c.benchmark_group("complete_synthesis_cycle");
    group.measurement_time(Duration::from_secs(15));
    group.sample_size(50);

    group.bench_function("full_cycle", |b| {
        let mut id = 0;
        b.to_async(&runtime).iter(|| async {
            id += 1;
            let run_id = format!("cycle-{:06}", id);

            // 1. Create and sign receipt
            let receipt = create_test_receipt(id);
            let signed = trust_bridge.sign_receipt(receipt);

            // 2. Save receipt
            manager
                .save_receipt(&signed)
                .await
                .expect("Receipt save failed");

            // 3. Save Proof-of-Impact
            let poi = ProofOfImpact {
                quality: 92.0,
                utility: 85.0,
                trust: 90.0,
                fairness: 88.0,
                diversity: 75.0,
            };
            manager
                .save_proof_of_impact(&run_id, "synthesis-bench", &poi)
                .await
                .expect("PoI save failed");

            // 4. Update router state (success)
            manager
                .increment_router_success("synthesis-bench")
                .await
                .expect("Router update failed");

            black_box(());
        });
    });

    group.finish();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION POOL BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

/// Benchmark: Concurrent database operations
/// Tests connection pool under load
fn bench_concurrent_operations(c: &mut Criterion) {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let manager = runtime.block_on(init_persistence());

    runtime
        .block_on(manager.initialize_model("concurrent-bench", Some("test")))
        .unwrap();

    let mut group = c.benchmark_group("concurrent_operations");
    group.measurement_time(Duration::from_secs(15));

    for concurrency in [10, 50, 100].iter() {
        group.throughput(Throughput::Elements(*concurrency as u64));
        group.bench_with_input(
            BenchmarkId::from_parameter(concurrency),
            concurrency,
            |b, &concurrent| {
                b.to_async(&runtime).iter(|| async {
                    let mut handles = vec![];

                    for i in 0..concurrent {
                        let mgr = &manager;
                        let handle = tokio::spawn(async move {
                            mgr.get_router_state("concurrent-bench")
                                .await
                                .expect("Concurrent read failed");
                        });
                        handles.push(handle);
                    }

                    for handle in handles {
                        handle.await.unwrap();
                    }

                    black_box(());
                });
            },
        );
    }

    group.finish();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARK GROUP CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

criterion_group!(
    receipt_benches,
    bench_receipt_insert,
    bench_receipt_batch_insert,
);

criterion_group!(
    router_benches,
    bench_router_state_update,
    bench_router_increment,
    bench_router_state_select,
);

criterion_group!(poi_benches, bench_poi_insert,);

criterion_group!(cache_benches, bench_cache_operations,);

criterion_group!(
    workflow_benches,
    bench_complete_synthesis_cycle,
    bench_concurrent_operations,
);

criterion_main!(
    receipt_benches,
    router_benches,
    poi_benches,
    cache_benches,
    workflow_benches,
);
