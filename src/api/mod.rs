// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - API MODULE                                         ║
// ║  REST API routes and handlers for BIZRA Genesis Node                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

#[cfg(feature = "database")]
pub mod alpha_invites;
pub mod auth;
pub mod health;
pub mod metrics;
pub mod middleware;

use axum::{
    middleware as axum_middleware,
    routing::{get, post},
    Extension, Router,
};
use sqlx::PgPool;
use std::sync::Arc;
use tower::ServiceBuilder;

/// Create the complete API router with all routes and metrics
pub fn create_router(pool: Arc<PgPool>, metrics: Arc<metrics::MetricsCollector>) -> Router {
    // Create rate limiter configuration for auth routes
    let governor_conf = Box::leak(Box::new(
        tower_governor::governor::GovernorConfigBuilder::default()
            .per_second(2) // 2 per second burst
            .burst_size(5) // Allow up to 5 in quick succession
            .finish()
            .unwrap(),
    ));

    // Create auth routes with rate limiting
    let governor_limiter = tower_governor::GovernorLayer {
        config: governor_conf,
    };

    let auth_routes = Router::new()
        .route("/register", post(auth::register_handler))
        .route("/login", post(auth::login_handler))
        .route("/refresh", post(auth::refresh_handler))
        .layer(ServiceBuilder::new().layer(governor_limiter));

    // Create health check backend
    let health_backend: Arc<dyn health::HealthCheckBackend> =
        Arc::new(health::DbHealthCheck::new(pool.clone()));

    // Combine all route groups
    // Note: We use Extension for metrics and pool access in handlers
    // The metrics endpoint is stateless and accesses metrics via Extension
    #[allow(unused_mut)]
    let mut router = Router::new()
        .nest("/auth", auth_routes)
        .route(
            "/health",
            get(health::health_check::<dyn health::HealthCheckBackend>),
        )
        .route("/metrics", get(metrics::metrics_handler));

    // Add alpha invites routes if database feature is enabled
    #[cfg(feature = "database")]
    {
        router = router
            .route("/alpha/request", post(alpha_invites::request_alpha_access))
            .route("/alpha/accept/:invite_code", post(alpha_invites::accept_alpha_invite))
            .route("/alpha/requests", get(alpha_invites::list_alpha_requests));
    }

    router
        // Add metrics middleware to all routes (except /metrics itself to avoid recursion)
        .layer(axum_middleware::from_fn(middleware::metrics_middleware))
        .layer(Extension(metrics))
        .layer(Extension(pool))
        .layer(Extension(health_backend))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
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
