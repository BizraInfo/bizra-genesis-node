// examples/cli_demo.rs
// BIZRA CLI Demonstration
// Shows complete CLI functionality with all 12 agents

use bizra_genesis_node::cli::{CLIConfig, Command, CommandExecutor, Display, WorkflowType};
use bizra_genesis_node::{agents::AgentRole, Task};
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter("synthesis_orchestrator=info")
        .init();

    let config = CLIConfig::default();
    let display = Display::new(config.display.color);

    display.welcome_banner();

    println!("╔═══════════════════════════════════════════════════════════════╗");
    println!("║            BIZRA CLI DEMONSTRATION                           ║");
    println!("║       Showcasing World-Class Agent Orchestration             ║");
    println!("╚═══════════════════════════════════════════════════════════════╝\n");

    let mut executor = CommandExecutor::new(config)?;

    // Demo 1: List all agents
    println!("═══════════════════════════════════════════════════════════════");
    println!("DEMO 1: List All Available Agents");
    println!("═══════════════════════════════════════════════════════════════\n");
    executor.execute(Command::List { team: None }).await?;

    // Demo 2: Show configuration
    println!("\n═══════════════════════════════════════════════════════════════");
    println!("DEMO 2: Display Configuration");
    println!("═══════════════════════════════════════════════════════════════\n");
    executor.execute(Command::Config).await?;

    // Demo 3: Run PAT workflow
    println!("\n═══════════════════════════════════════════════════════════════");
    println!("DEMO 3: Execute PAT Workflow");
    println!("═══════════════════════════════════════════════════════════════\n");

    let task = Task {
        id: uuid::Uuid::new_v4(),
        description: "AI-Powered Task Manager development".to_string(),
        priority: bizra_genesis_node::types::Priority::High,
        created_at: chrono::Utc::now(),
        metadata: std::collections::HashMap::new(),
        examples: Some(vec![serde_json::json!({
            "project": "AI-Powered Task Manager",
            "domain": "productivity",
            "requirements": [
                "Natural language task input",
                "Smart scheduling with ML",
                "Priority optimization",
                "Cross-platform sync",
                "Offline-first architecture"
            ],
            "constraints": {
                "timeline": "6 weeks",
                "budget": "$25,000",
                "team_size": "3 developers"
            }
        })]),
    };

    let pat_agents = vec![
        AgentRole::Planner,
        AgentRole::Researcher,
        AgentRole::Coder,
        AgentRole::Evaluator,
        AgentRole::Ethicist,
    ];

    executor
        .execute(Command::Run {
            workflow: WorkflowType::PAT,
            agents: pat_agents,
            task: task.clone(),
        })
        .await?;

    // Demo 4: Run SAT workflow
    println!("\n═══════════════════════════════════════════════════════════════");
    println!("DEMO 4: Execute SAT Workflow");
    println!("═══════════════════════════════════════════════════════════════\n");

    let sat_agents = vec![
        AgentRole::InfrastructureManager,
        AgentRole::PerformanceMonitor,
        AgentRole::SecurityAuditor,
    ];

    executor
        .execute(Command::Run {
            workflow: WorkflowType::SAT,
            agents: sat_agents,
            task: task.clone(),
        })
        .await?;

    // Demo 5: System health check
    println!("\n═══════════════════════════════════════════════════════════════");
    println!("DEMO 5: System Health Check");
    println!("═══════════════════════════════════════════════════════════════\n");

    executor.execute(Command::Health { detailed: true }).await?;

    // Demo 6: Display metrics
    println!("\n═══════════════════════════════════════════════════════════════");
    println!("DEMO 6: Session Performance Metrics");
    println!("═══════════════════════════════════════════════════════════════\n");

    executor.execute(Command::Metrics).await?;

    // Demo 7: Full ecosystem workflow
    println!("\n═══════════════════════════════════════════════════════════════");
    println!("DEMO 7: Full Ecosystem Workflow (All 12 Agents)");
    println!("═══════════════════════════════════════════════════════════════\n");

    let full_task = Task {
        id: uuid::Uuid::new_v4(),
        description: "Real-Time Analytics Platform development".to_string(),
        priority: bizra_genesis_node::types::Priority::High,
        created_at: chrono::Utc::now(),
        metadata: std::collections::HashMap::new(),
        examples: Some(vec![serde_json::json!({
            "project": "Real-Time Analytics Platform",
            "description": "Build a high-performance analytics platform with real-time data processing",
            "requirements": [
                "Stream processing with Apache Kafka",
                "Real-time dashboards with WebSocket",
                "Time-series database (InfluxDB)",
                "Machine learning predictions",
                "Kubernetes deployment",
                "99.95% uptime SLA"
            ],
            "scale": {
                "users": "100,000+",
                "events_per_second": "50,000",
                "data_retention": "2 years"
            }
        })]),
    };

    executor
        .execute(Command::Run {
            workflow: WorkflowType::Full,
            agents: vec![],
            task: full_task,
        })
        .await?;

    // Final health check
    println!("\n═══════════════════════════════════════════════════════════════");
    println!("DEMO 8: Final System Health & Performance");
    println!("═══════════════════════════════════════════════════════════════\n");

    executor.execute(Command::Health { detailed: true }).await?;
    executor.execute(Command::Metrics).await?;

    // Demo summary
    println!("\n╔═══════════════════════════════════════════════════════════════╗");
    println!("║              CLI DEMONSTRATION COMPLETE                      ║");
    println!("╚═══════════════════════════════════════════════════════════════╝\n");

    println!("✅ Demonstrated Features:");
    println!("   • Agent listing and discovery");
    println!("   • Configuration management");
    println!("   • PAT workflow execution (5 agents)");
    println!("   • SAT workflow execution (3 agents)");
    println!("   • System health monitoring");
    println!("   • Performance metrics tracking");
    println!("   • Full ecosystem orchestration (12 agents)");
    println!("   • Professional display formatting");
    println!();

    println!("🎯 Key Achievements:");
    println!("   • Multi-workflow orchestration");
    println!("   • Real-time health monitoring");
    println!("   • Comprehensive metrics tracking");
    println!("   • Production-ready CLI interface");
    println!();

    println!("🚀 Next Steps:");
    println!("   • Run interactive mode: cargo run --bin synthesis_orchestrator cli");
    println!("   • Try custom workflows with specific agent selection");
    println!("   • Enable MOE backend: USE_OLLAMA=1 cargo run --example cli_demo");
    println!();

    Ok(())
}
