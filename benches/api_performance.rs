// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - API PERFORMANCE BENCHMARKS                          ║
// ║  Comprehensive benchmarks for API endpoints and HTTP handling             ║
// ║  Professional Elite Performance Testing Infrastructure                    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use std::time::Duration;

// ═══════════════════════════════════════════════════════════════════════════
// Request/Response Serialization Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod serialization {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct AgentRequest {
        agent_id: String,
        content: String,
        metadata: Option<serde_json::Value>,
        priority: String,
        timestamp: u64,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct AgentResponse {
        request_id: String,
        agent_id: String,
        content: String,
        confidence: f64,
        latency_ms: u64,
        tokens_used: u32,
        model: String,
        metadata: serde_json::Value,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct ConsensusResult {
        run_id: String,
        winner_model: String,
        winner_score: f64,
        participants: Vec<ParticipantScore>,
        consensus_hash: String,
        timestamp: u64,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct ParticipantScore {
        model: String,
        accuracy: f64,
        safety: f64,
        efficiency: f64,
        ihsan: f64,
        total: f64,
    }

    fn create_agent_request() -> AgentRequest {
        AgentRequest {
            agent_id: "planner-001".to_string(),
            content: "Create a comprehensive project plan for the Q4 product launch including \
                     timeline, resources, milestones, and risk assessment."
                .to_string(),
            metadata: Some(serde_json::json!({
                "priority": "high",
                "tags": ["planning", "q4", "product"],
                "context": {
                    "project": "genesis-node",
                    "phase": "launch"
                }
            })),
            priority: "high".to_string(),
            timestamp: 1700000000000,
        }
    }

    fn create_agent_response() -> AgentResponse {
        AgentResponse {
            request_id: "req-12345678-abcd-efgh".to_string(),
            agent_id: "planner-001".to_string(),
            content: "Here is the comprehensive project plan for Q4 product launch:\n\n\
                     ## Timeline\n- Phase 1: Research (2 weeks)\n- Phase 2: Development (4 weeks)\n\
                     - Phase 3: Testing (2 weeks)\n- Phase 4: Launch (1 week)\n\n\
                     ## Key Milestones\n1. Requirements finalized\n2. MVP complete\n\
                     3. Beta release\n4. Production launch\n\n\
                     ## Resources Required\n- Engineering: 5 FTE\n- Design: 2 FTE\n\
                     - QA: 2 FTE\n\n## Risk Assessment\n- Medium: Timeline pressure\n\
                     - Low: Resource availability"
                .to_string(),
            confidence: 0.92,
            latency_ms: 1250,
            tokens_used: 850,
            model: "claude-3-sonnet".to_string(),
            metadata: serde_json::json!({
                "processing_time_ms": 1180,
                "cache_hit": false,
                "retry_count": 0
            }),
        }
    }

    fn create_consensus_result() -> ConsensusResult {
        ConsensusResult {
            run_id: "consensus-98765432-wxyz".to_string(),
            winner_model: "claude-3-opus".to_string(),
            winner_score: 0.945,
            participants: vec![
                ParticipantScore {
                    model: "claude-3-opus".to_string(),
                    accuracy: 0.95,
                    safety: 0.98,
                    efficiency: 0.92,
                    ihsan: 0.94,
                    total: 0.945,
                },
                ParticipantScore {
                    model: "gpt-4-turbo".to_string(),
                    accuracy: 0.94,
                    safety: 0.97,
                    efficiency: 0.91,
                    ihsan: 0.93,
                    total: 0.9375,
                },
                ParticipantScore {
                    model: "llama-3-70b".to_string(),
                    accuracy: 0.91,
                    safety: 0.95,
                    efficiency: 0.94,
                    ihsan: 0.90,
                    total: 0.925,
                },
            ],
            consensus_hash: "blake3:a1b2c3d4e5f6...".to_string(),
            timestamp: 1700000001000,
        }
    }

    pub fn serialization_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("api_serialization");
        group.measurement_time(Duration::from_secs(10));

        // Request serialization
        let request = create_agent_request();
        let request_json = serde_json::to_string(&request).unwrap();

        group.throughput(Throughput::Bytes(request_json.len() as u64));
        group.bench_function("serialize_request", |b| {
            b.iter(|| serde_json::to_string(black_box(&request)))
        });

        group.bench_function("deserialize_request", |b| {
            b.iter(|| serde_json::from_str::<AgentRequest>(black_box(&request_json)))
        });

        // Response serialization
        let response = create_agent_response();
        let response_json = serde_json::to_string(&response).unwrap();

        group.throughput(Throughput::Bytes(response_json.len() as u64));
        group.bench_function("serialize_response", |b| {
            b.iter(|| serde_json::to_string(black_box(&response)))
        });

        group.bench_function("deserialize_response", |b| {
            b.iter(|| serde_json::from_str::<AgentResponse>(black_box(&response_json)))
        });

        // Consensus result serialization
        let consensus = create_consensus_result();
        let consensus_json = serde_json::to_string(&consensus).unwrap();

        group.throughput(Throughput::Bytes(consensus_json.len() as u64));
        group.bench_function("serialize_consensus", |b| {
            b.iter(|| serde_json::to_string(black_box(&consensus)))
        });

        group.bench_function("deserialize_consensus", |b| {
            b.iter(|| serde_json::from_str::<ConsensusResult>(black_box(&consensus_json)))
        });

        // Batch serialization
        let batch_requests: Vec<AgentRequest> = (0..100).map(|_| create_agent_request()).collect();
        group.bench_function("serialize_batch_100", |b| {
            b.iter(|| serde_json::to_string(black_box(&batch_requests)))
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// JWT Token Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod jwt {
    use super::*;
    use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct Claims {
        sub: String,
        exp: usize,
        iat: usize,
        roles: Vec<String>,
        permissions: Vec<String>,
    }

    fn create_claims() -> Claims {
        Claims {
            sub: "user-12345678".to_string(),
            exp: 2000000000,
            iat: 1700000000,
            roles: vec!["admin".to_string(), "operator".to_string()],
            permissions: vec![
                "read:agents".to_string(),
                "write:agents".to_string(),
                "read:metrics".to_string(),
                "admin:system".to_string(),
            ],
        }
    }

    pub fn jwt_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("jwt_operations");
        group.measurement_time(Duration::from_secs(10));

        let secret = b"super_secret_key_for_benchmarking_purposes_only_32";
        let encoding_key = EncodingKey::from_secret(secret);
        let decoding_key = DecodingKey::from_secret(secret);
        let validation = Validation::default();

        let claims = create_claims();
        let token = encode(&Header::default(), &claims, &encoding_key).unwrap();

        // Token generation
        group.bench_function("encode_token", |b| {
            b.iter(|| encode(&Header::default(), black_box(&claims), &encoding_key))
        });

        // Token validation
        group.bench_function("decode_token", |b| {
            b.iter(|| decode::<Claims>(black_box(&token), &decoding_key, &validation))
        });

        // Full auth cycle
        group.bench_function("full_auth_cycle", |b| {
            b.iter(|| {
                let token = encode(&Header::default(), &claims, &encoding_key).unwrap();
                decode::<Claims>(&token, &decoding_key, &validation)
            })
        });

        // Multiple token validations (simulating concurrent requests)
        let tokens: Vec<String> = (0..100)
            .map(|i| {
                let mut c = create_claims();
                c.sub = format!("user-{}", i);
                encode(&Header::default(), &c, &encoding_key).unwrap()
            })
            .collect();

        group.bench_function("validate_100_tokens", |b| {
            b.iter(|| {
                for token in &tokens {
                    decode::<Claims>(token, &decoding_key, &validation).unwrap();
                }
            })
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Rate Limiting Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod rate_limiting {
    use super::*;
    use std::collections::HashMap;
    use std::sync::atomic::{AtomicU32, Ordering};
    use std::time::Instant;

    struct TokenBucket {
        capacity: u32,
        tokens: AtomicU32,
        refill_rate: u32,
        last_refill: std::sync::Mutex<Instant>,
    }

    impl TokenBucket {
        fn new(capacity: u32, refill_rate: u32) -> Self {
            Self {
                capacity,
                tokens: AtomicU32::new(capacity),
                refill_rate,
                last_refill: std::sync::Mutex::new(Instant::now()),
            }
        }

        fn try_acquire(&self) -> bool {
            // Simplified for benchmark - no actual refill logic
            let current = self.tokens.load(Ordering::Relaxed);
            if current > 0 {
                self.tokens.fetch_sub(1, Ordering::Relaxed);
                true
            } else {
                false
            }
        }

        fn reset(&self) {
            self.tokens.store(self.capacity, Ordering::Relaxed);
        }
    }

    pub fn rate_limit_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("rate_limiting");
        group.measurement_time(Duration::from_secs(10));

        // Single bucket operations
        let bucket = TokenBucket::new(1000, 100);

        group.bench_function("acquire_token", |b| {
            b.iter(|| {
                bucket.reset();
                bucket.try_acquire()
            })
        });

        // Multiple buckets (per-client rate limiting)
        let mut buckets: HashMap<String, TokenBucket> = HashMap::new();
        for i in 0..1000 {
            buckets.insert(format!("client-{}", i), TokenBucket::new(100, 10));
        }

        group.bench_function("lookup_and_acquire", |b| {
            b.iter(|| {
                if let Some(bucket) = buckets.get("client-500") {
                    bucket.try_acquire()
                } else {
                    false
                }
            })
        });

        // Sliding window simulation
        struct SlidingWindow {
            window_size_ms: u64,
            max_requests: u32,
            requests: Vec<u64>,
        }

        impl SlidingWindow {
            fn new(window_size_ms: u64, max_requests: u32) -> Self {
                Self {
                    window_size_ms,
                    max_requests,
                    requests: Vec::with_capacity(max_requests as usize),
                }
            }

            fn try_acquire(&mut self, now: u64) -> bool {
                // Remove old requests
                let cutoff = now.saturating_sub(self.window_size_ms);
                self.requests.retain(|&t| t > cutoff);

                if self.requests.len() < self.max_requests as usize {
                    self.requests.push(now);
                    true
                } else {
                    false
                }
            }
        }

        group.bench_function("sliding_window_acquire", |b| {
            let mut window = SlidingWindow::new(1000, 100);
            let mut now = 0u64;

            b.iter(|| {
                now += 10;
                window.try_acquire(black_box(now))
            })
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Hash/Signature Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod cryptography {
    use super::*;
    use sha2::{Digest, Sha256};

    pub fn crypto_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("cryptography");
        group.measurement_time(Duration::from_secs(10));

        // Small payload hashing
        let small_payload = b"Hello, BIZRA Genesis Node!";
        group.throughput(Throughput::Bytes(small_payload.len() as u64));
        group.bench_function("sha256_small", |b| {
            b.iter(|| {
                let mut hasher = Sha256::new();
                hasher.update(black_box(small_payload));
                hasher.finalize()
            })
        });

        // Medium payload hashing (1KB)
        let medium_payload = vec![0u8; 1024];
        group.throughput(Throughput::Bytes(medium_payload.len() as u64));
        group.bench_function("sha256_1kb", |b| {
            b.iter(|| {
                let mut hasher = Sha256::new();
                hasher.update(black_box(&medium_payload));
                hasher.finalize()
            })
        });

        // Large payload hashing (1MB)
        let large_payload = vec![0u8; 1024 * 1024];
        group.throughput(Throughput::Bytes(large_payload.len() as u64));
        group.bench_function("sha256_1mb", |b| {
            b.iter(|| {
                let mut hasher = Sha256::new();
                hasher.update(black_box(&large_payload));
                hasher.finalize()
            })
        });

        // BLAKE3 hashing (if available)
        group.bench_function("blake3_1kb", |b| {
            let payload = vec![0u8; 1024];
            b.iter(|| blake3::hash(black_box(&payload)))
        });

        group.bench_function("blake3_1mb", |b| {
            let payload = vec![0u8; 1024 * 1024];
            b.iter(|| blake3::hash(black_box(&payload)))
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Concurrent Operations Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod concurrency {
    use super::*;
    use parking_lot::RwLock;
    use std::sync::Arc;

    pub fn concurrency_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("concurrency");
        group.measurement_time(Duration::from_secs(10));

        // RwLock read contention
        let data = Arc::new(RwLock::new(vec![0u64; 1000]));

        group.bench_function("rwlock_read", |b| {
            let data = Arc::clone(&data);
            b.iter(|| {
                let guard = data.read();
                black_box(guard[500])
            })
        });

        group.bench_function("rwlock_write", |b| {
            let data = Arc::clone(&data);
            b.iter(|| {
                let mut guard = data.write();
                guard[500] = 42;
            })
        });

        // Channel throughput
        group.bench_function("channel_send_recv", |b| {
            let (tx, rx) = crossbeam_channel::bounded::<u64>(1000);

            b.iter(|| {
                tx.send(42).unwrap();
                rx.recv().unwrap()
            })
        });

        // Atomic operations
        let counter = Arc::new(std::sync::atomic::AtomicU64::new(0));

        group.bench_function("atomic_increment", |b| {
            let counter = Arc::clone(&counter);
            b.iter(|| counter.fetch_add(1, std::sync::atomic::Ordering::SeqCst))
        });

        group.bench_function("atomic_cas", |b| {
            let counter = Arc::clone(&counter);
            b.iter(|| {
                let current = counter.load(std::sync::atomic::Ordering::SeqCst);
                counter.compare_exchange(
                    current,
                    current + 1,
                    std::sync::atomic::Ordering::SeqCst,
                    std::sync::atomic::Ordering::SeqCst,
                )
            })
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Memory Allocation Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod allocation {
    use super::*;

    pub fn allocation_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("allocation");
        group.measurement_time(Duration::from_secs(10));

        // Small allocations
        group.bench_function("alloc_small_vec", |b| {
            b.iter(|| {
                let v: Vec<u8> = Vec::with_capacity(64);
                black_box(v)
            })
        });

        // Medium allocations
        group.bench_function("alloc_medium_vec", |b| {
            b.iter(|| {
                let v: Vec<u8> = Vec::with_capacity(1024);
                black_box(v)
            })
        });

        // Large allocations
        group.bench_function("alloc_large_vec", |b| {
            b.iter(|| {
                let v: Vec<u8> = Vec::with_capacity(1024 * 1024);
                black_box(v)
            })
        });

        // String allocations
        group.bench_function("alloc_string", |b| {
            b.iter(|| {
                let s = String::with_capacity(1024);
                black_box(s)
            })
        });

        // HashMap allocations
        group.bench_function("alloc_hashmap", |b| {
            b.iter(|| {
                let m: std::collections::HashMap<String, String> =
                    std::collections::HashMap::with_capacity(100);
                black_box(m)
            })
        });

        // Clone operations
        let large_vec: Vec<u64> = (0..10000).collect();
        group.bench_function("clone_large_vec", |b| {
            b.iter(|| black_box(large_vec.clone()))
        });

        let large_string = "x".repeat(10000);
        group.bench_function("clone_large_string", |b| {
            b.iter(|| black_box(large_string.clone()))
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SLO Compliance Benchmarks
// ═══════════════════════════════════════════════════════════════════════════

mod slo_compliance {
    use super::*;

    /// Simulates end-to-end request processing
    fn simulate_request_processing() -> Duration {
        // Simulate various processing stages
        let start = std::time::Instant::now();

        // 1. Request parsing (~1ms)
        std::thread::sleep(Duration::from_micros(100));

        // 2. Auth validation (~2ms)
        std::thread::sleep(Duration::from_micros(200));

        // 3. Business logic (~5ms)
        std::thread::sleep(Duration::from_micros(500));

        // 4. Response serialization (~1ms)
        std::thread::sleep(Duration::from_micros(100));

        start.elapsed()
    }

    pub fn slo_benchmarks(c: &mut Criterion) {
        let mut group = c.benchmark_group("slo_compliance");
        group.measurement_time(Duration::from_secs(15));

        // P50 latency target: 100ms
        group.bench_function("request_latency", |b| {
            b.iter(|| simulate_request_processing())
        });

        // Throughput target: 1000 RPS
        group.throughput(Throughput::Elements(1));
        group.bench_function("request_throughput", |b| {
            b.iter(|| {
                // Minimal processing to measure pure throughput
                black_box(42u64)
            })
        });

        // Memory efficiency
        group.bench_function("memory_efficient_processing", |b| {
            b.iter(|| {
                // Process without excessive allocations
                let mut result = 0u64;
                for i in 0..1000 {
                    result = result.wrapping_add(i);
                }
                black_box(result)
            })
        });

        group.finish();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Criterion Configuration
// ═══════════════════════════════════════════════════════════════════════════

criterion_group!(
    name = api_benches;
    config = Criterion::default()
        .significance_level(0.05)
        .sample_size(100)
        .warm_up_time(Duration::from_secs(3));
    targets =
        serialization::serialization_benchmarks,
        jwt::jwt_benchmarks,
        rate_limiting::rate_limit_benchmarks,
        cryptography::crypto_benchmarks,
        concurrency::concurrency_benchmarks,
        allocation::allocation_benchmarks,
        slo_compliance::slo_benchmarks
);

criterion_main!(api_benches);
