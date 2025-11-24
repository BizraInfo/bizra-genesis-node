// BIZRA Genesis Node - Multi-Provider Registry Demo
//
// Demonstrates the provider registry for intelligent multi-provider orchestration.
// Shows automatic model selection, fallback, cost optimization, and health monitoring.
//
// Prerequisites:
// 1. Set OPENAI_API_KEY environment variable (for OpenAI)
// 2. Set ANTHROPIC_API_KEY environment variable (for Claude 3)
// 3. Install and run Ollama with a model (for local inference)
//
// Run this example:
// ```bash
// OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-ant-... cargo run --example multi_provider_demo
// ```

use bizra_genesis_node::models::{
    AnthropicConfig, AnthropicProvider, CompletionOptions, ModelRequirements, OllamaProvider,
    OpenAIConfig, OpenAIProvider, ProviderRegistry, SelectionStrategy,
};
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

    info!("🚀 BIZRA Genesis Node - Multi-Provider Registry Demo");
    info!("=".repeat(70));

    // Create provider registry
    let registry = ProviderRegistry::new();

    // Step 1: Register providers
    info!("\n📋 Step 1: Registering Providers");
    info!("-".repeat(70));

    // Register Ollama (local, high priority for cost)
    info!("Registering Ollama (local inference)...");
    let ollama = OllamaProvider::new("http://localhost:11434");
    registry.register("ollama", ollama, 5);

    // Register OpenAI (cloud, medium priority)
    if let Ok(api_key) = std::env::var("OPENAI_API_KEY") {
        info!("Registering OpenAI (GPT-4, GPT-3.5)...");
        let openai_config = OpenAIConfig::new(api_key);
        let openai = OpenAIProvider::new(openai_config);
        registry.register("openai", openai, 10);
    } else {
        info!("⚠️  OPENAI_API_KEY not set - skipping OpenAI registration");
    }

    // Register Anthropic (Claude 3, high priority for quality)
    if let Ok(api_key) = std::env::var("ANTHROPIC_API_KEY") {
        info!("Registering Anthropic (Claude 3 Opus, Sonnet, Haiku)...");
        let anthropic_config = AnthropicConfig::new(api_key);
        let anthropic = AnthropicProvider::new(anthropic_config);
        registry.register("anthropic", anthropic, 15);
    } else {
        info!("⚠️  ANTHROPIC_API_KEY not set - skipping Anthropic registration");
    }

    let providers = registry.list_providers().await;
    info!(
        "✅ Registered {} provider(s): {:?}",
        providers.len(),
        providers
    );

    // Step 2: Health check all providers
    info!("\n📊 Step 2: Provider Health Check");
    info!("-".repeat(70));

    let health_results = registry.check_all_health().await;
    for (name, health) in &health_results {
        info!(
            "  {} - Status: {:?}, Latency: {}ms, Models: {}",
            name, health.status, health.latency_ms, health.models_available
        );
    }

    // Step 3: List all available models
    info!("\n📚 Step 3: Discovering All Models");
    info!("-".repeat(70));

    let all_models = registry.list_all_models().await?;
    info!(
        "Found {} total models across all providers",
        all_models.len()
    );

    // Group by provider
    let mut by_provider: std::collections::HashMap<String, Vec<String>> =
        std::collections::HashMap::new();
    for model in &all_models {
        by_provider
            .entry(model.provider.clone())
            .or_insert_with(Vec::new)
            .push(model.name.clone());
    }

    for (provider, models) in by_provider {
        info!("\n  {} ({} models):", provider, models.len());
        for (i, model) in models.iter().take(5).enumerate() {
            info!("    {}. {}", i + 1, model);
        }
        if models.len() > 5 {
            info!("    ... and {} more", models.len() - 5);
        }
    }

    // Step 4: Intelligent model selection strategies
    info!("\n🎯 Step 4: Intelligent Model Selection");
    info!("-".repeat(70));

    // Strategy 1: Cost-optimized (cheapest)
    info!("\n💰 Cost-Optimized Selection:");
    let cost_req = ModelRequirements {
        strategy: SelectionStrategy::CostOptimized,
        ..Default::default()
    };
    match registry.select_model(&cost_req).await {
        Ok(selected) => {
            info!(
                "  Selected: {} from {}",
                selected.model_name, selected.provider_name
            );
            info!(
                "  Cost: ${:.6}/1K input, ${:.6}/1K output",
                selected.model_info.cost_per_1k_input, selected.model_info.cost_per_1k_output
            );
        }
        Err(e) => info!("  Failed: {}", e),
    }

    // Strategy 2: Quality-optimized (best model)
    info!("\n🏆 Quality-Optimized Selection:");
    let quality_req = ModelRequirements {
        strategy: SelectionStrategy::QualityOptimized,
        ..Default::default()
    };
    match registry.select_model(&quality_req).await {
        Ok(selected) => {
            info!(
                "  Selected: {} from {}",
                selected.model_name, selected.provider_name
            );
            info!("  Context: {} tokens", selected.model_info.context_length);
        }
        Err(e) => info!("  Failed: {}", e),
    }

    // Strategy 3: Local-first (fastest)
    info!("\n⚡ Local-First Selection:");
    let local_req = ModelRequirements {
        strategy: SelectionStrategy::LocalFirst,
        ..Default::default()
    };
    match registry.select_model(&local_req).await {
        Ok(selected) => {
            info!(
                "  Selected: {} from {}",
                selected.model_name, selected.provider_name
            );
            info!(
                "  Latency: {} (local inference)",
                if selected.provider_name == "ollama" {
                    "Low"
                } else {
                    "Network"
                }
            );
        }
        Err(e) => info!("  Failed: {}", e),
    }

    // Step 5: Constrained model selection
    info!("\n🔍 Step 5: Constrained Model Selection");
    info!("-".repeat(70));

    // Requirement: Cheap model with at least 8K context
    info!("\nRequirement: Max $0.005/1K total, min 8K context");
    let constrained_req = ModelRequirements {
        min_context_length: Some(8000),
        max_cost_per_1k: Some(0.005),
        strategy: SelectionStrategy::CostOptimized,
        ..Default::default()
    };

    match registry.select_model(&constrained_req).await {
        Ok(selected) => {
            info!(
                "  ✅ Found: {} from {}",
                selected.model_name, selected.provider_name
            );
            info!(
                "  Context: {} tokens, Cost: ${:.6}/1K",
                selected.model_info.context_length,
                selected.model_info.cost_per_1k_input + selected.model_info.cost_per_1k_output
            );
        }
        Err(e) => info!("  ❌ No model meets requirements: {}", e),
    }

    // Step 6: Auto-completion with intelligent selection
    info!("\n💬 Step 6: Auto-Completion with Intelligent Selection");
    info!("-".repeat(70));

    let prompt = "What is the capital of France?";
    info!("Prompt: \"{}\"", prompt);
    info!("Strategy: Cost-optimized (cheapest available model)");

    let options = CompletionOptions {
        temperature: 0.7,
        max_tokens: 50,
        ..Default::default()
    };

    match registry.complete(prompt, &cost_req, &options).await {
        Ok(response) => {
            info!("\n📝 Response:");
            info!("{}", response.content);
            info!("\n📊 Metrics:");
            info!("  Model: {} ({})", response.model, response.provider);
            info!("  Tokens: {}", response.usage.total_tokens);
            info!("  Latency: {}ms", response.latency_ms);

            // Calculate cost
            if let Ok(cost) = registry
                .calculate_cost(
                    &response.provider,
                    &response.model,
                    response.usage.input_tokens,
                    response.usage.output_tokens,
                )
                .await
            {
                info!("  Cost: ${:.6}", cost);
            }
        }
        Err(e) => {
            info!("❌ Completion failed: {}", e);
            info!("\n💡 Make sure at least one provider is available:");
            info!("   - Ollama: Install and pull a model (ollama pull llama3)");
            info!("   - OpenAI: Set OPENAI_API_KEY environment variable");
        }
    }

    // Step 7: Provider management
    info!("\n⚙️  Step 7: Dynamic Provider Management");
    info!("-".repeat(70));

    if providers.contains(&"ollama".to_string()) {
        info!("Disabling Ollama provider...");
        registry.disable_provider("ollama").await?;
        info!("✅ Ollama disabled");

        let active_providers = registry.list_providers().await;
        info!("Active providers: {:?}", active_providers);

        info!("Re-enabling Ollama provider...");
        registry.enable_provider("ollama").await?;
        info!("✅ Ollama re-enabled");
    }

    // Step 8: Cost comparison
    info!("\n💰 Step 8: Cost Comparison Across Providers");
    info!("-".repeat(70));

    let test_tokens = (1000, 500); // (input, output)
    info!(
        "Calculating cost for {} input + {} output tokens:",
        test_tokens.0, test_tokens.1
    );

    for provider in &providers {
        // Get a sample model from this provider
        if let Ok(models) = registry.list_all_models().await {
            if let Some(model) = models.iter().find(|m| m.provider == *provider) {
                if let Ok(cost) = registry
                    .calculate_cost(provider, &model.name, test_tokens.0, test_tokens.1)
                    .await
                {
                    info!("  {} ({}): ${:.6}", provider, model.name, cost);
                }
            }
        }
    }

    // Summary
    info!("\n" + &"=".repeat(70));
    info!("✅ Multi-Provider Demo Complete!");
    info!("=".repeat(70));
    info!("\n🎯 Key Features Demonstrated:");
    info!("  ✅ Multi-provider registration (Ollama + OpenAI)");
    info!("  ✅ Health monitoring across all providers");
    info!("  ✅ Model discovery ({}+ models)", all_models.len());
    info!("  ✅ Intelligent selection strategies:");
    info!("     - Cost-optimized (cheapest)");
    info!("     - Quality-optimized (best)");
    info!("     - Local-first (fastest)");
    info!("     - Constrained (requirements-based)");
    info!("  ✅ Auto-completion with provider selection");
    info!("  ✅ Dynamic provider enable/disable");
    info!("  ✅ Cost comparison and tracking");

    info!("\n💡 Production Use Cases:");
    info!("  • Use local models (Ollama) for development/testing");
    info!("  • Use GPT-3.5 for cost-effective production");
    info!("  • Use GPT-4 for highest quality when needed");
    info!("  • Automatic failover between providers");
    info!("  • Budget-aware model selection");

    Ok(())
}
