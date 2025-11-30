# BIZRA Genesis Node - Quality Charter

**Version:** 1.0.2
**Last Updated:** 2025-11-29
**Status:** Active

---

## Purpose

This document defines the quality standards, gates, and expectations for all contributions to the BIZRA Genesis Node codebase. It serves as the authoritative reference for what "green" means in our CI/CD pipeline.

---

## Quality Baseline (Current State)

| Metric | Value | Status |
|--------|-------|--------|
| Backend Tests | 472/472 passing | Enforced |
| Frontend Tests | 460/460 passing | Enforced |
| Total Tests | 932/932 passing | Enforced |
| Backend Clippy (lib) | 0 warnings | Enforced |
| Backend Build | Release build passing | Enforced |
| Frontend Build | Production build passing | Enforced |

---

## Hard Gates (Must Pass Before Merge)

These gates are **blocking** - PRs cannot merge if they fail.

### Backend (Rust)

```bash
# 1. Format check
cargo fmt --all -- --check

# 2. Clippy lint (library - strict)
SQLX_OFFLINE=true cargo clippy --lib --no-default-features -- -D warnings

# 3. Unit tests
SQLX_OFFLINE=true cargo test --lib --no-default-features

# 4. Build verification
SQLX_OFFLINE=true cargo check --no-default-features
```

### Frontend (React/TypeScript)

```bash
cd apps/dashboard

# 1. Install dependencies
npm ci

# 2. Run tests with coverage
npm test -- --coverage --watchAll=false

# 3. Type check (in quality job)
npm run type-check
```

---

## Soft Gates (Advisory - Non-Blocking)

These gates produce warnings but do not block PRs.

```bash
# Clippy for examples/tests (advisory)
SQLX_OFFLINE=true cargo clippy --all-targets --no-default-features -- -W warnings

# Integration tests (may require database)
SQLX_OFFLINE=true cargo test --no-default-features -- --test-threads=1

# Performance benchmarks (may require database)
SQLX_OFFLINE=true cargo bench --no-default-features
```

---

## Coverage Thresholds

### Backend Coverage
- **Target:** 75% line coverage
- **Enforcement:** Tarpaulin in CI
- **Status:** Enforced via `--fail-under 75`

### Frontend Coverage
- **Baseline:** 15% (lines, branches, functions, statements)
- **Target:** 60% (progressive improvement)
- **Enforcement:** Jest coverage thresholds in `jest.config.ts`

Current frontend coverage (2025-11-28):
- Statements: 16.73%
- Branches: 9.59%
- Functions: 11.32%
- Lines: 16.75%

---

## Test Expectations for New Code

### Unit Tests
- All new modules MUST include unit tests
- Tests should be colocated with source (in `#[cfg(test)]` modules for Rust, `__tests__` directories for TypeScript)
- Minimum expectations:
  - Happy path coverage
  - Error case coverage
  - Edge case coverage where applicable

### Integration Tests
- Required for:
  - API endpoints
  - Database operations
  - WebSocket handlers
  - Cross-module interactions

### Property-Based Tests
- Encouraged for:
  - Parsing logic
  - Consensus algorithms
  - Cryptographic operations
  - Data transformations

---

## Security Requirements

### Mandatory Audits
```bash
# Dependency vulnerability scan
cargo audit

# Container security (in CI)
# Trivy scan on Docker images
```

### Code Standards
- `#![forbid(unsafe_code)]` - No unsafe Rust
- SQLx parameterized queries only (compile-time checked)
- No secrets in code (gitleaks scan in CI)

---

## Security Implementation Status

### Active Security Middleware

**✅ JWT Authentication**
- JWT tokens are properly validated on all protected endpoints
- Token-based user authentication is active and enforced
- Secure token generation and validation implemented

**✅ Rate Limiting**
- User-based rate limiting is active across all API endpoints
- Configurable quotas prevent abuse and ensure fair usage
- Rate limit violations are properly handled and logged

**✅ Audit Logging**
- Comprehensive audit trails are active for all security events
- User actions, authentication attempts, and system events are logged
- Audit logs are tamper-proof and available for compliance review

### Security Architecture
- **Zero Trust Model**: All requests require authentication and authorization
- **Defense in Depth**: Multiple security layers (middleware, validation, logging)
- **Compliance Ready**: Audit trails support regulatory requirements

---

## CI at a Glance

| Check | Command | Gate |
|-------|---------|------|
| Rust format | `cargo fmt --all -- --check` | Hard |
| Rust lint (library) | `cargo clippy --lib --no-default-features -- -D warnings` | Hard |
| Rust tests (library) | `cargo test --lib --no-default-features` | Hard |
| Rust cargo check | `cargo check --no-default-features` | Hard |
| Frontend tests | `npm test -- --watchAll=false` | Hard |
| Frontend coverage | `npm test -- --coverage --watchAll=false` | Hard |
| Frontend type-check | `npm run type-check` | Hard |
| Security audit | `cargo audit` | Hard |
| Rust clippy (all) | `cargo clippy --all-targets --no-default-features` | Soft |
| Integration tests | `cargo test --no-default-features -- --test-threads=1` | Soft |
| Rust benchmarks | `cargo bench --no-default-features` | Soft |

---

## CI/CD Pipeline Jobs

| Job | Purpose | Blocking |
|-----|---------|----------|
| `quality` | Format, lint, type-check | Yes |
| `frontend-test` | Jest tests + coverage | Yes |
| `test` | Rust tests + coverage | Yes |
| `backend-coverage` | Tarpaulin coverage gate | Yes |
| `security` | Cargo audit | Yes |
| `performance` | Benchmarks | No |
| `container` | Docker build + Trivy | Yes |
| `load-test` | k6 SLO validation | No |

---

## Environment Variables

For local development and CI:

```bash
# Required for SQLx offline mode
SQLX_OFFLINE=true

# Logging
RUST_LOG=info

# Test parallelism
RUST_TEST_THREADS=1  # For integration tests
```

---

## Workflow for Contributors

1. **Before committing:**
   ```bash
   cargo fmt --all
   cargo clippy --lib --no-default-features -- -D warnings
   cargo test --lib --no-default-features
   ```

2. **For frontend changes:**
   ```bash
   cd apps/dashboard
   npm test
   npm run lint
   npm run type-check
   ```

3. **Before opening PR:**
   - Ensure all tests pass locally
   - Run full test suite
   - Check coverage hasn't regressed

---

## Escalation Path

If quality gates fail:

1. **Flaky test:** Add `#[ignore]` with issue link, fix within 48h
2. **Legitimate failure:** Fix before merge
3. **Infrastructure issue:** Contact DevOps team

---

## Current Test Coverage & Features

### Test Distribution
- **Backend (Rust):** 481 unit tests covering core orchestration, API handlers, agents, consensus, and security
- **Frontend (React):** 460 tests covering React components, hooks, contexts, and user interactions
- **Coverage Types:** Unit tests, integration tests, UI interaction tests, error case handling

### Notable Implemented Features
- **Settings Management:** Complete profile update, password change, notifications toggles (16 new FE tests)
- **JWT Authentication:** Rate limiting with user-based quotas (10 new tests)
- **POI Settlement System:** Complete reward distribution service (database-driven)
- **Panic Elimination:** Removed 76+ unwrap panics in core systems

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.3 | 2025-11-29 | Updated baseline: 481 backend + 460 frontend = 941 total tests. Fixed performance test threshold. |
| 1.0.2 | 2025-11-29 | Updated baseline: 472 backend + 460 frontend = 932 total tests. Security middleware now active. |
| 1.0.1 | 2025-11-29 | Updated baseline: 472 backend + 367 frontend = 839 total tests. Added Settings feature completion. |
| 1.0.0 | 2025-11-28 | Initial charter - 816 tests baseline |

---

*This document is the law of the land for BIZRA Genesis Node quality standards.*
