//! # AEGIS Consensus Engine
//!
//! Byzantine fault tolerant consensus for 1000+ parallel agents.

pub mod engine;

// Re-export main types
pub use engine::{ConsensusEngine, WeightedSelectiveConsensus};
