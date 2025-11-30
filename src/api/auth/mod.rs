// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTH MODULE                                        ║
// ║  Authentication and authorization API handlers                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod login;
pub mod profile;
pub mod refresh;
pub mod register;
pub mod types;

// Re-export public API
pub use register::{register_handler, RegisterRequest, RegisterResponse, UserProgram};

pub use login::{login_handler, Claims, LoginRequest, LoginResponse};

pub use refresh::{refresh_handler, RefreshRequest, RefreshResponse};

pub use profile::{
    change_password_handler, get_profile_handler, update_profile_handler, PasswordChangeRequest,
    PasswordChangeResponse, ProfileResponse, ProfileUpdateRequest,
};
