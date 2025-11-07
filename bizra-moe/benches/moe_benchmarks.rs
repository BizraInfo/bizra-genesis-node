// Performance benchmarks for bizra-moe Multi-Model Ensemble
// Run with: cargo bench --package bizra-moe

use bizra_moe::*;
use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use std::time::Duration;

/// Check if Ollama is available for real benchmarks
async fn is_ollama_available() -> bool {
    let client = reqwest::Client::new();
    match client
        .get("http://localhost:11434/api/tags")
        .timeout(Duration::from_secs(2))
        .send()
        .await
    {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

/// Get available models for benchmarking
async fn get_benchmark_models() -> Vec<String> {
    let client = reqwest::Client::new();
    match client.get("http://localhost:11434/api/tags").send().await {
        Ok(response) => {
            if let Ok(json) = response.json::<serde_json::Value>().await {
                if let Some(models) = json["models"].as_array() {
                    return models
                        .iter()
                        .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
                        .take(3) // Benchmark with up to 3 models
                        .collect();
                }
            }
            vec![]
        }
        Err(_) => vec![],
    }
}

/// Benchmark harmonic synthesis with simulated responses
fn bench_harmonic_synthesis(c: &mut Criterion) {
    let mut group = c.benchmark_group("harmonic_synthesis");

    // Test with different numbers of model responses
    for num_models in [2, 3, 5].iter() {
        group.throughput(Throughput::Elements(*num_models as u64));

        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{}_models", num_models)),
            num_models,
            |b, &num_models| {
                let synthesizer = HarmonicSynthesizer::new(0.85);

                // Create simulated model responses
                let responses: Vec<ModelResponse> = (0..num_models)
                    .map(|i| ModelResponse {
                        model: format!("model_{}", i),
                        text: format!("Response from model {}", i),
                        confidence: 0.75 + (i as f32 * 0.05),
                        latency_ms: 500 + (i as u64 * 50),
                        tokens_generated: 10,
                        timestamp: std::time::SystemTime::now(),
                    })
                    .collect();

                b.iter(|| {
                    let _ = synthesizer.synthesize(responses.clone());
                });
            },
        );
    }

    group.finish();
}

/// Benchmark health monitoring operations
fn bench_health_monitoring(c: &mut Criterion) {
    let mut group = c.benchmark_group("health_monitoring");

    group.bench_function("record_success", |b| {
        let mut health = ModelHealth::new("test-model".to_string());

        b.iter(|| {
            health.record_success(500);
        });
    });

    group.bench_function("record_failure", |b| {
        let mut health = ModelHealth::new("test-model".to_string());

        b.iter(|| {
            health.record_failure();
        });
    });

    group.bench_function("is_healthy_check", |b| {
        let health = ModelHealth::new("test-model".to_string());

        b.iter(|| {
            let _ = health.is_healthy();
        });
    });

    group.finish();
}

/// Benchmark quality scoring algorithm
fn bench_quality_scoring(c: &mut Criterion) {
    let mut group = c.benchmark_group("quality_scoring");

    for num_models in [2, 3, 5].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{}_models", num_models)),
            num_models,
            |b, &num_models| {
                let synthesizer = HarmonicSynthesizer::new(0.85);

                let responses: Vec<ModelResponse> = (0..num_models)
                    .map(|i| ModelResponse {
                        model: format!("model_{}", i),
                        text: format!("Response from model {}", i),
                        confidence: 0.75 + (i as f32 * 0.05),
                        latency_ms: 500,
                        tokens_generated: 10,
                        timestamp: std::time::SystemTime::now(),
                    })
                    .collect();

                b.iter(|| {
                    let _ = synthesizer.calculate_ihsan_score(&responses);
                });
            },
        );
    }

    group.finish();
}

/// Benchmark model response parsing
fn bench_response_parsing(c: &mut Criterion) {
    let mut group = c.benchmark_group("response_parsing");

    let sample_json = r#"{
        "model": "llama3.2",
        "created_at": "2024-01-01T00:00:00Z",
        "response": "This is a test response from the model.",
        "done": true,
        "total_duration": 1234567890,
        "load_duration": 123456,
        "prompt_eval_count": 10,
        "prompt_eval_duration": 987654,
        "eval_count": 20,
        "eval_duration": 876543
    }"#;

    group.bench_function("parse_ollama_response", |b| {
        b.iter(|| {
            let _: serde_json::Value = serde_json::from_str(sample_json).unwrap();
        });
    });

    group.finish();
}

/// Benchmark full ensemble with simulated models
fn bench_ensemble_simulation(c: &mut Criterion) {
    let mut group = c.benchmark_group("ensemble_simulation");
    group.sample_size(10); // Reduce sample size for longer operations

    // Note: This simulates the synthesis part, not the actual HTTP calls
    for num_models in [2, 3, 5].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{}_models", num_models)),
            num_models,
            |b, &num_models| {
                let synthesizer = HarmonicSynthesizer::new(0.85);

                b.iter(|| {
                    let responses: Vec<ModelResponse> = (0..num_models)
                        .map(|i| ModelResponse {
                            model: format!("model_{}", i),
                            text: "Sample response".to_string(),
                            confidence: 0.80,
                            latency_ms: 500,
                            tokens_generated: 10,
                            timestamp: std::time::SystemTime::now(),
                        })
                        .collect();

                    let _ = synthesizer.synthesize(responses);
                });
            },
        );
    }

    group.finish();
}

/// Benchmark real Ollama integration (if available)
fn bench_real_ollama(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();

    // Check if Ollama is available
    let ollama_available = rt.block_on(is_ollama_available());

    if !ollama_available {
        eprintln!("⚠ Skipping real Ollama benchmarks: Ollama not available");
        eprintln!("  Install Ollama and models to run full benchmarks");
        return;
    }

    let models = rt.block_on(get_benchmark_models());
    if models.is_empty() {
        eprintln!("⚠ Skipping real Ollama benchmarks: No models installed");
        return;
    }

    let mut group = c.benchmark_group("real_ollama");
    group.sample_size(10); // Fewer samples for real API calls
    group.measurement_time(Duration::from_secs(60)); // Allow more time

    // Benchmark single model generation
    group.bench_function("single_model", |b| {
        let config = OllamaConfig {
            base_url: "http://localhost:11434".to_string(),
            timeout: Duration::from_secs(30),
            models: vec![models[0].clone()],
            min_healthy_models: 1,
            ihsan_threshold: 0.85,
        };
        let client = OllamaClient::new(config);

        b.to_async(&rt).iter(|| async {
            let _ = client.generate(&models[0], "What is 2+2?").await;
        });
    });

    // Benchmark ensemble with multiple models
    if models.len() >= 2 {
        group.bench_function("ensemble_2_models", |b| {
            let config = OllamaConfig {
                base_url: "http://localhost:11434".to_string(),
                timeout: Duration::from_secs(30),
                models: models.iter().take(2).cloned().collect(),
                min_healthy_models: 1,
                ihsan_threshold: 0.75,
            };
            let orchestrator = EnsembleOrchestrator::with_config(config);

            b.to_async(&rt).iter(|| async {
                let _ = orchestrator.generate("What is 2+2?").await;
            });
        });
    }

    if models.len() >= 3 {
        group.bench_function("ensemble_3_models", |b| {
            let config = OllamaConfig {
                base_url: "http://localhost:11434".to_string(),
                timeout: Duration::from_secs(30),
                models: models.iter().take(3).cloned().collect(),
                min_healthy_models: 2,
                ihsan_threshold: 0.75,
            };
            let orchestrator = EnsembleOrchestrator::with_config(config);

            b.to_async(&rt).iter(|| async {
                let _ = orchestrator.generate("What is 2+2?").await;
            });
        });
    }

    group.finish();
}

/// Benchmark concurrent requests
fn bench_concurrent_requests(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let ollama_available = rt.block_on(is_ollama_available());

    if !ollama_available {
        eprintln!("⚠ Skipping concurrent benchmarks: Ollama not available");
        return;
    }

    let models = rt.block_on(get_benchmark_models());
    if models.is_empty() {
        eprintln!("⚠ Skipping concurrent benchmarks: No models installed");
        return;
    }

    let mut group = c.benchmark_group("concurrent_requests");
    group.sample_size(10);

    for concurrency in [2, 4, 8].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{}x", concurrency)),
            concurrency,
            |b, &concurrency| {
                let config = OllamaConfig {
                    base_url: "http://localhost:11434".to_string(),
                    timeout: Duration::from_secs(30),
                    models: vec![models[0].clone()],
                    min_healthy_models: 1,
                    ihsan_threshold: 0.85,
                };
                let client = OllamaClient::new(config);

                b.to_async(&rt).iter(|| async {
                    let mut tasks = vec![];
                    for _ in 0..concurrency {
                        let client_clone = client.clone();
                        let model = models[0].clone();
                        let task = tokio::spawn(async move {
                            client_clone.generate(&model, "Quick test").await
                        });
                        tasks.push(task);
                    }

                    for task in tasks {
                        let _ = task.await;
                    }
                });
            },
        );
    }

    group.finish();
}

/// Benchmark memory usage (approximation)
fn bench_memory_usage(c: &mut Criterion) {
    let mut group = c.benchmark_group("memory_usage");

    group.bench_function("model_response_allocation", |b| {
        b.iter(|| {
            let _response = ModelResponse {
                model: "test".to_string(),
                text: "A".repeat(1000), // 1KB response
                confidence: 0.85,
                latency_ms: 500,
                tokens_generated: 100,
                timestamp: std::time::SystemTime::now(),
            };
        });
    });

    group.bench_function("ensemble_response_allocation", |b| {
        b.iter(|| {
            let responses: Vec<ModelResponse> = (0..5)
                .map(|i| ModelResponse {
                    model: format!("model_{}", i),
                    text: "A".repeat(1000),
                    confidence: 0.85,
                    latency_ms: 500,
                    tokens_generated: 100,
                    timestamp: std::time::SystemTime::now(),
                })
                .collect();

            let _ensemble = EnsembleResponse {
                text: "Final".to_string(),
                ihsan_score: 0.90,
                model_responses: responses,
                total_latency_ms: 1500,
                timestamp: std::time::SystemTime::now(),
            };
        });
    });

    group.finish();
}

criterion_group!(
    simulated_benches,
    bench_harmonic_synthesis,
    bench_health_monitoring,
    bench_quality_scoring,
    bench_response_parsing,
    bench_ensemble_simulation,
    bench_memory_usage,
);

criterion_group!(
    real_ollama_benches,
    bench_real_ollama,
    bench_concurrent_requests,
);

criterion_main!(simulated_benches, real_ollama_benches);
