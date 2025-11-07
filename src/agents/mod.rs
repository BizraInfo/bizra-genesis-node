// src/agents/mod.rs
// Professional Agent System for BIZRA Genesis Node
// Implements PAT (Personal Agentic Team) and SAT (System Agentic Team)

pub mod pat;
pub mod sat;
pub mod a2a;

// Re-export team metrics
pub use pat::TeamMetrics;

use crate::types::{Task, Candidate};
use crate::ai_backend::AIBackend;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::error::Error;

/// Agent role defines the specialization and capabilities
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AgentRole {
    // Personal Agentic Team (PAT)
    Planner,
    Researcher,
    Coder,
    Evaluator,
    Ethicist,
    Publisher,
    Integrator,

    // System Agentic Team (SAT) - for Day 5
    InfrastructureManager,
    PerformanceMonitor,
    SecurityAuditor,
    BackupCoordinator,
    ResourceAllocator,
}

impl AgentRole {
    /// Get human-readable name
    pub fn name(&self) -> &'static str {
        match self {
            AgentRole::Planner => "Strategic Planner",
            AgentRole::Researcher => "Research Assistant",
            AgentRole::Coder => "Code Generator",
            AgentRole::Evaluator => "Quality Evaluator",
            AgentRole::Ethicist => "Ethics Guardian",
            AgentRole::Publisher => "Publication Manager",
            AgentRole::Integrator => "System Integrator",
            AgentRole::InfrastructureManager => "Infrastructure Manager",
            AgentRole::PerformanceMonitor => "Performance Monitor",
            AgentRole::SecurityAuditor => "Security Auditor",
            AgentRole::BackupCoordinator => "Backup Coordinator",
            AgentRole::ResourceAllocator => "Resource Allocator",
        }
    }

    /// Get agent description
    pub fn description(&self) -> &'static str {
        match self {
            AgentRole::Planner => "Creates strategic plans and breaks down complex tasks",
            AgentRole::Researcher => "Gathers information and provides comprehensive analysis",
            AgentRole::Coder => "Generates high-quality code implementations",
            AgentRole::Evaluator => "Evaluates solutions for quality and correctness",
            AgentRole::Ethicist => "Ensures ethical compliance and Islamic principles (Ihsān)",
            AgentRole::Publisher => "Formats and publishes results for various audiences",
            AgentRole::Integrator => "Integrates multi-agent outputs into cohesive solutions",
            AgentRole::InfrastructureManager => "Manages system infrastructure and resources",
            AgentRole::PerformanceMonitor => "Monitors and optimizes system performance",
            AgentRole::SecurityAuditor => "Audits security and ensures compliance",
            AgentRole::BackupCoordinator => "Manages backups and disaster recovery",
            AgentRole::ResourceAllocator => "Allocates computational resources efficiently",
        }
    }

    /// Check if agent is part of PAT (Personal Agentic Team)
    pub fn is_pat(&self) -> bool {
        matches!(self,
            AgentRole::Planner |
            AgentRole::Researcher |
            AgentRole::Coder |
            AgentRole::Evaluator |
            AgentRole::Ethicist |
            AgentRole::Publisher |
            AgentRole::Integrator
        )
    }

    /// Check if agent is part of SAT (System Agentic Team)
    pub fn is_sat(&self) -> bool {
        matches!(self,
            AgentRole::InfrastructureManager |
            AgentRole::PerformanceMonitor |
            AgentRole::SecurityAuditor |
            AgentRole::BackupCoordinator |
            AgentRole::ResourceAllocator
        )
    }
}

/// Agent state tracks current operational status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentState {
    Idle,
    Processing { task_id: String },
    WaitingForDependency { agent: AgentRole },
    Error { message: String },
}

/// Agent metadata and performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMetrics {
    pub tasks_completed: usize,
    pub tasks_failed: usize,
    pub avg_latency_ms: f32,
    pub avg_confidence: f32,
    pub total_tokens_used: usize,
}

impl Default for AgentMetrics {
    fn default() -> Self {
        Self {
            tasks_completed: 0,
            tasks_failed: 0,
            avg_latency_ms: 0.0,
            avg_confidence: 0.0,
            total_tokens_used: 0,
        }
    }
}

impl AgentMetrics {
    pub fn success_rate(&self) -> f32 {
        let total = self.tasks_completed + self.tasks_failed;
        if total == 0 {
            return 0.0;
        }
        self.tasks_completed as f32 / total as f32
    }

    pub fn update_completion(&mut self, latency_ms: u32, confidence: f32, tokens: usize) {
        let total = self.tasks_completed as f32;
        self.avg_latency_ms = (self.avg_latency_ms * total + latency_ms as f32) / (total + 1.0);
        self.avg_confidence = (self.avg_confidence * total + confidence) / (total + 1.0);
        self.total_tokens_used += tokens;
        self.tasks_completed += 1;
    }

    pub fn update_failure(&mut self) {
        self.tasks_failed += 1;
    }
}

/// Agent trait defining core capabilities
#[async_trait]
pub trait Agent: Send + Sync {
    /// Get agent role
    fn role(&self) -> AgentRole;

    /// Get current agent state
    fn state(&self) -> AgentState;

    /// Get agent performance metrics
    fn metrics(&self) -> AgentMetrics;

    /// Process a task using the agent's specialization
    async fn process(&mut self, task: &Task) -> Result<AgentResponse, Box<dyn Error + Send + Sync>>;

    /// Check if agent can handle this task
    fn can_handle(&self, task: &Task) -> bool;

    /// Get agent's system prompt for MOE
    fn system_prompt(&self) -> String;
}

/// Agent response containing results and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub agent: AgentRole,
    pub task_id: String,
    pub result: serde_json::Value,
    pub confidence: f32,
    pub reasoning: String,
    pub candidates: Vec<Candidate>,
    pub latency_ms: u32,
    pub ihsan_score: f32,
}

/// Base agent implementation with MOE backend
pub struct BaseAgent {
    role: AgentRole,
    state: AgentState,
    metrics: AgentMetrics,
    ai_backend: Arc<dyn AIBackend>,
}

impl BaseAgent {
    /// Create new base agent with MOE backend
    pub fn new(role: AgentRole, ai_backend: Arc<dyn AIBackend>) -> Self {
        Self {
            role,
            state: AgentState::Idle,
            metrics: AgentMetrics::default(),
            ai_backend,
        }
    }

    /// Generate agent-specific task prompt
    pub fn generate_prompt(&self, task: &Task) -> String {
        let role_context = self.role.description();
        let system_prompt = self.get_system_prompt();

        format!(
            "{}\n\nRole Context: {}\n\nTask: {}",
            system_prompt,
            role_context,
            Self::task_description(task)
        )
    }

    /// Get role-specific system prompt
    fn get_system_prompt(&self) -> String {
        match self.role {
            AgentRole::Planner =>
                "You are a Strategic Planner agent. Create comprehensive plans with clear steps, dependencies, and success criteria.",
            AgentRole::Researcher =>
                "You are a Research Assistant agent. Provide thorough analysis with citations, evidence, and comprehensive coverage.",
            AgentRole::Coder =>
                "You are a Code Generator agent. Generate clean, efficient, well-documented code following best practices.",
            AgentRole::Evaluator =>
                "You are a Quality Evaluator agent. Assess solutions objectively with specific criteria and constructive feedback.",
            AgentRole::Ethicist =>
                "You are an Ethics Guardian agent. Ensure compliance with Islamic principles (Ihsān), ethical standards, and human benefit.",
            AgentRole::Publisher =>
                "You are a Publication Manager agent. Format and present results clearly for target audiences.",
            AgentRole::Integrator =>
                "You are a System Integrator agent. Synthesize multiple outputs into coherent, integrated solutions.",
            _ => "You are a specialized agent in the BIZRA ecosystem.",
        }.to_string()
    }

    /// Convert task to natural language description
    fn task_description(task: &Task) -> String {
        if let Some(examples) = &task.examples {
            format!("Complete the task with examples: {:?}", examples)
        } else {
            "Complete the assigned task with high quality and attention to detail.".to_string()
        }
    }

    /// Process task using MOE backend
    pub async fn process_with_moe(&mut self, task: &Task) -> Result<AgentResponse, Box<dyn Error + Send + Sync>> {
        let task_id = uuid::Uuid::new_v4().to_string();
        self.state = AgentState::Processing { task_id: task_id.clone() };

        let start = std::time::Instant::now();

        // Generate agent-specific prompt
        let prompt_task = Task {
            examples: Some(vec![serde_json::json!({
                "prompt": self.generate_prompt(task),
                "role": self.role.name(),
            })]),
        };

        // Use MOE backend to generate candidates
        match self.ai_backend.generate_candidates(&prompt_task, &format!("agent-{:?}", self.role), 3).await {
            Ok(candidates) => {
                let latency_ms = start.elapsed().as_millis() as u32;

                // Select best candidate based on Ihsān score
                let best = candidates.iter()
                    .max_by(|a, b| a.scores.ihsan.partial_cmp(&b.scores.ihsan).unwrap())
                    .cloned()
                    .unwrap_or_else(|| candidates[0].clone());

                let ihsan_score = best.scores.ihsan;
                let confidence = best.scores.accuracy;

                // Update metrics
                self.metrics.update_completion(latency_ms, confidence, 1000); // Approximate token count
                self.state = AgentState::Idle;

                Ok(AgentResponse {
                    agent: self.role.clone(),
                    task_id,
                    result: best.json.clone(),
                    confidence,
                    reasoning: format!("Processed by {} using MOE backend", self.role.name()),
                    candidates,
                    latency_ms,
                    ihsan_score,
                })
            }
            Err(e) => {
                self.metrics.update_failure();
                self.state = AgentState::Error { message: e.to_string() };
                Err(format!("Agent {:?} processing failed: {}", self.role, e).into())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_role_properties() {
        let planner = AgentRole::Planner;
        assert_eq!(planner.name(), "Strategic Planner");
        assert!(planner.is_pat());
        assert!(!planner.is_sat());

        let infra = AgentRole::InfrastructureManager;
        assert!(infra.is_sat());
        assert!(!infra.is_pat());
    }

    #[test]
    fn test_agent_metrics() {
        let mut metrics = AgentMetrics::default();
        assert_eq!(metrics.success_rate(), 0.0);

        metrics.update_completion(100, 0.95, 500);
        assert_eq!(metrics.tasks_completed, 1);
        assert_eq!(metrics.avg_latency_ms, 100.0);
        assert_eq!(metrics.avg_confidence, 0.95);

        metrics.update_completion(200, 0.85, 500);
        assert_eq!(metrics.tasks_completed, 2);
        assert_eq!(metrics.avg_latency_ms, 150.0);
        assert_eq!(metrics.avg_confidence, 0.90);
        assert_eq!(metrics.success_rate(), 1.0);

        metrics.update_failure();
        assert_eq!(metrics.tasks_failed, 1);
        assert_eq!(metrics.success_rate(), 2.0 / 3.0);
    }
}
