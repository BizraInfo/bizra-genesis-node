// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTH TYPES                                         ║
// ║  Shared types and structures for authentication                         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use serde::{Deserialize, Serialize};

// ═══════════════════════════════════════════════════════════════════════════
// JWT CLAIMS
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // Subject (user ID)
    pub email: String,      // User email
    pub program: String,    // User program (alpha-100, general)
    pub role: String,       // User role (admin, user) for RBAC
    pub token_version: i32, // Token version for revocation
    pub exp: i64,           // Expiration time (Unix timestamp)
    pub iat: i64,           // Issued at (Unix timestamp)
    pub jti: String,        // JWT ID (unique token identifier)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshClaims {
    pub sub: String,          // Subject (user ID)
    pub token_family: String, // Token family for refresh rotation
    pub exp: i64,             // Expiration time (Unix timestamp)
    pub iat: i64,             // Issued at (Unix timestamp)
}
