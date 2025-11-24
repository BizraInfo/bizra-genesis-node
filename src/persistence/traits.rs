// synthesis_orchestrator/src/persistence/traits.rs
// Repository trait abstractions for testability and dependency injection

use crate::persistence::DbResult;
use crate::trust::{ProofOfImpact, RunReceipt};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde_json::Value;

/// Trust receipt repository trait
///
/// Provides abstraction for testing and multiple persistence implementations
#[async_trait]
pub trait ReceiptRepositoryTrait: Send + Sync {
    /// Inserts a new trust receipt
    async fn insert(&self, receipt: &RunReceipt) -> DbResult<()>;

    /// Retrieves a receipt by run_id
    async fn get(&self, run_id: &str) -> DbResult<Option<RunReceipt>>;

    /// Retrieves all receipts for a specific model
    async fn get_by_model(&self, model: &str, limit: i64) -> DbResult<Vec<RunReceipt>>;

    /// Retrieves recent receipts
    async fn get_recent(&self, limit: i64) -> DbResult<Vec<RunReceipt>>;

    /// Counts total receipts
    async fn count(&self) -> DbResult<i64>;
}

/// Router state repository trait
///
/// Manages Thompson Sampling Beta distribution parameters
#[async_trait]
pub trait RouterRepositoryTrait: Send + Sync {
    /// Updates router state for a model
    async fn update_state(&self, model: &str, alpha: f64, beta: f64) -> DbResult<()>;

    /// Retrieves router state for a model
    async fn get_state(&self, model: &str) -> DbResult<Option<RouterState>>;

    /// Retrieves all router states
    async fn get_all_states(&self) -> DbResult<Vec<RouterState>>;

    /// Increments success count (alpha)
    async fn increment_success(&self, model: &str) -> DbResult<()>;

    /// Increments failure count (beta)
    async fn increment_failure(&self, model: &str) -> DbResult<()>;

    /// Initializes a new model with default prior
    async fn initialize_model(&self, model: &str, model_type: Option<&str>) -> DbResult<()>;
}

/// Router state model
#[derive(Debug, Clone)]
pub struct RouterState {
    pub model_name: String,
    pub alpha: f64,
    pub beta: f64,
    pub win_rate: f64,
    pub total_trials: i32,
    pub enabled: bool,
}

/// Consensus run repository trait
///
/// Tracks consensus execution metrics
#[async_trait]
pub trait ConsensusRepositoryTrait: Send + Sync {
    /// Inserts a new consensus run
    async fn insert(&self, run: &ConsensusRun) -> DbResult<()>;

    /// Retrieves a consensus run by run_id
    async fn get(&self, run_id: &str) -> DbResult<Option<ConsensusRun>>;

    /// Retrieves recent consensus runs
    async fn get_recent(&self, limit: i64) -> DbResult<Vec<ConsensusRun>>;

    /// Retrieves average latency for a model
    async fn avg_latency_by_model(&self, model: &str) -> DbResult<Option<f64>>;
}

/// Consensus run model
#[derive(Debug, Clone)]
pub struct ConsensusRun {
    pub run_id: String,
    pub input_hash: String,
    pub winner_model: String,
    pub candidates_count: i32,
    pub consensus_latency_ms: i32,
    pub total_latency_ms: i32,
    pub candidates: Value,
    pub created_at: DateTime<Utc>,
}

/// Agent state repository trait
///
/// Manages AEGIS multi-agent system state
#[async_trait]
pub trait AgentRepositoryTrait: Send + Sync {
    /// Updates agent state
    async fn update_state(&self, agent: &AgentState) -> DbResult<()>;

    /// Retrieves agent state by agent_id
    async fn get(&self, agent_id: &str) -> DbResult<Option<AgentState>>;

    /// Retrieves all agents of a specific type
    async fn get_by_type(&self, agent_type: &str) -> DbResult<Vec<AgentState>>;

    /// Retrieves all healthy agents
    async fn get_healthy(&self) -> DbResult<Vec<AgentState>>;

    /// Updates agent health status
    async fn update_health(&self, agent_id: &str, status: &str) -> DbResult<()>;
}

/// Agent state model
#[derive(Debug, Clone)]
pub struct AgentState {
    pub agent_id: String,
    pub agent_type: String,
    pub agent_name: String,
    pub agent_role: String,
    pub state: Value,
    pub health_status: String,
    pub tasks_completed: i32,
    pub tasks_failed: i32,
    pub last_active: DateTime<Utc>,
}

/// Proof-of-Impact repository trait
///
/// Manages PoI analytics and reporting
#[async_trait]
pub trait ProofOfImpactRepositoryTrait: Send + Sync {
    /// Inserts a new PoI record
    async fn insert(&self, poi: &ProofOfImpactRecord) -> DbResult<()>;

    /// Retrieves PoI records for a receipt
    async fn get_by_receipt(&self, receipt_id: &str) -> DbResult<Vec<ProofOfImpactRecord>>;

    /// Retrieves average PoI score for a model
    async fn avg_score_by_model(&self, model: &str) -> DbResult<Option<f64>>;

    /// Retrieves recent high-scoring PoI records
    async fn get_top_scores(&self, limit: i64) -> DbResult<Vec<ProofOfImpactRecord>>;
}

/// Proof-of-Impact record model
#[derive(Debug, Clone)]
pub struct ProofOfImpactRecord {
    pub receipt_id: String,
    pub model_name: String,
    pub quality: f32,
    pub utility: f32,
    pub trust: f32,
    pub fairness: f32,
    pub diversity: f32,
    pub created_at: DateTime<Utc>,
}

impl From<&ProofOfImpact> for ProofOfImpactRecord {
    fn from(poi: &ProofOfImpact) -> Self {
        Self {
            receipt_id: String::new(), // Set by caller
            model_name: String::new(), // Set by caller
            quality: poi.quality,
            utility: poi.utility,
            trust: poi.trust,
            fairness: poi.fairness,
            diversity: poi.diversity,
            created_at: Utc::now(),
        }
    }
}
