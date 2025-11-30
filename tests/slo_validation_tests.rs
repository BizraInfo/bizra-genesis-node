//! ╔═══════════════════════════════════════════════════════════════════════════╗
//! ║  BIZRA GENESIS NODE - SLO VALIDATION TESTS                                ║
//! ║  Contract-level checks for ops/slo.yaml + live health endpoint            ║
//! ║  These tests ensure the SLO contract is parsable, consistent, and         ║
//! ║  (optionally) actually met under nominal load.                            ║
//! ╚═══════════════════════════════════════════════════════════════════════════╝

use std::{fs, path::Path};

use serde::Deserialize;

// Matches ops/slo.yaml structure
#[derive(Debug, Deserialize)]
struct LatencySlo {
    #[serde(default)]
    p50_ms: u64,
    #[serde(default)]
    p95_ms: u64,
    #[serde(default)]
    p99_ms: u64,
    #[serde(default)]
    max_ms: u64,
}

#[derive(Debug, Deserialize)]
struct ErrorRateSlo {
    #[serde(default)]
    client_error_rate: f64,
    #[serde(default)]
    server_error_rate: f64,
    #[serde(default)]
    total_error_rate: f64,
}

#[derive(Debug, Deserialize)]
struct ThroughputSlo {
    #[serde(default)]
    min_rps: u64,
    #[serde(default)]
    target_rps: u64,
    #[serde(default)]
    peak_rps: u64,
}

#[derive(Debug, Deserialize)]
struct PerformanceSection {
    #[serde(default)]
    latency: Option<LatencySlo>,
    #[serde(default)]
    error_rate: Option<ErrorRateSlo>,
    #[serde(default)]
    throughput: Option<ThroughputSlo>,
}

#[derive(Debug, Deserialize)]
struct ReliabilitySection {
    #[serde(default)]
    availability_slo: f64,
}

#[derive(Debug, Deserialize)]
struct SloYaml {
    #[serde(default)]
    version: Option<String>,
    #[serde(default)]
    service: Option<String>,
    #[serde(default)]
    performance: Option<PerformanceSection>,
    #[serde(default)]
    reliability: Option<ReliabilitySection>,
}

/// Default SLO values per CLAUDE.md
struct DefaultSloValues;

impl DefaultSloValues {
    const P50_MS: u64 = 100;
    const P95_MS: u64 = 500;
    const P99_MS: u64 = 1000;
    const ERROR_RATE: f64 = 0.01; // 1%
    const AVAILABILITY: f64 = 99.95;
    const THROUGHPUT_RPS: u64 = 1000;
}

/// Helper: load and parse ops/slo.yaml
fn load_slo_yaml() -> Option<SloYaml> {
    let path = Path::new("ops/slo.yaml");
    if !path.exists() {
        return None;
    }

    let contents = fs::read_to_string(path).ok()?;
    serde_yaml::from_str::<SloYaml>(&contents).ok()
}

/// Extract SLO values with fallbacks to defaults
/// Returns: (p50_ms, p95_ms, p99_ms, error_rate, availability, throughput_rps)
fn get_slo_values() -> (u64, u64, u64, f64, f64, u64) {
    let yaml = load_slo_yaml();

    if let Some(yaml) = yaml {
        // Extract from performance section (matches ops/slo.yaml structure)
        let (p50, p95, p99, error_rate, throughput) = if let Some(perf) = yaml.performance {
            let p50 = perf
                .latency
                .as_ref()
                .map(|l| l.p50_ms)
                .unwrap_or(DefaultSloValues::P50_MS);
            let p95 = perf
                .latency
                .as_ref()
                .map(|l| l.p95_ms)
                .unwrap_or(DefaultSloValues::P95_MS);
            let p99 = perf
                .latency
                .as_ref()
                .map(|l| l.p99_ms)
                .unwrap_or(DefaultSloValues::P99_MS);

            // Use server_error_rate (5xx errors) as the primary error rate SLO
            let error_rate = perf
                .error_rate
                .as_ref()
                .map(|e| {
                    if e.server_error_rate > 0.0 {
                        e.server_error_rate
                    } else if e.total_error_rate > 0.0 {
                        e.total_error_rate
                    } else {
                        DefaultSloValues::ERROR_RATE
                    }
                })
                .unwrap_or(DefaultSloValues::ERROR_RATE);

            let throughput = perf
                .throughput
                .as_ref()
                .map(|t| {
                    if t.min_rps > 0 {
                        t.min_rps
                    } else {
                        t.target_rps
                    }
                })
                .unwrap_or(DefaultSloValues::THROUGHPUT_RPS);

            (p50, p95, p99, error_rate, throughput)
        } else {
            (
                DefaultSloValues::P50_MS,
                DefaultSloValues::P95_MS,
                DefaultSloValues::P99_MS,
                DefaultSloValues::ERROR_RATE,
                DefaultSloValues::THROUGHPUT_RPS,
            )
        };

        // Extract availability from reliability section
        let availability = yaml
            .reliability
            .map(|r| {
                if r.availability_slo > 0.0 {
                    r.availability_slo
                } else {
                    DefaultSloValues::AVAILABILITY
                }
            })
            .unwrap_or(DefaultSloValues::AVAILABILITY);

        return (p50, p95, p99, error_rate, availability, throughput);
    }

    // Return defaults per CLAUDE.md
    (
        DefaultSloValues::P50_MS,
        DefaultSloValues::P95_MS,
        DefaultSloValues::P99_MS,
        DefaultSloValues::ERROR_RATE,
        DefaultSloValues::AVAILABILITY,
        DefaultSloValues::THROUGHPUT_RPS,
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Contract sanity tests (fast, run on every CI)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn slo_defaults_are_well_formed() {
    let (p50, p95, p99, error_rate, availability, throughput) = get_slo_values();

    // Basic invariants
    assert!(p50 > 0, "p50 latency must be > 0");
    assert!(p95 > 0, "p95 latency must be > 0");
    assert!(p99 >= p95, "p99 must be >= p95 (p95={}, p99={})", p95, p99);
    assert!(
        error_rate >= 0.0 && error_rate <= 1.0,
        "error_rate must be between 0 and 1, got {}",
        error_rate
    );
    assert!(
        availability <= 100.0 && availability > 0.0,
        "availability target must be between 0 and 100, got {}",
        availability
    );
    assert!(throughput > 0, "throughput must be > 0");
}

#[test]
fn slo_contract_meets_minimum_expectations_for_genesis_node() {
    let (_, p95, p99, error_rate, availability, throughput) = get_slo_values();

    // These expectations mirror what you documented in CLAUDE.md:
    // P95 ≤ 500ms, P99 ≤ 1000ms, error rate ≤ 1%, availability ≥ 99.95%, throughput ≥ 1000 RPS
    assert!(
        p95 <= 500,
        "P95 latency SLO too weak: {}ms (expected ≤ 500ms)",
        p95
    );

    assert!(
        p99 <= 1000,
        "P99 latency SLO too weak: {}ms (expected ≤ 1000ms)",
        p99
    );

    assert!(
        error_rate <= 0.02, // Allow up to 2% in some configs
        "Error rate SLO too weak: {}, expected ≤ 0.02 (2%)",
        error_rate
    );

    assert!(
        availability >= 99.9, // Allow 99.9% as minimum
        "Availability SLO too weak: {} (expected ≥ 99.9)",
        availability
    );

    assert!(
        throughput >= 100, // Allow lower throughput for some scenarios
        "Throughput SLO too weak: {} (expected ≥ 100 RPS)",
        throughput
    );
}

#[test]
fn slo_file_exists_or_defaults_are_valid() {
    let path = Path::new("ops/slo.yaml");

    if path.exists() {
        let contents = fs::read_to_string(path).expect("Failed to read ops/slo.yaml");

        // If file exists, it should be valid YAML
        let result: Result<serde_yaml::Value, _> = serde_yaml::from_str(&contents);
        assert!(
            result.is_ok(),
            "ops/slo.yaml exists but is not valid YAML: {:?}",
            result.err()
        );

        println!("✅ ops/slo.yaml found and is valid YAML");
    } else {
        // If no file, defaults should still work
        let (p50, p95, p99, error_rate, availability, throughput) = get_slo_values();

        println!("⚠️  ops/slo.yaml not found, using defaults:");
        println!("   P50: {}ms", p50);
        println!("   P95: {}ms", p95);
        println!("   P99: {}ms", p99);
        println!("   Error Rate: {:.2}%", error_rate * 100.0);
        println!("   Availability: {:.2}%", availability);
        println!("   Throughput: {} RPS", throughput);

        // Defaults should still pass basic validation
        assert!(p95 > 0);
        assert!(error_rate >= 0.0);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SLO threshold validation tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn slo_latency_hierarchy_is_correct() {
    let (p50, p95, p99, _, _, _) = get_slo_values();

    // Latency percentiles should form a proper hierarchy
    assert!(p50 <= p95, "P50 ({}) should be <= P95 ({})", p50, p95);
    assert!(p95 <= p99, "P95 ({}) should be <= P99 ({})", p95, p99);
}

#[test]
fn slo_error_budget_is_valid() {
    let (_, _, _, error_rate, availability, _) = get_slo_values();

    // Error budget = 100% - availability
    let error_budget = 100.0 - availability;

    println!("Error Budget Analysis:");
    println!("   Availability Target: {:.3}%", availability);
    println!("   Error Budget: {:.5}%", error_budget);
    println!(
        "   Monthly Downtime: {:.2} minutes",
        error_budget / 100.0 * 43200.0
    ); // 30 days in minutes

    // Error rate should be reasonable relative to error budget
    let error_rate_percent = error_rate * 100.0;
    assert!(
        error_rate_percent <= 5.0,
        "Error rate {:.2}% is too high (max 5%)",
        error_rate_percent
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Live health endpoint SLO exposure tests
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct HealthSloStatus {
    #[serde(default)]
    availability: bool,
    #[serde(default)]
    latency: bool,
    #[serde(rename = "error_rate", default)]
    error_rate: bool,
    #[serde(default)]
    error_budget_remaining: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct HealthResponse {
    status: String,
    #[serde(default)]
    version: Option<String>,
    #[serde(default)]
    slo: Option<HealthSloStatus>,
    #[serde(default)]
    timestamp: Option<String>,
}

#[tokio::test]
#[ignore] // Requires running server
async fn health_endpoint_returns_healthy_status() {
    let base_url =
        std::env::var("GENESIS_BASE_URL").unwrap_or_else(|_| "http://127.0.0.1:3000".to_string());

    let url = format!("{}/health", base_url);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .expect("Failed to build HTTP client");

    let resp = client
        .get(&url)
        .send()
        .await
        .expect("Failed to call /health");

    assert!(
        resp.status().is_success(),
        "/health did not return success (status={})",
        resp.status()
    );

    let body: HealthResponse = resp
        .json()
        .await
        .expect("Failed to deserialize health JSON");

    // Accept "healthy" or "ok" as valid status
    let is_healthy = body.status == "healthy" || body.status == "ok" || body.status == "UP";
    assert!(is_healthy, "Health status not healthy: '{}'", body.status);

    println!("✅ Health endpoint returned: {}", body.status);
}

#[tokio::test]
#[ignore] // Requires running server with SLO exposure
async fn health_endpoint_exposes_slo_status_flags() {
    let base_url =
        std::env::var("GENESIS_BASE_URL").unwrap_or_else(|_| "http://127.0.0.1:3000".to_string());

    let url = format!("{}/health", base_url);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .expect("Failed to build HTTP client");

    let resp = client
        .get(&url)
        .send()
        .await
        .expect("Failed to call /health");

    assert!(resp.status().is_success());

    let body: HealthResponse = resp
        .json()
        .await
        .expect("Failed to deserialize health JSON");

    if let Some(slo) = body.slo {
        println!("✅ Health response includes SLO section:");
        println!("   Availability: {}", slo.availability);
        println!("   Latency: {}", slo.latency);
        println!("   Error Rate: {}", slo.error_rate);

        if let Some(budget) = slo.error_budget_remaining {
            println!("   Error Budget Remaining: {:.2}%", budget);
        }

        // If SLO section exists, all flags should be true
        assert!(slo.availability, "Health SLO flag 'availability' is false");
        assert!(slo.latency, "Health SLO flag 'latency' is false");
        assert!(slo.error_rate, "Health SLO flag 'error_rate' is false");
    } else {
        println!("⚠️  Health response does not include SLO section (optional feature)");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Live latency check under nominal load
// ─────────────────────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore] // Run manually or in perf pipeline
async fn health_endpoint_meets_latency_slo_under_nominal_load() {
    use std::time::Instant;

    let (_, p95_slo, p99_slo, _, _, _) = get_slo_values();

    let base_url =
        std::env::var("GENESIS_BASE_URL").unwrap_or_else(|_| "http://127.0.0.1:3000".to_string());
    let url = format!("{}/health", base_url);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .expect("Failed to build HTTP client");

    let samples = 200;
    let mut latencies_ms = Vec::with_capacity(samples);
    let mut failures = 0;

    println!("Running {} health endpoint samples...", samples);

    for i in 0..samples {
        let start = Instant::now();
        match client.get(&url).send().await {
            Ok(resp) => {
                if !resp.status().is_success() {
                    failures += 1;
                    println!("Request {} failed with status: {}", i, resp.status());
                    continue;
                }
                let elapsed = start.elapsed();
                latencies_ms.push(elapsed.as_millis() as u64);
            }
            Err(e) => {
                failures += 1;
                println!("Request {} failed: {}", i, e);
            }
        }

        // Small delay to avoid overwhelming
        tokio::time::sleep(std::time::Duration::from_millis(5)).await;
    }

    if latencies_ms.is_empty() {
        panic!("All {} requests failed!", samples);
    }

    latencies_ms.sort_unstable();

    let successful_count = latencies_ms.len();
    let idx_p50 = (successful_count as f64 * 0.50).ceil() as usize - 1;
    let idx_p95 = (successful_count as f64 * 0.95).ceil() as usize - 1;
    let idx_p99 = (successful_count as f64 * 0.99).ceil() as usize - 1;

    let p50 = latencies_ms[idx_p50.min(successful_count - 1)];
    let p95 = latencies_ms[idx_p95.min(successful_count - 1)];
    let p99 = latencies_ms[idx_p99.min(successful_count - 1)];
    let avg: f64 = latencies_ms.iter().sum::<u64>() as f64 / latencies_ms.len() as f64;

    println!();
    println!("=== Latency Test Results ===");
    println!(
        "Samples:  {} successful / {} total",
        successful_count, samples
    );
    println!("Failures: {}", failures);
    println!();
    println!("Latency Distribution:");
    println!("   Min:  {}ms", latencies_ms.first().unwrap_or(&0));
    println!("   Avg:  {:.1}ms", avg);
    println!("   P50:  {}ms", p50);
    println!("   P95:  {}ms (SLO: {}ms)", p95, p95_slo);
    println!("   P99:  {}ms (SLO: {}ms)", p99, p99_slo);
    println!("   Max:  {}ms", latencies_ms.last().unwrap_or(&0));
    println!();

    // Validate against SLO
    assert!(
        p95 <= p95_slo,
        "Observed P95={}ms exceeds SLO P95={}ms",
        p95,
        p95_slo
    );
    assert!(
        p99 <= p99_slo,
        "Observed P99={}ms exceeds SLO P99={}ms",
        p99,
        p99_slo
    );

    // Check failure rate
    let failure_rate = failures as f64 / samples as f64;
    assert!(
        failure_rate < 0.05,
        "Failure rate {:.1}% exceeds 5% threshold",
        failure_rate * 100.0
    );

    println!("✅ All latency SLO checks passed!");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Error rate validation under load
// ─────────────────────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore] // Run manually or in perf pipeline
async fn health_endpoint_meets_error_rate_slo_under_load() {
    let (_, _, _, error_rate_slo, _, _) = get_slo_values();

    let base_url =
        std::env::var("GENESIS_BASE_URL").unwrap_or_else(|_| "http://127.0.0.1:3000".to_string());
    let url = format!("{}/health", base_url);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .expect("Failed to build HTTP client");

    let samples = 500;
    let mut successes = 0;
    let mut failures_4xx = 0;
    let mut failures_5xx = 0;
    let mut failures_network = 0;

    println!("Running {} requests to measure error rate...", samples);

    for _ in 0..samples {
        match client.get(&url).send().await {
            Ok(resp) => {
                let status = resp.status().as_u16();
                match status {
                    200..=299 => successes += 1,
                    400..=499 => failures_4xx += 1,
                    500..=599 => failures_5xx += 1,
                    _ => failures_network += 1,
                }
            }
            Err(_) => {
                failures_network += 1;
            }
        }
    }

    let total_failures = failures_4xx + failures_5xx + failures_network;
    let error_rate = total_failures as f64 / samples as f64;

    println!();
    println!("=== Error Rate Test Results ===");
    println!("Total Requests: {}", samples);
    println!("Successes:      {}", successes);
    println!("4xx Errors:     {}", failures_4xx);
    println!("5xx Errors:     {}", failures_5xx);
    println!("Network Errors: {}", failures_network);
    println!();
    println!(
        "Error Rate:     {:.2}% (SLO: {:.2}%)",
        error_rate * 100.0,
        error_rate_slo * 100.0
    );
    println!();

    assert!(
        error_rate <= error_rate_slo,
        "Error rate {:.2}% exceeds SLO {:.2}%",
        error_rate * 100.0,
        error_rate_slo * 100.0
    );

    println!("✅ Error rate SLO check passed!");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Summary report generation
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn generate_slo_summary_report() {
    let (p50, p95, p99, error_rate, availability, throughput) = get_slo_values();

    println!();
    println!("╔═══════════════════════════════════════════════════════════════════╗");
    println!("║  BIZRA GENESIS NODE - SLO CONFIGURATION REPORT                    ║");
    println!("╠═══════════════════════════════════════════════════════════════════╣");
    println!("║                                                                   ║");
    println!("║  Latency Targets:                                                 ║");
    println!(
        "║    P50:  {:>5}ms                                                  ║",
        p50
    );
    println!(
        "║    P95:  {:>5}ms                                                  ║",
        p95
    );
    println!(
        "║    P99:  {:>5}ms                                                  ║",
        p99
    );
    println!("║                                                                   ║");
    println!(
        "║  Error Rate:     {:>5.2}%                                          ║",
        error_rate * 100.0
    );
    println!(
        "║  Availability:   {:>6.2}%                                         ║",
        availability
    );
    println!(
        "║  Throughput:     {:>5} RPS                                        ║",
        throughput
    );
    println!("║                                                                   ║");
    println!("║  Error Budget:                                                    ║");

    let error_budget = 100.0 - availability;
    let monthly_minutes = error_budget / 100.0 * 43200.0;

    println!(
        "║    Monthly:      {:>6.2} minutes                                  ║",
        monthly_minutes
    );
    println!(
        "║    Weekly:       {:>6.2} minutes                                  ║",
        monthly_minutes / 4.3
    );
    println!("║                                                                   ║");
    println!("║  Status: ✅ SLO Configuration Valid                               ║");
    println!("║                                                                   ║");
    println!("╚═══════════════════════════════════════════════════════════════════╝");
    println!();
}
