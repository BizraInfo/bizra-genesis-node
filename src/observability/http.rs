//! BIZRA Genesis Node - Observability HTTP Endpoints
//!
//! HTTP endpoints for metrics export and health checking.

use crate::observability::metrics::global_handle;
use axum::{http::StatusCode, response::IntoResponse};

/// Prometheus metrics endpoint handler
///
/// Returns current application metrics in Prometheus exposition format.
/// This endpoint is scraped by Prometheus for monitoring and alerting.
///
/// # Returns
/// HTTP response with metrics in Prometheus text format
///
/// # Example
/// ```rust
/// GET /metrics
/// ```
///
/// Content-Type: text/plain; version=0.0.4; charset=utf-8
///
/// # TYPE http_requests_total counter
/// # HELP http_requests_total Total number of HTTP requests
/// http_requests_total{method="GET",route="/api/v1/chat",status="200"} 42
/// # ...
///
/// # HTTP Response Codes
/// - 200: Metrics successfully rendered
/// - 500: Internal server error (metrics not initialized)
pub async fn metrics_handler() -> impl IntoResponse {
    let metrics = global_handle().render();
    (StatusCode::OK, metrics)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::observability::init_prometheus;

    #[tokio::test]
    #[ignore = "global state - run with --ignored"]
    async fn test_metrics_endpoint_response() {
        // Initialize metrics
        let _handle = init_prometheus().expect("Failed to initialize Prometheus metrics");

        // Simulate some metrics
        metrics::counter!("test_requests_total", 1, "method" => "GET", "route" => "/test");

        // Call metrics handler
        let response = metrics_handler().await.into_response();

        assert_eq!(response.status(), StatusCode::OK);

        tracing::info!("✅ Metrics endpoint handler verified");
    }
}
