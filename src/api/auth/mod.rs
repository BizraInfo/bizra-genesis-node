// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTH MODULE                                        ║
// ║  Authentication and authorization API handlers                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod register;
pub mod login;
pub mod refresh;

// Re-export public API
pub use register::{
    register_handler,
    RegisterRequest,
    RegisterResponse,
    UserProgram,
};

pub use login::{
    login_handler,
    LoginRequest,
    LoginResponse,
    Claims,
};

pub use refresh::{
    refresh_handler,
    RefreshRequest,
    RefreshResponse,
};
