use crate::aegis::types::AgentId;
use std::sync::Arc;
use thiserror::Error;

#[derive(Error, Debug, Clone)]
pub enum AegisError {
    #[error("Agent {agent_id}: Consensus failure after {attempts} attempts")]
    ConsensusFailure { agent_id: AgentId, attempts: u32 },

    #[error("Agent {agent_id}: Byzantine fault detected from {faulty_agents:?}")]
    ByzantineFault {
        agent_id: AgentId,
        faulty_agents: Vec<AgentId>,
    },

    #[error("Ihsan Gate violation: {violation_type} - Score: {score:.2}%")]
    IhsanViolation { violation_type: String, score: f64 },

    #[error("Network partition detected: {partition_id}")]
    NetworkPartition { partition_id: String },

    #[error("Task execution timeout after {timeout_ms}ms")]
    TaskTimeout { timeout_ms: u64 },

    #[error("Agent ID collision: {agent_id}")]
    AgentIdCollision { agent_id: AgentId },

    #[error("Φ-optimization convergence failed: ΔΦ = {delta_phi}")]
    PhiConvergenceFailed { delta_phi: f64 },

    #[error("Parallel execution error in agent pool: {0}")]
    ParallelExecutionError(String),

    // --- NEW: Required From conversions for 1000+ agent scaling ---
    #[error("Agent communication error: {0}")]
    CommunicationError(String),

    #[error("Agent task panic: {0}")]
    TaskPanic(String),

    #[error("State synchronization error: {0}")]
    SyncError(String),
}

// --- NEW: Phantom-optimized error conversions ---
impl<T> From<tokio::sync::mpsc::error::SendError<T>> for AegisError
where
    T: std::fmt::Debug + Send + Sync + 'static,
{
    fn from(err: tokio::sync::mpsc::error::SendError<T>) -> Self {
        AegisError::CommunicationError(format!("{}", err))
    }
}

impl From<tokio::task::JoinError> for AegisError {
    fn from(err: tokio::task::JoinError) -> Self {
        AegisError::TaskPanic(format!("{}", err))
    }
}

// --- NEW: Atomic Result type for parallel agent operations ---
pub type AegisResult<T> = Result<T, Arc<AegisError>>;

impl AegisError {
    /// Create a shared error for broadcast to 1000+ agents
    pub fn into_shared(self) -> Arc<Self> {
        Arc::new(self)
    }

    /// Extract agent ID for Φ-optimization routing
    pub fn agent_id(&self) -> Option<AgentId> {
        match self {
            AegisError::ConsensusFailure { agent_id, .. } => Some(*agent_id),
            AegisError::ByzantineFault { agent_id, .. } => Some(*agent_id),
            AegisError::AgentIdCollision { agent_id } => Some(*agent_id),
            _ => None,
        }
    }
}
