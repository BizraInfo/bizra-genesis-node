# CI Quality Gates Specification

**Version:** 1.0
**Date:** November 17, 2025
**Status:** Ready for Implementation
**Related Milestone:** [A+QW-1: Core Quality & Performance Baseline Established](A_PLUS_MILESTONE_QW1.md)

---

## Purpose

Establish permanent CI quality gates to prevent regression of the validated quality and performance baselines established in Milestone A+QW-1. These gates enforce A+ certification standards automatically on every pull request and commit to main.

---

## Quality Gate Summary

| Gate | Baseline | Threshold | Enforcement | Blocking |
|------|----------|-----------|-------------|----------|
| **Test Coverage** | 85.7% | >80% | CI Pipeline | Yes |
| **Smoke Benchmark** | 244-885ns | <5μs | CI Pipeline | Yes |
| **Load Test (Quick)** | P95 0.6ms | P95 <50ms | CI Pipeline | No (warning) |
| **Build Success** | Passing | Must pass | CI Pipeline | Yes |
| **Clippy Lints** | Clean | No errors | CI Pipeline | Yes |

---

## Gate 1: Test Coverage

### Objective
Maintain minimum 80% code coverage to ensure comprehensive testing of core functionality.

### Current Baseline
- **Achieved Coverage:** 85.7%
- **Buffer Above Threshold:** 5.7 percentage points
- **Evidence:** [TEST-01.1-COVERAGE.md](../evidence/TEST-01.1-COVERAGE.md)

### Threshold
- **Hard Threshold:** >80% line coverage
- **Soft Target:** >85% line coverage
- **Failure Condition:** Coverage drops below 80%

### Implementation

```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on:
  pull_request:
  push:
    branches: [main]

jobs:
  coverage:
    name: Test Coverage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install cargo-tarpaulin
        run: cargo install cargo-tarpaulin

      - name: Run tests with coverage
        run: cargo tarpaulin --out Xml --output-dir coverage

      - name: Check coverage threshold
        run: |
          COVERAGE=$(grep -oP 'line-rate="\K[0-9.]+' coverage/cobertura.xml | head -1)
          COVERAGE_PCT=$(echo "$COVERAGE * 100" | bc)
          echo "Coverage: $COVERAGE_PCT%"

          if (( $(echo "$COVERAGE_PCT < 80" | bc -l) )); then
            echo "❌ Coverage $COVERAGE_PCT% is below 80% threshold"
            exit 1
          fi

          echo "✅ Coverage $COVERAGE_PCT% meets threshold"

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: coverage/cobertura.xml
          flags: rust
          fail_ci_if_error: false
```

### Monitoring
- Coverage reports uploaded to Codecov for trend analysis
- Pull request comments show coverage delta
- Failing PRs blocked from merge until coverage restored

### Escape Hatch
If legitimate reason exists to temporarily drop below 80%:
1. Document reason in PR description
2. Create follow-up issue to restore coverage
3. Require maintainer approval override

---

## Gate 2: Smoke Benchmark

### Objective
Detect performance regression in core algorithms through fast benchmark smoke test.

### Current Baseline
- **Harmonic Synthesis (2 models):** 244ns
- **Health Monitoring (record_success):** 19ns
- **Quality Scoring (2 models):** 489ns
- **Evidence:** [PERF-01.4-BENCHMARKS.md](../evidence/PERF-01.4-BENCHMARKS.md)

### Threshold
- **Hard Threshold:** Core operations complete in <5μs (5000ns)
- **Soft Target:** <1μs (1000ns)
- **Failure Condition:** Any operation exceeds 5μs

### Implementation

Create smoke benchmark file:

```rust
// bizra-moe/benches/smoke_benchmark.rs
//! Fast smoke benchmark for CI regression detection
//! Run with: cargo bench --bench smoke_benchmark

use bizra_moe::*;
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use std::time::Duration;

fn smoke_benchmark(c: &mut Criterion) {
    let mut group = c.benchmark_group("smoke");
    group.measurement_time(Duration::from_secs(5)); // Fast 5-second run

    // Test 1: Harmonic Synthesis (most critical path)
    group.bench_function("harmonic_synthesis_2_models", |b| {
        let synthesizer = HarmonicSynthesizer::new(0.85);
        let responses: Vec<ModelResponse> = (0..2)
            .map(|i| ModelResponse {
                id: uuid::Uuid::new_v4(),
                model: format!("model_{}", i),
                text: format!("Response {}", i),
                confidence: 0.80,
                latency_ms: 500,
                token_count: Some(10),
                timestamp: std::time::SystemTime::now().into(),
            })
            .collect();

        b.iter(|| {
            black_box(synthesizer.synthesize(responses.clone()));
        });
    });

    // Test 2: Health Monitoring (fastest operation)
    group.bench_function("health_record_success", |b| {
        let mut health = ModelHealth::new("test".to_string());

        b.iter(|| {
            black_box(health.record_success(500));
        });
    });

    // Test 3: Quality Scoring (mid-complexity)
    group.bench_function("quality_scoring_2_models", |b| {
        let synthesizer = HarmonicSynthesizer::new(0.0); // permissive
        let responses: Vec<ModelResponse> = (0..2)
            .map(|i| ModelResponse {
                id: uuid::Uuid::new_v4(),
                model: format!("model_{}", i),
                text: format!("Response {}", i),
                confidence: 0.80,
                latency_ms: 500,
                token_count: Some(10),
                timestamp: std::time::SystemTime::now().into(),
            })
            .collect();

        b.iter(|| {
            black_box(synthesizer.synthesize(responses.clone()));
        });
    });

    group.finish();
}

criterion_group!(smoke_benches, smoke_benchmark);
criterion_main!(smoke_benches);
```

Update Cargo.toml:

```toml
[[bench]]
name = "smoke_benchmark"
harness = false
path = "bizra-moe/benches/smoke_benchmark.rs"
```

Add to CI workflow:

```yaml
  smoke-benchmark:
    name: Smoke Benchmark
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Run smoke benchmark
        run: |
          cargo bench --bench smoke_benchmark -- --output-format bencher | tee benchmark-output.txt

      - name: Check performance thresholds
        run: |
          # Extract mean times from benchmark output
          # Expected format: "test name ... bench: 244 ns/iter (+/- 15)"

          while IFS= read -r line; do
            if [[ $line =~ bench:[[:space:]]*([0-9]+)[[:space:]]*(ns|us|ms) ]]; then
              TIME=${BASH_REMATCH[1]}
              UNIT=${BASH_REMATCH[2]}

              # Convert to nanoseconds
              case $UNIT in
                ns) TIME_NS=$TIME ;;
                us) TIME_NS=$((TIME * 1000)) ;;
                ms) TIME_NS=$((TIME * 1000000)) ;;
              esac

              # Check against 5μs (5000ns) threshold
              if [ $TIME_NS -gt 5000 ]; then
                echo "❌ Performance regression detected: ${TIME_NS}ns exceeds 5000ns threshold"
                exit 1
              fi
            fi
          done < benchmark-output.txt

          echo "✅ All benchmarks meet performance threshold"

      - name: Store benchmark results
        uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'cargo'
          output-file-path: benchmark-output.txt
          github-token: ${{ secrets.GITHUB_TOKEN }}
          auto-push: true
          alert-threshold: '200%' # Alert if 2x slower
          fail-on-alert: true
```

### Monitoring
- Benchmark results stored in gh-pages branch
- Trend visualization available at GitHub Pages
- Alerts triggered on 2x regression (200% threshold)

### Escape Hatch
If intentional performance tradeoff:
1. Document reason and alternatives considered
2. Update threshold in CI workflow
3. Require architecture review approval

---

## Gate 3: Load Test (Quick Validation)

### Objective
Run abbreviated load test to catch catastrophic performance issues without full 5-minute test.

### Current Baseline
- **P95 Latency:** 603µs (0.6ms)
- **P99 Latency:** 1.03ms
- **Sustained RPS:** 111.89 req/s
- **Evidence:** [PERF-01.3-LOAD-TESTS.md](../evidence/PERF-01.3-LOAD-TESTS.md)

### Threshold
- **Hard Threshold:** P95 <50ms, P99 <100ms
- **Soft Target:** P95 <5ms, P99 <10ms
- **Failure Condition:** Warning only (non-blocking)

### Implementation

Create quick load test:

```javascript
// k6/scenarios/ci-smoke-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp to 10 VUs
    { duration: '1m', target: 10 },  // Hold at 10 VUs
    { duration: '10s', target: 0 },  // Ramp down
  ],
  thresholds: {
    'http_req_duration{status:200}': ['p(95)<50', 'p(99)<100'], // Allow generous thresholds
    'http_req_failed{status:200}': ['rate<0.05'], // <5% failure rate for 200s
  },
};

export default function () {
  const response = http.get('http://localhost:3000/health');

  check(response, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'response time OK': (r) => r.timings.duration < 100,
  });

  sleep(0.1); // 100ms delay between requests
}
```

Add to CI workflow:

```yaml
  load-test-quick:
    name: Load Test (Quick)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Start server
        run: |
          node backend/server.js &
          SERVER_PID=$!
          sleep 5 # Wait for server startup
          echo "SERVER_PID=$SERVER_PID" >> $GITHUB_ENV

      - name: Install k6
        run: |
          wget https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz
          tar -xzf k6-v0.48.0-linux-amd64.tar.gz
          sudo mv k6-v0.48.0-linux-amd64/k6 /usr/local/bin/

      - name: Run quick load test
        run: k6 run k6/scenarios/ci-smoke-test.js || echo "⚠️  Load test warning (non-blocking)"
        continue-on-error: true

      - name: Stop server
        if: always()
        run: kill $SERVER_PID || true
```

### Monitoring
- Load test results in CI logs
- Non-blocking: warnings don't fail CI
- Full load tests run nightly for comprehensive validation

### Upgrade Path
When production deployment occurs:
1. Make gate blocking
2. Test against staging environment
3. Tighten thresholds to match baseline (P95 <5ms)

---

## Gate 4: Build & Lint

### Objective
Ensure code compiles cleanly and passes Clippy lints.

### Thresholds
- **Build:** Must compile successfully
- **Clippy:** Zero errors, warnings allowed
- **Format:** Code must be formatted (cargo fmt --check)

### Implementation

```yaml
  build-and-lint:
    name: Build & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt

      - name: Check formatting
        run: cargo fmt --all -- --check

      - name: Run Clippy
        run: cargo clippy --all-targets --all-features -- -D warnings

      - name: Build
        run: cargo build --release

      - name: Run tests
        run: cargo test --all-features
```

---

## Complete Workflow File

Reference implementation combining all gates:

```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on:
  pull_request:
  push:
    branches: [main, develop]

env:
  RUST_BACKTRACE: 1
  CARGO_TERM_COLOR: always

jobs:
  # Gate 1: Test Coverage
  coverage:
    name: Test Coverage (>80%)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Install cargo-tarpaulin
        run: cargo install cargo-tarpaulin
      - name: Run coverage
        run: cargo tarpaulin --out Xml --output-dir coverage
      - name: Check threshold
        run: |
          COVERAGE=$(grep -oP 'line-rate="\K[0-9.]+' coverage/cobertura.xml | head -1)
          COVERAGE_PCT=$(echo "$COVERAGE * 100" | bc)
          echo "Coverage: $COVERAGE_PCT%"
          if (( $(echo "$COVERAGE_PCT < 80" | bc -l) )); then
            echo "❌ Coverage below 80% threshold"
            exit 1
          fi
          echo "✅ Coverage meets threshold"
      - uses: codecov/codecov-action@v3
        with:
          files: coverage/cobertura.xml

  # Gate 2: Smoke Benchmark
  smoke-benchmark:
    name: Smoke Benchmark (<5μs)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Run smoke benchmark
        run: cargo bench --bench smoke_benchmark -- --output-format bencher | tee benchmark-output.txt
      - name: Check thresholds
        run: |
          # Parse and validate benchmark results
          MAX_NS=5000  # 5μs threshold
          FAILED=0

          while IFS= read -r line; do
            if [[ $line =~ bench:[[:space:]]*([0-9]+)[[:space:]]*(ns|us) ]]; then
              TIME=${BASH_REMATCH[1]}
              UNIT=${BASH_REMATCH[2]}
              TIME_NS=$( [[ $UNIT == "us" ]] && echo $((TIME * 1000)) || echo $TIME )

              if [ $TIME_NS -gt $MAX_NS ]; then
                echo "❌ Performance regression: ${TIME_NS}ns > ${MAX_NS}ns"
                FAILED=1
              fi
            fi
          done < benchmark-output.txt

          [ $FAILED -eq 0 ] && echo "✅ Benchmarks pass" || exit 1

  # Gate 3: Load Test (Warning Only)
  load-test:
    name: Load Test (P95<50ms - Warning)
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install
      - name: Start server
        run: node backend/server.js & sleep 5
      - name: Install k6
        run: |
          wget -q https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz
          tar -xzf k6-v0.48.0-linux-amd64.tar.gz
          sudo mv k6-v0.48.0-linux-amd64/k6 /usr/local/bin/
      - name: Run load test
        run: k6 run k6/scenarios/ci-smoke-test.js

  # Gate 4: Build & Lint
  build:
    name: Build & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt
      - name: Check formatting
        run: cargo fmt --all -- --check
      - name: Clippy
        run: cargo clippy --all-targets -- -D warnings
      - name: Build
        run: cargo build --release
      - name: Tests
        run: cargo test --all-features

  # Summary
  quality-gates-summary:
    name: Quality Gates Summary
    runs-on: ubuntu-latest
    needs: [coverage, smoke-benchmark, load-test, build]
    if: always()
    steps:
      - name: Check results
        run: |
          echo "Coverage: ${{ needs.coverage.result }}"
          echo "Benchmark: ${{ needs.smoke-benchmark.result }}"
          echo "Load Test: ${{ needs.load-test.result }} (warning only)"
          echo "Build: ${{ needs.build.result }}"

          if [[ "${{ needs.coverage.result }}" != "success" ]] || \
             [[ "${{ needs.smoke-benchmark.result }}" != "success" ]] || \
             [[ "${{ needs.build.result }}" != "success" ]]; then
            echo "❌ Quality gates failed"
            exit 1
          fi

          echo "✅ Quality gates passed"
```

---

## Maintenance

### Weekly Review
- Check for false positives requiring threshold adjustment
- Review trend in Codecov and benchmark dashboards
- Verify gates remain relevant to quality goals

### Monthly Review
- Assess if thresholds should be tightened
- Review escape hatch usage
- Update documentation with lessons learned

### Quarterly Review
- Full audit of all quality gates
- Consider adding new gates for emerging risks
- Archive obsolete gates

---

## Rollout Plan

### Phase 1: Non-Blocking (Week 1)
1. Add workflow file with `continue-on-error: true` on all jobs
2. Monitor for false positives
3. Fix any CI infrastructure issues

### Phase 2: Blocking Coverage & Build (Week 2)
1. Make coverage and build gates blocking
2. Ensure team can successfully merge PRs
3. Document common issues and fixes

### Phase 3: Blocking Benchmarks (Week 3)
1. Make smoke benchmark gate blocking
2. Establish baseline tracking
3. Train team on interpreting results

### Phase 4: Load Test Hardening (Week 4+)
1. Make load test blocking when production deployed
2. Tighten thresholds to production requirements
3. Add comprehensive nightly load tests

---

## Success Metrics

### Regression Prevention
- **Target:** Zero quality regressions reach main branch
- **Measurement:** Count of post-merge hotfixes for quality issues
- **Goal:** <1 per quarter

### Build Health
- **Target:** >95% green CI builds on main
- **Measurement:** CI success rate
- **Goal:** 95%+ within 30 days

### Developer Experience
- **Target:** <5 minutes CI runtime for quality gates
- **Measurement:** Average CI duration
- **Goal:** <5 minutes P95

---

## References

- [Milestone A+QW-1](A_PLUS_MILESTONE_QW1.md) - Baseline establishment
- [QUICK-WINS-PACKAGE.md](../evidence/QUICK-WINS-PACKAGE.md) - Evidence package
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Criterion.rs Documentation](https://bheisler.github.io/criterion.rs/book/)
- [k6 Documentation](https://k6.io/docs/)

---

**Document Owner:** DevOps Team
**Last Updated:** November 17, 2025
**Next Review:** November 24, 2025
