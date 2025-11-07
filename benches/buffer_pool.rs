// benches/buffer_pool.rs
// Benchmark suite for BufferPool zero-copy operations

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use synthesis_orchestrator::performance::BufferPool;
use tokio::runtime::Runtime;

fn buffer_pool_benchmarks(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let mut group = c.benchmark_group("buffer_pool");

    // Acquire/Release cycle
    group.bench_function("acquire_release_4kb", |b| {
        let pool = BufferPool::new(10, 4096);
        b.to_async(&rt).iter(|| async {
            let buffer = pool.acquire().await;
            pool.release(black_box(buffer)).await;
        });
    });

    group.bench_function("acquire_release_64kb", |b| {
        let pool = BufferPool::new(10, 65536);
        b.to_async(&rt).iter(|| async {
            let buffer = pool.acquire().await;
            pool.release(black_box(buffer)).await;
        });
    });

    // Concurrent access patterns
    for num_tasks in [1, 4, 8, 16].iter() {
        group.bench_with_input(
            BenchmarkId::new("concurrent_access", num_tasks),
            num_tasks,
            |b, &num_tasks| {
                let pool = std::sync::Arc::new(BufferPool::new(10, 4096));
                b.to_async(&rt).iter(|| {
                    let pool = std::sync::Arc::clone(&pool);
                    async move {
                        let mut handles = vec![];
                        for _ in 0..num_tasks {
                            let pool_clone = std::sync::Arc::clone(&pool);
                            let handle = tokio::spawn(async move {
                                let buffer = pool_clone.acquire().await;
                                pool_clone.release(black_box(buffer)).await;
                            });
                            handles.push(handle);
                        }
                        for handle in handles {
                            handle.await.unwrap();
                        }
                    }
                });
            },
        );
    }

    // Buffer reuse patterns
    group.bench_function("sequential_reuse_10x", |b| {
        let pool = BufferPool::new(1, 4096);
        b.to_async(&rt).iter(|| async {
            for _ in 0..10 {
                let buffer = pool.acquire().await;
                pool.release(black_box(buffer)).await;
            }
        });
    });

    // Pool initialization overhead
    for initial_size in [0, 10, 50, 100].iter() {
        group.bench_with_input(
            BenchmarkId::new("initialization", initial_size),
            initial_size,
            |b, &size| {
                b.iter(|| BufferPool::new(black_box(size), 4096));
            },
        );
    }

    group.finish();
}

criterion_group!(benches, buffer_pool_benchmarks);
criterion_main!(benches);
