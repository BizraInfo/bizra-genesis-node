// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTH MODULE                                        ║
// ║  Authentication and authorization API handlers                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod register;

// Re-export public API
pub use register::{
    register_handler,
    RegisterRequest,
    RegisterResponse,
    UserProgram,
};
