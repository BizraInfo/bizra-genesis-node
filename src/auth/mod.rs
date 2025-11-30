// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTHENTICATION MODULE                              ║
// ║  Authentication and authorization components                              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// Re-export claims and types
pub mod claims;
pub use claims::Claims;

// Future: login handlers, password hashing, etc.
// For now: minimal structure to support PoI integration
