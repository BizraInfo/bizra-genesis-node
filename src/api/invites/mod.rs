// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - INVITE SYSTEM API                                 ║
// ║  Manual invite code generation and acceptance for alpha users           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod handlers;
pub mod models;
pub mod routes;

// Re-export for API module
pub use handlers::{accept_invite_handler, create_invite_handler, validate_invite_handler};
pub use models::{
    CreateInviteRequest, CreateInviteResponse, InviteAcceptanceRequest, InviteEntry, InviteStatus,
    InviteValidationResponse,
};
pub use routes::invite_routes;
