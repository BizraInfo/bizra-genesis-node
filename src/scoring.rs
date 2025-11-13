// synthesis_orchestrator/src/scoring.rs
// Ihsan Gate for quality validation

use crate::{Candidate, Contract, Invariant};
use serde_json::Value;

/// Ihsan Gate for multi-dimensional quality validation.
///
/// إحسان (Ihsan) - "Excellence in execution, transparency in process"
///
/// Evaluates candidates across four critical dimensions using harmonic mean
/// weighting to ensure no single weakness can be compensated by other strengths.
///
/// # Scoring Dimensions (Weights)
///
/// 1. **Formal Validity (35%)**: Schema compliance + invariant satisfaction
/// 2. **Referenceable Correctness (30%)**: Accuracy against ground truth
/// 3. **Safety (25%)**: Security, ethical, and robustness checks
/// 4. **Efficiency (10%)**: Cost and latency performance
///
/// # Harmonic Mean Formula
///
/// Ihsan Score = 1 / Σ(wᵢ / scoreᵢ)
///
/// This ensures that low scores in any dimension significantly impact the final
/// score, preventing gaming of the system through single-dimension optimization.
///
/// # Examples
///
/// ```
/// use synthesis_orchestrator::{IhsanGate, Candidate, Contract, CandidateScores};
/// use serde_json::json;
///
/// let gate = IhsanGate::new(0.85); // 85% minimum threshold
/// let candidate = Candidate {
///     model: "gpt-4".to_string(),
///     json: json!({"name": "test", "value": 42}),
///     scores: CandidateScores::default(),
///     cost_usd: 0.02,
///     latency_ms: 1200,
/// };
/// let contract = Contract::example();
///
/// let ihsan_score = gate.score(&candidate, &contract);
/// assert!(ihsan_score > 0.0 && ihsan_score <= 1.0);
/// ```
pub struct IhsanGate {
    /// Minimum Ihsan score threshold for candidate acceptance
    pub ihsan_floor: f32,
}

impl IhsanGate {
    /// Creates a new Ihsan Gate with specified quality floor.
    ///
    /// # Arguments
    ///
    /// * `floor` - Minimum acceptable Ihsan score (typically 0.85 = 85%)
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::IhsanGate;
    ///
    /// let gate = IhsanGate::new(0.85);
    /// assert_eq!(gate.ihsan_floor, 0.85);
    /// ```
    pub fn new(floor: f32) -> Self {
        Self { ihsan_floor: floor }
    }

    /// Calculates multi-dimensional Ihsan (excellence) score for a candidate.
    ///
    /// Evaluates candidate across four weighted dimensions using harmonic mean
    /// to ensure balanced quality across all aspects.
    ///
    /// # Arguments
    ///
    /// * `candidate` - The candidate to score
    /// * `contract` - Quality contract defining schema and invariants
    ///
    /// # Returns
    ///
    /// Ihsan score in range [0.0, 1.0], typically 0.85-0.95 for good candidates.
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::{IhsanGate, Candidate, Contract, CandidateScores};
    /// use serde_json::json;
    ///
    /// let gate = IhsanGate::new(0.85);
    /// let candidate = Candidate {
    ///     model: "claude-3".to_string(),
    ///     json: json!({"result": "success"}),
    ///     scores: CandidateScores::default(),
    ///     cost_usd: 0.01,
    ///     latency_ms: 800,
    /// };
    /// let contract = Contract::example();
    ///
    /// let score = gate.score(&candidate, &contract);
    /// assert!(score > 0.85, "High-quality candidate should score above floor");
    /// ```
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
        let inv = self.check_invariants(&c.json, &contract.invariants);
        0.5 * schema + 0.5 * inv
    }

    fn calculate_referenceable_correctness(&self, c: &Candidate) -> f32 {
        // Referenceable correctness based on candidate scores
        // This represents accuracy against ground truth/reference data
        c.scores.accuracy.clamp(0.0, 1.0)
    }

    fn calculate_safety_score(&self, c: &Candidate) -> f32 {
        // Safety score combines security, ethical compliance, and robustness
        let security_score = c.scores.safety.clamp(0.0, 1.0);

        // Additional safety checks based on content analysis
        let content_safety = self.analyze_content_safety(&c.json);

        // Weighted combination: 70% model-reported safety + 30% content analysis
        0.7 * security_score + 0.3 * content_safety
    }

    fn calculate_efficiency_score(&self, c: &Candidate) -> f32 {
        // Efficiency combines cost-effectiveness and performance
        let cost_score = self.calculate_cost_efficiency(c);
        let latency_score = self.calculate_latency_efficiency(c);

        // Harmonic mean to prevent gaming (can't compensate low cost with high latency)
        2.0 / ((1.0 / cost_score) + (1.0 / latency_score))
    }

    fn validate_schema(json: &Value, schema: &str) -> f32 {
        // Basic JSON schema validation
        match serde_json::from_str::<Value>(schema) {
            Ok(schema_value) => {
                if Self::validate_json_against_schema(json, &schema_value) {
                    1.0 // Perfect schema compliance
                } else {
                    0.0 // Schema violation
                }
            }
            Err(_) => 0.5, // Invalid schema definition
        }
    }

    fn check_invariants(&self, json: &Value, invariants: &[Invariant]) -> f32 {
        if invariants.is_empty() {
            return 1.0; // No invariants to check
        }

        let mut satisfied = 0;
        for invariant in invariants {
            if self.check_single_invariant(json, invariant) {
                satisfied += 1;
            }
        }

        satisfied as f32 / invariants.len() as f32
    }

    #[allow(clippy::only_used_in_recursion)]
    fn analyze_content_safety(&self, json: &Value) -> f32 {
        // Basic content safety analysis
        // This would be enhanced with more sophisticated checks in production
        match json {
            Value::String(s) => {
                // Check for potentially harmful content patterns
                let harmful_patterns = ["harm", "violence", "illegal", "exploit"];
                let contains_harmful = harmful_patterns
                    .iter()
                    .any(|pattern| s.to_lowercase().contains(pattern));

                if contains_harmful {
                    0.3
                } else {
                    0.9
                }
            }
            Value::Object(obj) => {
                // Check all string values in the object
                let mut safety_scores = Vec::new();
                for (_, value) in obj {
                    if let Value::String(s) = value {
                        safety_scores
                            .push(self.analyze_content_safety(&Value::String(s.to_string())));
                    }
                }

                if safety_scores.is_empty() {
                    0.95 // Default for objects without strings
                } else {
                    safety_scores.iter().sum::<f32>() / safety_scores.len() as f32
                }
            }
            _ => 0.95, // Default safety score for other types
        }
    }

    fn calculate_cost_efficiency(&self, c: &Candidate) -> f32 {
        // Cost efficiency: lower cost = higher score
        // Normalize to 0-1 scale where $0.10 = 0.0, $0.001 = 1.0
        let max_cost = 0.10; // $0.10 is considered expensive
        let min_cost = 0.001; // $0.001 is considered very efficient

        if c.cost_usd <= min_cost {
            1.0
        } else if c.cost_usd >= max_cost {
            0.0
        } else {
            1.0 - ((c.cost_usd - min_cost) / (max_cost - min_cost))
        }
    }

    fn calculate_latency_efficiency(&self, c: &Candidate) -> f32 {
        // Latency efficiency: lower latency = higher score
        // Normalize to 0-1 scale where 5000ms = 0.0, 100ms = 1.0
        let max_latency = 5000.0; // 5 seconds is very slow
        let min_latency = 100.0; // 100ms is excellent
        let latency = c.latency_ms as f32;

        if latency <= min_latency {
            1.0
        } else if latency >= max_latency {
            0.0
        } else {
            1.0 - ((latency - min_latency) / (max_latency - min_latency))
        }
    }

    fn validate_json_against_schema(json: &Value, schema: &Value) -> bool {
        // Basic schema validation - enhanced version would use proper JSON Schema
        match (json, schema) {
            (Value::Object(json_obj), Value::Object(schema_obj)) => {
                // Check required fields exist
                if let Some(Value::Array(required)) = schema_obj.get("required") {
                    for req_field in required {
                        if let Value::String(field_name) = req_field {
                            if !json_obj.contains_key(field_name) {
                                return false;
                            }
                        }
                    }
                }

                // Check field types if specified
                if let Some(Value::Object(properties)) = schema_obj.get("properties") {
                    for (field_name, field_schema) in properties {
                        if let Some(field_value) = json_obj.get(field_name) {
                            if !Self::validate_field_type(field_value, field_schema) {
                                return false;
                            }
                        }
                    }
                }

                true
            }
            _ => json == schema, // For non-objects, exact match
        }
    }

    fn validate_field_type(value: &Value, field_schema: &Value) -> bool {
        if let Some(Value::String(type_str)) = field_schema.get("type") {
            match type_str.as_str() {
                "string" => matches!(value, Value::String(_)),
                "number" => matches!(value, Value::Number(_)),
                "boolean" => matches!(value, Value::Bool(_)),
                "object" => matches!(value, Value::Object(_)),
                "array" => matches!(value, Value::Array(_)),
                _ => true, // Unknown type, allow
            }
        } else {
            true // No type constraint
        }
    }

    fn check_single_invariant(&self, json: &Value, invariant: &Invariant) -> bool {
        // Basic invariant checking - would be enhanced with proper constraint language
        match invariant {
            Invariant::JsonPathExists(path) => Self::check_json_path_exists(json, path),
            Invariant::JsonPathValue(path, expected) => {
                Self::check_json_path_value(json, path, expected)
            }
            Invariant::NumericRange(path, min, max) => {
                Self::check_numeric_range(json, path, *min, *max)
            }
            Invariant::StringLength(path, min, max) => {
                Self::check_string_length(json, path, *min, *max)
            }
        }
    }

    fn check_json_path_exists(json: &Value, path: &str) -> bool {
        // Simple JSON path implementation - would use proper JSONPath library
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = json;

        for part in parts {
            match current {
                Value::Object(obj) => {
                    if let Some(next) = obj.get(part) {
                        current = next;
                    } else {
                        return false;
                    }
                }
                _ => return false,
            }
        }

        true
    }

    fn check_json_path_value(json: &Value, path: &str, expected: &Value) -> bool {
        // Check if value at path equals expected value
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = json;

        for part in parts {
            match current {
                Value::Object(obj) => {
                    if let Some(next) = obj.get(part) {
                        current = next;
                    } else {
                        return false;
                    }
                }
                _ => return false,
            }
        }

        current == expected
    }

    fn check_numeric_range(json: &Value, path: &str, min: f64, max: f64) -> bool {
        if let Some(value) = Self::extract_numeric_value(json, path) {
            value >= min && value <= max
        } else {
            false
        }
    }

    fn check_string_length(json: &Value, path: &str, min: usize, max: usize) -> bool {
        if let Some(length) = Self::extract_string_length(json, path) {
            length >= min && length <= max
        } else {
            false
        }
    }

    fn extract_numeric_value(json: &Value, path: &str) -> Option<f64> {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = json;

        for part in parts {
            match current {
                Value::Object(obj) => {
                    if let Some(next) = obj.get(part) {
                        current = next;
                    } else {
                        return None;
                    }
                }
                _ => return None,
            }
        }

        match current {
            Value::Number(num) => num.as_f64(),
            _ => None,
        }
    }

    fn extract_string_length(json: &Value, path: &str) -> Option<usize> {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = json;

        for part in parts {
            match current {
                Value::Object(obj) => {
                    if let Some(next) = obj.get(part) {
                        current = next;
                    } else {
                        return None;
                    }
                }
                _ => return None,
            }
        }

        match current {
            Value::String(s) => Some(s.len()),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Candidate, CandidateScores};
    use serde_json::json;

    fn create_test_candidate() -> Candidate {
        Candidate {
            model: "test-model".to_string(),
            json: json!({"result": "test"}),
            cost_usd: 0.001,
            latency_ms: 100,
            scores: CandidateScores::default(),
        }
    }

    fn create_test_contract() -> Contract {
        Contract::example()
    }

    #[test]
    fn test_ihsan_gate_creation() {
        let gate = IhsanGate::new(0.85);
        assert_eq!(gate.ihsan_floor, 0.85);
    }

    #[test]
    fn test_ihsan_scoring() {
        let gate = IhsanGate::new(0.85);
        let candidate = create_test_candidate();
        let contract = create_test_contract();

        let score = gate.score(&candidate, &contract);
        // Score should be a valid value between 0 and 1
        assert!(score > 0.0);
        assert!(score <= 1.0);
    }

    #[test]
    fn test_ihsan_score_consistency() {
        let gate = IhsanGate::new(0.85);
        let candidate = create_test_candidate();
        let contract = create_test_contract();

        let score1 = gate.score(&candidate, &contract);
        let score2 = gate.score(&candidate, &contract);

        // Scores should be consistent for same input
        assert!((score1 - score2).abs() < 0.01);
    }

    #[test]
    fn test_formal_validity_calculation() {
        let gate = IhsanGate::new(0.85);
        let candidate = create_test_candidate();
        let contract = create_test_contract();

        // This tests the internal calculation
        // Since calculate_formal_validity is private, we test through score
        let score = gate.score(&candidate, &contract);
        assert!(score > 0.0);
    }

    #[test]
    fn test_ihsan_floor_threshold() {
        let mut gate = IhsanGate::new(0.95);
        assert_eq!(gate.ihsan_floor, 0.95);

        gate.ihsan_floor = 0.80;
        assert_eq!(gate.ihsan_floor, 0.80);
    }
}
