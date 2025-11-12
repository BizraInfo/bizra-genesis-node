# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BIZRA Genesis Node** is a Professional Elite multi-agent consensus system implementing Node-0, a hierarchical cognitive architecture for autonomous AI. The system combines:

- **Rust Core**: Synthesis orchestrator with 18-agent ecosystem (7 PAT + 5 SAT + 6 TAT agents)
- **Node.js Backend**: HTTP API server (port 3006) with metrics and validation endpoints
- **Observability Stack**: Prometheus + Grafana monitoring with 100% dashboard spec coverage
- **Cryptographic Trust**: Ed25519 signatures, BLAKE3 hashing, Proof-of-Impact ledger

**Current Status**: Pre-Alpha (Week 1 of 52-week roadmap), 38/86 features implemented (44%)

**إحسان (Ihsan) Excellence**: All components target 100/100 on a 6-category rubric (Code Quality, Performance, Security, Transparency, Autonomy, User Alignment)

---

## Build Environment Setup

### Prerequisites

**Critical**: This project requires LLVM/libclang for Rust compilation due to RocksDB/bindgen dependencies.

**Windows**:
```bash
# Install LLVM (provides libclang.dll)
choco install llvm

# Or download from: https://releases.llvm.org/
```

**Linux/macOS**:
```bash
# Ubuntu/Debian
sudo apt-get install llvm clang libclang-dev

# macOS
brew install llvm
```

**Verification**:
```bash
# Should find libclang
clang --version
```

---

## Common Commands

### Rust Build & Test

```bash
# Build release binary (optimized)
cargo build --release

# Run all tests (105 test functions across codebase)
cargo test --workspace --no-fail-fast

# Run specific test
cargo test --test integration_tests -- --nocapture

# Run benchmarks (Criterion)
cargo bench --package bizra-moe

# Check without building
cargo check --workspace

# Lint
cargo clippy --workspace -- -D warnings

# Format
cargo fmt --all -- --check
```

### Running the Orchestrator

```bash
# Interactive CLI mode (12-agent orchestration)
cargo run --release -- cli

# Legacy synthesis demo mode
cargo run --release

# Show help
cargo run --release -- help
```

### Observability Stack

```bash
# Start Prometheus + Grafana + Renderer
make obs-up
# Access: http://localhost:9090 (Prometheus), http://localhost:3000 (Grafana)

# Run all observability tests
make obs-test

# Test dashboard spec coverage (≥90%)
make obs-test-spec

# Test Prometheus rule unit tests (≥80%)
make obs-test-rules

# Test scenario coverage - requires running backend (≥60%)
make obs-test-scenario

# View logs
make obs-logs

# Stop stack
make obs-down

# Clean artifacts
make obs-clean
```

### Node.js Backend

```bash
# Start backend API server (port 3006)
cd backend && node server.js

# Metrics endpoints
curl http://localhost:3006/metrics              # JSON format (legacy)
curl http://localhost:3006/metrics/prometheus   # Prometheus text format
curl http://localhost:3006/health               # Health check
```

### LLM Inference Service (vLLM)

```bash
# Local development (requires GPU or CPU fallback)
cd services/llm-inference
make run                    # Start vLLM server (port 8000)

# Docker (GPU-enabled)
make docker-build          # Build CUDA 12.1 + vLLM 0.6.1 image
make docker-run            # Run container with GPU

# Kubernetes deployment
make k8s-apply             # Deploy to K8s (2 replicas, GPU nodes)

# Performance benchmarking
make perf                  # Run validate_vllm_performance.py
```

**Endpoints**:
- `GET /healthz` - Health check
- `GET /metrics` - Prometheus metrics (inference latency, throughput, tokens)
- `POST /generate` - LLM inference (JSON: `{prompt, max_tokens, temperature, top_p, stop[]}`)

**Performance Targets**:
- P95 latency: < 1000ms
- Aggregate throughput: ≥ 30 tokens/sec (good), ≥ 50 tokens/sec (optimal)
- GPU memory utilization: 90%

**Setup Guide**: See `services/llm-inference/WSL-UBUNTU-VLLM-SETUP.md` for WSL2/Ubuntu GPU setup

### Code Coverage (When Build Works)

```bash
# Install coverage tool (cross-platform)
cargo install cargo-llvm-cov

# Generate HTML coverage report
cargo llvm-cov --workspace --html

# Open coverage/html/index.html
```

---

## Architecture Overview

### Hybrid Rust + Node.js Design

**Rust Components** (`src/`):
- `main.rs`: Entry point (CLI vs legacy mode)
- `lib.rs`: Public API and `SynthesisOrchestrator` integration layer
- `consensus.rs`: Weighted-Score Consensus (WSC) with Pareto optimization
- `routing.rs`: Thompson Sampling router (2.3μs latency)
- `scoring.rs`: Ihsan excellence scoring (احسان framework)
- `trust.rs`: Cryptographic receipts (Ed25519 + BLAKE3)
- `agents/`: 18-agent ecosystem (PAT/SAT/TAT hierarchies)
- `performance.rs`: SIMD/AVX2/AVX512 optimizations

**Node.js Backend** (`backend/`):
- `server.js`: Express API server with MetricsCollector
- `prometheus-adapter.js`: Zero-dependency bridge (JSON → Prometheus text format)

**bizra-moe Module** (`bizra-moe/`):
- Mixture of Experts (MoE) orchestration for multi-model AI
- Ollama integration for real LLM ensemble
- Comprehensive benchmarks (`benches/moe_benchmarks.rs`)

**Observability** (`obsv/`):
- `prometheus/`: Config + alert rules + unit tests
- `grafana/`: Dashboard provisioning (7-panel Core KPIs)
- Metrics: 30 total (27 real + 3 simulated: consensus_latency, poi_validation_success_rate)

### Multi-Agent Hierarchy

**Level 4 (Meta)**: Meta-Agent (top coordinator, context integrator)

**Level 3 (Strategic)**:
- Architect: Strategic planning, design decisions, ADRs
- Learning: Continuous improvement, knowledge updates

**Level 2 (Operational)**:
- Operations: DevOps, deployment automation
- Memory: Knowledge graph management, RAG queries
- Trading: Domain specialist (financial/data analysis)

**Level 1 (Workers)**:
- Security: Threat monitoring, policy compliance
- Additional workers spawned on-demand

**Hierarchy Benefits**:
- O(n) communication complexity vs O(n²) flat architecture
- 21× throughput improvement on critical tasks
- 91% of runtime is coordination overhead (expected for complex tasks)

### Proof-of-Impact Ledger

**Consensus Model**: Weighted-Quorum DAG
- Each action scored across 5 dimensions: Quality (30%), Utility (30%), Trust (20%), Fairness (10%), Diversity (10%)
- Cryptographic attestation: Ed25519 signatures + SHA-256 hashes
- Genesis Block 0: "Excellence in genesis – transparent, sovereign, verifiable" (إحسان principle)
- Target: 99.9% uptime, <30min RTO

### Critical Integration: Prometheus Adapter

**Problem Solved**: Backend serves JSON metrics, but Prometheus expects text exposition format.

**Solution** (`backend/prometheus-adapter.js`):
- Zero-dependency adapter (<1ms overhead)
- RFC-compliant Prometheus format
- Exposes 30 metrics at `/metrics/prometheus`
- Preserves legacy `/metrics` endpoint (JSON)

**Metrics Bridge Flow**:
```
MetricsCollector (Node.js JSON)
  → prometheus-adapter.js (format conversion)
  → GET /metrics/prometheus (Prometheus text)
  → Prometheus scrapes every 5s
  → Grafana visualizes + alerts
```

---

## Key Technical Constraints

### Performance Targets (SLO)

From paper and `.performance-baselines.json`:
- **API Latency**: P95 <300ms, P99 <500ms
- **Error Rate**: <1% (5xx responses)
- **Consensus**: <50μs latency
- **PoI Validation**: >99% success rate
- **Throughput**: 523,793 req/s (validation API, 21× baseline)

### Security Requirements

- **Zero unsafe code**: `#![forbid(unsafe_code)]` in lib.rs
- **Cryptographic signing**: All ledger entries Ed25519 signed
- **Privacy**: No raw user data leaves node (hash-only attestations)
- **Grafana**: Viewer-only tokens, no anonymous access, signed plugins only

### Ihsan Excellence Framework

6-category scoring (0-100 scale):
1. **Code Quality**: 0 lint errors, 0 memory leaks, 80%+ test coverage
2. **Performance**: Meet all SLO targets, efficient resource usage
3. **Security**: Zero vulnerabilities, proper crypto, no unsafe code
4. **Transparency**: Every output has citation/trace, zero unverifiable assumptions
5. **Autonomy**: Self-organizing, minimal human intervention required
6. **User Alignment**: Meets requirements, ethical constraints enforced

**Target**: 100/100 = "Professional Elite Practitioner: ULTIMATE"

---

## Production Hardening

### Kubernetes Security Policies

**Location**: `infra/k8s/policies/`

**Kyverno Policies**:
- `image-verification.yaml` - Enforce Cosign signatures on all container images
- `secure-baseline.yaml` - Pod Security Standards (runAsNonRoot, no privilege escalation, etc.)

```bash
# Apply policies (requires Kyverno installed)
kubectl apply -f infra/k8s/policies/
```

### Progressive Delivery (Argo Rollouts)

**Location**: `infra/k8s/rollouts/`

**Rollout Strategies**:
- `api-rollout.yaml` - Canary deployment with automatic rollback on error rate spike
- `analysis-templates.yaml` - Prometheus metric analysis for automated promotion/rollback

```bash
# Apply rollouts (requires Argo Rollouts installed)
kubectl apply -f infra/k8s/rollouts/
```

### SLO Burn-Rate Alerts

**Location**: `obsv/prometheus/alerts/slo.yaml`

**Multi-Window Burn Rate Alerting**:
- Fires when error budget consumption rate exceeds sustainable levels
- Uses 1h and 5m windows for fast detection
- Aligns with SRE best practices (Google SRE Workbook Ch. 5)

```bash
# Alerts automatically loaded by Prometheus from obsv/prometheus/alerts/
# Verify:
curl http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name == "slo_burn_rate")'
```

### Incident Response Runbooks

**Location**: `docs/runbooks/`

**Available Runbooks**:
- `api-slo.md` - API error rate above threshold response procedures

**Format**: Step-by-step diagnosis → mitigation → resolution → post-incident review

### Chaos Engineering

**Status**: Templates available, requires Chaos Mesh installation

**Planned Drills**:
- Pod kill tests
- Network latency injection
- Resource exhaustion scenarios

**See**: `docs/strategy/README_FLAGSHIP_PROOF.md` for complete assurance drill catalog

### Disaster Recovery

**Backup Strategy**: Velero scheduled backups (when deployed to K8s)
**RTO Target**: < 30 minutes
**RPO Target**: < 1 hour

---

## Current Known Issues

### Build Failures

**Issue**: Rust compilation fails on Windows with:
```
Unable to find libclang: "couldn't find any valid shared libraries matching:
['clang.dll', 'libclang.dll']"
```

**Fix**: Install LLVM (see "Build Environment Setup" above)

### Simulated Metrics

**Issue**: 3/30 metrics are hardcoded placeholders:
- `bizra_consensus_latency_microseconds`: Currently 45μs (simulated)
- `bizra_poi_validation_success_rate`: Currently 0.995 (99.5%, simulated)

**Todo**: Instrument actual Rust code (`src/consensus.rs`, `src/trust.rs`) to export real Prometheus metrics

### Live Integration Tests Pending

**Issue**: Observability scenario coverage tests require running backend + stack

**Status**: Static validation complete (100% spec coverage), live tests blocked by build issue

---

## Testing Philosophy

### Test Organization

- **Unit Tests**: Inline `#[test]` functions (105 total across codebase)
- **Integration Tests**: `bizra-moe/tests/integration_tests.rs`
- **Benchmarks**: `bizra-moe/benches/moe_benchmarks.rs` (Criterion)
- **Observability Tests**: `scripts/*.mjs` (dashboard spec, panel assertions, coverage)

### Observability 4-Layer Coverage

1. **Spec Coverage (Static, ≥90%)**: Dashboard structure validation → **100% achieved**
2. **Rule Coverage (Semantic, ≥80%)**: Prometheus rule unit tests → **100% ready**
3. **Scenario Coverage (Behavior, ≥60%)**: Panel data assertions → **Pending live tests**
4. **Visual Coverage (Presentation, ≥80%)**: Visual regression → **Framework ready**

### Running Tests

```bash
# Rust tests (BLOCKED by build issue)
cargo test --workspace --no-fail-fast

# Observability tests
make obs-test

# Specific observability layer
make obs-test-spec    # Dashboard validation (works offline)
make obs-test-rules   # Rule unit tests (requires promtool/Docker)
make obs-test-scenario # Panel data checks (requires running backend)
```

---

## Important Files & Locations

### Documentation

- `README.md`: Project overview, badges, feature list
- `ROADMAP_2025.md`: 52-week development plan (5 phases)
- `IMPLEMENTED.md`: Verified production-ready features
- `FEATURE_STATUS.md`: All 86 features tracked
- `docs/OBSERVABILITY_*.md`: 5 comprehensive observability guides (2,550+ lines)
- `OBSERVABILITY_VALIDATION_REPORT.md`: Test results, 85.5% production readiness

### Configuration

- `Cargo.toml`: Rust workspace (main + bizra-moe)
- `docker-compose.obsv.yml`: Observability stack definition
- `Makefile`: Convenience targets for observability
- `.env.observability.example`: All environment variables documented
- `obsv/prometheus/prometheus.yml`: Prometheus scraping config
- `obsv/prometheus/rules/bizra-slos.yml`: SLO alert rules (5 alerts + 2 recording rules)

### Code Entry Points

- `src/main.rs`: CLI vs legacy mode dispatcher
- `src/lib.rs`: Public API, `SynthesisOrchestrator` integration layer
- `backend/server.js`: Express API server
- `backend/prometheus-adapter.js`: Metrics format bridge
- `services/llm-inference/models/bizra-agentic-v1/serve_vllm_production.py`: vLLM inference server

### Agent Definitions

- `src/agents/pat/`: Personal Agent Team (7 agents)
- `src/agents/sat/`: Synthesis Agent Team (5 agents)
- `src/agents/tat/`: Task Agent Team (6 agents)

### Production Infrastructure

- `infra/k8s/policies/`: Kyverno security policies (image verification, secure baseline)
- `infra/k8s/rollouts/`: Argo Rollouts canary deployment configs
- `docs/runbooks/`: Incident response procedures
- `docs/research/`: Archived research notes (AlphaEvolve, DeepSeek)
- `docs/strategy/`: Business and governance documentation

---

## Development Workflow

### Before Starting Work

1. **Check build environment**:
   ```bash
   clang --version  # Verify libclang available
   cargo check      # Verify compilation works
   ```

2. **Review project status**:
   ```bash
   cat STATUS_SUMMARY.md              # Current phase and blockers
   cat FEATURE_STATUS.md | grep TODO  # Incomplete features
   ```

3. **Start observability stack** (if working on metrics/monitoring):
   ```bash
   export GF_ADMIN_PASS='your-password'
   make obs-up
   ```

### Adding New Features

1. **Check roadmap phase**: `ROADMAP_2025.md` - Are we in Phase 1 (Foundation)?
2. **Verify Ihsan criteria**: Will this meet 100/100 Professional Elite standards?
3. **Add tests first**: Follow TDD, target 80%+ coverage
4. **Document in real-time**: Update relevant `.md` files as you code
5. **Benchmark if performance-critical**: Use Criterion (`cargo bench`)

### Committing Changes

**Commit Message Format** (from project style):
```
<type>: <subject>

<body with details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

**Git Hooks**: None configured, but changes are auto-formatted (Rust: `cargo fmt`)

---

## Debugging Tips

### Rust Compilation Issues

```bash
# Verbose compilation
RUST_BACKTRACE=1 cargo build --verbose

# Check specific dependency
cargo tree | grep rocksdb

# Clean rebuild
cargo clean && cargo build --release
```

### Observability Stack Issues

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Prometheus metrics scraping
curl http://localhost:9090/api/v1/query?query=up{job="bizra-genesis"}

# Check Grafana datasource
curl http://localhost:3000/api/datasources

# View Prometheus logs
docker logs obsv-prometheus-1

# View Grafana logs
docker logs obsv-grafana-1
```

### Backend Metrics Issues

```bash
# Test Prometheus endpoint
curl http://localhost:3006/metrics/prometheus | head -20

# Verify metrics format
curl http://localhost:3006/metrics/prometheus | grep "^# HELP"

# Check backend logs
cd backend && node server.js  # Watch console output
```

---

## Project Philosophy & Standards

### إحسان (Ihsan) - Excellence Principle

From the Arabic إحسان, meaning "to do something in the most excellent way." Every component must:
- Be transparent (zero unverifiable assumptions)
- Be verifiable (cryptographic proofs, tests, benchmarks)
- Meet performance targets (not "good enough", but "Professional Elite")
- Provide citations (all knowledge traceable to sources)

### Professional Elite Practitioner Standard

Inspired by world-class engineering practices:
- **SDLC rigor**: Requirements → Design → Implementation → Testing → Documentation
- **Self-critique**: Identify gaps, fix them immediately
- **Quantitative targets**: Not "fast", but "P95 <300ms, measured"
- **Zero compromise**: 100/100 Ihsan or iterate until achieved

### Autonomous Multi-Agent Cognition

The system is designed to operate autonomously with minimal human intervention:
- Hierarchical planning (Meta-Agent → specialist agents)
- Self-organizing task decomposition
- Continuous learning from experiences
- Ethical constraints enforced by design (Security agent, FATE checks)

---

## Additional Resources

### Internal Documentation

- **Observability**: 5 guides in `docs/OBSERVABILITY_*.md` (Quick Reference, Integration, Troubleshooting, Architecture, Test Coverage)
- **Status Reports**: `STATUS_SUMMARY.md`, `CI_STATUS_REPORT.md`, `OBSERVABILITY_VALIDATION_REPORT.md`
- **Architecture**: `BIZRA-Genesis-Blueprint.md`, `docs/OBSERVABILITY_ARCHITECTURE_INTEGRATION.md`

### External Links

- **Prometheus Exposition Format**: https://prometheus.io/docs/instrumenting/exposition_formats/
- **Grafana Provisioning**: https://grafana.com/docs/grafana/latest/administration/provisioning/
- **Rust Performance Book**: https://nnethercote.github.io/perf-book/
- **Ed25519 Spec**: https://ed25519.cr.yp.to/

### Paper Reference

This codebase implements the architecture described in:
**"BIZRA-LAB Node-0: A Hierarchical Multi-Agent Cognitive Architecture for Scalable and Ethical AI"**
by Mohamed beshr Hassan, BIZRA Lab, Dubai (October 24, 2025)

Key concepts from paper:
- 7-year development journey ("exile")
- Hierarchical coordination (4-tier agent hierarchy)
- Proof-of-Impact ledger (5-dimension scoring)
- Ihsan excellence framework
- 21× throughput improvement vs baseline
- 523,793 req/s validation API performance

---

## Quick Reference Card

```bash
# Essential commands for daily work

# Build & Test
cargo build --release          # Build optimized binary
cargo test --workspace         # Run all tests
cargo bench                    # Run benchmarks

# Run orchestrator
cargo run --release -- cli     # Interactive mode

# Observability
make obs-up                    # Start Prometheus + Grafana
make obs-test                  # Run all observability tests
make obs-down                  # Stop stack

# Backend
cd backend && node server.js   # Start API server

# Check status
cat STATUS_SUMMARY.md          # Current phase & metrics
git status                     # Uncommitted changes
```

**Remember**: This is a **Professional Elite** implementation. Every change must meet the Ihsan 100/100 standard.

**إحسان (Excellence)** | **شَفَّافِيَّة (Transparency)** | **سِيَادَة (Sovereignty)**
