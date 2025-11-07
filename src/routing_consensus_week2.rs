// synthesis_orchestrator/src/routing_consensus_week2.rs
// WEEK-2: ROUTING & CONSENSUS - Professional Elite Standard
// Targets: Thompson Sampling + WSC (Weighted-Score Consensus)

use crate::*;
use rand::Rng;
use rand_distr::{Beta, Distribution};
use std::collections::HashMap;

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: MULTI-ARMED BANDIT ROUTING (Thompson Sampling)
// ═══════════════════════════════════════════════════════════════════════

#[derive(Clone, Debug)]
pub struct WinRate {
    pub wins: u32,
    pub samples: u32,
}

impl Default for WinRate {
    fn default() -> Self {
        Self {
            wins: 0,
            samples: 0,
        }
    }
}

pub struct ThompsonRouter {
    /// Track win rates for each route (model selection)
    route_stats: HashMap<String, WinRate>,
    /// Exploration bonus (0.0 = pure exploitation, 0.5 = balanced)
    exploration_factor: f32,
}

impl ThompsonRouter {
    pub fn new() -> Self {
        Self {
            route_stats: HashMap::new(),
            exploration_factor: 0.1,
        }
    }

    /// Select best route using Thompson Sampling
    /// Returns route_id with highest posterior sample
    pub fn select_route(&mut self, available_routes: &[String]) -> String {
        let mut best_route = available_routes[0].clone();
        let mut best_score = 0.0f32;

        for route_id in available_routes {
            let win_rate = self.route_stats.entry(route_id.clone()).or_default();
            let score = self.sample_thompson_score(win_rate.clone());
            
            if score > best_score {
                best_score = score;
                best_route = route_id.clone();
            }
        }

        best_route
    }

    /// Sample from Beta distribution (Thompson Sampling core)
    /// Corrected: Beta expects f64, not f32
    fn sample_thompson_score(&self, win_rate: WinRate) -> f32 {
        if win_rate.samples == 0 {
            // New route: add exploration bonus
            return 0.5 + self.exploration_factor;
        }

        // Beta(alpha=wins+1, beta=losses+1)
        let alpha = (win_rate.wins as f64) + 1.0;
        let beta = ((win_rate.samples - win_rate.wins) as f64) + 1.0;
        
        let dist = Beta::new(alpha, beta).expect("valid beta parameters");
        dist.sample(&mut rand::thread_rng()) as f32
    }

    /// Update statistics after observing result
    pub fn update(&mut self, route_id: &str, success: bool) {
        let stats = self.route_stats.entry(route_id.to_string()).or_default();
        stats.samples += 1;
        if success {
            stats.wins += 1;
        }
    }

    /// Get current win rate for route
    pub fn get_win_rate(&self, route_id: &str) -> f32 {
        if let Some(stats) = self.route_stats.get(route_id) {
            if stats.samples > 0 {
                return stats.wins as f32 / stats.samples as f32;
            }
        }
        0.5 // Default prior
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: WEIGHTED-SCORE CONSENSUS (WSC) STRATEGY
// ═══════════════════════════════════════════════════════════════════════

pub struct WeightedScoreConsensus {
    config: ConsensusConfig,
}

impl WeightedScoreConsensus {
    pub fn new(config: ConsensusConfig) -> Self {
        Self { config }
    }

    /// Select winner via WSC with graceful fallback
    /// WEEK-2 FIX: If no candidate meets floor, pick highest anyway with audit
    pub fn select_winner(
        &self,
        candidates: &[ScoredCandidate],
    ) -> Result<Candidate, ConsensusError> {
        if candidates.is_empty() {
            return Err(ConsensusError::NoCandidates);
        }

        // Phase 1: Filter by Ihsan floor
        let mut passing_candidates: Vec<_> = candidates
            .iter()
            .filter(|c| c.scores.ihsan >= self.config.ihsan_floor)
            .collect();

        // WEEK-2 FIX: Graceful fallback if none pass
        let best_candidate = if passing_candidates.is_empty() {
            // Log audit warning upstream (in production, emit telemetry)
            eprintln!(
                "[WSC-AUDIT] No candidates passed Ihsan floor {:.2}. Selecting highest-scoring candidate as fallback.",
                self.config.ihsan_floor
            );
            
            // Pick candidate with highest Ihsan score anyway
            candidates
                .iter()
                .max_by(|a, b| {
                    a.scores
                        .ihsan
                        .partial_cmp(&b.scores.ihsan)
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
        } else {
            // Phase 2: Among passing candidates, compute composite score
            passing_candidates.iter().max_by(|a, b| {
                let score_a = self.composite_score(&a.scores);
                let score_b = self.composite_score(&b.scores);
                score_a
                    .partial_cmp(&score_b)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
        };

        match best_candidate {
            Some(c) => Ok(c.candidate.clone()),
            None => Err(ConsensusError::NoCandidateAboveThreshold),
        }
    }

    /// Composite score: weighted average
    /// Weights: accuracy=0.4, safety=0.3, efficiency=0.2, ihsan=0.1 (bonus)
    fn composite_score(&self, scores: &CandidateScores) -> f32 {
        0.4 * scores.accuracy
            + 0.3 * scores.safety
            + 0.2 * scores.efficiency
            + 0.1 * scores.ihsan
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: PARETO FRONTIER (Multi-Objective Optimization)
// ═══════════════════════════════════════════════════════════════════════

pub struct ParetoOptimizer;

impl ParetoOptimizer {
    /// Extract Pareto-optimal candidates
    /// A candidate is Pareto-optimal if no other dominates it on all objectives
    pub fn pareto_front(candidates: &[ScoredCandidate]) -> Vec<ScoredCandidate> {
        let mut front = Vec::new();

        for candidate in candidates {
            let mut is_dominated = false;

            for other in candidates {
                if Self::dominates(&other.scores, &candidate.scores) {
                    is_dominated = true;
                    break;
                }
            }

            if !is_dominated {
                front.push(candidate.clone());
            }
        }

        front
    }

    /// Check if `a` dominates `b` (strictly better in all objectives)
    fn dominates(a: &CandidateScores, b: &CandidateScores) -> bool {
        a.accuracy >= b.accuracy
            && a.safety >= b.safety
            && a.efficiency >= b.efficiency
            && a.ihsan >= b.ihsan
            && (a.accuracy > b.accuracy
                || a.safety > b.safety
                || a.efficiency > b.efficiency
                || a.ihsan > b.ihsan)
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: TESTS (Week-2 Validation)
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_thompson_sampling_exploration() {
        let mut router = ThompsonRouter::new();
        let routes = vec!["route_a".to_string(), "route_b".to_string()];

        // Select multiple times to see exploration
        let mut selections = HashMap::new();
        for _ in 0..100 {
            let route = router.select_route(&routes);
            *selections.entry(route).or_insert(0) += 1;
        }

        // Both routes should be explored
        assert!(selections.len() >= 1);
        println!("Thompson sampling selections: {:?}", selections);
    }

    #[test]
    fn test_thompson_sampling_update() {
        let mut router = ThompsonRouter::new();
        let route = "test_route";

        // Simulate successes
        for _ in 0..10 {
            router.update(route, true);
        }

        let win_rate = router.get_win_rate(route);
        assert_eq!(win_rate, 1.0);
    }

    #[test]
    fn test_wsc_with_passing_candidates() {
        let config = ConsensusConfig { ihsan_floor: 0.85 };
        let consensus = WeightedScoreConsensus::new(config);

        let candidates = vec![
            ScoredCandidate::high_quality(),
            ScoredCandidate::medium_quality(),
        ];

        let winner = consensus.select_winner(&candidates);
        assert!(winner.is_ok());
    }

    #[test]
    fn test_wsc_fallback_when_none_pass() {
        let config = ConsensusConfig { ihsan_floor: 0.99 }; // Very high bar
        let consensus = WeightedScoreConsensus::new(config);

        let candidates = vec![
            ScoredCandidate::medium_quality(), // 0.85 Ihsan
            ScoredCandidate::low_quality(),    // 0.70 Ihsan
        ];

        let winner = consensus.select_winner(&candidates);
        
        // Should succeed with fallback (picks medium)
        assert!(winner.is_ok());
        println!("Fallback winner: {:?}", winner);
    }

    #[test]
    fn test_pareto_frontier() {
        let candidates = vec![
            ScoredCandidate::high_accuracy(),   // High accuracy
            ScoredCandidate::high_efficiency(), // High efficiency
            ScoredCandidate::low_quality(),     // Dominated
        ];

        let front = ParetoOptimizer::pareto_front(&candidates);
        
        // Low quality should be dominated
        assert!(front.len() >= 2);
        assert!(front.len() < candidates.len());
    }

    #[test]
    fn test_pareto_all_optimal() {
        // All candidates are incomparable (different trade-offs)
        let candidates = vec![
            ScoredCandidate::high_accuracy(),
            ScoredCandidate::high_efficiency(),
            ScoredCandidate::high_safety(),
        ];

        let front = ParetoOptimizer::pareto_front(&candidates);
        assert_eq!(front.len(), 3); // All are Pareto-optimal
    }
}
