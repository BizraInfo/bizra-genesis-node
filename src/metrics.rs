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
    let _ = &*CONSENSUS_LATENCY_MICROSECONDS;
    let _ = &*CONSENSUS_OPERATIONS_TOTAL;
    let _ = &*CONSENSUS_PARETO_CANDIDATES;

    let _ = &*POI_VALIDATION_SUCCESS_RATE;
    let _ = &*POI_VALIDATION_ATTEMPTS_TOTAL;
    let _ = &*POI_VALIDATION_SUCCESS_TOTAL;
    let _ = &*POI_VALIDATION_FAILURE_TOTAL;
    let _ = &*POI_SCORE_DISTRIBUTION;

    let _ = &*ROUTING_LATENCY_MICROSECONDS;
    let _ = &*ROUTING_OPERATIONS_TOTAL;
    let _ = &*ROUTE_WIN_RATES;

    let _ = &*IHSAN_SCORE_DISTRIBUTION;
    let _ = &*IHSAN_REJECTIONS_TOTAL;
    let _ = &*IHSAN_PASSES_TOTAL;

    let _ = &*RECEIPT_GENERATION_LATENCY_MICROSECONDS;
    let _ = &*RECEIPTS_GENERATED_TOTAL;
    let _ = &*RECEIPT_VERIFICATION_SUCCESS_RATE;

    tracing::info!("✅ Prometheus metrics initialized (18 metrics registered)");
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
}
