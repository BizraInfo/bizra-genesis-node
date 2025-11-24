// BIZRA Genesis Node - Ollama Provider Demo
//
// Demonstrates using the Ollama provider for local AI model inference.
//
// Prerequisites:
// 1. Install Ollama: https://ollama.ai
// 2. Pull a model: `ollama pull llama3`
// 3. Verify Ollama is running: `ollama list`
//
// Run this example:
// ```bash
// cargo run --example ollama_demo
// ```

use bizra_genesis_node::models::{CompletionOptions, ModelProvider, OllamaConfig, OllamaProvider};
use std::error::Error;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("🚀 BIZRA Genesis Node - Ollama Provider Demo");
    info!("=".repeat(60));

    // Create Ollama provider with default config
    let provider = OllamaProvider::new("http://localhost:11434");

    // Step 1: Health check
    info!("\n📊 Step 1: Health Check");
    info!("-".repeat(60));

    match provider.health_check().await {
        Ok(health) => {
            info!("✅ Provider: {}", health.provider);
            info!("✅ Status: {:?}", health.status);
            if let Some(latency) = health.latency_ms {
                info!("✅ Latency: {}ms", latency);
            }
            if let Some(count) = health.available_models {
                info!("✅ Available models: {}", count);
            }
        }
        Err(e) => {
            eprintln!("❌ Health check failed: {}", e);
            eprintln!("\n💡 Make sure Ollama is running:");
            eprintln!("   1. Install Ollama from https://ollama.ai");
            eprintln!("   2. Start Ollama service");
            eprintln!("   3. Pull a model: ollama pull llama3");
            return Err(e.into());
        }
    }

    // Step 2: List available models
    info!("\n📋 Step 2: List Available Models");
    info!("-".repeat(60));

    let models = provider.list_models().await?;
    if models.is_empty() {
        eprintln!("❌ No models found!");
        eprintln!("\n💡 Pull a model first:");
        eprintln!("   ollama pull llama3");
        return Ok(());
    }

    for (i, model) in models.iter().enumerate() {
        info!("  {}. {}", i + 1, model.name);
        info!("     Provider: {}", model.provider);
        info!("     Context Length: {} tokens", model.context_length);
        info!("     Streaming: {}", model.supports_streaming);
        if !model.capabilities.is_empty() {
            info!("     Capabilities: {}", model.capabilities.join(", "));
        }
    }

    // Use the first available model
    let model_name = &models[0].name;
    info!("\n🎯 Using model: {}", model_name);

    // Step 3: Get model info
    info!("\n🔍 Step 3: Model Information");
    info!("-".repeat(60));

    let model_info = provider.model_info(model_name).await?;
    info!("Model: {}", model_info.name);
    info!("Context Length: {} tokens", model_info.context_length);
    info!("Cost (per 1K tokens):");
    info!("  Input: ${:.4}", model_info.cost_per_1k_input);
    info!("  Output: ${:.4}", model_info.cost_per_1k_output);
    if let Some(max_output) = model_info.max_output_tokens {
        info!("Max Output Tokens: {}", max_output);
    }

    // Step 4: Simple completion
    info!("\n💬 Step 4: Simple Completion (Non-Streaming)");
    info!("-".repeat(60));

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

    // Calculate cost (should be 0 for local Ollama)
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
    info!("-".repeat(60));

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

    // Step 6: Creative vs Deterministic
    info!("\n🎨 Step 6: Comparing Temperature Settings");
    info!("-".repeat(60));

    let creative_prompt = "Complete this sentence: The future of AI will be";
    info!("Prompt: \"{}\"", creative_prompt);

    // Creative (high temperature)
    info!("\n🎨 Creative (temperature=1.2):");
    let creative_options = CompletionOptions::creative();
    let creative_response = provider
        .complete(model_name, creative_prompt, &creative_options)
        .await?;
    info!("\"{}\"", creative_response.content.trim());

    // Deterministic (low temperature)
    info!("\n🎯 Deterministic (temperature=0.1):");
    let deterministic_options = CompletionOptions::deterministic();
    let deterministic_response = provider
        .complete(model_name, creative_prompt, &deterministic_options)
        .await?;
    info!("\"{}\"", deterministic_response.content.trim());

    // Step 7: Token estimation
    info!("\n🔢 Step 7: Token Estimation");
    info!("-".repeat(60));

    let sample_text =
        "The quick brown fox jumps over the lazy dog. This is a sample text for token estimation.";
    let estimated_tokens = provider.estimate_tokens(sample_text, None).await?;
    info!("Text: \"{}\"", sample_text);
    info!("Estimated Tokens: {}", estimated_tokens);
    info!("Characters: {}", sample_text.len());
    info!(
        "Ratio: ~{:.2} chars/token",
        sample_text.len() as f64 / estimated_tokens as f64
    );

    // Step 8: Model availability check
    info!("\n✅ Step 8: Model Availability Check");
    info!("-".repeat(60));

    let test_models = vec![model_name.as_str(), "nonexistent-model"];
    for test_model in test_models {
        let available = provider.is_model_available(test_model).await?;
        if available {
            info!("✅ {} - Available", test_model);
        } else {
            info!("❌ {} - Not Found", test_model);
        }
    }

    // Summary
    info!("\n" + &"=".repeat(60));
    info!("✅ Demo Complete!");
    info!("=".repeat(60));
    info!("The Ollama provider is working correctly.");
    info!("You can now integrate it with the BIZRA synthesis orchestrator.");

    Ok(())
}
