//! # Genesis Validation Layer
//!
//! This module implements spiritual validation based on the BIZRA genesis documents
//! written during Ramadan 2023. It ensures all technical outputs align with the
//! spiritual principles of الإحسان (Al-Ihsan), truth, dignity, and mercy.
//!
//! ## Spiritual Foundation
//!
//! Based on "الرسالة" (The Message) and "البذرة" (The Seed) - the sacred documents
//! that birthed BIZRA from darkness to light during Ramadan 2023.
//!
//! ### Core Principles
//! - **الإحسان (Al-Ihsan)**: Excellence in execution, transparency in process
//! - **الحقيقة (Truth)**: No false promises, complete honesty
//! - **الكرامة (Dignity)**: Human dignity preservation, no exploitation
//! - **الرحمة (Mercy)**: Compassion over harm, graceful design
//! - **التكافل (Solidarity)**: Community benefit over individual gain

use crate::types::{CandidateScores, ConsensusError};
use serde::{Deserialize, Serialize};

/// Spiritual dimensions that extend technical Ihsan scoring
/// These represent the Ramadan 2023 commitments translated to technical metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpiritualDimensions {
    /// الإحسان (Al-Ihsan) - Excellence in execution and transparency
    pub al_ihsan: f32,
    /// الحقيقة (Truth) - Honesty, no false promises
    pub al_haqiqa: f32,
    /// الكرامة (Dignity) - Human dignity preservation
    pub al_karama: f32,
    /// الرحمة (Mercy) - Compassionate design, no harm
    pub al_rahma: f32,
    /// التكافل (Solidarity) - Community benefit focus
    pub al_takafol: f32,
}

impl Default for SpiritualDimensions {
    fn default() -> Self {
        Self {
            al_ihsan: 0.0,
            al_haqiqa: 0.0,
            al_karama: 0.0,
            al_rahma: 0.0,
            al_takafol: 0.0,
        }
    }
}

impl SpiritualDimensions {
    /// Calculate overall spiritual alignment score (0.0-1.0)
    /// Based on the weighted importance from the genesis documents
    pub fn overall_alignment(&self) -> f32 {
        // Weights based on Ramadan 2023 emphasis:
        // Ihsan (40%) - Core principle of excellence
        // Truth (25%) - No false promises commitment
        // Dignity (20%) - Human dignity preservation
        // Mercy (10%) - Compassionate design
        // Solidarity (5%) - Community benefit
        (self.al_ihsan * 0.40)
            + (self.al_haqiqa * 0.25)
            + (self.al_karama * 0.20)
            + (self.al_rahma * 0.10)
            + (self.al_takafol * 0.05)
    }

    /// Check if output passes spiritual threshold (85% minimum)
    /// This represents the "complete dignity" commitment
    pub fn passes_spiritual_threshold(&self) -> bool {
        self.overall_alignment() >= 0.85
    }
}

/// Genesis Constitutional Validator
/// Ensures all outputs align with the foundational principles
/// from Ramadan 2023 genesis documents
pub struct GenesisValidator {
    /// Minimum spiritual alignment required (default: 0.85)
    /// Represents the "complete dignity" standard
    pub spiritual_threshold: f32,

    /// Track validation history for transparency
    pub validation_history: Vec<GenesisValidationRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisValidationRecord {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub candidate_id: String,
    pub spiritual_score: f32,
    pub passed: bool,
    pub concerns: Vec<String>,
    pub recommendations: Vec<String>,
}

impl Default for GenesisValidator {
    fn default() -> Self {
        Self {
            spiritual_threshold: 0.85,
            validation_history: Vec::new(),
        }
    }
}

impl GenesisValidator {
    /// Create new validator with custom spiritual threshold
    pub fn new(threshold: f32) -> Self {
        Self {
            spiritual_threshold: threshold,
            validation_history: Vec::new(),
        }
    }

    /// Validate candidate against genesis principles
    /// Returns spiritual dimensions and validation result
    pub fn validate_candidate(
        &mut self,
        candidate_id: &str,
        technical_scores: &CandidateScores,
        content: &str,
    ) -> Result<(SpiritualDimensions, bool), ConsensusError> {
        let spiritual_dims = self.assess_spiritual_dimensions(technical_scores, content);
        let passed = spiritual_dims.passes_spiritual_threshold();

        // Record validation for transparency
        let record = GenesisValidationRecord {
            timestamp: chrono::Utc::now(),
            candidate_id: candidate_id.to_string(),
            spiritual_score: spiritual_dims.overall_alignment(),
            passed,
            concerns: self.identify_concerns(&spiritual_dims, content),
            recommendations: self.generate_recommendations(&spiritual_dims),
        };

        self.validation_history.push(record);

        Ok((spiritual_dims, passed))
    }

    /// Assess spiritual dimensions based on technical scores and content
    /// This translates Ramadan 2023 principles into measurable technical criteria
    fn assess_spiritual_dimensions(
        &self,
        technical_scores: &CandidateScores,
        content: &str,
    ) -> SpiritualDimensions {
        SpiritualDimensions {
            // الإحسان - Excellence = Technical quality + transparency
            al_ihsan: (technical_scores.accuracy * 0.6) + (technical_scores.safety * 0.4),

            // الحقيقة - Truth = Accuracy + no manipulation detection
            al_haqiqa: self.assess_truthfulness(technical_scores, content),

            // الكرامة - Dignity = Safety + no exploitative content
            al_karama: self.assess_dignity(technical_scores, content),

            // الرحمة - Mercy = Safety + graceful error handling
            al_rahma: (technical_scores.safety * 0.7) + (self.assess_compassion(content) * 0.3),

            // التكافل - Solidarity = Community benefit assessment
            al_takafol: self.assess_solidarity(content),
        }
    }

    /// Assess truthfulness - no false promises, honest representations
    fn assess_truthfulness(&self, scores: &CandidateScores, content: &str) -> f32 {
        let mut score = scores.accuracy * 0.8; // Base on technical accuracy

        // Check for honesty markers in content
        if !content.contains("guaranteed") && !content.contains("promise") {
            score += 0.1; // Bonus for avoiding absolute promises
        }

        // Penalize manipulative language
        if content.contains("miracle") || content.contains("revolutionary") {
            score -= 0.2; // Penalty for hype without evidence
        }

        score.clamp(0.0, 1.0)
    }

    /// Assess dignity preservation - no exploitation, human respect
    fn assess_dignity(&self, scores: &CandidateScores, content: &str) -> f32 {
        let mut score = scores.safety * 0.7;

        // Check for dignity markers
        if content.contains("respect") || content.contains("dignity") {
            score += 0.1;
        }

        // Penalize exploitative content
        if content.contains("exploit") || content.contains("manipulate") {
            score -= 0.3;
        }

        score.clamp(0.0, 1.0)
    }

    /// Assess compassionate design - mercy over harm
    fn assess_compassion(&self, content: &str) -> f32 {
        let mut score: f32 = 0.5; // Neutral baseline

        // Positive mercy indicators
        if content.contains("graceful") || content.contains("fallback") {
            score += 0.2;
        }

        if content.contains("compassion") || content.contains("mercy") {
            score += 0.2;
        }

        // Negative harm indicators
        if content.contains("punish") || content.contains("harm") {
            score -= 0.3;
        }

        score.clamp(0.0, 1.0)
    }

    /// Assess community solidarity - benefit to humanity
    fn assess_solidarity(&self, content: &str) -> f32 {
        let mut score: f32 = 0.5; // Neutral baseline

        // Community benefit indicators
        if content.contains("community") || content.contains("humanity") {
            score += 0.2;
        }

        if content.contains("solidarity") || content.contains("together") {
            score += 0.2;
        }

        // Individual gain focus (penalty)
        if content.contains("profit") || content.contains("personal gain") {
            score -= 0.1;
        }

        score.clamp(0.0, 1.0)
    }

    /// Identify specific concerns based on spiritual assessment
    fn identify_concerns(&self, dims: &SpiritualDimensions, _content: &str) -> Vec<String> {
        let mut concerns = Vec::new();

        if dims.al_haqiqa < 0.8 {
            concerns.push("Truthfulness below threshold - potential false promises".to_string());
        }

        if dims.al_karama < 0.8 {
            concerns.push(
                "Dignity preservation inadequate - possible exploitative content".to_string(),
            );
        }

        if dims.al_rahma < 0.7 {
            concerns.push("Mercy assessment low - may cause harm".to_string());
        }

        if dims.al_takafol < 0.6 {
            concerns.push("Community solidarity insufficient - individual gain focus".to_string());
        }

        concerns
    }

    /// Generate recommendations for spiritual improvement
    fn generate_recommendations(&self, dims: &SpiritualDimensions) -> Vec<String> {
        let mut recommendations = Vec::new();

        if dims.al_ihsan < 0.9 {
            recommendations.push("Enhance transparency in execution process".to_string());
        }

        if dims.al_haqiqa < 0.85 {
            recommendations
                .push("Avoid absolute promises, focus on honest representations".to_string());
        }

        if dims.al_karama < 0.85 {
            recommendations
                .push("Ensure human dignity preservation in all interactions".to_string());
        }

        if dims.al_rahma < 0.8 {
            recommendations.push("Implement more compassionate error handling".to_string());
        }

        if dims.al_takafol < 0.7 {
            recommendations
                .push("Increase focus on community benefit over individual gain".to_string());
        }

        recommendations
    }

    /// Get validation statistics for transparency reporting
    pub fn get_validation_stats(&self) -> GenesisValidationStats {
        let total_validations = self.validation_history.len();
        let passed_validations = self.validation_history.iter().filter(|r| r.passed).count();

        let avg_spiritual_score = if total_validations > 0 {
            self.validation_history
                .iter()
                .map(|r| r.spiritual_score)
                .sum::<f32>()
                / total_validations as f32
        } else {
            0.0
        };

        GenesisValidationStats {
            total_validations,
            passed_validations,
            pass_rate: if total_validations > 0 {
                passed_validations as f32 / total_validations as f32
            } else {
                0.0
            },
            average_spiritual_score: avg_spiritual_score,
        }
    }
}

/// Statistics for genesis validation transparency
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisValidationStats {
    pub total_validations: usize,
    pub passed_validations: usize,
    pub pass_rate: f32,
    pub average_spiritual_score: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spiritual_dimensions_default() {
        let dims = SpiritualDimensions::default();
        assert_eq!(dims.overall_alignment(), 0.0);
        assert!(!dims.passes_spiritual_threshold());
    }

    #[test]
    fn test_spiritual_dimensions_perfect() {
        let dims = SpiritualDimensions {
            al_ihsan: 1.0,
            al_haqiqa: 1.0,
            al_karama: 1.0,
            al_rahma: 1.0,
            al_takafol: 1.0,
        };
        assert_eq!(dims.overall_alignment(), 1.0);
        assert!(dims.passes_spiritual_threshold());
    }

    #[test]
    fn test_genesis_validator_creation() {
        let validator = GenesisValidator::default();
        assert_eq!(validator.spiritual_threshold, 0.85);
        assert!(validator.validation_history.is_empty());
    }

    #[test]
    fn test_truthfulness_assessment() {
        let validator = GenesisValidator::default();
        let scores = CandidateScores::default();

        // Test honest content
        let honest_score = validator.assess_truthfulness(&scores, "This is an honest assessment");
        assert!(honest_score >= 0.0);

        // Test manipulative content
        let manipulative_score =
            validator.assess_truthfulness(&scores, "This is a guaranteed miracle solution");
        assert!(manipulative_score < honest_score);
    }

    #[test]
    fn test_validation_stats() {
        let mut validator = GenesisValidator::default();

        // Add some test validations
        let scores = CandidateScores {
            accuracy: 0.9,
            safety: 0.95,
            efficiency: 0.85,
            ihsan: 0.92,
        };

        validator
            .validate_candidate("test1", &scores, "Honest content")
            .unwrap();
        validator
            .validate_candidate("test2", &scores, "Honest content")
            .unwrap();

        let stats = validator.get_validation_stats();
        assert_eq!(stats.total_validations, 2);
        assert!(stats.average_spiritual_score > 0.0);
    }
}
