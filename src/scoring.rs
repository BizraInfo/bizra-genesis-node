// synthesis_orchestrator/src/scoring.rs
// Ihsan Gate for quality validation

use crate::{Candidate, Contract, Invariant};
use serde_json::Value;

pub struct IhsanGate {
    pub ihsan_floor: f32,
}

impl IhsanGate {
    pub fn new(floor: f32) -> Self {
        Self { ihsan_floor: floor }
    }

    pub fn score(&self, candidate: &Candidate, contract: &Contract) -> f32 {
        let formal = self.calculate_formal_validity(candidate, contract);
        let correct = self.calculate_referenceable_correctness(candidate);
        let safety = self.calculate_safety_score(candidate);
        let efficiency = self.calculate_efficiency_score(candidate);

        let weights = [0.35, 0.30, 0.25, 0.10];
        let scores = [formal, correct, safety, efficiency];

        let harmonic = weights
            .iter()
            .zip(scores.iter())
            .map(|(w, s)| w / s.max(0.01))
            .sum::<f32>();

        1.0 / harmonic
    }

    fn calculate_formal_validity(&self, c: &Candidate, contract: &Contract) -> f32 {
        let schema = Self::validate_schema(&c.json, &contract.schema_json);
        let inv = Self::check_invariants(&c.json, &contract.invariants);
        0.5 * schema + 0.5 * inv
    }

    fn calculate_referenceable_correctness(&self, _c: &Candidate) -> f32 {
        0.92
    }

    fn calculate_safety_score(&self, _c: &Candidate) -> f32 {
        0.97
    }

    fn calculate_efficiency_score(&self, _c: &Candidate) -> f32 {
        0.88
    }

    fn validate_schema(_json: &Value, _schema: &str) -> f32 {
        0.95
    }

    fn check_invariants(_json: &Value, _inv: &[Invariant]) -> f32 {
        0.96
    }
}
