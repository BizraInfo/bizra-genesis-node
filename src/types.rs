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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_creation() {
        let task = Task { examples: None };
        assert!(task.examples.is_none());
    }

    #[test]
    fn test_task_example() {
        let task = Task::example();
        assert!(task.examples.is_some());
        let examples = task.examples.unwrap();
        assert_eq!(examples.len(), 1);
        assert_eq!(examples[0]["name"], "example");
        assert_eq!(examples[0]["value"], 42);
    }

    #[test]
    fn test_task_serialization() {
        let task = Task::example();
        let json = serde_json::to_string(&task).unwrap();
        assert!(json.contains("examples"));

        let deserialized: Task = serde_json::from_str(&json).unwrap();
        assert!(deserialized.examples.is_some());
    }

    #[test]
    fn test_contract_new() {
        let contract = Contract::new();
        assert_eq!(contract.schema_json, "{}");
        assert_eq!(contract.invariants.len(), 0);
        assert_eq!(contract.examples.len(), 0);
        assert_eq!(contract.token_budget, 512);
    }

    #[test]
    fn test_contract_default() {
        let contract = Contract::default();
        assert_eq!(contract.schema_json, "{}");
        assert_eq!(contract.token_budget, 512);
    }

    #[test]
    fn test_contract_example() {
        let contract = Contract::example();
        assert!(contract.schema_json.contains("type"));
        assert!(contract.schema_json.contains("object"));
        assert_eq!(contract.invariants.len(), 1);
    }

    #[test]
    fn test_contract_serialization() {
        let contract = Contract::example();
        let json = serde_json::to_string(&contract).unwrap();
        assert!(json.contains("schema_json"));
        assert!(json.contains("token_budget"));

        let deserialized: Contract = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.token_budget, 512);
    }

    #[test]
    fn test_contract_custom_budget() {
        let mut contract = Contract::new();
        contract.token_budget = 1024;
        assert_eq!(contract.token_budget, 1024);
    }

    #[test]
    fn test_candidate_example() {
        let candidate = Candidate::example();
        assert_eq!(candidate.model, "model-1");
        assert_eq!(candidate.json["result"], "test");
        assert_eq!(candidate.cost_usd, 0.01);
        assert_eq!(candidate.latency_ms, 1200);
    }

    #[test]
    fn test_candidate_serialization() {
        let candidate = Candidate::example();
        let json = serde_json::to_string(&candidate).unwrap();
        assert!(json.contains("model"));
        assert!(json.contains("model-1"));

        let deserialized: Candidate = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.model, "model-1");
    }

    #[test]
    fn test_candidate_custom_values() {
        let candidate = Candidate {
            model: "gpt-4".to_string(),
            json: serde_json::json!({"answer": 42}),
            scores: CandidateScores::default(),
            cost_usd: 0.03,
            latency_ms: 500,
        };

        assert_eq!(candidate.model, "gpt-4");
        assert_eq!(candidate.cost_usd, 0.03);
        assert_eq!(candidate.latency_ms, 500);
    }

    #[test]
    fn test_candidate_scores_default() {
        let scores = CandidateScores::default();
        assert_eq!(scores.accuracy, 0.0);
        assert_eq!(scores.safety, 0.0);
        assert_eq!(scores.efficiency, 0.0);
        assert_eq!(scores.ihsan, 0.0);
    }

    #[test]
    fn test_candidate_scores_custom() {
        let scores = CandidateScores {
            accuracy: 0.95,
            safety: 0.98,
            efficiency: 0.85,
            ihsan: 0.92,
        };

        assert_eq!(scores.accuracy, 0.95);
        assert_eq!(scores.safety, 0.98);
        assert_eq!(scores.efficiency, 0.85);
        assert_eq!(scores.ihsan, 0.92);
    }

    #[test]
    fn test_candidate_scores_serialization() {
        let scores = CandidateScores {
            accuracy: 0.9,
            safety: 0.95,
            efficiency: 0.85,
            ihsan: 0.9,
        };

        let json = serde_json::to_string(&scores).unwrap();
        assert!(json.contains("accuracy"));
        assert!(json.contains("0.9"));

        let deserialized: CandidateScores = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.accuracy, 0.9);
    }

    #[test]
    fn test_scored_candidate_creation() {
        let candidate = Candidate::example();
        let scores = CandidateScores {
            accuracy: 0.9,
            safety: 0.95,
            efficiency: 0.85,
            ihsan: 0.9,
        };

        let scored = ScoredCandidate {
            candidate: candidate.clone(),
            scores: scores.clone(),
        };

        assert_eq!(scored.candidate.model, "model-1");
        assert_eq!(scored.scores.accuracy, 0.9);
    }

    #[test]
    fn test_consensus_config_default() {
        let config = ConsensusConfig::default();
        assert_eq!(config.ihsan_floor, 0.85);
    }

    #[test]
    fn test_consensus_config_custom() {
        let config = ConsensusConfig { ihsan_floor: 0.95 };
        assert_eq!(config.ihsan_floor, 0.95);
    }

    #[test]
    fn test_consensus_error_no_candidates() {
        let error = ConsensusError::NoCandidates;
        assert_eq!(error.to_string(), "no candidates");
    }

    #[test]
    fn test_consensus_error_all_failed_ihsan() {
        let error = ConsensusError::AllCandidatesFailedIhsan;
        assert_eq!(error.to_string(), "all failed ihsan");
    }

    #[test]
    fn test_consensus_error_no_candidate_above_threshold() {
        let error = ConsensusError::NoCandidateAboveThreshold;
        assert_eq!(error.to_string(), "no candidate above threshold");
    }

    #[test]
    fn test_orchestrator_result_creation() {
        let winner = Candidate::example();
        let telemetry = Telemetry {
            sli_metrics: Sli {
                json_compliance_rate: 0.95,
            },
            quality_metrics: Quality {
                accuracy_uplift: 0.15,
            },
        };

        let result = OrchestratorResult { winner, telemetry };
        assert_eq!(result.winner.model, "model-1");
        assert_eq!(result.telemetry.sli_metrics.json_compliance_rate, 0.95);
    }

    #[test]
    fn test_telemetry_serialization() {
        let telemetry = Telemetry {
            sli_metrics: Sli {
                json_compliance_rate: 0.98,
            },
            quality_metrics: Quality {
                accuracy_uplift: 0.25,
            },
        };

        let json = serde_json::to_string(&telemetry).unwrap();
        assert!(json.contains("sli_metrics"));
        assert!(json.contains("quality_metrics"));

        let deserialized: Telemetry = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.sli_metrics.json_compliance_rate, 0.98);
        assert_eq!(deserialized.quality_metrics.accuracy_uplift, 0.25);
    }

    #[test]
    fn test_invariant_serialization() {
        let invariant = Invariant;
        let json = serde_json::to_string(&invariant).unwrap();
        assert_eq!(json, "null");

        let deserialized: Invariant = serde_json::from_str(&json).unwrap();
        // Should deserialize without error
        let _: Invariant = deserialized;
    }

    #[test]
    fn test_candidate_clone() {
        let candidate = Candidate::example();
        let cloned = candidate.clone();

        assert_eq!(candidate.model, cloned.model);
        assert_eq!(candidate.cost_usd, cloned.cost_usd);
        assert_eq!(candidate.latency_ms, cloned.latency_ms);
    }

    #[test]
    fn test_contract_clone() {
        let contract = Contract::example();
        let cloned = contract.clone();

        assert_eq!(contract.schema_json, cloned.schema_json);
        assert_eq!(contract.token_budget, cloned.token_budget);
    }

    #[test]
    fn test_scores_range_validation() {
        // Test that scores can be in valid ranges
        let scores = CandidateScores {
            accuracy: 1.0,
            safety: 1.0,
            efficiency: 1.0,
            ihsan: 1.0,
        };
        assert_eq!(scores.accuracy, 1.0);

        let scores_zero = CandidateScores {
            accuracy: 0.0,
            safety: 0.0,
            efficiency: 0.0,
            ihsan: 0.0,
        };
        assert_eq!(scores_zero.accuracy, 0.0);
    }
}
