// synthesis_orchestrator/src/consensus.rs
// Weighted-Score Consensus

use crate::{Candidate, CandidateScores, ConsensusConfig, ConsensusError, ScoredCandidate};
use std::time::Instant;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;
use serde_json::Value;

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
        // Start timing for Prometheus metrics (replaces simulated 45μs)
        let start_time = Instant::now();

        if candidates.is_empty() {
            return Err(ConsensusError::NoCandidates);
        }

        let passing: Vec<_> = candidates
            .iter()
            .filter(|c| c.scores.ihsan >= self.config.ihsan_floor)
            .collect();

        // Record number of Pareto-optimal candidates
        crate::metrics::CONSENSUS_PARETO_CANDIDATES.observe(passing.len() as f64);

        let best = if passing.is_empty() {
            tracing::warn!(
                "No candidates passed Ihsan floor {}. Using fallback.",
                self.config.ihsan_floor
            );

            candidates
                .iter()
                .max_by(|a, b| a.scores.ihsan.partial_cmp(&b.scores.ihsan).unwrap())
        } else {
            passing
                .iter()
                .max_by(|a, b| {
                    let score_a = self.composite_score(&a.scores);
                    let score_b = self.composite_score(&b.scores);
                    score_a.partial_cmp(&score_b).unwrap()
                })
                .map(|v| &**v)
        };

        let result = match best {
            Some(c) => Ok(c.candidate.clone()),
            None => Err(ConsensusError::NoCandidateAboveThreshold),
        };

        // Record metrics after consensus completes
        let elapsed_micros = start_time.elapsed().as_micros() as f64;
        crate::metrics::CONSENSUS_LATENCY_MICROSECONDS.observe(elapsed_micros);
        crate::metrics::CONSENSUS_OPERATIONS_TOTAL.inc();

        tracing::debug!(
            "Consensus completed in {:.2}μs (target: <46μs)",
            elapsed_micros
        );

        result
    }

    fn composite_score(&self, scores: &CandidateScores) -> f32 {
        0.4 * scores.accuracy + 0.3 * scores.safety + 0.2 * scores.efficiency + 0.1 * scores.ihsan
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
