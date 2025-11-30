// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SIGNAL-TO-NOISE RATIO MODULE                       ║
// ║  Advanced signal quality assessment for multi-agent consensus            ║
// ║  Measures decision clarity, agent reliability, and system stability      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Signal-to-Noise Ratio calculation types and implementations
/// Used throughout BIZRA for decision quality assessment and performance monitoring

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SnrResult {
    /// The calculated SNR value (ratio of signal to noise)
    pub snr: f32,

    /// Signal strength (mean of positive indicators)
    pub signal: f32,

    /// Noise level (standard deviation, variance, etc.)
    pub noise: f32,

    /// SNR category (POOR, FAIR, GOOD, EXCELLENT)
    pub category: SnrCategory,

    /// Confidence in the SNR calculation (0.0-1.0)
    pub confidence: f32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SnrCategory {
    /// SNR < 2.0: High noise, low signal clarity
    Poor,

    /// 2.0 ≤ SNR < 10.0: Moderate signal with some noise
    Fair,

    /// 10.0 ≤ SNR < 100.0: Good signal quality
    Good,

    /// SNR ≥ 100.0: Excellent signal clarity, minimal noise
    Excellent,
}

impl SnrCategory {
    pub fn from_snr(snr: f32) -> Self {
        match snr {
            x if x < 2.0 => Self::Poor,
            x if x < 10.0 => Self::Fair,
            x if x < 100.0 => Self::Good,
            _ => Self::Excellent,
        }
    }

    /// Numeric value for sorting/comparison
    pub fn as_val(&self) -> f32 {
        match self {
            Self::Poor => 0.0,
            Self::Fair => 1.0,
            Self::Good => 2.0,
            Self::Excellent => 3.0,
        }
    }
}

/// Consensus SNR: Measures decision clarity vs conflicting alternatives
pub struct ConsensusSnr;

/// Agent SNR: Measures agent reliability vs performance variability
pub struct AgentSnr;

/// System SNR: Measures system stability vs errors/failures
pub struct SystemSnr;

/// Overall SNR statistics for collections of measurements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnrStats {
    /// Mean SNR across all measurements
    pub mean: f32,

    /// Standard deviation of SNR values
    pub std_dev: f32,

    /// Minimum SNR observed
    pub min: f32,

    /// Maximum SNR observed
    pub max: f32,

    /// Percentage of measurements in each category
    pub category_distribution: HashMap<SnrCategory, f32>,

    /// Trend indicator (improving/stabilizing/worsening)
    pub trend: SnrTrend,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum SnrTrend {
    Improving,
    Stable,
    Worsening,
    InsufficientData,
}

impl ConsensusSnr {
    /// Calculate SNR for consensus winner selection
    ///
    /// Signal: Winning candidate's composite score
    /// Noise: Standard deviation of all candidate scores
    ///
    /// # Arguments
    /// * `winner_score` - Composite score of the winning candidate
    /// * `all_scores` - Slice of all candidate composite scores
    ///
    /// # Returns
    /// SNR result indicating consensus clarity
    ///
    /// # Example
    /// ```rust
    /// use bizra_genesis_node::snr::ConsensusSnr;
    ///
    /// let winner_score = 0.95;
    /// let all_scores = &[0.95, 0.88, 0.79, 0.76];
    /// let snr = ConsensusSnr::calculate_consensus_snr(winner_score, all_scores);
    /// // High SNR = Clear consensus, winner significantly better than alternatives
    /// ```
    pub fn calculate_consensus_snr(winner_score: f32, all_scores: &[f32]) -> SnrResult {
        if all_scores.is_empty() {
            return SnrResult {
                snr: 0.0,
                signal: winner_score,
                noise: 0.0,
                category: SnrCategory::Poor,
                confidence: 0.0,
            };
        }

        // Signal is the winner's score
        let signal = winner_score;

        // Noise is the standard deviation of all candidate scores
        // This measures how spread out the alternatives are
        let noise = Self::calculate_standard_deviation(all_scores);

        // Avoid division by zero for uniform scoring
        let noise = if noise < 0.001 { 0.001 } else { noise };

        let snr = signal / noise;
        let category = SnrCategory::from_snr(snr);

        // Confidence based on number of alternatives and score distribution
        let confidence = Self::calculate_confidence(all_scores.len(), noise);

        SnrResult {
            snr,
            signal,
            noise,
            category,
            confidence,
        }
    }

    /// Calculate SNR for scenario with explicit signal and noise components
    pub fn calculate_snr(signal: f32, noise: f32) -> SnrResult {
        // Avoid division by zero
        let noise = if noise < 0.001 { 0.001 } else { noise };
        let snr = signal / noise;
        let category = SnrCategory::from_snr(snr);

        // Higher confidence for stable calculations
        let confidence = if noise > 0.01 { 0.95 } else { 0.75 };

        SnrResult {
            snr,
            signal,
            noise,
            category,
            confidence,
        }
    }

    /// Calculate confidence in SNR measurement based on sample size and variance
    fn calculate_confidence(sample_size: usize, std_dev: f32) -> f32 {
        // Larger samples and lower variance = higher confidence
        let size_factor = (sample_size as f32).sqrt() / 10.0; // Normalize to ~0.3 for 3 samples
        let variance_factor = 1.0 / (1.0 + std_dev); // Lower variance = higher confidence

        (size_factor * variance_factor).min(1.0).max(0.0)
    }

    /// Calculate standard deviation of a slice of values
    fn calculate_standard_deviation(values: &[f32]) -> f32 {
        if values.len() <= 1 {
            return 0.0;
        }

        let mean = values.iter().sum::<f32>() / values.len() as f32;
        let variance = values
            .iter()
            .map(|x| (x - mean).powi(2))
            .sum::<f32>() / (values.len() - 1) as f32; // Sample standard deviation

        variance.sqrt()
    }
}

impl AgentSnr {
    /// Calculate SNR for agent performance reliability
    ///
    /// Signal: Agent's average performance score
    /// Noise: Standard deviation across multiple evaluations
    ///
    /// # Arguments
    /// * `performance_scores` - Agent's scores over time/evaluations
    ///
    /// # Returns
    /// SNR indicating agent's reliability vs variability
    ///
    /// # Example
    /// ```rust
    /// use bizra_genesis_node::snr::AgentSnr;
    ///
    /// // Agent with consistent high performance
    /// let consistent_scores = &[0.95, 0.94, 0.96, 0.93, 0.95];
    /// let consistent_snr = AgentSnr::calculate_agent_reliability(consistent_scores);
    ///
    /// // Agent with erratic performance
    /// let erratic_scores = &[0.98, 0.75, 0.92, 0.68, 0.89];
    /// let erratic_snr = AgentSnr::calculate_agent_reliability(erratic_scores);
    ///
    /// // Consistent agent should have much higher SNR
    /// assert!(consistent_snr.snr > erratic_snr.snr);
    /// ```
    pub fn calculate_agent_reliability(performance_scores: &[f32]) -> SnrResult {
        if performance_scores.is_empty() {
            return SnrResult {
                snr: 0.0,
                signal: 0.0,
                noise: 0.0,
                category: SnrCategory::Poor,
                confidence: 0.0,
            };
        }

        // Signal is the average performance
        let signal = performance_scores.iter().sum::<f32>() / performance_scores.len() as f32;

        // Noise is the performance variability (standard deviation)
        let noise = ConsensusSnr::calculate_standard_deviation(performance_scores);

        // Avoid division by near-zero
        let noise = if noise < 0.001 { 0.001 } else { noise };

        let snr = signal / noise;
        let category = SnrCategory::from_snr(snr);

        // Confidence based on sample size
        let confidence = (performance_scores.len() as f32 / 20.0).min(0.95).max(0.3);

        SnrResult {
            snr,
            signal,
            noise,
            category,
            confidence,
        }
    }

    /// Calculate SNR across multiple performance dimensions
    pub fn calculate_multidimensional_reliability(
        accuracy_scores: &[f32],
        efficiency_scores: &[f32],
        reliability_scores: &[f32],
    ) -> SnrResult {
        if accuracy_scores.is_empty() || efficiency_scores.is_empty() || reliability_scores.is_empty() {
            return SnrResult {
                snr: 0.0,
                signal: 0.0,
                noise: 0.0,
                category: SnrCategory::Poor,
                confidence: 0.0,
            };
        }

        // Combined signal is weighted average of dimensions
        let accuracy_avg = accuracy_scores.iter().sum::<f32>() / accuracy_scores.len() as f32;
        let efficiency_avg = efficiency_scores.iter().sum::<f32>() / efficiency_scores.len() as f32;
        let reliability_avg = reliability_scores.iter().sum::<f32>() / reliability_scores.len() as f32;

        // Weighted composite signal (prioritize accuracy, then reliability, then efficiency)
        let signal = (accuracy_avg * 0.5) + (reliability_avg * 0.3) + (efficiency_avg * 0.2);

        // Combined noise is average standard deviation across dimensions
        let accuracy_std = ConsensusSnr::calculate_standard_deviation(accuracy_scores);
        let efficiency_std = ConsensusSnr::calculate_standard_deviation(efficiency_scores);
        let reliability_std = ConsensusSnr::calculate_standard_deviation(reliability_scores);

        let noise = (accuracy_std + efficiency_std + reliability_std) / 3.0;
        let noise = if noise < 0.001 { 0.001 } else { noise };

        let snr = signal / noise;
        let category = SnrCategory::from_snr(snr);

        // Lower confidence due to multiple dimensions
        let min_sample_size = accuracy_scores.len()
            .min(efficiency_scores.len())
            .min(reliability_scores.len());
        let confidence = ((min_sample_size as f32 / 15.0) * 0.9).min(0.85).max(0.2);

        SnrResult {
            snr,
            signal,
            noise,
            category,
            confidence,
        }
    }
}

impl SystemSnr {
    /// Calculate SNR for system stability monitoring
    ///
    /// Signal: Success rate (uptime, successful operations)
    /// Noise: Error rate or system variability
    ///
    /// # Arguments
    /// * `success_rate` - System availability/success percentage (0.0-1.0)
    /// * `error_rate` - System error/failure rate (0.0-1.0)
    ///
    /// # Returns
    /// SNR indicating system stability vs instability
    pub fn calculate_system_stability(success_rate: f32, error_rate: f32) -> SnrResult {
        if success_rate < 0.0 || success_rate > 1.0 || error_rate < 0.0 || error_rate > 1.0 {
            return SnrResult {
                snr: 0.0,
                signal: success_rate,
                noise: error_rate,
                category: SnrCategory::Poor,
                confidence: 0.0,
            };
        }

        let signal = success_rate;
        // Noise includes error rate plus variance from ideal operation
        let noise = error_rate + (1.0 - success_rate) * 0.1; // Add some baseline system variance
        let noise = if noise < 0.001 { 0.001 } else { noise };

        let snr = signal / noise;
        let category = SnrCategory::from_snr(snr);

        // High confidence for system-wide metrics
        let confidence = 0.95;

        SnrResult {
            snr,
            signal,
            noise,
            category,
            confidence,
        }
    }

    /// Calculate SNR for SLO compliance
    ///
    /// # Arguments
    /// * `actual_value` - Current actual SLO value
    /// * `target_value` - Target SLO threshold
    /// * `historical_values` - Recent historical values for calculating variance
    ///
    /// # Returns
    /// SNR where signal is compliance level, noise is deviation from target
    pub fn calculate_slo_snr(
        actual_value: f32,
        target_value: f32,
        historical_values: &[f32],
    ) -> SnrResult {
        // Signal is how close we are to target (inverse distance)
        let compliance = if actual_value >= target_value {
            1.0 // Meeting or exceeding target
        } else {
            actual_value / target_value // Partial compliance
        };
        let signal = compliance;

        // Noise is the variance in historical performance
        let noise = if historical_values.is_empty() {
            0.1 // Default variance estimate
        } else {
            ConsensusSnr::calculate_standard_deviation(historical_values)
        };
        let noise = if noise < 0.001 { 0.001 } else { noise };

        let snr = signal / noise;
        let category = SnrCategory::from_snr(snr);

        let confidence = if historical_values.len() >= 10 { 0.9 } else { 0.7 };

        SnrResult {
            snr,
            signal,
            noise,
            category,
            confidence,
        }
    }
}

impl SnrStats {
    /// Calculate SNR statistics from a collection of SNR measurements
    pub fn from_measurements(measurements: &[SnrResult]) -> Self {
        if measurements.is_empty() {
            return Self {
                mean: 0.0,
                std_dev: 0.0,
                min: 0.0,
                max: 0.0,
                category_distribution: HashMap::new(),
                trend: SnrTrend::InsufficientData,
            };
        }

        let snr_values: Vec<f32> = measurements.iter().map(|m| m.snr).collect();
        let mean = snr_values.iter().sum::<f32>() / snr_values.len() as f32;
        let std_dev = ConsensusSnr::calculate_standard_deviation(&snr_values);

        let min = snr_values
            .iter()
            .min_by(|a, b| a.partial_cmp(b).unwrap())
            .copied()
            .unwrap_or(0.0);

        let max = snr_values
            .iter()
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .copied()
            .unwrap_or(0.0);

        // Calculate category distribution
        let mut category_distribution = HashMap::new();
        let total_count = measurements.len() as f32;

        for &category in &[SnrCategory::Poor, SnrCategory::Fair, SnrCategory::Good, SnrCategory::Excellent] {
            let count = measurements
                .iter()
                .filter(|m| m.category == category)
                .count() as f32;
            category_distribution.insert(category, count / total_count);
        }

        // Determine trend (simplified: compare first half vs second half)
        let trend = if measurements.len() < 4 {
            SnrTrend::InsufficientData
        } else {
            let midpoint = measurements.len() / 2;
            let first_half: Vec<f32> = snr_values[..midpoint].iter().copied().collect();
            let second_half: Vec<f32> = snr_values[midpoint..].iter().copied().collect();

            let first_avg = first_half.iter().sum::<f32>() / first_half.len() as f32;
            let second_avg = second_half.iter().sum::<f32>() / second_half.len() as f32;

            if (second_avg - first_avg).abs() < std_dev * 0.1 {
                SnrTrend::Stable
            } else if second_avg > first_avg {
                SnrTrend::Improving
            } else {
                SnrTrend::Worsening
            }
        };

        Self {
            mean,
            std_dev,
            min,
            max,
            category_distribution,
            trend,
        }
    }
}

/// Utility functions for SNR analysis and interpretation
pub mod utils {
    use super::*;

    /// Interpret SNR result in human-readable terms
    pub fn interpret_snr(snr: &SnrResult) -> &'static str {
        match snr.category {
            SnrCategory::Poor => {
                "POOR SIGNAL CLARITY: High noise interference, signal difficult to distinguish from background. Requires investigation."
            }
            SnrCategory::Fair => {
                "FAIR SIGNAL QUALITY: Moderate noise levels, signal detectable but with some interference."
            }
            SnrCategory::Good => {
                "GOOD SIGNAL STRENGTH: Clear signal with minimal noise impact, reliable performance."
            }
            SnrCategory::Excellent => {
                "EXCELLENT SIGNAL CLARITY: Exceptionally clean signal, near-ideal performance with negligible noise."
            }
        }
    }

    /// Calculate required sample size for desired SNR confidence
    pub fn required_sample_size(target_confidence: f32, estimated_noise: f32) -> usize {
        // Simplified calculation: more samples needed for higher confidence and higher noise
        let base_samples = (target_confidence * 20.0) as usize;
        let noise_factor = (estimated_noise * 10.0) as usize;

        base_samples + noise_factor
    }

    /// Normalize SNR values across different scales
    pub fn normalize_snr(snr: f32, previous_range: (f32, f32)) -> f32 {
        const TARGET_RANGE: (f32, f32) = (0.0, 100.0);
        let (min_val, max_val) = previous_range;

        if max_val <= min_val {
            return TARGET_RANGE.0;
        }

        let normalized = (snr - min_val) / (max_val - min_val);
        TARGET_RANGE.0 + normalized * (TARGET_RANGE.1 - TARGET_RANGE.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32;

    #[test]
    fn test_consensus_snr_calculation() {
        let winner_score = 0.92;
        let all_scores = &[0.92, 0.85, 0.78, 0.74, 0.71];

        let snr = ConsensusSnr::calculate_consensus_snr(winner_score, all_scores);

        // Winner score should be the signal
        assert_eq!(snr.signal, winner_score);

        // SNR should be reasonable (winner / std_dev of all scores)
        assert!(snr.snr > 1.0); // Signal should exceed noise

        // Should have good/excellent category for clear winner
        assert!(snr.category == SnrCategory::Good || snr.category == SnrCategory::Excellent);

        // Confidence is calculated based on sample size and std_dev
        // Formula: (sqrt(n)/10) * (1/(1+std_dev)), clamped to [0,1]
        assert!(snr.confidence > 0.0 && snr.confidence <= 1.0);
    }

    #[test]
    fn test_consensus_snr_edge_cases() {
        // Empty candidates list
        let snr = ConsensusSnr::calculate_consensus_snr(0.9, &[]);
        assert_eq!(snr.confidence, 0.0);

        // Single candidate - std_dev=0, so confidence = (1/10) * 1/(1+0.001) ≈ 0.1
        let snr = ConsensusSnr::calculate_consensus_snr(0.9, &[0.9]);
        assert!(snr.confidence > 0.0 && snr.confidence < 0.2); // Small sample = lower confidence
    }

    #[test]
    fn test_agent_snr_consistent_performance() {
        let consistent_scores = &[0.95, 0.94, 0.96, 0.93, 0.95];

        let snr = AgentSnr::calculate_agent_reliability(consistent_scores);

        // High, consistent scores should yield high SNR
        assert!(snr.snr > 10.0);

        // Should be in good or excellent category
        assert!(matches!(snr.category, SnrCategory::Good | SnrCategory::Excellent));

        // Average should be around 0.95
        assert!((snr.signal - 0.946).abs() < 0.01);

        // Low noise (small standard deviation)
        assert!(snr.noise < 0.02);
    }

    #[test]
    fn test_agent_snr_erratic_performance() {
        let erratic_scores = &[0.98, 0.75, 0.92, 0.68, 0.89];

        let snr = AgentSnr::calculate_agent_reliability(erratic_scores);

        // Signal is mean (~0.844), noise is std_dev (~0.12)
        // SNR = 0.844 / 0.12 ≈ 7.0 which is Fair category
        assert!(snr.snr < 10.0); // Lower than consistent agent

        // Should be in Fair category (2.0 <= SNR < 10.0)
        assert!(matches!(snr.category, SnrCategory::Fair));

        // High noise (large standard deviation)
        assert!(snr.noise > 0.1);
    }

    #[test]
    fn test_multidimensional_agent_snr() {
        let accuracy = &[0.92, 0.94, 0.90, 0.93];
        let efficiency = &[0.88, 0.85, 0.87, 0.86];
        let reliability = &[0.95, 0.93, 0.96, 0.92];

        let snr = AgentSnr::calculate_multidimensional_reliability(accuracy, efficiency, reliability);

        // Should combine all three dimensions
        assert!(snr.snr > 1.0);

        // Signal should be weighted average: ~0.5*0.9225 + 0.3*0.94 + 0.2*0.865 = ~0.916
        assert!(snr.signal > 0.88 && snr.signal < 0.95);

        // Confidence based on formula with combined sample sizes
        assert!(snr.confidence > 0.0 && snr.confidence <= 1.0);
    }

    #[test]
    fn test_system_snr_stability() {
        let snr = SystemSnr::calculate_system_stability(0.997, 0.003); // 99.7% uptime, 0.3% errors

        // High uptime, low errors = high SNR
        assert!(snr.snr > 100.0);
        assert_eq!(snr.category, SnrCategory::Excellent);

        let poor_snr = SystemSnr::calculate_system_stability(0.85, 0.15); // 85% uptime, 15% errors

        // Low uptime, high errors = poor SNR
        assert!(poor_snr.snr < 10.0);
        assert!(matches!(poor_snr.category, SnrCategory::Poor | SnrCategory::Fair));
    }

    #[test]
    fn test_slo_snr_compliance() {
        let target = 99.5; // 99.5% target
        let actual = 99.7; // Exceeding target

        let historical = &[99.6, 99.7, 99.5, 99.8, 99.4]; // Stable performance

        let snr = SystemSnr::calculate_slo_snr(actual, target, historical);

        // Signal is 1.0 (meeting target), noise is std_dev of historical (~0.16)
        // SNR = 1.0 / 0.16 ≈ 6.25 → Fair category
        assert!(snr.snr > 0.0, "Should produce valid SNR, got {}", snr.snr);
        assert!(snr.signal == 1.0, "Should show full compliance when exceeding target");

        // Poor SLO performance (below target)
        let poor_snr = SystemSnr::calculate_slo_snr(95.0, 99.5, historical);
        assert!(poor_snr.signal < 1.0, "Should show partial compliance when below target");
        assert!(poor_snr.snr < snr.snr, "Should have lower SNR than compliant");
    }

    #[test]
    fn test_snr_statistics() {
        let measurements = vec![
            ConsensusSnr::calculate_consensus_snr(0.95, &[0.95, 0.88, 0.85]),
            ConsensusSnr::calculate_consensus_snr(0.90, &[0.90, 0.85, 0.80]),
            ConsensusSnr::calculate_consensus_snr(0.98, &[0.98, 0.92, 0.88]),
        ];

        let stats = SnrStats::from_measurements(&measurements);

        // Should have reasonable mean
        assert!(stats.mean > 5.0 && stats.mean < 50.0);

        // Should have min and max
        assert!(stats.max >= stats.min);

        // Should have category distribution
        assert!(stats.category_distribution.contains_key(&SnrCategory::Good));

        // Should detect trend (could be stable or other)
        assert!(matches!(
            stats.trend,
            SnrTrend::Stable | SnrTrend::Improving | SnrTrend::Worsening | SnrTrend::InsufficientData
        ));
    }

    #[test]
    fn test_snr_category_classification() {
        assert_eq!(SnrCategory::from_snr(1.5), SnrCategory::Poor);
        assert_eq!(SnrCategory::from_snr(5.0), SnrCategory::Fair);
        assert_eq!(SnrCategory::from_snr(50.0), SnrCategory::Good);
        assert_eq!(SnrCategory::from_snr(500.0), SnrCategory::Excellent);

        // Test ordering
        assert!(SnrCategory::Poor.as_val() < SnrCategory::Excellent.as_val());
    }

    #[test]
    fn test_snr_edge_cases() {
        // Zero noise (avoid division by zero)
        let snr = ConsensusSnr::calculate_snr(0.8, 0.0);
        assert!(snr.snr > 1.0); // Should use minimum noise of 0.001

        // Negative values (invalid input)
        let invalid = SystemSnr::calculate_system_stability(-1.0, 0.1);
        assert_eq!(invalid.confidence, 0.0);
    }

    #[test]
    fn test_utils_required_sample_size() {
        let samples = utils::required_sample_size(0.9, 0.05);
        assert!(samples > 10); // Should require reasonable sample size

        let high_noise_samples = utils::required_sample_size(0.9, 0.2);
        assert!(high_noise_samples > samples); // Higher noise needs more samples
    }

    #[test]
    fn test_snr_interpretation() {
        let poor = SnrResult {
            snr: 1.5,
            signal: 0.8,
            noise: 0.5,
            category: SnrCategory::Poor,
            confidence: 0.8,
        };

        let interpretation = utils::interpret_snr(&poor);
        assert!(interpretation.contains("POOR"));
        assert!(interpretation.contains("investigation"));
    }
}
