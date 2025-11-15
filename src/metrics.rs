// src/metrics.rs
// Prometheus metrics instrumentation for BIZRA Genesis Node
// Eliminates simulated metrics with real runtime measurements

use once_cell::sync::Lazy;
use prometheus::{
    register_counter, register_gauge, register_histogram, register_histogram_vec, Counter, Gauge,
    Histogram, HistogramVec, Registry,
};

// ═══════════════════════════════════════════════════════════════════════
// PROMETHEUS REGISTRY
// ═══════════════════════════════════════════════════════════════════════

/// Global Prometheus registry for all metrics
pub static METRICS_REGISTRY: Lazy<Registry> = Lazy::new(Registry::new);

// ═══════════════════════════════════════════════════════════════════════
// CONSENSUS METRICS
// ═══════════════════════════════════════════════════════════════════════

/// Consensus algorithm latency in microseconds (replaces simulated 45μs)
/// Target: P99 < 50μs (goal: 46μs)
/// Pattern: 10-bucket histogram matching vLLM inference_latency_seconds
pub static CONSENSUS_LATENCY_MICROSECONDS: Lazy<Histogram> = Lazy::new(|| {
    let histogram = register_histogram!(
        "bizra_consensus_latency_microseconds",
        "Weighted Selective Consensus algorithm latency in microseconds",
        vec![10.0, 20.0, 30.0, 40.0, 50.0, 75.0, 100.0, 150.0, 200.0, 500.0] // 10 buckets
    )
    .expect("Failed to register consensus_latency_microseconds histogram");

    // Register with global registry
    METRICS_REGISTRY
        .register(Box::new(histogram.clone()))
        .expect("Failed to register consensus latency to global registry");

    histogram
});

/// Total number of consensus operations performed
pub static CONSENSUS_OPERATIONS_TOTAL: Lazy<Counter> = Lazy::new(|| {
    let counter = register_counter!(
        "bizra_consensus_operations_total",
        "Total number of consensus operations performed"
    )
    .expect("Failed to register consensus_operations_total counter");

    METRICS_REGISTRY
        .register(Box::new(counter.clone()))
        .expect("Failed to register consensus operations to global registry");

    counter
});

/// Number of Pareto-optimal candidates found in consensus
pub static CONSENSUS_PARETO_CANDIDATES: Lazy<Histogram> = Lazy::new(|| {
    let histogram = register_histogram!(
        "bizra_consensus_pareto_candidates",
        "Number of Pareto-optimal candidates found per consensus operation",
        vec![1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 20.0] // Typical candidate counts
    )
    .expect("Failed to register consensus_pareto_candidates histogram");

    METRICS_REGISTRY
        .register(Box::new(histogram.clone()))
        .expect("Failed to register pareto candidates to global registry");

    histogram
});

// ═══════════════════════════════════════════════════════════════════════
// PROOF-OF-IMPACT (POI) METRICS
// ═══════════════════════════════════════════════════════════════════════

/// PoI validation success rate (replaces simulated 99.5%)
/// Target: >99% success rate
/// This is a gauge that gets updated with rolling average
pub static POI_VALIDATION_SUCCESS_RATE: Lazy<Gauge> = Lazy::new(|| {
    let gauge = register_gauge!(
        "bizra_poi_validation_success_rate",
        "Proof-of-Impact validation success rate (0.0-1.0)"
    )
    .expect("Failed to register poi_validation_success_rate gauge");

    METRICS_REGISTRY
        .register(Box::new(gauge.clone()))
        .expect("Failed to register POI success rate to global registry");

    gauge
});

/// Total number of PoI validation attempts
pub static POI_VALIDATION_ATTEMPTS_TOTAL: Lazy<Counter> = Lazy::new(|| {
    let counter = register_counter!(
        "bizra_poi_validation_attempts_total",
        "Total number of Proof-of-Impact validation attempts"
    )
    .expect("Failed to register poi_validation_attempts_total counter");

    METRICS_REGISTRY
        .register(Box::new(counter.clone()))
        .expect("Failed to register POI attempts to global registry");

    counter
});

/// Number of successful PoI validations
pub static POI_VALIDATION_SUCCESS_TOTAL: Lazy<Counter> = Lazy::new(|| {
    let counter = register_counter!(
        "bizra_poi_validation_success_total",
        "Total number of successful Proof-of-Impact validations"
    )
    .expect("Failed to register poi_validation_success_total counter");

    METRICS_REGISTRY
        .register(Box::new(counter.clone()))
        .expect("Failed to register POI success to global registry");

    counter
});

/// Number of failed PoI validations
pub static POI_VALIDATION_FAILURE_TOTAL: Lazy<Counter> = Lazy::new(|| {
    let counter = register_counter!(
        "bizra_poi_validation_failure_total",
        "Total number of failed Proof-of-Impact validations"
    )
    .expect("Failed to register poi_validation_failure_total counter");

    METRICS_REGISTRY
        .register(Box::new(counter.clone()))
        .expect("Failed to register POI failure to global registry");

    counter
});

/// PoI score distribution histogram
pub static POI_SCORE_DISTRIBUTION: Lazy<Histogram> = Lazy::new(|| {
    let histogram = register_histogram!(
        "bizra_poi_score_distribution",
        "Distribution of normalized PoI scores (0.0-1.0)",
        vec![0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0]
    )
    .expect("Failed to register poi_score_distribution histogram");

    METRICS_REGISTRY
        .register(Box::new(histogram.clone()))
        .expect("Failed to register POI score distribution to global registry");

    histogram
});

// ═══════════════════════════════════════════════════════════════════════
// THOMPSON SAMPLING ROUTER METRICS
// ═══════════════════════════════════════════════════════════════════════

/// Routing decision latency in microseconds
/// Target: P99 < 2.3μs
pub static ROUTING_LATENCY_MICROSECONDS: Lazy<Histogram> = Lazy::new(|| {
    let histogram = register_histogram!(
        "bizra_routing_latency_microseconds",
        "Thompson Sampling routing decision latency in microseconds",
        vec![0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 5.0, 10.0, 20.0, 50.0]
    )
    .expect("Failed to register routing_latency_microseconds histogram");

    METRICS_REGISTRY
        .register(Box::new(histogram.clone()))
        .expect("Failed to register routing latency to global registry");

    histogram
});

/// Total routing operations
pub static ROUTING_OPERATIONS_TOTAL: Lazy<Counter> = Lazy::new(|| {
    let counter = register_counter!(
        "bizra_routing_operations_total",
        "Total number of routing decisions made"
    )
    .expect("Failed to register routing_operations_total counter");

    METRICS_REGISTRY
        .register(Box::new(counter.clone()))
        .expect("Failed to register routing operations to global registry");

    counter
});

/// Win rates per route (histogram vector)
pub static ROUTE_WIN_RATES: Lazy<HistogramVec> = Lazy::new(|| {
    let histogram_vec = register_histogram_vec!(
        "bizra_route_win_rate",
        "Win rate per route (0.0-1.0)",
        &["route_name"],
        vec![0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    )
    .expect("Failed to register route_win_rate histogram_vec");

    METRICS_REGISTRY
        .register(Box::new(histogram_vec.clone()))
        .expect("Failed to register route win rates to global registry");

    histogram_vec
});

// ═══════════════════════════════════════════════════════════════════════
// IHSAN QUALITY GATE METRICS
// ═══════════════════════════════════════════════════════════════════════

/// Ihsan score distribution
pub static IHSAN_SCORE_DISTRIBUTION: Lazy<Histogram> = Lazy::new(|| {
    let histogram = register_histogram!(
        "bizra_ihsan_score_distribution",
        "Distribution of Ihsan quality scores (0.0-1.0)",
        vec![0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.97, 0.99, 1.0]
    )
    .expect("Failed to register ihsan_score_distribution histogram");

    METRICS_REGISTRY
        .register(Box::new(histogram.clone()))
        .expect("Failed to register Ihsan distribution to global registry");

    histogram
});

/// Number of candidates rejected by Ihsan gate
pub static IHSAN_REJECTIONS_TOTAL: Lazy<Counter> = Lazy::new(|| {
    let counter = register_counter!(
        "bizra_ihsan_rejections_total",
        "Total number of candidates rejected by Ihsan quality gate"
    )
    .expect("Failed to register ihsan_rejections_total counter");

    METRICS_REGISTRY
        .register(Box::new(counter.clone()))
        .expect("Failed to register Ihsan rejections to global registry");

    counter
});

/// Number of candidates passing Ihsan gate
pub static IHSAN_PASSES_TOTAL: Lazy<Counter> = Lazy::new(|| {
    let counter = register_counter!(
        "bizra_ihsan_passes_total",
        "Total number of candidates passing Ihsan quality gate"
    )
    .expect("Failed to register ihsan_passes_total counter");

    METRICS_REGISTRY
        .register(Box::new(counter.clone()))
        .expect("Failed to register Ihsan passes to global registry");

    counter
});

// ═══════════════════════════════════════════════════════════════════════
// DATABASE & PERSISTENCE METRICS
// ═══════════════════════════════════════════════════════════════════════

/// PostgreSQL connection pool - active connections
pub static DB_POOL_ACTIVE_CONNECTIONS: Lazy<Gauge> = Lazy::new(|| {
    let gauge = register_gauge!(
        "bizra_db_pool_active_connections",
        "Number of active PostgreSQL connections in the pool"
    )
    .expect("Failed to register db_pool_active_connections gauge");

    METRICS_REGISTRY
        .register(Box::new(gauge.clone()))
        .expect("Failed to register DB pool active to global registry");

    gauge
});

/// PostgreSQL connection pool - idle connections
pub static DB_POOL_IDLE_CONNECTIONS: Lazy<Gauge> = Lazy::new(|| {
    let gauge = register_gauge!(
        "bizra_db_pool_idle_connections",
        "Number of idle PostgreSQL connections in the pool"
    )
    .expect("Failed to register db_pool_idle_connections gauge");

    METRICS_REGISTRY
        .register(Box::new(gauge.clone()))
        .expect("Failed to register DB pool idle to global registry");

    gauge
});

/// Database query duration by operation type
/// Labels: operation (insert, select, update, delete)
pub static DB_QUERY_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    let histogram_vec = register_histogram_vec!(
        "bizra_db_query_duration_seconds",
        "Database query duration in seconds by operation type",
        &["operation", "table"],
        vec![0.001, 0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0] // 1ms to 1s
    )
    .expect("Failed to register db_query_duration_seconds histogram_vec");

    METRICS_REGISTRY
        .register(Box::new(histogram_vec.clone()))
        .expect("Failed to register DB query duration to global registry");

    histogram_vec
});

/// Total database operations by type
pub static DB_OPERATIONS_TOTAL: Lazy<prometheus::IntCounterVec> = Lazy::new(|| {
    
    let counter_vec = prometheus::register_int_counter_vec!(
        "bizra_db_operations_total",
        "Total number of database operations by type",
        &["operation", "table"]
    )
    .expect("Failed to register db_operations_total counter_vec");

    METRICS_REGISTRY
        .register(Box::new(counter_vec.clone()))
        .expect("Failed to register DB operations to global registry");

    counter_vec
});

/// Database errors by type
pub static DB_ERRORS_TOTAL: Lazy<prometheus::IntCounterVec> = Lazy::new(|| {
    
    let counter_vec = prometheus::register_int_counter_vec!(
        "bizra_db_errors_total",
        "Total number of database errors by error type",
        &["error_type", "table"]
    )
    .expect("Failed to register db_errors_total counter_vec");

    METRICS_REGISTRY
        .register(Box::new(counter_vec.clone()))
        .expect("Failed to register DB errors to global registry");

    counter_vec
});

/// Redis cache hit rate
pub static CACHE_HIT_RATE: Lazy<Gauge> = Lazy::new(|| {
    let gauge = register_gauge!(
        "bizra_cache_hit_rate",
        "Redis cache hit rate (0.0-1.0)"
    )
    .expect("Failed to register cache_hit_rate gauge");

    METRICS_REGISTRY
        .register(Box::new(gauge.clone()))
        .expect("Failed to register cache hit rate to global registry");

    gauge
});

/// Cache operations (hits, misses, sets)
pub static CACHE_OPERATIONS_TOTAL: Lazy<prometheus::IntCounterVec> = Lazy::new(|| {
    
    let counter_vec = prometheus::register_int_counter_vec!(
        "bizra_cache_operations_total",
        "Total number of cache operations by type",
        &["operation"] // hit, miss, set, delete
    )
    .expect("Failed to register cache_operations_total counter_vec");

    METRICS_REGISTRY
        .register(Box::new(counter_vec.clone()))
        .expect("Failed to register cache operations to global registry");

    counter_vec
});

/// Cache operation latency
pub static CACHE_OPERATION_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    let histogram_vec = register_histogram_vec!(
        "bizra_cache_operation_duration_seconds",
        "Redis cache operation duration in seconds",
        &["operation"],
        vec![0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.025] // 0.1ms to 25ms
    )
    .expect("Failed to register cache_operation_duration_seconds histogram_vec");

    METRICS_REGISTRY
        .register(Box::new(histogram_vec.clone()))
        .expect("Failed to register cache duration to global registry");

    histogram_vec
});

/// Database migration execution time
pub static DB_MIGRATION_DURATION_SECONDS: Lazy<Histogram> = Lazy::new(|| {
    let histogram = register_histogram!(
        "bizra_db_migration_duration_seconds",
        "Database migration execution time in seconds",
        vec![0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0] // 100ms to 2 minutes
    )
    .expect("Failed to register db_migration_duration_seconds histogram");

    METRICS_REGISTRY
        .register(Box::new(histogram.clone()))
        .expect("Failed to register migration duration to global registry");

    histogram
});

/// Total database migrations applied
pub static DB_MIGRATIONS_APPLIED_TOTAL: Lazy<Counter> = Lazy::new(|| {
    let counter = register_counter!(
        "bizra_db_migrations_applied_total",
        "Total number of database migrations applied"
    )
    .expect("Failed to register db_migrations_applied_total counter");

    METRICS_REGISTRY
        .register(Box::new(counter.clone()))
        .expect("Failed to register migrations applied to global registry");

    counter
});

// ═══════════════════════════════════════════════════════════════════════
// CRYPTOGRAPHIC TRUST METRICS
// ═══════════════════════════════════════════════════════════════════════

/// Receipt generation latency (Ed25519 signing)
pub static RECEIPT_GENERATION_LATENCY_MICROSECONDS: Lazy<Histogram> = Lazy::new(|| {
    let histogram = register_histogram!(
        "bizra_receipt_generation_latency_microseconds",
        "Cryptographic receipt generation latency in microseconds",
        vec![10.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0]
    )
    .expect("Failed to register receipt_generation_latency_microseconds histogram");

    METRICS_REGISTRY
        .register(Box::new(histogram.clone()))
        .expect("Failed to register receipt latency to global registry");

    histogram
});

/// Total receipts generated
pub static RECEIPTS_GENERATED_TOTAL: Lazy<Counter> = Lazy::new(|| {
    let counter = register_counter!(
        "bizra_receipts_generated_total",
        "Total number of cryptographic receipts generated"
    )
    .expect("Failed to register receipts_generated_total counter");

    METRICS_REGISTRY
        .register(Box::new(counter.clone()))
        .expect("Failed to register receipts generated to global registry");

    counter
});

/// Receipt verification success rate
pub static RECEIPT_VERIFICATION_SUCCESS_RATE: Lazy<Gauge> = Lazy::new(|| {
    let gauge = register_gauge!(
        "bizra_receipt_verification_success_rate",
        "Receipt verification success rate (0.0-1.0)"
    )
    .expect("Failed to register receipt_verification_success_rate gauge");

    METRICS_REGISTRY
        .register(Box::new(gauge.clone()))
        .expect("Failed to register receipt verification rate to global registry");

    gauge
});

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/// Gather all metrics in Prometheus text exposition format
/// This can be called from an HTTP endpoint: GET /rust-metrics
pub fn gather_metrics() -> String {
    use prometheus::Encoder;

    let encoder = prometheus::TextEncoder::new();
    let metric_families = METRICS_REGISTRY.gather();

    let mut buffer = Vec::new();
    encoder
        .encode(&metric_families, &mut buffer)
        .expect("Failed to encode metrics");

    String::from_utf8(buffer).expect("Metrics buffer is not valid UTF-8")
}

/// Initialize all metrics (forces lazy evaluation)
/// Call this at application startup to register all metrics with Prometheus
pub fn initialize_metrics() {
    // Force initialization of all lazy statics by accessing them

    // Consensus metrics
    let _ = &*CONSENSUS_LATENCY_MICROSECONDS;
    let _ = &*CONSENSUS_OPERATIONS_TOTAL;
    let _ = &*CONSENSUS_PARETO_CANDIDATES;

    // PoI metrics
    let _ = &*POI_VALIDATION_SUCCESS_RATE;
    let _ = &*POI_VALIDATION_ATTEMPTS_TOTAL;
    let _ = &*POI_VALIDATION_SUCCESS_TOTAL;
    let _ = &*POI_VALIDATION_FAILURE_TOTAL;
    let _ = &*POI_SCORE_DISTRIBUTION;

    // Routing metrics
    let _ = &*ROUTING_LATENCY_MICROSECONDS;
    let _ = &*ROUTING_OPERATIONS_TOTAL;
    let _ = &*ROUTE_WIN_RATES;

    // Ihsan metrics
    let _ = &*IHSAN_SCORE_DISTRIBUTION;
    let _ = &*IHSAN_REJECTIONS_TOTAL;
    let _ = &*IHSAN_PASSES_TOTAL;

    // Database metrics
    let _ = &*DB_POOL_ACTIVE_CONNECTIONS;
    let _ = &*DB_POOL_IDLE_CONNECTIONS;
    let _ = &*DB_QUERY_DURATION_SECONDS;
    let _ = &*DB_OPERATIONS_TOTAL;
    let _ = &*DB_ERRORS_TOTAL;
    let _ = &*DB_MIGRATION_DURATION_SECONDS;
    let _ = &*DB_MIGRATIONS_APPLIED_TOTAL;

    // Cache metrics
    let _ = &*CACHE_HIT_RATE;
    let _ = &*CACHE_OPERATIONS_TOTAL;
    let _ = &*CACHE_OPERATION_DURATION_SECONDS;

    // Cryptographic metrics
    let _ = &*RECEIPT_GENERATION_LATENCY_MICROSECONDS;
    let _ = &*RECEIPTS_GENERATED_TOTAL;
    let _ = &*RECEIPT_VERIFICATION_SUCCESS_RATE;

    tracing::info!("✅ Prometheus metrics initialized (28 metrics registered)");
}

/// Calculate and update PoI success rate from counters
/// Call this periodically or after each validation batch
pub fn update_poi_success_rate() {
    let attempts = POI_VALIDATION_ATTEMPTS_TOTAL.get();
    let successes = POI_VALIDATION_SUCCESS_TOTAL.get();

    if attempts > 0.0 {
        let rate = successes / attempts;
        POI_VALIDATION_SUCCESS_RATE.set(rate);
    }
}

/// Calculate and update receipt verification success rate
pub fn update_receipt_verification_rate(successes: u64, total: u64) {
    if total > 0 {
        let rate = successes as f64 / total as f64;
        RECEIPT_VERIFICATION_SUCCESS_RATE.set(rate);
    }
}

/// Update database connection pool metrics
pub fn update_db_pool_metrics(active: usize, idle: usize) {
    DB_POOL_ACTIVE_CONNECTIONS.set(active as f64);
    DB_POOL_IDLE_CONNECTIONS.set(idle as f64);
}

/// Record a database query with timing
pub fn record_db_query(operation: &str, table: &str, duration_seconds: f64) {
    DB_QUERY_DURATION_SECONDS
        .with_label_values(&[operation, table])
        .observe(duration_seconds);

    DB_OPERATIONS_TOTAL
        .with_label_values(&[operation, table])
        .inc();
}

/// Record a database error
pub fn record_db_error(error_type: &str, table: &str) {
    DB_ERRORS_TOTAL
        .with_label_values(&[error_type, table])
        .inc();
}

/// Calculate and update cache hit rate from counters
/// Call this periodically or after each batch of cache operations
pub fn update_cache_hit_rate() {
    let hits = CACHE_OPERATIONS_TOTAL.with_label_values(&["hit"]).get();
    let misses = CACHE_OPERATIONS_TOTAL.with_label_values(&["miss"]).get();
    let total = hits + misses;

    if total > 0 {
        let rate = hits as f64 / total as f64;
        CACHE_HIT_RATE.set(rate);
    }
}

/// Record a cache operation with timing
pub fn record_cache_operation(operation: &str, duration_seconds: f64) {
    CACHE_OPERATION_DURATION_SECONDS
        .with_label_values(&[operation])
        .observe(duration_seconds);

    CACHE_OPERATIONS_TOTAL
        .with_label_values(&[operation])
        .inc();
}

/// Record database migration execution
pub fn record_db_migration(duration_seconds: f64) {
    DB_MIGRATION_DURATION_SECONDS.observe(duration_seconds);
    DB_MIGRATIONS_APPLIED_TOTAL.inc();
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_initialization() {
        initialize_metrics();

        // Verify metrics can be gathered
        let metrics_text = gather_metrics();
        assert!(!metrics_text.is_empty());
        assert!(metrics_text.contains("bizra_consensus_latency_microseconds"));
        assert!(metrics_text.contains("bizra_poi_validation_success_rate"));
    }

    #[test]
    fn test_consensus_metrics() {
        // Get initial counter value (may be > 0 due to other tests)
        let initial_count = CONSENSUS_OPERATIONS_TOTAL.get();

        // Simulate consensus operation
        CONSENSUS_LATENCY_MICROSECONDS.observe(45.0); // 45μs
        CONSENSUS_OPERATIONS_TOTAL.inc();
        CONSENSUS_PARETO_CANDIDATES.observe(3.0); // 3 candidates

        // Verify counter was incremented by exactly 1
        assert_eq!(CONSENSUS_OPERATIONS_TOTAL.get(), initial_count + 1.0);
    }

    #[test]
    fn test_poi_metrics() {
        // Reset counters
        POI_VALIDATION_ATTEMPTS_TOTAL.inc();
        POI_VALIDATION_SUCCESS_TOTAL.inc();

        update_poi_success_rate();

        let rate = POI_VALIDATION_SUCCESS_RATE.get();
        assert!((0.0..=1.0).contains(&rate));
    }

    #[test]
    fn test_routing_metrics() {
        ROUTING_LATENCY_MICROSECONDS.observe(2.1); // 2.1μs
        ROUTING_OPERATIONS_TOTAL.inc();

        assert_eq!(ROUTING_OPERATIONS_TOTAL.get(), 1.0);
    }

    #[test]
    fn test_ihsan_metrics() {
        IHSAN_SCORE_DISTRIBUTION.observe(0.92);
        IHSAN_PASSES_TOTAL.inc();

        assert_eq!(IHSAN_PASSES_TOTAL.get(), 1.0);
    }

    #[test]
    fn test_receipt_metrics() {
        RECEIPT_GENERATION_LATENCY_MICROSECONDS.observe(150.0); // 150μs for Ed25519
        RECEIPTS_GENERATED_TOTAL.inc();

        update_receipt_verification_rate(99, 100); // 99% success
        assert_eq!(RECEIPT_VERIFICATION_SUCCESS_RATE.get(), 0.99);
    }

    #[test]
    fn test_route_win_rates() {
        let route_metric = ROUTE_WIN_RATES.with_label_values(&["gpt-4"]);
        route_metric.observe(0.85); // 85% win rate

        let metrics_text = gather_metrics();
        assert!(metrics_text.contains("gpt-4"));
    }

    #[test]
    fn test_db_pool_metrics() {
        update_db_pool_metrics(15, 85); // 15 active, 85 idle (out of 100 max)

        assert_eq!(DB_POOL_ACTIVE_CONNECTIONS.get(), 15.0);
        assert_eq!(DB_POOL_IDLE_CONNECTIONS.get(), 85.0);
    }

    #[test]
    fn test_db_query_metrics() {
        record_db_query("insert", "trust_receipts", 0.003); // 3ms

        let metrics_text = gather_metrics();
        assert!(metrics_text.contains("trust_receipts"));
        assert!(metrics_text.contains("insert"));
    }

    #[test]
    fn test_db_error_metrics() {
        record_db_error("connection_timeout", "router_state");

        let metrics_text = gather_metrics();
        assert!(metrics_text.contains("connection_timeout"));
    }

    #[test]
    fn test_cache_operations() {
        // Simulate cache hits and misses
        record_cache_operation("hit", 0.0005); // 0.5ms cache hit
        record_cache_operation("hit", 0.0003); // 0.3ms cache hit
        record_cache_operation("miss", 0.001); // 1ms cache miss
        record_cache_operation("set", 0.002); // 2ms cache set

        update_cache_hit_rate();

        // Hit rate should be 2 hits / (2 hits + 1 miss) = 66.67%
        let hit_rate = CACHE_HIT_RATE.get();
        assert!((0.66..=0.67).contains(&hit_rate));

        let metrics_text = gather_metrics();
        assert!(metrics_text.contains("bizra_cache_hit_rate"));
    }

    #[test]
    fn test_db_migration_metrics() {
        record_db_migration(1.5); // 1.5 seconds

        assert_eq!(DB_MIGRATIONS_APPLIED_TOTAL.get(), 1.0);

        let metrics_text = gather_metrics();
        assert!(metrics_text.contains("bizra_db_migration_duration_seconds"));
    }

    #[test]
    fn test_all_database_metrics_initialized() {
        initialize_metrics();

        let metrics_text = gather_metrics();

        // Verify all database metrics are present
        assert!(metrics_text.contains("bizra_db_pool_active_connections"));
        assert!(metrics_text.contains("bizra_db_pool_idle_connections"));
        assert!(metrics_text.contains("bizra_db_query_duration_seconds"));
        assert!(metrics_text.contains("bizra_db_operations_total"));
        assert!(metrics_text.contains("bizra_db_errors_total"));
        assert!(metrics_text.contains("bizra_cache_hit_rate"));
        assert!(metrics_text.contains("bizra_cache_operations_total"));
        assert!(metrics_text.contains("bizra_cache_operation_duration_seconds"));
        assert!(metrics_text.contains("bizra_db_migration_duration_seconds"));
    }
}
