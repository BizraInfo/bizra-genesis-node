// examples/moe_hybrid.rs
// Hybrid MOE integration with automatic fallback
// Automatically falls back to simulated backend if Ollama unavailable
// Run with: cargo run --example moe_hybrid

use bizra_moe::OllamaConfig;
use std::time::Duration;
use synthesis_orchestrator::{Contract, SynthesisOrchestrator, Task};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter("synthesis_orchestrator=info,bizra_moe=info")
        .init();

    println!("🚀 BIZRA Genesis Node - Hybrid MOE (Production-Ready)");
    println!("====================================================\n");

    // Configure MOE with sensible production defaults
    let moe_config = OllamaConfig {
        base_url: std::env::var("OLLAMA_URL")
            .unwrap_or_else(|_| "http://localhost:11434".to_string()),
        timeout: Duration::from_secs(30),
        models: vec!["llama3.2".to_string(), "mistral-nemo".to_string()],
        min_healthy_models: 1,
        health_check_interval: Duration::from_secs(30),
        ihsan_threshold: 0.80,
    };

    println!("🔧 Configuration:");
    println!("   Ollama URL: {}", moe_config.base_url);
    println!("   Models: {:?}", moe_config.models);
    println!("   Mode: HYBRID (Auto-fallback enabled)");
    println!();

    // Create orchestrator with hybrid backend
    // This will try MOE first, then fall back to simulated if MOE fails
    println!("🏗️  Creating hybrid orchestrator...");
    let mut orchestrator =
        SynthesisOrchestrator::with_hybrid(moe_config).expect("Failed to create orchestrator");

    println!("✅ Orchestrator created\n");

    // Run multiple synthesis cycles to demonstrate resilience
    println!("Running 3 synthesis cycles to demonstrate hybrid operation...\n");

    for cycle in 1..=3 {
        println!("═══════════════════════════════════════");
        println!("🔄 Cycle {}/3", cycle);
        println!("═══════════════════════════════════════");

        // Create task
        let task = Task {
            examples: Some(vec![serde_json::json!({
                "prompt": format!("Explain quantum computing in simple terms (Cycle {})", cycle),
            })]),
        };

        // Create contract
        let contract = Contract::example();

        // Routes
        let routes = vec!["hybrid-backend".to_string()];

        let start = std::time::Instant::now();

        match orchestrator.synthesize(&task, &contract, routes).await {
            Ok(result) => {
                let duration = start.elapsed();

                println!("✅ Success - {:?}", duration);
                println!("   Model: {}", result.winner.model);
                println!("   Ihsān: {:.2}%", result.winner.scores.ihsan * 100.0);
                println!("   Cost: ${:.6}", result.winner.cost_usd);
                println!("   Latency: {}ms", result.winner.latency_ms);
            }
            Err(e) => {
                println!("❌ Failed: {}", e);
            }
        }

        println!();

        // Small delay between cycles
        if cycle < 3 {
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    }

    // Get and display MOE metrics if using real backend
    println!("═══════════════════════════════════════");
    println!("📊 Final Metrics");
    println!("═══════════════════════════════════════");

    // Note: In a real implementation, you would access the backend's metrics here
    println!("✅ Hybrid mode demonstrated successfully!");
    println!("\n💡 Key Benefits:");
    println!("   • Automatic failover to simulated backend");
    println!("   • Zero downtime during Ollama maintenance");
    println!("   • Gradual rollout capability");
    println!("   • Production-ready resilience");

    Ok(())
}
