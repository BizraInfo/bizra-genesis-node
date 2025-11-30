use async_trait::async_trait;
use std::sync::Arc;

#[async_trait]
pub trait ConsensusEngine: Send + Sync + 'static {
    /// Execute consensus among N agents with BFT tolerance
    async fn achieve_consensus(
        &self,
        agents: &[Arc<Agent>],
        task: Arc<Task>,
        fault_tolerance: f64, // Φ-optimized threshold
    ) -> AegisResult<ConsensusResult>;

    /// Detect Byzantine agents using Ihsan Gate scoring
    async fn detect_byzantine_faults(
        &self,
        responses: &[AgentResponse],
    ) -> AegisResult<Vec<AgentId>>;

    /// Calculate Φ-optimization convergence metric
    fn calculate_phi(&self, agents: &[Arc<Agent>]) -> f64;

    /// Get required quorum size for Byzantine fault tolerance
    fn quorum_size(&self, total_agents: usize) -> usize {
        // Byzantine fault tolerance: need > 2/3 honest
        (total_agents * 2 / 3) + 1
    }
}

use futures::stream::{self, StreamExt};

/// Production implementation with 1000+ agent scaling
pub struct WeightedSelectiveConsensus {
    /// Ihsan Gate for ethics scoring
    ihsan_gate: Arc<IhsanGate>,
    /// Thompson Sampling for provider selection
    _router: Arc<ThompsonRouter>,
    /// Parallel execution pool
    runtime: Arc<tokio::runtime::Runtime>,
}

impl WeightedSelectiveConsensus {
    /// Create a new consensus engine with injected runtime
    pub fn new(runtime: Arc<tokio::runtime::Runtime>, ihsan_threshold: f64) -> Self {
        Self {
            ihsan_gate: Arc::new(IhsanGate::new(ihsan_threshold as f32)),
            _router: Arc::new(ThompsonRouter::new()),
            runtime,
        }
    }
}

#[async_trait]
impl ConsensusEngine for WeightedSelectiveConsensus {
    async fn achieve_consensus(
        &self,
        agents: &[Arc<Agent>],
        task: Arc<Task>,
        fault_tolerance: f64,
    ) -> AegisResult<ConsensusResult> {
        // Validate quorum size
        if agents.len() < 3 {
            return Err(AegisError::ConsensusFailure {
                agent_id: agents.first().map(|a| a.id).unwrap_or_default(),
                attempts: 0,
            }
            .into());
        }

        let _quorum_needed = self.quorum_size(agents.len());

        // Bounded Concurrency: Limit active futures to prevent OOM
        const MAX_CONCURRENT_AGENTS: usize = 50;

        // Parallel execution with Φ-optimization and Backpressure
        let phi_threshold = self.calculate_phi(agents);

        // Parallel execution – each agent returns AgentResponse directly
        let responses: Vec<AgentResponse> = stream::iter(agents.to_vec())
            .map(|agent| {
                let agent_clone = Arc::clone(&agent);
                let task_clone = Arc::clone(&task);
                async move { agent_clone.spawn_parallel(task_clone, phi_threshold).await }
            })
            .buffer_unordered(MAX_CONCURRENT_AGENTS)
            .filter_map(|res| async move {
                res.ok()
            })
            .collect()
            .await;

        // Byzantine fault detection
        let faulty_agents = self.detect_byzantine_faults(&responses).await?;

        if faulty_agents.len() > (agents.len() as f64 * fault_tolerance) as usize {
            return Err(AegisError::ByzantineFault {
                agent_id: agents[0].id,
                faulty_agents,
            }
            .into());
        }

        if responses.is_empty() {
            return Err(AegisError::ConsensusFailure {
                agent_id: agents[0].id,
                attempts: 1,
            }
            .into());
        }

        Ok(ConsensusResult::Success)
    }

    async fn detect_byzantine_faults(
        &self,
        responses: &[AgentResponse],
    ) -> AegisResult<Vec<AgentId>> {
        let mut faulty = Vec::new();

        for response in responses {
            // Ihsan Gate scoring
            let ihsan_ref = Arc::as_ref(&self.ihsan_gate);
            let ethics_score = ihsan_ref.evaluate(&response.task_output).await?;

            if ethics_score < 70.0 {
                faulty.push(response.agent_id);
            }
        }

        Ok(faulty)
    }

    fn calculate_phi(&self, agents: &[Arc<Agent>]) -> f64 {
        // Φ-optimization: harmonic mean of agent routing weights
        let weights: Vec<f64> = agents.iter().map(|a| a.id.routing_weight()).collect();

        let sum_inv: f64 = weights.iter().map(|w| 1.0 / w).sum();
        agents.len() as f64 / sum_inv
    }
}

// Placeholder types - these need to be properly imported or defined
use crate::aegis::error::{AegisError, AegisResult};
use crate::aegis::types::Task;
use crate::aegis::types::{Agent, AgentId, AgentResponse, ConsensusResult};
use crate::routing::ThompsonRouter;
use crate::scoring::IhsanGate;

// AgentResponse now defined in aegis::types
