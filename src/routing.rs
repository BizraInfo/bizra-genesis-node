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
        dist.sample(&mut rand::thread_rng()) as f32
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
}
