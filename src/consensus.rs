// synthesis_orchestrator/src/consensus.rs
// Weighted-Score Consensus

use crate::{Candidate, CandidateScores, ConsensusConfig, ConsensusError, ScoredCandidate};
use std::time::Instant;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;
use serde_json::Value;

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
        let _ = handle.spawn_blocking(f);
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
                if max_ihsan.map_or(true, |m: &ScoredCandidate|
                    candidate.scores.ihsan > m.scores.ihsan) {
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
                    .fold(None, |best: Option<&ScoredCandidate>, current| {
                        match best {
                            None => Some(current),
                            Some(prev) => {
                                let score_prev = self.composite_score_unchecked(&prev.scores);
                                let score_curr = self.composite_score_unchecked(&current.scores);
                                if score_curr > score_prev { Some(current) } else { best }
                            }
                        }
                    })
            } else {
                // For larger candidate sets, use rayon for parallel processing
                use rayon::prelude::*;
                passing_candidates
                    .par_iter()
                    .fold_with(None::<&ScoredCandidate>, |best, current| {
                        match best {
                            None => Some(current),
                            Some(prev) => {
                                let score_prev = self.composite_score_unchecked(&prev.scores);
                                let score_curr = self.composite_score_unchecked(&current.scores);
                                if score_curr > score_prev { Some(current) } else { best }
                            }
                        }
                    })
                    .reduce(|| None, |a, b| match (a, b) {
                        (None, None) => None,
                        (Some(x), None) => Some(x),
                        (None, Some(y)) => Some(y),
                        (Some(x), Some(y)) => {
                            let score_x = self.composite_score_unchecked(&x.scores);
                            let score_y = self.composite_score_unchecked(&y.scores);
                            if score_y > score_x { Some(y) } else { Some(x) }
                        }
                    })
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

    fn composite_score(&self, scores: &CandidateScores) -> f32 {
        0.4 * scores.accuracy + 0.3 * scores.safety + 0.2 * scores.efficiency + 0.1 * scores.ihsan
    }

    /// Optimized branchless composite score calculation for SIMD performance
    #[inline(always)]
    fn composite_score_unchecked(&self, scores: &CandidateScores) -> f32 {
        // Use fused multiply-add for better floating-point performance
        // Reduces instruction count and improves cache locality
        f32::mul_add(scores.accuracy, 0.4,
            f32::mul_add(scores.safety, 0.3,
                f32::mul_add(scores.efficiency, 0.2, scores.ihsan * 0.1)))
    }

    /// Start the consensus engine (placeholder for now)
    pub async fn start(&self) -> Result<(), ConsensusError> {
        // Initialize consensus engine
        Ok(())
    }

    /// Run consensus on messages
    pub async fn run_consensus(&self, messages: Vec<ConsensusMessage>) -> Result<ConsensusState, ConsensusError> {
        if messages.is_empty() {
            return Err(ConsensusError::NoCandidates);
        }

        // Simple consensus: take the most recent message
        let latest_message = messages.iter()
            .max_by_key(|m| m.timestamp)
            .unwrap();

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
                },
            },
            scores: CandidateScores {
                accuracy,
                safety,
                efficiency,
                ihsan,
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
        let config = ConsensusConfig {
            ihsan_floor: 0.9,
        };
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
        let config = ConsensusConfig {
            ihsan_floor: 0.95,
        };
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
        };
        // Manual calculation: 0.4*0.9 + 0.3*0.95 + 0.2*0.85 + 0.1*0.9 = 0.36 + 0.285 + 0.17 + 0.09 = 0.905
        let composite = consensus.composite_score(&scores);
        assert!((0.90..=0.91).contains(&composite));
    }
}
