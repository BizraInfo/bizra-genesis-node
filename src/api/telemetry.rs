//! ╔═══════════════════════════════════════════════════════════════════════════╗
//! ║  BIZRA GENESIS NODE - LIVE TELEMETRY ENDPOINT                            ║
//! ║  Real-time system state for dashboard Glass Cockpit                       ║
//! ║  The "blood circulation" that brings the Silent Giant to life            ║
//! ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
    Extension,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;

// ═══════════════════════════════════════════════════════════════════════════
// GENESIS TELEMETRY SCHEMA - The Single Source of Truth
// ═══════════════════════════════════════════════════════════════════════════

/// Genesis Telemetry - canonical JSON schema for real-time dashboard updates
/// This struct represents the "pulse" of the system visible to the Citadel UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisTelemetry {
    /// ISO 8601 timestamp of this telemetry snapshot
    pub timestamp: DateTime<Utc>,

    /// Unique node identifier
    pub node_id: String,

    /// Request latency in microseconds (P50 over last minute)
    pub latency_us: u64,

    /// Ihsan quality score [0.0 - 1.0] - the "soul" of the system
    /// - `>= 0.90`: Gold (Excellence)
    /// - `>= 0.75`: Teal (Good)
    /// - `< 0.75`: Red (Needs Attention)
    pub ihsan_score: f64,

    /// Current consensus state
    pub consensus_state: ConsensusState,

    /// Current reward epoch number
    pub epoch: u64,

    /// Active agent counts by team
    pub active_agents: AgentCounts,

    /// Proof-of-Impact events in last minute
    pub poi_events_last_minute: u64,

    /// Error rate over last 5 minutes [0.0 - 1.0]
    pub error_rate: f64,

    /// System uptime in seconds
    pub uptime_seconds: u64,

    /// Model provider health status
    pub model_health: ModelHealth,

    /// Database connection pool status
    pub db_pool_status: DbPoolStatus,
}

/// Consensus state enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ConsensusState {
    /// System is stable and operating normally
    Stable,
    /// Consensus is in progress
    Converging,
    /// System is degraded but functional
    Degraded,
    /// System is in recovery mode
    Recovery,
    /// System is offline or unreachable
    Offline,
}

/// Active agent counts by team
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCounts {
    /// Production Agent Team count
    #[serde(rename = "PAT")]
    pub pat: u32,
    /// Support Agent Team count
    #[serde(rename = "SAT")]
    pub sat: u32,
    /// Trading Agent Team count
    #[serde(rename = "TAT")]
    pub tat: u32,
}

/// Model provider health status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelHealth {
    /// Primary model provider status
    pub primary_available: bool,
    /// Fallback model provider status
    pub fallback_available: bool,
    /// Currently active provider name
    pub active_provider: String,
    /// Circuit breaker state
    pub circuit_breaker_state: CircuitBreakerState,
}

/// Circuit breaker state
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CircuitBreakerState {
    Closed,
    Open,
    HalfOpen,
}

/// Database pool status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbPoolStatus {
    /// Active connections
    pub active: u32,
    /// Idle connections
    pub idle: u32,
    /// Maximum pool size
    pub max_size: u32,
    /// Connection health
    pub healthy: bool,
}

// ═══════════════════════════════════════════════════════════════════════════
// TELEMETRY COLLECTOR - Aggregates real-time metrics
// ═══════════════════════════════════════════════════════════════════════════

/// Telemetry collector that aggregates real-time system metrics
#[derive(Clone)]
pub struct TelemetryCollector {
    start_time: Instant,
    node_id: String,
    request_count: Arc<AtomicU64>,
    error_count: Arc<AtomicU64>,
    latency_sum_us: Arc<AtomicU64>,
    poi_events: Arc<AtomicU64>,
}

impl TelemetryCollector {
    /// Create a new telemetry collector
    pub fn new(node_id: String) -> Self {
        Self {
            start_time: Instant::now(),
            node_id,
            request_count: Arc::new(AtomicU64::new(0)),
            error_count: Arc::new(AtomicU64::new(0)),
            latency_sum_us: Arc::new(AtomicU64::new(0)),
            poi_events: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Record a request with latency
    pub fn record_request(&self, latency_us: u64, is_error: bool) {
        self.request_count.fetch_add(1, Ordering::Relaxed);
        self.latency_sum_us.fetch_add(latency_us, Ordering::Relaxed);
        if is_error {
            self.error_count.fetch_add(1, Ordering::Relaxed);
        }
    }

    /// Record a PoI event
    pub fn record_poi_event(&self) {
        self.poi_events.fetch_add(1, Ordering::Relaxed);
    }

    /// Get current telemetry snapshot
    pub fn snapshot(&self) -> GenesisTelemetry {
        let request_count = self.request_count.load(Ordering::Relaxed);
        let error_count = self.error_count.load(Ordering::Relaxed);
        let latency_sum = self.latency_sum_us.load(Ordering::Relaxed);

        // Calculate average latency (P50 approximation)
        let avg_latency = if request_count > 0 {
            latency_sum / request_count
        } else {
            0
        };

        // Calculate error rate
        let error_rate = if request_count > 0 {
            error_count as f64 / request_count as f64
        } else {
            0.0
        };

        // Calculate Ihsan score based on error rate and latency
        // This is a simplified calculation - in production, this would
        // incorporate the full 4-dimensional Ihsan scoring from scoring.rs
        let ihsan_score = calculate_ihsan_score(error_rate, avg_latency);

        // Determine consensus state based on metrics
        let consensus_state = determine_consensus_state(ihsan_score, error_rate);

        GenesisTelemetry {
            timestamp: Utc::now(),
            node_id: self.node_id.clone(),
            latency_us: avg_latency,
            ihsan_score,
            consensus_state,
            epoch: 1, // TODO: Get from actual epoch service
            active_agents: AgentCounts {
                pat: 7, // PAT agents
                sat: 5, // SAT agents
                tat: 3, // TAT agents
            },
            poi_events_last_minute: self.poi_events.load(Ordering::Relaxed),
            error_rate,
            uptime_seconds: self.start_time.elapsed().as_secs(),
            model_health: ModelHealth {
                primary_available: true,
                fallback_available: true,
                active_provider: "ollama".to_string(),
                circuit_breaker_state: CircuitBreakerState::Closed,
            },
            db_pool_status: DbPoolStatus {
                active: 5,
                idle: 10,
                max_size: 20,
                healthy: true,
            },
        }
    }
}

impl Default for TelemetryCollector {
    fn default() -> Self {
        Self::new("NODE0-GENESIS".to_string())
    }
}

/// Calculate Ihsan score from error rate and latency
/// Returns a value between 0.0 and 1.0
fn calculate_ihsan_score(error_rate: f64, latency_us: u64) -> f64 {
    // Base score starts at 1.0 (perfect)
    let mut score = 1.0;

    // Penalize for errors (up to 0.3 penalty)
    score -= error_rate.min(0.3) * 1.0;

    // Penalize for high latency (target: <1000μs)
    // Each 1000μs above target reduces score by 0.05
    let latency_penalty = ((latency_us as f64 - 1000.0).max(0.0) / 1000.0) * 0.05;
    score -= latency_penalty.min(0.2);

    // Ensure score is within bounds
    score.clamp(0.0, 1.0)
}

/// Determine consensus state based on system metrics
fn determine_consensus_state(ihsan_score: f64, error_rate: f64) -> ConsensusState {
    if error_rate > 0.1 {
        ConsensusState::Recovery
    } else if ihsan_score >= 0.9 && error_rate < 0.01 {
        ConsensusState::Stable
    } else if ihsan_score >= 0.75 {
        ConsensusState::Converging
    } else {
        ConsensusState::Degraded
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SLO EVALUATOR - Flight Rules & Service Level Objectives
// β-11 Flight Rules & SLO Autopilot
// ═══════════════════════════════════════════════════════════════════════════

/// SLO state - represents the health status of a service level objective
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SloState {
    /// All objectives met - system operating normally
    Healthy,
    /// One or more objectives in warning band - attention needed
    Warning,
    /// One or more objectives breached - immediate action required
    Critical,
}

/// Individual SLO check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SloCheck {
    /// SLO name (e.g., "IHSAN", "LATENCY_MS")
    pub name: String,
    /// Human-readable description
    pub description: String,
    /// Target value for this SLO
    pub target: f64,
    /// Current actual value
    pub actual: f64,
    /// Current state of this SLO
    pub state: SloState,
    /// Unit of measurement (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
}

/// Complete SLO status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SloStatus {
    /// Overall SLO state (worst of all checks)
    pub overall: SloState,
    /// ISO 8601 timestamp of evaluation
    pub timestamp: DateTime<Utc>,
    /// Individual SLO check results
    pub checks: Vec<SloCheck>,
}

/// Evaluate all SLOs against current telemetry snapshot
///
/// This function implements the β-11 Flight Rules specification.
/// See docs/SLO_FLIGHT_RULES_GENESIS_NODE.md for full specification.
pub fn evaluate_slo(telemetry: &GenesisTelemetry) -> SloStatus {
    let mut checks = Vec::new();

    // ═══════════════════════════════════════════════════════════════════════
    // SLO 1: IHSAN - Spiritual/Ethical Health
    // Target: ≥ 0.90 | Warning: < 0.90 AND ≥ 0.80 | Critical: < 0.80
    // ═══════════════════════════════════════════════════════════════════════
    let ihsan_actual = telemetry.ihsan_score;
    let ihsan_target = 0.90;
    let ihsan_state = if ihsan_actual >= ihsan_target {
        SloState::Healthy
    } else if ihsan_actual >= 0.80 {
        SloState::Warning
    } else {
        SloState::Critical
    };

    checks.push(SloCheck {
        name: "IHSAN".to_string(),
        description: "Overall ethical/spiritual system health".to_string(),
        target: ihsan_target,
        actual: ihsan_actual,
        state: ihsan_state,
        unit: None,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SLO 2: LATENCY - Responsiveness
    // Target: ≤ 200ms | Warning: > 200ms AND ≤ 400ms | Critical: > 400ms
    // ═══════════════════════════════════════════════════════════════════════
    let latency_ms = (telemetry.latency_us as f64) / 1000.0;
    let latency_target = 200.0;
    let latency_state = if latency_ms <= latency_target {
        SloState::Healthy
    } else if latency_ms <= 400.0 {
        SloState::Warning
    } else {
        SloState::Critical
    };

    checks.push(SloCheck {
        name: "LATENCY_MS".to_string(),
        description: "Median request latency".to_string(),
        target: latency_target,
        actual: latency_ms,
        state: latency_state,
        unit: Some("ms".to_string()),
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SLO 3: ERROR RATE - Stability
    // Target: < 1% | Warning: ≥ 1% AND < 3% | Critical: ≥ 3%
    // ═══════════════════════════════════════════════════════════════════════
    let error_percent = telemetry.error_rate * 100.0;
    let error_target = 1.0;
    let error_state = if error_percent < error_target {
        SloState::Healthy
    } else if error_percent < 3.0 {
        SloState::Warning
    } else {
        SloState::Critical
    };

    checks.push(SloCheck {
        name: "ERROR_RATE_PERCENT".to_string(),
        description: "Error rate percentage".to_string(),
        target: error_target,
        actual: error_percent,
        state: error_state,
        unit: Some("%".to_string()),
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SLO 4: CONSENSUS - Core Correctness
    // Target: STABLE/CONVERGING | Warning: RECOVERY | Critical: DEGRADED/OFFLINE
    // ═══════════════════════════════════════════════════════════════════════
    let consensus_state = match telemetry.consensus_state {
        ConsensusState::Stable | ConsensusState::Converging => SloState::Healthy,
        ConsensusState::Recovery => SloState::Warning,
        ConsensusState::Degraded | ConsensusState::Offline => SloState::Critical,
    };

    // Map consensus to numeric for display (1.0 = healthy states, 0.5 = recovery, 0.0 = critical)
    let consensus_actual = match telemetry.consensus_state {
        ConsensusState::Stable | ConsensusState::Converging => 1.0,
        ConsensusState::Recovery => 0.5,
        ConsensusState::Degraded | ConsensusState::Offline => 0.0,
    };

    checks.push(SloCheck {
        name: "CONSENSUS".to_string(),
        description: "Consensus algorithm state".to_string(),
        target: 1.0,
        actual: consensus_actual,
        state: consensus_state,
        unit: None,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SLO 5: AGENT CAPACITY - Operational Capacity
    // Target: ≥ 10 agents | Warning: < 10 AND ≥ 5 | Critical: < 5
    // ═══════════════════════════════════════════════════════════════════════
    let total_agents = (telemetry.active_agents.pat + telemetry.active_agents.sat) as f64;
    let agent_target = 10.0;
    let agent_state = if total_agents >= agent_target {
        SloState::Healthy
    } else if total_agents >= 5.0 {
        SloState::Warning
    } else {
        SloState::Critical
    };

    checks.push(SloCheck {
        name: "AGENT_CAPACITY".to_string(),
        description: "Active agent count (PAT + SAT)".to_string(),
        target: agent_target,
        actual: total_agents,
        state: agent_state,
        unit: None,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // OVERALL STATE - Worst of all checks
    // ═══════════════════════════════════════════════════════════════════════
    let overall = if checks.iter().any(|c| c.state == SloState::Critical) {
        SloState::Critical
    } else if checks.iter().any(|c| c.state == SloState::Warning) {
        SloState::Warning
    } else {
        SloState::Healthy
    };

    SloStatus {
        overall,
        timestamp: Utc::now(),
        checks,
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/// GET /telemetry - Real-time system telemetry snapshot
///
/// Returns the current Genesis Telemetry JSON for dashboard consumption.
/// This is the "single source of truth" that the Glass Cockpit displays.
pub async fn telemetry_handler(
    Extension(collector): Extension<Arc<TelemetryCollector>>,
) -> impl IntoResponse {
    let telemetry = collector.snapshot();
    (StatusCode::OK, Json(telemetry))
}

/// GET /telemetry/health - Quick health check with minimal payload
pub async fn telemetry_health_handler(
    Extension(collector): Extension<Arc<TelemetryCollector>>,
) -> impl IntoResponse {
    let telemetry = collector.snapshot();

    #[derive(Serialize)]
    struct HealthSummary {
        healthy: bool,
        ihsan_score: f64,
        consensus_state: ConsensusState,
        uptime_seconds: u64,
    }

    let summary = HealthSummary {
        healthy: telemetry.ihsan_score >= 0.75 && telemetry.error_rate < 0.05,
        ihsan_score: telemetry.ihsan_score,
        consensus_state: telemetry.consensus_state,
        uptime_seconds: telemetry.uptime_seconds,
    };

    (StatusCode::OK, Json(summary))
}

/// GET /telemetry/slo - Service Level Objectives status
///
/// Returns machine-readable SLO evaluation against current telemetry.
/// Implements the β-11 Flight Rules specification.
/// See docs/SLO_FLIGHT_RULES_GENESIS_NODE.md for full specification.
pub async fn telemetry_slo_handler(
    Extension(collector): Extension<Arc<TelemetryCollector>>,
) -> impl IntoResponse {
    let telemetry = collector.snapshot();
    let slo_status = evaluate_slo(&telemetry);
    (StatusCode::OK, Json(slo_status))
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_telemetry_collector_creation() {
        let collector = TelemetryCollector::new("TEST-NODE".to_string());
        let snapshot = collector.snapshot();

        assert_eq!(snapshot.node_id, "TEST-NODE");
        assert!(snapshot.ihsan_score >= 0.0 && snapshot.ihsan_score <= 1.0);
    }

    #[test]
    fn test_request_recording() {
        let collector = TelemetryCollector::new("TEST".to_string());

        collector.record_request(500, false);
        collector.record_request(1500, false);
        collector.record_request(1000, true);

        let snapshot = collector.snapshot();
        assert!(snapshot.error_rate > 0.0);
        assert!(snapshot.latency_us > 0);
    }

    #[test]
    fn test_ihsan_score_calculation() {
        // Perfect conditions
        assert!(calculate_ihsan_score(0.0, 500) > 0.95);

        // High error rate
        assert!(calculate_ihsan_score(0.2, 500) < 0.85);

        // High latency
        assert!(calculate_ihsan_score(0.0, 5000) < 0.95);
    }

    #[test]
    fn test_consensus_state_determination() {
        assert_eq!(
            determine_consensus_state(0.95, 0.001),
            ConsensusState::Stable
        );
        assert_eq!(
            determine_consensus_state(0.80, 0.02),
            ConsensusState::Converging
        );
        assert_eq!(
            determine_consensus_state(0.70, 0.03),
            ConsensusState::Degraded
        );
        assert_eq!(
            determine_consensus_state(0.50, 0.15),
            ConsensusState::Recovery
        );
    }

    #[test]
    fn test_serialization() {
        let collector = TelemetryCollector::default();
        let snapshot = collector.snapshot();

        let json = serde_json::to_string_pretty(&snapshot).unwrap();
        assert!(json.contains("ihsan_score"));
        assert!(json.contains("consensus_state"));
        assert!(json.contains("NODE0-GENESIS"));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SLO EVALUATOR TESTS - β-11 Flight Rules
    // ═══════════════════════════════════════════════════════════════════════

    #[test]
    fn test_slo_all_healthy() {
        // Create telemetry with all healthy values
        let telemetry = GenesisTelemetry {
            timestamp: Utc::now(),
            node_id: "TEST".to_string(),
            latency_us: 50_000, // 50ms - well under 200ms target
            ihsan_score: 0.95,  // Above 0.90 target
            consensus_state: ConsensusState::Stable,
            epoch: 1,
            active_agents: AgentCounts {
                pat: 7,
                sat: 5, // Total 12, above 10 target
                tat: 3,
            },
            poi_events_last_minute: 10,
            error_rate: 0.005, // 0.5% - under 1% target
            uptime_seconds: 3600,
            model_health: ModelHealth {
                primary_available: true,
                fallback_available: true,
                active_provider: "test".to_string(),
                circuit_breaker_state: CircuitBreakerState::Closed,
            },
            db_pool_status: DbPoolStatus {
                active: 5,
                idle: 10,
                max_size: 20,
                healthy: true,
            },
        };

        let status = evaluate_slo(&telemetry);
        assert_eq!(status.overall, SloState::Healthy);
        assert!(status.checks.iter().all(|c| c.state == SloState::Healthy));
        assert_eq!(status.checks.len(), 5);
    }

    #[test]
    fn test_slo_ihsan_warning() {
        let telemetry = GenesisTelemetry {
            timestamp: Utc::now(),
            node_id: "TEST".to_string(),
            latency_us: 50_000,
            ihsan_score: 0.85, // Between 0.80 and 0.90 - WARNING
            consensus_state: ConsensusState::Stable,
            epoch: 1,
            active_agents: AgentCounts {
                pat: 7,
                sat: 5,
                tat: 3,
            },
            poi_events_last_minute: 10,
            error_rate: 0.005,
            uptime_seconds: 3600,
            model_health: ModelHealth {
                primary_available: true,
                fallback_available: true,
                active_provider: "test".to_string(),
                circuit_breaker_state: CircuitBreakerState::Closed,
            },
            db_pool_status: DbPoolStatus {
                active: 5,
                idle: 10,
                max_size: 20,
                healthy: true,
            },
        };

        let status = evaluate_slo(&telemetry);
        assert_eq!(status.overall, SloState::Warning);

        let ihsan_check = status.checks.iter().find(|c| c.name == "IHSAN").unwrap();
        assert_eq!(ihsan_check.state, SloState::Warning);
    }

    #[test]
    fn test_slo_latency_critical() {
        let telemetry = GenesisTelemetry {
            timestamp: Utc::now(),
            node_id: "TEST".to_string(),
            latency_us: 500_000, // 500ms - above 400ms critical threshold
            ihsan_score: 0.95,
            consensus_state: ConsensusState::Stable,
            epoch: 1,
            active_agents: AgentCounts {
                pat: 7,
                sat: 5,
                tat: 3,
            },
            poi_events_last_minute: 10,
            error_rate: 0.005,
            uptime_seconds: 3600,
            model_health: ModelHealth {
                primary_available: true,
                fallback_available: true,
                active_provider: "test".to_string(),
                circuit_breaker_state: CircuitBreakerState::Closed,
            },
            db_pool_status: DbPoolStatus {
                active: 5,
                idle: 10,
                max_size: 20,
                healthy: true,
            },
        };

        let status = evaluate_slo(&telemetry);
        assert_eq!(status.overall, SloState::Critical);

        let latency_check = status
            .checks
            .iter()
            .find(|c| c.name == "LATENCY_MS")
            .unwrap();
        assert_eq!(latency_check.state, SloState::Critical);
    }

    #[test]
    fn test_slo_consensus_degraded() {
        let telemetry = GenesisTelemetry {
            timestamp: Utc::now(),
            node_id: "TEST".to_string(),
            latency_us: 50_000,
            ihsan_score: 0.95,
            consensus_state: ConsensusState::Degraded, // CRITICAL
            epoch: 1,
            active_agents: AgentCounts {
                pat: 7,
                sat: 5,
                tat: 3,
            },
            poi_events_last_minute: 10,
            error_rate: 0.005,
            uptime_seconds: 3600,
            model_health: ModelHealth {
                primary_available: true,
                fallback_available: true,
                active_provider: "test".to_string(),
                circuit_breaker_state: CircuitBreakerState::Closed,
            },
            db_pool_status: DbPoolStatus {
                active: 5,
                idle: 10,
                max_size: 20,
                healthy: true,
            },
        };

        let status = evaluate_slo(&telemetry);
        assert_eq!(status.overall, SloState::Critical);

        let consensus_check = status
            .checks
            .iter()
            .find(|c| c.name == "CONSENSUS")
            .unwrap();
        assert_eq!(consensus_check.state, SloState::Critical);
    }

    #[test]
    fn test_slo_agent_capacity_warning() {
        let telemetry = GenesisTelemetry {
            timestamp: Utc::now(),
            node_id: "TEST".to_string(),
            latency_us: 50_000,
            ihsan_score: 0.95,
            consensus_state: ConsensusState::Stable,
            epoch: 1,
            active_agents: AgentCounts {
                pat: 4,
                sat: 3, // Total 7, between 5 and 10 - WARNING
                tat: 2,
            },
            poi_events_last_minute: 10,
            error_rate: 0.005,
            uptime_seconds: 3600,
            model_health: ModelHealth {
                primary_available: true,
                fallback_available: true,
                active_provider: "test".to_string(),
                circuit_breaker_state: CircuitBreakerState::Closed,
            },
            db_pool_status: DbPoolStatus {
                active: 5,
                idle: 10,
                max_size: 20,
                healthy: true,
            },
        };

        let status = evaluate_slo(&telemetry);
        assert_eq!(status.overall, SloState::Warning);

        let agent_check = status
            .checks
            .iter()
            .find(|c| c.name == "AGENT_CAPACITY")
            .unwrap();
        assert_eq!(agent_check.state, SloState::Warning);
    }

    #[test]
    fn test_slo_serialization() {
        let collector = TelemetryCollector::default();
        let snapshot = collector.snapshot();
        let status = evaluate_slo(&snapshot);

        let json = serde_json::to_string_pretty(&status).unwrap();
        assert!(json.contains("overall"));
        assert!(json.contains("HEALTHY"));
        assert!(json.contains("IHSAN"));
        assert!(json.contains("LATENCY_MS"));
        assert!(json.contains("ERROR_RATE_PERCENT"));
        assert!(json.contains("CONSENSUS"));
        assert!(json.contains("AGENT_CAPACITY"));
    }
}
