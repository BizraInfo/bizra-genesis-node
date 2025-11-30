// BIZRA Genesis Node - Anthropic Claude 3 Provider Demo
//
// Demonstrates using the Anthropic provider for Claude 3 models (Opus, Sonnet, Haiku).
//
// Prerequisites:
// 1. Get an Anthropic API key from https://console.anthropic.com/
// 2. Set ANTHROPIC_API_KEY environment variable
//
// Run this example:
// ```bash
// ANTHROPIC_API_KEY=sk-ant-... cargo run --example anthropic_demo
// ```

use bizra_genesis_node::models::{
    AnthropicConfig, AnthropicProvider, CompletionOptions, ModelProvider,
};
use std::error::Error;
use std::iter;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("🚀 BIZRA Genesis Node - Anthropic Claude 3 Provider Demo");
    info!("{}", iter::repeat("=").take(70).collect::<String>());

    // Check for API key
    let api_key = match std::env::var("ANTHROPIC_API_KEY") {
        Ok(key) => key,
        Err(_) => {
            eprintln!("❌ ANTHROPIC_API_KEY environment variable not set");
            eprintln!("\n💡 Get your API key from https://console.anthropic.com/");
            eprintln!("   Then run:");
            eprintln!("   ANTHROPIC_API_KEY=sk-ant-... cargo run --example anthropic_demo");
            return Ok(());
        }
    };

    // Create Anthropic provider
    let config = AnthropicConfig::new(api_key);
    let provider = AnthropicProvider::new(config);

    // Step 1: Health check
    info!("\n📊 Step 1: Health Check");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    match provider.health_check().await {
        Ok(health) => {
            info!("✅ Provider: {}", health.provider);
            info!("✅ Status: {:?}", health.status);
            info!("✅ Latency: {}ms", health.latency_ms);
            info!("✅ Available models: {}", health.models_available);
        }
        Err(e) => {
            eprintln!("❌ Health check failed: {}", e);
            eprintln!("\n💡 Check your ANTHROPIC_API_KEY and internet connection");
            return Err(e.into());
        }
    }

    // Step 2: List available models
    info!("\n📋 Step 2: List Claude 3 Models");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let models = provider.list_models().await?;
    for (i, model) in models.iter().enumerate() {
        info!("  {}. {}", i + 1, model.name);
        info!("     Provider: {}", model.provider);
        info!("     Context Length: {} tokens", model.context_length);
        info!(
            "     Cost: ${:.5}/1K input, ${:.5}/1K output",
            model.cost_per_1k_input, model.cost_per_1k_output
        );
        info!(
            "     Streaming: {}",
            model.capabilities.contains(&"streaming".to_string())
        );
        if let Some(ref family) = model.family {
            info!("     Family: {}", family);
        }
        if !model.capabilities.is_empty() {
            info!("     Capabilities: {}", model.capabilities.join(", "));
        }
    }

    // Step 3: Model comparison - Haiku (fast), Sonnet (balanced), Opus (best)
    info!("\n🎯 Step 3: Model Tier Comparison");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let prompt = "Explain quantum entanglement in exactly one sentence.";
    info!("Prompt: \"{}\"", prompt);

    // Haiku - Fast and cheap
    info!("\n⚡ Claude 3 Haiku (Fast & Economical):");
    let haiku_start = std::time::Instant::now();
    let haiku_response = provider
        .complete(
            "claude-3-haiku-20240307",
            prompt,
            &CompletionOptions {
                max_tokens: 100,
                ..Default::default()
            },
        )
        .await?;
    info!("  Response: \"{}\"", haiku_response.content.trim());
    info!("  Latency: {}ms", haiku_start.elapsed().as_millis());
    info!(
        "  Tokens: {} input + {} output = {}",
        haiku_response.usage.input_tokens,
        haiku_response.usage.output_tokens,
        haiku_response.usage.total_tokens
    );
    let haiku_cost = provider
        .calculate_cost(
            "claude-3-haiku-20240307",
            haiku_response.usage.input_tokens,
            haiku_response.usage.output_tokens,
        )
        .await?;
    info!("  Cost: ${:.6}", haiku_cost);

    // Sonnet - Balanced
    info!("\n⚖️  Claude 3 Sonnet (Balanced):");
    let sonnet_start = std::time::Instant::now();
    let sonnet_response = provider
        .complete(
            "claude-3-sonnet-20240229",
            prompt,
            &CompletionOptions {
                max_tokens: 100,
                ..Default::default()
            },
        )
        .await?;
    info!("  Response: \"{}\"", sonnet_response.content.trim());
    info!("  Latency: {}ms", sonnet_start.elapsed().as_millis());
    info!(
        "  Tokens: {} input + {} output = {}",
        sonnet_response.usage.input_tokens,
        sonnet_response.usage.output_tokens,
        sonnet_response.usage.total_tokens
    );
    let sonnet_cost = provider
        .calculate_cost(
            "claude-3-sonnet-20240229",
            sonnet_response.usage.input_tokens,
            sonnet_response.usage.output_tokens,
        )
        .await?;
    info!("  Cost: ${:.6}", sonnet_cost);

    // Opus - Best quality
    info!("\n🏆 Claude 3 Opus (Highest Quality):");
    let opus_start = std::time::Instant::now();
    let opus_response = provider
        .complete(
            "claude-3-opus-20240229",
            prompt,
            &CompletionOptions {
                max_tokens: 100,
                ..Default::default()
            },
        )
        .await?;
    info!("  Response: \"{}\"", opus_response.content.trim());
    info!("  Latency: {}ms", opus_start.elapsed().as_millis());
    info!(
        "  Tokens: {} input + {} output = {}",
        opus_response.usage.input_tokens,
        opus_response.usage.output_tokens,
        opus_response.usage.total_tokens
    );
    let opus_cost = provider
        .calculate_cost(
            "claude-3-opus-20240229",
            opus_response.usage.input_tokens,
            opus_response.usage.output_tokens,
        )
        .await?;
    info!("  Cost: ${:.6}", opus_cost);

    // Step 4: Streaming completion
    info!("\n🌊 Step 4: Streaming Completion (Sonnet)");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let stream_prompt = "Write a haiku about artificial intelligence.";
    info!("Prompt: \"{}\"", stream_prompt);
    info!("Streaming response...\n");

    let mut stream = provider
        .complete_stream(
            "claude-3-sonnet-20240229",
            stream_prompt,
            &CompletionOptions {
                max_tokens: 200,
                ..Default::default()
            },
        )
        .await?;

    use futures::StreamExt;

    let mut full_response = String::new();
    let mut chunk_count = 0;

    print!("📝 ");
    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                if !chunk.delta.is_empty() {
                    print!("{}", chunk.delta);
                    full_response.push_str(&chunk.delta);
                    chunk_count += 1;
                }

                if let Some(_finish_reason) = chunk.finish_reason {
                    println!("\n");
                    if let Some(usage) = chunk.usage {
                        info!("📊 Final Metrics:");
                        info!("  Chunks Received: {}", chunk_count);
                        info!("  Input Tokens: {}", usage.input_tokens);
                        info!("  Output Tokens: {}", usage.output_tokens);
                        info!("  Total Tokens: {}", usage.total_tokens);
                    }
                }
            }
            Err(e) => {
                eprintln!("\n❌ Stream error: {}", e);
                break;
            }
        }
    }

    // Step 5: Advanced reasoning with Opus
    info!("\n🧠 Step 5: Advanced Reasoning (Opus)");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let reasoning_prompt = "If a train leaves New York at 3pm traveling 60mph, and another train leaves Boston (215 miles away) at 3:30pm traveling 80mph toward New York, when and where do they meet?";
    info!("Complex Problem: \"{}\"", reasoning_prompt);

    let reasoning_response = provider
        .complete(
            "claude-3-opus-20240229",
            reasoning_prompt,
            &CompletionOptions {
                max_tokens: 500,
                temperature: 0.3,
                ..Default::default()
            },
        )
        .await?;

    info!("\n📝 Opus Response:");
    info!("{}", reasoning_response.content);
    info!("\n📊 Metrics:");
    info!(
        "  Tokens: {} total ({} in, {} out)",
        reasoning_response.usage.total_tokens,
        reasoning_response.usage.input_tokens,
        reasoning_response.usage.output_tokens
    );
    info!("  Latency: {}ms", reasoning_response.latency_ms);
    let reasoning_cost = provider
        .calculate_cost(
            "claude-3-opus-20240229",
            reasoning_response.usage.input_tokens,
            reasoning_response.usage.output_tokens,
        )
        .await?;
    info!("  Cost: ${:.6}", reasoning_cost);

    // Step 6: Temperature comparison
    info!("\n🎨 Step 6: Temperature Comparison (Haiku)");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let creative_prompt = "Complete this sentence: The future of humanity will be";
    info!("Prompt: \"{}\"", creative_prompt);

    // Deterministic (low temperature)
    info!("\n🎯 Deterministic (temperature=0.0):");
    let deterministic_response = provider
        .complete(
            "claude-3-haiku-20240307",
            creative_prompt,
            &CompletionOptions {
                temperature: 0.0,
                max_tokens: 50,
                ..Default::default()
            },
        )
        .await?;
    info!("  \"{}\"", deterministic_response.content.trim());

    // Creative (high temperature)
    info!("\n🎨 Creative (temperature=1.0):");
    let creative_response = provider
        .complete(
            "claude-3-haiku-20240307",
            creative_prompt,
            &CompletionOptions {
                temperature: 1.0,
                max_tokens: 50,
                ..Default::default()
            },
        )
        .await?;
    info!("  \"{}\"", creative_response.content.trim());

    // Step 7: Cost analysis across models
    info!("\n💰 Step 7: Cost Analysis");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let test_tokens = (10000, 5000); // Typical synthesis workload
    info!(
        "Calculating cost for {} input + {} output tokens:",
        test_tokens.0, test_tokens.1
    );

    let haiku_cost = provider
        .calculate_cost("claude-3-haiku-20240307", test_tokens.0, test_tokens.1)
        .await?;
    let sonnet_cost = provider
        .calculate_cost("claude-3-sonnet-20240229", test_tokens.0, test_tokens.1)
        .await?;
    let opus_cost = provider
        .calculate_cost("claude-3-opus-20240229", test_tokens.0, test_tokens.1)
        .await?;

    info!("  Haiku:  ${:.4}", haiku_cost);
    info!("  Sonnet: ${:.4}", sonnet_cost);
    info!("  Opus:   ${:.4}", opus_cost);
    info!(
        "  Savings: Haiku vs Opus = {:.0}%",
        ((opus_cost - haiku_cost) / opus_cost) * 100.0
    );

    // Step 8: Token estimation
    info!("\n🔢 Step 8: Token Estimation");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let sample_text = "The BIZRA Genesis Node is a professional elite implementation of a distributed AI synthesis orchestrator. It combines multi-provider model support with intelligent routing and cost optimization.";
    let estimated_tokens = provider.estimate_tokens(sample_text, None).await?;
    info!("Text: \"{}\"", sample_text);
    info!("Estimated Tokens: {}", estimated_tokens);
    info!("Characters: {}", sample_text.len());
    info!(
        "Ratio: ~{:.2} chars/token",
        sample_text.len() as f64 / estimated_tokens as f64
    );

    // Summary
    info!("\n{}", iter::repeat("=").take(70).collect::<String>());
    info!("✅ Anthropic Claude 3 Demo Complete!");
    info!("{}", iter::repeat("=").take(70).collect::<String>());
    info!("\n🎯 Key Features Demonstrated:");
    info!("  ✅ Health monitoring");
    info!("  ✅ Three model tiers (Haiku, Sonnet, Opus)");
    info!("  ✅ Non-streaming completion");
    info!("  ✅ Streaming completion (SSE)");
    info!("  ✅ Advanced reasoning capabilities");
    info!("  ✅ Temperature control");
    info!("  ✅ Accurate cost tracking");
    info!("  ✅ Token estimation");

    info!("\n💡 Claude 3 Model Selection Guide:");
    info!("  • Haiku:  Fast & economical - Use for simple tasks, high volume");
    info!("  • Sonnet: Balanced - Use for general-purpose applications");
    info!("  • Opus:   Best quality - Use for complex reasoning, critical tasks");

    info!("\n💰 Cost Optimization:");
    info!(
        "  • Haiku is {}x cheaper than Opus",
        (opus_cost / haiku_cost) as i32
    );
    info!("  • Use provider registry for automatic cost-optimized selection");
    info!("  • Combine with Ollama (local) for 99% cost reduction in dev");

    Ok(())
}
