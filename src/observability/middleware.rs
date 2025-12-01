//! BIZRA Genesis Node - Observability Middleware
//!
//! Middleware for tracking HTTP request metrics.

use axum::{extract::Request, middleware::Next, response::Response};
use std::time::Instant;

/// Middleware to track HTTP request duration and count
pub async fn track_metrics(req: Request, next: Next) -> Response {
    let start = Instant::now();
    let path = req.uri().path().to_owned();
    let method = req.method().clone();

    let response = next.run(req).await;

    let latency = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    metrics::counter!(
        "http_requests_total", 1,
        "method" => method.to_string(),
        "route" => path.clone(),
        "status" => status
    );

    metrics::histogram!(
        "http_request_duration_seconds", latency,
        "method" => method.to_string(),
        "route" => path
    );

    response
}
