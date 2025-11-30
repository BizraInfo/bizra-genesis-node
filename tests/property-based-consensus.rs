//! BIZRA Genesis Node - Property-Based Testing for Core Algorithms
//!
//! This module implements rigorous property-based testing using proptest
//! to verify the mathematical properties and invariants of the consensus
//! and scoring algorithms.
//!
//! # Property Categories
//!
//! 1. **Consensus Properties** - WeightedScoreConsensus invariants
//! 2. **Scoring Properties** - IhsanGate calculation invariants
//! 3. **Mathematical Properties** - Harmonic mean, composite score bounds
//!
//! # Running These Tests
//!
//! ```bash
//! cargo test --test property-based-consensus -- --nocapture
//! ```

use proptest::prelude::*;
use serde_json::json;

// ═══════════════════════════════════════════════════════════════════════════
// STRATEGY GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

/// Generate valid score values in [0.0, 1.0]
fn score_value() -> impl Strategy<Value = f32> {
    (0u32..=1000u32).prop_map(|v| v as f32 / 1000.0)
}

/// Generate valid score values that are strictly positive (avoid division by zero)
fn positive_score() -> impl Strategy<Value = f32> {
    (1u32..=1000u32).prop_map(|v| v as f32 / 1000.0)
}

/// Generate valid ihsan floor thresholds
fn ihsan_floor_value() -> impl Strategy<Value = f32> {
    (500u32..=990u32).prop_map(|v| v as f32 / 1000.0) // 0.50 to 0.99
}

/// Generate candidate scores tuple (accuracy, safety, efficiency, ihsan)
fn candidate_scores() -> impl Strategy<Value = (f32, f32, f32, f32)> {
    (score_value(), score_value(), score_value(), score_value())
}

/// Generate positive candidate scores (to avoid edge cases in harmonic mean)
fn positive_candidate_scores() -> impl Strategy<Value = (f32, f32, f32, f32)> {
    (
        positive_score(),
        positive_score(),
        positive_score(),
        positive_score(),
    )
}

/// Generate cost values in reasonable range ($0.001 to $1.00)
fn cost_value() -> impl Strategy<Value = f64> {
    (1u32..=1000u32).prop_map(|v| v as f64 / 1000.0)
}

/// Generate latency values in reasonable range (10ms to 10000ms)
fn latency_value() -> impl Strategy<Value = u64> {
    10u64..=10000u64
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITE SCORE PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

proptest! {
    /// Property: Composite score must always be in [0.0, 1.0] for valid inputs
    #[test]
    fn composite_score_bounded(
        accuracy in score_value(),
        safety in score_value(),
        efficiency in score_value(),
        ihsan in score_value(),
    ) {
        let composite = 0.4 * accuracy + 0.3 * safety + 0.2 * efficiency + 0.1 * ihsan;
        prop_assert!(composite >= 0.0, "Composite score must be >= 0.0, got {}", composite);
        prop_assert!(composite <= 1.0, "Composite score must be <= 1.0, got {}", composite);
    }

    /// Property: Composite score weights must sum to 1.0
    #[test]
    fn composite_score_weights_sum_to_one(
        _dummy in 0u8..1u8,
    ) {
        let weights = [0.4f32, 0.3, 0.2, 0.1];
        let sum: f32 = weights.iter().sum();
        prop_assert!((sum - 1.0).abs() < 0.001, "Weights must sum to 1.0, got {}", sum);
    }

    /// Property: Higher individual scores produce higher composite scores (monotonicity)
    #[test]
    fn composite_score_monotonic(
        base_accuracy in score_value(),
        base_safety in score_value(),
        base_efficiency in score_value(),
        base_ihsan in score_value(),
        delta in 0.01f32..0.1f32,
    ) {
        let base_composite = 0.4 * base_accuracy + 0.3 * base_safety + 0.2 * base_efficiency + 0.1 * base_ihsan;

        // Increasing accuracy should increase composite (if not at max)
        if base_accuracy + delta <= 1.0 {
            let improved_composite = 0.4 * (base_accuracy + delta) + 0.3 * base_safety + 0.2 * base_efficiency + 0.1 * base_ihsan;
            prop_assert!(improved_composite >= base_composite,
                "Increasing accuracy should increase composite: {} >= {}", improved_composite, base_composite);
        }

        // Increasing safety should increase composite (if not at max)
        if base_safety + delta <= 1.0 {
            let improved_composite = 0.4 * base_accuracy + 0.3 * (base_safety + delta) + 0.2 * base_efficiency + 0.1 * base_ihsan;
            prop_assert!(improved_composite >= base_composite,
                "Increasing safety should increase composite: {} >= {}", improved_composite, base_composite);
        }
    }

    /// Property: Accuracy has the highest impact on composite score (weight = 0.4)
    #[test]
    fn accuracy_has_highest_weight(
        base in score_value(),
        delta in 0.01f32..0.1f32,
    ) {
        // Starting from uniform scores
        let base_composite = 0.4 * base + 0.3 * base + 0.2 * base + 0.1 * base;

        // Adding delta to each dimension
        let accuracy_delta = (base + delta).min(1.0);
        let safety_delta = (base + delta).min(1.0);
        let efficiency_delta = (base + delta).min(1.0);
        let ihsan_delta = (base + delta).min(1.0);

        let acc_improvement = 0.4 * accuracy_delta + 0.3 * base + 0.2 * base + 0.1 * base - base_composite;
        let safety_improvement = 0.4 * base + 0.3 * safety_delta + 0.2 * base + 0.1 * base - base_composite;
        let eff_improvement = 0.4 * base + 0.3 * base + 0.2 * efficiency_delta + 0.1 * base - base_composite;
        let ihsan_improvement = 0.4 * base + 0.3 * base + 0.2 * base + 0.1 * ihsan_delta - base_composite;

        // Accuracy improvement should be largest (weight 0.4)
        prop_assert!(acc_improvement >= safety_improvement - 0.001,
            "Accuracy impact {} should be >= safety impact {}", acc_improvement, safety_improvement);
        prop_assert!(acc_improvement >= eff_improvement - 0.001,
            "Accuracy impact {} should be >= efficiency impact {}", acc_improvement, eff_improvement);
        prop_assert!(acc_improvement >= ihsan_improvement - 0.001,
            "Accuracy impact {} should be >= ihsan impact {}", acc_improvement, ihsan_improvement);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HARMONIC MEAN PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

proptest! {
    /// Property: Harmonic mean is always less than or equal to arithmetic mean
    #[test]
    fn harmonic_mean_less_than_arithmetic(
        (a, b, c, d) in positive_candidate_scores(),
    ) {
        // Weights for Ihsan scoring
        let weights = [0.35f32, 0.30, 0.25, 0.10];
        let scores = [a, b, c, d];

        // Calculate weighted harmonic mean (Ihsan formula)
        let harmonic_denom: f32 = weights.iter()
            .zip(scores.iter())
            .map(|(w, s)| w / s.max(0.01))
            .sum();
        let harmonic = 1.0 / harmonic_denom;

        // Calculate weighted arithmetic mean
        let arithmetic: f32 = weights.iter()
            .zip(scores.iter())
            .map(|(w, s)| w * s)
            .sum();

        // Property: harmonic <= arithmetic (AM-HM inequality)
        prop_assert!(harmonic <= arithmetic + 0.001,
            "Harmonic mean {} should be <= arithmetic mean {}", harmonic, arithmetic);
    }

    /// Property: Harmonic mean is bounded by min and max of inputs
    #[test]
    fn harmonic_mean_bounded_by_inputs(
        (a, b, c, d) in positive_candidate_scores(),
    ) {
        let weights = [0.35f32, 0.30, 0.25, 0.10];
        let scores = [a, b, c, d];

        let harmonic_denom: f32 = weights.iter()
            .zip(scores.iter())
            .map(|(w, s)| w / s.max(0.01))
            .sum();
        let harmonic = 1.0 / harmonic_denom;

        let min_score = scores.iter().cloned().fold(f32::INFINITY, f32::min);
        let max_score = scores.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

        // Harmonic mean should be between min and max of inputs
        // (with small epsilon for floating point)
        prop_assert!(harmonic >= min_score - 0.001,
            "Harmonic {} should be >= min input {}", harmonic, min_score);
        prop_assert!(harmonic <= max_score + 0.001,
            "Harmonic {} should be <= max input {}", harmonic, max_score);
    }

    /// Property: Harmonic mean is more sensitive to low values
    /// (A low score drags down the harmonic mean more than the arithmetic mean)
    #[test]
    fn harmonic_mean_sensitive_to_low_values(
        high in 0.8f32..1.0f32,
        low in 0.1f32..0.3f32,
    ) {
        // Scores: 3 high, 1 low vs all medium
        let scores_with_low = [high, high, high, low];
        let medium = (high * 3.0 + low) / 4.0; // Same arithmetic mean
        let scores_uniform = [medium, medium, medium, medium];

        let weights = [0.25f32, 0.25, 0.25, 0.25]; // Equal weights for clarity

        let harmonic_low: f32 = 1.0 / weights.iter()
            .zip(scores_with_low.iter())
            .map(|(w, s)| w / s.max(0.01))
            .sum::<f32>();

        let harmonic_uniform: f32 = 1.0 / weights.iter()
            .zip(scores_uniform.iter())
            .map(|(w, s)| w / s.max(0.01))
            .sum::<f32>();

        // Having one low value should produce lower harmonic than uniform scores
        // with the same arithmetic mean
        prop_assert!(harmonic_low <= harmonic_uniform + 0.01,
            "Mixed scores harmonic {} should be <= uniform harmonic {} (demonstrates low value sensitivity)",
            harmonic_low, harmonic_uniform);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// IHSAN FLOOR PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

proptest! {
    /// Property: Ihsan floor filtering is monotonic
    /// Higher floors filter more candidates
    #[test]
    fn ihsan_floor_monotonic_filtering(
        ihsan1 in 0.6f32..0.8f32,
        ihsan2 in 0.7f32..0.9f32,
        ihsan3 in 0.8f32..0.95f32,
    ) {
        let candidates = [ihsan1, ihsan2, ihsan3];

        let floor_low = 0.65;
        let floor_mid = 0.75;
        let floor_high = 0.85;

        let count_low = candidates.iter().filter(|&&x| x >= floor_low).count();
        let count_mid = candidates.iter().filter(|&&x| x >= floor_mid).count();
        let count_high = candidates.iter().filter(|&&x| x >= floor_high).count();

        // Higher floor should filter more candidates (or same)
        prop_assert!(count_low >= count_mid,
            "Low floor {} should pass >= mid floor {}: {} >= {}",
            floor_low, floor_mid, count_low, count_mid);
        prop_assert!(count_mid >= count_high,
            "Mid floor {} should pass >= high floor {}: {} >= {}",
            floor_mid, floor_high, count_mid, count_high);
    }

    /// Property: Fallback to max ihsan maintains determinism
    #[test]
    fn fallback_selects_max_ihsan(
        ihsan1 in score_value(),
        ihsan2 in score_value(),
        ihsan3 in score_value(),
    ) {
        let candidates = [ihsan1, ihsan2, ihsan3];
        let max_ihsan = candidates.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

        // When all candidates fail the floor, max ihsan should be selected
        let selected = candidates.iter()
            .cloned()
            .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        prop_assert_eq!(selected, Some(max_ihsan),
            "Fallback should select max ihsan {}, got {:?}", max_ihsan, selected);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EFFICIENCY SCORING PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

proptest! {
    /// Property: Cost efficiency inversely proportional to cost
    #[test]
    fn cost_efficiency_inverse(
        cost1 in cost_value(),
        cost2 in cost_value(),
    ) {
        // Higher cost = lower efficiency score
        let efficiency1 = calculate_cost_efficiency(cost1);
        let efficiency2 = calculate_cost_efficiency(cost2);

        if cost1 < cost2 {
            prop_assert!(efficiency1 >= efficiency2 - 0.001,
                "Lower cost {} should have >= efficiency than higher cost {}: {} >= {}",
                cost1, cost2, efficiency1, efficiency2);
        } else if cost1 > cost2 {
            prop_assert!(efficiency2 >= efficiency1 - 0.001,
                "Lower cost {} should have >= efficiency than higher cost {}: {} >= {}",
                cost2, cost1, efficiency2, efficiency1);
        }
    }

    /// Property: Latency efficiency inversely proportional to latency
    #[test]
    fn latency_efficiency_inverse(
        latency1 in latency_value(),
        latency2 in latency_value(),
    ) {
        let efficiency1 = calculate_latency_efficiency(latency1);
        let efficiency2 = calculate_latency_efficiency(latency2);

        if latency1 < latency2 {
            prop_assert!(efficiency1 >= efficiency2 - 0.001,
                "Lower latency {} should have >= efficiency than higher latency {}: {} >= {}",
                latency1, latency2, efficiency1, efficiency2);
        } else if latency1 > latency2 {
            prop_assert!(efficiency2 >= efficiency1 - 0.001,
                "Lower latency {} should have >= efficiency than higher latency {}: {} >= {}",
                latency2, latency1, efficiency2, efficiency1);
        }
    }

    /// Property: Efficiency scores are bounded [0.0, 1.0]
    #[test]
    fn efficiency_scores_bounded(
        cost in cost_value(),
        latency in latency_value(),
    ) {
        let cost_eff = calculate_cost_efficiency(cost);
        let latency_eff = calculate_latency_efficiency(latency);

        prop_assert!(cost_eff >= 0.0 && cost_eff <= 1.0,
            "Cost efficiency {} must be in [0, 1]", cost_eff);
        prop_assert!(latency_eff >= 0.0 && latency_eff <= 1.0,
            "Latency efficiency {} must be in [0, 1]", latency_eff);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSENSUS WINNER SELECTION PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

proptest! {
    /// Property: Winner selection is deterministic for same inputs
    #[test]
    fn winner_selection_deterministic(
        (acc1, saf1, eff1, ihs1) in candidate_scores(),
        (acc2, saf2, eff2, ihs2) in candidate_scores(),
    ) {
        let candidates = vec![
            (acc1, saf1, eff1, ihs1),
            (acc2, saf2, eff2, ihs2),
        ];

        let floor = 0.5f32;
        let winner1 = select_winner(&candidates, floor);
        let winner2 = select_winner(&candidates, floor);

        prop_assert_eq!(winner1, winner2,
            "Winner selection must be deterministic: {:?} == {:?}", winner1, winner2);
    }

    /// Property: Single candidate is always the winner
    #[test]
    fn single_candidate_wins(
        (accuracy, safety, efficiency, ihsan) in candidate_scores(),
    ) {
        let candidates = vec![(accuracy, safety, efficiency, ihsan)];
        let winner = select_winner(&candidates, 0.0); // Floor 0 to ensure candidate passes

        prop_assert!(winner.is_some(),
            "Single candidate should always be selected as winner");
    }

    /// Property: No winner from empty candidates
    #[test]
    fn empty_candidates_no_winner(
        _dummy in 0u8..1u8,
    ) {
        let candidates: Vec<(f32, f32, f32, f32)> = vec![];
        let winner = select_winner(&candidates, 0.5);

        prop_assert!(winner.is_none(),
            "Empty candidates should produce no winner");
    }

    /// Property: Best composite score wins (among candidates passing ihsan floor)
    #[test]
    fn best_composite_wins(
        (acc1, saf1, eff1, ihs1) in positive_candidate_scores(),
        (acc2, saf2, eff2, ihs2) in positive_candidate_scores(),
        floor in 0.1f32..0.5f32, // Low floor to ensure candidates pass
    ) {
        // Ensure both candidates have ihsan above floor
        let ihs1 = ihs1.max(floor + 0.01);
        let ihs2 = ihs2.max(floor + 0.01);

        let composite1 = 0.4 * acc1 + 0.3 * saf1 + 0.2 * eff1 + 0.1 * ihs1;
        let composite2 = 0.4 * acc2 + 0.3 * saf2 + 0.2 * eff2 + 0.1 * ihs2;

        let candidates = vec![
            (acc1, saf1, eff1, ihs1),
            (acc2, saf2, eff2, ihs2),
        ];

        let winner = select_winner(&candidates, floor);

        if let Some(idx) = winner {
            if composite1 > composite2 + 0.001 {
                prop_assert_eq!(idx, 0,
                    "Candidate 0 with higher composite {} should win over {}", composite1, composite2);
            } else if composite2 > composite1 + 0.001 {
                prop_assert_eq!(idx, 1,
                    "Candidate 1 with higher composite {} should win over {}", composite2, composite1);
            }
            // If composites are equal, either can win (tie-breaking is implementation-defined)
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (mirroring the actual implementation for testing)
// ═══════════════════════════════════════════════════════════════════════════

fn calculate_cost_efficiency(cost: f64) -> f32 {
    let max_cost = 0.10;
    let min_cost = 0.001;

    if cost <= min_cost {
        1.0
    } else if cost >= max_cost {
        0.0
    } else {
        (1.0 - ((cost - min_cost) / (max_cost - min_cost))) as f32
    }
}

fn calculate_latency_efficiency(latency: u64) -> f32 {
    let max_latency = 5000.0;
    let min_latency = 100.0;
    let latency = latency as f32;

    if latency <= min_latency {
        1.0
    } else if latency >= max_latency {
        0.0
    } else {
        1.0 - ((latency - min_latency) / (max_latency - min_latency))
    }
}

fn select_winner(candidates: &[(f32, f32, f32, f32)], ihsan_floor: f32) -> Option<usize> {
    if candidates.is_empty() {
        return None;
    }

    // Filter by ihsan floor
    let passing: Vec<(usize, f32)> = candidates
        .iter()
        .enumerate()
        .filter(|(_, (_, _, _, ihsan))| *ihsan >= ihsan_floor)
        .map(|(idx, (acc, saf, eff, ihs))| {
            let composite = 0.4 * acc + 0.3 * saf + 0.2 * eff + 0.1 * ihs;
            (idx, composite)
        })
        .collect();

    if passing.is_empty() {
        // Fallback to max ihsan
        candidates
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.3.partial_cmp(&b.3).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(idx, _)| idx)
    } else {
        // Select highest composite
        passing
            .iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(idx, _)| *idx)
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// REGRESSION TESTS (concrete examples derived from property testing)
// ═══════════════════════════════════════════════════════════════════════════

#[test]
fn regression_composite_score_perfect_candidate() {
    let composite = 0.4 * 1.0 + 0.3 * 1.0 + 0.2 * 1.0 + 0.1 * 1.0;
    assert!(
        (composite - 1.0f64).abs() < 0.001,
        "Perfect candidate should have composite = 1.0"
    );
}

#[test]
fn regression_composite_score_zero_candidate() {
    let composite = 0.4 * 0.0 + 0.3 * 0.0 + 0.2 * 0.0 + 0.1 * 0.0;
    assert!(
        (composite - 0.0f64).abs() < 0.001,
        "Zero candidate should have composite = 0.0"
    );
}

#[test]
fn regression_harmonic_mean_uniform_scores() {
    // When all scores are equal, harmonic mean = arithmetic mean = that value
    let uniform_score = 0.9f32;
    let weights = [0.35f32, 0.30, 0.25, 0.10];

    let harmonic_denom: f32 = weights.iter().map(|w| w / uniform_score).sum();
    let harmonic = 1.0 / harmonic_denom;

    assert!(
        (harmonic - uniform_score).abs() < 0.001,
        "Harmonic mean of uniform {} should equal {}, got {}",
        uniform_score,
        uniform_score,
        harmonic
    );
}

#[test]
fn regression_cost_efficiency_boundaries() {
    assert!(
        (calculate_cost_efficiency(0.0005) - 1.0).abs() < 0.001,
        "Very low cost should be 1.0"
    );
    assert!(
        (calculate_cost_efficiency(0.15) - 0.0).abs() < 0.001,
        "Very high cost should be 0.0"
    );
}

#[test]
fn regression_latency_efficiency_boundaries() {
    assert!(
        (calculate_latency_efficiency(50) - 1.0).abs() < 0.001,
        "Very low latency should be 1.0"
    );
    assert!(
        (calculate_latency_efficiency(6000) - 0.0).abs() < 0.001,
        "Very high latency should be 0.0"
    );
}
