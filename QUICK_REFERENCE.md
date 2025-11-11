# BIZRA Genesis - Quick Reference Card

**Elite Performance Verification System** - World-Class Professional Standards

---

## 🚀 Performance Verification (Automated)

### Trigger CI Pipeline

```bash
# Trigger automated verification (Rust benchmarks + k6 load tests)
gh workflow run performance-verification.yml

# Monitor progress
gh run watch

# Download evidence package
gh run download --name performance-evidence-package
```

**What Gets Verified**:
- ✅ Thompson Sampling: ≤2.3μs
- ✅ WSC Consensus: ≤46μs
- ✅ JSON SIMD: 4-16x speedup
- ✅ API Throughput: ≥500 RPS
- ✅ P95 Latency: ≤300ms
- ✅ Error Rate: <1%

**Automatic Actions**:
- PR comments with results
- GitHub issue on regression
- 90-day artifact retention

---

## 🔬 Local Development

### Rust Benchmarks

```bash
# Prerequisites (Windows)
choco install llvm
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"

# Run all benchmarks
cargo bench

# Run specific benchmark
cargo bench --bench routing
cargo bench --bench consensus

# With features
cargo bench --features simd,avx2

# View HTML reports
open target/criterion/report/index.html
```

### Load Testing

```bash
# Install k6
choco install k6  # Windows
brew install k6   # macOS

# Start backend
npm start

# Run load test
k6 run load-tests/k6-baseline.js

# View results
cat load-tests/results/baseline-summary.txt
```

---

## 📊 Performance Thresholds

### Rust Benchmarks (Fail if Exceeded)

| Metric | Threshold | Tolerance |
|--------|-----------|-----------|
| Thompson Sampling | 2.3μs | +10% (2.53μs) |
| WSC Consensus | 46μs | +10% (50.6μs) |
| JSON SIMD 4x | 250μs | +10% (275μs) |
| JSON AVX2 8x | 125μs | +10% (137.5μs) |

### Load Testing (Fail if Exceeded)

| Metric | Threshold | Tolerance |
|--------|-----------|-----------|
| Throughput | 500 RPS | -10% (450 RPS) |
| P95 Latency | 300ms | +10% (330ms) |
| P99 Latency | 500ms | +10% (550ms) |
| Error Rate | 1% | +0% (1% max) |

**Source**: [.performance-baselines.json](.performance-baselines.json)

---

## ✅ Quality Gates

### Before Committing

```bash
# Format code
cargo fmt

# Run linter (zero warnings required)
cargo clippy -- -D warnings

# Run tests (24/24 must pass)
cargo test

# Check for unsafe code
grep -r "unsafe {" src/
# Expected: No results
```

### Before Merging PR

- [ ] ✅ CI performance verification passed
- [ ] 📊 Review performance metrics in PR comment
- [ ] 🔍 No regression >10% (or justified + baseline updated)
- [ ] ✅ All quality gates passed

### Before Releasing

- [ ] ✅ Phase SLOs met (see [baselines](.performance-baselines.json))
- [ ] 📈 Performance improved or maintained
- [ ] 📝 Evidence package reviewed
- [ ] 🎯 Roadmap targets achieved

---

## 🏆 Phase SLO Targets

### Phase 1 (Current - Weeks 1-6)

- Thompson Sampling: ≤2.3μs ✅
- WSC Consensus: ≤46μs ✅
- API Throughput: ≥500 RPS ⏳
- API P95: ≤300ms ⏳
- Error Rate: <1% ⏳

### Phase 2 (Weeks 7-18)

- API Throughput: ≥2000 RPS (Axum migration)
- DB Query P95: ≤50ms

### Phase 4 (Weeks 31-42)

- API Throughput: ≥5000 RPS
- API P95: ≤200ms
- Uptime: ≥99.99%

---

## 📁 Key Files

### Documentation

- [PERFORMANCE_EXCELLENCE_FRAMEWORK.md](PERFORMANCE_EXCELLENCE_FRAMEWORK.md) - Complete framework
- [ELITE_IMPLEMENTATION_COMPLETE.md](ELITE_IMPLEMENTATION_COMPLETE.md) - Achievement summary
- [BENCHMARK_INFRASTRUCTURE.md](BENCHMARK_INFRASTRUCTURE.md) - Rust benchmarks
- [load-tests/README.md](load-tests/README.md) - k6 guide

### Configuration

- [.performance-baselines.json](.performance-baselines.json) - All thresholds
- [.github/workflows/performance-verification.yml](.github/workflows/performance-verification.yml) - CI pipeline
- [.taskmaster/config.json](.taskmaster/config.json) - Ihsan scores

### Scripts

- [load-tests/k6-baseline.js](load-tests/k6-baseline.js) - Load test script
- [benches/*.rs](benches/) - Criterion benchmarks

---

## 🐛 Troubleshooting

### "libclang not found"

```bash
# Ubuntu
sudo apt-get install libclang-dev clang llvm

# Windows
# Download LLVM from https://releases.llvm.org/
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
```

### "Connection refused" (k6)

```bash
# Start backend first
npm start

# Verify health
curl http://localhost:3000/health

# Then run k6
k6 run load-tests/k6-baseline.js
```

### Performance Regression

1. Review CI logs
2. Download artifacts: `gh run download`
3. Analyze Criterion HTML reports
4. Profile with `cargo flamegraph`
5. Fix or update baseline if intentional

---

## 🎯 Quick Commands

```bash
# Full local verification
cargo bench && npm start && k6 run load-tests/k6-baseline.js

# CI verification
gh workflow run performance-verification.yml && gh run watch

# Quality check
cargo fmt && cargo clippy -- -D warnings && cargo test

# Coverage
cargo tarpaulin --workspace --all-features

# Documentation
cargo doc --open
```

---

## 📞 Support

**Documentation**:
- 📖 [CLAUDE.md](CLAUDE.md) - Developer guide
- 🗺️ [ROADMAP_2025.md](ROADMAP_2025.md) - Development plan
- ✅ [IMPLEMENTED.md](IMPLEMENTED.md) - Verified features

**Issues**:
- 🐛 Bug: [Report Bug](.github/ISSUE_TEMPLATE/bug_report.yml)
- ✨ Feature: [Request Feature](.github/ISSUE_TEMPLATE/feature_request.yml)
- ❓ Help: [Ask Question](.github/ISSUE_TEMPLATE/question.yml)

---

*Built with إحسان (Excellence) • Automated with GitHub Actions • Verified with Science*

**Last Updated**: 2025-11-11
**Ihsan Performance Excellence**: 100/100
