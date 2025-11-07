# BIZRA Genesis Node - Performance Benchmarks

Professional-grade benchmark suite for validating state-of-art performance claims.

## Overview

This benchmark suite provides comprehensive performance measurements for all critical hot paths in the BIZRA Genesis Node, including:

- **JSON Parsing**: SIMD-accelerated parsing with simd-json
- **Buffer Pool**: Zero-copy buffer management
- **Thompson Routing**: Model selection algorithm
- **Consensus**: Weighted-score consensus mechanism

## Running Benchmarks

### Quick Validation

```bash
# Run all benchmarks with quick sampling (2-3 minutes)
cargo bench -- --quick

# Run specific benchmark
cargo bench --bench json_parsing -- --quick
cargo bench --bench buffer_pool -- --quick
cargo bench --bench routing -- --quick
cargo bench --bench consensus -- --quick
```

### Full Benchmark Suite

```bash
# Run comprehensive benchmarks (10-15 minutes)
cargo bench

# Run with specific feature flags
cargo bench --features simd,avx2
```

### Comparing Performance

```bash
# Baseline measurement
cargo bench -- --save-baseline baseline

# After optimization
cargo bench -- --baseline baseline
```

## Benchmark Categories

### 1. JSON Parsing (`json_parsing.rs`)

Validates SIMD acceleration claims for JSON parsing performance.

**Test Cases:**
- Small JSON (~100 bytes): Simple objects
- Medium JSON (~1KB): Nested structures
- Large JSON (~10KB): Complex candidate arrays
- Arrays: Integer sequences
- Deeply nested: Stress testing

**Expected Performance:**
- **Baseline**: 50-100 MiB/s
- **SIMD**: 200-400 MiB/s (4x improvement)
- **AVX2**: 400-800 MiB/s (8x improvement)
- **AVX512**: 800-1600 MiB/s (16x improvement)

### 2. Buffer Pool (`buffer_pool.rs`)

Measures zero-copy buffer management overhead and concurrency.

**Test Cases:**
- Acquire/Release cycles (4KB, 64KB buffers)
- Concurrent access (1, 4, 8, 16 tasks)
- Sequential reuse patterns
- Initialization overhead

**Expected Performance:**
- Acquire/Release: <100ns per operation
- Concurrent access: Linear scaling up to 16 tasks
- Zero allocation overhead for reused buffers

### 3. Thompson Routing (`routing.rs`)

Benchmarks model selection algorithm performance.

**Test Cases:**
- Route selection (2-50 routes)
- Historical data impact
- Update operations
- Win rate queries
- Full routing cycles
- Realistic workloads (1000 decisions)

**Expected Performance:**
- Route selection: <1µs for 10 routes
- Update operations: <100ns
- Win rate queries: <50ns
- Full cycle: <2µs

### 4. Consensus (`consensus.rs`)

Measures weighted-score consensus decision making.

**Test Cases:**
- Varying candidate counts (2-100)
- All above Ihsan floor
- Fallback scenarios
- Tight races (similar scores)
- Varying floor thresholds
- Realistic workloads (6 models)

**Expected Performance:**
- 2 candidates: <500ns
- 10 candidates: <2µs
- 100 candidates: <20µs
- Linear scaling with candidate count

## Performance Targets

| Component | Target | Status |
|-----------|--------|--------|
| JSON Parsing (SIMD) | 4x baseline | ✅ Validated |
| Buffer Pool | <100ns/op | ✅ Validated |
| Thompson Routing | <1µs/select | ✅ Validated |
| Consensus | <2µs for 10 | ✅ Validated |

## Interpreting Results

Criterion outputs three key metrics:

1. **Time**: Mean execution time with confidence interval
2. **Throughput**: MiB/s for data-processing benchmarks
3. **Change**: Comparison to baseline (if available)

Example output:
```
json_parsing/medium/602 time:   [2.69 µs 2.71 µs 2.73 µs]
                        thrpt:  [210.02 MiB/s 211.50 MiB/s 213.31 MiB/s]
                        change: [-2.5% -1.2% +0.3%] (p = 0.15)
```

## HTML Reports

After running benchmarks, view detailed HTML reports:

```bash
# Open benchmark report (Windows)
start target\criterion\report\index.html

# Open benchmark report (Linux/macOS)
open target/criterion/report/index.html
```

## CI/CD Integration

Benchmarks can be integrated into CI/CD pipelines:

```yaml
- name: Run benchmarks
  run: cargo bench -- --quick --output-format bencher
```

## Platform-Specific Notes

### Windows
- AVX2/AVX512 require compatible CPU (Intel Skylake+ or AMD Zen2+)
- Use Release build for accurate measurements
- Close background applications for stable results

### Linux
- Consider using `io_uring` feature for I/O benchmarks
- Use `perf` for detailed profiling

### macOS
- ARM (M1/M2) uses NEON SIMD instead of AVX
- Performance characteristics differ from x86_64

## Profiling

For deep performance analysis:

```bash
# Install flamegraph
cargo install flamegraph

# Profile with flamegraph
cargo flamegraph --bench json_parsing

# Use perf (Linux)
perf record -g cargo bench --bench routing
perf report
```

## Contributing

When adding new benchmarks:

1. **Use black_box()**: Prevent compiler optimizations from eliminating work
2. **Measure realistic workloads**: Match production usage patterns
3. **Include context**: Throughput, item counts, data sizes
4. **Document expectations**: State expected performance ranges
5. **Test reproducibility**: Results should be stable across runs

## Professional Standards

These benchmarks adhere to PROFESSIONAL ELITE PRACTITIONER standards:

- ✅ **Comprehensive**: Cover all critical hot paths
- ✅ **Realistic**: Based on actual production workloads
- ✅ **Reproducible**: Stable results with confidence intervals
- ✅ **Documented**: Clear interpretation and targets
- ✅ **Validated**: Performance claims backed by measurements

---

**Built with إحسان (Excellence) • Powered by Criterion • Validated Performance**
