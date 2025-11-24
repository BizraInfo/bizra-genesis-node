// benches/routing.rs
// Benchmark suite for Thompson Sampling routing

use bizra_genesis_node::routing::ThompsonRouter;
use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};

fn routing_benchmarks(c: &mut Criterion) {
    let mut group = c.benchmark_group("thompson_routing");

    // Route selection with varying number of routes
    for num_routes in [2, 5, 10, 20, 50].iter() {
        let routes: Vec<String> = (0..*num_routes).map(|i| format!("route-{}", i)).collect();

        group.bench_with_input(
            BenchmarkId::new("select_route", num_routes),
            &routes,
            |b, routes| {
                let mut router = ThompsonRouter::new();
                b.iter(|| router.select_route(black_box(routes)))
            },
        );
    }

    // Route selection with historical data
    group.bench_function("select_with_history", |b| {
        let mut router = ThompsonRouter::new();
        let routes: Vec<String> = (0..10).map(|i| format!("route-{}", i)).collect();

        // Populate with some history
        for i in 0..10 {
            for _ in 0..(i + 1) * 10 {
                router.update(&format!("route-{}", i), i % 3 == 0);
            }
        }

        b.iter(|| router.select_route(black_box(&routes)))
    });

    // Update operation
    group.bench_function("update_success", |b| {
        let mut router = ThompsonRouter::new();
        b.iter(|| router.update(black_box("route-a"), black_box(true)))
    });

    group.bench_function("update_failure", |b| {
        let mut router = ThompsonRouter::new();
        b.iter(|| router.update(black_box("route-a"), black_box(false)))
    });

    // Win rate query
    group.bench_function("get_win_rate", |b| {
        let mut router = ThompsonRouter::new();
        for _ in 0..100 {
            router.update("route-a", true);
        }
        for _ in 0..50 {
            router.update("route-a", false);
        }

        b.iter(|| router.get_win_rate(black_box("route-a")))
    });

    // Full routing cycle (select + update)
    group.bench_function("full_cycle", |b| {
        let mut router = ThompsonRouter::new();
        let routes: Vec<String> = vec![
            "gpt-4".to_string(),
            "claude-3".to_string(),
            "llama-3".to_string(),
        ];

        b.iter(|| {
            let selected = router.select_route(black_box(&routes));
            router.update(black_box(&selected), black_box(true));
        })
    });

    // Realistic workload: 1000 routing decisions
    group.bench_function("realistic_workload_1000", |b| {
        let routes: Vec<String> = (0..10).map(|i| format!("model-{}", i)).collect();

        b.iter(|| {
            let mut router = ThompsonRouter::new();
            for i in 0..1000 {
                let selected = router.select_route(&routes);
                router.update(&selected, i % 7 != 0); // 85.7% success rate
            }
        })
    });

    group.finish();
}

criterion_group!(benches, routing_benchmarks);
criterion_main!(benches);
