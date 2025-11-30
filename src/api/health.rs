// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - HEALTH CHECK AGGREGATOR                             ║
// ║  Production-grade health monitoring for all dependencies                  ║
// ║  Version: 2.0.0 - Elite Full-Stack Blueprint                              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝
//
// Implements Kubernetes-compatible health endpoints:
// - /health         - Comprehensive health with all dependency status
// - /health/live    - Liveness probe (is the process running?)
// - /health/ready   - Readiness probe (can we serve traffic?)
// - /health/startup - Startup probe (has initialization completed?)
//
// # SLO Integration
// Health checks respect SLO targets from ops/slo.yaml:
// - Database latency: P95 < 50ms
// - Response within 5000ms timeout

use async_trait::async_trait;
use axum::{extract::Extension, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH STATUS TYPES
// ═══════════════════════════════════════════════════════════════════════════

/// Overall service health status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    /// All systems operational
    Healthy,
    /// Some non-critical components degraded
    Degraded,
    /// Critical components failing
    Unhealthy,
}

impl HealthStatus {
    /// Combine two health statuses (worst case wins)
    pub fn combine(self, other: Self) -> Self {
        match (self, other) {
            (HealthStatus::Unhealthy, _) | (_, HealthStatus::Unhealthy) => HealthStatus::Unhealthy,
            (HealthStatus::Degraded, _) | (_, HealthStatus::Degraded) => HealthStatus::Degraded,
            _ => HealthStatus::Healthy,
        }
    }
}

/// Individual component health check result
#[derive(Debug, Clone, Serialize)]
pub struct ComponentHealth {
    /// Component name
    pub name: String,
    /// Health status
    pub status: HealthStatus,
    /// Latency in milliseconds (if applicable)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<f64>,
    /// Human-readable message
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    /// Last successful check timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_success: Option<u64>,
    /// Additional metadata
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub metadata: HashMap<String, String>,
}

impl ComponentHealth {
    pub fn healthy(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            status: HealthStatus::Healthy,
            latency_ms: None,
            message: None,
            last_success: Some(current_timestamp()),
            metadata: HashMap::new(),
        }
    }

    pub fn degraded(name: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            status: HealthStatus::Degraded,
            latency_ms: None,
            message: Some(message.into()),
            last_success: None,
            metadata: HashMap::new(),
        }
    }

    pub fn unhealthy(name: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            status: HealthStatus::Unhealthy,
            latency_ms: None,
            message: Some(message.into()),
            last_success: None,
            metadata: HashMap::new(),
        }
    }

    pub fn with_latency(mut self, latency_ms: f64) -> Self {
        self.latency_ms = Some(latency_ms);
        self
    }

    pub fn with_metadata(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.metadata.insert(key.into(), value.into());
        self
    }
}

/// Comprehensive health response
#[derive(Debug, Serialize)]
pub struct ComprehensiveHealthResponse {
    /// Overall status
    pub status: HealthStatus,
    /// Service version
    pub version: String,
    /// Uptime in seconds
    pub uptime_seconds: u64,
    /// Timestamp of this check
    pub timestamp: u64,
    /// Individual component health
    pub components: Vec<ComponentHealth>,
    /// SLO compliance indicators
    pub slo: SloCompliance,
}

/// SLO compliance summary
#[derive(Debug, Serialize)]
pub struct SloCompliance {
    /// Are we meeting availability SLO?
    pub availability: bool,
    /// Are we meeting latency SLO?
    pub latency: bool,
    /// Are we meeting error rate SLO?
    pub error_rate: bool,
    /// Error budget remaining (percentage)
    pub error_budget_remaining: f64,
}

impl Default for SloCompliance {
    fn default() -> Self {
        Self {
            availability: true,
            latency: true,
            error_rate: true,
            error_budget_remaining: 100.0,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK TRAIT (ORIGINAL - PRESERVED FOR COMPATIBILITY)
// ═══════════════════════════════════════════════════════════════════════════

#[async_trait]
pub trait HealthCheckBackend: Send + Sync {
    /// Check if the backend is healthy
    async fn is_healthy(&self) -> bool;

    /// Get detailed component health (optional)
    async fn component_health(&self) -> ComponentHealth {
        if self.is_healthy().await {
            ComponentHealth::healthy("backend")
        } else {
            ComponentHealth::unhealthy("backend", "Health check failed")
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE HEALTH CHECK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

pub struct DbHealthCheck {
    pool: Arc<PgPool>,
}

impl DbHealthCheck {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl HealthCheckBackend for DbHealthCheck {
    async fn is_healthy(&self) -> bool {
        // Try a simple query to verify database connectivity
        sqlx::query("SELECT 1")
            .execute(self.pool.as_ref())
            .await
            .is_ok()
    }

    async fn component_health(&self) -> ComponentHealth {
        let start = Instant::now();

        match sqlx::query_scalar::<_, i32>("SELECT 1")
            .fetch_one(self.pool.as_ref())
            .await
        {
            Ok(_) => {
                let latency = start.elapsed().as_secs_f64() * 1000.0;
                let mut health = ComponentHealth::healthy("postgresql").with_latency(latency);

                // Check against SLO (P95 < 50ms)
                if latency > 50.0 {
                    health.status = HealthStatus::Degraded;
                    health.message = Some(format!(
                        "Latency {}ms exceeds SLO target 50ms",
                        latency as u64
                    ));
                }

                // Add pool stats
                let pool_size = self.pool.size();
                let idle = self.pool.num_idle();
                health = health
                    .with_metadata("pool_size", pool_size.to_string())
                    .with_metadata("idle_connections", idle.to_string());

                health
            }
            Err(e) => ComponentHealth::unhealthy("postgresql", format!("Connection failed: {}", e)),
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK BACKENDS FOR TESTING
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
pub struct MockHealthyBackend;

#[cfg(test)]
pub struct MockUnhealthyBackend;

#[cfg(test)]
#[async_trait]
impl HealthCheckBackend for MockHealthyBackend {
    async fn is_healthy(&self) -> bool {
        true
    }
}

#[cfg(test)]
#[async_trait]
impl HealthCheckBackend for MockUnhealthyBackend {
    async fn is_healthy(&self) -> bool {
        false
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/// Simple health check handler (original - preserved for compatibility)
pub async fn health_check<H: HealthCheckBackend + ?Sized>(
    Extension(backend): Extension<Arc<H>>,
) -> impl IntoResponse {
    if backend.is_healthy().await {
        (StatusCode::OK, "OK")
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, "Service Unavailable")
    }
}

/// Liveness probe - is the process running?
///
/// Returns 200 if the process is alive and able to respond.
/// Failure triggers pod restart in Kubernetes.
pub async fn liveness_handler() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "alive",
            "timestamp": current_timestamp()
        })),
    )
}

/// Readiness probe - can we serve traffic?
///
/// Returns 200 if all critical dependencies are available.
/// Failure removes pod from service load balancer.
pub async fn readiness_handler<H: HealthCheckBackend + ?Sized>(
    Extension(backend): Extension<Arc<H>>,
) -> impl IntoResponse {
    if backend.is_healthy().await {
        (
            StatusCode::OK,
            Json(serde_json::json!({
                "status": "ready",
                "timestamp": current_timestamp()
            })),
        )
    } else {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "status": "not_ready",
                "reason": "dependency_unavailable",
                "timestamp": current_timestamp()
            })),
        )
    }
}

/// Comprehensive health check with detailed component status
pub async fn comprehensive_health_handler<H: HealthCheckBackend + ?Sized>(
    Extension(backend): Extension<Arc<H>>,
) -> impl IntoResponse {
    // Static start time (approximation - would use actual server start in production)
    static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();
    let start_time = START_TIME.get_or_init(Instant::now);

    let db_health = backend.component_health().await;

    // Collect all component health
    let components = vec![db_health.clone(), check_memory(), check_cpu()];

    // Calculate overall status
    let overall_status = components
        .iter()
        .fold(HealthStatus::Healthy, |acc, c| acc.combine(c.status));

    // Build SLO compliance
    let slo = SloCompliance {
        availability: overall_status != HealthStatus::Unhealthy,
        latency: components
            .iter()
            .filter_map(|c| c.latency_ms)
            .all(|l| l < 100.0),
        error_rate: true,
        error_budget_remaining: match overall_status {
            HealthStatus::Healthy => 100.0,
            HealthStatus::Degraded => 50.0,
            HealthStatus::Unhealthy => 0.0,
        },
    };

    let response = ComprehensiveHealthResponse {
        status: overall_status,
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: start_time.elapsed().as_secs(),
        timestamp: current_timestamp(),
        components,
        slo,
    };

    let status_code = match overall_status {
        HealthStatus::Healthy | HealthStatus::Degraded => StatusCode::OK,
        HealthStatus::Unhealthy => StatusCode::SERVICE_UNAVAILABLE,
    };

    (status_code, Json(response))
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/// Get current Unix timestamp in seconds
fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Check memory health (simplified)
fn check_memory() -> ComponentHealth {
    ComponentHealth::healthy("memory").with_metadata("status", "monitoring_enabled".to_string())
}

/// Check CPU health (simplified)
fn check_cpu() -> ComponentHealth {
    ComponentHealth::healthy("cpu").with_metadata("status", "monitoring_enabled".to_string())
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_status_combine() {
        assert_eq!(
            HealthStatus::Healthy.combine(HealthStatus::Healthy),
            HealthStatus::Healthy
        );
        assert_eq!(
            HealthStatus::Healthy.combine(HealthStatus::Degraded),
            HealthStatus::Degraded
        );
        assert_eq!(
            HealthStatus::Degraded.combine(HealthStatus::Unhealthy),
            HealthStatus::Unhealthy
        );
        assert_eq!(
            HealthStatus::Unhealthy.combine(HealthStatus::Healthy),
            HealthStatus::Unhealthy
        );
    }

    #[test]
    fn test_component_health_builders() {
        let healthy = ComponentHealth::healthy("test");
        assert_eq!(healthy.status, HealthStatus::Healthy);
        assert!(healthy.last_success.is_some());

        let degraded = ComponentHealth::degraded("test", "slow response");
        assert_eq!(degraded.status, HealthStatus::Degraded);
        assert_eq!(degraded.message, Some("slow response".to_string()));

        let unhealthy = ComponentHealth::unhealthy("test", "connection failed");
        assert_eq!(unhealthy.status, HealthStatus::Unhealthy);
    }

    #[test]
    fn test_component_health_with_latency() {
        let health = ComponentHealth::healthy("db")
            .with_latency(15.5)
            .with_metadata("pool_size", "10");

        assert_eq!(health.latency_ms, Some(15.5));
        assert_eq!(health.metadata.get("pool_size"), Some(&"10".to_string()));
    }

    #[test]
    fn test_slo_compliance_default() {
        let slo = SloCompliance::default();
        assert!(slo.availability);
        assert!(slo.latency);
        assert!(slo.error_rate);
        assert_eq!(slo.error_budget_remaining, 100.0);
    }

    #[tokio::test]
    async fn test_liveness_always_ok() {
        let response = liveness_handler().await;
        let (status, _) = response.into_response().into_parts();
        assert_eq!(status.status, StatusCode::OK);
    }
}
