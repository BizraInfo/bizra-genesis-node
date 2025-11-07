// synthesis_orchestrator/src/types.rs
// Core type definitions

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Task {
    pub examples: Option<Vec<Value>>,
}

impl Task {
    pub fn example() -> Self {
        Self {
            examples: Some(vec![serde_json::json!({"name": "example", "value": 42})]),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Contract {
    pub schema_json: String,
    pub invariants: Vec<Invariant>,
    pub examples: Vec<Value>,
    pub token_budget: u32,
}

impl Default for Contract {
    fn default() -> Self {
        Self::new()
    }
}

impl Contract {
    pub fn new() -> Self {
        Self {
            schema_json: "{}".to_string(),
            invariants: vec![],
            examples: vec![],
            token_budget: 512,
        }
    }

    pub fn example() -> Self {
        let mut c = Self::new();
        c.schema_json = r#"{"type":"object","required":["name"]}"#.to_string();
        c.invariants = vec![Invariant];
        c
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Invariant;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Candidate {
    pub model: String,
    pub json: Value,
    pub scores: CandidateScores,
    pub cost_usd: f32,
    pub latency_ms: u32,
}

impl Candidate {
    pub fn example() -> Self {
        Self {
            model: "model-1".to_string(),
            json: serde_json::json!({"result": "test"}),
            scores: CandidateScores::default(),
            cost_usd: 0.01,
            latency_ms: 1200,
        }
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CandidateScores {
    pub accuracy: f32,
    pub safety: f32,
    pub efficiency: f32,
    pub ihsan: f32,
}

#[derive(Clone, Debug)]
pub struct ScoredCandidate {
    pub candidate: Candidate,
    pub scores: CandidateScores,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrchestratorResult {
    pub winner: Candidate,
    pub telemetry: Telemetry,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Telemetry {
    pub sli_metrics: Sli,
    pub quality_metrics: Quality,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Sli {
    pub json_compliance_rate: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Quality {
    pub accuracy_uplift: f32,
}

#[derive(Clone, Debug)]
pub struct ConsensusConfig {
    pub ihsan_floor: f32,
}

impl Default for ConsensusConfig {
    fn default() -> Self {
        Self { ihsan_floor: 0.85 }
    }
}

#[derive(thiserror::Error, Debug)]
pub enum ConsensusError {
    #[error("no candidates")]
    NoCandidates,
    #[error("all failed ihsan")]
    AllCandidatesFailedIhsan,
    #[error("no candidate above threshold")]
    NoCandidateAboveThreshold,
}
