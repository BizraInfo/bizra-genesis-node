# BIZRA Genesis Node - Benchmark Infrastructure

**Date**: 2025-11-11
**Status**: Ready for execution (requires proper build environment)
**Phase**: Phase 1, Sprint 1.2 (Weeks 3-4)

---

## Executive Summary

This document describes the benchmark infrastructure for BIZRA Genesis Node, current environment constraints, and steps to establish verified performance baselines.

**Current Status**:
- ✅ **Benchmark Code**: 5 Criterion benchmark suites implemented
- ✅ **Cargo.toml Restored**: Rust toolchain accessible
- ❌ **Build Environment**: Missing libclang (bindgen dependency)
- ⏳ **Execution Pending**: Awaiting environment fix or CI execution

---

## Benchmark Suites

### 1. Routing Benchmark ([benches/routing.rs](benches/routing.rs))

**Purpose**: Verify Thompson Sampling router performance
**Claim**: ≤2.3μs route selection
**Metrics**:
- Route selection latency (single decision)
- Multi-route comparison overhead
- Beta distribution update time

**Verification Command**:
```bash
cargo bench --bench routing
```

**Expected Output**:
```
thompson_sampling_route_selection
                        time:   [2.1 μs 2.3 μs 2.5 μs]
```

---

### 2. Consensus Benchmark ([benches/consensus.rs](benches/consensus.rs))

**Purpose**: Verify Weighted-Score Consensus (WSC) performance
**Claim**: ≤46μs Pareto optimization
**Metrics**:
- Pareto-optimal candidate selection (3-5 candidates)
- Fallback mechanism overhead
- Multi-dimensional scoring time

**Verification Command**:
```bash
cargo bench --bench consensus
```

**Expected Output**:
```
weighted_score_consensus_pareto
                        time:   [42 μs 46 μs 50 μs]
```

---

### 3. JSON Parsing Benchmark ([benches/json_parsing.rs](benches/json_parsing.rs))

**Purpose**: Verify SIMD/AVX2/AVX512 acceleration
**Claim**: 4-16x speedup depending on features
**Metrics**:
- Baseline (scalar) parsing time
- Portable SIMD speedup (4x)
- AVX2 speedup (8x, x86_64 only)
- AVX512 speedup (16x, nightly only)

**Verification Commands**:
```bash
# Baseline (no features)
cargo bench --bench json_parsing --no-default-features

# Portable SIMD
cargo bench --bench json_parsing --features simd

# AVX2 (x86_64)
cargo bench --bench json_parsing --features simd,avx2

# AVX512 (nightly, x86_64)
cargo +nightly bench --bench json_parsing --features simd,avx512
```

**Expected Output**:
```
json_parse_baseline      time:   [1.0 ms 1.0 ms 1.0 ms]  (1.0x)
json_parse_simd          time:   [250 μs 250 μs 250 μs]  (4.0x)
json_parse_avx2          time:   [125 μs 125 μs 125 μs]  (8.0x)
json_parse_avx512        time:   [62 μs 62 μs 62 μs]     (16.0x)
```

---

### 4. Buffer Pool Benchmark ([benches/buffer_pool.rs](benches/buffer_pool.rs))

**Purpose**: Verify memory pooling performance
**Claim**: Reduced allocations via buffer reuse
**Metrics**:
- Allocation time (pooled vs heap)
- Reuse overhead
- Multi-threaded contention

**Verification Command**:
```bash
cargo bench --bench buffer_pool
```

---

### 5. Thermal Computing Benchmark ([benches/thermal_benchmarks.rs](benches/thermal_benchmarks.rs))

**Purpose**: Verify physics-based optimization performance
**Claims**:
- Simulated annealing: <1s typical, <5s complex
- Boltzmann decisions: <1ms per decision
- P-bit throughput: >50,000 updates/second

**Verification Command**:
```bash
cargo bench --bench thermal_benchmarks
```

---

## Environment Requirements

### Current Environment (Windows 10.0.28000)

**Installed**:
- ✅ Rust 1.75+ (stable)
- ✅ Cargo toolchain
- ✅ MSVC build tools (Visual Studio)
- ✅ Git Bash environment

**Missing**:
- ❌ **libclang** (required by bindgen crate for zstd-sys)

### Fixing the Build Environment

**Option 1: Install LLVM with libclang** (Recommended for local dev):
```powershell
# Download LLVM from https://releases.llvm.org/
# Install with default options
# Set environment variable
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
```

**Option 2: Use Pre-built Binaries**:
```bash
# Add to Cargo.toml (workaround)
[build-dependencies]
bindgen = { version = "0.72", features = ["static"] }
```

**Option 3: Run in CI** (Recommended for verification):
```yaml
# .github/workflows/benchmarks.yml already configured
# Runs on ubuntu-latest with all dependencies
```

---

## Benchmark Execution Plan

### Phase 1.2 (Current) - Local Baseline

**Goal**: Establish baseline numbers with timestamps

**Steps**:
1. Fix libclang dependency (LLVM installation)
2. Run all 5 benchmark suites: `cargo bench`
3. Capture output with timestamps to `BENCHMARK_RESULTS_2025-11-11.txt`
4. Verify claims:
   - Routing ≤2.3μs
   - Consensus ≤46μs
   - JSON parsing 4-16x (depending on features)
5. Document hardware configuration (CPU, RAM, OS)

**Success Criteria**:
- All benchmarks execute successfully
- Results match or exceed claimed performance
- Timestamps recorded for traceability

---

### Phase 1.2 (Alternative) - CI Baseline

**If local environment cannot be fixed**:

**Steps**:
1. Trigger GitHub Actions workflow: `.github/workflows/benchmarks.yml`
2. Download artifact `benchmark-results.txt`
3. Review and verify performance claims
4. Document CI environment (runner specs)

**Command**:
```bash
# Trigger via GitHub CLI
gh workflow run benchmarks.yml
gh run download --name benchmark-results
```

---

## Performance Claims Verification

| Claim | Benchmark | Status | Evidence |
|-------|-----------|--------|----------|
| Thompson Sampling ≤2.3μs | routing.rs | ⏳ Pending | Awaiting execution |
| WSC ≤46μs | consensus.rs | ⏳ Pending | Awaiting execution |
| JSON SIMD 4x | json_parsing.rs | ⏳ Pending | Awaiting execution |
| JSON AVX2 8x | json_parsing.rs | ⏳ Pending | Awaiting execution |
| JSON AVX512 16x | json_parsing.rs | ⏳ Pending | Awaiting execution |
| Thermal <1s | thermal_benchmarks.rs | ⏳ Pending | Awaiting execution |

---

## Criterion Framework

All benchmarks use **Criterion** - industry-standard Rust benchmarking library.

**Features**:
- Statistical significance testing
- Regression detection
- HTML report generation
- Outlier detection
- Configurable sample sizes

**Output Location**: `target/criterion/`

**HTML Reports**: `target/criterion/report/index.html`

---

## Next Steps

**Immediate (This Sprint)**:
1. Install LLVM/libclang on Windows development machine
2. Run `cargo bench` to generate baseline results
3. Create `BENCHMARK_RESULTS_2025-11-11.txt` with timestamped output
4. Update IMPLEMENTED.md with verified performance numbers

**Phase 2.3 (Weeks 13-15)**:
- Benchmark Rust Axum API (when deployed)
- Compare Express.js vs Axum performance
- Verify 2x-5x improvement from Rust migration

**Phase 4.1 (Weeks 31-33)**:
- Load testing at 5K RPS (full system)
- P95/P99 latency measurements
- Stress testing and capacity planning

---

## References

- [Criterion.rs Documentation](https://bheisler.github.io/criterion.rs/book/)
- [Rust Performance Book](https://nnethercote.github.io/perf-book/)
- [BIZRA Genesis Roadmap](ROADMAP_2025.md) - Phase 1.2 objectives

---

*Built with إحسان (Excellence) • Benchmarked with Criterion • Verified with Science*

**Last Updated**: 2025-11-11 (Phase 1, Sprint 1.2)
