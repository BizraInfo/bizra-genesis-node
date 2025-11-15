// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - API MIDDLEWARE MODULE                              ║
// ║  HTTP middleware for authentication, rate limiting, and request handling  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod jwt;

// Re-export commonly used middleware
pub use jwt::{jwt_auth, AuthenticatedUser, AuthError, Claims};
