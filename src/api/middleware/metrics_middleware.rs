// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - HTTP METRICS MIDDLEWARE                            ║
// ║  Automatic HTTP request/response metrics collection                      ║
// ║  Part of Alpha-100 Deployment Plan (Day 11/12)                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use std::time::Instant;

use crate::api::metrics::MetricsCollector;

/// HTTP metrics middleware
///
/// Automatically captures:
/// - Request count by method, route, and status code
/// - Request latency distribution by route
/// - Auth-specific metrics (login, refresh)
pub async fn metrics_middleware(
    State(metrics): State<Arc<MetricsCollector>>,
    request: Request,
    next: Next,
) -> Response {
    let start = Instant::now();

    // Extract request metadata
    let method = request.method().to_string();
    let path = request.uri().path().to_string();

    // Normalize route for metrics (avoid high cardinality)
    let route = normalize_route(&path);

    // Process request
    let response = next.run(request).await;

    // Calculate latency
    let latency = start.elapsed();
    let latency_secs = latency.as_secs_f64();

    // Extract status code
    let status = response.status();
    let status_code = status.as_u16().to_string();

    // Record HTTP metrics
    metrics
        .http_requests_total
        .with_label_values(&[&method, &route, &status_code])
        .inc();

    metrics
        .http_request_duration_seconds
        .with_label_values(&[&route])
        .observe(latency_secs);

    // Record auth-specific metrics
    if route == "/auth/login" {
        let result = if status.is_success() {
            "success"
        } else {
            "failure"
        };
        metrics.auth_logins_total.with_label_values(&[result]).inc();
    } else if route == "/auth/refresh" {
        let result = if status.is_success() {
            "success"
        } else {
            "failure"
        };
        metrics
            .auth_refresh_total
            .with_label_values(&[result])
            .inc();
    }

    // Record rate limit hits (429 status)
    if status == StatusCode::TOO_MANY_REQUESTS {
        metrics.auth_rate_limit_hits_total.inc();
    }

    response
}

/// Normalize route to avoid high cardinality in metrics
///
/// Examples:
/// - `/users/123` -> `/users/:id`
/// - `/api/v1/auth/login` -> `/auth/login`
/// - `/health` -> `/health`
fn normalize_route(path: &str) -> String {
    // Remove trailing slashes
    let path = path.trim_end_matches('/');

    // Handle empty path
    if path.is_empty() {
        return "/".to_string();
    }

    // Common route patterns
    if path == "/health" {
        return "/health".to_string();
    }

    if path == "/metrics" {
        return "/metrics".to_string();
    }

    // API v1 routes
    if path.starts_with("/api/v1/") {
        let without_prefix = path.strip_prefix("/api/v1/").unwrap_or(path);
        return normalize_api_route(without_prefix);
    }

    // Auth routes
    if path.starts_with("/auth/") {
        return normalize_auth_route(path);
    }

    // Fallback: return as-is but limit to first 3 segments
    let segments: Vec<&str> = path.split('/').take(4).collect();
    segments.join("/")
}

/// Normalize auth routes
fn normalize_auth_route(path: &str) -> String {
    if path.contains("/login") {
        "/auth/login".to_string()
    } else if path.contains("/register") {
        "/auth/register".to_string()
    } else if path.contains("/refresh") {
        "/auth/refresh".to_string()
    } else {
        "/auth/*".to_string()
    }
}

/// Normalize API routes
fn normalize_api_route(path: &str) -> String {
    let segments: Vec<&str> = path.split('/').collect();

    match segments.as_slice() {
        ["auth", "login"] => "/auth/login".to_string(),
        ["auth", "register"] => "/auth/register".to_string(),
        ["auth", "refresh"] => "/auth/refresh".to_string(),
        ["users", _id] => "/users/:id".to_string(),
        ["agents", _id] => "/agents/:id".to_string(),
        ["synthesis", _id] => "/synthesis/:id".to_string(),
        _ => {
            // Return first 2 segments for other routes
            if segments.len() >= 2 {
                format!("/{}/{}", segments[0], segments[1])
            } else if !segments.is_empty() {
                format!("/{}", segments[0])
            } else {
                "/api/*".to_string()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_route_health() {
        assert_eq!(normalize_route("/health"), "/health");
        assert_eq!(normalize_route("/health/"), "/health");
    }

    #[test]
    fn test_normalize_route_metrics() {
        assert_eq!(normalize_route("/metrics"), "/metrics");
    }

    #[test]
    fn test_normalize_route_auth() {
        assert_eq!(normalize_route("/auth/login"), "/auth/login");
        assert_eq!(normalize_route("/auth/register"), "/auth/register");
        assert_eq!(normalize_route("/auth/refresh"), "/auth/refresh");
    }

    #[test]
    fn test_normalize_route_api_v1() {
        assert_eq!(normalize_route("/api/v1/auth/login"), "/auth/login");
        assert_eq!(normalize_route("/api/v1/users/123"), "/users/:id");
        assert_eq!(normalize_route("/api/v1/agents/abc-def"), "/agents/:id");
    }

    #[test]
    fn test_normalize_route_parameterized() {
        assert_eq!(normalize_api_route("users/123"), "/users/:id");
        assert_eq!(normalize_api_route("agents/xyz"), "/agents/:id");
        assert_eq!(normalize_api_route("synthesis/abc"), "/synthesis/:id");
    }

    #[test]
    fn test_normalize_route_empty() {
        assert_eq!(normalize_route(""), "/");
        assert_eq!(normalize_route("/"), "/");
    }

    #[test]
    fn test_normalize_route_long_paths() {
        // Long paths should be limited to avoid cardinality explosion
        let long_path = "/api/v1/users/123/orders/456/items/789";
        let normalized = normalize_route(long_path);
        assert!(
            normalized.len() < long_path.len(),
            "Long paths should be normalized"
        );
    }
}
