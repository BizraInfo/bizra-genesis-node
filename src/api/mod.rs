// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - API MODULE                                         ║
// ║  REST API routes and handlers for BIZRA Genesis Node                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod auth;
pub mod health;
pub mod middleware;
pub mod metrics;

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
    let health_backend: Arc<dyn health::HealthCheckBackend> = Arc::new(health::DbHealthCheck::new(pool.clone()));

    // Combine all route groups with metrics
    Router::new()
        .nest("/auth", auth_routes)
        .route("/health", get(health::health_check::<dyn health::HealthCheckBackend>))
        .route("/metrics", get(metrics::metrics_handler))
        // Add metrics middleware to all routes (except /metrics itself to avoid recursion)
        .layer(axum_middleware::from_fn_with_state(
            metrics.clone(),
            middleware::metrics_middleware,
        ))
        .layer(Extension(pool))
        .layer(Extension(health_backend))
        .with_state(metrics)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{Request, StatusCode};
    use axum::body::Body;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_health_check_healthy() {
        // Use mock healthy backend instead of real database
        let health_backend: Arc<dyn health::HealthCheckBackend> = Arc::new(health::MockHealthyBackend);

        let app = Router::new()
            .route("/health", get(health::health_check::<dyn health::HealthCheckBackend>))
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
        let health_backend: Arc<dyn health::HealthCheckBackend> = Arc::new(health::MockUnhealthyBackend);

        let app = Router::new()
            .route("/health", get(health::health_check::<dyn health::HealthCheckBackend>))
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
