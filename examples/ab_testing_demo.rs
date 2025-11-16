// BIZRA Genesis Node - A/B Testing Framework Demo
//
// Demonstrates professional-grade A/B testing for AI model comparison:
// - Statistical significance testing (t-tests)
// - Confidence interval calculation
// - Multi-dimensional performance comparison
// - Automated winner determination
// - Cost-quality trade-off analysis
// - Comprehensive experiment reporting
//
// Run this example:
// ```bash
// cargo run --example ab_testing_demo
// ```

use bizra_genesis_node::models::{
    CompletionResponse, ExperimentConfig, MetricType, Observation, TokenUsage, Variant,
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

    info!("🚀 BIZRA Genesis Node - A/B Testing Framework Demo");
    info!("{}", "=".repeat(70));

    // Step 1: Experiment setup
    info!("\n📊 Step 1: Experiment Configuration");
    info!("{}", "-".repeat(70));

    let config = ExperimentConfig {
        name: "GPT-4 vs Claude-3-Opus Performance Comparison".to_string(),
        min_sample_size: 30,
        confidence_level: 0.95,
        min_effect_size: 0.1,
        max_duration_secs: 3600,
        primary_metric: MetricType::Quality,
        cost_threshold: Some(5.0), // $5 limit for demo
    };

    info!("Experiment Configuration:");
    info!("  • Name: {}", config.name);
    info!(
        "  • Minimum sample size: {} per variant",
        config.min_sample_size
    );
    info!("  • Confidence level: {}%", config.confidence_level * 100.0);
    info!(
        "  • Minimum effect size: {}%",
        config.min_effect_size * 100.0
    );
    info!("  • Cost threshold: ${:.2}", config.cost_threshold.unwrap());
    info!("  • Primary metric: {:?}", config.primary_metric);

    // Step 2: Define variants
    info!("\n🔬 Step 2: Variant Definition");
    info!("{}", "-".repeat(70));

    let variant_a = Variant::new("gpt-4", "openai", "gpt-4").with_weight(0.5);
    let variant_b = Variant::new("claude-3-opus", "anthropic", "claude-3-opus").with_weight(0.5);

    info!("Variant A:");
    info!("  • ID: {}", variant_a.id);
    info!("  • Provider: {}", variant_a.provider);
    info!("  • Model: {}", variant_a.model);
    info!("  • Traffic weight: {}", variant_a.weight);

    info!("\nVariant B:");
    info!("  • ID: {}", variant_b.id);
    info!("  • Provider: {}", variant_b.provider);
    info!("  • Model: {}", variant_b.model);
    info!("  • Traffic weight: {}", variant_b.weight);

    let variants = vec![variant_a.clone(), variant_b.clone()];
    let mut experiment =
        bizra_genesis_node::models::ab_testing::Experiment::new(config.clone(), variants);

    // Step 3: Simulate experiment data
    info!("\n🎲 Step 3: Simulating Experiment Data");
    info!("{}", "-".repeat(70));
    info!("Running 40 trials (20 per variant) with realistic data...\n");

    // Simulate GPT-4 trials (faster, more expensive, slightly lower quality)
    for i in 0..20 {
        let response = CompletionResponse {
            content: format!("GPT-4 response {}", i + 1),
            model: "gpt-4".to_string(),
            finish_reason: Some(bizra_genesis_node::models::FinishReason::Stop),
            usage: TokenUsage::new(150, 800 + (i as usize * 50)),
            latency_ms: 1200 + (i as u64 * 50), // 1.2s - 2.1s
            timestamp_ms: chrono::Utc::now().timestamp_millis() as u64,
        };

        let cost = 0.03 * (response.usage.input_tokens as f64 / 1000.0)
            + 0.06 * (response.usage.output_tokens as f64 / 1000.0);

        let quality_score = 0.85 + (i as f64 * 0.005); // 0.85 - 0.95

        let observation =
            Observation::from_response(variant_a.id.clone(), &response, cost, Some(quality_score));

        experiment.record_observation(observation);

        if i < 3 {
            info!(
                "  Trial {}: {} | Latency: {}ms | Cost: ${:.4} | Quality: {:.3}",
                i + 1,
                variant_a.id,
                response.latency_ms,
                cost,
                quality_score
            );
        }
    }

    info!("  ...");

    // Simulate Claude-3-Opus trials (slower, cheaper, higher quality)
    for i in 0..20 {
        let response = CompletionResponse {
            content: format!("Claude-3-Opus response {}", i + 1),
            model: "claude-3-opus".to_string(),
            finish_reason: Some(bizra_genesis_node::models::FinishReason::Stop),
            usage: TokenUsage::new(150, 900 + (i as usize * 60)),
            latency_ms: 1800 + (i as u64 * 60), // 1.8s - 3.0s
            timestamp_ms: chrono::Utc::now().timestamp_millis() as u64,
        };

        let cost = 0.015 * (response.usage.input_tokens as f64 / 1000.0)
            + 0.075 * (response.usage.output_tokens as f64 / 1000.0);

        let quality_score = 0.92 + (i as f64 * 0.003); // 0.92 - 0.98

        let observation =
            Observation::from_response(variant_b.id.clone(), &response, cost, Some(quality_score));

        experiment.record_observation(observation);

        if i < 3 {
            info!(
                "  Trial {}: {} | Latency: {}ms | Cost: ${:.4} | Quality: {:.3}",
                i + 21,
                variant_b.id,
                response.latency_ms,
                cost,
                quality_score
            );
        }
    }

    info!("  ...");
    info!("\n✅ Collected 40 observations total");

    // Step 4: Variant statistics
    info!("\n📈 Step 4: Variant Statistics");
    info!("{}", "-".repeat(70));

    if let Some(stats_a) = experiment.variant_stats(&variant_a.id) {
        info!("\nVariant A ({})", variant_a.id);
        info!("  Sample size: {}", stats_a.n);
        info!("\n  Latency:");
        info!("    • Mean: {:.0}ms", stats_a.latency.mean);
        info!("    • Std Dev: {:.0}ms", stats_a.latency.std_dev);
        info!("    • Median: {:.0}ms", stats_a.latency.median);
        info!("    • P95: {:.0}ms", stats_a.latency.p95);
        info!("\n  Cost:");
        info!("    • Mean: ${:.4}", stats_a.cost.mean);
        info!("    • Total: ${:.4}", stats_a.total_cost);
        if let Some(quality) = &stats_a.quality {
            info!("\n  Quality:");
            info!("    • Mean: {:.3}", quality.mean);
            info!("    • Std Dev: {:.3}", quality.std_dev);
        }
        info!("\n  Throughput:");
        info!("    • Mean: {:.0} tokens/sec", stats_a.throughput.mean);
    }

    if let Some(stats_b) = experiment.variant_stats(&variant_b.id) {
        info!("\nVariant B ({})", variant_b.id);
        info!("  Sample size: {}", stats_b.n);
        info!("\n  Latency:");
        info!("    • Mean: {:.0}ms", stats_b.latency.mean);
        info!("    • Std Dev: {:.0}ms", stats_b.latency.std_dev);
        info!("    • Median: {:.0}ms", stats_b.latency.median);
        info!("    • P95: {:.0}ms", stats_b.latency.p95);
        info!("\n  Cost:");
        info!("    • Mean: ${:.4}", stats_b.cost.mean);
        info!("    • Total: ${:.4}", stats_b.total_cost);
        if let Some(quality) = &stats_b.quality {
            info!("\n  Quality:");
            info!("    • Mean: {:.3}", quality.mean);
            info!("    • Std Dev: {:.3}", quality.std_dev);
        }
        info!("\n  Throughput:");
        info!("    • Mean: {:.0} tokens/sec", stats_b.throughput.mean);
    }

    // Step 5: Statistical comparison
    info!("\n🔍 Step 5: Statistical Comparison");
    info!("{}", "-".repeat(70));

    let metrics = [
        MetricType::Quality,
        MetricType::Latency,
        MetricType::Cost,
        MetricType::Throughput,
    ];

    for metric in &metrics {
        if let Some(result) = experiment.compare_variants(&variant_a.id, &variant_b.id, *metric) {
            info!("\n{:?} Comparison:", metric);
            info!("  • Statistical significance: {}", result.is_significant);
            info!("  • P-value: {:.4}", result.p_value);
            info!("  • Effect size (Cohen's d): {:.3}", result.effect_size);
            info!(
                "  • Confidence interval: ({:.3}, {:.3})",
                result.confidence_interval.0, result.confidence_interval.1
            );

            if result.is_significant {
                if let Some(winner) = &result.winner {
                    info!("  • Winner: {} ✅", winner);
                    info!("  • Improvement: {:.1}%", result.improvement_pct);

                    // Interpretation of effect size
                    let effect_interpretation = if result.effect_size >= 0.8 {
                        "Large effect"
                    } else if result.effect_size >= 0.5 {
                        "Medium effect"
                    } else if result.effect_size >= 0.2 {
                        "Small effect"
                    } else {
                        "Negligible effect"
                    };
                    info!("  • Effect interpretation: {}", effect_interpretation);
                }
            } else {
                info!("  • Result: No significant difference");
            }
        }
    }

    // Step 6: Experiment report
    info!("\n📋 Step 6: Experiment Report");
    info!("{}", "=".repeat(70));

    let report = experiment.report();

    info!("\nExperiment: {}", report.experiment_name);
    info!("Duration: {}s", report.duration_secs);
    info!("Total observations: {}", report.total_observations);
    info!("Total cost: ${:.4}", report.total_cost);

    info!("\nStatistical Findings:");
    for comparison in &report.comparisons {
        if comparison.is_significant {
            info!(
                "  • {:?}: {} outperforms {} by {:.1}% (p={:.4})",
                comparison.metric,
                comparison.winner.as_ref().unwrap(),
                if comparison.winner.as_ref().unwrap() == &variant_a.id {
                    &variant_b.id
                } else {
                    &variant_a.id
                },
                comparison.improvement_pct,
                comparison.p_value
            );
        }
    }

    // Step 7: Decision recommendation
    info!("\n🎯 Step 7: Decision Recommendation");
    info!("{}", "=".repeat(70));

    // Count wins per variant
    let mut variant_a_wins = 0;
    let mut variant_b_wins = 0;

    for comparison in &report.comparisons {
        if let Some(winner) = &comparison.winner {
            if winner == &variant_a.id {
                variant_a_wins += 1;
            } else {
                variant_b_wins += 1;
            }
        }
    }

    info!("\nWin Count:");
    info!("  • {}: {} significant wins", variant_a.id, variant_a_wins);
    info!("  • {}: {} significant wins", variant_b.id, variant_b_wins);

    // Overall recommendation
    info!("\nRecommendation:");
    if variant_a_wins > variant_b_wins {
        info!("  ✅ Deploy {} as primary model", variant_a.id);
        info!(
            "  Reasoning: Superior performance on {} metrics",
            variant_a_wins
        );
    } else if variant_b_wins > variant_a_wins {
        info!("  ✅ Deploy {} as primary model", variant_b.id);
        info!(
            "  Reasoning: Superior performance on {} metrics",
            variant_b_wins
        );
    } else {
        info!("  ⚖️  No clear winner - consider use case requirements:");
        info!("  • Use {} for latency-critical applications", variant_a.id);
        info!("  • Use {} for quality-critical applications", variant_b.id);
    }

    // Cost-quality trade-off analysis
    if let (Some(stats_a), Some(stats_b)) = (
        experiment.variant_stats(&variant_a.id),
        experiment.variant_stats(&variant_b.id),
    ) {
        if let (Some(quality_a), Some(quality_b)) = (&stats_a.quality, &stats_b.quality) {
            info!("\nCost-Quality Trade-off:");

            let quality_per_dollar_a = quality_a.mean / stats_a.cost.mean;
            let quality_per_dollar_b = quality_b.mean / stats_b.cost.mean;

            info!(
                "  • {} efficiency: {:.1} quality points per $",
                variant_a.id, quality_per_dollar_a
            );
            info!(
                "  • {} efficiency: {:.1} quality points per $",
                variant_b.id, quality_per_dollar_b
            );

            if quality_per_dollar_a > quality_per_dollar_b {
                let improvement =
                    ((quality_per_dollar_a - quality_per_dollar_b) / quality_per_dollar_b) * 100.0;
                info!(
                    "  • {} is {:.1}% more cost-efficient",
                    variant_a.id, improvement
                );
            } else {
                let improvement =
                    ((quality_per_dollar_b - quality_per_dollar_a) / quality_per_dollar_a) * 100.0;
                info!(
                    "  • {} is {:.1}% more cost-efficient",
                    variant_b.id, improvement
                );
            }
        }
    }

    // Summary
    info!("\n{}", "=".repeat(70));
    info!("✅ A/B Testing Demo Complete!");
    info!("{}", "=".repeat(70));

    info!("\n🎯 Key Features Demonstrated:");
    info!("  ✅ Rigorous statistical significance testing (t-tests)");
    info!("  ✅ Confidence interval calculation (95% confidence)");
    info!("  ✅ Multi-dimensional performance comparison");
    info!("  ✅ Effect size measurement (Cohen's d)");
    info!("  ✅ Automated winner determination");
    info!("  ✅ Cost-quality trade-off analysis");
    info!("  ✅ Comprehensive experiment reporting");

    info!("\n💡 Production Benefits:");
    info!("  • Data-driven model selection");
    info!("  • Statistical rigor prevents false conclusions");
    info!("  • Multi-metric evaluation (quality, latency, cost, throughput)");
    info!("  • Automated stopping criteria");
    info!("  • Cost-aware experimentation");
    info!("  • Actionable recommendations");

    info!("\n🚀 Use Cases:");
    info!("  • Model migration decisions (e.g., GPT-4 → Claude-3)");
    info!("  • Provider selection optimization");
    info!("  • Cost reduction without quality loss");
    info!("  • Performance benchmarking");
    info!("  • Continuous improvement validation");

    Ok(())
}
