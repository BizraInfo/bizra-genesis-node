// synthesis_orchestrator/src/consensus.rs
// Weighted-Score Consensus

use crate::{Candidate, CandidateScores, ConsensusConfig, ConsensusError, ScoredCandidate};

pub struct WeightedScoreConsensus {
    config: ConsensusConfig,
}

impl WeightedScoreConsensus {
    pub fn new(config: ConsensusConfig) -> Self {
        Self { config }
    }

    pub fn select_winner(
        &self,
        candidates: &[ScoredCandidate],
    ) -> Result<Candidate, ConsensusError> {
        if candidates.is_empty() {
            return Err(ConsensusError::NoCandidates);
        }

        let passing: Vec<_> = candidates
            .iter()
            .filter(|c| c.scores.ihsan >= self.config.ihsan_floor)
            .collect();

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

        match best {
            Some(c) => Ok(c.candidate.clone()),
            None => Err(ConsensusError::NoCandidateAboveThreshold),
        }
    }

    fn composite_score(&self, scores: &CandidateScores) -> f32 {
        0.4 * scores.accuracy + 0.3 * scores.safety + 0.2 * scores.efficiency + 0.1 * scores.ihsan
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Candidate, CandidateScores};
    use serde_json::json;

    fn create_candidate(name: &str, accuracy: f32, safety: f32, efficiency: f32, ihsan: f32) -> ScoredCandidate {
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
        let mut config = ConsensusConfig::default();
        config.ihsan_floor = 0.9;
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
        let mut config = ConsensusConfig::default();
        config.ihsan_floor = 0.95;
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
