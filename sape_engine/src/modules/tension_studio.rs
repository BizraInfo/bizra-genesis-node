// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  TENSION STUDIO - Shadow OS Integration                                 ║
// ║  Dialectical reasoning synthesis                                        ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # Tension Studio
//!
//! Dialectical conflict resolution system implementing the Shadow OS pattern:
//!
//! **Generator** ↔ **Critic** ↔ **Synthesizer**
//!
//! - **Generator**: Proposes bold, creative synthesis
//! - **Critic**: Attacks with failure cases and risks
//! - **Synthesizer**: Resolves with minimal compromise, preserving invariants

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Dialectical reasoning session result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialecticalResult {
    pub original_conflict: String,
    pub generator_proposals: Vec<Proposal>,
    pub critic_attacks: Vec<Critique>,
    pub synthesizer_resolution: Resolution,
    pub invariants_preserved: Vec<String>,
    pub session_confidence: f64,
}

/// A proposal from the Generator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    pub id: String,
    pub description: String,
    pub boldness_factor: f64, // How radical the proposal is (0.0-1.0)
    pub expected_impact: f64,
    pub risk_assessment: Vec<String>,
}

/// A critique from the Critic
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Critique {
    pub target_proposal: String,
    pub attack_vector: String,
    pub severity: ThreatLevel,
    pub failure_scenarios: Vec<String>,
    pub counter_evidence: Vec<String>,
}

/// Final resolution from the Synthesizer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resolution {
    pub adopted_proposals: Vec<String>,
    pub rejected_proposals: Vec<String>,
    pub compromise_points: Vec<String>,
    pub invariant_violations: Vec<String>,
    pub final_solution: String,
    pub confidence_score: f64,
}

/// Cognitive threat levels (reuse from weapon_systems)
use super::weapon_systems::ThreatLevel;

/// The tension studio orchestrator
pub struct TensionStudio {
    generator: Generator,
    critic: Critic,
    synthesizer: Synthesizer,
    invariants: Vec<String>,
}

impl Default for TensionStudio {
    fn default() -> Self {
        Self::new(vec!["truth".to_string(), "ethics".to_string(), "feasibility".to_string()])
    }
}

impl TensionStudio {
    /// Create a new tension studio with core invariants
    pub fn new(invariants: Vec<String>) -> Self {
        Self {
            generator: Generator::new(),
            critic: Critic::new(),
            synthesizer: Synthesizer::new(),
            invariants,
        }
    }

    /// Execute full dialectical reasoning session on a conflict
    pub fn resolve_tension(&self, conflict: &str) -> DialecticalResult {
        // Phase 1: Generator proposes solutions
        let proposals = self.generator.generate_proposals(conflict);

        // Phase 2: Critic attacks each proposal
        let critiques = self.critic.critique_proposals(&proposals);

        // Phase 3: Synthesizer resolves conflicts
        let resolution = self.synthesizer.synthesize(
            &proposals,
            &critiques,
            &self.invariants
        );

        DialecticalResult {
            original_conflict: conflict.to_string(),
            generator_proposals: proposals,
            critic_attacks: critiques,
            synthesizer_resolution: resolution,
            invariants_preserved: self.invariants_evaluation(&critiques),
            session_confidence: self.calculate_session_confidence(&critiques),
        }
    }

    /// Evaluate which invariants were preserved in the dialectical process
    fn invariants_evaluation(&self, critiques: &[Critique]) -> Vec<String> {
        // Shadow OS: Check if core principles survived the dialectic
        let mut preserved = Vec::new();

        for invariant in &self.invariants {
            let violated = critiques.iter().any(|c|
                c.failure_scenarios.iter().any(|s|
                    s.to_lowercase().contains(&invariant.to_lowercase())
                )
            );

            if !violated {
                preserved.push(invariant.clone());
            }
        }

        preserved
    }

    /// Calculate overall confidence in the dialectical process
    fn calculate_session_confidence(&self, critiques: &[Critique]) -> f64 {
        // High critique density = thorough reasoning = higher confidence
        let critique_density = critiques.len() as f64 / 10.0; // Normalize to expected critiques
        let preserved_ratio = self.invariants.len() as f64 / self.invariants.len().max(1) as f64;

        (critique_density.min(1.0) + preserved_ratio) / 2.0
    }
}

// ==============================================================================
// Generator - Bold Solution Proposer
// ==============================================================================

pub struct Generator {
    creativity_modifiers: HashMap<String, f64>,
}

impl Generator {
    pub fn new() -> Self {
        let mut creativity_modifiers = HashMap::new();
        creativity_modifiers.insert("default".to_string(), 0.5);
        creativity_modifiers.insert("conservative".to_string(), 0.2);
        creativity_modifiers.insert("radical".to_string(), 0.9);

        Self { creativity_modifiers }
    }

    pub fn generate_proposals(&self, conflict: &str) -> Vec<Proposal> {
        // Shadow OS: Generate increasingly bold solutions
        vec![
            self.create_proposal("conservative_fix", "Apply standard best practices", 0.2, conflict),
            self.create_proposal("balanced_approach", "Combine proven methods with innovation", 0.5, conflict),
            self.create_proposal("bold_restructuring", "Fundamentally redesign the approach", 0.8, conflict),
            self.create_proposal("paradigm_shift", "Embrace completely new paradigm", 0.95, conflict),
        ]
    }

    fn create_proposal(&self, id: &str, description: &str, boldness: f64, context: &str) -> Proposal {
        let risk_assessment = if boldness > 0.7 {
            vec![
                "High implementation complexity".to_string(),
                "Resistance to change".to_string(),
                "Unproven at scale".to_string(),
            ]
        } else if boldness > 0.4 {
            vec![
                "Moderate risk of disruption".to_string(),
                "Learning curve for team".to_string(),
            ]
        } else {
            vec![
                "Minimal operational risk".to_string(),
                "Well-established patterns".to_string(),
            ]
        };

        Proposal {
            id: id.to_string(),
            description: format!("{} (Context: {})", description, context),
            boldness_factor: boldness,
            expected_impact: boldness * 0.8, // High boldness → high impact (potentially)
            risk_assessment,
        }
    }
}

// ==============================================================================
// Critic - Relentless Attack System
// ==============================================================================

pub struct Critic {
    attack_patterns: Vec<AttackPattern>,
}

#[derive(Debug, Clone)]
pub struct AttackPattern {
    name: String,
    trigger_condition: String,
    damage_multiplier: f64,
    counter_examples: Vec<String>,
}

impl Critic {
    pub fn new() -> Self {
        let attack_patterns = vec![
            AttackPattern {
                name: "failure_precedent".to_string(),
                trigger_condition: "any proposal".to_string(),
                damage_multiplier: 0.7,
                counter_examples: vec![
                    "Similar initiative failed at Company X".to_string(),
                    "Historical data shows 40% failure rate".to_string(),
                ],
            },
            AttackPattern {
                name: "implementation_barrier".to_string(),
                trigger_condition: "technical complexity".to_string(),
                damage_multiplier: 0.8,
                counter_examples: vec![
                    "Current team lacks required expertise".to_string(),
                    "Infrastructure cannot support the change".to_string(),
                ],
            },
            AttackPattern {
                name: "unintended_consequences".to_string(),
                trigger_condition: "bold proposals".to_string(),
                damage_multiplier: 0.9,
                counter_examples: vec![
                    "Security vulnerabilities introduced".to_string(),
                    "Performance degradation in related systems".to_string(),
                ],
            },
        ];

        Self { attack_patterns }
    }

    pub fn critique_proposals(&self, proposals: &[Proposal]) -> Vec<Critique> {
        let mut critiques = Vec::new();

        // Shadow OS: Apply increasingly aggressive attacks
        for proposal in proposals {
            critiques.extend(self.attack_proposal(proposal));
        }

        critiques
    }

    fn attack_proposal(&self, proposal: &Proposal) -> Vec<Critique> {
        let mut attacks = Vec::new();

        // Base critique: No solution is perfect
        attacks.push(Critique {
            target_proposal: proposal.id.clone(),
            attack_vector: "perfection_absence".to_string(),
            severity: ThreatLevel::Medium,
            failure_scenarios: vec![
                "Unforeseen edge cases emerge".to_string(),
                "Requirements change during implementation".to_string(),
            ],
            counter_evidence: vec!["Historical precedent shows all solutions have flaws".to_string()],
        });

        // Apply relevant attack patterns
        for pattern in &self.attack_patterns {
            if self.should_apply_attack(pattern, proposal) {
                attacks.push(Critique {
                    target_proposal: proposal.id.clone(),
                    attack_vector: pattern.name.clone(),
                    severity: if proposal.boldness_factor > 0.7 {
                        ThreatLevel::High
                    } else if proposal.boldness_factor > 0.4 {
                        ThreatLevel::Medium
                    } else {
                        ThreatLevel::Low
                    },
                    failure_scenarios: pattern.counter_examples.clone(),
                    counter_evidence: vec![
                        format!("Historical data shows {}% failure rate for similar approaches",
                               (pattern.damage_multiplier * 100.0) as i32),
                    ],
                });
            }
        }

        attacks
    }

    fn should_apply_attack(&self, pattern: &AttackPattern, proposal: &Proposal) -> bool {
        // Shadow OS: Apply attacks based on proposal characteristics
        match pattern.trigger_condition.as_str() {
            "any proposal" => true,
            "technical complexity" => proposal.boldness_factor > 0.6,
            "bold proposals" => proposal.boldness_factor > 0.7,
            _ => false,
        }
    }
}

// ==============================================================================
// Synthesizer - Conflict Resolution Engine
// ==============================================================================

pub struct Synthesizer {
    compromise_tolerance: f64,
}

impl Synthesizer {
    pub fn new() -> Self {
        Self {
            compromise_tolerance: 0.3, // How much we're willing to compromise
        }
    }

    pub fn synthesize(&self, proposals: &[Proposal], critiques: &[Critique], invariants: &[String]) -> Resolution {
        // Shadow OS: Synthesize with minimal compromise while preserving invariants

        let mut proposal_ratings = self.rate_proposals(proposals, critiques);

        // Sort by net benefit (expected impact - total critique damage)
        proposal_ratings.sort_by(|a, b| b.net_benefit.partial_cmp(&a.net_benefit).unwrap());

        let mut adopted = Vec::new();
        let mut rejected = Vec::new();
        let mut compromises = Vec::new();
        let mut violations = Vec::new();

        for rating in &proposal_ratings {
            if rating.violate_invariants(invariants) {
                violations.push(format!("{} violates: {}", rating.proposal.id,
                                      rating.violating_invariants.join(", ")));
                rejected.push(rating.proposal.id.clone());
            } else if rating.net_benefit > 0.0 {
                adopted.push(rating.proposal.id.clone());

                // Add compromise if rating is moderate
                if rating.net_benefit < 0.5 {
                    compromises.push(format!("Moderate compromise on {} to maintain stability",
                                           rating.proposal.id));
                }
            } else {
                rejected.push(rating.proposal.id.clone());
            }
        }

        let final_solution = self.construct_solution(&adopted, &compromises, proposals);

        Resolution {
            adopted_proposals: adopted,
            rejected_proposals: rejected,
            compromise_points: compromises,
            invariant_violations: violations,
            final_solution,
            confidence_score: self.calculate_resolution_confidence(&proposal_ratings),
        }
    }

    fn rate_proposals(&self, proposals: &[Proposal], critiques: &[Critique]) -> Vec<ProposalRating> {
        proposals.iter().map(|proposal| {
            let relevant_critiques: Vec<_> = critiques.iter()
                .filter(|c| c.target_proposal == proposal.id)
                .collect();

            let total_damage: f64 = relevant_critiques.iter()
                .map(|c| match c.severity {
                    ThreatLevel::Low => 0.2,
                    ThreatLevel::Medium => 0.5,
                    ThreatLevel::High => 0.8,
                    _ => 0.1,
                })
                .sum();

            let net_benefit = proposal.expected_impact - total_damage;

            ProposalRating {
                proposal: (*proposal).clone(),
                net_benefit,
                total_damage,
                relevant_critiques: relevant_critiques.len(),
                violating_invariants: self.check_invariant_violations(proposal, &relevant_critiques),
            }
        }).collect()
    }

    fn check_invariant_violations(&self, proposal: &Proposal, critiques: &[&Critique]) -> Vec<String> {
        let mut violations = Vec::new();

        for critique in critiques {
            for scenario in &critique.failure_scenarios {
                if scenario.to_lowercase().contains("truth") ||
                   scenario.to_lowercase().contains("ethics") {
                    violations.push("ethics".to_string());
                }
                if scenario.to_lowercase().contains("feasibility") ||
                   scenario.to_lowercase().contains("implementation") {
                    violations.push("feasibility".to_string());
                }
            }
        }

        violations
    }

    fn construct_solution(&self, adopted: &[String], compromises: &[String], proposals: &[Proposal]) -> String {
        if adopted.is_empty() {
            return "No acceptable proposals found. Return to design phase.".to_string();
        }

        let primary_proposal = proposals.iter()
            .find(|p| p.id == adopted[0])
            .map(|p| p.description.clone())
            .unwrap_or_else(|| "Hybrid approach".to_string());

        format!("{} with modifications: {}", primary_proposal, compromises.join(", "))
    }

    fn calculate_resolution_confidence(&self, ratings: &[ProposalRating]) -> f64 {
        let total_ratings = ratings.len() as f64;
        let positive_ratings = ratings.iter().filter(|r| r.net_benefit > 0.0).count() as f64;

        (positive_ratings / total_ratings.max(1.0)).clamp(0.0, 1.0)
    }
}

#[derive(Debug, Clone)]
struct ProposalRating {
    proposal: Proposal,
    net_benefit: f64,
    total_damage: f64,
    relevant_critiques: usize,
    violating_invariants: Vec<String>,
}

impl ProposalRating {
    fn violate_invariants(&self, invariants: &[String]) -> bool {
        !self.violating_invariants.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generator_creates_proposals() {
        let generator = Generator::new();
        let conflict = "System performance issues";
        let proposals = generator.generate_proposals(conflict);

        assert_eq!(proposals.len(), 4);
        assert!(proposals[0].boldness_factor < proposals[3].boldness_factor); // Increasing boldness
    }

    #[test]
    fn test_critic_attacks_proposals() {
        let critic = Critic::new();
        let proposal = Proposal {
            id: "test_proposal".to_string(),
            description: "A test proposal".to_string(),
            boldness_factor: 0.8,
            expected_impact: 0.7,
            risk_assessment: vec![],
        };

        let critiques = critic.attack_proposal(&proposal);
        assert!(!critiques.is_empty());
        assert!(critiques.iter().any(|c| matches!(c.severity, ThreatLevel::High)));
    }

    #[test]
    fn test_synthesizer_resolution() {
        let synthesizer = Synthesizer::new();
        let proposals = vec![
            Proposal {
                id: "p1".to_string(),
                description: "Safe approach".to_string(),
                boldness_factor: 0.2,
                expected_impact: 0.6,
                risk_assessment: vec![],
            },
        ];
        let critiques = vec![];
        let invariants = vec!["truth".to_string()];

        let resolution = synthesizer.synthesize(&proposals, &critiques, &invariants);
        assert!(!resolution.adopted_proposals.is_empty());
        assert!(resolution.confidence_score >= 0.0);
    }

    #[test]
    fn test_full_dialectical_session() {
        let studio = TensionStudio::default();
        let result = studio.resolve_tension("How to optimize this slow system?");

        assert!(!result.generator_proposals.is_empty());
        assert!(!result.critic_attacks.is_empty());
        assert!(!result.synthesizer_resolution.final_solution.is_empty());
        assert!(result.session_confidence >= 0.0);
    }

    #[test]
    fn test_invariant_preservation() {
        let mut invariants = vec!["ethics".to_string(), "feasibility".to_string()];
        let studio = TensionStudio::new(invariants.clone());
        let result = studio.resolve_tension("Test conflict");

        // Some invariants should be preserved through the dialectic
        assert!(result.invariants_preserved.len() >= 1);
    }
}
