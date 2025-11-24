# CI/CD Pipeline - Operational Guide

This document provides operational guidance for the BIZRA Genesis Node CI/CD pipeline.

## Overview

The CI/CD pipeline is a production-grade, deterministic system that enforces:
- Code quality (formatting, linting)
- Security (cargo-audit, Dependabot)
- Testing (unit, integration, workspace-wide)
- Performance (Criterion benchmarks, regression detection)
- Load testing (k6 scenarios)

## Pipeline Structure

The pipeline consists of 5 independent jobs:

### 1. Test Job
- **Purpose**: Validate code quality and correctness
- **Steps**:
  - Format check (`cargo fmt --check`)
  - Clippy linting (`cargo clippy`)
  - Security audit (`cargo audit`)
  - Unit/integration tests (`cargo test --workspace`)
- **Caching**: Uses `actions/cache@v4` for Cargo registry and sccache for compilation

### 2. Benchmarks Job
- **Purpose**: Run performance benchmarks and collect evidence
- **Steps**:
  - Run Criterion benchmarks (`cargo bench`)
  - Collect benchmark results from `target/criterion`
  - Upload as `criterion-evidence` artifact
- **Dependencies**: Requires test job to pass

### 3. Performance Gate Job
- **Purpose**: Compare benchmarks against baseline and block regressions
- **Steps**:
  - Download current benchmark evidence
  - Download baseline (if available)
  - Run comparison script with 10% threshold
  - Fail if regression exceeds threshold
- **Dependencies**: Requires benchmarks job to pass

### 4. Load Test Job
- **Purpose**: Execute k6 load tests and collect results
- **Steps**:
  - Pull k6 Docker image
  - Run 7-stage progressive load test (50→1000 RPS)
  - Upload results as `k6-report` artifact
- **Dependencies**: Requires performance gate to pass

### 5. Release Job (Optional)
- **Purpose**: Build release binaries on main branch
- **Trigger**: Only on `push` to `main` branch
- **Steps**:
  - Build release binaries for workspace
  - Upload as `release-binaries` artifact

## Running Locally

### Prerequisites

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup component add rustfmt clippy

# Install sccache (optional, for faster builds)
cargo install sccache

# Install cargo-audit for security scanning
cargo install cargo-audit

# Install k6 for load testing
# macOS
brew install k6
# Linux
sudo apt-get install k6
# Or use Docker
docker pull grafana/k6:latest
```

### Format Check

```bash
cargo fmt --all -- --check
```

To auto-format:
```bash
cargo fmt --all
```

### Linting

```bash
cargo clippy --workspace --all-targets --all-features -- -D warnings
```

### Security Audit

```bash
cargo audit
```

### Run Tests

```bash
# All workspace tests
cargo test --workspace --all-features

# Specific package tests
cargo test -p bizra-genesis-node
cargo test -p bizra-moe

# With output
cargo test --workspace --all-features -- --nocapture
```

### Run Benchmarks

```bash
# Run all benchmarks
cargo bench --benches

# Run specific benchmark
cargo bench --bench consensus
cargo bench --bench json_parsing
cargo bench --bench buffer_pool
cargo bench --bench routing

# Save as baseline for comparison
cargo bench --benches -- --save-baseline my-baseline
```

### Compare Benchmarks

```bash
# Run benchmarks twice
cargo bench --benches -- --save-baseline before
# ... make changes ...
cargo bench --benches -- --save-baseline after

# Compare using the Python script
python3 scripts/compare_criterion.py \
    --baseline target/criterion/before \
    --current target/criterion/after \
    --threshold 0.10
```

### Run Load Tests

```bash
# Using k6 binary
k6 run --out json=./k6-results.json tests/k6/load_test.js

# Using Docker
docker run --rm \
    -v $(pwd)/tests/k6:/scripts \
    grafana/k6:latest run \
    --out json=/scripts/k6-results.json \
    /scripts/load_test.js

# With custom target URL
BASE_URL=http://localhost:3006 k6 run tests/k6/load_test.js
```

## Artifacts

The pipeline produces several artifacts that can be downloaded from GitHub Actions:

### Test Logs
- **Name**: `test-logs`
- **Location**: `target/debug/`
- **Retention**: 7 days
- **Contents**: Debug build artifacts and test binaries

### Criterion Evidence
- **Name**: `criterion-evidence`
- **Location**: `evidence/criterion/`
- **Retention**: 90 days
- **Contents**: Benchmark results (estimates.json files)

### k6 Report
- **Name**: `k6-report`
- **Location**: `tests/k6/k6-results.json`
- **Retention**: 30 days
- **Contents**: Load test results in JSON format

### Release Binaries
- **Name**: `release-binaries`
- **Location**: `target/release/`
- **Retention**: 90 days
- **Contents**: Optimized production binaries

## Performance Regression Detection

### Establishing a Baseline

To enable performance regression detection, you need to establish a baseline:

#### Option 1: Upload Artifact to GitHub Actions

1. Run benchmarks on the main branch:
   ```bash
   cargo bench --benches
   ```

2. Collect the benchmark results:
   ```bash
   mkdir -p baseline/criterion
   cp -r target/criterion/* baseline/criterion/
   ```

3. Create a tarball:
   ```bash
   tar czf baseline-criterion.tar.gz baseline/
   ```

4. Upload to GitHub:
   - Go to Actions → Select a workflow run
   - Download `criterion-evidence` artifact
   - Re-upload as `baseline-criterion` for the repository

#### Option 2: Store in Git (Committed Baseline)

```bash
# Create baseline directory
mkdir -p .performance-baseline

# Run benchmarks and save
cargo bench --benches
cp -r target/criterion .performance-baseline/

# Commit to repository
git add .performance-baseline
git commit -m "chore: Add performance baseline"
git push
```

Update the workflow to use the committed baseline:
```yaml
- name: Use committed baseline
  run: |
    if [ -d ".performance-baseline/criterion" ]; then
      mkdir -p baseline
      cp -r .performance-baseline/criterion baseline/
    fi
```

#### Option 3: Store in S3 or External Storage

For teams with access to S3 or similar storage:

```bash
# Upload baseline
aws s3 cp target/criterion/ s3://your-bucket/baselines/criterion/ --recursive

# Download in CI
aws s3 cp s3://your-bucket/baselines/criterion/ baseline/criterion/ --recursive
```

### Threshold Configuration

The default regression threshold is **10%** (0.10). To change it:

1. **In the workflow file** (`.github/workflows/ci.yml`):
   ```yaml
   - name: 📊 Compare benchmarks
     run: |
       python scripts/compare_criterion.py \
         --baseline baseline/criterion \
         --current evidence/criterion \
         --threshold 0.05  # 5% threshold
   ```

2. **Using environment variable**:
   ```yaml
   env:
     PERF_THRESHOLD: "0.05"
   
   - name: 📊 Compare benchmarks
     run: |
       python scripts/compare_criterion.py \
         --baseline baseline/criterion \
         --current evidence/criterion \
         --threshold ${PERF_THRESHOLD}
   ```

### Interpreting Results

The comparison script will output:
- ✅ **FASTER**: Performance improved
- ⚠️ **SLOWER**: Performance degraded but within threshold
- ❌ **REGRESSION**: Performance degraded beyond threshold (fails CI)

Example output:
```
================================================================================
CRITERION BENCHMARK COMPARISON
================================================================================
Baseline:  baseline/criterion
Current:   evidence/criterion
Threshold: 10.0%
================================================================================

Comparing 4 benchmarks:
  ✅ FASTER       consensus/2                                     12450.23 ->     11234.56 ns (  -9.76%)
  ⚠️  SLOWER       json_parsing/small                              1234.56 ->      1345.67 ns (  +9.00%)
  ❌ REGRESSION   buffer_pool/allocation                           5678.90 ->      6789.01 ns ( +19.54%)
  ➡️  SAME         routing/lookup                                  3456.78 ->      3456.78 ns (  +0.00%)

================================================================================
BENCHMARK COMPARISON SUMMARY
================================================================================
Total benchmarks:        4
Major regressions:       1 (>10% slower)
Minor regressions:       1 (<=10% slower)
Improvements:            1
Regression threshold:    10%
================================================================================

❌ PERFORMANCE REGRESSION DETECTED (threshold: 10.0%)
   Performance degradation exceeds acceptable threshold
```

## Security Automation

### Cargo Audit

The pipeline runs `cargo audit` on every commit to detect known vulnerabilities in dependencies.

To run locally:
```bash
cargo audit

# Generate detailed report
cargo audit --json > audit-report.json
```

### Dependabot

Dependabot is configured to check for dependency updates weekly:
- **Cargo dependencies**: Root workspace and bizra-moe
- **NPM dependencies**: If package.json exists
- **GitHub Actions**: Action version updates

Configuration is in `.github/dependabot.yml`.

To review Dependabot PRs:
1. Check for breaking changes in the changelog
2. Review the diff for unexpected changes
3. Run tests locally if needed
4. Approve and merge

## Caching Strategy

The pipeline uses multiple caching layers:

1. **Cargo Registry Cache** (`actions/cache@v4`):
   - Caches `~/.cargo/registry/`, `~/.cargo/git/`, `target/`
   - Key: `${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}`
   - Speeds up dependency downloads

2. **sccache** (`mozilla-actions/sccache-action@v0.0.4`):
   - Caches compiled artifacts
   - Significantly reduces rebuild times
   - Automatically configured with `RUSTC_WRAPPER=sccache`

3. **Docker Layer Cache** (load test job):
   - Caches k6 Docker image pulls

Cache invalidation:
- Cargo cache invalidates when `Cargo.lock` changes
- sccache invalidates based on source file changes
- Docker cache uses GitHub Actions cache backend

## Troubleshooting

### Tests Failing

1. Check test output in the "Test" job logs
2. Run tests locally to reproduce:
   ```bash
   cargo test --workspace --all-features -- --nocapture
   ```
3. Check for environment-specific issues (file paths, temp directories)

### Benchmarks Failing

1. Ensure benchmarks compile:
   ```bash
   cargo bench --benches --no-run
   ```
2. Run benchmarks locally:
   ```bash
   cargo bench --benches
   ```
3. Check for missing dependencies or features

### Performance Gate Failing

1. Download both artifacts: `baseline-criterion` and `criterion-evidence`
2. Run comparison locally:
   ```bash
   python3 scripts/compare_criterion.py \
       --baseline baseline/criterion \
       --current evidence/criterion \
       --threshold 0.10
   ```
3. Investigate regressions:
   - Profile the slow benchmark
   - Check for algorithmic changes
   - Review recent commits

### Load Test Failing

1. Check if the application is running:
   ```bash
   curl http://localhost:3006/health
   ```
2. Run load test with reduced load:
   ```bash
   # Edit tests/k6/load_test.js to reduce stages
   k6 run tests/k6/load_test.js
   ```
3. Check application logs for errors

### Cache Issues

If caching is causing problems:

1. **Clear cache manually**:
   - Go to Actions → Caches
   - Delete problematic cache entries

2. **Force fresh build**:
   - Modify `Cargo.lock` hash in cache key
   - Or temporarily disable cache in workflow

## Best Practices

1. **Run locally before pushing**: Catch issues early
2. **Keep dependencies updated**: Review Dependabot PRs weekly
3. **Monitor performance**: Track benchmark trends over time
4. **Update baselines**: Re-establish baselines after major optimizations
5. **Review artifacts**: Download and inspect artifacts for unexpected changes

## Support

For issues or questions:
- Open an issue on GitHub
- Contact the core team
- Check CI/CD logs for detailed error messages
