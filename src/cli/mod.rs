// src/cli/mod.rs
// BIZRA Unified Agent Management CLI
// Professional Elite Interface for 12-Agent Ecosystem

use crate::agents::{pat::PATManager, sat::SATManager, AgentRole};
use crate::ai_backend::{AIBackend, MoeBackend, SimulatedBackend};
use crate::types::Task;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::sync::Arc;

pub mod commands;
pub mod display;

pub use commands::{Command, CommandExecutor, TeamType, WorkflowType};
pub use display::Display;

/// CLI Configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CLIConfig {
    pub backend: BackendConfig,
    pub display: DisplayConfig,
    pub telemetry: TelemetryConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendConfig {
    pub mode: String, // "simulated" | "moe" | "hybrid"
    pub ollama_url: String,
    pub ollama_models: Vec<String>,
    pub timeout_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayConfig {
    pub show_progress: bool,
    pub show_metrics: bool,
    pub verbose: bool,
    pub color: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryConfig {
    pub enabled: bool,
    pub log_level: String,
    pub metrics_file: Option<String>,
}

impl Default for CLIConfig {
    fn default() -> Self {
        Self {
            backend: BackendConfig {
                mode: "simulated".to_string(),
                ollama_url: "http://localhost:11434".to_string(),
                ollama_models: vec![
                    "llama3.2".to_string(),
                    "mistral-nemo".to_string(),
                    "qwen2.5:latest".to_string(),
                ],
                timeout_secs: 30,
            },
            display: DisplayConfig {
                show_progress: true,
                show_metrics: true,
                verbose: false,
                color: true,
            },
            telemetry: TelemetryConfig {
                enabled: true,
                log_level: "info".to_string(),
                metrics_file: Some("metrics.json".to_string()),
            },
        }
    }
}

/// Unified Agent Manager CLI
pub struct AgentCLI {
    config: CLIConfig,
    pat_manager: PATManager,
    sat_manager: SATManager,
    session_metrics: SessionMetrics,
}

/// Session-level metrics
#[derive(Debug, Clone, Default)]
pub struct SessionMetrics {
    pub total_tasks: usize,
    pub successful_tasks: usize,
    pub failed_tasks: usize,
    pub total_latency_ms: u64,
    pub total_tokens: usize,
    pub agents_used: std::collections::HashSet<String>,
}

impl SessionMetrics {
    pub fn success_rate(&self) -> f32 {
        if self.total_tasks == 0 {
            return 0.0;
        }
        self.successful_tasks as f32 / self.total_tasks as f32
    }

    pub fn avg_latency_ms(&self) -> f32 {
        if self.successful_tasks == 0 {
            return 0.0;
        }
        self.total_latency_ms as f32 / self.successful_tasks as f32
    }
}

impl AgentCLI {
    /// Create new CLI with configuration
    pub fn new(config: CLIConfig) -> Result<Self, Box<dyn Error>> {
        // Initialize AI backend based on config
        let ai_backend: Arc<dyn AIBackend> = match config.backend.mode.as_str() {
            "moe" => {
                let moe_config = bizra_moe::OllamaConfig {
                    base_url: config.backend.ollama_url.clone(),
                    timeout: std::time::Duration::from_secs(config.backend.timeout_secs),
                    models: config.backend.ollama_models.clone(),
                    min_healthy_models: 1,
                    health_check_interval: std::time::Duration::from_secs(30),
                    ihsan_threshold: 0.75,
                };
                Arc::new(MoeBackend::with_config(moe_config))
            }
            _ => Arc::new(SimulatedBackend),
        };

        Ok(Self {
            config,
            pat_manager: PATManager::new(ai_backend.clone()),
            sat_manager: SATManager::new(ai_backend),
            session_metrics: SessionMetrics::default(),
        })
    }

    /// Execute PAT workflow with selected agents
    pub async fn execute_pat_workflow(
        &mut self,
        task: &Task,
        agents: Vec<AgentRole>,
    ) -> Result<Vec<crate::agents::AgentResponse>, Box<dyn Error>> {
        let start = std::time::Instant::now();

        if self.config.display.show_progress {
            println!("🎯 Executing PAT workflow with {} agents...", agents.len());
        }

        let result = self
            .pat_manager
            .execute_selective_workflow(task, agents)
            .await;

        let elapsed = start.elapsed().as_millis() as u64;

        match result {
            Ok(responses) => {
                self.session_metrics.total_tasks += responses.len();
                self.session_metrics.successful_tasks += responses.len();
                self.session_metrics.total_latency_ms += elapsed;

                for response in &responses {
                    self.session_metrics
                        .agents_used
                        .insert(response.agent.name().to_string());
                    self.session_metrics.total_tokens += 1000; // Approximate
                }

                if self.config.display.show_progress {
                    println!("✅ PAT workflow completed in {}ms", elapsed);
                }

                Ok(responses)
            }
            Err(e) => {
                self.session_metrics.failed_tasks += 1;
                Err(e)
            }
        }
    }

    /// Execute SAT workflow
    pub async fn execute_sat_workflow(
        &mut self,
        task: &Task,
        agents: Vec<AgentRole>,
    ) -> Result<Vec<crate::agents::AgentResponse>, Box<dyn Error>> {
        let start = std::time::Instant::now();

        if self.config.display.show_progress {
            println!("🔧 Executing SAT workflow with {} agents...", agents.len());
        }

        let result = self
            .sat_manager
            .execute_selective_workflow(task, agents)
            .await;

        let elapsed = start.elapsed().as_millis() as u64;

        match result {
            Ok(responses) => {
                self.session_metrics.total_tasks += responses.len();
                self.session_metrics.successful_tasks += responses.len();
                self.session_metrics.total_latency_ms += elapsed;

                for response in &responses {
                    self.session_metrics
                        .agents_used
                        .insert(response.agent.name().to_string());
                    self.session_metrics.total_tokens += 1000; // Approximate
                }

                if self.config.display.show_progress {
                    println!("✅ SAT workflow completed in {}ms", elapsed);
                }

                Ok(responses)
            }
            Err(e) => {
                self.session_metrics.failed_tasks += 1;
                Err(e)
            }
        }
    }

    /// Execute full ecosystem workflow (PAT + SAT)
    pub async fn execute_full_ecosystem(&mut self, task: &Task) -> Result<(), Box<dyn Error>> {
        println!("🌟 Executing FULL ECOSYSTEM workflow (12 agents)...\n");

        // PAT Phase
        println!("📋 PHASE 1: PAT - Development");
        let pat_roles = vec![
            AgentRole::Planner,
            AgentRole::Researcher,
            AgentRole::Coder,
            AgentRole::Evaluator,
            AgentRole::Ethicist,
        ];
        self.execute_pat_workflow(task, pat_roles).await?;

        // SAT Phase
        println!("\n🔧 PHASE 2: SAT - Operations");
        let sat_roles = vec![
            AgentRole::InfrastructureManager,
            AgentRole::PerformanceMonitor,
            AgentRole::SecurityAuditor,
            AgentRole::BackupCoordinator,
            AgentRole::ResourceAllocator,
        ];
        self.execute_sat_workflow(task, sat_roles).await?;

        // Health Check
        println!("\n📈 PHASE 3: System Health Check");
        let health = self
            .sat_manager
            .generate_health_report(task)
            .await
            .map_err(|e| format!("{}", e))?;

        println!("   Overall Health: {:.1}%", health.overall_health * 100.0);
        println!("   Status: {}", health.status());

        println!("\n✅ Full ecosystem workflow complete!");
        Ok(())
    }

    /// Display session metrics
    pub fn display_metrics(&self) {
        println!("\n╔═══════════════════════════════════════════════════════════════╗");
        println!("║                   SESSION METRICS                            ║");
        println!("╚═══════════════════════════════════════════════════════════════╝\n");

        println!("📊 Performance:");
        println!("   Total Tasks: {}", self.session_metrics.total_tasks);
        println!("   Successful: {}", self.session_metrics.successful_tasks);
        println!("   Failed: {}", self.session_metrics.failed_tasks);
        println!(
            "   Success Rate: {:.1}%",
            self.session_metrics.success_rate() * 100.0
        );
        println!(
            "   Average Latency: {:.0}ms",
            self.session_metrics.avg_latency_ms()
        );
        println!("   Total Tokens: ~{}", self.session_metrics.total_tokens);

        println!(
            "\n🤖 Agents Used: {}",
            self.session_metrics.agents_used.len()
        );
        for agent in &self.session_metrics.agents_used {
            println!("   • {}", agent);
        }

        // PAT Metrics
        let pat_metrics = self.pat_manager.get_team_metrics();
        println!("\n👥 PAT Team:");
        println!("   Tasks: {}", pat_metrics.total_tasks_completed);
        println!(
            "   Success Rate: {:.1}%",
            pat_metrics.success_rate() * 100.0
        );

        // SAT Metrics
        let sat_metrics = self.sat_manager.get_team_metrics();
        println!("\n🔧 SAT Team:");
        println!("   Tasks: {}", sat_metrics.total_tasks_completed);
        println!(
            "   Success Rate: {:.1}%",
            sat_metrics.success_rate() * 100.0
        );

        println!();
    }

    /// Get configuration
    pub fn config(&self) -> &CLIConfig {
        &self.config
    }

    /// Get PAT manager
    pub fn pat_manager(&mut self) -> &mut PATManager {
        &mut self.pat_manager
    }

    /// Get SAT manager
    pub fn sat_manager(&mut self) -> &mut SATManager {
        &mut self.sat_manager
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_config_default() {
        let config = CLIConfig::default();
        assert_eq!(config.backend.mode, "simulated");
        assert!(config.display.show_progress);
        assert!(config.telemetry.enabled);
    }

    #[test]
    fn test_session_metrics() {
        let mut metrics = SessionMetrics::default();
        assert_eq!(metrics.success_rate(), 0.0);

        metrics.total_tasks = 10;
        metrics.successful_tasks = 8;
        metrics.failed_tasks = 2;

        assert_eq!(metrics.success_rate(), 0.8);
    }

    #[tokio::test]
    async fn test_cli_creation() {
        let config = CLIConfig::default();
        let cli = AgentCLI::new(config);
        assert!(cli.is_ok());
    }
}
