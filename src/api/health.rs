// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - HEALTH CHECK MODULE                                ║
// ║  Dependency injection pattern for health check testing                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use async_trait::async_trait;
use axum::{
    extract::Extension,
    http::StatusCode,
    response::IntoResponse,
};
use sqlx::PgPool;
use std::sync::Arc;

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK TRAIT
// ═══════════════════════════════════════════════════════════════════════════

#[async_trait]
pub trait HealthCheckBackend: Send + Sync {
    /// Check if the backend is healthy
    async fn is_healthy(&self) -> bool;
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
// HEALTH CHECK HANDLER
// ═══════════════════════════════════════════════════════════════════════════

pub async fn health_check<H: HealthCheckBackend + ?Sized>(
    Extension(backend): Extension<Arc<H>>,
) -> impl IntoResponse {
    if backend.is_healthy().await {
        (StatusCode::OK, "OK")
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, "Service Unavailable")
    }
}
