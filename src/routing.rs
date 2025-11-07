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
