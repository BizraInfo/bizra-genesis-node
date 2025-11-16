// examples/moe_real.rs
// Real MOE integration with Ollama
// Prerequisites: Install Ollama and pull models (see OLLAMA_SETUP.md)
// Run with: cargo run --example moe_real

use bizra_genesis_node::{Contract, SynthesisOrchestrator, Task};
use bizra_moe::OllamaConfig;
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing with detailed logs
    tracing_subscriber::fmt()
        .with_env_filter("synthesis_orchestrator=debug,bizra_moe=debug")
        .init();

    println!("🚀 BIZRA Genesis Node - Real MOE Integration");
    println!("============================================\n");

    // Configure MOE with real Ollama models
    let moe_config = OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(30),
        models: vec![
            "llama3.2".to_string(),
            "mistral-nemo".to_string(),
            // Add more models as needed
        ],
        min_healthy_models: 1, // Require at least 1 healthy model
        health_check_interval: Duration::from_secs(30),
        ihsan_threshold: 0.75, // 75% quality threshold
    };

    println!("🔧 MOE Configuration:");
    println!("   Base URL: {}", moe_config.base_url);
    println!("   Models: {:?}", moe_config.models);
    println!(
        "   Ihsān threshold: {:.0}%",
        moe_config.ihsan_threshold * 100.0
    );
    println!();

    // Create orchestrator with MOE backend
    println!("🏗️  Creating orchestrator with MOE backend...");
    let mut orchestrator =
        SynthesisOrchestrator::with_moe_config(moe_config).expect("Failed to create orchestrator");

    println!("✅ Orchestrator created successfully\n");

    // Create a real-world task
    let task = Task {
        id: uuid::Uuid::new_v4(),
        description: "Answer geography question".to_string(),
        priority: bizra_genesis_node::types::Priority::Medium,
        created_at: chrono::Utc::now(),
        metadata: std::collections::HashMap::new(),
        examples: Some(vec![serde_json::json!({
            "input": "What is the capital of France?",
            "expected_format": "JSON with answer and reasoning"
        })]),
    };

    // Create contract with strict quality requirements
    let contract = Contract::example();

    // Available routes
    let routes = vec!["moe-ensemble".to_string()];

    println!("📋 Task:");
    println!("   Examples: {:?}", task.examples);
    println!("\n📜 Contract:");
    println!("   Schema: {}", contract.schema_json);
    println!("   Token budget: {}", contract.token_budget);
    println!("\n🛣️  Routes: {:?}\n", routes);

    // Run synthesis
    println!("⚙️  Running synthesis with real AI models...");
    println!("   (This may take 5-30 seconds depending on models)\n");

    let start = std::time::Instant::now();

    match orchestrator.synthesize(&task, &contract, routes).await {
        Ok(result) => {
            let duration = start.elapsed();

            println!("\n✅ Synthesis Complete!");
            println!("=====================================");
            println!("⏱️  Total time: {:?}", duration);
            println!("\n🏆 Winner: {}", result.winner.model);

            // Display scores
            println!("\n📊 Quality Scores:");
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
                "   Ihsān (إحسان): {:.2}% {}",
                result.winner.scores.ihsan * 100.0,
                if result.winner.scores.ihsan >= 0.75 {
                    "✅"
                } else {
                    "❌"
                }
            );

            // Display response
            println!("\n📝 Response:");
            println!("{}", serde_json::to_string_pretty(&result.winner.json)?);

            // Display cost and performance
            println!("\n💰 Economics:");
            println!("   Cost: ${:.6}", result.winner.cost_usd);
            println!("   Latency: {}ms", result.winner.latency_ms);
            println!(
                "   Cost per second: ${:.6}/s",
                result.winner.cost_usd / (result.winner.latency_ms as f32 / 1000.0)
            );

            // Display telemetry
            println!("\n📈 Telemetry:");
            println!(
                "   JSON Compliance: {:.1}%",
                result.telemetry.sli_metrics.json_compliance_rate * 100.0
            );
            println!(
                "   Accuracy Uplift: +{:.2}%",
                result.telemetry.quality_metrics.accuracy_uplift * 100.0
            );

            println!("\n✨ Synthesis completed successfully!");
        }
        Err(e) => {
            eprintln!("\n❌ Synthesis failed: {}", e);
            eprintln!("\n💡 Troubleshooting:");
            eprintln!("   1. Ensure Ollama is running: ollama serve");
            eprintln!("   2. Check models are installed: ollama list");
            eprintln!("   3. Pull required models: ollama pull llama3.2");
            eprintln!("   4. See OLLAMA_SETUP.md for detailed instructions");
            return Err(e);
        }
    }

    Ok(())
}
