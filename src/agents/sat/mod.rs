// src/agents/sat/mod.rs
// System Agentic Team (SAT) - Software Development & Infrastructure Focus
// Ensures system sustainability, performance, security, and operational excellence

pub mod infrastructure;
pub mod performance;
pub mod security;
pub mod backup;
pub mod resources;

use crate::agents::{Agent, AgentRole, AgentResponse};
use crate::types::Task;
use crate::ai_backend::AIBackend;
use std::sync::Arc;
use std::error::Error;

// Re-export individual agents
pub use infrastructure::InfrastructureManagerAgent;
pub use performance::PerformanceMonitorAgent;
pub use security::SecurityAuditorAgent;
pub use backup::BackupCoordinatorAgent;
pub use resources::ResourceAllocatorAgent;

/// System Agentic Team (SAT) Manager
/// Coordinates 5 system agents for software sustainability and operations
pub struct SATManager {
    infrastructure: InfrastructureManagerAgent,
    performance: PerformanceMonitorAgent,
    security: SecurityAuditorAgent,
    backup: BackupCoordinatorAgent,
    resources: ResourceAllocatorAgent,
}

impl SATManager {
    /// Create new SAT manager with shared AI backend
    pub fn new(ai_backend: Arc<dyn AIBackend>) -> Self {
        Self {
            infrastructure: InfrastructureManagerAgent::new(ai_backend.clone()),
            performance: PerformanceMonitorAgent::new(ai_backend.clone()),
            security: SecurityAuditorAgent::new(ai_backend.clone()),
            backup: BackupCoordinatorAgent::new(ai_backend.clone()),
            resources: ResourceAllocatorAgent::new(ai_backend),
        }
    }

    /// Execute complete SAT workflow for system health
    pub async fn execute_full_workflow(&mut self, task: &Task) -> Result<AgentResponse, Box<dyn Error + Send + Sync>> {
        tracing::info!("🔧 Starting SAT full workflow");

        // Phase 1: Infrastructure Assessment
        tracing::info!("🏗️ Phase 1: Infrastructure Analysis");
        let _infra = self.infrastructure.process(task).await?;

        // Phase 2: Performance Analysis
        tracing::info!("📊 Phase 2: Performance Monitoring");
        let _perf = self.performance.process(task).await?;

        // Phase 3: Security Audit
        tracing::info!("🔒 Phase 3: Security Audit");
        let _sec = self.security.process(task).await?;

        // Phase 4: Backup Validation
        tracing::info!("💾 Phase 4: Backup & Recovery");
        let _backup = self.backup.process(task).await?;

        // Phase 5: Resource Optimization
        tracing::info!("⚡ Phase 5: Resource Allocation");
        let final_result = self.resources.process(task).await?;

        tracing::info!("✨ SAT workflow complete - System Health: {:.2}%", final_result.ihsan_score * 100.0);

        Ok(final_result)
    }

    /// Execute parallel system health check
    pub async fn execute_parallel_health_check(&mut self, task: &Task) -> Result<Vec<AgentResponse>, Box<dyn Error + Send + Sync>> {
        tracing::info!("⚡ Starting SAT parallel health check");

        let results = tokio::join!(
            self.infrastructure.process(task),
            self.performance.process(task),
            self.security.process(task),
            self.backup.process(task),
            self.resources.process(task),
        );

        let mut responses = Vec::new();

        if let Ok(r) = results.0 { responses.push(r); }
        if let Ok(r) = results.1 { responses.push(r); }
        if let Ok(r) = results.2 { responses.push(r); }
        if let Ok(r) = results.3 { responses.push(r); }
        if let Ok(r) = results.4 { responses.push(r); }

        Ok(responses)
    }

    /// Execute selective workflow (only specific agents)
    pub async fn execute_selective_workflow(
        &mut self,
        task: &Task,
        roles: Vec<AgentRole>,
    ) -> Result<Vec<AgentResponse>, Box<dyn Error + Send + Sync>> {
        tracing::info!("🎯 Starting SAT selective workflow with {} agents", roles.len());

        let mut responses = Vec::new();

        for role in roles {
            let response = match role {
                AgentRole::InfrastructureManager => self.infrastructure.process(task).await?,
                AgentRole::PerformanceMonitor => self.performance.process(task).await?,
                AgentRole::SecurityAuditor => self.security.process(task).await?,
                AgentRole::BackupCoordinator => self.backup.process(task).await?,
                AgentRole::ResourceAllocator => self.resources.process(task).await?,
                _ => continue,
            };

            responses.push(response);
        }

        Ok(responses)
    }

    /// Get agent by role
    pub fn get_agent_mut(&mut self, role: AgentRole) -> Option<&mut dyn Agent> {
        match role {
            AgentRole::InfrastructureManager => Some(&mut self.infrastructure),
            AgentRole::PerformanceMonitor => Some(&mut self.performance),
            AgentRole::SecurityAuditor => Some(&mut self.security),
            AgentRole::BackupCoordinator => Some(&mut self.backup),
            AgentRole::ResourceAllocator => Some(&mut self.resources),
            _ => None,
        }
    }

    /// Get collective metrics for all SAT agents
    pub fn get_team_metrics(&self) -> SATMetrics {
        let agents_metrics = [self.infrastructure.metrics(),
            self.performance.metrics(),
            self.security.metrics(),
            self.backup.metrics(),
            self.resources.metrics()];

        let total_completed: usize = agents_metrics.iter().map(|m| m.tasks_completed).sum();
        let total_failed: usize = agents_metrics.iter().map(|m| m.tasks_failed).sum();
        let avg_latency: f32 = agents_metrics.iter().map(|m| m.avg_latency_ms).sum::<f32>() / 5.0;
        let avg_confidence: f32 = agents_metrics.iter().map(|m| m.avg_confidence).sum::<f32>() / 5.0;
        let total_tokens: usize = agents_metrics.iter().map(|m| m.total_tokens_used).sum();

        SATMetrics {
            total_tasks_completed: total_completed,
            total_tasks_failed: total_failed,
            avg_latency_ms: avg_latency,
            avg_confidence,
            total_tokens_used: total_tokens,
            agents: 5,
        }
    }

    /// Generate comprehensive system health report
    pub async fn generate_health_report(&mut self, task: &Task) -> Result<SystemHealthReport, Box<dyn Error + Send + Sync>> {
        let responses = self.execute_parallel_health_check(task).await?;

        let mut health_scores = std::collections::HashMap::new();
        let mut issues = Vec::new();
        let recommendations = Vec::new();

        for response in &responses {
            health_scores.insert(
                response.agent.name().to_string(),
                response.ihsan_score,
            );

            // Extract issues and recommendations from response
            if response.ihsan_score < 0.85 {
                issues.push(format!("{}: Below threshold ({:.1}%)",
                    response.agent.name(),
                    response.ihsan_score * 100.0
                ));
            }
        }

        let overall_health = responses.iter().map(|r| r.ihsan_score).sum::<f32>() / responses.len() as f32;

        Ok(SystemHealthReport {
            overall_health,
            health_scores,
            critical_issues: issues,
            recommendations,
            timestamp: std::time::SystemTime::now(),
        })
    }
}

/// SAT team-level metrics
#[derive(Debug, Clone)]
pub struct SATMetrics {
    pub total_tasks_completed: usize,
    pub total_tasks_failed: usize,
    pub avg_latency_ms: f32,
    pub avg_confidence: f32,
    pub total_tokens_used: usize,
    pub agents: usize,
}

impl SATMetrics {
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

/// System health report
#[derive(Debug, Clone)]
pub struct SystemHealthReport {
    pub overall_health: f32,
    pub health_scores: std::collections::HashMap<String, f32>,
    pub critical_issues: Vec<String>,
    pub recommendations: Vec<String>,
    pub timestamp: std::time::SystemTime,
}

impl SystemHealthReport {
    pub fn is_healthy(&self) -> bool {
        self.overall_health >= 0.85 && self.critical_issues.is_empty()
    }

    pub fn status(&self) -> &'static str {
        if self.overall_health >= 0.95 {
            "EXCELLENT"
        } else if self.overall_health >= 0.85 {
            "GOOD"
        } else if self.overall_health >= 0.70 {
            "WARNING"
        } else {
            "CRITICAL"
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai_backend::SimulatedBackend;

    #[tokio::test]
    async fn test_sat_manager_creation() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let manager = SATManager::new(backend);

        assert_eq!(manager.infrastructure.role(), AgentRole::InfrastructureManager);
        assert_eq!(manager.performance.role(), AgentRole::PerformanceMonitor);
    }

    #[tokio::test]
    async fn test_sat_team_metrics() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let manager = SATManager::new(backend);

        let metrics = manager.get_team_metrics();
        assert_eq!(metrics.agents, 5);
        assert_eq!(metrics.total_tasks_completed, 0);
    }

    #[tokio::test]
    async fn test_sat_selective_workflow() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let mut manager = SATManager::new(backend);

        let task = Task::example();
        let roles = vec![
            AgentRole::SecurityAuditor,
            AgentRole::PerformanceMonitor,
        ];

        let results = manager.execute_selective_workflow(&task, roles).await;
        assert!(results.is_ok());

        let responses = results.unwrap();
        assert_eq!(responses.len(), 2);
    }

    #[tokio::test]
    async fn test_system_health_report() {
        let backend: Arc<dyn AIBackend> = Arc::new(SimulatedBackend);
        let mut manager = SATManager::new(backend);

        let task = Task::example();
        let report = manager.generate_health_report(&task).await;
        assert!(report.is_ok());

        let health = report.unwrap();
        assert!(health.overall_health >= 0.0 && health.overall_health <= 1.0);
    }
}
