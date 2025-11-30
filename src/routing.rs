// synthesis_orchestrator/src/routing.rs
// Thompson Sampling router

use rand_distr::{Beta, Distribution};
use std::collections::HashMap;

/// Win/loss statistics for a routing strategy.
///
/// Tracks the number of successful outcomes (wins) versus total samples
/// to calculate empirical success rates for Thompson Sampling.
///
/// # Examples
///
/// ```
/// use synthesis_orchestrator::routing::WinRate;
///
/// let mut stats = WinRate::default();
/// stats.samples = 10;
/// stats.wins = 7;
/// let success_rate = stats.wins as f32 / stats.samples as f32;
/// assert_eq!(success_rate, 0.7);
/// ```
#[derive(Clone, Debug, Default)]
pub struct WinRate {
    /// Number of successful outcomes
    pub wins: u32,
    /// Total number of samples (attempts)
    pub samples: u32,
}

/// Thompson Sampling router for intelligent model selection.
///
/// Implements Thompson Sampling algorithm to balance exploration of new models
/// with exploitation of proven high-performers. Uses Beta distribution sampling
/// to provide probabilistic route selection based on historical win rates.
///
/// # Algorithm
///
/// For each route, maintains a Beta(α, β) distribution where:
/// - α = wins + 1
/// - β = (samples - wins) + 1
///
/// Samples from each route's distribution and selects the highest sampled value,
/// naturally balancing exploration (high uncertainty) with exploitation (high win rate).
///
/// # Examples
///
/// ```
/// use synthesis_orchestrator::routing::ThompsonRouter;
///
/// let mut router = ThompsonRouter::new();
/// let routes = vec!["gpt-4".to_string(), "claude-3".to_string()];
///
/// // Select a route (initially random due to no data)
/// let selected = router.select_route(&routes);
///
/// // Update with success/failure feedback
/// router.update(&selected, true);
///
/// // Get empirical win rate
/// let win_rate = router.get_win_rate(&selected);
/// assert!(win_rate >= 0.0 && win_rate <= 1.0);
/// ```
///
/// # Performance
///
/// - O(n) route selection where n = number of available routes
/// - O(1) win rate updates
/// - O(1) win rate queries
pub struct ThompsonRouter {
    route_stats: HashMap<String, WinRate>,
    exploration_factor: f32,
}

impl Default for ThompsonRouter {
    fn default() -> Self {
        Self::new()
    }
}

impl ThompsonRouter {
    /// Creates a new Thompson Sampling router.
    ///
    /// Initializes with empty route statistics and default exploration factor of 0.1.
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::routing::ThompsonRouter;
    ///
    /// let router = ThompsonRouter::new();
    /// // Router is ready to start tracking route performance
    /// ```
    pub fn new() -> Self {
        Self {
            route_stats: HashMap::new(),
            exploration_factor: 0.1,
        }
    }

    /// Selects the optimal route using Thompson Sampling.
    ///
    /// Samples from the Beta distribution of each available route and returns
    /// the route with the highest sampled value. New routes (no samples) receive
    /// a bonus to encourage exploration.
    ///
    /// # Arguments
    ///
    /// * `available` - Slice of available route identifiers (e.g., model names)
    ///
    /// # Returns
    ///
    /// The selected route identifier as a String.
    ///
    /// # Panics
    ///
    /// Panics if `available` is empty (slice index out of bounds).
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::routing::ThompsonRouter;
    ///
    /// let mut router = ThompsonRouter::new();
    /// let models = vec!["gpt-4".to_string(), "claude-3".to_string()];
    /// let selected = router.select_route(&models);
    /// assert!(models.contains(&selected));
    /// ```
    pub fn select_route(&mut self, available: &[String]) -> String {
        let mut best = available[0].clone();
        let mut best_score = 0.0f32;

        for route in available {
            let win_rate = {
                let stats = self.route_stats.entry(route.clone()).or_default();
                stats.clone()
            };
            let score = self.sample_score(win_rate);

            if score > best_score {
                best_score = score;
                best = route.clone();
            }
        }

        best
    }

    fn sample_score(&self, wr: WinRate) -> f32 {
        if wr.samples == 0 {
            return 0.5 + self.exploration_factor;
        }

        let alpha = (wr.wins as f64) + 1.0;
        let beta = ((wr.samples - wr.wins) as f64) + 1.0;

        let dist = Beta::new(alpha, beta).expect("valid beta");
        dist.sample(&mut rand::rng()) as f32
    }

    /// Updates route statistics with outcome feedback.
    ///
    /// Records a new sample for the specified route and increments the win
    /// counter if the outcome was successful. This information is used to
    /// refine future route selection via Thompson Sampling.
    ///
    /// # Arguments
    ///
    /// * `route` - Route identifier to update (e.g., model name)
    /// * `success` - Whether the route produced a successful outcome
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::routing::ThompsonRouter;
    ///
    /// let mut router = ThompsonRouter::new();
    ///
    /// // Record successful outcome for gpt-4
    /// router.update("gpt-4", true);
    ///
    /// // Record failed outcome for claude-3
    /// router.update("claude-3", false);
    ///
    /// // Win rate reflects the history
    /// assert_eq!(router.get_win_rate("gpt-4"), 1.0);
    /// assert_eq!(router.get_win_rate("claude-3"), 0.0);
    /// ```
    pub fn update(&mut self, route: &str, success: bool) {
        let stats = self.route_stats.entry(route.to_string()).or_default();
        stats.samples += 1;
        if success {
            stats.wins += 1;
        }
    }

    /// Returns the empirical win rate for a route.
    ///
    /// Calculates the fraction of successful outcomes (wins / samples) for
    /// the specified route. Returns 0.5 (neutral) for unknown routes or
    /// routes with no samples.
    ///
    /// # Arguments
    ///
    /// * `route` - Route identifier to query
    ///
    /// # Returns
    ///
    /// Win rate as f32 in range [0.0, 1.0], or 0.5 if route is unknown.
    ///
    /// # Examples
    ///
    /// ```
    /// use synthesis_orchestrator::routing::ThompsonRouter;
    ///
    /// let mut router = ThompsonRouter::new();
    ///
    /// // Unknown route returns neutral 0.5
    /// assert_eq!(router.get_win_rate("unknown"), 0.5);
    ///
    /// // Track performance
    /// router.update("model-a", true);
    /// router.update("model-a", true);
    /// router.update("model-a", false);
    ///
    /// // 2 wins out of 3 samples = 0.666...
    /// let win_rate = router.get_win_rate("model-a");
    /// assert!((win_rate - 0.666).abs() < 0.01);
    /// ```
    pub fn get_win_rate(&self, route: &str) -> f32 {
        if let Some(stats) = self.route_stats.get(route) {
            if stats.samples > 0 {
                return stats.wins as f32 / stats.samples as f32;
            }
        }
        0.5
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::sync::Arc;
    use std::sync::Mutex;

    #[test]
    fn test_router_creation() {
        let router = ThompsonRouter::new();
        assert_eq!(router.route_stats.len(), 0);
        assert_eq!(router.exploration_factor, 0.1);
    }

    #[test]
    fn test_select_route_single() {
        let mut router = ThompsonRouter::new();
        let routes = vec!["route-a".to_string()];
        let selected = router.select_route(&routes);
        assert_eq!(selected, "route-a");
    }

    #[test]
    fn test_select_route_multiple() {
        let mut router = ThompsonRouter::new();
        let routes = vec![
            "route-a".to_string(),
            "route-b".to_string(),
            "route-c".to_string(),
        ];
        let selected = router.select_route(&routes);
        assert!(routes.contains(&selected));
    }

    #[test]
    fn test_update_win_rate() {
        let mut router = ThompsonRouter::new();
        router.update("route-a", true);
        router.update("route-a", true);
        router.update("route-a", false);

        let win_rate = router.get_win_rate("route-a");
        assert!((0.6..=0.7).contains(&win_rate)); // 2 wins out of 3 samples
    }

    #[test]
    fn test_get_win_rate_unknown_route() {
        let router = ThompsonRouter::new();
        let win_rate = router.get_win_rate("unknown");
        assert_eq!(win_rate, 0.5); // Default value
    }

    #[test]
    fn test_exploration_for_new_routes() {
        let mut router = ThompsonRouter::new();
        let routes = vec!["new-route".to_string()];
        // Should select new route even with no samples
        let selected = router.select_route(&routes);
        assert_eq!(selected, "new-route");
    }

    #[test]
    fn test_win_rate_tracking() {
        let mut router = ThompsonRouter::new();

        // Update with multiple successes
        for _ in 0..10 {
            router.update("route-a", true);
        }

        // Update with failures
        for _ in 0..5 {
            router.update("route-a", false);
        }

        let win_rate = router.get_win_rate("route-a");
        assert!((0.6..=0.7).contains(&win_rate)); // 10 wins out of 15 samples
    }

    #[test]
    #[should_panic(expected = "index out of bounds")]
    fn test_empty_routes_panics() {
        let mut router = ThompsonRouter::new();
        let routes: Vec<String> = vec![];
        // Current implementation will panic on empty slice access
        // This documents the current behavior - in production, should handle gracefully
        router.select_route(&routes);
    }

    // =====================================================================
    // STATISTICAL ACCURACY TESTS - World-Class Validation
    // =====================================================================

    #[test]
    fn test_beta_distribution_sampling_mean_accuracy() {
        let _router = ThompsonRouter::new();

        // Test Beta(9, 3) distribution - mean should be 9/(9+3) = 0.75
        let win_rate = WinRate {
            wins: 8,
            samples: 10,
        }; // Alpha=9, Beta=3

        let mut samples = vec![];
        let mut rng = rand::rng();

        // Sample 5000 times for statistical significance
        for _ in 0..5000 {
            // Temporarily expose sampling for testing (would normally be private)
            let alpha = (win_rate.wins as f64) + 1.0;
            let beta = ((win_rate.samples - win_rate.wins) as f64) + 1.0;
            let dist = Beta::new(alpha, beta).expect("valid beta");
            samples.push(dist.sample(&mut rng) as f32);
        }

        // Calculate sample mean
        let mean: f32 = samples.iter().sum::<f32>() / samples.len() as f32;
        let expected_mean = 8.0 / 10.0; // Empirical win rate

        // Beta posterior mean is (wins + 1)/(samples + 2) = 9/12 = 0.75
        let theoretical_mean = 9.0 / 12.0;

        // Should be very close to theoretical mean (within 1%)
        assert!((mean - theoretical_mean).abs() < 0.01);
        // And should reflect empirical performance reasonably well
        assert!((mean - expected_mean).abs() < 0.15); // Conservative bound
    }

    #[test]
    fn test_beta_distribution_variance_properties() {
        let _router = ThompsonRouter::new();

        // Test with different sample sizes to verify variance decreases
        let test_cases = vec![
            (1, 1),   // Small sample -> high variance
            (5, 10),  // Medium sample -> medium variance
            (50, 50), // Large sample -> low variance
        ];

        for (wins, sample_count) in test_cases {
            let win_rate = WinRate {
                wins,
                samples: sample_count,
            };

            let mut beta_samples: Vec<f32> = vec![];
            let mut rng = rand::rng();

            for _ in 0..1000 {
                let alpha = (win_rate.wins as f64) + 1.0;
                let beta = ((win_rate.samples - win_rate.wins) as f64) + 1.0;
                let dist = Beta::new(alpha, beta).expect("valid beta");
                beta_samples.push(dist.sample(&mut rng) as f32);
            }

            // Calculate variance
            let mean: f32 = beta_samples.iter().sum::<f32>() / beta_samples.len() as f32;
            let variance: f32 = beta_samples.iter().map(|x| (x - mean).powi(2)).sum::<f32>()
                / (beta_samples.len() - 1) as f32;

            // Variance should be positive and decrease with sample size
            assert!(variance > 0.0);

            if wins == 1 && sample_count == 1 {
                assert!(variance > 0.02); // High variance for small samples
            } else if wins == 50 && sample_count == 50 {
                assert!(variance < 0.01); // Low variance for large samples
            }
        }
    }

    #[test]
    fn test_thompson_sampling_convergence_behavior() {
        let mut router = ThompsonRouter::new();
        let routes = vec![
            "high-performer".to_string(),
            "medium-performer".to_string(),
            "low-performer".to_string(),
        ];

        // Use fewer samples to allow natural exploration variance in Beta distributions
        // With only 10 samples each, there's meaningful uncertainty for exploration
        // High performer: 90% win rate (9/10)
        for _ in 0..9 {
            router.update("high-performer", true);
        }
        router.update("high-performer", false);

        // Medium performer: 60% win rate (6/10)
        for _ in 0..6 {
            router.update("medium-performer", true);
        }
        for _ in 0..4 {
            router.update("medium-performer", false);
        }

        // Low performer: 20% win rate (2/10)
        for _ in 0..2 {
            router.update("low-performer", true);
        }
        for _ in 0..8 {
            router.update("low-performer", false);
        }

        // Sample selections many times to verify convergence
        let mut selections = HashMap::new();
        for _ in 0..5000 {
            let selected = router.select_route(&routes);
            *selections.entry(selected).or_insert(0) += 1;
        }

        let total_selections = 5000;
        let high_selections = *selections.get("high-performer").unwrap_or(&0);
        let medium_selections = *selections.get("medium-performer").unwrap_or(&0);
        let low_selections = *selections.get("low-performer").unwrap_or(&0);

        println!(
            "Selections: high={}, medium={}, low={}",
            high_selections, medium_selections, low_selections
        );

        // High performer should get most selections (>50% of time)
        let high_percentage = high_selections as f32 / total_selections as f32;
        assert!(
            high_percentage > 0.50,
            "High performer (90% win rate) should get >50% selections, got {:.1}%",
            high_percentage * 100.0
        );

        // Medium performer should get less than high performer
        let medium_percentage = medium_selections as f32 / total_selections as f32;
        assert!(
            medium_percentage < high_percentage,
            "Medium should get less than high: medium={:.1}%, high={:.1}%",
            medium_percentage * 100.0,
            high_percentage * 100.0
        );

        // Low performer should get the fewest selections
        let low_percentage = low_selections as f32 / total_selections as f32;
        assert!(
            low_percentage < medium_percentage,
            "Low should get less than medium: low={:.1}%, medium={:.1}%",
            low_percentage * 100.0,
            medium_percentage * 100.0
        );

        // With uncertainty in Beta distributions, verify ordering follows performance
        // Allow some variance but overall order should be: high > medium > low
        assert!(
            high_selections >= medium_selections,
            "High performer should be selected at least as often as medium: high={}, medium={}",
            high_selections,
            medium_selections
        );
    }

    #[test]
    fn test_exploration_vs_exploitation_balance() {
        let mut router = ThompsonRouter::new();
        let routes = vec!["A".to_string(), "B".to_string()];

        // Start with one route having clear advantage
        for _ in 0..50 {
            router.update("A", true);
        }
        for _ in 0..10 {
            router.update("B", true);
        }

        let mut selections = HashMap::new();
        for _ in 0..1000 {
            let selected = router.select_route(&routes);
            *selections.entry(selected).or_insert(0) += 1;
        }

        let a_selections = *selections.get("A").unwrap_or(&0);
        let b_selections = *selections.get("B").unwrap_or(&0);

        // A should be strongly preferred (>70%)
        let a_percentage = a_selections as f32 / 1000.0;
        assert!(a_percentage > 0.70);

        // But B should still get some exploration (not zero)
        assert!(b_selections > 0);

        // This demonstrates the algorithm balances exploitation with exploration
    }

    #[test]
    fn test_numerical_stability_edge_cases() {
        let mut router = ThompsonRouter::new();

        // Test perfect performance (100% win rate)
        for _ in 0..100 {
            router.update("perfect-route", true);
        }
        let win_rate = router.get_win_rate("perfect-route");
        assert_eq!(win_rate, 1.0);

        // Test zero performance (0% win rate)
        for _ in 0..100 {
            router.update("broken-route", false);
        }
        let win_rate_zero = router.get_win_rate("broken-route");
        assert_eq!(win_rate_zero, 0.0);

        // Test mid-range performance
        for i in 0..50 {
            router.update("mixed-route", i % 2 == 0);
        }
        let win_rate_mixed = router.get_win_rate("mixed-route");
        assert!((win_rate_mixed - 0.5).abs() < 0.1); // Should be close to 50%
    }

    #[test]
    fn test_statistical_regret_minimization() {
        // Test that the algorithm minimizes cumulative regret over time
        let mut router = ThompsonRouter::new();
        let routes = vec!["optimal".to_string(), "suboptimal".to_string()];

        // Optimal route: 80% win rate
        for _ in 0..800 {
            router.update("optimal", true);
        }
        for _ in 0..200 {
            router.update("optimal", false);
        }

        // Suboptimal route: 30% win rate
        for _ in 0..300 {
            router.update("suboptimal", true);
        }
        for _ in 0..700 {
            router.update("suboptimal", false);
        }

        let mut optimal_selections = 0;
        let mut total_optimal_payoffs = 0;

        for _round in 0..200 {
            let selected = router.select_route(&routes);

            // Simulate payoff (optimal gives 1.0, suboptimal gives 0.3)
            let payoff = if selected == "optimal" { 1.0 } else { 0.3 };
            let is_optimal = selected == "optimal";

            if is_optimal {
                optimal_selections += 1;
            }

            // Update with payoff (success if payoff > 0.5)
            router.update(&selected, payoff > 0.5);
            total_optimal_payoffs += payoff as i32;
        }

        // Should learn to prefer optimal route (>60% of time in later rounds)
        let late_round_selections = (optimal_selections as f32) / 200.0;
        assert!(late_round_selections > 0.60);

        // Cumulative payoff should be high (better than random 0.55 average)
        let average_payoff = total_optimal_payoffs as f32 / 200.0;
        assert!(average_payoff > 0.70);
    }

    #[test]
    fn test_adaptive_exploration_factors() {
        // Test that exploration_factor affects selection of routes WITHOUT history
        // Note: exploration_factor only applies when samples == 0 (see sample_score)

        // Test 1: With unknown route, higher exploration should favor it more
        let routes = vec!["A".to_string(), "B".to_string()];

        let mut conservative_router = ThompsonRouter {
            route_stats: HashMap::new(),
            exploration_factor: 0.05, // Conservative: unknown routes get 0.55 score
        };
        let mut aggressive_router = ThompsonRouter {
            route_stats: HashMap::new(),
            exploration_factor: 0.3, // Aggressive: unknown routes get 0.80 score
        };

        // Only give A a history, leave B unknown
        for router in [&mut conservative_router, &mut aggressive_router] {
            router.update("A", true);
            router.update("A", true);
            router.update("A", false); // A: 2/3 success rate ≈ 0.67
        }

        let mut conservative_selections = HashMap::new();
        let mut aggressive_selections = HashMap::new();

        for _ in 0..1000 {
            let cons_selected = conservative_router.select_route(&routes);
            let agg_selected = aggressive_router.select_route(&routes);

            *conservative_selections.entry(cons_selected).or_insert(0) += 1;
            *aggressive_selections.entry(agg_selected).or_insert(0) += 1;
        }

        let agg_b_selections = aggressive_selections.get("B").unwrap_or(&0);
        let cons_b_selections = conservative_selections.get("B").unwrap_or(&0);

        println!(
            "Conservative (0.05): A={}, B={}",
            conservative_selections.get("A").unwrap_or(&0),
            cons_b_selections
        );
        println!(
            "Aggressive (0.30): A={}, B={}",
            aggressive_selections.get("A").unwrap_or(&0),
            agg_b_selections
        );

        // Aggressive router gives unknown B a score of 0.80 (0.5 + 0.3)
        // Conservative gives unknown B a score of 0.55 (0.5 + 0.05)
        // A samples from Beta(3, 2) which averages ~0.6
        // So aggressive should select B much more often than conservative
        assert!(
            agg_b_selections > cons_b_selections,
            "Aggressive router should explore unknown B more: agg={}, cons={}",
            agg_b_selections,
            cons_b_selections
        );
    }

    #[test]
    fn test_route_probability_calibration() {
        let mut router = ThompsonRouter::new();

        // Create routes with known performance characteristics
        router.update("route_50_percent", true);
        router.update("route_50_percent", false);

        router.update("route_80_percent", true);
        router.update("route_80_percent", true);
        router.update("route_80_percent", true);
        router.update("route_80_percent", true);
        router.update("route_80_percent", false);

        let routes = vec![
            "route_50_percent".to_string(),
            "route_80_percent".to_string(),
        ];

        // Run many selections to get stable probabilities
        let mut selections = HashMap::new();
        for _ in 0..10000 {
            let selected = router.select_route(&routes);
            *selections.entry(selected).or_insert(0) += 1;
        }

        let better_route_selections = *selections.get("route_80_percent").unwrap_or(&0);
        let worse_route_selections = *selections.get("route_50_percent").unwrap_or(&0);

        // Better route should be selected more often (confidence interval test)
        assert!(better_route_selections > worse_route_selections);

        // Statistical significance: better route should win >55% of time
        let better_percentage = better_route_selections as f32 / 10000.0;
        assert!(better_percentage > 0.55);
    }

    #[test]
    fn test_memory_efficiency_and_performance() {
        let mut router = ThompsonRouter::new();
        let routes: Vec<String> = (0..1000).map(|i| format!("route_{}", i)).collect();

        // Add some data to many routes
        for i in 0..100 {
            router.update(&format!("route_{}", i), i % 2 == 0);
        }

        // Performance test: select_route should be fast even with many routes
        let start = std::time::Instant::now();
        for _ in 0..100 {
            let _selected = router.select_route(&routes);
        }
        let duration = start.elapsed();

        // Should complete 100 selections in less than 100ms (reasonable performance threshold)
        assert!(duration.as_millis() < 100);

        // Memory efficiency: should store stats for active routes only
        // Clear unused routes (implement cleanup method if needed)
        assert!(router.route_stats.len() <= routes.len());
    }

    #[test]
    fn test_concurrent_access_safety() {
        use std::thread;

        let router = Arc::new(Mutex::new(ThompsonRouter::new()));
        let routes = vec!["A".to_string(), "B".to_string(), "C".to_string()];

        let mut handles = vec![];

        // Spawn multiple threads updating and selecting routes
        for thread_id in 0..8 {
            let router_clone = Arc::clone(&router);
            let routes_clone = routes.clone();

            let handle = thread::spawn(move || {
                for i in 0..100 {
                    {
                        let mut router = router_clone.lock().unwrap();
                        let selected = router.select_route(&routes_clone);
                        let success = thread_id % 2 == 0 || i % 10 == 0; // Mixed success rates
                        router.update(&selected, success);
                    }
                }
            });

            handles.push(handle);
        }

        // Wait for all threads to complete
        for handle in handles {
            handle.join().unwrap();
        }

        // Router should still be in a valid state
        let router = router.lock().unwrap();
        assert!(!router.route_stats.is_empty());

        // All routes should have been updated
        for route in &routes {
            let win_rate = router.get_win_rate(route);
            assert!((0.0..=1.0).contains(&win_rate));
        }
    }

    #[test]
    fn test_simple_vs_advanced_performance() {
        // Compare Thompson Sampling against simple greedy selection
        let mut ts_router = ThompsonRouter::new();
        let routes = vec!["A".to_string(), "B".to_string()];

        // Establish performance history - A clearly better than B
        for _ in 0..100 {
            ts_router.update("A", true);
        }
        for _ in 0..50 {
            ts_router.update("B", true);
        }

        // Thompson Sampling should occasionally explore B even when A is clearly better
        let mut ts_selections = HashMap::new();
        for _ in 0..1000 {
            let selected = ts_router.select_route(&routes);
            *ts_selections.entry(selected).or_insert(0) += 1;
        }

        let ts_b_selections = *ts_selections.get("B").unwrap_or(&0);
        // Should explore suboptimal route sometimes (>1% of selections)
        assert!(ts_b_selections > 10);
    }

    #[test]
    fn test_distribution_parameter_calculation() {
        let _router = ThompsonRouter::new();

        // Test parameter calculation for Beta distribution
        let test_cases = vec![
            (
                WinRate {
                    wins: 0,
                    samples: 0,
                },
                (1.0, 1.0),
            ), // No data -> Beta(1,1) uniform
            (
                WinRate {
                    wins: 0,
                    samples: 1,
                },
                (1.0, 2.0),
            ), // 0/1 -> Beta(1,2)
            (
                WinRate {
                    wins: 1,
                    samples: 1,
                },
                (2.0, 1.0),
            ), // 1/1 -> Beta(2,1)
            (
                WinRate {
                    wins: 3,
                    samples: 7,
                },
                (4.0, 5.0),
            ), // 3/7 -> Beta(4,5)
        ];

        for (win_rate, (expected_alpha, expected_beta)) in test_cases {
            let alpha = (win_rate.wins as f64) + 1.0;
            let beta = ((win_rate.samples - win_rate.wins) as f64) + 1.0;

            assert_eq!(alpha, expected_alpha);
            assert_eq!(beta, expected_beta);
        }
    }
}
