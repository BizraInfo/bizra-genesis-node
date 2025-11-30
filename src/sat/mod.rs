//! ╔═══════════════════════════════════════════════════════════════════════════╗
//! ║  SAT-LAB v0.1 MODULE                                                       ║
//! ║  BIZRA LAB's Internal Marketing Team - SAT Enterprise Services           ║
//! ╚═══════════════════════════════════════════════════════════════════════════╝

// Domain types and business logic
pub mod lab;
pub mod orchestrator;

// Re-exports for convenience
pub use lab::*;
pub use orchestrator::SatLabOrchestrator;
