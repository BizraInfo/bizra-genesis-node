// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  TRI-BEAM REASONER - Shadow OS Integration                              ║
// ║  Impulse/Counter-Impulse/Orthogonal path exploration                    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # Tri-Beam Reasoner
//!
//! Multi-path reasoning system with three beams:
//! - **I-Path (Impulse)**: Obvious, high-probability canonical approach
//! - **C-Path (Counter-Impulse)**: Deliberately anti-canonical route
//! - **O-Path (Orthogonal)**: Route from unrelated analogy domain
//!
//! Based on Shadow OS tri-beam reasoning patterns.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A reasoning step in a tri-beam path
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReasoningStep {
    pub step_number: usize,
    pub description: String,
    pub rationale: String,
    pub confidence: f64,
    pub moves_used: usize,
}

/// A complete reasoning path
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReasoningPath {
    pub path_type: PathType,
    pub steps: Vec<ReasoningStep>,
    pub total_moves: usize,
    pub rarity_moves: Vec<RarityMove>,
    pub final_confidence: f64,
}

/// Type of reasoning path
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PathType {
    /// Impulse - Canonical, obvious approach
    Impulse,
    /// Counter-Impulse - Anti-canonical, deliberate contradiction
    CounterImpulse,
    /// Orthogonal - Unrelated domain analogy
    Orthogonal,
}

/// A deliberate rarity move that differentiates C/O paths from I-path
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RarityMove {
    pub id: String,
    pub description: String,
    pub divergence_rationale: String,
    pub risk_level: f64,
}

/// Configuration for tri-beam reasoning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriBeamConfig {
    /// Maximum moves per path
    pub max_moves_per_path: usize,
    /// Minimum rarity moves required for C/O paths
    pub min_rarity_moves: usize,
    /// Enable orthogonal path exploration
    pub enable_orthogonal: bool,
    /// Enable counter-impulse path
    pub enable_counter_impulse: bool,
}

/// Reasoning domain analogies for orthogonal thinking
#[derive(Debug, Clone)]
pub struct AnalogicalDomain {
    pub domain: String,
    pub analogies: Vec<(&'static str, &'static str)>, // (source_concept, target_mapping)
}

impl AnalogicalDomain {
    pub fn biology() -> Self {
        Self {
            domain: "biology".to_string(),
            analogies: vec![
                ("dna replication", "data versioning"),
                ("neural pruning", "code optimization"),
                ("immune response", "error handling"),
                ("ecosystem balance", "system equilibrium"),
                ("evolutionary pressure", "optimization constraints"),
            ],
        }
    }

    pub fn physics() -> Self {
        Self {
            domain: "physics".to_string(),
            analogies: vec![
                ("quantum tunneling", "breaking optimization barriers"),
                ("thermodynamic equilibrium", "system stability"),
                ("relativity time dilation", "performance trade-offs"),
                ("wave-particle duality", "hybrid approaches"),
                ("black hole event horizon", "point of no return"),
            ],
        }
    }

    pub fn economics() -> Self {
        Self {
            domain: "economics".to_string(),
            analogies: vec![
                ("market equilibrium", "balance of competing forces"),
                ("diminishing returns", "optimization asymptotes"),
                ("supply chain", "dependency management"),
                ("network effects", "viral adoption"),
                ("opportunity cost", "trade-off decisions"),
            ],
        }
    }
}

/// The tri-beam reasoner
pub struct TriBeamReasoner {
    config: TriBeamConfig,
    analogical_domains: Vec<AnalogicalDomain>,
    archetype_modifiers: Option<super::archetype_analyzer::ReasoningModifiers>,
}

impl Default for TriBeamReasoner {
    fn default() -> Self {
        Self::new(TriBeamConfig {
            max_moves_per_path: 5,
            min_rarity_moves: 3,
            enable_orthogonal: true,
            enable_counter_impulse: true,
        })
    }
}

impl TriBeamReasoner {
    /// Create a new tri-beam reasoner
    pub fn new(config: TriBeamConfig) -> Self {
        let analogical_domains = vec![
            AnalogicalDomain::biology(),
            AnalogicalDomain::physics(),
            AnalogicalDomain::economics(),
        ];

        Self {
            config,
            analogical_domains,
            archetype_modifiers: None,
        }
    }

    /// Set archetype-based reasoning modifiers
    pub fn with_archetype_modifiers(mut self, modifiers: super::archetype_analyzer::ReasoningModifiers) -> Self {
        self.archetype_modifiers = Some(modifiers);
        self
    }

    /// Execute tri-beam reasoning on a query
    pub fn reason_tri_beam(&self, query: &str) -> TriBeamAnalysis {
        // Apply archetype weighting if available
        let risk_modifier = self.archetype_modifiers
            .as_ref()
            .map(|m| m.risk_tolerance)
            .unwrap_or(0.5);

        // Generate I-Path (Impulse/Canonical)
        let i_path = self.generate_impulse_path(query);

        // Generate C-Path (Counter-Impulse/Anti-canonical) if enabled
        let c_path = if self.config.enable_counter_impulse {
            Some(self.generate_counter_impulse_path(query, risk_modifier))
        } else {
            None
        };

        // Generate O-Path (Orthogonal/Analogical) if enabled
        let o_path = if self.config.enable_orthogonal {
            Some(self.generate_orthogonal_path(query, risk_modifier))
        } else {
            None
        };

        // Synthesize findings
        let synthesis = self.synthesize_paths(&i_path, &c_path, &o_path);

        TriBeamAnalysis {
            query: query.to_string(),
            i_path,
            c_path,
            o_path,
            synthesis,
        }
    }

    /// Generate the impulse (canonical) reasoning path
    fn generate_impulse_path(&self, query: &str) -> ReasoningPath {
        // Shadow OS: I-Path is the "obvious, high-probability completion"
        let steps = vec![
            ReasoningStep {
                step_number: 1,
                description: "Analyze core problem components".to_string(),
                rationale: "Break down query into fundamental elements and constraints".to_string(),
                confidence: 0.9,
                moves_used: 1,
            },
            ReasoningStep {
                step_number: 2,
                description: "Apply standard solution patterns".to_string(),
                rationale: "Use established best practices and conventional wisdom".to_string(),
                confidence: 0.8,
                moves_used: 1,
            },
            ReasoningStep {
                step_number: 3,
                description: "Validate against known requirements".to_string(),
                rationale: "Ensure solution meets explicit and implicit constraints".to_string(),
                confidence: 0.85,
                moves_used: 1,
            },
        ];

        ReasoningPath {
            path_type: PathType::Impulse,
            steps,
            total_moves: 3,
            rarity_moves: vec![], // I-path has no rarity moves by definition
            final_confidence: 0.85,
        }
    }

    /// Generate the counter-impulse (anti-canonical) reasoning path
    fn generate_counter_impulse_path(&self, query: &str, risk_modifier: f64) -> ReasoningPath {
        // Shadow OS: C-Path is "deliberately anti-canonical route"
        let rarity_moves = vec![
            RarityMove {
                id: "C1".to_string(),
                description: "Assume optimal solution is fundamentally wrong".to_string(),
                divergence_rationale: "Contradicts standard 'best practices' approach".to_string(),
                risk_level: 0.7 * risk_modifier,
            },
            RarityMove {
                id: "C2".to_string(),
                description: "Invert all standard assumptions".to_string(),
                divergence_rationale: "Deliberately takes opposite of conventional wisdom".to_string(),
                risk_level: 0.8 * risk_modifier,
            },
            RarityMove {
                id: "C3".to_string(),
                description: "Embrace complexity instead of simplification".to_string(),
                divergence_rationale: "Rejects reductionist thinking patterns".to_string(),
                risk_level: 0.6 * risk_modifier,
            },
        ];

        let steps = vec![
            ReasoningStep {
                step_number: 1,
                description: "Identify and invert core assumptions".to_string(),
                rationale: "Question every fundamental premise".to_string(),
                confidence: 0.4,
                moves_used: 2,
            },
            ReasoningStep {
                step_number: 2,
                description: "Explore counter-conventional approaches".to_string(),
                rationale: "Deliberately choose path least likely to be considered".to_string(),
                confidence: 0.3,
                moves_used: 2,
            },
            ReasoningStep {
                step_number: 3,
                description: "Embrace the uncomfortable solution".to_string(),
                rationale: "Accept that the right answer may feel wrong initially".to_string(),
                confidence: 0.5,
                moves_used: 1,
            },
        ];

        ReasoningPath {
            path_type: PathType::CounterImpulse,
            steps,
            total_moves: 5,
            rarity_moves,
            final_confidence: 0.35,
        }
    }

    /// Generate the orthogonal (analogical) reasoning path
    fn generate_orthogonal_path(&self, query: &str, risk_modifier: f64) -> ReasoningPath {
        // Choose a random analogical domain
        let domain = &self.analogical_domains[rand::random::<usize>() % self.analogical_domains.len()];
        let analogies = &domain.analogies;

        let rarity_moves = vec![
            RarityMove {
                id: "O1".to_string(),
                description: format!("Map problem to {} domain", domain.domain),
                divergence_rationale: format!("Uses {} analogies for problem-solving", domain.domain),
                risk_level: 0.5 * risk_modifier,
            },
            RarityMove {
                id: "O2".to_string(),
                description: "Apply domain transfer principles".to_string(),
                divergence_rationale: "Brings unrelated domain rules to current problem".to_string(),
                risk_level: 0.6 * risk_modifier,
            },
            RarityMove {
                id: "O3".to_string(),
                description: "Invert domain relationships".to_string(),
                divergence_rationale: "Uses counter-analogical reasoning patterns".to_string(),
                risk_level: 0.7 * risk_modifier,
            },
        ];

        let steps = vec![
            ReasoningStep {
                step_number: 1,
                description: format!("Map to {} domain", domain.domain),
                rationale: "Find structural analogies in unrelated field".to_string(),
                confidence: 0.6,
                moves_used: 1,
            },
            ReasoningStep {
                step_number: 2,
                description: "Apply domain's causal relationships".to_string(),
                rationale: "Use domain's proven interaction patterns".to_string(),
                confidence: 0.55,
                moves_used: 1,
            },
            ReasoningStep {
                step_number: 3,
                description: "Transfer insights back to original domain".to_string(),
                rationale: "Adapt domain solution to current problem".to_string(),
                confidence: 0.65,
                moves_used: 2,
            },
        ];

        ReasoningPath {
            path_type: PathType::Orthogonal,
            steps,
            total_moves: 4,
            rarity_moves,
            final_confidence: 0.6,
        }
    }

    /// Synthesize insights from all three paths
    fn synthesize_paths(&self, i_path: &ReasoningPath, c_path: &Option<ReasoningPath>, o_path: &Option<ReasoningPath>) -> PathSynthesis {
        let mut synthesis = PathSynthesis {
            key_insights: Vec::new(),
            conflicts_identified: Vec::new(),
            opportunities_found: Vec::new(),
            risk_assessment: HashMap::new(),
            recommended_path: PathType::Impulse,
            synthesis_confidence: 0.0,
        };

        // Extract insights from each path
        synthesis.key_insights.push(format!(
            "I-Path provides {} confident foundation with {} steps",
            i_path.final_confidence, i_path.steps.len()
        ));

        if let Some(c) = c_path {
            synthesis.key_insights.push(format!(
                "C-Path challenges assumptions with {} risk moves",
                c.rarity_moves.len()
            ));
            synthesis.opportunities_found.push("Counter-intuitive solutions may exist".to_string());
        }

        if let Some(o) = o_path {
            synthesis.key_insights.push(format!(
                "O-Path brings {} domain analogies",
                o.rarity_moves[0].description.split(' ').next().unwrap_or("unrelated")
            ));
            synthesis.opportunities_found.push("Cross-domain innovations possible".to_string());
        }

        // Identify conflicts
        if c_path.is_some() {
            synthesis.conflicts_identified.push("I-Path vs C-Path: Conventional vs Counter-conventional wisdom".to_string());
        }

        // Risk assessment
        synthesis.risk_assessment.insert("I-Path".to_string(), 0.2);
        if c_path.is_some() {
            synthesis.risk_assessment.insert("C-Path".to_string(), 0.8);
        }
        if o_path.is_some() {
            synthesis.risk_assessment.insert("O-Path".to_string(), 0.5);
        }

        // Determine recommended path based on archetype
        synthesis.recommended_path = if let Some(modifiers) = &self.archetype_modifiers {
            if modifiers.creativity_weight > 0.7 {
                PathType::Orthogonal
            } else if modifiers.risk_tolerance > 0.7 {
                PathType::CounterImpulse
            } else {
                PathType::Impulse
            }
        } else {
            PathType::Impulse
        };

        synthesis.synthesis_confidence = 0.75; // Placeholder
        synthesis
    }
}

/// Complete tri-beam reasoning analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriBeamAnalysis {
    pub query: String,
    pub i_path: ReasoningPath,
    pub c_path: Option<ReasoningPath>,
    pub o_path: Option<ReasoningPath>,
    pub synthesis: PathSynthesis,
}

/// Synthesis of insights from all paths
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathSynthesis {
    pub key_insights: Vec<String>,
    pub conflicts_identified: Vec<String>,
    pub opportunities_found: Vec<String>,
    pub risk_assessment: HashMap<String, f64>,
    pub recommended_path: PathType,
    pub synthesis_confidence: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::archetype_analyzer::ReasoningModifiers;

    #[test]
    fn test_tri_beam_creation() {
        let reasoner = TriBeamReasoner::default();
        assert_eq!(reasoner.config.max_moves_per_path, 5);
        assert_eq!(reasoner.config.min_rarity_moves, 3);
    }

    #[test]
    fn test_impulse_path_generation() {
        let reasoner = TriBeamReasoner::default();
        let analysis = reasoner.reason_tri_beam("How to optimize this system?");

        assert_eq!(analysis.i_path.path_type, PathType::Impulse);
        assert!(analysis.i_path.steps.len() >= 3);
        assert_eq!(analysis.i_path.rarity_moves.len(), 0);
    }

    #[test]
    fn test_counter_impulse_path_generation() {
        let reasoner = TriBeamReasoner::default();
        let analysis = reasoner.reason_tri_beam("How to solve this problem?");

        if let Some(c_path) = &analysis.c_path {
            assert_eq!(c_path.path_type, PathType::CounterImpulse);
            assert!(c_path.rarity_moves.len() >= 3);
            assert!(c_path.final_confidence < 0.5);
        }
    }

    #[test]
    fn test_orthogonal_path_generation() {
        let reasoner = TriBeamReasoner::default();
        let analysis = reasoner.reason_tri_beam("What approach should I take?");

        if let Some(o_path) = &analysis.o_path {
            assert_eq!(o_path.path_type, PathType::Orthogonal);
            assert!(o_path.rarity_moves.len() >= 3);
        }
    }

    #[test]
    fn test_archetype_modifiers_integration() {
        let modifiers = ReasoningModifiers {
            creativity_weight: 0.9,
            analytical_weight: 0.4,
            risk_tolerance: 0.8,
            detail_orientation: 0.7,
            patterns: vec!["Creative patterns"],
        };

        let reasoner = TriBeamReasoner::default().with_archetype_modifiers(modifiers);
        let analysis = reasoner.reason_tri_beam("Test query");

        // Should prefer Orthogonal path for high creativity
        assert_eq!(analysis.synthesis.recommended_path, PathType::Orthogonal);
    }

    #[test]
    fn test_synthesis_structure() {
        let reasoner = TriBeamReasoner::default();
        let analysis = reasoner.reason_tri_beam("Test query");

        assert!(!analysis.synthesis.key_insights.is_empty());
        assert!(analysis.synthesis.synthesis_confidence > 0.0);
        assert!(!analysis.synthesis.risk_assessment.is_empty());
    }
}
