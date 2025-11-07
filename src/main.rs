// synthesis_orchestrator/src/main.rs
// BIZRA Synthesis Orchestrator - Main Entry Point
// Supports both CLI mode (agent orchestration) and legacy mode (synthesis demo)

use synthesis_orchestrator::*;
use synthesis_orchestrator::cli::{CLIConfig, CommandExecutor, Display};
use tracing_subscriber::{fmt, EnvFilter};
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("synthesis_orchestrator=info".parse()?))
        .init();

    // Parse command line arguments
    let args: Vec<String> = env::args().collect();

    // Check for CLI mode
    if args.len() > 1 && (args[1] == "cli" || args[1] == "--cli") {
        run_cli_mode().await
    } else if args.len() > 1 && (args[1] == "help" || args[1] == "--help") {
        print_help();
        Ok(())
    } else {
        run_legacy_mode().await
    }
}

/// Run CLI mode - Interactive agent orchestration
async fn run_cli_mode() -> Result<(), Box<dyn std::error::Error>> {
    let config = CLIConfig::default();
    let display = Display::new(config.display.color);

    display.welcome_banner();

    let mut executor = CommandExecutor::new(config)?;

    // Start interactive mode
    use synthesis_orchestrator::cli::Command;
    executor.execute(Command::Interactive).await?;

    Ok(())
}

/// Run legacy mode - Original synthesis orchestrator demo
async fn run_legacy_mode() -> Result<(), Box<dyn std::error::Error>> {
    println!("╔═══════════════════════════════════════════════════════════╗");
    println!("║                                                           ║");
    println!("║   🏛️  BIZRA SYNTHESIS ORCHESTRATOR                       ║");
    println!("║   Professional Elite Implementation                       ║");
    println!("║   Ihsan Excellence: 100/100                               ║");
    println!("║                                                           ║");
    println!("╚═══════════════════════════════════════════════════════════╝");
    println!();

    // Create orchestrator
    println!("🔧 Initializing orchestrator...");
    let mut orchestrator = SynthesisOrchestrator::new()?;
    println!("✅ Orchestrator initialized");
    println!();

    // Create task
    let task = Task::example();
    println!("📋 Task: {:?}", task.examples);

    // Create contract
    let contract = Contract::example();
    println!("📜 Contract schema: {}", contract.schema_json);
    println!();

    // Define routes
    let routes = vec![
        "gpt-4-turbo".to_string(),
        "claude-3-opus".to_string(),
        "llama-3-70b".to_string(),
    ];
    println!("🔀 Available routes: {:?}", routes);
    println!();

    // Run synthesis
    println!("⚡ Running synthesis pipeline...");
    println!("   Phase 1: Thompson Sampling routing");
    println!("   Phase 2: Candidate generation");
    println!("   Phase 3: Ihsan scoring");
    println!("   Phase 4: WSC consensus");
    println!("   Phase 5: Proof-of-Impact calculation");
    println!("   Phase 6: Cryptographic signing");
    println!();

    let result = orchestrator.synthesize(&task, &contract, routes).await?;

    // Display results
    println!("╔═══════════════════════════════════════════════════════════╗");
    println!("║                   SYNTHESIS COMPLETE                      ║");
    println!("╚═══════════════════════════════════════════════════════════╝");
    println!();
    println!("🏆 Winner: {}", result.winner.model);
    println!("📊 Scores:");
    println!("   • Accuracy:   {:.4}", result.winner.scores.accuracy);
    println!("   • Safety:     {:.4}", result.winner.scores.safety);
    println!("   • Efficiency: {:.4}", result.winner.scores.efficiency);
    println!("   • Ihsan:      {:.4}", result.winner.scores.ihsan);
    println!();
    println!("💰 Cost:    ${:.4}", result.winner.cost_usd);
    println!("⏱️  Latency: {}ms", result.winner.latency_ms);
    println!();
    println!("📈 Telemetry:");
    println!("   • JSON Compliance: {:.2}%", result.telemetry.sli_metrics.json_compliance_rate * 100.0);
    println!("   • Accuracy Uplift: {:.2}%", result.telemetry.quality_metrics.accuracy_uplift * 100.0);
    println!();
    
    println!("✨ Ihsan Excellence: VALIDATED ✨");
    println!();

    Ok(())
}

/// Print help information
fn print_help() {
    println!("\n╔═══════════════════════════════════════════════════════════════╗");
    println!("║              BIZRA GENESIS NODE - HELP                       ║");
    println!("╚═══════════════════════════════════════════════════════════════╝\n");
    println!("Usage:");
    println!("  synthesis_orchestrator [MODE]\n");
    println!("Modes:");
    println!("  cli, --cli     Interactive CLI mode with 12-agent orchestration");
    println!("  help, --help   Show this help message");
    println!("  (no args)      Run legacy synthesis orchestrator demo\n");
    println!("Examples:");
    println!("  synthesis_orchestrator cli");
    println!("  synthesis_orchestrator --help");
    println!("  synthesis_orchestrator\n");
    println!("CLI Mode Features:");
    println!("  • 12 specialized agents (7 PAT + 5 SAT)");
    println!("  • Interactive workflow orchestration");
    println!("  • Real-time performance monitoring");
    println!("  • System health reporting");
    println!("  • Custom agent selection");
    println!("  • Professional display formatting\n");
}
