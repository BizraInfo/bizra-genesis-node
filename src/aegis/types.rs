use crate::aegis::error::{AegisError, AegisResult};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// AgentId now supports Clone for parallel distribution
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AgentId {
    /// BLAKE3 hash of agent's genesis public key
    pub hash: [u8; 32],
    /// Agent level (1-99)
    pub level: u8,
    /// Agent type (Planner, Architect, etc.)
    pub agent_type: AgentType,
}

impl Default for AgentId {
    fn default() -> Self {
        Self::new_v4()
    }
}

impl std::fmt::Display for AgentId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Agent({}, {}, {:x})",
            self.level, self.agent_type as u8, self.hash[0]
        )
    }
}

impl AgentId {
    pub fn new_v4() -> Self {
        // Simplified for now - should use proper key generation
        let hash = blake3::hash(b"default_key");
        Self {
            hash: *hash.as_bytes(),
            level: 1,
            agent_type: AgentType::Planner,
        }
    }

    /// Create new AgentId with level-based routing optimization
    pub fn new_with_level(agent_type: AgentType, level: u8) -> Self {
        let hash = blake3::hash(format!("agent_{}_{}", agent_type as u8, level).as_bytes());
        Self {
            hash: *hash.as_bytes(),
            level,
            agent_type,
        }
    }

    /// Get routing priority for Φ-optimization (higher level = higher priority)
    pub fn routing_weight(&self) -> f64 {
        let phi_factor = (1.0 + f64::from(self.level)).ln();
        phi_factor * self.agent_type.base_weight()
    }
}

/// AgentType defines Φ-optimization parameters
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AgentType {
    Planner,
    Architect,
    Coder,
    Researcher,
    Debugger,
    Optimizer,
    Guardian,
}

impl AgentType {
    fn base_weight(&self) -> f64 {
        match self {
            AgentType::Guardian => 2.0,  // Highest priority for Ihsan Gate
            AgentType::Architect => 1.5, // Design decisions are critical
            AgentType::Planner => 1.3,
            AgentType::Optimizer => 1.2,
            AgentType::Coder => 1.0,
            AgentType::Researcher => 0.9,
            AgentType::Debugger => 0.8,
        }
    }
}

/// Arc-wrapped Agent for 1000+ parallel execution
#[derive(Clone)]
pub struct Agent {
    pub id: AgentId,
    pub state: Arc<tokio::sync::RwLock<AgentState>>,
    pub consensus_tx: Arc<tokio::sync::mpsc::Sender<ConsensusMessage>>,
}

impl Default for Agent {
    fn default() -> Self {
        let (tx, _) = tokio::sync::mpsc::channel(100);
        Self {
            id: AgentId::default(),
            state: Arc::new(tokio::sync::RwLock::new(AgentState)),
            consensus_tx: Arc::new(tx),
        }
    }
}

impl Agent {
    /// Spawn agent in parallel runtime with Φ-optimization
    pub async fn spawn_parallel(
        &self,
        task: Arc<Task>,
        phi_threshold: f64,
    ) -> AegisResult<ConsensusResult> {
        let agent_id = self.id; // Clone (Copy) - no move!
        let state = Arc::clone(&self.state);
        let tx = Arc::clone(&self.consensus_tx);

        // AgentId is now Copy-safe for 1000+ parallel spawns
        let result = tokio::spawn(async move {
            Self::execute_with_phi_optimization(agent_id, state, task, phi_threshold, tx).await
        })
        .await;

        match result {
            Ok(task_result) => task_result,
            Err(join_err) => Err(AegisError::TaskPanic(format!("{}", join_err)).into()),
        }
    }

    async fn execute_with_phi_optimization(
        _agent_id: AgentId, // Copy - no ownership transfer
        _state: Arc<tokio::sync::RwLock<AgentState>>,
        _task: Arc<Task>,
        _phi_threshold: f64,
        _tx: Arc<tokio::sync::mpsc::Sender<ConsensusMessage>>,
    ) -> AegisResult<ConsensusResult> {
        // Φ-optimization logic here...
        Ok(ConsensusResult::Success)
    }
}

// Placeholder types that need to be defined
#[derive(Debug)]
pub struct AgentState;

#[derive(Debug)]
pub struct ConsensusMessage;

#[derive(Debug)]
pub struct Task;

#[derive(Debug, Clone)]
pub enum ConsensusResult {
    Success,
    Failure(String),
}

pub use crate::types::ConsensusResult as BaseConsensusResult;
