// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - POI REWARDS API MODULE                             ║
// ║  Reward distribution endpoints and handlers                              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod handlers;
pub mod types;

use axum::{routing::{post, get}, Router};
use crate::AppState;

pub fn rewards_router() -> Router<AppState> {
    Router::new()
        .route(
            "/rewards/epochs",
            get(handlers::list_epochs_handler),
        )
        .route(
            "/rewards/epochs/:epoch_id/distribute",
            post(handlers::distribute_epoch_handler),
        )
        .route(
            "/rewards/epochs/:epoch_id/settlement/submit",
            post(handlers::submit_epoch_settlement_handler),
        )
        .route(
            "/rewards/epochs/:epoch_id/settlement/confirm",
            post(handlers::confirm_epoch_settlement_handler),
        )
        .route(
            "/rewards/epochs/:epoch_id/settlement",
            get(handlers::get_epoch_settlement_handler),
        )
}
