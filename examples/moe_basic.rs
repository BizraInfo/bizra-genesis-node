// examples/moe_basic.rs
// Basic MOE integration example
// Run with: cargo run --example moe_basic

use synthesis_orchestrator::{Contract, SynthesisOrchestrator, Task};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter("synthesis_orchestrator=info,bizra_moe=info")
        .init();

    println!("🚀 BIZRA Genesis Node - Basic MOE Example");
    println!("=========================================\n");

    // Create orchestrator with simulated backend (for testing without Ollama)
    let mut orchestrator = SynthesisOrchestrator::new().expect("Failed to create orchestrator");

    // Create a sample task
    let task = Task::example();

    // Create a contract (quality requirements)
    let contract = Contract::example();

    // Available routes (models/agents)
    let routes = vec![
        "gpt-4".to_string(),
        "claude-3".to_string(),
        "llama-3".to_string(),
    ];

    println!("📋 Task: {:?}", task);
    println!("📜 Contract schema: {}", contract.schema_json);
    println!("🛣️  Available routes: {:?}\n", routes);

    // Run synthesis
    println!("⚙️  Running synthesis...");
    let result = orchestrator.synthesize(&task, &contract, routes).await?;

    // Display results
    println!("\n✅ Synthesis Complete!");
    println!("=====================================");
    println!("🏆 Winner: {}", result.winner.model);
    println!("📊 Scores:");
    println!(
        "   Accuracy:   {:.2}%",
        result.winner.scores.accuracy * 100.0
    );
    println!("   Safety:     {:.2}%", result.winner.scores.safety * 100.0);
    println!(
        "   Efficiency: {:.2}%",
        result.winner.scores.efficiency * 100.0
    );
    println!(
        "   Ihsān (إحسان): {:.2}%",
        result.winner.scores.ihsan * 100.0
    );
    println!("\n💰 Cost: ${:.4}", result.winner.cost_usd);
    println!("⏱️  Latency: {}ms", result.winner.latency_ms);
    println!("\n📈 Telemetry:");
    println!(
        "   JSON Compliance: {:.1}%",
        result.telemetry.sli_metrics.json_compliance_rate * 100.0
    );
    println!(
        "   Accuracy Uplift: +{:.2}%",
        result.telemetry.quality_metrics.accuracy_uplift * 100.0
    );

    Ok(())
}
