// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTH MODULE                                        ║
// ║  Authentication and authorization API handlers                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod login;
pub mod refresh;
pub mod register;

// Re-export public API
pub use register::{register_handler, RegisterRequest, RegisterResponse, UserProgram};

pub use login::{login_handler, Claims, LoginRequest, LoginResponse};

pub use refresh::{refresh_handler, RefreshRequest, RefreshResponse};
