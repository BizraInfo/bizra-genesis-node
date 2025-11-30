use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Archetype {
    Founder,
    Researcher,
    Artist,
    Student,
    Default,
}

impl fmt::Display for Archetype {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Archetype::Founder => write!(f, "FOUNDER"),
            Archetype::Researcher => write!(f, "RESEARCHER"),
            Archetype::Artist => write!(f, "ARTIST"),
            Archetype::Student => write!(f, "STUDENT"),
            Archetype::Default => write!(f, "DEFAULT"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub name: String,
    pub upper_aim: String,
    pub archetype: Archetype,
    pub peak_hours: String,
}

impl UserProfile {
    pub fn new(name: String, upper_aim: String) -> Self {
        let archetype = AnalysisEngine::deduce_archetype(&upper_aim);
        Self {
            name,
            upper_aim,
            archetype,
            peak_hours: "00:00".to_string(), // Default, to be updated by assimilation
        }
    }
}

pub struct AnalysisEngine;

impl AnalysisEngine {
    pub fn deduce_archetype(aim: &str) -> Archetype {
        let aim_lower = aim.to_lowercase();
        if ["company", "startup", "billion", "lead", "ceo", "empire"]
            .iter()
            .any(|&w| aim_lower.contains(w))
        {
            Archetype::Founder
        } else if ["discover", "theory", "thesis", "study", "science"]
            .iter()
            .any(|&w| aim_lower.contains(w))
        {
            Archetype::Researcher
        } else if ["create", "write", "art", "design", "music", "novel"]
            .iter()
            .any(|&w| aim_lower.contains(w))
        {
            Archetype::Artist
        } else if ["learn", "master", "pass", "degree", "exam"]
            .iter()
            .any(|&w| aim_lower.contains(w))
        {
            Archetype::Student
        } else {
            Archetype::Default
        }
    }

    pub fn generate_battle_plan(archetype: Archetype) -> Vec<String> {
        match archetype {
            Archetype::Founder => vec![
                "CORPORATE_WARFARE_MODE activated".to_string(),
                "Drafting hostile takeover counter-strategy (11s)...".to_string(),
                "Scheduling dominance assertion meeting with stakeholders.".to_string(),
            ],
            Archetype::Researcher => vec![
                "KNOWLEDGE_SYNTHESIS_ENGINE engaged".to_string(),
                "Connecting 3 disparate papers into new framework...".to_string(),
                "Identifying gaps in current academic consensus.".to_string(),
            ],
            Archetype::Artist => vec![
                "CREATIVE_TSUNAMI_PROTOCOL initiated".to_string(),
                "Transforming raw input into gallery-ready concept...".to_string(),
                "Suppressing inner critic subroutines.".to_string(),
            ],
            Archetype::Student => vec![
                "MASTERY_ACCELERATOR deployed".to_string(),
                "Condensing 6-month syllabus into 7-day conquest plan...".to_string(),
                "Optimizing synaptic retention intervals.".to_string(),
            ],
            Archetype::Default => vec![
                "GENERAL_OPTIMIZATION_PROTOCOL initiated".to_string(),
                "Removing friction from daily logistics...".to_string(),
                "Amplifying cognitive throughput.".to_string(),
            ],
        }
    }
}
