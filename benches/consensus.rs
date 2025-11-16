// benches/consensus.rs
// Benchmark suite for Weighted-Score Consensus

use bizra_genesis_node::{
    Candidate, CandidateScores, ConsensusConfig, ScoredCandidate, WeightedScoreConsensus,
};
use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use serde_json::json;

fn create_scored_candidate(
    model: &str,
    accuracy: f32,
    safety: f32,
    efficiency: f32,
    ihsan: f32,
) -> ScoredCandidate {
    ScoredCandidate {
        candidate: Candidate {
            model: model.to_string(),
            json: json!({"result": "test"}),
            scores: CandidateScores {
                accuracy,
                safety,
                efficiency,
                ihsan,
            },
            cost_usd: 0.01,
            latency_ms: 1000,
        },
        scores: CandidateScores {
            accuracy,
            safety,
            efficiency,
            ihsan,
        },
    }
}

fn consensus_benchmarks(c: &mut Criterion) {
    let mut group = c.benchmark_group("consensus");

    // Consensus with varying number of candidates
    for num_candidates in [2, 5, 10, 20, 50, 100].iter() {
        let candidates: Vec<ScoredCandidate> = (0..*num_candidates)
            .map(|i| {
                let quality = 0.8 + (i as f32 * 0.002);
                create_scored_candidate(
                    &format!("model-{}", i),
                    quality,
                    quality + 0.05,
                    quality - 0.05,
                    quality,
                )
            })
            .collect();

        group.bench_with_input(
            BenchmarkId::new("select_winner", num_candidates),
            &candidates,
            |b, candidates| {
                let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());
                b.iter(|| consensus.select_winner(black_box(candidates)))
            },
        );
    }

    // Consensus with all candidates above Ihsan floor
    group.bench_function("all_above_floor", |b| {
        let candidates = vec![
            create_scored_candidate("gpt-4", 0.95, 0.98, 0.85, 0.92),
            create_scored_candidate("claude-3", 0.93, 0.96, 0.88, 0.91),
            create_scored_candidate("llama-3", 0.90, 0.95, 0.90, 0.89),
        ];
        let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());

        b.iter(|| consensus.select_winner(black_box(&candidates)))
    });

    // Consensus with fallback scenario (all below floor)
    group.bench_function("fallback_scenario", |b| {
        let candidates = vec![
            create_scored_candidate("model-a", 0.82, 0.85, 0.80, 0.80),
            create_scored_candidate("model-b", 0.81, 0.84, 0.79, 0.78),
            create_scored_candidate("model-c", 0.83, 0.86, 0.81, 0.82),
        ];
        let consensus = WeightedScoreConsensus::new(ConsensusConfig { ihsan_floor: 0.90 });

        b.iter(|| consensus.select_winner(black_box(&candidates)))
    });

    // Consensus with tight race (very similar scores)
    group.bench_function("tight_race", |b| {
        let candidates = vec![
            create_scored_candidate("model-a", 0.900, 0.905, 0.895, 0.900),
            create_scored_candidate("model-b", 0.901, 0.904, 0.896, 0.901),
            create_scored_candidate("model-c", 0.899, 0.906, 0.894, 0.899),
        ];
        let consensus = WeightedScoreConsensus::new(ConsensusConfig::default());

        b.iter(|| consensus.select_winner(black_box(&candidates)))
    });

    // Consensus with varying Ihsan floor thresholds
    for ihsan_floor in [0.75, 0.80, 0.85, 0.90, 0.95].iter() {
        group.bench_with_input(
            BenchmarkId::new("varying_floor", ihsan_floor),
            ihsan_floor,
            |b, &floor| {
                let candidates = vec![
                    create_scored_candidate("model-a", 0.90, 0.95, 0.85, 0.88),
                    create_scored_candidate("model-b", 0.92, 0.96, 0.87, 0.90),
                    create_scored_candidate("model-c", 0.88, 0.93, 0.83, 0.86),
                ];
                let consensus = WeightedScoreConsensus::new(ConsensusConfig { ihsan_floor: floor });

                b.iter(|| consensus.select_winner(black_box(&candidates)))
            },
        );
    }

    // Realistic workload: End-to-end consensus
    group.bench_function("realistic_workload", |b| {
        let candidates = vec![
            create_scored_candidate("gpt-4-turbo", 0.95, 0.98, 0.85, 0.92),
            create_scored_candidate("claude-3-opus", 0.94, 0.97, 0.87, 0.91),
            create_scored_candidate("claude-3-sonnet", 0.92, 0.96, 0.90, 0.90),
            create_scored_candidate("gpt-4", 0.93, 0.97, 0.84, 0.91),
            create_scored_candidate("llama-3-70b", 0.89, 0.94, 0.92, 0.88),
            create_scored_candidate("llama-3-8b", 0.85, 0.90, 0.95, 0.85),
        ];
        let consensus = WeightedScoreConsensus::new(ConsensusConfig { ihsan_floor: 0.85 });

        b.iter(|| consensus.select_winner(black_box(&candidates)))
    });

    group.finish();
}

criterion_group!(benches, consensus_benchmarks);
criterion_main!(benches);
