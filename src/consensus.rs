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

    pub fn select_winner(&self, candidates: &[ScoredCandidate]) -> Result<Candidate, ConsensusError> {
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
            passing.iter().max_by(|a, b| {
                let score_a = self.composite_score(&a.scores);
                let score_b = self.composite_score(&b.scores);
                score_a.partial_cmp(&score_b).unwrap()
            }).map(|v| &**v)
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
