// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - API MODULE                                         ║
// ║  REST API routes and handlers for BIZRA Genesis Node                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod alpha_invites;
pub mod auth;
pub mod health;
pub mod invites;
pub mod metrics;
pub mod middleware;
pub mod sape;
pub mod sat;
pub mod telemetry;

use axum::{
    routing::{get, post, put}, Router,
};
use redis::Client as RedisClient;
use sqlx::PgPool;
use std::sync::Arc;

// Import middleware from the main middleware module

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED APP STATE TYPE
// Ensures Router type consistency across all feature combinations
// ═══════════════════════════════════════════════════════════════════════════

/// Create the complete API router with all routes and metrics for Axum 0.7
///
/// # Simple Extension-based State Management
/// Provides database, metrics, and telemetry access via individual extensions.
/// Returns Router<()> for compatibility with axum::serve.
pub fn create_router(
    pool: Arc<PgPool>,
    redis_client: Arc<RedisClient>,
    metrics: Arc<metrics::MetricsCollector>,
    telemetry_collector: Arc<telemetry::TelemetryCollector>,
) -> Router<()> {
    // Create Redis-backed rate limiter for all API routes
    let rate_limiter_config = crate::middleware::rate_limit::RateLimiterConfig {
        requests_per_minute: 120, // 120 requests per minute
        requests_per_hour: 2000,  // 2000 requests per hour
        burst_capacity: 20,       // Allow bursts up to 20 requests
        enabled: true,
        ip_whitelist: vec![], // No IP whitelisting by default
    };

    let rate_limiter = Arc::new(crate::middleware::rate_limit::RateLimiter::new(
        (*redis_client).clone(),
        rate_limiter_config,
    ));

    // Create auth routes (these have their own rate limiting)
    let auth_routes = Router::new()
        .route("/register", post(auth::register_handler))
        .route("/login", post(auth::login_handler))
        .route("/refresh", post(auth::refresh_handler))
        // Protected profile routes - require authentication
        .route("/profile", get(auth::get_profile_handler))
        .route("/profile", put(auth::update_profile_handler))
        .route(
            "/profile/change-password",
            post(auth::change_password_handler),
        );

    // Create health check backend
    let health_backend: Arc<dyn health::HealthCheckBackend> =
        Arc::new(health::DbHealthCheck::new(pool.clone()));

    // Create alpha invite routes (existing system)
    let alpha_routes = Router::new()
        .route("/alpha/request", post(alpha_invites::request_alpha_access))
        .route("/alpha/invite/:code", post(alpha_invites::accept_alpha_invite));

    // Create invite management routes (manual admin creation)
    let invite_routes = Router::new()
        .route("/admin/invites", post(invites::create_invite_handler))
        .route("/invite/:code/validate", get(invites::validate_invite_handler))
        .route("/invite/:code/accept", post(invites::accept_invite_handler));

    // Combine all route groups
    let router = Router::new()
        .nest("/auth", auth_routes)
        .nest("/api", alpha_routes)
        .nest("/api", invite_routes)
        // Simple health route without generics
        .route("/health", get(|| async { "OK" }))
        .route("/metrics", get(metrics::metrics_handler));

    // Add extensions for middleware access
    router
        .layer(axum::middleware::from_fn(move |mut req: axum::http::Request<axum::body::Body>, next: axum::middleware::Next| {
            let pool = pool.clone();
            async move {
                req.extensions_mut().insert(pool);
                next.run(req).await
            }
        }))
        .layer(axum::middleware::from_fn(move |mut req: axum::http::Request<axum::body::Body>, next: axum::middleware::Next| {
            let metrics = metrics.clone();
            async move {
                req.extensions_mut().insert(metrics);
                next.run(req).await
            }
        }))
        .layer(axum::middleware::from_fn(move |mut req: axum::http::Request<axum::body::Body>, next: axum::middleware::Next| {
            let telemetry_collector = telemetry_collector.clone();
            async move {
                req.extensions_mut().insert(telemetry_collector);
                next.run(req).await
            }
        }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::Extension;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_health_check_healthy() {
        // Use mock healthy backend instead of real database
        let health_backend: Arc<dyn health::HealthCheckBackend> =
            Arc::new(health::MockHealthyBackend);

        let app = Router::new()
            .route(
                "/health",
                get(health::health_check::<dyn health::HealthCheckBackend>),
            )
            .layer(Extension(health_backend));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_health_check_unhealthy() {
        // Use mock unhealthy backend to test failure case
        let health_backend: Arc<dyn health::HealthCheckBackend> =
            Arc::new(health::MockUnhealthyBackend);

        let app = Router::new()
            .route(
                "/health",
                get(health::health_check::<dyn health::HealthCheckBackend>),
            )
            .layer(Extension(health_backend));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    }
}
