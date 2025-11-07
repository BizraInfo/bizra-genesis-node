// src/cli/commands.rs
// BIZRA CLI Command System
// Professional Elite Command Interface for Agent Orchestration

use crate::agents::AgentRole;
use crate::cli::{AgentCLI, CLIConfig};
use crate::types::Task;
use std::error::Error;
use std::io::{self, Write};

/// CLI Commands
#[derive(Debug, Clone)]
pub enum Command {
    /// Run workflow with selected agents
    Run {
        workflow: WorkflowType,
        agents: Vec<AgentRole>,
        task: Task,
    },
    /// List available agents
    List { team: Option<TeamType> },
    /// Show system health
    Health { detailed: bool },
    /// Display session metrics
    Metrics,
    /// Show configuration
    Config,
    /// Interactive mode
    Interactive,
    /// Help information
    Help,
    /// Exit CLI
    Exit,
}

/// Workflow types
#[derive(Debug, Clone)]
pub enum WorkflowType {
    PAT,
    SAT,
    Full,
    Custom,
}

/// Team types
#[derive(Debug, Clone)]
pub enum TeamType {
    PAT,
    SAT,
    All,
}

/// Command executor
pub struct CommandExecutor {
    cli: AgentCLI,
}

impl CommandExecutor {
    pub fn new(config: CLIConfig) -> Result<Self, Box<dyn Error>> {
        Ok(Self {
            cli: AgentCLI::new(config)?,
        })
    }

    /// Execute a command
    pub async fn execute(&mut self, command: Command) -> Result<(), Box<dyn Error>> {
        match command {
            Command::Run {
                workflow,
                agents,
                task,
            } => {
                self.run_workflow(workflow, agents, task).await?;
            }
            Command::List { team } => {
                self.list_agents(team);
            }
            Command::Health { detailed } => {
                self.show_health(detailed).await?;
            }
            Command::Metrics => {
                self.cli.display_metrics();
            }
            Command::Config => {
                self.show_config();
            }
            Command::Interactive => {
                self.interactive_mode().await?;
            }
            Command::Help => {
                self.show_help();
            }
            Command::Exit => {
                println!("👋 Goodbye! BIZRA Agent System shutting down...");
            }
        }
        Ok(())
    }

    /// Run a workflow
    async fn run_workflow(
        &mut self,
        workflow: WorkflowType,
        agents: Vec<AgentRole>,
        task: Task,
    ) -> Result<(), Box<dyn Error>> {
        match workflow {
            WorkflowType::PAT => {
                println!("🎯 Executing PAT workflow...");
                let agents = if agents.is_empty() {
                    vec![
                        AgentRole::Planner,
                        AgentRole::Researcher,
                        AgentRole::Coder,
                        AgentRole::Evaluator,
                        AgentRole::Ethicist,
                    ]
                } else {
                    agents
                };
                self.cli.execute_pat_workflow(&task, agents).await?;
            }
            WorkflowType::SAT => {
                println!("🔧 Executing SAT workflow...");
                let agents = if agents.is_empty() {
                    vec![
                        AgentRole::InfrastructureManager,
                        AgentRole::PerformanceMonitor,
                        AgentRole::SecurityAuditor,
                        AgentRole::BackupCoordinator,
                        AgentRole::ResourceAllocator,
                    ]
                } else {
                    agents
                };
                self.cli.execute_sat_workflow(&task, agents).await?;
            }
            WorkflowType::Full => {
                println!("🌟 Executing FULL ECOSYSTEM workflow...");
                self.cli.execute_full_ecosystem(&task).await?;
            }
            WorkflowType::Custom => {
                if agents.is_empty() {
                    return Err("Custom workflow requires agent selection".into());
                }

                // Determine which team(s) to use
                let pat_agents: Vec<AgentRole> = agents
                    .iter()
                    .filter(|a| {
                        matches!(
                            a,
                            AgentRole::Planner
                                | AgentRole::Researcher
                                | AgentRole::Coder
                                | AgentRole::Evaluator
                                | AgentRole::Ethicist
                                | AgentRole::Publisher
                                | AgentRole::Integrator
                        )
                    })
                    .cloned()
                    .collect();

                let sat_agents: Vec<AgentRole> = agents
                    .iter()
                    .filter(|a| {
                        matches!(
                            a,
                            AgentRole::InfrastructureManager
                                | AgentRole::PerformanceMonitor
                                | AgentRole::SecurityAuditor
                                | AgentRole::BackupCoordinator
                                | AgentRole::ResourceAllocator
                        )
                    })
                    .cloned()
                    .collect();

                if !pat_agents.is_empty() {
                    self.cli.execute_pat_workflow(&task, pat_agents).await?;
                }

                if !sat_agents.is_empty() {
                    self.cli.execute_sat_workflow(&task, sat_agents).await?;
                }
            }
        }
        Ok(())
    }

    /// List available agents
    fn list_agents(&self, team: Option<TeamType>) {
        let show_pat = matches!(team, None | Some(TeamType::PAT) | Some(TeamType::All));
        let show_sat = matches!(team, None | Some(TeamType::SAT) | Some(TeamType::All));

        println!("\n╔═══════════════════════════════════════════════════════════════╗");
        println!("║                   AVAILABLE AGENTS                           ║");
        println!("╚═══════════════════════════════════════════════════════════════╝\n");

        if show_pat {
            println!("👥 PAT (Personal Agentic Team) - 7 General-Purpose Agents:");
            println!("   1. 📋 Planner          - Strategic planning and goal decomposition");
            println!("   2. 🔍 Researcher       - Information gathering and analysis");
            println!("   3. 💻 Coder            - Implementation and development");
            println!("   4. ✅ Evaluator        - Quality assessment and validation");
            println!("   5. 🛡️  Ethicist         - Ethics and compliance review");
            println!("   6. 📢 Publisher        - Documentation and communication");
            println!("   7. 🔗 Integrator       - System integration and coordination");
            println!();
        }

        if show_sat {
            println!("🔧 SAT (System Agentic Team) - 5 Software-Focused Agents:");
            println!("   8.  🏗️  Infrastructure   - DevOps, cloud, and architecture");
            println!("   9.  ⚡ Performance      - Optimization and monitoring");
            println!("   10. 🔒 Security        - Vulnerability and compliance auditing");
            println!("   11. 💾 Backup          - Disaster recovery and data protection");
            println!("   12. 📊 Resources       - Cost optimization and allocation");
            println!();
        }

        println!(
            "Total Agents: {}",
            if show_pat && show_sat {
                12
            } else if show_pat {
                7
            } else {
                5
            }
        );
        println!();
    }

    /// Show system health
    async fn show_health(&mut self, detailed: bool) -> Result<(), Box<dyn Error>> {
        println!("\n🏥 Generating System Health Report...\n");

        let task = Task { examples: None };
        let health = self
            .cli
            .sat_manager()
            .generate_health_report(&task)
            .await
            .map_err(|e| format!("{}", e))?;

        println!("╔═══════════════════════════════════════════════════════════════╗");
        println!("║                   SYSTEM HEALTH REPORT                       ║");
        println!("╚═══════════════════════════════════════════════════════════════╝\n");

        println!("📊 Overall Health: {:.1}%", health.overall_health * 100.0);
        println!("📈 Status: {}", health.status());
        println!("⚠️  Critical Issues: {}", health.critical_issues.len());
        println!();

        if detailed {
            println!("🤖 Agent Health Scores:");
            for (agent, score) in &health.health_scores {
                let status = if *score >= 0.9 {
                    "🟢 EXCELLENT"
                } else if *score >= 0.7 {
                    "🟡 GOOD"
                } else if *score >= 0.5 {
                    "🟠 WARNING"
                } else {
                    "🔴 CRITICAL"
                };
                println!(
                    "   {} {}: {:.1}% - {}",
                    if *score >= 0.7 { "✅" } else { "⚠️" },
                    agent,
                    score * 100.0,
                    status
                );
            }
            println!();

            if !health.critical_issues.is_empty() {
                println!("🚨 Critical Issues:");
                for issue in &health.critical_issues {
                    println!("   • {}", issue);
                }
                println!();
            }

            if !health.recommendations.is_empty() {
                println!("💡 Recommendations:");
                for rec in &health.recommendations {
                    println!("   • {}", rec);
                }
                println!();
            }
        }

        Ok(())
    }

    /// Show configuration
    fn show_config(&self) {
        println!("\n╔═══════════════════════════════════════════════════════════════╗");
        println!("║                   CLI CONFIGURATION                          ║");
        println!("╚═══════════════════════════════════════════════════════════════╝\n");

        let config = self.cli.config();

        println!("🤖 Backend:");
        println!("   Mode: {}", config.backend.mode);
        println!("   Ollama URL: {}", config.backend.ollama_url);
        println!("   Models: {:?}", config.backend.ollama_models);
        println!("   Timeout: {}s", config.backend.timeout_secs);
        println!();

        println!("🎨 Display:");
        println!(
            "   Progress: {}",
            if config.display.show_progress {
                "✅"
            } else {
                "❌"
            }
        );
        println!(
            "   Metrics: {}",
            if config.display.show_metrics {
                "✅"
            } else {
                "❌"
            }
        );
        println!(
            "   Verbose: {}",
            if config.display.verbose { "✅" } else { "❌" }
        );
        println!(
            "   Color: {}",
            if config.display.color { "✅" } else { "❌" }
        );
        println!();

        println!("📊 Telemetry:");
        println!(
            "   Enabled: {}",
            if config.telemetry.enabled {
                "✅"
            } else {
                "❌"
            }
        );
        println!("   Log Level: {}", config.telemetry.log_level);
        if let Some(metrics_file) = &config.telemetry.metrics_file {
            println!("   Metrics File: {}", metrics_file);
        }
        println!();
    }

    /// Interactive mode
    async fn interactive_mode(&mut self) -> Result<(), Box<dyn Error>> {
        println!("\n╔═══════════════════════════════════════════════════════════════╗");
        println!("║            BIZRA INTERACTIVE AGENT ORCHESTRATION             ║");
        println!("╚═══════════════════════════════════════════════════════════════╝\n");
        println!("Commands: run, list, health, metrics, config, help, exit");
        println!();

        loop {
            print!("bizra> ");
            io::stdout().flush()?;

            let mut input = String::new();
            io::stdin().read_line(&mut input)?;
            let input = input.trim();

            if input.is_empty() {
                continue;
            }

            let parts: Vec<&str> = input.split_whitespace().collect();
            let command = parts.first().unwrap_or(&"");

            match *command {
                "run" => {
                    let workflow = self.select_workflow()?;
                    let agents = self.select_agents()?;
                    let task = self.create_task()?;

                    self.run_workflow(workflow, agents, task).await?;
                }
                "list" => {
                    self.list_agents(None);
                }
                "health" => {
                    let detailed = parts.get(1) == Some(&"--detailed");
                    self.show_health(detailed).await?;
                }
                "metrics" => {
                    self.cli.display_metrics();
                }
                "config" => {
                    self.show_config();
                }
                "help" => {
                    self.show_help();
                }
                "exit" => {
                    println!("👋 Goodbye! BIZRA Agent System shutting down...");
                    break;
                }
                _ => {
                    println!("❌ Unknown command: {}", command);
                    println!("Type 'help' for available commands");
                }
            }
            println!();
        }

        Ok(())
    }

    /// Select workflow type
    fn select_workflow(&self) -> Result<WorkflowType, Box<dyn Error>> {
        println!("\nSelect Workflow Type:");
        println!("  1. PAT - Personal Agentic Team");
        println!("  2. SAT - System Agentic Team");
        println!("  3. Full - Complete 12-Agent Ecosystem");
        println!("  4. Custom - Select specific agents");
        print!("Choice (1-4): ");
        io::stdout().flush()?;

        let mut input = String::new();
        io::stdin().read_line(&mut input)?;

        match input.trim() {
            "1" => Ok(WorkflowType::PAT),
            "2" => Ok(WorkflowType::SAT),
            "3" => Ok(WorkflowType::Full),
            "4" => Ok(WorkflowType::Custom),
            _ => Err("Invalid workflow selection".into()),
        }
    }

    /// Select agents
    fn select_agents(&self) -> Result<Vec<AgentRole>, Box<dyn Error>> {
        println!("\nSelect Agents (comma-separated numbers, or 'all'):");
        self.list_agents(Some(TeamType::All));
        print!("Selection: ");
        io::stdout().flush()?;

        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        let input = input.trim();

        if input == "all" {
            return Ok(vec![
                AgentRole::Planner,
                AgentRole::Researcher,
                AgentRole::Coder,
                AgentRole::Evaluator,
                AgentRole::Ethicist,
                AgentRole::Publisher,
                AgentRole::Integrator,
                AgentRole::InfrastructureManager,
                AgentRole::PerformanceMonitor,
                AgentRole::SecurityAuditor,
                AgentRole::BackupCoordinator,
                AgentRole::ResourceAllocator,
            ]);
        }

        let selections: Vec<usize> = input
            .split(',')
            .filter_map(|s| s.trim().parse().ok())
            .collect();

        let mut agents = Vec::new();
        for num in selections {
            let agent = match num {
                1 => AgentRole::Planner,
                2 => AgentRole::Researcher,
                3 => AgentRole::Coder,
                4 => AgentRole::Evaluator,
                5 => AgentRole::Ethicist,
                6 => AgentRole::Publisher,
                7 => AgentRole::Integrator,
                8 => AgentRole::InfrastructureManager,
                9 => AgentRole::PerformanceMonitor,
                10 => AgentRole::SecurityAuditor,
                11 => AgentRole::BackupCoordinator,
                12 => AgentRole::ResourceAllocator,
                _ => continue,
            };
            agents.push(agent);
        }

        Ok(agents)
    }

    /// Create task from user input
    fn create_task(&self) -> Result<Task, Box<dyn Error>> {
        println!("\nDescribe the task (JSON format, or press Enter for empty task):");
        print!("> ");
        io::stdout().flush()?;

        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        let input = input.trim();

        if input.is_empty() {
            return Ok(Task { examples: None });
        }

        let examples: serde_json::Value = serde_json::from_str(input)?;
        Ok(Task {
            examples: Some(vec![examples]),
        })
    }

    /// Show help
    fn show_help(&self) {
        println!("\n╔═══════════════════════════════════════════════════════════════╗");
        println!("║                   BIZRA CLI HELP                             ║");
        println!("╚═══════════════════════════════════════════════════════════════╝\n");

        println!("Commands:");
        println!("  run       - Run a workflow with selected agents");
        println!("  list      - List all available agents");
        println!("  health    - Show system health report");
        println!("  metrics   - Display session performance metrics");
        println!("  config    - Show current configuration");
        println!("  help      - Show this help message");
        println!("  exit      - Exit the CLI");
        println!();

        println!("Examples:");
        println!("  bizra> run");
        println!("  bizra> list");
        println!("  bizra> health --detailed");
        println!("  bizra> metrics");
        println!();

        println!("Workflows:");
        println!("  PAT   - Personal Agentic Team (7 general-purpose agents)");
        println!("  SAT   - System Agentic Team (5 software-focused agents)");
        println!("  Full  - Complete 12-agent ecosystem");
        println!("  Custom - Select specific agents");
        println!();
    }
}
