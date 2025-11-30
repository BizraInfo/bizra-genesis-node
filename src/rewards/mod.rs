// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - POI REWARDS MODULE                                   ║
// ║  Epoch-based reward calculation and ledger settlement                      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

pub mod service;

#[cfg(feature = "database")]
pub mod settlement;

pub use service::{RewardError, RewardService};

#[cfg(feature = "database")]
pub use settlement::{SettlementBatch, SettlementError, SettlementService, SettlementStatus};
