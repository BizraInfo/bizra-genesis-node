// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - API MIDDLEWARE MODULE                              ║
// ║  HTTP middleware for authentication, rate limiting, and request handling  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod jwt;
pub mod metrics_middleware;

// Re-export commonly used middleware
pub use jwt::{jwt_auth, AuthenticatedUser, AuthError, Claims};
pub use metrics_middleware::metrics_middleware;
