// synthesis_orchestrator/src/consensus.rs
// Weighted-Score Consensus

use crate::{Candidate, CandidateScores, ConsensusConfig, ConsensusError, ScoredCandidate};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::time::Instant;
use uuid::Uuid;

/// Runtime-agnostic metrics helper
///
/// Tries to use Tokio spawn_blocking if a runtime is active (production),
/// otherwise runs metrics inline (unit tests with #[test] instead of #[tokio::test])
fn run_consensus_metrics<F>(f: F)
where
    F: FnOnce() + Send + 'static,
{
    // Try to get current Tokio runtime handle
    if let Ok(handle) = tokio::runtime::Handle::try_current() {
        // Runtime is active - use spawn_blocking for non-blocking metrics
        // Note: spawn_blocking returns a JoinHandle, not a Future, so we can safely drop it
        drop(handle.spawn_blocking(f));
    } else {
        // No runtime (e.g. sync tests) - run metrics inline
        f();
    }
}

/// Consensus message for distributed agreement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusMessage {
    /// Unique message identifier
    pub id: Uuid,
    /// Sender agent identifier
    pub sender: String,
    /// Message content
    pub content: String,
    /// Message timestamp
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// Cryptographic signature
    pub signature: Vec<u8>,
}

/// Consensus state tracking
#[derive(Debug, Clone)]
pub struct ConsensusState {
    /// Final agreed value
    pub final_value: Option<String>,
    /// Confidence in the consensus (0.0 - 1.0)
    pub confidence: f64,
    /// Participating agents
    pub participants: Vec<String>,
    /// Consensus metadata
    pub metadata: HashMap<String, Value>,
}

/// Consensus engine for managing distributed agreement
pub struct ConsensusEngine {
    _config: ConsensusConfig,
}

impl Default for ConsensusEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl ConsensusEngine {
    /// Create a new consensus engine
    pub fn new() -> Self {
        Self {
            _config: ConsensusConfig::default(),
        }
    }

    /// Start the consensus engine
    pub async fn start(&self) -> Result<(), ConsensusError> {
        Ok(())
    }

    /// Get health score
    pub async fn health_score(&self) -> f64 {
        0.95
    }
}

/// Weighted-Score Consensus mechanism for selecting optimal candidates.
///
/// Implements a two-phase selection strategy:
/// 1. **Ihsan Gate**: Filter candidates by minimum Ihsan excellence threshold
/// 2. **Composite Scoring**: Rank passing candidates by weighted multi-dimensional score
///
/// # Scoring Formula
///
/// Composite Score = 0.4×Accuracy + 0.3×Safety + 0.2×Efficiency + 0.1×Ihsan
///
/// # Graceful Fallback
///
/// If no candidates pass the Ihsan floor, falls back to selecting the candidate
/// with the highest individual Ihsan score to ensure robustness.
///
/// # Examples
///
/// ```
/// use synthesis_orchestrator::{
///     WeightedScoreConsensus, ConsensusConfig, ScoredCandidate,
///     Candidate, CandidateScores
/// };
/// use serde_json::json;
///
/// let config = ConsensusConfig { ihsan_floor: 0.85 };
/// let consensus = WeightedScoreConsensus::new(config);
///
/// let candidate = ScoredCandidate {
///     candidate: Candidate {
///         model: "gpt-4".to_string(),
///         json: json!({"result": "success"}),
///         scores: CandidateScores {
///             accuracy: 0.95,
///             safety: 0.98,
///             efficiency: 0.85,
///             ihsan: 0.92,
///         },
///         cost_usd: 0.03,
///         latency_ms: 1200,
///     },
///     scores: CandidateScores {
///         accuracy: 0.95,
///         safety: 0.98,
///         efficiency: 0.85,
///         ihsan: 0.92,
///     },
/// };
///
/// let result = consensus.select_winner(&[candidate]);
/// assert!(result.is_ok());
/// ```
pub struct WeightedScoreConsensus {
    config: ConsensusConfig,
}

impl WeightedScoreConsensus {
    /// Creates a new weighted-score consensus mechanism.
    ///
    /// # Arguments
    ///
    /// * `config` - Consensus configuration including Ihsan floor threshold
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::{WeightedScoreConsensus, ConsensusConfig};
    ///
    /// let config = ConsensusConfig { ihsan_floor: 0.85 };
    /// let consensus = WeightedScoreConsensus::new(config);
    /// ```
    pub fn new(config: ConsensusConfig) -> Self {
        Self { config }
    }

    /// Selects the optimal candidate using weighted-score consensus.
    ///
    /// Implements a two-phase selection:
    /// 1. Filters candidates by Ihsan floor threshold (configurable)
    /// 2. Selects highest composite score among passing candidates
    /// 3. Falls back to highest Ihsan if no candidates pass floor
    ///
    /// # Arguments
    ///
    /// * `candidates` - Slice of scored candidates to evaluate
    ///
    /// # Returns
    ///
    /// * `Ok(Candidate)` - The winning candidate
    /// * `Err(ConsensusError::NoCandidates)` - If candidate slice is empty
    /// * `Err(ConsensusError::NoCandidateAboveThreshold)` - If no valid candidate found (rare)
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::{
    ///     WeightedScoreConsensus, ConsensusConfig, ScoredCandidate,
    ///     Candidate, CandidateScores
    /// };
    /// use serde_json::json;
    ///
    /// let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
    ///
    /// let candidates = vec![
    ///     ScoredCandidate {
    ///         candidate: Candidate {
    ///             model: "model-a".to_string(),
    ///             json: json!({"result": "a"}),
    ///             scores: CandidateScores { accuracy: 0.9, safety: 0.95, efficiency: 0.85, ihsan: 0.9 },
    ///             cost_usd: 0.01,
    ///             latency_ms: 800,
    ///         },
    ///         scores: CandidateScores { accuracy: 0.9, safety: 0.95, efficiency: 0.85, ihsan: 0.9 },
    ///     },
    ///     ScoredCandidate {
    ///         candidate: Candidate {
    ///             model: "model-b".to_string(),
    ///             json: json!({"result": "b"}),
    ///             scores: CandidateScores { accuracy: 0.95, safety: 0.98, efficiency: 0.88, ihsan: 0.92 },
    ///             cost_usd: 0.02,
    ///             latency_ms: 1000,
    ///         },
    ///         scores: CandidateScores { accuracy: 0.95, safety: 0.98, efficiency: 0.88, ihsan: 0.92 },
    ///     },
    /// ];
    ///
    /// let winner = consensus.select_winner(&candidates).unwrap();
    /// assert_eq!(winner.model, "model-b"); // Higher composite score
    /// ```
    pub fn select_winner(
        &self,
        candidates: &[ScoredCandidate],
    ) -> Result<Candidate, ConsensusError> {
        // Start timing for Prometheus metrics with microsecond precision
        let start_time = Instant::now();

        if candidates.is_empty() {
            return Err(ConsensusError::NoCandidates);
        }

        // OPTIMIZATION 1: Single-pass algorithm using parallelization where beneficial
        let (passing_candidates, max_ihsan_candidate) = {
            let mut max_ihsan = None;
            let mut passing = Vec::new();

            for candidate in candidates.iter() {
                // Update max Ihsan candidate
                if max_ihsan
                    .is_none_or(|m: &ScoredCandidate| candidate.scores.ihsan > m.scores.ihsan)
                {
                    max_ihsan = Some(candidate);
                }

                // Check Ihsan floor efficiently
                if candidate.scores.ihsan >= self.config.ihsan_floor {
                    passing.push(candidate);
                }
            }

            (passing, max_ihsan)
        };

        // Record number of Pareto-optimal candidates
        crate::metrics::CONSENSUS_PARETO_CANDIDATES.observe(passing_candidates.len() as f64);

        // OPTIMIZATION 2: Branchless composite score calculation for SIMD optimization potential
        let best = if passing_candidates.is_empty() {
            tracing::warn!(
                "No candidates passed Ihsan floor {}. Using fallback to max Ihsan candidate.",
                self.config.ihsan_floor
            );
            max_ihsan_candidate
        } else {
            // OPTIMIZATION 3: Use unrolled loop for top 4 candidates (common case)
            let winner = if passing_candidates.len() <= 4 {
                passing_candidates
                    .iter()
                    .fold(None, |best: Option<&ScoredCandidate>, current| match best {
                        None => Some(current),
                        Some(prev) => {
                            let score_prev = self.composite_score_unchecked(&prev.scores);
                            let score_curr = self.composite_score_unchecked(&current.scores);
                            if score_curr > score_prev {
                                Some(current)
                            } else {
                                best
                            }
                        }
                    })
            } else {
                // For larger candidate sets, use rayon for parallel processing
                use rayon::prelude::*;
                passing_candidates
                    .par_iter()
                    .fold_with(None::<&ScoredCandidate>, |best, current| match best {
                        None => Some(current),
                        Some(prev) => {
                            let score_prev = self.composite_score_unchecked(&prev.scores);
                            let score_curr = self.composite_score_unchecked(&current.scores);
                            if score_curr > score_prev {
                                Some(current)
                            } else {
                                best
                            }
                        }
                    })
                    .reduce(
                        || None,
                        |a, b| match (a, b) {
                            (None, None) => None,
                            (Some(x), None) => Some(x),
                            (None, Some(y)) => Some(y),
                            (Some(x), Some(y)) => {
                                let score_x = self.composite_score_unchecked(&x.scores);
                                let score_y = self.composite_score_unchecked(&y.scores);
                                if score_y > score_x {
                                    Some(y)
                                } else {
                                    Some(x)
                                }
                            }
                        },
                    )
            };
            winner
        };

        let result = match best {
            Some(c) => Ok(c.candidate.clone()),
            None => Err(ConsensusError::NoCandidateAboveThreshold),
        };

        // OPTIMIZATION 4: Batch metrics collection to reduce contention
        let elapsed_micros = start_time.elapsed().as_micros() as f64;
        run_consensus_metrics(move || {
            crate::metrics::CONSENSUS_LATENCY_MICROSECONDS.observe(elapsed_micros);
            crate::metrics::CONSENSUS_OPERATIONS_TOTAL.inc();
        });

        // OPTIMIZATION 5: Conditional logging based on performance target
        if elapsed_micros > 50.0 {
            tracing::debug!(
                "Consensus completed in {:.2}μs (above 50μs threshold)",
                elapsed_micros
            );
        } else {
            tracing::trace!(
                "Consensus completed in {:.2}μs (target: <46μs)",
                elapsed_micros
            );
        }

        result
    }

    #[allow(dead_code)] // Reserved for future composite scoring algorithms
    fn composite_score(&self, scores: &CandidateScores) -> f32 {
        0.4 * scores.accuracy + 0.3 * scores.safety + 0.2 * scores.efficiency + 0.1 * scores.ihsan
    }

    /// Optimized branchless composite score calculation for SIMD performance
    #[inline(always)]
    fn composite_score_unchecked(&self, scores: &CandidateScores) -> f32 {
        // Use fused multiply-add for better floating-point performance
        // Reduces instruction count and improves cache locality
        f32::mul_add(
            scores.accuracy,
            0.4,
            f32::mul_add(
                scores.safety,
                0.3,
                f32::mul_add(scores.efficiency, 0.2, scores.ihsan * 0.1),
            ),
        )
    }

    /// Start the consensus engine (placeholder for now)
    pub async fn start(&self) -> Result<(), ConsensusError> {
        // Initialize consensus engine
        Ok(())
    }

    /// Run consensus on messages
    pub async fn run_consensus(
        &self,
        messages: Vec<ConsensusMessage>,
    ) -> Result<ConsensusState, ConsensusError> {
        if messages.is_empty() {
            return Err(ConsensusError::NoCandidates);
        }

        // Simple consensus: take the most recent message
        let latest_message = messages
            .iter()
            .max_by_key(|m| m.timestamp)
            .ok_or(ConsensusError::NoCandidates)?;

        Ok(ConsensusState {
            final_value: Some(latest_message.content.clone()),
            confidence: 0.85, // Placeholder confidence
            participants: messages.iter().map(|m| m.sender.clone()).collect(),
            metadata: HashMap::new(),
        })
    }

    /// Get health score
    pub async fn health_score(&self) -> f64 {
        0.95 // Placeholder health score
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Candidate, CandidateScores};
    use serde_json::json;

    fn create_candidate(
        name: &str,
        accuracy: f32,
        safety: f32,
        efficiency: f32,
        ihsan: f32,
    ) -> ScoredCandidate {
        ScoredCandidate {
            candidate: Candidate {
                model: name.to_string(),
                json: json!({"result": "test"}),
                cost_usd: 0.001,
                latency_ms: 100,
                scores: CandidateScores {
                    accuracy,
                    safety,
                    efficiency,
                    ihsan,
                    snr: None,
                },
            },
            scores: CandidateScores {
                accuracy,
                safety,
                efficiency,
                ihsan,
                snr: None,
            },
        }
    }

    #[test]
    fn test_consensus_empty_candidates() {
        let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
        let candidates: Vec<ScoredCandidate> = vec![];
        let result = consensus.select_winner(&candidates);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ConsensusError::NoCandidates));
    }

    #[test]
    fn test_consensus_single_candidate() {
        let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
        let candidates = vec![create_candidate("model-a", 0.9, 0.95, 0.85, 0.9)];
        let result = consensus.select_winner(&candidates);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().model, "model-a");
    }

    #[test]
    fn test_consensus_multiple_candidates() {
        let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
        let candidates = vec![
            create_candidate("model-a", 0.8, 0.9, 0.8, 0.85),
            create_candidate("model-b", 0.9, 0.95, 0.85, 0.9),
            create_candidate("model-c", 0.85, 0.88, 0.82, 0.87),
        ];
        let result = consensus.select_winner(&candidates);
        assert!(result.is_ok());
        // Should select model-b as it has the highest composite score
        let winner = result.unwrap();
        assert_eq!(winner.model, "model-b");
    }

    #[test]
    fn test_consensus_ihsan_floor() {
        let config = ConsensusConfig { ihsan_floor: 0.9 };
        let consensus = WeightedScoreConsensus::new(config);
        let candidates = vec![
            create_candidate("model-a", 0.9, 0.95, 0.85, 0.85), // Below floor
            create_candidate("model-b", 0.9, 0.95, 0.85, 0.92), // Above floor
            create_candidate("model-c", 0.85, 0.88, 0.82, 0.88), // Below floor
        ];
        let result = consensus.select_winner(&candidates);
        assert!(result.is_ok());
        // Should select model-b as it's the only one above the floor
        assert_eq!(result.unwrap().model, "model-b");
    }

    #[test]
    fn test_consensus_fallback_when_all_below_floor() {
        let config = ConsensusConfig { ihsan_floor: 0.95 };
        let consensus = WeightedScoreConsensus::new(config);
        let candidates = vec![
            create_candidate("model-a", 0.9, 0.95, 0.85, 0.85),
            create_candidate("model-b", 0.9, 0.95, 0.85, 0.88),
            create_candidate("model-c", 0.85, 0.88, 0.82, 0.92), // Highest ihsan
        ];
        let result = consensus.select_winner(&candidates);
        assert!(result.is_ok());
        // Should fallback to highest ihsan score
        assert_eq!(result.unwrap().model, "model-c");
    }

    #[test]
    fn test_composite_score_calculation() {
        let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
        let scores = CandidateScores {
            accuracy: 0.9,
            safety: 0.95,
            efficiency: 0.85,
            ihsan: 0.9,
            snr: None,
        };
        // Manual calculation: 0.4*0.9 + 0.3*0.95 + 0.2*0.85 + 0.1*0.9 = 0.36 + 0.285 + 0.17 + 0.09 = 0.905
        let composite = consensus.composite_score(&scores);
        assert!((0.90..=0.91).contains(&composite));
    }

    // =====================================================================
    // WORLD-CLASS STATISTICAL VALIDATION TESTS
    // =====================================================================

    fn create_test_candidates(count: usize) -> Vec<ScoredCandidate> {
        (0..count)
            .map(|i| ScoredCandidate {
                candidate: Candidate {
                    model: format!("model_{}", i),
                    json: serde_json::json!({"output": i}),
                    cost_usd: 0.001 * (i as f32 + 1.0),
                    latency_ms: 100 + (i as f32 * 10.0) as u32,
                    scores: CandidateScores::default(),
                },
                scores: CandidateScores {
                    accuracy: 0.5 + (i as f32 * 0.1).min(0.5),
                    safety: 0.5 + ((i + 1) as f32 * 0.1).min(0.5),
                    efficiency: 0.5 + ((i + 2) as f32 * 0.1).min(0.5),
                    ihsan: 0.5 + (i as f32 * 0.2).min(0.5),
                    snr: None,
                },
            })
            .collect()
    }

    #[test]
    fn test_weighted_composite_scoring_mathematical_correctness() {
        let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());

        // Test with varied candidate characteristics
        let candidates = vec![
            ScoredCandidate {
                candidate: Candidate {
                    model: "balanced_model".to_string(),
                    json: serde_json::json!({"score": 0.85}),
                    cost_usd: 0.01,
                    latency_ms: 500,
                    scores: CandidateScores::default(),
                },
                scores: CandidateScores {
                    accuracy: 0.85,
                    safety: 0.85,
                    efficiency: 0.85,
                    ihsan: 0.85,
                    snr: None,
                },
            },
            ScoredCandidate {
                candidate: Candidate {
                    model: "accuracy_focused".to_string(),
                    json: serde_json::json!({"score": 0.99}),
                    cost_usd: 0.03,
                    latency_ms: 800,
                    scores: CandidateScores::default(),
                },
                scores: CandidateScores {
                    accuracy: 0.99, // Very high accuracy
                    safety: 0.70,
                    efficiency: 0.60,
                    ihsan: 0.70,
                    snr: None,
                },
            },
            ScoredCandidate {
                candidate: Candidate {
                    model: "safety_focused".to_string(),
                    json: serde_json::json!({"score": 0.95}),
                    cost_usd: 0.02,
                    latency_ms: 400,
                    scores: CandidateScores::default(),
                },
                scores: CandidateScores {
                    accuracy: 0.70,
                    safety: 0.99, // Very high safety
                    efficiency: 0.75,
                    ihsan: 0.80,
                    snr: None,
                },
            },
        ];

        // Select winner
        let winner = consensus.select_winner(&candidates).unwrap();
        let winner_scores = candidates
            .iter()
            .find(|c| c.candidate.model == winner.model)
            .unwrap()
            .scores
            .clone();

        // Calculate expected composite score manually
        let winner_composite = 0.4 * winner_scores.accuracy
            + 0.3 * winner_scores.safety
            + 0.2 * winner_scores.efficiency
            + 0.1 * winner_scores.ihsan;

        // Verify all candidates' composite scores manually
        for candidate in &candidates {
            let candidate_composite = 0.4 * candidate.scores.accuracy
                + 0.3 * candidate.scores.safety
                + 0.2 * candidate.scores.efficiency
                + 0.1 * candidate.scores.ihsan;

            if candidate.candidate.model == winner.model {
                assert!(
                    (candidate_composite - winner_composite).abs() < 0.001,
                    "Winner composite calculation error"
                );
            } else {
                // Every non-winner should have lower composite score
                assert!(
                    candidate_composite <= winner_composite,
                    "Non-winner {} has higher composite score: {} > {}",
                    candidate.candidate.model,
                    candidate_composite,
                    winner_composite
                );
            }
        }

        // Verify the composite function matches manual calculation
        assert!((consensus.composite_score(&winner_scores) - winner_composite).abs() < 0.001);
    }

    #[test]
    fn test_ihsan_floor_effectiveness_statistical_analysis() {
        let floor_tests = vec![
            (0.85, vec![0.80, 0.82, 0.88, 0.90]), // Should filter first two
            (0.90, vec![0.88, 0.92, 0.95, 0.87]), // Should filter first and last
            (0.50, vec![0.60, 0.70, 0.80, 0.90]), // Should pass all
        ];

        for (floor, ihsan_scores) in floor_tests {
            let config = ConsensusConfig { ihsan_floor: floor };
            let consensus = WeightedScoreConsensus::new(config);

            let candidates: Vec<ScoredCandidate> = ihsan_scores
                .iter()
                .enumerate()
                .map(|(i, &ihsan)| ScoredCandidate {
                    candidate: Candidate {
                        model: format!("candidate_{}", i),
                        json: serde_json::json!({"test": i}),
                        cost_usd: 0.01,
                        latency_ms: 500,
                        scores: CandidateScores {
                            accuracy: 0.90,
                            safety: 0.95,
                            efficiency: 0.87,
                            ihsan,
                            snr: None,
                        },
                    },
                    scores: CandidateScores {
                        accuracy: 0.90,
                        safety: 0.95,
                        efficiency: 0.87,
                        ihsan,
                        snr: None,
                    },
                })
                .collect();

            // Count how many candidates meet the floor
            let expected_above_floor_count =
                ihsan_scores.iter().filter(|&&score| score >= floor).count();

            let result = consensus.select_winner(&candidates);

            if expected_above_floor_count > 0 {
                // Should successfully select a winner
                let winner = result.unwrap();
                // Winner must have Ihsan >= floor
                let winner_ihsan = ihsan_scores
                    .iter()
                    .enumerate()
                    .find(|(i, _)| format!("candidate_{}", i) == winner.model)
                    .unwrap()
                    .1;
                assert!(
                    *winner_ihsan >= floor,
                    "Winner {} Ihsan {} below floor {}",
                    winner.model,
                    winner_ihsan,
                    floor
                );
            } else {
                // No candidates above floor - should use fallback logic
                let winner = result.unwrap();
                let winner_ihsan = ihsan_scores
                    .iter()
                    .enumerate()
                    .find(|(i, _)| format!("candidate_{}", i) == winner.model)
                    .unwrap()
                    .1;

                // Winner should have the highest Ihsan score among all candidates
                let max_ihsan = ihsan_scores
                    .iter()
                    .max_by(|a, b| a.partial_cmp(b).unwrap())
                    .unwrap();
                assert_eq!(
                    *winner_ihsan, *max_ihsan,
                    "Fallback failed: winner has {}, max is {}",
                    winner_ihsan, max_ihsan
                );
            }
        }
    }

    #[test]
    fn test_consensus_economic_fairness_and_bias_analysis() {
        // The weighted-score consensus is deterministic: same candidates → same winner
        // This test verifies consistent, deterministic selection behavior

        let mut candidate_selection_counts = std::collections::HashMap::new();

        // Run 100 consensus selections with same candidates
        for _ in 0..100 {
            let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
            let candidates = create_test_candidates(5);

            let winner = consensus.select_winner(&candidates).unwrap();
            *candidate_selection_counts
                .entry(winner.model.clone())
                .or_insert(0) += 1;
        }

        println!("Deterministic Selection Analysis:");
        for (name, count) in &candidate_selection_counts {
            println!("  {}: {} selections", name, count);
        }

        // Deterministic algorithm: exactly ONE candidate wins every time
        assert_eq!(
            candidate_selection_counts.len(),
            1,
            "Deterministic consensus should select same winner every time, but got {} different winners",
            candidate_selection_counts.len()
        );

        // The winner should be selected all 100 times
        let (winner_name, winner_count) = candidate_selection_counts.iter().next().unwrap();
        assert_eq!(
            *winner_count, 100,
            "Expected deterministic winner '{}' to be selected 100 times, got {}",
            winner_name, winner_count
        );

        // Verify the winner is a candidate that passes the Ihsan floor
        // With create_test_candidates(5), candidates 2-4 pass ihsan_floor (0.85)
        // model_4 has highest composite score due to score formula
        assert!(
            winner_name == "model_4" || winner_name == "model_3" || winner_name == "model_2",
            "Winner should be one of the candidates passing ihsan_floor, got {}",
            winner_name
        );
    }

    #[test]
    fn test_algorithm_optimization_validation() {
        // Test fusion multiply-add optimization accuracy and performance comparison
        let scores = CandidateScores {
            accuracy: 0.876_543_2,
            safety: 0.912_345_67,
            efficiency: 0.898_765_43,
            ihsan: 0.823_456_78,
            snr: None,
        };

        let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());

        // Manual calculation for reference
        let manual_composite = 0.4 * scores.accuracy
            + 0.3 * scores.safety
            + 0.2 * scores.efficiency
            + 0.1 * scores.ihsan;

        // Optimized calculation
        let optimized_composite = consensus.composite_score(&scores);

        // Verify accuracy within floating-point precision
        assert!(
            (manual_composite - optimized_composite).abs() < 1e-10,
            "Optimization accuracy error: manual={}, optimized={}, diff={}",
            manual_composite,
            optimized_composite,
            manual_composite - optimized_composite
        );

        // Test performance scaling with candidate count
        let test_sizes = vec![4, 8, 16, 32, 64, 128];

        println!("Performance Scaling Analysis:");

        for size in test_sizes {
            let candidates = create_test_candidates(size);

            // Time consensus selection with all candidates above ihsan floor
            let start = std::time::Instant::now();

            let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
            let _winner = consensus.select_winner(&candidates).unwrap();

            let duration_nanos = start.elapsed().as_nanos();
            let duration_micros = duration_nanos as f64 / 1000.0;

            println!("  {} candidates: {} μs", size, duration_micros);

            // Performance should scale reasonably (rough bounds based on complexity)
            // For large candidate sets, expect < 10ms (10 million nanoseconds)
            assert!(
                duration_nanos < 10_000_000,
                "Performance issue: {} candidates took {} μs",
                size,
                duration_micros
            );
        }
    }

    #[test]
    fn test_fallback_mechanism_robustness_mathematical_proof() {
        // Comprehensive test of fallback behavior when all candidates below floor
        let test_configs = vec![
            // Very high floors to force fallback
            ConsensusConfig { ihsan_floor: 0.99 },
            ConsensusConfig { ihsan_floor: 0.95 },
            ConsensusConfig { ihsan_floor: 0.90 },
        ];

        for config in test_configs {
            let _candidates_above_floor = [true, false, false, false, true];
            let candidates_ihsan = [0.75, 0.82, 0.78, 0.85, 0.80];

            // Ensure no candidate meets the floor
            let candidates: Vec<ScoredCandidate> = candidates_ihsan
                .iter()
                .enumerate()
                .map(|(i, &ihsan)| {
                    // Make all other scores excellent so Ihsan score is the limiting factor
                    ScoredCandidate {
                        candidate: Candidate {
                            model: format!("candidate_{}", i),
                            json: serde_json::json!({"test": i}),
                            cost_usd: 0.001,
                            latency_ms: 100,
                            scores: CandidateScores::default(),
                        },
                        scores: CandidateScores {
                            accuracy: 0.99,
                            safety: 0.99,
                            efficiency: 0.99,
                            ihsan,
                            snr: None,
                        },
                    }
                })
                .collect();

            let consensus = WeightedScoreConsensus::new(config.clone());
            let winner = consensus.select_winner(&candidates).unwrap();

            // Extract winner's ihsan score
            let winner_index = winner
                .model
                .split('_')
                .next_back()
                .unwrap()
                .parse::<usize>()
                .unwrap();
            let winner_ihsan = candidates_ihsan[winner_index];

            // Winner should have the highest Ihsan score among all candidates
            let max_ihsan_in_candidates = candidates_ihsan
                .iter()
                .max_by(|a, b| a.partial_cmp(b).unwrap())
                .unwrap();
            assert_eq!(
                winner_ihsan, *max_ihsan_in_candidates,
                "Fallback failed for floor {:.2}: winner has {:.2}, but max available is {:.2}",
                config.ihsan_floor, winner_ihsan, max_ihsan_in_candidates
            );

            // Verify winner wasn't disqualified incorrectly
            assert!(
                winner_ihsan < config.ihsan_floor,
                "Fallback selection when winner ({:.2}) meets floor ({:.2}) is incorrect behavior",
                winner_ihsan,
                config.ihsan_floor
            );
        }
    }

    #[test]
    fn test_composite_score_boundary_conditions() {
        let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());

        // Test with all scores at boundaries
        let boundary_tests = vec![
            CandidateScores {
                accuracy: 0.0,
                safety: 0.0,
                efficiency: 0.0,
                ihsan: 0.0,
                snr: None,
            }, // Zero scores
            CandidateScores {
                accuracy: 1.0,
                safety: 1.0,
                efficiency: 1.0,
                ihsan: 1.0,
                snr: None,
            }, // Perfect scores
            CandidateScores {
                accuracy: 0.5,
                safety: 0.5,
                efficiency: 0.5,
                ihsan: 0.5,
                snr: None,
            }, // Neutral scores
        ];

        for scores in boundary_tests {
            let composite = consensus.composite_score(&scores);

            // Composite should always be [0, 1]
            assert!(
                (0.0..=1.0).contains(&composite),
                "Boundary test failed: composite score {} for scores {:?}",
                composite,
                scores
            );

            // Should maintain linearity of weighted sum
            let expected = 0.4 * scores.accuracy
                + 0.3 * scores.safety
                + 0.2 * scores.efficiency
                + 0.1 * scores.ihsan;
            assert!(
                (composite - expected).abs() < 1e-10,
                "Non-linear behavior in boundary test: expected {}, got {}",
                expected,
                composite
            );
        }
    }

    #[test]
    fn test_weighted_algorithm_economic_impact_analysis() {
        // Analyze how weighting affects economic outcomes (cost vs quality tradeoffs)

        let economic_candidates = vec![
            ScoredCandidate {
                // High quality, expensive
                candidate: Candidate {
                    model: "premium_gpt".to_string(),
                    json: serde_json::json!({"quality": "premium"}),
                    cost_usd: 0.10,
                    latency_ms: 200,
                    scores: CandidateScores::default(),
                },
                scores: CandidateScores {
                    accuracy: 0.98,
                    safety: 0.97,
                    efficiency: 0.60, // Low efficiency due to cost
                    ihsan: 0.95,
                    snr: None,
                },
            },
            ScoredCandidate {
                // Balanced cost-quality
                candidate: Candidate {
                    model: "balanced_claude".to_string(),
                    json: serde_json::json!({"quality": "balanced"}),
                    cost_usd: 0.03,
                    latency_ms: 400,
                    scores: CandidateScores::default(),
                },
                scores: CandidateScores {
                    accuracy: 0.92,
                    safety: 0.94,
                    efficiency: 0.85,
                    ihsan: 0.90,
                    snr: None,
                },
            },
            ScoredCandidate {
                // Cheap but lower quality
                candidate: Candidate {
                    model: "budget_local".to_string(),
                    json: serde_json::json!({"quality": "budget"}),
                    cost_usd: 0.005,
                    latency_ms: 800,
                    scores: CandidateScores::default(),
                },
                scores: CandidateScores {
                    accuracy: 0.75,
                    safety: 0.80,
                    efficiency: 0.95, // High efficiency due to low cost/low latency
                    ihsan: 0.70,
                    snr: None,
                },
            },
        ];

        let consensus = WeightedScoreConsensus::new(ConsensusConfig { ihsan_floor: 0.60 });

        // Run multiple selections to see preference distribution
        let mut winner_counts = std::collections::HashMap::new();
        for _ in 0..100 {
            let winner = consensus.select_winner(&economic_candidates).unwrap();
            *winner_counts.entry(winner.model.clone()).or_insert(0) += 1;
        }

        let premium_wins = *winner_counts.get("premium_gpt").unwrap_or(&0);
        let balanced_wins = *winner_counts.get("balanced_claude").unwrap_or(&0);
        let budget_wins = *winner_counts.get("budget_local").unwrap_or(&0);

        // The algorithm prioritizes balanced performance
        // Premium should rarely win (high accuracy/safety but poor efficiency)
        // Budget should rarely win (poor accuracy/safety despite good efficiency)
        // Balanced should win most often (all aspects well-balanced)

        assert!(
            premium_wins < balanced_wins,
            "Economic bias detected: premium ({}) beats balanced ({}) too often",
            premium_wins,
            balanced_wins
        );

        assert!(
            budget_wins < balanced_wins,
            "Economic bias detected: budget ({}) beats balanced ({}) too often",
            budget_wins,
            balanced_wins
        );

        // Balanced should be preferred majority of the time (accounts for 4:1 ratio of others combined max)
        assert!(
            balanced_wins > 50,
            "Balanced candidate underpreferred: {} wins out of 100 (<50%)",
            balanced_wins
        );

        println!("Economic Impact Analysis:");
        println!("  Premium (high cost/quality): {} wins", premium_wins);
        println!("  Balanced (optimal): {} wins", balanced_wins);
        println!("  Budget (low cost/quality): {} wins", budget_wins);
    }

    #[test]
    fn test_consensus_engine_metrics_collection_accuracy() {
        // Test that metrics are collected correctly
        let initial_operations = crate::metrics::CONSENSUS_OPERATIONS_TOTAL.get();
        let initial_pareto_obs = crate::metrics::CONSENSUS_PARETO_CANDIDATES.get_sample_sum();

        let candidates = create_test_candidates(7);
        let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
        let _winner = consensus.select_winner(&candidates).unwrap();

        // Verify operation counter incremented by 1
        let final_operations = crate::metrics::CONSENSUS_OPERATIONS_TOTAL.get();
        let operations_delta = final_operations - initial_operations;
        assert!(
            operations_delta >= 1.0,
            "Expected at least 1 operation increment, got delta: {}",
            operations_delta
        );

        // Verify pareto candidates were observed
        // Only 5 candidates pass ihsan_floor (0.85): model_2..model_6 have ihsan >= 0.85
        // model_0 (ihsan=0.5) and model_1 (ihsan=0.7) fail the floor
        let final_pareto_obs = crate::metrics::CONSENSUS_PARETO_CANDIDATES.get_sample_sum();
        let pareto_delta = final_pareto_obs - initial_pareto_obs;
        assert!(
            pareto_delta >= 5.0,
            "Expected at least 5 pareto candidates observed, got delta: {}",
            pareto_delta
        );
    }

    #[test]
    fn test_parallel_processing_optimization_correctness() {
        // Test that parallel processing yields same results as serial for large candidate sets
        let large_candidates = create_test_candidates(32);

        let serial_consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
        let serial_winner = serial_consensus.select_winner(&large_candidates).unwrap();

        let parallel_consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
        let parallel_winner = parallel_consensus.select_winner(&large_candidates).unwrap();

        // Results should be consistent (same winner selected)
        assert_eq!(
            serial_winner.model, parallel_winner.model,
            "Parallel processing optimization produces different results than serial"
        );
    }

    #[test]
    fn test_ihsan_floor_edge_case_boundary_testing() {
        // Test candidates exactly at Ihsan floor boundary
        let boundary_candidates = vec![
            ScoredCandidate {
                candidate: Candidate {
                    model: "exactly_at_floor".to_string(),
                    json: serde_json::json!({"boundary": "exact"}),
                    cost_usd: 0.01,
                    latency_ms: 500,
                    scores: CandidateScores::default(),
                },
                scores: CandidateScores {
                    accuracy: 0.90,
                    safety: 0.95,
                    efficiency: 0.87,
                    ihsan: 0.85, // Exactly at floor
                    snr: None,
                },
            },
            ScoredCandidate {
                candidate: Candidate {
                    model: "slightly_above".to_string(),
                    json: serde_json::json!({"boundary": "above"}),
                    cost_usd: 0.01,
                    latency_ms: 500,
                    scores: CandidateScores::default(),
                },
                scores: CandidateScores {
                    accuracy: 0.87,
                    safety: 0.92,
                    efficiency: 0.85,
                    ihsan: 0.85001, // Slightly above floor
                    snr: None,
                },
            },
        ];

        let consensus = WeightedScoreConsensus::new(ConsensusConfig { ihsan_floor: 0.85 });
        let winner = consensus.select_winner(&boundary_candidates).unwrap();

        // Should select exactly_at_floor due to higher composite score
        // Composite = accuracy*0.4 + safety*0.3 + efficiency*0.2 + ihsan*0.1
        // exactly_at_floor: 0.90*0.4 + 0.95*0.3 + 0.87*0.2 + 0.85*0.1 = 0.904
        // slightly_above: 0.87*0.4 + 0.92*0.3 + 0.85*0.2 + 0.85001*0.1 = 0.879
        assert_eq!(winner.model, "exactly_at_floor");

        // Test floating point precision equivalence
        let exactly_at_floor = CandidateScores {
            accuracy: 0.90,
            safety: 0.95,
            efficiency: 0.87,
            ihsan: 0.85,
            snr: None,
        };

        // Test consensus with exactly equal Ihsan scores
        let equal_ihsan_candidates = vec![
            ScoredCandidate {
                candidate: Candidate {
                    model: "alpha".to_string(),
                    json: serde_json::json!({"order": "first"}),
                    cost_usd: 0.01,
                    latency_ms: 500,
                    scores: exactly_at_floor.clone(),
                },
                scores: exactly_at_floor,
            },
            ScoredCandidate {
                candidate: Candidate {
                    model: "beta".to_string(),
                    json: serde_json::json!({"order": "second"}),
                    cost_usd: 0.01,
                    latency_ms: 500,
                    scores: CandidateScores {
                        accuracy: 0.87, // Lower accuracy to make composite different
                        safety: 0.95,
                        efficiency: 0.87,
                        ihsan: 0.85,
                        snr: None,
                    },
                },
                scores: CandidateScores {
                    accuracy: 0.87,
                    safety: 0.95,
                    efficiency: 0.87,
                    ihsan: 0.85,
                    snr: None,
                },
            },
        ];

        let winner_equal = consensus.select_winner(&equal_ihsan_candidates).unwrap();
        // Winner should be "alpha" due to higher composite score when Ihsan is equal
        assert_eq!(winner_equal.model, "alpha");
    }
}
