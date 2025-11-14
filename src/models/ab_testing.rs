// BIZRA Genesis Node - Professional Elite Implementation
// A/B Testing Framework for AI Model Comparison
//
// Production-grade statistical framework for comparing AI models:
// - Rigorous statistical significance testing
// - Confidence interval calculation
// - Multi-dimensional performance comparison
// - Cost-quality trade-off analysis
// - Automated winner determination
// - Comprehensive experiment reporting

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;

use super::types::{CompletionResponse, TokenUsage};

// ============================================================================
// Experiment Configuration
// ============================================================================

/// Configuration for an A/B test experiment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentConfig {
    /// Experiment name
    pub name: String,

    /// Minimum sample size per variant
    pub min_sample_size: usize,

    /// Desired confidence level (e.g., 0.95 for 95%)
    pub confidence_level: f64,

    /// Minimum detectable effect size
    pub min_effect_size: f64,

    /// Maximum experiment duration (seconds)
    pub max_duration_secs: u64,

    /// Primary metric to optimize
    pub primary_metric: MetricType,

    /// Cost threshold (USD) - experiments exceeding this will stop
    pub cost_threshold: Option<f64>,
}

impl Default for ExperimentConfig {
    fn default() -> Self {
        Self {
            name: "Unnamed Experiment".to_string(),
            min_sample_size: 30, // Statistical minimum
            confidence_level: 0.95, // 95% confidence
            min_effect_size: 0.1, // 10% minimum difference
            max_duration_secs: 3600, // 1 hour
            primary_metric: MetricType::Quality,
            cost_threshold: Some(10.0), // $10 limit
        }
    }
}

/// Metric type for comparison
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum MetricType {
    /// Quality/accuracy of responses
    Quality,
    /// Latency (lower is better)
    Latency,
    /// Cost (lower is better)
    Cost,
    /// Tokens per second throughput
    Throughput,
    /// Combined score (quality/cost ratio)
    Efficiency,
}

// ============================================================================
// Experiment Variant
// ============================================================================

/// A variant in an A/B test (e.g., GPT-4 vs Claude-3)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variant {
    /// Variant identifier (e.g., "gpt-4", "claude-3-opus")
    pub id: String,

    /// Provider name
    pub provider: String,

    /// Model name
    pub model: String,

    /// Variant weight (for traffic allocation)
    pub weight: f64,
}

impl Variant {
    /// Create a new variant
    pub fn new(id: impl Into<String>, provider: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            provider: provider.into(),
            model: model.into(),
            weight: 1.0,
        }
    }

    /// Set traffic weight
    pub fn with_weight(mut self, weight: f64) -> Self {
        self.weight = weight;
        self
    }
}

// ============================================================================
// Observation (Single Trial)
// ============================================================================

/// A single observation/trial in the experiment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Observation {
    /// Variant ID
    pub variant_id: String,

    /// Latency in milliseconds
    pub latency_ms: u64,

    /// Cost in USD
    pub cost: f64,

    /// Token usage
    pub tokens: TokenUsage,

    /// Quality score (0.0-1.0)
    pub quality_score: Option<f64>,

    /// Timestamp
    pub timestamp_ms: u64,
}

impl Observation {
    /// Create observation from completion response
    pub fn from_response(
        variant_id: String,
        response: &CompletionResponse,
        cost: f64,
        quality_score: Option<f64>,
    ) -> Self {
        Self {
            variant_id,
            latency_ms: response.latency_ms,
            cost,
            tokens: response.usage,
            quality_score,
            timestamp_ms: response.timestamp_ms,
        }
    }

    /// Calculate throughput (tokens/second)
    pub fn throughput(&self) -> f64 {
        if self.latency_ms == 0 {
            0.0
        } else {
            (self.tokens.total_tokens as f64) / (self.latency_ms as f64 / 1000.0)
        }
    }

    /// Calculate efficiency (quality per dollar)
    pub fn efficiency(&self) -> Option<f64> {
        self.quality_score.map(|q| {
            if self.cost > 0.0 {
                q / self.cost
            } else {
                f64::INFINITY
            }
        })
    }
}

// ============================================================================
// Statistical Analysis
// ============================================================================

/// Statistical summary for a variant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariantStats {
    /// Variant ID
    pub variant_id: String,

    /// Sample size
    pub n: usize,

    /// Latency statistics
    pub latency: SummaryStats,

    /// Cost statistics
    pub cost: SummaryStats,

    /// Quality statistics
    pub quality: Option<SummaryStats>,

    /// Throughput statistics
    pub throughput: SummaryStats,

    /// Efficiency statistics
    pub efficiency: Option<SummaryStats>,

    /// Total cost incurred
    pub total_cost: f64,
}

/// Summary statistics for a metric
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SummaryStats {
    /// Mean
    pub mean: f64,

    /// Standard deviation
    pub std_dev: f64,

    /// Minimum value
    pub min: f64,

    /// Maximum value
    pub max: f64,

    /// Median (50th percentile)
    pub median: f64,

    /// 95th percentile
    pub p95: f64,

    /// 99th percentile
    pub p99: f64,

    /// Standard error of the mean
    pub sem: f64,
}

impl SummaryStats {
    /// Calculate summary statistics from observations
    pub fn from_values(mut values: Vec<f64>) -> Self {
        let n = values.len() as f64;

        if values.is_empty() {
            return Self {
                mean: 0.0,
                std_dev: 0.0,
                min: 0.0,
                max: 0.0,
                median: 0.0,
                p95: 0.0,
                p99: 0.0,
                sem: 0.0,
            };
        }

        values.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let mean = values.iter().sum::<f64>() / n;
        let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / n;
        let std_dev = variance.sqrt();
        let sem = std_dev / n.sqrt();

        let percentile = |p: f64| -> f64 {
            let idx = (p * (values.len() - 1) as f64) as usize;
            values[idx]
        };

        Self {
            mean,
            std_dev,
            min: values[0],
            max: values[values.len() - 1],
            median: percentile(0.5),
            p95: percentile(0.95),
            p99: percentile(0.99),
            sem,
        }
    }

    /// Calculate confidence interval
    pub fn confidence_interval(&self, confidence_level: f64) -> (f64, f64) {
        // Z-score for confidence level (approximation)
        let z = match confidence_level {
            x if x >= 0.99 => 2.576,
            x if x >= 0.95 => 1.96,
            x if x >= 0.90 => 1.645,
            _ => 1.96, // Default to 95%
        };

        let margin = z * self.sem;
        (self.mean - margin, self.mean + margin)
    }
}

// ============================================================================
// Comparison Result
// ============================================================================

/// Result of comparing two variants
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparisonResult {
    /// Variant A ID
    pub variant_a: String,

    /// Variant B ID
    pub variant_b: String,

    /// Metric being compared
    pub metric: MetricType,

    /// Statistical significance (p-value < 0.05)
    pub is_significant: bool,

    /// P-value
    pub p_value: f64,

    /// Effect size (Cohen's d)
    pub effect_size: f64,

    /// Winner (if significant)
    pub winner: Option<String>,

    /// Relative improvement (%)
    pub improvement_pct: f64,

    /// Confidence interval for difference
    pub confidence_interval: (f64, f64),
}

impl ComparisonResult {
    /// Perform t-test comparison
    pub fn t_test(
        variant_a_id: String,
        variant_b_id: String,
        values_a: &[f64],
        values_b: &[f64],
        metric: MetricType,
        confidence_level: f64,
    ) -> Self {
        let stats_a = SummaryStats::from_values(values_a.to_vec());
        let stats_b = SummaryStats::from_values(values_b.to_vec());

        // Calculate t-statistic
        let n_a = values_a.len() as f64;
        let n_b = values_b.len() as f64;

        let pooled_std = ((stats_a.std_dev.powi(2) + stats_b.std_dev.powi(2)) / 2.0).sqrt();
        let se_diff = pooled_std * ((1.0 / n_a) + (1.0 / n_b)).sqrt();

        let t_stat = (stats_a.mean - stats_b.mean).abs() / se_diff;

        // Degrees of freedom (simplified)
        let _df = (n_a + n_b - 2.0) as i32;

        // Approximate p-value (simplified for large samples)
        let p_value = if t_stat > 2.576 {
            0.01 // p < 0.01
        } else if t_stat > 1.96 {
            0.05 // p < 0.05
        } else if t_stat > 1.645 {
            0.10 // p < 0.10
        } else {
            0.20 // Not significant
        };

        // Cohen's d (effect size)
        let effect_size = (stats_a.mean - stats_b.mean).abs() / pooled_std;

        // Determine winner (lower is better for latency/cost)
        let (is_significant, winner, improvement_pct) = if p_value < (1.0 - confidence_level) {
            let lower_is_better = matches!(metric, MetricType::Latency | MetricType::Cost);

            let winner = if lower_is_better {
                if stats_a.mean < stats_b.mean {
                    Some(variant_a_id.clone())
                } else {
                    Some(variant_b_id.clone())
                }
            } else {
                if stats_a.mean > stats_b.mean {
                    Some(variant_a_id.clone())
                } else {
                    Some(variant_b_id.clone())
                }
            };

            let baseline = stats_b.mean;
            let improvement = ((stats_a.mean - baseline).abs() / baseline) * 100.0;

            (true, winner, improvement)
        } else {
            (false, None, 0.0)
        };

        // Confidence interval for difference
        let z = 1.96; // 95% confidence
        let ci_margin = z * se_diff;
        let diff = stats_a.mean - stats_b.mean;
        let confidence_interval = (diff - ci_margin, diff + ci_margin);

        Self {
            variant_a: variant_a_id,
            variant_b: variant_b_id,
            metric,
            is_significant,
            p_value,
            effect_size,
            winner,
            improvement_pct,
            confidence_interval,
        }
    }
}

// ============================================================================
// Experiment
// ============================================================================

/// A/B test experiment
pub struct Experiment {
    config: ExperimentConfig,
    variants: Vec<Variant>,
    observations: Vec<Observation>,
    start_time: Instant,
}

impl Experiment {
    /// Create a new experiment
    pub fn new(config: ExperimentConfig, variants: Vec<Variant>) -> Self {
        Self {
            config,
            variants,
            observations: Vec::new(),
            start_time: Instant::now(),
        }
    }

    /// Add an observation
    pub fn record_observation(&mut self, observation: Observation) {
        self.observations.push(observation);
    }

    /// Get variant statistics
    pub fn variant_stats(&self, variant_id: &str) -> Option<VariantStats> {
        let obs: Vec<_> = self
            .observations
            .iter()
            .filter(|o| o.variant_id == variant_id)
            .collect();

        if obs.is_empty() {
            return None;
        }

        let latency_values: Vec<f64> = obs.iter().map(|o| o.latency_ms as f64).collect();
        let cost_values: Vec<f64> = obs.iter().map(|o| o.cost).collect();
        let throughput_values: Vec<f64> = obs.iter().map(|o| o.throughput()).collect();

        let quality_values: Vec<f64> = obs
            .iter()
            .filter_map(|o| o.quality_score)
            .collect();

        let efficiency_values: Vec<f64> = obs
            .iter()
            .filter_map(|o| o.efficiency())
            .collect();

        Some(VariantStats {
            variant_id: variant_id.to_string(),
            n: obs.len(),
            latency: SummaryStats::from_values(latency_values),
            cost: SummaryStats::from_values(cost_values.clone()),
            quality: if !quality_values.is_empty() {
                Some(SummaryStats::from_values(quality_values))
            } else {
                None
            },
            throughput: SummaryStats::from_values(throughput_values),
            efficiency: if !efficiency_values.is_empty() {
                Some(SummaryStats::from_values(efficiency_values))
            } else {
                None
            },
            total_cost: cost_values.iter().sum(),
        })
    }

    /// Compare two variants
    pub fn compare_variants(
        &self,
        variant_a_id: &str,
        variant_b_id: &str,
        metric: MetricType,
    ) -> Option<ComparisonResult> {
        let obs_a: Vec<_> = self
            .observations
            .iter()
            .filter(|o| o.variant_id == variant_a_id)
            .collect();

        let obs_b: Vec<_> = self
            .observations
            .iter()
            .filter(|o| o.variant_id == variant_b_id)
            .collect();

        if obs_a.is_empty() || obs_b.is_empty() {
            return None;
        }

        let values_a = match metric {
            MetricType::Quality => obs_a
                .iter()
                .filter_map(|o| o.quality_score)
                .collect::<Vec<_>>(),
            MetricType::Latency => obs_a.iter().map(|o| o.latency_ms as f64).collect(),
            MetricType::Cost => obs_a.iter().map(|o| o.cost).collect(),
            MetricType::Throughput => obs_a.iter().map(|o| o.throughput()).collect(),
            MetricType::Efficiency => obs_a
                .iter()
                .filter_map(|o| o.efficiency())
                .collect::<Vec<_>>(),
        };

        let values_b = match metric {
            MetricType::Quality => obs_b
                .iter()
                .filter_map(|o| o.quality_score)
                .collect::<Vec<_>>(),
            MetricType::Latency => obs_b.iter().map(|o| o.latency_ms as f64).collect(),
            MetricType::Cost => obs_b.iter().map(|o| o.cost).collect(),
            MetricType::Throughput => obs_b.iter().map(|o| o.throughput()).collect(),
            MetricType::Efficiency => obs_b
                .iter()
                .filter_map(|o| o.efficiency())
                .collect::<Vec<_>>(),
        };

        if values_a.is_empty() || values_b.is_empty() {
            return None;
        }

        Some(ComparisonResult::t_test(
            variant_a_id.to_string(),
            variant_b_id.to_string(),
            &values_a,
            &values_b,
            metric,
            self.config.confidence_level,
        ))
    }

    /// Check if experiment should stop
    pub fn should_stop(&self) -> bool {
        // Stop if duration exceeded
        if self.start_time.elapsed().as_secs() >= self.config.max_duration_secs {
            return true;
        }

        // Stop if cost threshold exceeded
        if let Some(threshold) = self.config.cost_threshold {
            let total_cost: f64 = self.observations.iter().map(|o| o.cost).sum();
            if total_cost >= threshold {
                return true;
            }
        }

        // Check if we have enough samples
        let min_samples = self.config.min_sample_size;
        for variant in &self.variants {
            let count = self
                .observations
                .iter()
                .filter(|o| o.variant_id == variant.id)
                .count();

            if count < min_samples {
                return false; // Keep running
            }
        }

        // If all variants have enough samples, check for significance
        if self.variants.len() >= 2 {
            if let Some(result) = self.compare_variants(
                &self.variants[0].id,
                &self.variants[1].id,
                self.config.primary_metric,
            ) {
                // Stop if significant and effect size is large enough
                return result.is_significant
                    && result.effect_size >= self.config.min_effect_size;
            }
        }

        false
    }

    /// Get experiment report
    pub fn report(&self) -> ExperimentReport {
        let duration_secs = self.start_time.elapsed().as_secs();
        let total_cost: f64 = self.observations.iter().map(|o| o.cost).sum();

        let variant_stats: HashMap<String, VariantStats> = self
            .variants
            .iter()
            .filter_map(|v| self.variant_stats(&v.id).map(|s| (v.id.clone(), s)))
            .collect();

        let comparisons = if self.variants.len() >= 2 {
            let metrics = [
                MetricType::Quality,
                MetricType::Latency,
                MetricType::Cost,
                MetricType::Throughput,
                MetricType::Efficiency,
            ];

            metrics
                .iter()
                .filter_map(|&metric| {
                    self.compare_variants(&self.variants[0].id, &self.variants[1].id, metric)
                })
                .collect()
        } else {
            Vec::new()
        };

        ExperimentReport {
            experiment_name: self.config.name.clone(),
            duration_secs,
            total_observations: self.observations.len(),
            total_cost,
            variant_stats,
            comparisons,
        }
    }
}

/// Experiment report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentReport {
    pub experiment_name: String,
    pub duration_secs: u64,
    pub total_observations: usize,
    pub total_cost: f64,
    pub variant_stats: HashMap<String, VariantStats>,
    pub comparisons: Vec<ComparisonResult>,
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_summary_stats() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let stats = SummaryStats::from_values(values);

        assert_eq!(stats.mean, 3.0);
        assert_eq!(stats.min, 1.0);
        assert_eq!(stats.max, 5.0);
        assert_eq!(stats.median, 3.0);
    }

    #[test]
    fn test_confidence_interval() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let stats = SummaryStats::from_values(values);

        let (lower, upper) = stats.confidence_interval(0.95);
        assert!(lower < stats.mean);
        assert!(upper > stats.mean);
    }

    #[test]
    fn test_variant_creation() {
        let variant = Variant::new("test", "openai", "gpt-4").with_weight(0.5);

        assert_eq!(variant.id, "test");
        assert_eq!(variant.provider, "openai");
        assert_eq!(variant.model, "gpt-4");
        assert_eq!(variant.weight, 0.5);
    }

    #[test]
    fn test_experiment_config_default() {
        let config = ExperimentConfig::default();

        assert_eq!(config.min_sample_size, 30);
        assert_eq!(config.confidence_level, 0.95);
        assert!(matches!(config.primary_metric, MetricType::Quality));
    }
}
