// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  ARCHETYPE ANALYZER - Shadow OS Integration                             ║
// ║  Dynamic user classification for personalized reasoning                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # Archetype Analyzer
//!
//! Dynamic user archetype classification using keyword analysis and confidence scoring.
//! Based on Shadow OS v2.0 archetype detection patterns.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// User archetype classification based on Shadow OS
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Archetype {
    Founder,
    Researcher,
    Artist,
    Student,
    Hybrid,
    Default,
}

impl Archetype {
    /// Get reasoning modifiers for each archetype
    pub fn reasoning_modifiers(&self) -> ReasoningModifiers {
        match self {
            Archetype::Founder => ReasoningModifiers {
                creativity_weight: 0.3,
                analytical_weight: 0.7,
                risk_tolerance: 0.8,
                detail_orientation: 0.6,
                patterns: vec!["Dominance assertions", "Empire building", "Market conquest"],
            },
            Archetype::Researcher => ReasoningModifiers {
                creativity_weight: 0.4,
                analytical_weight: 0.9,
                risk_tolerance: 0.2,
                detail_orientation: 0.9,
                patterns: vec!["Scientific method", "Peer validation", "Hypothesis testing"],
            },
            Archetype::Artist => ReasoningModifiers {
                creativity_weight: 0.9,
                analytical_weight: 0.4,
                risk_tolerance: 0.6,
                detail_orientation: 0.7,
                patterns: vec!["Creative synthesis", "Narrative reframing", "Aesthetic optimization"],
            },
            Archetype::Student => ReasoningModifiers {
                creativity_weight: 0.6,
                analytical_weight: 0.8,
                risk_tolerance: 0.2,
                detail_orientation: 0.7,
                patterns: vec!["Knowledge acquisition", "Mastery gradients", "Competence validation"],
            },
            Archetype::Hybrid => ReasoningModifiers {
                creativity_weight: 0.7,
                analytical_weight: 0.7,
                risk_tolerance: 0.6,
                detail_orientation: 0.8,
                patterns: vec!["Cross-domain synthesis", "Adaptive reasoning", "Entanglement resolution"],
            },
            Archetype::Default => ReasoningModifiers {
                creativity_weight: 0.5,
                analytical_weight: 0.5,
                risk_tolerance: 0.5,
                detail_orientation: 0.5,
                patterns: vec!["Balanced optimization", "General problem solving"],
            },
        }
    }
}

/// Reasoning modifiers based on archetype
#[derive(Debug, Clone)]
pub struct ReasoningModifiers {
    /// Weight for creative approaches (0.0-1.0)
    pub creativity_weight: f64,
    /// Weight for analytical approaches (0.0-1.0)
    pub analytical_weight: f64,
    /// Willingness to take risks (0.0-1.0)
    pub risk_tolerance: f64,
    /// Attention to detail (0.0-1.0)
    pub detail_orientation: f64,
    /// Archetype-specific reasoning patterns
    pub patterns: Vec<&'static str>,
}

/// Archetype classification result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchetypeResult {
    pub archetype: Archetype,
    pub confidence: f64,
    pub scores: HashMap<String, f64>,
    pub reasoning_patterns: Vec<String>,
}

/// The archetype analyzer
pub struct ArchetypeAnalyzer {
    signals: HashMap<Archetype, SignalConfig>,
}

#[derive(Debug, Clone)]
struct SignalConfig {
    keywords: Vec<&'static str>,
    weight: f64,
}

impl Default for ArchetypeAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

impl ArchetypeAnalyzer {
    /// Create a new archetype analyzer with Shadow OS patterns
    pub fn new() -> Self {
        let mut signals = HashMap::new();

        signals.insert(Archetype::Founder, SignalConfig {
            keywords: vec![
                "company", "startup", "billion", "lead", "ceo", "empire", "revenue", "market",
                "venture", "funding", "investors", "scalability", "traction", "exit"
            ],
            weight: 1.0,
        });

        signals.insert(Archetype::Researcher, SignalConfig {
            keywords: vec![
                "discover", "theory", "thesis", "study", "science", "publish", "academic",
                "research", "hypothesis", "methodology", "peer", "literature", "experiment"
            ],
            weight: 1.0,
        });

        signals.insert(Archetype::Artist, SignalConfig {
            keywords: vec![
                "create", "write", "art", "design", "music", "novel", "gallery", "portfolio",
                "inspire", "express", "aesthetic", "craft", "medium", "style", "vision"
            ],
            weight: 1.0,
        });

        signals.insert(Archetype::Student, SignalConfig {
            keywords: vec![
                "learn", "master", "pass", "degree", "exam", "certification", "course",
                "study", "grade", "knowledge", "skill", "education", "progress"
            ],
            weight: 1.0,
        });

        Self { signals }
    }

    /// Deduce archetype from user input (upper aim, query, or description)
    pub fn deduce_archetype(&self, text: &str) -> ArchetypeResult {
        let text_lower = text.to_lowercase();
        let mut scores = HashMap::new();

        // Calculate raw scores
        for (archetype, config) in &self.signals {
            let matches = config.keywords.iter()
                .filter(|kw| text_lower.contains(*kw))
                .count() as f64;

            let score = matches * config.weight;
            scores.insert(format!("{:?}", archetype), score);
        }

        // Hybrid detection (multiple high scores within 2 matches)
        let top_scores: Vec<_> = scores.iter()
            .filter(|(_, score)| **score > 0.0)
            .collect();

        let mut hybrid_candidates = Vec::new();
        for (i, (arch_a, score_a)) in top_scores.iter().enumerate() {
            for (arch_b, score_b) in top_scores.iter().skip(i + 1) {
                if (**score_a - **score_b).abs() < 2.0 {
                    hybrid_candidates.push(Archetype::Hybrid);
                    break;
                }
            }
            if !hybrid_candidates.is_empty() {
                break;
            }
        }

        let (archetype, confidence) = if !hybrid_candidates.is_empty() {
            (Archetype::Hybrid, 0.85)
        } else {
            // Find best archetype
            let best = scores.iter()
                .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
                .unwrap();

            let archetype = match best.0.as_str() {
                "Founder" => Archetype::Founder,
                "Researcher" => Archetype::Researcher,
                "Artist" => Archetype::Artist,
                "Student" => Archetype::Student,
                _ => Archetype::Default,
            };

            let confidence = (*best.1 / 3.0).clamp(0.0, 1.0);

            (archetype, confidence)
        };

        // Generate reasoning patterns based on archetype
        let reasoning_patterns = archetype.reasoning_modifiers().patterns
            .iter()
            .map(|s| s.to_string())
            .collect();

        ArchetypeResult {
            archetype,
            confidence,
            scores,
            reasoning_patterns,
        }
    }

    /// Get peak reasoning windows based on archetype
    pub fn peak_hours(&self, archetype: &Archetype) -> Vec<String> {
        match archetype {
            Archetype::Founder => vec!["08:00".to_string(), "14:00".to_string()],
            Archetype::Researcher => vec!["10:00".to_string(), "16:00".to_string()],
            Archetype::Artist => vec!["22:00".to_string(), "02:00".to_string()],
            Archetype::Student => vec!["19:00".to_string(), "21:00".to_string()],
            Archetype::Hybrid => vec!["09:00".to_string(), "15:00".to_string(), "23:00".to_string()],
            Archetype::Default => vec!["12:00".to_string()],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_founder_detection() {
        let analyzer = ArchetypeAnalyzer::new();
        let result = analyzer.deduce_archetype("I want to build a billion dollar company and lead a tech empire");

        assert_eq!(result.archetype, Archetype::Founder);
        assert!(result.confidence > 0.5);
    }

    #[test]
    fn test_researcher_detection() {
        let analyzer = ArchetypeAnalyzer::new();
        let result = analyzer.deduce_archetype("I plan to discover a new theory and publish my thesis in a peer-reviewed journal");

        assert_eq!(result.archetype, Archetype::Researcher);
        assert!(result.confidence > 0.4);
    }

    #[test]
    fn test_hybrid_detection() {
        let analyzer = ArchetypeAnalyzer::new();
        let result = analyzer.deduce_archetype("I want to create artistic designs while leading a research study");

        assert_eq!(result.archetype, Archetype::Hybrid);
        assert!(result.confidence > 0.8);
    }

    #[test]
    fn test_default_fallback() {
        let analyzer = ArchetypeAnalyzer::new();
        let result = analyzer.deduce_archetype("Random text with no keywords");

        assert_eq!(result.archetype, Archetype::Default);
        assert_eq!(result.confidence, 0.0);
    }

    #[test]
    fn test_reasoning_modifiers() {
        let founder_modifiers = Archetype::Founder.reasoning_modifiers();
        assert!(founder_modifiers.analytical_weight > founder_modifiers.creativity_weight);
        assert!(founder_modifiers.risk_tolerance > 0.7);

        let artist_modifiers = Archetype::Artist.reasoning_modifiers();
        assert!(artist_modifiers.creativity_weight > artist_modifiers.analytical_weight);
        assert!(artist_modifiers.creativity_weight > 0.8);
    }
}
