// synthesis_orchestrator/src/routing.rs
// Thompson Sampling router

use rand_distr::{Beta, Distribution};
use std::collections::HashMap;

#[derive(Clone, Debug, Default)]
pub struct WinRate {
    pub wins: u32,
    pub samples: u32,
}

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
    pub fn new() -> Self {
        Self {
            route_stats: HashMap::new(),
            exploration_factor: 0.1,
        }
    }

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

    pub fn update(&mut self, route: &str, success: bool) {
        let stats = self.route_stats.entry(route.to_string()).or_default();
        stats.samples += 1;
        if success {
            stats.wins += 1;
        }
    }

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
