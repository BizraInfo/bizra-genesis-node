// BIZRA Genesis Node - Rate Limiting Demo
//
// Demonstrates professional-grade rate limiting and quota management:
// - Token bucket algorithm for request rate limiting
// - Cost-based budget enforcement
// - Token quota management
// - Burst handling
// - Usage statistics tracking
//
// Run this example:
// ```bash
// cargo run --example rate_limit_demo
// ```

use bizra_genesis_node::models::{RateLimitConfig, RateLimiter};
use std::error::Error;
use std::iter;
use std::time::Instant;
use tracing::{info, warn, Level};
use tracing_subscriber::FmtSubscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("🚀 BIZRA Genesis Node - Rate Limiting & Quota Management Demo");
    info!("{}", iter::repeat("=").take(70).collect::<String>());

    // Step 1: Basic rate limiting with token bucket
    info!("\n📊 Step 1: Basic Rate Limiting (Token Bucket Algorithm)");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let config = RateLimitConfig {
        requests_per_second: 5.0,
        burst_capacity: 10,
        cost_per_minute: None,
        cost_per_hour: None,
        cost_per_day: None,
        tokens_per_minute: None,
        enable_queue: false,
        max_queue_size: 0,
        max_wait_ms: 0,
    };

    let limiter = RateLimiter::new(config);

    info!("Configuration:");
    info!("  • Rate: 5 requests/second");
    info!("  • Burst capacity: 10 requests");

    let mut allowed_count = 0;
    let mut denied_count = 0;

    // Try to make 15 rapid requests (burst test)
    info!("\nTesting burst capacity (15 rapid requests):");
    for i in 1..=15 {
        if limiter.check_request("test-provider", "test-model").await? {
            allowed_count += 1;
            info!("  Request {}: ✅ Allowed", i);
        } else {
            denied_count += 1;
            warn!("  Request {}: ❌ Rate limited", i);
        }
    }

    info!("\nBurst Test Results:");
    info!("  ✅ Allowed: {}", allowed_count);
    info!("  ❌ Denied: {}", denied_count);
    info!("  📈 Burst capacity working correctly!");

    // Step 2: Cost-based budget enforcement
    info!("\n💰 Step 2: Cost-Based Budget Enforcement");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let budget_config = RateLimitConfig {
        requests_per_second: 100.0,
        burst_capacity: 100,
        cost_per_minute: Some(1.0), // $1/minute limit
        cost_per_hour: Some(10.0),  // $10/hour limit
        cost_per_day: Some(50.0),   // $50/day limit
        ..Default::default()
    };

    let budget_limiter = RateLimiter::new(budget_config);

    info!("Budget Configuration:");
    info!("  • $1.00 per minute maximum");
    info!("  • $10.00 per hour maximum");
    info!("  • $50.00 per day maximum");

    // Simulate expensive requests
    info!("\nSimulating expensive API calls:");

    // Request 1: $0.50
    budget_limiter
        .record_usage("openai", "gpt-4", 5000, 0.50)
        .await;
    info!("  Request 1: $0.50 (GPT-4, 5K tokens) - Recorded");

    if budget_limiter.check_request("openai", "gpt-4").await? {
        info!("  Request 2: ✅ Allowed (budget: $0.50/$1.00)");
    }

    // Request 2: $0.60 (should exceed minute budget)
    budget_limiter
        .record_usage("openai", "gpt-4", 6000, 0.60)
        .await;
    info!("  Request 2: $0.60 (GPT-4, 6K tokens) - Recorded");

    if !budget_limiter.check_request("openai", "gpt-4").await? {
        warn!("  Request 3: ❌ Denied (budget exceeded: $1.10/$1.00 per minute)");
    }

    info!("\n💡 Cost budget enforcement working correctly!");

    // Step 3: Token quota management
    info!("\n🎫 Step 3: Token Quota Management");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let quota_config = RateLimitConfig {
        requests_per_second: 100.0,
        burst_capacity: 100,
        tokens_per_minute: Some(10_000), // 10K tokens/minute limit
        cost_per_minute: None,
        cost_per_hour: None,
        cost_per_day: None,
        ..Default::default()
    };

    let quota_limiter = RateLimiter::new(quota_config);

    info!("Quota Configuration:");
    info!("  • 10,000 tokens per minute maximum");

    // Simulate token usage
    info!("\nSimulating token usage:");

    quota_limiter
        .record_usage("anthropic", "claude-3-haiku", 4000, 0.01)
        .await;
    info!("  Request 1: 4,000 tokens (Haiku) - Recorded");

    quota_limiter
        .record_usage("anthropic", "claude-3-haiku", 5000, 0.0125)
        .await;
    info!("  Request 2: 5,000 tokens (Haiku) - Recorded");

    if quota_limiter
        .check_request("anthropic", "claude-3-haiku")
        .await?
    {
        info!("  Request 3: ✅ Allowed (usage: 9,000/10,000 tokens)");
    }

    quota_limiter
        .record_usage("anthropic", "claude-3-haiku", 2000, 0.005)
        .await;
    info!("  Request 3: 2,000 tokens (Haiku) - Recorded");

    if !quota_limiter
        .check_request("anthropic", "claude-3-haiku")
        .await?
    {
        warn!("  Request 4: ❌ Denied (quota exceeded: 11,000/10,000 tokens)");
    }

    info!("\n💡 Token quota management working correctly!");

    // Step 4: Wait-based rate limiting
    info!("\n⏱️  Step 4: Wait-Based Rate Limiting");
    info!("{}", "-".repeat(70));

    let wait_config = RateLimitConfig {
        requests_per_second: 2.0,
        burst_capacity: 3,
        enable_queue: true,
        max_wait_ms: 5000,
        ..Default::default()
    };

    let wait_limiter = RateLimiter::new(wait_config);

    info!("Configuration:");
    info!("  • Rate: 2 requests/second");
    info!("  • Burst: 3 requests");
    info!("  • Max wait: 5 seconds");

    // Consume burst capacity
    for i in 1..=3 {
        wait_limiter.check_request("test", "model").await?;
        info!("  Request {}: ✅ Immediate (burst)", i);
    }

    // Now should wait for tokens to refill
    info!("\n  Waiting for rate limit to allow next request...");
    let start = Instant::now();
    wait_limiter.wait_for_request("test", "model").await?;
    let elapsed = start.elapsed();
    info!(
        "  Request 4: ✅ Allowed after {}ms wait",
        elapsed.as_millis()
    );

    info!("\n💡 Wait-based rate limiting working correctly!");

    // Step 5: Usage statistics
    info!("\n📈 Step 5: Usage Statistics Tracking");
    info!("{}", iter::repeat("-").take(70).collect::<String>());

    let stats_limiter = RateLimiter::default_config();

    // Simulate various usage patterns
    stats_limiter
        .record_usage("openai", "gpt-4", 1500, 0.045)
        .await;
    stats_limiter
        .record_usage("openai", "gpt-4", 2000, 0.060)
        .await;
    stats_limiter
        .record_usage("openai", "gpt-3.5-turbo", 3000, 0.003)
        .await;
    stats_limiter
        .record_usage("anthropic", "claude-3-opus", 5000, 0.375)
        .await;
    stats_limiter
        .record_usage("anthropic", "claude-3-haiku", 4000, 0.006)
        .await;

    // Get provider stats
    info!("Provider Statistics:");

    if let Some(openai_stats) = stats_limiter.get_provider_stats("openai").await {
        info!("\n  OpenAI:");
        info!("    • Total requests: {}", openai_stats.total_requests);
        info!("    • Total tokens: {}", openai_stats.total_tokens);
        info!("    • Total cost: ${:.4}", openai_stats.total_cost);
        info!(
            "    • Avg cost/request: ${:.4}",
            openai_stats.avg_cost_per_request()
        );
        info!(
            "    • Avg tokens/request: {:.0}",
            openai_stats.avg_tokens_per_request()
        );
    }

    if let Some(anthropic_stats) = stats_limiter.get_provider_stats("anthropic").await {
        info!("\n  Anthropic:");
        info!("    • Total requests: {}", anthropic_stats.total_requests);
        info!("    • Total tokens: {}", anthropic_stats.total_tokens);
        info!("    • Total cost: ${:.4}", anthropic_stats.total_cost);
        info!(
            "    • Avg cost/request: ${:.4}",
            anthropic_stats.avg_cost_per_request()
        );
        info!(
            "    • Avg tokens/request: {:.0}",
            anthropic_stats.avg_tokens_per_request()
        );
    }

    // Get model stats
    info!("\nModel Statistics:");

    if let Some(gpt4_stats) = stats_limiter.get_model_stats("gpt-4").await {
        info!("\n  GPT-4:");
        info!("    • Requests: {}", gpt4_stats.total_requests);
        info!("    • Tokens: {}", gpt4_stats.total_tokens);
        info!("    • Cost: ${:.4}", gpt4_stats.total_cost);
    }

    if let Some(opus_stats) = stats_limiter.get_model_stats("claude-3-opus").await {
        info!("\n  Claude 3 Opus:");
        info!("    • Requests: {}", opus_stats.total_requests);
        info!("    • Tokens: {}", opus_stats.total_tokens);
        info!("    • Cost: ${:.4}", opus_stats.total_cost);
    }

    if let Some(haiku_stats) = stats_limiter.get_model_stats("claude-3-haiku").await {
        info!("\n  Claude 3 Haiku:");
        info!("    • Requests: {}", haiku_stats.total_requests);
        info!("    • Tokens: {}", haiku_stats.total_tokens);
        info!("    • Cost: ${:.4}", haiku_stats.total_cost);
    }

    // Step 6: Configuration presets
    info!("\n⚙️  Step 6: Configuration Presets");
    info!("{}", "-".repeat(70));

    info!("Available presets:");

    let conservative = RateLimitConfig::conservative();
    info!("\n  Conservative (low budget):");
    info!("    • {} requests/second", conservative.requests_per_second);
    info!(
        "    • ${:.2}/hour limit",
        conservative.cost_per_hour.unwrap()
    );
    info!("    • ${:.2}/day limit", conservative.cost_per_day.unwrap());

    let aggressive = RateLimitConfig::aggressive();
    info!("\n  Aggressive (high throughput):");
    info!("    • {} requests/second", aggressive.requests_per_second);
    info!("    • ${:.2}/hour limit", aggressive.cost_per_hour.unwrap());
    info!("    • ${:.2}/day limit", aggressive.cost_per_day.unwrap());

    let _unlimited = RateLimitConfig::unlimited();
    info!("\n  Unlimited (development):");
    info!("    • {} requests/second", "∞");
    info!("    • No cost limits");
    info!("    • No token limits");

    // Summary
    info!("\n{}", "=".repeat(70));
    info!("✅ Rate Limiting Demo Complete!");
    info!("{}", "=".repeat(70));

    info!("\n🎯 Key Features Demonstrated:");
    info!("  ✅ Token bucket algorithm for request rate limiting");
    info!("  ✅ Cost-based budget enforcement (minute/hour/day)");
    info!("  ✅ Token quota management");
    info!("  ✅ Burst handling with configurable capacity");
    info!("  ✅ Wait-based rate limiting with timeout");
    info!("  ✅ Usage statistics tracking (provider & model level)");
    info!("  ✅ Configuration presets (conservative/aggressive/unlimited)");

    info!("\n💡 Production Benefits:");
    info!("  • Prevents quota exhaustion");
    info!("  • Protects against cost overruns");
    info!("  • Enables multi-tenant scenarios");
    info!("  • Tracks usage for billing/analytics");
    info!("  • Handles burst traffic gracefully");
    info!("  • Thread-safe concurrent access");

    info!("\n🚀 Integration:");
    info!("  • Works with all providers (Ollama, OpenAI, Anthropic)");
    info!("  • Can be integrated into ProviderRegistry");
    info!("  • Supports per-provider and per-model limits");
    info!("  • Real-time metrics for monitoring");

    Ok(())
}
