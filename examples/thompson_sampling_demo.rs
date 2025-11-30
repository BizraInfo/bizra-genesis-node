// BIZRA Genesis Node - Thompson Sampling Integration Demo
//
// Demonstrates live adaptive model routing with statistical rigor:
// - Thompson Sampling for multi-armed bandit optimization
// - Real-time performance tracking and adaptation
// - Cost-aware routing decisions
// - Bayesian inference (Beta distributions)
// - Performance-based model selection
//
// Run this example:
// ```bash
// cargo run --example thompson_sampling_demo
// ```

use bizra_genesis_node::models::{
    CompletionOptions, CompletionResponse, FinishReason, HealthStatus, ModelError, ModelInfo,
    ModelProvider, ModelResult, ProviderHealth, ThompsonConfig, ThompsonSamplingRouter, TokenUsage,
};
use std::error::Error;
use std::iter;
use std::sync::Arc;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

// ============================================================================
// Mock Model Provider for Demo
// ============================================================================

struct MockProvider {
    model_id: String,
    quality_mean: f64,
    latency_mean: u64,
}

impl MockProvider {
    fn new(model_id: &str, quality_mean: f64, latency_mean: u64) -> Self {
        Self {
            model_id: model_id.to_string(),
            quality_mean,
            latency_mean,
        }
    }
}

#[async_trait::async_trait]
impl ModelProvider for MockProvider {
    async fn complete(
        &self,
        _model: &str,
        prompt: &str,
        _options: &CompletionOptions,
    ) -> ModelResult<CompletionResponse> {
        // Simulate variable latency
        let latency_ms = self.latency_mean + (rand::random::<u64>() % 500);
        tokio::time::sleep(tokio::time::Duration::from_millis(latency_ms)).await;

        // Simulate variable quality (with noise)
        let quality_variation = (rand::random::<f64>() - 0.5) * 0.2;
        let _simulated_quality = (self.quality_mean + quality_variation).clamp(0.0, 1.0);

        Ok(CompletionResponse {
            content: format!("Response from {} to: {}", self.model_id, prompt),
            model: self.model_id.clone(),
            provider: "mock".to_string(),
            usage: TokenUsage::new(50, 150 + (rand::random::<usize>() % 100)),
            finish_reason: FinishReason::Stop,
            latency_ms,
            timestamp_ms: chrono::Utc::now().timestamp_millis() as u64,
            metadata: std::collections::HashMap::new(),
        })
    }

    async fn list_models(&self) -> ModelResult<Vec<ModelInfo>> {
        Ok(vec![])
    }

    async fn health_check(&self) -> ModelResult<ProviderHealth> {
        Ok(ProviderHealth {
            status: HealthStatus::Healthy,
            provider: "mock".to_string(),
            latency_ms: 10,
            models_available: 1,
            error: None,
            details: std::collections::HashMap::new(),
        })
    }

    fn provider_name(&self) -> &str {
        "mock"
    }

    async fn complete_stream(
        &self,
        _model: &str,
        _prompt: &str,
        _options: &CompletionOptions,
    ) -> ModelResult<
        std::pin::Pin<
            Box<
                dyn futures::Stream<Item = ModelResult<bizra_genesis_node::models::StreamChunk>>
                    + Send,
            >,
        >,
    > {
        // Not implemented for demo
        Err(ModelError::ProviderError(
            "Streaming not implemented".to_string(),
        ))
    }

    async fn model_info(&self, _model: &str) -> ModelResult<ModelInfo> {
        Ok(ModelInfo::new(&self.model_id, "mock", 4096))
    }
}

// ============================================================================
// Demo Main
// ============================================================================

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("🚀 BIZRA Genesis Node - Thompson Sampling Integration Demo");
    info!("{}", iter::repeat("=").take(70).collect::<String>());

    // Step 1: Create Thompson Sampling router
    info!("\n📊 Step 1: Initialize Thompson Sampling Router");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let config = ThompsonConfig {
        initial_alpha: 1.0,
        initial_beta: 1.0,
        success_threshold: 0.85,
        cost_aware: true,
        max_cost_per_request: Some(0.10),
        min_samples: 5,
        ..Default::default()
    };

    info!("Configuration:");
    info!("  • Success threshold: {:.2}", config.success_threshold);
    info!("  • Cost-aware routing: {}", config.cost_aware);
    info!(
        "  • Max cost/request: ${:.2}",
        config.max_cost_per_request.unwrap()
    );
    info!("  • Minimum samples: {}", config.min_samples);

    let router = ThompsonSamplingRouter::new(config);

    // Step 2: Register model providers
    info!("\n🔧 Step 2: Register Model Providers");
    info!("{}", "-".repeat(70));

    // Model A: High quality, slow, expensive (GPT-4 profile)
    let provider_a = Arc::new(MockProvider::new("gpt-4", 0.92, 1800));
    router
        .register_model("gpt-4".to_string(), provider_a)
        .await?;
    info!("✅ Registered: gpt-4 (high quality, slower)");

    // Model B: Medium quality, fast, cheap (GPT-3.5 profile)
    let provider_b = Arc::new(MockProvider::new("gpt-3.5-turbo", 0.82, 800));
    router
        .register_model("gpt-3.5-turbo".to_string(), provider_b)
        .await?;
    info!("✅ Registered: gpt-3.5-turbo (medium quality, faster)");

    // Model C: High quality, medium speed (Claude-3-Opus profile)
    let provider_c = Arc::new(MockProvider::new("claude-3-opus", 0.95, 1500));
    router
        .register_model("claude-3-opus".to_string(), provider_c)
        .await?;
    info!("✅ Registered: claude-3-opus (highest quality, balanced)");

    // Model D: Good quality, very fast (Claude-3-Haiku profile)
    let provider_d = Arc::new(MockProvider::new("claude-3-haiku", 0.88, 600));
    router
        .register_model("claude-3-haiku".to_string(), provider_d)
        .await?;
    info!("✅ Registered: claude-3-haiku (good quality, fastest)");

    // Step 3: Initial exploration phase
    info!("\n🎲 Step 3: Initial Exploration Phase (20 requests)");
    info!("{}", "-".repeat(70));

    let options = CompletionOptions::default();

    for i in 1..=20 {
        let prompt = format!("Test query {}", i);

        match router.complete(&prompt, &options).await {
            Ok(response) => {
                if i <= 5 || i % 5 == 0 {
                    info!(
                        "  Request {}: {} ({}ms)",
                        i, response.model, response.latency_ms
                    );
                }
            }
            Err(e) => {
                info!("  Request {} failed: {}", i, e);
            }
        }
    }

    // Step 4: Show initial statistics
    info!("\n📈 Step 4: Performance Statistics After Exploration");
    info!("{}", "-".repeat(70));

    let stats = router.get_statistics().await;

    for (model_id, perf) in &stats {
        info!("\nModel: {}", model_id);
        info!("  • Total requests: {}", perf.total_requests);
        info!("  • Success rate: {:.2}%", perf.success_rate() * 100.0);
        info!("  • Avg quality: {:.3}", perf.avg_quality);
        info!("  • Avg latency: {:.0}ms", perf.avg_latency);
        info!("  • Avg cost: ${:.4}", perf.avg_cost);

        let (lower, upper) = perf.confidence_interval();
        info!("  • 95% CI: ({:.3}, {:.3})", lower.max(0.0), upper.min(1.0));
    }

    // Step 5: Exploitation phase
    info!("\n🎯 Step 5: Exploitation Phase (30 requests)");
    info!("{}", "-".repeat(70));
    info!("Thompson Sampling will favor high-performing models...\n");

    let mut model_selections: std::collections::HashMap<String, usize> =
        std::collections::HashMap::new();

    for i in 1..=30 {
        let prompt = format!("Production query {}", i);

        match router.complete(&prompt, &options).await {
            Ok(response) => {
                *model_selections.entry(response.model.clone()).or_insert(0) += 1;

                if i <= 5 || i % 10 == 0 {
                    info!(
                        "  Request {}: {} ({}ms)",
                        i, response.model, response.latency_ms
                    );
                }
            }
            Err(e) => {
                info!("  Request {} failed: {}", i, e);
            }
        }
    }

    info!("\nModel Selection Distribution:");
    let mut selections: Vec<_> = model_selections.iter().collect();
    selections.sort_by_key(|(_, count)| std::cmp::Reverse(**count));

    for (model, count) in selections {
        let percentage = (*count as f64 / 30.0) * 100.0;
        info!("  • {}: {} selections ({:.1}%)", model, count, percentage);
    }

    // Step 6: Final statistics
    info!("\n📊 Step 6: Final Performance Statistics");
    info!("{}", "-".repeat(70));

    let final_stats = router.get_statistics().await;

    for (model_id, perf) in &final_stats {
        info!("\nModel: {}", model_id);
        info!("  • Total requests: {}", perf.total_requests);
        info!("  • Success rate: {:.2}%", perf.success_rate() * 100.0);
        info!("  • Alpha: {:.1}, Beta: {:.1}", perf.alpha, perf.beta);
        info!("  • Avg quality: {:.3}", perf.avg_quality);
        info!("  • Avg latency: {:.0}ms", perf.avg_latency);
        info!("  • Avg cost: ${:.4}", perf.avg_cost);
    }

    // Step 7: Leaderboard
    info!("\n🏆 Step 7: Model Leaderboard");
    info!("{}", "-".repeat(70));

    let leaderboard = router.get_leaderboard().await;

    info!("\nRanked by success rate:\n");
    for (rank, (model_id, success_rate, requests)) in leaderboard.iter().enumerate() {
        let medal = match rank {
            0 => "🥇",
            1 => "🥈",
            2 => "🥉",
            _ => "  ",
        };

        info!(
            "  {} #{} - {}: {:.2}% ({} requests)",
            medal,
            rank + 1,
            model_id,
            success_rate * 100.0,
            requests
        );
    }

    // Step 8: Adaptation demonstration
    info!("\n🔄 Step 8: Adaptation Demonstration");
    info!("{}", "-".repeat(70));
    info!("Running 10 more requests to show continued adaptation...\n");

    for i in 1..=10 {
        let prompt = format!("Adaptation test {}", i);

        match router.complete(&prompt, &options).await {
            Ok(response) => {
                info!(
                    "  Request {}: {} ({}ms, {} tokens)",
                    i, response.model, response.latency_ms, response.usage.total_tokens
                );
            }
            Err(e) => {
                info!("  Request {} failed: {}", i, e);
            }
        }
    }

    // Final summary
    info!("\n{}", "=".repeat(70));
    info!("✅ Thompson Sampling Integration Demo Complete!");
    info!("{}", "=".repeat(70));

    let total_requests: usize = final_stats.values().map(|p| p.total_requests).sum();

    info!("\n🎯 Summary:");
    info!("  • Total requests: {}", total_requests + 10);
    info!("  • Models evaluated: {}", final_stats.len());

    // Find best model
    if let Some((best_model, best_rate, _)) = leaderboard.first() {
        info!(
            "  • Best performing model: {} ({:.1}% success rate)",
            best_model,
            best_rate * 100.0
        );
    }

    info!("\n💡 Key Features Demonstrated:");
    info!("  ✅ Thompson Sampling algorithm (Beta distributions)");
    info!("  ✅ Exploration vs exploitation trade-off");
    info!("  ✅ Real-time performance tracking");
    info!("  ✅ Bayesian inference with confidence intervals");
    info!("  ✅ Adaptive model selection");
    info!("  ✅ Cost-aware routing decisions");
    info!("  ✅ Performance leaderboard");

    info!("\n🚀 Production Benefits:");
    info!("  • Automatically finds best model for your workload");
    info!("  • Adapts to performance changes over time");
    info!("  • Balances exploration of new models vs exploitation of proven ones");
    info!("  • Statistically rigorous (Bayesian inference)");
    info!("  • Cost-aware (respects budget constraints)");
    info!("  • Zero-downtime model switching");

    info!("\n🔗 Integration:");
    info!("  • Works with all providers (Ollama, OpenAI, Anthropic)");
    info!("  • Integrates with rate limiting and streaming");
    info!("  • Compatible with A/B testing framework");
    info!("  • Real-time performance metrics");
    info!("  • Production-ready thread safety");

    Ok(())
}
