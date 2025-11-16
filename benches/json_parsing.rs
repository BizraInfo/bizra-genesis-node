// benches/json_parsing.rs
// Benchmark suite for SIMD-accelerated JSON parsing

use bizra_genesis_node::parser::EarlyCloseJsonParser;
use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};

fn json_parsing_benchmarks(c: &mut Criterion) {
    let mut group = c.benchmark_group("json_parsing");

    // Small JSON (~100 bytes)
    let small_json = br#"{"name":"test","value":42,"nested":{"key":"value"}}"#;
    group.throughput(Throughput::Bytes(small_json.len() as u64));
    group.bench_with_input(
        BenchmarkId::new("small", small_json.len()),
        small_json,
        |b, json| b.iter(|| EarlyCloseJsonParser::parse_balanced_json(black_box(json))),
    );

    // Medium JSON (~1KB)
    let medium_json = br#"{
        "task": "synthesis",
        "candidates": [
            {"model": "gpt-4", "score": 0.95, "cost": 0.03, "latency": 1200},
            {"model": "claude-3", "score": 0.92, "cost": 0.02, "latency": 1000},
            {"model": "llama-3", "score": 0.88, "cost": 0.01, "latency": 800}
        ],
        "metadata": {
            "timestamp": 1234567890,
            "version": "1.0.0",
            "config": {"ihsan_floor": 0.85, "timeout": 30}
        },
        "results": {
            "winner": "gpt-4",
            "consensus_score": 0.94,
            "total_latency": 3000
        }
    }"#;
    group.throughput(Throughput::Bytes(medium_json.len() as u64));
    group.bench_with_input(
        BenchmarkId::new("medium", medium_json.len()),
        medium_json,
        |b, json| b.iter(|| EarlyCloseJsonParser::parse_balanced_json(black_box(json))),
    );

    // Large JSON (~10KB) - complex nested structure
    let large_json_data = generate_large_json();
    let large_json = large_json_data.as_bytes();
    group.throughput(Throughput::Bytes(large_json.len() as u64));
    group.bench_with_input(
        BenchmarkId::new("large", large_json.len()),
        large_json,
        |b, json| b.iter(|| EarlyCloseJsonParser::parse_balanced_json(black_box(json))),
    );

    // Array parsing
    let array_json = br#"[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]"#;
    group.throughput(Throughput::Bytes(array_json.len() as u64));
    group.bench_with_input(
        BenchmarkId::new("array", array_json.len()),
        array_json,
        |b, json| b.iter(|| EarlyCloseJsonParser::parse_balanced_json(black_box(json))),
    );

    // Deeply nested structure (stress test)
    let nested_json = br#"{"a":{"b":{"c":{"d":{"e":{"f":{"g":{"h":{"i":{"j":"value"}}}}}}}}}}"#;
    group.throughput(Throughput::Bytes(nested_json.len() as u64));
    group.bench_with_input(
        BenchmarkId::new("deeply_nested", nested_json.len()),
        nested_json,
        |b, json| b.iter(|| EarlyCloseJsonParser::parse_balanced_json(black_box(json))),
    );

    group.finish();
}

fn generate_large_json() -> String {
    let mut json = String::from("{\"candidates\":[");
    for i in 0..100 {
        if i > 0 {
            json.push(',');
        }
        json.push_str(&format!(
            r#"{{"model":"model-{}","score":0.{},"cost":0.0{},"latency":{},"metadata":{{"quality":0.{},"safety":0.{},"efficiency":0.{}}}}}"#,
            i,
            90 + (i % 10),
            i % 5,
            1000 + i * 10,
            85 + (i % 15),
            90 + (i % 10),
            80 + (i % 20)
        ));
    }
    json.push_str("]}");
    json
}

criterion_group!(benches, json_parsing_benchmarks);
criterion_main!(benches);
