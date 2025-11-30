# BIZRA Genesis Node - Verification Runbook

**Document Version:** 1.0
**Created:** 2025-11-15
**Owner:** Platform Engineering Team
**Purpose:** Complete reference for verifying all production readiness claims

---

## Overview

This runbook provides **exact commands** to verify every claim in the [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md). It serves as the definitive reference for:

- ✅ External security auditors
- ✅ Compliance reviewers
- ✅ New team members onboarding
- ✅ Continuous validation in CI/CD
- ✅ Production deployment verification

### Verification Principles

1. **Reproducibility:** Every command must work from a fresh clone
2. **Determinism:** Same input → same output (no randomness)
3. **Independence:** Commands can run in any order
4. **Documentation:** Expected output clearly stated
5. **Failure Modes:** How to interpret failures

---

## Quick Start: One-Command Validation

For rapid verification of all Phase 1 claims:

```bash
# Full integration test (8 validation phases, ~5 minutes)
./scripts/integration-test.sh

# Expected output:
# ✅ Phase 1: Preflight Check Validation - PASS
# ✅ Phase 2: Secrets Generation Validation - PASS
# ✅ Phase 3: Canary Monitoring Validation - PASS
# ✅ Phase 4: Unit Tests Validation - PASS
# ✅ Phase 5: E2E Tests Structure Validation - PASS
# ✅ Phase 6: Grafana Dashboard Validation - PASS
# ✅ Phase 7: Documentation Validation - PASS
# ✅ Phase 8: Security Validation - PASS
#
# Integration Test Result: PASS (8/8 phases)
```

**Exit Code:** 0 = success, 1 = failure

**What it validates:**
- Pre-flight checks (database, Redis, TLS, disk, memory)
- Secrets generation (cryptographic quality)
- Canary monitoring (SLO enforcement)
- Unit tests (260+ tests)
- E2E tests structure (22 tests)
- Grafana dashboard (JSON validity)
- Documentation (operational docs exist)
- Security (TLS config, no hardcoded secrets)

---

## Table of Contents

1. [Test Coverage Verification](#1-test-coverage-verification)
2. [Performance Metrics Verification](#2-performance-metrics-verification)
3. [Security Validation](#3-security-validation)
4. [Infrastructure Health Checks](#4-infrastructure-health-checks)
5. [Deployment Scripts Verification](#5-deployment-scripts-verification)
6. [Documentation Completeness](#6-documentation-completeness)
7. [CI/CD Pipeline Verification](#7-cicd-pipeline-verification)
8. [SLO Compliance Validation](#8-slo-compliance-validation)
9. [Troubleshooting Guide](#9-troubleshooting-guide)

---

## 1. Test Coverage Verification

### 1.1 Unit Tests Count

**Claim:** "260+ unit tests passing"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Line 444

**Verification Command:**
```bash
# List all unit tests
cargo test --lib -- --list 2>&1 | grep ": test$" | wc -l
```

**Expected Output:** Number ≥ 260

**Alternative (detailed list):**
```bash
# See all test names
cargo test --lib -- --list
```

**Failure Modes:**
- Output < 260: Tests have been removed (regression)
- Command fails: Compilation error or missing dependencies
- Output = 0: Wrong directory or cargo not found

---

### 1.2 Unit Tests Execution

**Claim:** "All 260+ unit tests passing"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Line 450

**Verification Command:**
```bash
# Run all unit tests
cargo test --lib --all-features

# Or with quiet output
cargo test --lib --all-features --quiet
```

**Expected Output:**
```
test result: ok. 260 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**Exit Code:** 0 = all tests pass

**Failure Modes:**
- Exit code != 0: Test failures (see output for which tests failed)
- "failed" count > 0: Specific test regressions
- Compilation errors: Code changes broke tests

---

### 1.3 E2E Tests Count

**Claim:** "22 E2E tests (7 auth + 8 invite + 7 WebSocket)"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Lines 455-461

**Verification Command:**
```bash
# Count E2E test functions
grep -r "#\[tokio::test\]" tests/e2e_*.rs | wc -l
```

**Expected Output:** 22

**Detailed Breakdown:**
```bash
# Auth tests (should show 7)
grep "#\[tokio::test\]" tests/e2e_auth.rs | wc -l

# Invite flow tests (should show 8)
grep "#\[tokio::test\]" tests/e2e_invite_flow.rs | wc -l

# WebSocket tests (should show 7)
grep "#\[tokio::test\]" tests/e2e_websocket.rs | wc -l
```

**Failure Modes:**
- Count != 22: Tests added/removed without updating documentation
- File not found: E2E test files missing

---

### 1.4 E2E Tests Execution

**Claim:** "22 E2E tests validated against running server"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Line 465

**Prerequisites:**
- Running BIZRA Genesis Node server
- Environment variable: `E2E_BASE_URL`

**Verification Command:**
```bash
# Set base URL (adjust for your environment)
export E2E_BASE_URL="https://api.bizra.ai"
# or for local testing:
# export E2E_BASE_URL="https://localhost:8443"

# Run E2E tests (marked with --ignored)
cargo test --test e2e_auth -- --ignored
cargo test --test e2e_invite_flow -- --ignored
cargo test --test e2e_websocket -- --ignored
```

**Expected Output (per file):**
```
test result: ok. 7 passed; 0 failed; 0 ignored
test result: ok. 8 passed; 0 failed; 0 ignored
test result: ok. 7 passed; 0 failed; 0 ignored
```

**Failure Modes:**
- Connection refused: Server not running or wrong URL
- 401 errors: Authentication issues
- Test timeouts: Performance degradation or network issues

---

### 1.5 Experimental Tests Excluded

**Claim:** "Stub tests marked as experimental and excluded from certification"
**Source:** [PHASE1_EVIDENCE_MATRIX.md](PHASE1_EVIDENCE_MATRIX.md) Sections 1.2, 1.3

**Verification Command:**
```bash
# Verify property-based test is ignored
grep "#\[ignore" tests/property-based-consensus.rs

# Verify fuzz test is ignored
grep "#\[ignore" tests/fuzz-crypto-operations.rs
```

**Expected Output:**
```
#[ignore = "Experimental stub - not part of Phase 1 certification (planned for Phase 2)"]
```

**Failure Modes:**
- No output: Ignore attribute missing (stub tests would be counted)
- File not found: Test files removed

---

## 2. Performance Metrics Verification

### 2.1 HTTP API Performance (SLO Compliance)

**Claim:** "P95 latency: 145ms, P99: 287ms, Error rate: 0.0%, Throughput: 312 req/s"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Lines 189-192, 344-348

**Prerequisites:**
- Running BIZRA Genesis Node server
- Test user credentials available

**Verification Command:**
```bash
# Full performance validation (50 concurrent users, 60s per endpoint)
./scripts/performance-validation.sh --base-url https://api.bizra.ai --concurrent 50 --duration 60

# Or quick test (10 concurrent, 30s)
./scripts/performance-validation.sh --base-url https://api.bizra.ai --concurrent 10 --duration 30
```

**Expected Output:**
```
Test 1: Health Check
  P95 Latency: <300ms ✓
  Error Rate: ≤1% ✓
  Status: ✅ SLO COMPLIANCE: PASS

Test 2: Metrics Endpoint
  P95 Latency: <300ms ✓
  Error Rate: ≤1% ✓
  Status: ✅ SLO COMPLIANCE: PASS

...

✅ ALL TESTS PASSED - Production Ready
```

**Exit Code:** 0 = SLO met, 1 = SLO violated

**Failure Modes:**
- P95 > 300ms: Performance regression
- Error rate > 1%: Service instability
- Exit code 1: SLO violation (do not deploy)

---

### 2.2 Thompson Sampling Performance (Microseconds)

**Claim:** "Thompson Sampling: 2.3μs P99 latency"
**Source:** [README.md](../../README.md) Lines 112-113, [ADR-001](../adrs/ADR-001-rust-for-core-system.md) Line 64

**Verification Command:**
```bash
# Run routing benchmarks
cargo bench --bench routing

# Or compile-only check (fast)
cargo bench --bench routing --no-run
```

**Expected Output (from cargo bench):**
```
test select_route/2  ... bench:       1,892 ns/iter (+/- 234)
test select_route/5  ... bench:       2,156 ns/iter (+/- 187)
test select_route/10 ... bench:       2,312 ns/iter (+/- 298)
...
```

**Interpretation:**
- P99 latency should be ~2,000-2,500 nanoseconds (2-2.5μs)
- Numbers within ±20% of baseline are acceptable
- Criterion outputs detailed HTML reports to `target/criterion/`

**Failure Modes:**
- Latency > 5μs: Significant performance regression
- Benchmark fails to compile: Code changes broke benchmark
- No output: Criterion not installed or wrong command

---

### 2.3 Weighted-Score Consensus Performance

**Claim:** "Weighted-Score Consensus: 46μs P99 latency"
**Source:** [README.md](../../README.md) Lines 198-199

**Verification Command:**
```bash
# Run consensus benchmarks
cargo bench --bench consensus

# Or compile-only check
cargo bench --bench consensus --no-run
```

**Expected Output (from cargo bench):**
```
test aggregate_weights/10   ... bench:      38,456 ns/iter (+/- 3,211)
test aggregate_weights/50   ... bench:      42,789 ns/iter (+/- 2,987)
test aggregate_weights/100  ... bench:      46,123 ns/iter (+/- 4,102)
...
```

**Interpretation:**
- P99 latency should be ~40-50 microseconds (40-50μs)
- Linear scaling with number of agents is expected
- Performance varies by hardware (document your baseline)

**Failure Modes:**
- Latency > 100μs: Performance regression
- Non-linear scaling: Algorithm efficiency issue

---

## 3. Security Validation

### 3.1 Dependency Vulnerability Audit

**Claim:** "2 vulnerabilities (MEDIUM), 3 unmaintained warnings - acceptable for Alpha-100"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Lines 498-548

**Verification Command:**
```bash
# Run security audit
cargo audit
```

**Expected Output (as of 2025-11-15):**
```
Vulnerabilities found:
1. idna 0.5.0 (RUSTSEC-2024-0421) - Upgrade to >=1.0.0
2. rsa 0.9.9 (RUSTSEC-2023-0071) - No fix available

Warnings:
3. instant 0.1.13 (RUSTSEC-2024-0384) - Unmaintained
4. paste 1.0.15 (RUSTSEC-2024-0436) - Unmaintained
5. proc-macro-error 1.0.4 (RUSTSEC-2024-0370) - Unmaintained

error: 2 vulnerabilities found!
warning: 3 allowed warnings found
```

**Exit Code:** 1 (due to 2 vulnerabilities)

**Interpretation:**
- **2 vulnerabilities:** Expected and documented with risk assessments
- **idna:** LOW risk (no user-supplied domain names)
- **rsa:** LOW risk (PostgreSQL-only deployment avoids MySQL SSL)
- **3 warnings:** Compile-time dependencies only, acceptable

**Failure Modes:**
- More than 2 vulnerabilities: New issues introduced
- HIGH/CRITICAL severity: Immediate remediation required
- Advisory database fetch fails: Network issue

**Remediation Tracking:**
See [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Section "Remediation Plan" (Lines 543-546)

---

### 3.2 OWASP Top 10 Coverage

**Claim:** "All OWASP Top 10 vulnerabilities mitigated"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Lines 483-494

**Verification Method:**

Each OWASP category requires different validation:

#### A01: Broken Access Control
```bash
# Verify JWT middleware is applied to protected routes
grep -r "jwt_auth" src/api/

# Expected: Protected routes use JWT middleware
```

#### A03: Injection (SQL)
```bash
# Verify parameterized queries (sqlx macros)
grep -r "sqlx::query!" src/

# Expected: All database queries use prepared statements
# No string concatenation for SQL

# Anti-pattern check (should return nothing)
grep -r "format.*SELECT" src/
```

#### A06: Vulnerable Components
```bash
# Already covered by cargo audit (Section 3.1)
cargo audit
```

---

### 3.3 TLS Configuration

**Claim:** "TLS 1.2/1.3 only, HSTS enabled, Perfect Forward Secrecy"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Day 3 section

**Verification Command (requires server running):**
```bash
# Check TLS versions supported
nmap --script ssl-enum-ciphers -p 443 api.bizra.ai

# Or using openssl
echo | openssl s_client -connect api.bizra.ai:443 -tls1_2

# Check HSTS header
curl -I https://api.bizra.ai | grep -i strict-transport-security
```

**Expected Output:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**TLS Versions:**
- ✅ TLSv1.2: Enabled
- ✅ TLSv1.3: Enabled
- ❌ TLSv1.0: Disabled
- ❌ TLSv1.1: Disabled

**Failure Modes:**
- TLS 1.0/1.1 enabled: Security vulnerability
- No HSTS header: Browser downgrade attack possible
- Weak ciphers: Encryption compromise risk

---

### 3.4 Certificate Validity

**Claim:** "Valid Let's Encrypt certificate with auto-renewal"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Day 3 section

**Verification Command:**
```bash
# Check certificate expiry
echo | openssl s_client -connect api.bizra.ai:443 2>/dev/null | openssl x509 -noout -dates

# Or just the expiry date
echo | openssl s_client -connect api.bizra.ai:443 2>/dev/null | openssl x509 -noout -enddate
```

**Expected Output:**
```
notAfter=Apr 15 12:00:00 2026 GMT
```

**Interpretation:**
- Expiry > 7 days: OK
- Expiry < 7 days: WARNING (renewal should happen)
- Expiry < 1 day: CRITICAL (renewal failed)

**Auto-Renewal Check:**
```bash
# Verify certbot timer is active
sudo systemctl status certbot.timer

# Test renewal (dry-run)
sudo certbot renew --dry-run
```

---

## 4. Infrastructure Health Checks

### 4.1 Pre-Flight Validation

**Claim:** "10 pre-flight checks validate deployment readiness"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Day 4 section

**Verification Command:**
```bash
# Run pre-flight check script
./scripts/pre-flight-check.sh
```

**Expected Output:**
```
✅ Database Connection: PASS (PostgreSQL 15.5 reachable)
✅ Redis Connection: PASS (Redis 7.2.3 reachable)
✅ TLS Certificate: PASS (Expires in 89 days)
✅ Disk Space: PASS (45% free, >20% required)
✅ Memory: PASS (2.8GB free, >2GB required)
✅ Environment Variables: PASS (All required vars set)
✅ Database Migrations: PASS (All migrations applied)
✅ Backup Verification: PASS (Latest backup <24h old)
✅ Port Availability: PASS (8080, 5432, 6379 listening)
✅ Service Health: PASS (All components healthy)

Pre-flight Check Result: PASS (10/10 checks)
```

**Exit Code:** 0 = pass, 1 = fail

**Failure Modes:**
- Database/Redis connection: Service not running or credentials wrong
- TLS certificate < 7 days: Renewal needed
- Disk space < 20%: Storage cleanup required
- Missing env vars: Configuration incomplete

---

### 4.2 Component Health

**Claim:** "All infrastructure components operational"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Lines 516-523

**Verification Commands:**

**PostgreSQL:**
```bash
# Check version
psql --version
# Expected: PostgreSQL 15.x or higher

# Test connection
psql -U bizra_user -d bizra_db -c "SELECT version();"
# Expected: Successful connection with version info
```

**Redis:**
```bash
# Check version
redis-cli --version
# Expected: redis-cli 7.x

# Test connection
redis-cli PING
# Expected: PONG
```

**nginx:**
```bash
# Check version
nginx -v
# Expected: nginx/1.24.x or higher

# Test configuration
sudo nginx -t
# Expected: configuration file ... test is successful
```

**BIZRA Genesis Node:**
```bash
# Health check endpoint
curl -k https://api.bizra.ai/health

# Expected JSON:
# {"status":"healthy","database":"connected","redis":"connected"}
```

**Failure Modes:**
- Version mismatch: Upgrade required
- Connection failed: Service not running
- Health check returns 503: Service degraded

---

## 5. Deployment Scripts Verification

### 5.1 Secrets Generation

**Claim:** "256-bit cryptographic secrets with NIST 800-63B compliance"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Day 5 section

**Verification Command:**
```bash
# Generate secrets (test mode - outputs to stdout)
./scripts/generate-secrets.sh --dry-run

# Or with JSON output
JSON_MODE=1 ./scripts/generate-secrets.sh --dry-run
```

**Expected Output:**
```json
{
  "status": "success",
  "secrets": {
    "jwt_secret": "64 hex characters (256 bits)",
    "database_password": "32+ characters, mixed complexity",
    ...
  },
  "validation": {
    "jwt_secret_bits": 256,
    "password_entropy": ">80 bits",
    "randomness_source": "/dev/urandom"
  }
}
```

**Validation Checks:**
- JWT secret: Exactly 64 hex characters (32 bytes = 256 bits)
- Database password: ≥16 characters, mixed case, numbers, symbols
- Randomness: /dev/urandom (cryptographically secure)

**Failure Modes:**
- JWT secret < 256 bits: Security risk
- Weak password: Failed complexity check
- Predictable output: Randomness source compromised

---

### 5.2 Canary Monitoring

**Claim:** "Canary validates SLO compliance with automatic rollback"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Day 6 section

**Verification Command:**
```bash
# Run canary monitoring (30 requests, 10s interval)
./scripts/canary-monitor.sh \
  --base-url https://api.bizra.ai \
  --requests 30 \
  --interval 10

# With automatic rollback on failure
CANARY_ROLLBACK_CMD="./scripts/rollback.sh" \
  ./scripts/canary-monitor.sh \
  --base-url https://api.bizra.ai
```

**Expected Output:**
```
Total Requests: 30
Successful: 30 (100%)
Failed: 0 (0%)

P95 Latency: 145ms (Target: <300ms) ✅
Avg Latency: 98ms
Error Rate: 0.0% (Target: ≤1%) ✅
Availability: 100% (Target: ≥99.5%) ✅

✅ SLO MET
```

**Exit Code:** 0 = SLO met, 1 = SLO violated (rollback triggered)

**Failure Modes:**
- P95 > 300ms: Performance SLO violation
- Error rate > 1%: Reliability SLO violation
- Rollback triggered: Automatic remediation executed

---

## 6. Documentation Completeness

### 6.1 Operational Documentation

**Claim:** "Complete operational runbook, launch checklist, and monitoring playbook"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Day 12 section

**Verification Commands:**
```bash
# Verify all operational docs exist
ls -lh docs/operations/RUNBOOK.md
ls -lh docs/operations/LAUNCH_CHECKLIST.md
ls -lh docs/operations/MONITORING_PLAYBOOK.md

# Count lines (validate completeness)
wc -l docs/operations/RUNBOOK.md              # Should be 1000+ lines
wc -l docs/operations/LAUNCH_CHECKLIST.md     # Should be 800+ lines
wc -l docs/operations/MONITORING_PLAYBOOK.md  # Should be 1200+ lines
```

**Expected Output:**
```
-rw-r--r-- 1 user group 19138 Nov 15 docs/operations/RUNBOOK.md
-rw-r--r-- 1 user group 21931 Nov 15 docs/operations/LAUNCH_CHECKLIST.md
-rw-r--r-- 1 user group 31338 Nov 15 docs/operations/MONITORING_PLAYBOOK.md

1000 docs/operations/RUNBOOK.md
 800 docs/operations/LAUNCH_CHECKLIST.md
1200 docs/operations/MONITORING_PLAYBOOK.md
```

**Failure Modes:**
- File not found: Documentation missing
- Line count too low: Incomplete documentation
- Last modified > 30 days: Potentially outdated

---

### 6.2 Evidence & Traceability

**Claim:** "Complete traceability from baseline to current state"
**Source:** [PHASE1_EVIDENCE_MATRIX.md](PHASE1_EVIDENCE_MATRIX.md)

**Verification Commands:**
```bash
# Verify evidence matrix exists
cat docs/operations/PHASE1_EVIDENCE_MATRIX.md

# Verify baseline report exists
cat docs/reports/CODEBASE_HEALTH_BASELINE.md

# Verify this verification runbook exists
cat docs/operations/VERIFICATION_RUNBOOK.md

# Count verification commands in matrix
grep -c "Verification Command:" docs/operations/PHASE1_EVIDENCE_MATRIX.md
# Expected: >15 (one per concern)
```

**Expected:** All three documents exist and are comprehensive

**Failure Modes:**
- Missing documents: Evidence gap
- No verification commands: Claims not reproducible
- Outdated information: Documentation drift

---

## 7. CI/CD Pipeline Verification

### 7.1 GitHub Actions Workflows

**Claim:** "Elite CI/CD pipeline with quality gates"
**Source:** [.github/workflows/elite-ci-cd.yml](../../.github/workflows/elite-ci-cd.yml)

**Verification Command:**
```bash
# List all workflows
ls -1 .github/workflows/*.yml

# Validate workflow syntax (requires act or GitHub CLI)
gh workflow list  # If GitHub CLI installed

# Or manual validation
yamllint .github/workflows/elite-ci-cd.yml
```

**Expected Workflows:**
- elite-ci-cd.yml (main quality pipeline)
- security.yml (security scanning)
- performance-verification.yml (benchmarks)
- ci.yml (basic checks)

**Quality Gates:**
```bash
# Verify quality gates are defined
grep -A 5 "cargo fmt" .github/workflows/elite-ci-cd.yml
grep -A 5 "cargo clippy" .github/workflows/elite-ci-cd.yml
grep -A 5 "cargo test" .github/workflows/elite-ci-cd.yml
grep -A 5 "cargo audit" .github/workflows/elite-ci-cd.yml
```

**Expected:** All quality gates present in workflow

---

### 7.2 Linting & Formatting

**Claim:** "Code passes rustfmt and clippy strict mode"
**Source:** CI/CD workflows

**Verification Commands:**
```bash
# Format check (should show no changes needed)
cargo fmt --all -- --check

# Clippy strict mode (should show no warnings)
cargo clippy --all-targets --all-features -- -D warnings
```

**Expected Output:**
```
# cargo fmt
(no output = already formatted)

# cargo clippy
    Finished dev [unoptimized + debuginfo] target(s)
(no warnings)
```

**Exit Codes:** Both should be 0

**Failure Modes:**
- cargo fmt output: Code not formatted (run `cargo fmt`)
- clippy warnings: Code quality issues (fix warnings)
- Exit code != 0: CI would fail

---

## 8. SLO Compliance Validation

### 8.1 Service Level Objectives

**Claim:** "All SLOs met or exceeded"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Lines 534-542

**SLO Definitions:**

| SLO | Target | Current | Status |
|-----|--------|---------|--------|
| Availability | ≥ 99.5% | 100% | ✅ EXCEEDS |
| P95 Latency | < 300ms | 145ms | ✅ EXCEEDS |
| P99 Latency | < 500ms | 287ms | ✅ EXCEEDS |
| Error Rate | ≤ 1% | 0.0% | ✅ EXCEEDS |
| Throughput | ≥ 100 req/s | 312 req/s | ✅ EXCEEDS |

**Verification:**
See Section 2.1 (HTTP API Performance)

```bash
./scripts/performance-validation.sh --base-url https://api.bizra.ai
```

**Validation Criteria:**
- **All 5 SLOs must be met** for production deployment
- **SLO violation = deployment blocked** until remediated

---

### 8.2 Error Budget

**Claim:** "0% of monthly error budget consumed"
**Source:** [DEPLOYMENT_READINESS_CERTIFICATION.md](../../DEPLOYMENT_READINESS_CERTIFICATION.md) Line 557

**Calculation:**
```
Monthly Error Budget = (1 - 0.995) * 30 days * 24 hours = 3.6 hours
Current Consumption = 0 hours downtime
Budget Remaining = 100%
```

**Verification:**
```bash
# Query Prometheus for uptime (requires Prometheus)
curl -s 'http://prometheus.bizra.ai/api/v1/query?query=up{job="bizra-genesis-node"}' | jq '.data.result[0].value[1]'

# Expected: "1" (service up)
```

**Monitoring:**
- Grafana dashboard: https://monitoring.bizra.ai/d/alpha-100
- Panel: "SLO Overview"

---

## 9. Troubleshooting Guide

### 9.1 Common Verification Failures

#### Failure: cargo test fails with compilation errors

**Symptoms:**
```
error[E0433]: failed to resolve: use of undeclared crate or module
```

**Diagnosis:**
```bash
# Check Cargo.lock is present
ls -l Cargo.lock

# Try clean build
cargo clean
cargo build
```

**Resolution:**
1. Delete `Cargo.lock` and `target/`
2. Run `cargo update`
3. Run `cargo build` again
4. If still failing, check Rust version: `rustc --version` (should be 1.70+)

---

#### Failure: E2E tests fail with connection refused

**Symptoms:**
```
Error: Connection refused (os error 111)
```

**Diagnosis:**
```bash
# Check if server is running
curl -k https://localhost:8443/health

# Check environment variable
echo $E2E_BASE_URL
```

**Resolution:**
1. Start server: `cargo run` or systemd: `sudo systemctl start bizra-genesis-node`
2. Set correct URL: `export E2E_BASE_URL="https://localhost:8443"`
3. Verify connectivity: `curl -k $E2E_BASE_URL/health`
4. Re-run tests

---

#### Failure: cargo audit shows new vulnerabilities

**Symptoms:**
```
error: 5 vulnerabilities found! (expected: 2)
```

**Diagnosis:**
```bash
# Compare against baseline
cargo audit 2>&1 | tee /tmp/current-audit.txt
diff /tmp/current-audit.txt docs/reports/cargo-audit-baseline.txt
```

**Resolution:**
1. Review new advisories: `cargo audit --url <RUSTSEC-ID>`
2. Check if upgrades available: `cargo update --dry-run`
3. Update documentation if new vulnerabilities are acceptable
4. Create remediation tickets for HIGH/CRITICAL issues

---

#### Failure: Performance validation shows P95 > 300ms

**Symptoms:**
```
P95 Latency: 452ms ✗ (SLO: <300ms)
Status: ❌ SLO COMPLIANCE: FAIL
```

**Diagnosis:**
```bash
# Check system resources
htop
df -h
free -m

# Check database performance
psql -U bizra_user -d bizra_db -c "SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;"

# Check Redis latency
redis-cli --latency-history
```

**Resolution:**
1. Identify slow endpoint from performance validation output
2. Check database query performance (see diagnostic command above)
3. Review application logs: `journalctl -u bizra-genesis-node -n 100`
4. Consider rollback if recent deployment caused regression
5. Do NOT deploy if SLO violated

---

### 9.2 Script Debugging

#### Enable Debug Mode

All scripts support debug output:

```bash
# Add -x for bash tracing
bash -x ./scripts/integration-test.sh

# Or set debug flag
DEBUG=1 ./scripts/performance-validation.sh
```

#### Capture Full Output

```bash
# Capture stdout and stderr
./scripts/integration-test.sh 2>&1 | tee /tmp/integration-test.log

# Review later
less /tmp/integration-test.log
```

---

### 9.3 Emergency Contacts

For verification issues that cannot be resolved:

1. **L1 (On-Call Engineer):** PagerDuty escalation
2. **L2 (Platform Lead):** Slack #platform-ops
3. **L3 (Engineering Manager):** Email (see RUNBOOK.md)

**Before escalating, collect:**
- ✅ Exact command that failed
- ✅ Full error output
- ✅ System information: `uname -a`, `rustc --version`, `cargo --version`
- ✅ Recent changes: `git log -5 --oneline`

---

## 10. Continuous Verification

### 10.1 Pre-Deployment Checklist

Before every production deployment, run:

```bash
# 1. Code quality
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings

# 2. Tests
cargo test --all --all-features

# 3. Security
cargo audit

# 4. Pre-flight
./scripts/pre-flight-check.sh

# 5. Integration
./scripts/integration-test.sh

# 6. Performance (if deploying to staging first)
./scripts/performance-validation.sh --base-url https://staging.bizra.ai

# 7. Canary (after deployment)
./scripts/canary-monitor.sh --base-url https://api.bizra.ai
```

**All must pass (exit code 0) before deployment.**

---

### 10.2 Scheduled Validation

**Daily (Automated in CI):**
- cargo test --all
- cargo audit
- Benchmark smoke tests (cargo bench --no-run)

**Weekly (Manual):**
- Full integration test: `./scripts/integration-test.sh`
- Performance validation: `./scripts/performance-validation.sh`
- Documentation review: Verify all docs are current

**Monthly (Manual):**
- Full benchmarks: `cargo bench`
- Security audit review with remediation plan updates
- SLO compliance report
- Evidence matrix update

---

## 11. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-15 | Initial creation for Phase 1 evidence alignment | Platform Engineering Team |

---

## 12. Related Documentation

- [Deployment Readiness Certification](../../DEPLOYMENT_READINESS_CERTIFICATION.md) - What claims are made
- [Phase 1 Evidence Matrix](PHASE1_EVIDENCE_MATRIX.md) - Claims to evidence mapping
- [Codebase Health Baseline](../reports/CODEBASE_HEALTH_BASELINE.md) - Historical C+ baseline
- [Operational Runbook](RUNBOOK.md) - Deployment and operations procedures
- [Launch Checklist](LAUNCH_CHECKLIST.md) - Pre-launch validation
- [Monitoring Playbook](MONITORING_PLAYBOOK.md) - Alert response procedures

---

**Document Control:**
- **Created:** 2025-11-15
- **Version:** 1.0
- **Classification:** Internal - Operational Reference
- **Owner:** Platform Engineering Team
- **Review Frequency:** Monthly or after major changes
- **Next Review:** 2025-12-15
