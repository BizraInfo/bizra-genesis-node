// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PROMETHEUS METRICS MODULE                          ║
// ║  Observability metrics for Alpha-100 monitoring                          ║
// ║  Part of Alpha-100 Deployment Plan (Days 9-10/12)                        ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use prometheus::{
    Counter, CounterVec, Encoder, Gauge, GaugeVec, Histogram, HistogramOpts, HistogramVec, Opts,
    Registry, TextEncoder,
};
use std::sync::Arc;
use tracing::{error, info};

/// Prometheus metrics collector for BIZRA Genesis Node
#[derive(Clone)]
pub struct MetricsCollector {
    registry: Arc<Registry>,

    // HTTP Metrics
    pub http_requests_total: CounterVec,
    pub http_request_duration_seconds: HistogramVec,

    // Auth Metrics
    pub auth_logins_total: CounterVec,
    pub auth_refresh_total: CounterVec,
    pub auth_rate_limit_hits_total: Counter,

    // System Health Metrics
    pub node_health_status: GaugeVec,
    pub node_preflight_failures_total: Counter,
    pub node_canary_failures_total: Counter,

    // Alpha-100 Onboarding Metrics
    pub alpha_users_total: GaugeVec,
    pub alpha_node_clients_total: GaugeVec,

    // Database Metrics
    pub db_queries_total: Counter,
    pub db_query_duration_seconds: Histogram,
    pub db_connections_active: Gauge,

    // WebSocket Metrics
    pub websocket_connections_active: Gauge,
    pub websocket_messages_sent_total: Counter,
    pub websocket_messages_received_total: Counter,

    // Deployment Metrics
    pub deployment_timestamp: Gauge,
}

impl MetricsCollector {
    /// Create new metrics collector with Prometheus registry
    pub fn new() -> anyhow::Result<Self> {
        let registry = Arc::new(Registry::new());

        // HTTP Metrics
        let http_requests_total = CounterVec::new(
            Opts::new("bizra_http_requests_total", "Total number of HTTP requests"),
            &["method", "route", "status"],
        )?;

        let http_request_duration_seconds = HistogramVec::new(
            HistogramOpts::new(
                "bizra_http_request_duration_seconds",
                "HTTP request latency in seconds",
            )
            .buckets(vec![
                0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
            ]),
            &["route"],
        )?;

        // Auth Metrics
        let auth_logins_total = CounterVec::new(
            Opts::new("bizra_auth_logins_total", "Total number of login attempts"),
            &["result"],
        )?;

        let auth_refresh_total = CounterVec::new(
            Opts::new(
                "bizra_auth_refresh_total",
                "Total number of token refresh attempts",
            ),
            &["result"],
        )?;

        let auth_rate_limit_hits_total = Counter::new(
            "bizra_auth_rate_limit_hits_total",
            "Total number of rate limit hits",
        )?;

        // System Health Metrics
        let node_health_status = GaugeVec::new(
            Opts::new(
                "bizra_node_health_status",
                "Health status of system components (1=healthy, 0=unhealthy)",
            ),
            &["component"],
        )?;

        let node_preflight_failures_total = Counter::new(
            "bizra_node_preflight_failures_total",
            "Total number of pre-flight check failures",
        )?;

        let node_canary_failures_total = Counter::new(
            "bizra_node_canary_failures_total",
            "Total number of canary monitoring failures",
        )?;

        // Alpha-100 Onboarding Metrics
        let alpha_users_total = GaugeVec::new(
            Opts::new(
                "bizra_alpha_users_total",
                "Total number of Alpha-100 users by status",
            ),
            &["status"],
        )?;

        let alpha_node_clients_total = GaugeVec::new(
            Opts::new(
                "bizra_alpha_node_clients_total",
                "Total number of Alpha-100 node contributor clients",
            ),
            &["status"],
        )?;

        // Database Metrics
        let db_queries_total =
            Counter::new("bizra_db_queries_total", "Total number of database queries")?;

        let db_query_duration_seconds = Histogram::with_opts(
            HistogramOpts::new(
                "bizra_db_query_duration_seconds",
                "Database query latency in seconds",
            )
            .buckets(vec![
                0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5,
            ]),
        )?;

        let db_connections_active = Gauge::new(
            "bizra_db_connections_active",
            "Number of active database connections",
        )?;

        // WebSocket Metrics
        let websocket_connections_active = Gauge::new(
            "bizra_websocket_connections_active",
            "Number of active WebSocket connections",
        )?;

        let websocket_messages_sent_total = Counter::new(
            "bizra_websocket_messages_sent_total",
            "Total number of WebSocket messages sent",
        )?;

        let websocket_messages_received_total = Counter::new(
            "bizra_websocket_messages_received_total",
            "Total number of WebSocket messages received",
        )?;

        // Deployment Metrics
        let deployment_timestamp = Gauge::new(
            "bizra_deployment_timestamp",
            "Unix timestamp of last deployment",
        )?;

        // Register all metrics
        registry.register(Box::new(http_requests_total.clone()))?;
        registry.register(Box::new(http_request_duration_seconds.clone()))?;
        registry.register(Box::new(auth_logins_total.clone()))?;
        registry.register(Box::new(auth_refresh_total.clone()))?;
        registry.register(Box::new(auth_rate_limit_hits_total.clone()))?;
        registry.register(Box::new(node_health_status.clone()))?;
        registry.register(Box::new(node_preflight_failures_total.clone()))?;
        registry.register(Box::new(node_canary_failures_total.clone()))?;
        registry.register(Box::new(alpha_users_total.clone()))?;
        registry.register(Box::new(alpha_node_clients_total.clone()))?;
        registry.register(Box::new(db_queries_total.clone()))?;
        registry.register(Box::new(db_query_duration_seconds.clone()))?;
        registry.register(Box::new(db_connections_active.clone()))?;
        registry.register(Box::new(websocket_connections_active.clone()))?;
        registry.register(Box::new(websocket_messages_sent_total.clone()))?;
        registry.register(Box::new(websocket_messages_received_total.clone()))?;
        registry.register(Box::new(deployment_timestamp.clone()))?;

        info!("Prometheus metrics collector initialized");

        Ok(Self {
            registry,
            http_requests_total,
            http_request_duration_seconds,
            auth_logins_total,
            auth_refresh_total,
            auth_rate_limit_hits_total,
            node_health_status,
            node_preflight_failures_total,
            node_canary_failures_total,
            alpha_users_total,
            alpha_node_clients_total,
            db_queries_total,
            db_query_duration_seconds,
            db_connections_active,
            websocket_connections_active,
            websocket_messages_sent_total,
            websocket_messages_received_total,
            deployment_timestamp,
        })
    }

    /// Initialize default metric values
    pub fn initialize_defaults(&self) {
        // Initialize health status for all components
        self.node_health_status.with_label_values(&["db"]).set(0.0);
        self.node_health_status
            .with_label_values(&["redis"])
            .set(0.0);
        self.node_health_status.with_label_values(&["jwt"]).set(1.0);
        self.node_health_status
            .with_label_values(&["nginx"])
            .set(1.0);

        // Initialize Alpha-100 user statuses
        self.alpha_users_total
            .with_label_values(&["invited"])
            .set(0.0);
        self.alpha_users_total
            .with_label_values(&["registered"])
            .set(0.0);
        self.alpha_users_total
            .with_label_values(&["active"])
            .set(0.0);

        // Initialize node client statuses
        self.alpha_node_clients_total
            .with_label_values(&["online"])
            .set(0.0);
        self.alpha_node_clients_total
            .with_label_values(&["offline"])
            .set(0.0);

        // Set deployment timestamp
        self.deployment_timestamp
            .set(chrono::Utc::now().timestamp() as f64);

        info!("Default metric values initialized");
    }

    /// Export metrics in Prometheus text format
    pub fn export(&self) -> Result<String, prometheus::Error> {
        let encoder = TextEncoder::new();
        let metric_families = self.registry.gather();
        let mut buffer = Vec::new();

        encoder.encode(&metric_families, &mut buffer)?;

        String::from_utf8(buffer).map_err(|e| {
            error!("Failed to encode metrics: {}", e);
            prometheus::Error::Msg(format!("UTF-8 encoding error: {}", e))
        })
    }
}

/// Handler for /metrics endpoint
pub async fn metrics_handler(State(metrics): State<Arc<MetricsCollector>>) -> Response {
    match metrics.export() {
        Ok(body) => (
            StatusCode::OK,
            [("Content-Type", "text/plain; version=0.0.4")],
            body,
        )
            .into_response(),
        Err(e) => {
            error!("Failed to export metrics: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to export metrics: {}", e),
            )
                .into_response()
        }
    }
}

/// Create metrics router
pub fn metrics_router() -> Router<Arc<MetricsCollector>> {
    Router::new().route("/metrics", get(metrics_handler))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_collector_creation() {
        let collector = MetricsCollector::new();
        assert!(collector.is_ok(), "Metrics collector should be created");
    }

    #[test]
    fn test_metrics_export() {
        let collector = MetricsCollector::new().expect("Failed to create collector");
        collector.initialize_defaults();

        let exported = collector.export();
        assert!(exported.is_ok(), "Metrics should be exportable");

        let metrics_text = exported.unwrap();
        assert!(
            metrics_text.contains("bizra_http_requests_total"),
            "Exported metrics should contain HTTP metrics"
        );
        assert!(
            metrics_text.contains("bizra_auth_logins_total"),
            "Exported metrics should contain auth metrics"
        );
        assert!(
            metrics_text.contains("bizra_node_health_status"),
            "Exported metrics should contain health metrics"
        );
    }

    #[test]
    fn test_http_request_counter() {
        let collector = MetricsCollector::new().expect("Failed to create collector");

        // Increment counter
        collector
            .http_requests_total
            .with_label_values(&["GET", "/health", "200"])
            .inc();

        let exported = collector.export().unwrap();
        assert!(
            exported.contains("bizra_http_requests_total"),
            "Should contain HTTP request metric"
        );
    }

    #[test]
    fn test_auth_metrics() {
        let collector = MetricsCollector::new().expect("Failed to create collector");

        // Increment auth metrics
        collector
            .auth_logins_total
            .with_label_values(&["success"])
            .inc();
        collector
            .auth_refresh_total
            .with_label_values(&["success"])
            .inc();

        let exported = collector.export().unwrap();
        assert!(exported.contains("bizra_auth_logins_total"));
        assert!(exported.contains("bizra_auth_refresh_total"));
    }

    #[test]
    fn test_health_status_gauge() {
        let collector = MetricsCollector::new().expect("Failed to create collector");

        // Set health status
        collector
            .node_health_status
            .with_label_values(&["db"])
            .set(1.0);

        let exported = collector.export().unwrap();
        assert!(exported.contains("bizra_node_health_status"));
    }

    #[test]
    fn test_latency_histogram() {
        let collector = MetricsCollector::new().expect("Failed to create collector");

        // Observe latency
        collector
            .http_request_duration_seconds
            .with_label_values(&["/api/v1/auth/login"])
            .observe(0.025); // 25ms

        let exported = collector.export().unwrap();
        assert!(exported.contains("bizra_http_request_duration_seconds"));
    }
}
