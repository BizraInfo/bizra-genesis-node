// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - INVITE SYSTEM ROUTES                              ║
// ║  Route definitions for invite management API                            ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use axum::{
    routing::{get, post},
    Router,
};
use sqlx::PgPool;
use std::sync::Arc;

use super::handlers::*;

/// Create invite system routes
pub fn invite_routes() -> Router<Arc<PgPool>> {
    Router::new()
        // Admin endpoint to create invites
        .route("/admin/invites", post(create_invite_handler))
        // Public endpoints for invite validation and acceptance
        .route("/invite/:code/validate", get(validate_invite_handler))
        .route("/invite/:code/accept", post(accept_invite_handler))
}
