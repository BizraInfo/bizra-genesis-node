// BIZRA Genesis Node - OpenAI Provider Demo
//
// Demonstrates using the OpenAI provider for GPT-4 and GPT-3.5 Turbo.
//
// Prerequisites:
// 1. Set OPENAI_API_KEY environment variable
// 2. Ensure you have API credits
//
// Run this example:
// ```bash
// OPENAI_API_KEY=sk-... cargo run --example openai_demo
// ```

use bizra_genesis_node::models::{CompletionOptions, ModelProvider, OpenAIConfig, OpenAIProvider};
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

    info!("🚀 BIZRA Genesis Node - OpenAI Provider Demo");
    info!("{}", iter::repeat("=").take(60).collect::<String>());

    // Get API key from environment
    let api_key = match std::env::var("OPENAI_API_KEY") {
        Ok(key) => key,
        Err(_) => {
            eprintln!("❌ OPENAI_API_KEY environment variable not set");
            eprintln!("\n💡 Set your API key:");
            eprintln!("   export OPENAI_API_KEY=sk-...");
            eprintln!("   or");
            eprintln!("   $env:OPENAI_API_KEY=\"sk-...\"  # PowerShell");
            return Ok(());
        }
    };

    // Create OpenAI provider
    let config = OpenAIConfig::new(api_key);
    let provider = OpenAIProvider::new(config);

    // Step 1: Health check
    info!("\n📊 Step 1: Health Check");
    info!("{}", iter::repeat("-").take(60).collect::<String>());

    match provider.health_check().await {
        Ok(health) => {
            info!("✅ Provider: {}", health.provider);
            info!("✅ Status: {:?}", health.status);
            info!("✅ Latency: {}ms", health.latency_ms);
            if health.models_available > 0 {
                info!("✅ Available models: {}", health.models_available);
            }
        }
        Err(e) => {
            eprintln!("❌ Health check failed: {}", e);
            eprintln!("\n💡 Check your API key and internet connection");
            return Err(e.into());
        }
    }

    // Step 2: List available models
    info!("\n📋 Step 2: List Available GPT Models");
    info!("{}", iter::repeat("-").take(60).collect::<String>());

    let models = provider.list_models().await?;
    info!("Found {} GPT models:", models.len());

    for (i, model) in models.iter().take(10).enumerate() {
        info!("  {}. {}", i + 1, model.name);
        info!("     Context: {} tokens", model.context_length);
        info!(
            "     Cost: ${:.4}/1K in, ${:.4}/1K out",
            model.cost_per_1k_input, model.cost_per_1k_output
        );
        if let Some(ref family) = model.family {
            info!("     Family: {}", family);
        }
    }

    // Step 3: Model information
    info!("\n🔍 Step 3: GPT-3.5 Turbo Information");
    info!("{}", iter::repeat("-").take(60).collect::<String>());

    let model_name = "gpt-3.5-turbo";
    let model_info = provider.model_info(model_name).await?;

    info!("Model: {}", model_info.name);
    info!("Context Length: {} tokens", model_info.context_length);
    info!("Cost (per 1K tokens):");
    info!("  Input: ${:.6}", model_info.cost_per_1k_input);
    info!("  Output: ${:.6}", model_info.cost_per_1k_output);
    info!("Capabilities: {}", model_info.capabilities.join(", "));

    // Step 4: Simple completion
    info!("\n💬 Step 4: Simple Completion (Non-Streaming)");
    info!("{}", iter::repeat("-").take(60).collect::<String>());

    let prompt = "What is the capital of France? Answer in one sentence.";
    info!("Prompt: \"{}\"", prompt);

    let options = CompletionOptions {
        temperature: 0.7,
        max_tokens: 100,
        top_p: 0.9,
        ..Default::default()
    };

    info!("Generating response...");
    let response = provider.complete(model_name, prompt, &options).await?;

    info!("\n📝 Response:");
    info!("{}", response.content);
    info!("\n📊 Metrics:");
    info!("  Model: {}", response.model);
    info!("  Input Tokens: {}", response.usage.input_tokens);
    info!("  Output Tokens: {}", response.usage.output_tokens);
    info!("  Total Tokens: {}", response.usage.total_tokens);
    info!("  Latency: {}ms", response.latency_ms);
    info!("  Finish Reason: {:?}", response.finish_reason);

    // Calculate cost
    let cost = provider
        .calculate_cost(
            model_name,
            response.usage.input_tokens,
            response.usage.output_tokens,
        )
        .await?;
    info!("  Cost: ${:.6}", cost);

    // Step 5: Streaming completion
    info!("\n🌊 Step 5: Streaming Completion");
    info!("{}", iter::repeat("-").take(60).collect::<String>());

    let prompt = "Explain quantum computing in 2-3 sentences.";
    info!("Prompt: \"{}\"", prompt);
    info!("Streaming response...\n");

    let mut stream = provider
        .complete_stream(model_name, prompt, &options)
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
                    info!("📊 Stream Metrics:");
                    info!("  Chunks Received: {}", chunk_count);
                    info!("  Response Length: {} chars", full_response.len());
                }
            }
            Err(e) => {
                eprintln!("\n❌ Stream error: {}", e);
                break;
            }
        }
    }

    // Step 6: Cost comparison across models
    info!("\n💰 Step 6: Cost Comparison");
    info!("{}", iter::repeat("-").take(60).collect::<String>());

    let test_tokens = (1000, 500); // (input, output)
    let models_to_compare = vec!["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"];

    info!(
        "For {} input tokens and {} output tokens:",
        test_tokens.0, test_tokens.1
    );
    for model in models_to_compare {
        let cost = provider
            .calculate_cost(model, test_tokens.0, test_tokens.1)
            .await?;
        info!("  {}: ${:.6}", model, cost);
    }

    // Step 7: Temperature comparison
    info!("\n🎨 Step 7: Temperature Comparison");
    info!("{}", iter::repeat("-").take(60).collect::<String>());

    let creative_prompt = "Complete this sentence: The future of AI will be";
    info!("Prompt: \"{}\"", creative_prompt);

    // Creative (high temperature)
    info!("\n🎨 Creative (temperature=1.5):");
    let creative_options = CompletionOptions {
        temperature: 1.5,
        max_tokens: 50,
        ..Default::default()
    };
    let creative_response = provider
        .complete(model_name, creative_prompt, &creative_options)
        .await?;
    info!("\"{}\"", creative_response.content.trim());

    // Deterministic (low temperature)
    info!("\n🎯 Deterministic (temperature=0.1):");
    let deterministic_options = CompletionOptions {
        temperature: 0.1,
        max_tokens: 50,
        ..Default::default()
    };
    let deterministic_response = provider
        .complete(model_name, creative_prompt, &deterministic_options)
        .await?;
    info!("\"{}\"", deterministic_response.content.trim());

    // Step 8: Token estimation
    info!("\n🔢 Step 8: Token Estimation");
    info!("{}", iter::repeat("-").take(60).collect::<String>());

    let sample_text =
        "The quick brown fox jumps over the lazy dog. This is a sample text for token estimation.";
    let estimated_tokens = provider
        .estimate_tokens(sample_text, Some(model_name))
        .await?;
    info!("Text: \"{}\"", sample_text);
    info!("Estimated Tokens: {}", estimated_tokens);
    info!("Characters: {}", sample_text.len());
    info!(
        "Ratio: ~{:.2} chars/token",
        sample_text.len() as f64 / estimated_tokens as f64
    );

    // Step 9: Model availability check
    info!("\n✅ Step 9: Model Availability Check");
    info!("{}", iter::repeat("-").take(60).collect::<String>());

    let test_models = vec!["gpt-4-turbo", "gpt-3.5-turbo", "nonexistent-model"];
    for test_model in test_models {
        let available = provider.is_model_available(test_model).await?;
        if available {
            info!("✅ {} - Available", test_model);
        } else {
            info!("❌ {} - Not Found", test_model);
        }
    }

    // Summary
    info!("\n{}", iter::repeat("=").take(60).collect::<String>());
    info!("✅ Demo Complete!");
    info!("{}", iter::repeat("=").take(60).collect::<String>());
    info!("The OpenAI provider is working correctly.");
    info!("You can now integrate it with the BIZRA synthesis orchestrator.");
    info!("\n💡 Pro Tips:");
    info!("  - Use gpt-3.5-turbo for cost-effective testing");
    info!("  - Use gpt-4-turbo for production quality");
    info!("  - Monitor costs with calculate_cost()");
    info!("  - Use streaming for better UX");

    Ok(())
}
