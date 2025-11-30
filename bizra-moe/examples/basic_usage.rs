//! # Basic Usage Example for BIZRA Multi-Model Ensemble
//!
//! This example demonstrates how to use the MOE crate to query multiple AI models
//! in parallel and synthesize their responses using harmonic synthesis.
//!
//! ## Prerequisites
//!
//! 1. Install Ollama: https://ollama.ai/
//! 2. Download models:
//!    ```bash
//!    ollama pull llama3.2
//!    ollama pull mistral-nemo
//!    ollama pull gemma2
//!    ```
//! 3. Ensure Ollama is running: `ollama serve`
//!
//! ## Running this example
//!
//! ```bash
//! cargo run --example basic_usage
//! ```

use bizra_moe::{EnsembleOrchestrator, OllamaConfig};
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing for logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    println!("🌟 BIZRA Multi-Model Ensemble - Basic Usage Example\n");

    // Configure the ensemble
    // You can customize which models to use and other settings
    let config = OllamaConfig {
        base_url: "http://localhost:11434".to_string(),
        timeout: Duration::from_secs(10),
        models: vec![
            "llama3.2".to_string(),
            "mistral-nemo".to_string(),
            "gemma2".to_string(),
        ],
        min_healthy_models: 2, // Require at least 2 healthy models
        health_check_interval: Duration::from_secs(30),
        ihsan_threshold: 0.85, // 85% quality threshold
    };

    // Create the ensemble orchestrator
    let orchestrator = EnsembleOrchestrator::with_config(config);

    println!("✅ Ensemble orchestrator initialized\n");

    // Check health status of all models
    println!("🏥 Checking model health...");
    let health_status = orchestrator.health_status().await;
    for (model, health) in &health_status {
        let status = if health.is_healthy {
            "✅ HEALTHY"
        } else {
            "❌ UNHEALTHY"
        };
        println!(
            "   {} {}: Success rate: {:.1}%",
            status,
            model,
            health.success_rate() * 100.0
        );
    }
    println!();

    // Example 1: Simple question
    println!("📝 Example 1: Simple Question");
    println!("   Prompt: \"What is the capital of France?\"");

    match orchestrator
        .generate("What is the capital of France?")
        .await
    {
        Ok(response) => {
            println!("   ✅ Response received!");
            println!("   📊 Ihsan Score: {:.2}%", response.ihsan_score * 100.0);
            println!("   ⏱️  Latency: {}ms", response.total_latency_ms);
            println!("   🤖 Contributors: {} models", response.contributors.len());
            println!("   📝 Answer: {}\n", response.text.trim());

            // Show individual model contributions
            println!("   Individual Model Responses:");
            for (i, contrib) in response.contributors.iter().enumerate() {
                println!(
                    "      {}. {} (confidence: {:.2}, latency: {}ms)",
                    i + 1,
                    contrib.model,
                    contrib.confidence,
                    contrib.latency_ms
                );
            }
            println!();
        }
        Err(e) => {
            eprintln!("   ❌ Error: {}\n", e);
        }
    }

    // Example 2: More complex question
    println!("📝 Example 2: Complex Question");
    println!("   Prompt: \"Explain quantum computing in simple terms.\"");

    match orchestrator
        .generate("Explain quantum computing in simple terms.")
        .await
    {
        Ok(response) => {
            println!("   ✅ Response received!");
            println!("   📊 Ihsan Score: {:.2}%", response.ihsan_score * 100.0);
            println!("   ⏱️  Latency: {}ms", response.total_latency_ms);
            println!("   🤖 Contributors: {} models", response.contributors.len());
            println!("   📝 Answer: {}\n", response.text.trim());
        }
        Err(e) => {
            eprintln!("   ❌ Error: {}\n", e);
        }
    }

    // Example 3: Check final health status
    println!("🏥 Final Health Check");
    let final_health = orchestrator.health_status().await;
    for (model, health) in &final_health {
        println!(
            "   {} {} - Requests: {}, Success rate: {:.1}%, Avg latency: {:.0}ms",
            if health.is_healthy { "✅" } else { "❌" },
            model,
            health.total_requests,
            health.success_rate() * 100.0,
            health.avg_latency_ms
        );
    }

    println!("\n✨ Example completed successfully!");

    Ok(())
}
