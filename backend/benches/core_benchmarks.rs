//! BIZRA Node0 - Core Infrastructure Benchmarks
//!
//! Performance benchmarks for critical path components.

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use std::time::Duration;

// Note: In a real benchmark, these would be the actual imports
// For now, we define minimal mock structures to demonstrate benchmark patterns

/// Mock circuit breaker for benchmarking
struct CircuitBreaker {
    state: u8,
}

impl CircuitBreaker {
    fn new() -> Self {
        Self { state: 0 }
    }

    fn check_permission(&self) -> bool {
        self.state == 0
    }

    fn record_success(&mut self) {
        self.state = 0;
    }

    fn record_failure(&mut self) {
        self.state += 1;
    }
}

/// Mock cache for benchmarking
struct LruCache<K, V> {
    data: std::collections::HashMap<K, V>,
    capacity: usize,
}

impl<K: std::hash::Hash + Eq + Clone, V: Clone> LruCache<K, V> {
    fn new(capacity: usize) -> Self {
        Self {
            data: std::collections::HashMap::with_capacity(capacity),
            capacity,
        }
    }

    fn get(&self, key: &K) -> Option<&V> {
        self.data.get(key)
    }

    fn put(&mut self, key: K, value: V) {
        if self.data.len() >= self.capacity {
            // Simple eviction for benchmark
            if let Some(first_key) = self.data.keys().next().cloned() {
                self.data.remove(&first_key);
            }
        }
        self.data.insert(key, value);
    }
}

/// Mock rate limiter for benchmarking
struct TokenBucket {
    tokens: u64,
    capacity: u64,
    last_refill: std::time::Instant,
    rate: f64,
}

impl TokenBucket {
    fn new(capacity: u64, rate: f64) -> Self {
        Self {
            tokens: capacity,
            capacity,
            last_refill: std::time::Instant::now(),
            rate,
        }
    }

    fn try_acquire(&mut self) -> bool {
        let now = std::time::Instant::now();
        let elapsed = now.duration_since(self.last_refill);
        let refill = (elapsed.as_secs_f64() * self.rate) as u64;
        
        self.tokens = (self.tokens + refill).min(self.capacity);
        self.last_refill = now;

        if self.tokens > 0 {
            self.tokens -= 1;
            true
        } else {
            false
        }
    }
}

// ============================================
// CIRCUIT BREAKER BENCHMARKS
// ============================================

fn bench_circuit_breaker_check(c: &mut Criterion) {
    let mut group = c.benchmark_group("circuit_breaker");
    
    let cb = CircuitBreaker::new();
    
    group.bench_function("check_permission", |b| {
        b.iter(|| {
            black_box(cb.check_permission())
        })
    });

    group.finish();
}

fn bench_circuit_breaker_state_transitions(c: &mut Criterion) {
    let mut group = c.benchmark_group("circuit_breaker_transitions");
    
    group.bench_function("success_recording", |b| {
        let mut cb = CircuitBreaker::new();
        b.iter(|| {
            cb.record_success();
            black_box(&cb)
        })
    });

    group.bench_function("failure_recording", |b| {
        let mut cb = CircuitBreaker::new();
        b.iter(|| {
            cb.record_failure();
            black_box(&cb)
        })
    });

    group.finish();
}

// ============================================
// CACHE BENCHMARKS
// ============================================

fn bench_cache_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("lru_cache");
    
    for size in [100, 1000, 10000].iter() {
        group.bench_with_input(
            BenchmarkId::new("get_existing", size),
            size,
            |b, &size| {
                let mut cache: LruCache<u64, String> = LruCache::new(size);
                // Pre-fill cache inside the closure
                for i in 0..size as u64 {
                    cache.put(i, format!("value_{}", i));
                }
                let key = size as u64 / 2;
                b.iter(|| {
                    black_box(cache.get(&key))
                })
            },
        );

        group.bench_with_input(
            BenchmarkId::new("get_missing", size),
            size,
            |b, &size| {
                let mut cache: LruCache<u64, String> = LruCache::new(size);
                // Pre-fill cache inside the closure
                for i in 0..size as u64 {
                    cache.put(i, format!("value_{}", i));
                }
                let key = size as u64 * 2;
                b.iter(|| {
                    black_box(cache.get(&key))
                })
            },
        );
    }

    group.finish();
}

fn bench_cache_put(c: &mut Criterion) {
    let mut group = c.benchmark_group("lru_cache_put");
    
    for size in [100, 1000, 10000].iter() {
        group.bench_with_input(
            BenchmarkId::new("put", size),
            size,
            |b, &size| {
                let mut cache: LruCache<u64, String> = LruCache::new(size);
                let mut i = 0u64;
                b.iter(|| {
                    cache.put(i, format!("value_{}", i));
                    i += 1;
                    black_box(&cache)
                })
            },
        );
    }

    group.finish();
}

fn bench_cache_eviction(c: &mut Criterion) {
    let mut group = c.benchmark_group("lru_cache_eviction");
    
    group.bench_function("put_with_eviction", |b| {
        let mut cache: LruCache<u64, String> = LruCache::new(1000);
        
        // Fill to capacity
        for i in 0..1000 {
            cache.put(i, format!("value_{}", i));
        }
        
        let mut i = 1000u64;
        b.iter(|| {
            cache.put(i, format!("value_{}", i));
            i += 1;
            black_box(&cache)
        })
    });

    group.finish();
}

// ============================================
// RATE LIMITER BENCHMARKS
// ============================================

fn bench_rate_limiter(c: &mut Criterion) {
    let mut group = c.benchmark_group("rate_limiter");
    
    group.bench_function("token_bucket_acquire", |b| {
        let mut limiter = TokenBucket::new(1000, 100.0);
        b.iter(|| {
            black_box(limiter.try_acquire())
        })
    });

    group.bench_function("token_bucket_exhausted", |b| {
        let mut limiter = TokenBucket::new(10, 0.0); // No refill
        // Exhaust tokens
        for _ in 0..10 {
            limiter.try_acquire();
        }
        b.iter(|| {
            black_box(limiter.try_acquire())
        })
    });

    group.finish();
}

// ============================================
// COMBINED THROUGHPUT BENCHMARKS
// ============================================

fn bench_request_pipeline(c: &mut Criterion) {
    let mut group = c.benchmark_group("request_pipeline");
    group.throughput(criterion::Throughput::Elements(1));

    group.bench_function("full_pipeline", |b| {
        let cb = CircuitBreaker::new();
        let mut limiter = TokenBucket::new(10000, 1000.0);
        let mut cache: LruCache<u64, String> = LruCache::new(1000);
        
        // Pre-fill cache
        for i in 0..500 {
            cache.put(i, format!("value_{}", i));
        }

        let mut request_id = 0u64;
        b.iter(|| {
            // Simulate request pipeline
            if cb.check_permission() && limiter.try_acquire() {
                let key = request_id % 1000;
                let result = cache.get(&key);
                if result.is_none() {
                    cache.put(key, format!("value_{}", key));
                }
            }
            request_id += 1;
            black_box(request_id)
        })
    });

    group.finish();
}

fn bench_concurrent_access(c: &mut Criterion) {
    // Note: This would require tokio runtime in real benchmarks
    let mut group = c.benchmark_group("concurrent");
    group.measurement_time(Duration::from_secs(10));

    group.bench_function("cache_read_write_mix", |b| {
        let mut cache: LruCache<u64, String> = LruCache::new(1000);
        
        // Pre-fill
        for i in 0..500 {
            cache.put(i, format!("value_{}", i));
        }

        let mut i = 0u64;
        b.iter(|| {
            // 80% reads, 20% writes
            if i % 5 == 0 {
                cache.put(i % 1000, format!("new_value_{}", i));
            } else {
                black_box(cache.get(&(i % 500)));
            }
            i += 1;
        })
    });

    group.finish();
}

// ============================================
// MEMORY BENCHMARKS
// ============================================

fn bench_memory_efficiency(c: &mut Criterion) {
    let mut group = c.benchmark_group("memory");

    group.bench_function("cache_memory_usage", |b| {
        b.iter(|| {
            let mut cache: LruCache<String, String> = LruCache::new(10000);
            for i in 0..10000 {
                cache.put(
                    format!("key_{}", i),
                    format!("value_with_some_content_{}", i),
                );
            }
            black_box(cache)
        })
    });

    group.finish();
}

// ============================================
// CRITERION GROUPS
// ============================================

criterion_group!(
    circuit_breaker_benches,
    bench_circuit_breaker_check,
    bench_circuit_breaker_state_transitions,
);

criterion_group!(
    cache_benches,
    bench_cache_operations,
    bench_cache_put,
    bench_cache_eviction,
);

criterion_group!(
    rate_limiter_benches,
    bench_rate_limiter,
);

criterion_group!(
    integration_benches,
    bench_request_pipeline,
    bench_concurrent_access,
);

criterion_group!(
    memory_benches,
    bench_memory_efficiency,
);

criterion_main!(
    circuit_breaker_benches,
    cache_benches,
    rate_limiter_benches,
    integration_benches,
    memory_benches,
);
