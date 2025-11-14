//! # AEGIS - Advanced Elite Guardian Intelligence System
//!
//! Multi-agent consensus system supporting 1000+ parallel agents with sacred mathematics.
//! Implements Byzantine fault tolerance and Proof-of-Impact consensus.

pub mod error;
pub mod types;
pub mod task;
pub mod consensus;

// Re-export main types for convenience
pub use error::{AegisError, AegisResult};
pub use types::{Agent, AgentId, AgentType};
pub use task::Task;
pub use consensus::engine::{ConsensusEngine, WeightedSelectiveConsensus};
