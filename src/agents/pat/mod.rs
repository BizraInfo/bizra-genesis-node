// src/agents/pat/mod.rs
// Personal Agentic Team (PAT) - General Purpose Personal Agents
// Adaptable for any domain: software, business, creative, research, etc.

pub mod planner;
pub mod researcher;
pub mod coder;
pub mod evaluator;
pub mod ethicist;
pub mod publisher;
pub mod integrator;

use crate::agents::{Agent, AgentRole, AgentResponse};
use crate::types::Task;
use crate::ai_backend::AIBackend;
use std::sync::Arc;
use std::error::Error;

// Re-export individual agents
pub use planner::PlannerAgent;
pub use researcher::ResearcherAgent;
pub use coder::CoderAgent;
pub use evaluator::EvaluatorAgent;
pub use ethicist::EthicistAgent;
pub use publisher::PublisherAgent;
pub use integrator::IntegratorAgent;

/// Personal Agentic Team (PAT) Manager
/// Coordinates all 7 personal agents for comprehensive task handling
pub struct PATManager {
    planner: PlannerAgent,
    researcher: ResearcherAgent,
    coder: CoderAgent,
    evaluator: EvaluatorAgent,
    ethicist: EthicistAgent,
    publisher: PublisherAgent,
    integrator: IntegratorAgent,
}

impl PATManager {
    /// Create new PAT manager with shared AI backend
    pub fn new(ai_backend: Arc<dyn AIBackend>) -> Self {
        Self {
            planner: PlannerAgent::new(ai_backend.clone()),
            researcher: ResearcherAgent::new(ai_backend.clone()),
            coder: CoderAgent::new(ai_backend.clone()),
            evaluator: EvaluatorAgent::new(ai_backend.clone()),
            ethicist: EthicistAgent::new(ai_backend.clone()),
            publisher: PublisherAgent::new(ai_backend.clone()),
            integrator: IntegratorAgent::new(ai_backend),
        }
    }

    /// Execute complete PAT workflow for any task
    pub async fn execute_full_workflow(&mut self, task: &Task) -> Result<AgentResponse, Box<dyn Error + Send + Sync>> {
        tracing::info!("🚀 Starting PAT full workflow");

        // Phase 1: Planning
        tracing::info!("📋 Phase 1: Strategic Planning");
        let _plan = self.planner.process(task).await?;

        // Phase 2: Research
        tracing::info!("🔍 Phase 2: Research & Analysis");
        let _research = self.researcher.process(task).await?;

        // Phase 3: Creation/Coding
        tracing::info!("⚙️ Phase 3: Solution Creation");
        let _solution = self.coder.process(task).await?;

        // Phase 4: Evaluation
        tracing::info!("✅ Phase 4: Quality Evaluation");
        let _evaluation = self.evaluator.process(task).await?;

        // Phase 5: Ethics Check
        tracing::info!("🛡️ Phase 5: Ethics & Compliance");
        let _ethics = self.ethicist.process(task).await?;

        // Phase 6: Publishing
        tracing::info!("📢 Phase 6: Publication & Formatting");
        let _publication = self.publisher.process(task).await?;

        // Phase 7: Integration
        tracing::info!("🔗 Phase 7: Final Integration");
        let final_result = self.integrator.process(task).await?;

        tracing::info!("✨ PAT workflow complete - Ihsān: {:.2}%", final_result.ihsan_score * 100.0);

        Ok(final_result)
    }

    /// Execute parallel workflow (all agents work simultaneously)
    pub async fn execute_parallel_workflow(&mut self, task: &Task) -> Result<Vec<AgentResponse>, Box<dyn Error + Send + Sync>> {
        tracing::info!("⚡ Starting PAT parallel workflow");

        let results = tokio::join!(
            self.planner.process(task),
            self.researcher.process(task),
            self.coder.process(task),
            self.evaluator.process(task),
            self.ethicist.process(task),
            self.publisher.process(task),
        );

        let mut responses = Vec::new();

        if let Ok(r) = results.0 { responses.push(r); }
        if let Ok(r) = results.1 { responses.push(r); }
        if let Ok(r) = results.2 { responses.push(r); }
        if let Ok(r) = results.3 { responses.push(r); }
        if let Ok(r) = results.4 { responses.push(r); }
        if let Ok(r) = results.5 { responses.push(r); }

        // Use integrator to synthesize all parallel results
        let integrated = self.integrator.process(task).await?;
        responses.push(integrated);

        Ok(responses)
    }

    /// Execute selective workflow (only specific agents)
    pub async fn execute_selective_workflow(
        &mut self,
        task: &Task,
        roles: Vec<AgentRole>,
    ) -> Result<Vec<AgentResponse>, Box<dyn Error + Send + Sync>> {
        tracing::info!("🎯 Starting PAT selective workflow with {} agents", roles.len());

        let mut responses = Vec::new();

        for role in roles {
            let response = match role {
                AgentRole::Planner => self.planner.process(task).await?,
                AgentRole::Researcher => self.researcher.process(task).await?,
                AgentRole::Coder => self.coder.process(task).await?,
                AgentRole::Evaluator => self.evaluator.process(task).await?,
                AgentRole::Ethicist => self.ethicist.process(task).await?,
                AgentRole::Publisher => self.publisher.process(task).await?,
                AgentRole::Integrator => self.integrator.process(task).await?,
                _ => continue,
            };

            responses.push(response);
        }

        Ok(responses)
    }

    /// Get agent by role
    pub fn get_agent_mut(&mut self, role: AgentRole) -> Option<&mut dyn Agent> {
        match role {
            AgentRole::Planner => Some(&mut self.planner),
            AgentRole::Researcher => Some(&mut self.researcher),
            AgentRole::Coder => Some(&mut self.coder),
            AgentRole::Evaluator => Some(&mut self.evaluator),
            AgentRole::Ethicist => Some(&mut self.ethicist),
            AgentRole::Publisher => Some(&mut self.publisher),
            AgentRole::Integrator => Some(&mut self.integrator),
            _ => None,
        }
    }

    /// Get collective metrics for all agents
    pub fn get_team_metrics(&self) -> TeamMetrics {
        let agents_metrics = vec![
            self.planner.metrics(),
            self.researcher.metrics(),
            self.coder.metrics(),
            self.evaluator.metrics(),
            self.ethicist.metrics(),
            self.publisher.metrics(),
            self.integrator.metrics(),
        ];

        let total_completed: usize = agents_metrics.iter().map(|m| m.tasks_completed).sum();
        let total_failed: usize = agents_metrics.iter().map(|m| m.tasks_failed).sum();
        let avg_latency: f32 = agents_metrics.iter().map(|m| m.avg_latency_ms).sum::<f32>() / 7.0;
        let avg_confidence: f32 = agents_metrics.iter().map(|m| m.avg_confidence).sum::<f32>() / 7.0;
        let total_tokens: usize = agents_metrics.iter().map(|m| m.total_tokens_used).sum();

        TeamMetrics {
            total_tasks_completed: total_completed,
            total_tasks_failed: total_failed,
            avg_latency_ms: avg_latency,
            avg_confidence,
            total_tokens_used: total_tokens,
            agents: 7,
        }
    }
}

/// Team-level metrics
#[derive(Debug, Clone)]
pub struct TeamMetrics {
    pub total_tasks_completed: usize,
    pub total_tasks_failed: usize,
    pub avg_latency_ms: f32,
    pub avg_confidence: f32,
    pub total_tokens_used: usize,
    pub agents: usize,
}

impl TeamMetrics {
    pub fn success_rate(&self) -> f32 {
        let total = self.total_tasks_completed + self.total_tasks_failed;
        if total == 0 {
            return 0.0;
        }
        self.total_tasks_completed as f32 / total as f32
    }

    pub fn avg_tasks_per_agent(&self) -> f32 {
        if self.agents == 0 {
            return 0.0;
        }
        (self.total_tasks_completed + self.total_tasks_failed) as f32 / self.agents as f32
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai_backend::SimulatedBackend;

    #[tokio::test]
    async fn test_pat_manager_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let manager = PATManager::new(backend);

        assert_eq!(manager.planner.role(), AgentRole::Planner);
        assert_eq!(manager.researcher.role(), AgentRole::Researcher);
    }

    #[tokio::test]
    async fn test_team_metrics() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let manager = PATManager::new(backend);

        let metrics = manager.get_team_metrics();
        assert_eq!(metrics.agents, 7);
        assert_eq!(metrics.total_tasks_completed, 0);
    }

    #[tokio::test]
    async fn test_selective_workflow() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let mut manager = PATManager::new(backend);

        let task = Task::example();
        let roles = vec![AgentRole::Planner, AgentRole::Researcher];

        let results = manager.execute_selective_workflow(&task, roles).await;
        assert!(results.is_ok());

        let responses = results.unwrap();
        assert_eq!(responses.len(), 2);
    }
}
