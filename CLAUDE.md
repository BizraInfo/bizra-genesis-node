# CLAUDE.md - BIZRA Genesis Node

## Project Overview

BIZRA Genesis Node (v1.0.0) is a professional-grade AI orchestration system built in Rust implementing advanced routing, consensus, and cryptographic verification for multi-model AI systems. Features zero unsafe code and production-quality core components.

## Tech Stack

- **Backend**: Rust 2021 (Tokio async runtime, Axum 0.7 web framework)
- **Database**: PostgreSQL 15 + Redis 7 (SQLx 0.8 for compile-time checked queries)
- **Frontend**: React 19.2 + Vite 7.2 + TypeScript (in `apps/dashboard/`)
- **Cryptography**: Ed25519-dalek + BLAKE3 + AES-GCM
- **Networking**: libp2p, Quinn (QUIC), tonic (gRPC)
- **Observability**: Prometheus + Grafana + tracing

## Quick Commands

### Building & Running

```bash
cargo build --release                  # Build optimized
cargo run --bin api_server --release   # Start API server (port 3000)
cargo run --bin hivemind_cli           # Run Hivemind CLI
cargo check --all-features             # Fast compile check
SQLX_OFFLINE=true cargo build          # Build without live database
```

### Testing

```bash
cargo test --all-features          # Run all tests
cargo test --lib                   # Unit tests only
cargo test --test '*'              # Integration tests only
cargo test -- --nocapture          # With output
```

### Code Quality

```bash
cargo fmt --all                    # Format code
cargo clippy --all-targets --all-features -- -D warnings  # Lint
cargo audit                        # Security audit
```

### Database

```bash
docker-compose -f docker-compose.database.yml up -d   # Start DB
cargo sqlx migrate run             # Run migrations
cargo sqlx migrate info            # Check migration status
```

### Frontend (apps/dashboard/)

```bash
cd apps/dashboard
npm run dev                        # Dev server
npm run build                      # Production build
npm run test                       # Run tests
npm run lint                       # ESLint
```

## Project Structure

```
src/
├── lib.rs              # Main library entry
├── bin/
│   ├── api_server.rs       # API server entry point
│   ├── hivemind_cli.rs     # Hivemind CLI tool
│   ├── generate-openapi.rs # OpenAPI spec generator
│   └── compile_test.rs     # Compilation verification
├── aegis/              # Multi-agent consensus system
├── agents/
│   ├── pat/            # 7 PAT agents (planner, researcher, coder, etc.)
│   └── sat/            # 5 SAT agents (security, performance, backup, etc.)
├── api/
│   ├── auth/           # Authentication endpoints
│   ├── poi/            # Proof of Impact system
│   ├── poi_rewards/    # POI rewards distribution
│   ├── middleware/     # API-specific middleware
│   └── *.rs            # Other API routes
├── auth/               # Auth utilities and claims
├── middleware/         # Global middleware (JWT, rate limit, CORS, RBAC)
├── models/             # AI provider integrations (Ollama, OpenAI, Anthropic)
├── observability/      # Tracing, metrics collection
├── persistence/        # Database layer (agents, cache, consensus, POI)
├── rewards/            # Rewards engine
├── sat/                # SAT-LAB system
├── secrets/            # Secret management (KMS, Vault)
├── security/           # MFA, audit logging
├── websocket/          # WebSocket server and handlers
├── routing.rs          # Thompson Sampling router
├── consensus.rs        # Weighted-score consensus
├── scoring.rs          # Ihsan quality gates (4-dimensional)
├── trust.rs            # Ed25519 + BLAKE3 cryptographic receipts
├── sovereign_bridge.rs # Sovereign system bridge
├── sovereign_stack.rs  # Sovereign stack configuration
├── app_state.rs        # Application state management
└── autopilot/          # Autopilot automation system

apps/dashboard/         # React frontend
├── src/components/     # UI components (agents, onboarding, rewards, etc.)
├── src/pages/          # Page routes
├── src/services/       # API services
├── src/store/          # State management
└── src/hooks/          # Custom React hooks

bizra-moe/              # Mixture of Experts workspace member
tests/                  # Integration tests
benches/                # Criterion benchmarks
migrations/             # PostgreSQL migrations (SQLx)
.sqlx/                  # SQLx offline query cache
config/                 # model-registry.toml, bizra-model-stack.toml
k8s/                    # Kubernetes manifests
```

## Key Architecture Patterns

1. **Thompson Sampling Router** (`src/routing.rs`): Multi-armed bandit for model selection
2. **Weighted-Score Consensus** (`src/consensus.rs`): Multi-dimensional consensus combining models
3. **Ihsan Quality Scoring** (`src/scoring.rs`): 4 dimensions - Validity, Correctness, Safety, Efficiency (threshold: 0.85)
4. **Cryptographic Trust Bridge** (`src/trust.rs`): Signed receipts for verifiable decisions
5. **AEGIS Agent System** (`src/aegis/`): 7 PAT + 5+ SAT specialized agents

## Environment Variables

### Required
```bash
DATABASE_URL=postgres://user:pass@localhost:5432/bizra_genesis
REDIS_URL=redis://localhost:6379/0
```

### Optional
```bash
RUST_LOG=info                      # Logging level
PORT=3000                          # Server port
ANTHROPIC_API_KEY=                 # For Claude models
OLLAMA_BASE_URL=http://localhost:11434  # Local Ollama
JWT_SECRET=                        # JWT signing key
IHSAN_FLOOR=0.85                   # Min quality threshold
```

## API Endpoints

```
# Health & Metrics
GET  /health              # Liveness probe
GET  /metrics             # Prometheus metrics

# Authentication
POST /auth/register       # User registration
POST /auth/login          # User login
POST /auth/refresh        # Refresh token

# Alpha Program
POST /alpha/request       # Request alpha access

# SAT-LAB
GET  /api/sat/outbox      # SAT content for approval

# POI (Proof of Impact)
GET  /api/poi/attestations     # Get attestations
POST /api/poi/attestations     # Create attestation
GET  /api/poi/rewards          # Get rewards info
POST /api/poi/rewards/claim    # Claim rewards

# Telemetry
GET  /api/telemetry/stream     # SSE telemetry stream
```

## Database Schema

Key tables: `users`, `agent_metrics`, `consensus_results`, `trust_receipts`, `poi_attestations`, `poi_rewards`, `sat_campaigns`, `sat_approvals`

Migrations are in `/migrations` directory, managed by SQLx.

## Testing Strategy

- **Unit tests**: In-source with `#[cfg(test)]`
- **Integration tests**: `tests/*.rs`
- **E2E tests**: `tests/e2e_*.rs`
- **Benchmarks**: `benches/*.rs` (Criterion)
- **Property-based**: proptest for edge cases

## Development Workflow

1. Start databases: `docker-compose -f docker-compose.database.yml up -d`
2. Run migrations: `cargo sqlx migrate run`
3. Build: `cargo build --all-features`
4. Test: `cargo test --all-features`
5. Run: `cargo run --bin api_server --release`
6. Verify: `curl http://localhost:3000/health`

## Code Conventions

- **No unsafe code**: `#![forbid(unsafe_code)]` enforced
- **Error handling**: Use `anyhow` for applications, `thiserror` for libraries
- **Async**: Tokio runtime, avoid blocking operations
- **SQL**: Always use SQLx parameterized queries (compile-time checked)
- **Logging**: Use `tracing` macros (`info!`, `debug!`, `error!`)

## Feature Flags

```toml
[features]
default = ["simd"]
simd = ["dep:simd-json"]   # SIMD JSON parsing
avx2 = []                  # AVX2 optimizations
avx512 = []                # AVX512 optimizations
prusti = []                # Formal verification with Prusti
database = []              # PostgreSQL/Redis features
```

## Service Ports

| Service | Port |
|---------|------|
| API Server | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Prometheus | 9090 |
| PgAdmin | 5050 |

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` - Main CI pipeline
- `security-scan.yml` - Security audits
- `performance.yml` - Benchmark tracking
- `e2e-tests.yml` - End-to-end tests
- `quality-gates.yml` - Quality gate checks
- `deploy.yml` - Deployment pipeline
- `release.yml` - Release automation
- `chaos-engineering.yml` - Chaos testing
- `slo-monitor.yml` - SLO monitoring
- `p1_1_db_e2e.yml` - Database E2E tests
- `p1_2_observability.yml` - Observability pipeline
- `p1_3_e2e_pipeline.yml` - Full E2E pipeline
- `p1_4_performance_benchmarking.yml` - Performance benchmarks
- `p1_5_security.yml` - Security hardening
- `accessibility-testing.yml` - A11y testing
- `professional-verification.yml` - Production verification

## Debugging

```bash
RUST_LOG=trace cargo run --bin api_server   # Verbose logging
RUST_BACKTRACE=1 cargo run                  # With backtraces
RUST_LOG=sqlx=debug cargo run               # SQL query logging
```

## SQLx Offline Mode

The project includes pre-generated SQLx query cache in `.sqlx/` for building without a live database:

```bash
# Build without database connection
SQLX_OFFLINE=true cargo build

# Regenerate SQLx cache (requires running database)
cargo sqlx prepare
```

## Workspace Structure

This is a Cargo workspace with:
- Root package: `bizra-genesis-node`
- Member: `bizra-moe` (Mixture of Experts implementation)

## Key Dependencies

| Category | Crate | Purpose |
|----------|-------|---------|
| Async | tokio | Async runtime |
| Web | axum | HTTP framework |
| Database | sqlx 0.8 | Async SQL with compile-time checks |
| Database | redis | Caching layer |
| Database | rocksdb | Embedded KV store |
| Crypto | ed25519-dalek | Digital signatures |
| Crypto | blake3 | Fast hashing |
| Crypto | aes-gcm | Symmetric encryption |
| P2P | libp2p | Decentralized networking |
| P2P | quinn | QUIC transport |
| Metrics | prometheus | Observability |
| API | utoipa | OpenAPI documentation |
| WebSocket | tokio-tungstenite | Real-time communication |

## Windows Development Notes

On Windows, set environment variables with:
```powershell
$env:SQLX_OFFLINE="true"
$env:DATABASE_URL="postgres://user:pass@localhost:5432/bizra_genesis"
cargo build
```

Or use `set` in CMD:
```cmd
set SQLX_OFFLINE=true
cargo build
```

## System Validation Status (2025-11-27 - Updated)

### Build Status
| Component | Status | Details |
|-----------|--------|---------|
| Rust Backend | PASS | 343 tests pass, 28 dead code warnings |
| hivemind_cli | PASS | All CLI dependencies resolved |
| Frontend Build | PASS | Code-split chunks (2.2MB total) |
| 3D Visualization | PASS | Citadel engine operational |
| SQLx Offline | PARTIAL | 12/17 queries cached |

### Bundle Analysis (Code-Split)
| Chunk | Size | Gzipped |
|-------|------|---------|
| vendor-react | 62 KB | 21 KB |
| vendor-animation | 118 KB | 39 KB |
| vendor-three | 1,420 KB | 398 KB |
| index (app) | 591 KB | 138 KB |

### Test Results
| Suite | Passed | Failed | Notes |
|-------|--------|--------|-------|
| Rust Unit Tests | 343 | 0 | All core systems verified |
| Frontend Build | PASS | - | Vite production build |
| Integration Tests | - | - | Require database |

### Security Audit
| Finding | Severity | Status |
|---------|----------|--------|
| instant (unmaintained) | Warning | libp2p dependency |
| number_prefix (unmaintained) | Warning | indicatif dependency |
| paste (unmaintained) | Warning | statrs/nalgebra chain |
| proc-macro-error (unmaintained) | Warning | utoipa dependency |
| **No Critical Vulnerabilities** | - | Clean audit |

### Codebase Metrics
- **Rust Source Files**: 124
- **TypeScript/TSX Files**: 184 (+4 citadel components)
- **Total Rust LOC**: ~23,358
- **Toolchain**: Rust 1.90.0, Cargo 1.90.0

### New Components Added
- `src/constants/brand.ts` - BIZRA brand identity
- `src/store/useBizraStore.ts` - Zustand state management
- `src/components/citadel/` - 3D visualization engine
  - `Citadel.tsx` - 15,000 hour monument (GPU instanced)
  - `SeedOfLife.tsx` - Sacred geometry logo
  - `Environment.tsx` - Lighting, fog, post-processing
  - `GlassInterface.tsx` - Glassmorphism UI overlay
- `src/pages/Landing.tsx` - Main 3D landing page

### Verified Core Systems
- Thompson Sampling Router
- Weighted-Score Consensus Engine
- Ihsan Quality Gates (4-dimensional scoring)
- Cryptographic Trust Bridge (Ed25519 + BLAKE3)
- AEGIS Multi-Agent System (7 PAT + 5 SAT agents)
- WebSocket Server with Rate Limiting
- Sovereign Stack Configuration
- **NEW: 3D Citadel Visualization Engine**
- **NEW: BIZRA Brand Identity System**
- Rewards Engine & Settlement Service

## DevOps & Pipeline Architecture

### CI/CD Pipeline Stages
```
┌─────────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline Flow                          │
├─────────────────────────────────────────────────────────────────────┤
│  1. Quality Gate     │  2. Test Suite      │  3. Security          │
│  ├─ cargo fmt        │  ├─ Unit tests      │  ├─ cargo audit       │
│  ├─ cargo clippy     │  ├─ Integration     │  ├─ Trivy scan        │
│  └─ cargo check      │  └─ Coverage        │  └─ Dependency check  │
├─────────────────────────────────────────────────────────────────────┤
│  4. Performance      │  5. Container       │  6. Release           │
│  ├─ Benchmarks       │  ├─ Docker build    │  ├─ Tag version       │
│  ├─ k6 load tests    │  ├─ Push registry   │  ├─ Changelog         │
│  └─ SLO validation   │  └─ Vulnerability   │  └─ GitHub Release    │
└─────────────────────────────────────────────────────────────────────┘
```

### SLO Contract (`ops/slo.yaml`)
| Metric | Target | Enforcement |
|--------|--------|-------------|
| P95 Latency | ≤500ms | CI/CD gate |
| P99 Latency | ≤1000ms | Alerting |
| Error Rate | ≤1% (5xx) | CI/CD gate |
| Availability | 99.95% | Error budget |
| Throughput | ≥1000 RPS | Load test |
| Cold Start | ≤15s | Smoke test |

### Quality Gates
```yaml
# Pre-merge (required)
- Unit tests: 80% pass rate
- Lint check: zero warnings (-D warnings)
- Security audit: 0 critical vulnerabilities
- Coverage: 70% target

# Pre-deploy (required)
- Integration tests: all pass
- Load tests: SLO compliance
- Security scan: container + dependencies
- Smoke tests: health endpoints
```

### Load Testing
```bash
# Run k6 baseline tests
cd load-tests
k6 run k6-baseline.js

# Run with custom options
k6 run --vus 100 --duration 5m k6-baseline.js
```

### Error Budget
- **Monthly Budget**: 21.6 minutes (based on 99.95% SLO)
- **Fast Burn Alert**: 14.4x consumption rate (depletes in 2 days)
- **Slow Burn Alert**: 6x consumption rate (depletes in 5 days)
- **Deploy Freeze**: Triggered at 75% budget consumed
- **Incident Response**: Triggered at 90% budget consumed

### Observability Stack
| Component | Tool | Port |
|-----------|------|------|
| Metrics | Prometheus | 9090 |
| Dashboards | Grafana | 3001 |
| Tracing | Jaeger | 16686 |
| Logging | Loki | 3100 |
| Alerting | Alertmanager | 9093 |

### Incident Response
1. **P1 (Critical)**: Ack within 5 min, mitigation within 15 min
2. **P2 (High)**: Ack within 15 min, mitigation within 1 hour
3. **P3 (Medium)**: Ack within 1 hour, mitigation within 4 hours
4. **Post-Incident Review**: Within 72 hours

### Deployment Strategies
- **Canary**: 10% traffic for 30 min observation
- **Blue-Green**: Full switchover with instant rollback
- **Rolling**: Gradual pod replacement with health checks

### Infrastructure Directories
```
ops/                    # Operations configuration
├── slo.yaml           # SLO contract (enforced by CI)
├── observability/     # Prometheus, Grafana configs
├── CHANGE_CONTROL.md  # Change management process
└── ignite.sh          # Bootstrap script

load-tests/            # Performance testing
├── k6-baseline.js     # Standard load test
└── README.md          # Testing documentation

evidence/              # Audit trail
├── SEC-01.1-*.md      # Security audit evidence
├── PERF-01.3-*.md     # Performance test results
└── gitleaks-*.json    # Secret scanning reports

k8s/                   # Kubernetes manifests
├── deployment.yaml    # Pod specifications
├── service.yaml       # Service definitions
└── ingress.yaml       # Ingress rules
```

### Secrets Management
- **Local**: `.env` files (gitignored)
- **CI/CD**: GitHub Secrets
- **Production**: HashiCorp Vault / AWS KMS
- **Rotation**: Every 90 days (automated)

### Branch Protection Rules
- `main`: Requires PR, 1 approval, passing CI, no force push
- `develop`: Requires passing CI
- Feature branches: `feature/*`, `fix/*`, `chore/*`

## Brand Identity & 3D Visualization

### BIZRA Brand System
Based on Sacred Geometry - Seed of Life pattern (البذرة - "The Seed")

**Color Palette:**
| Name | Hex | Usage |
|------|-----|-------|
| Genesis Gold | `#C9A962` | Primary brand, highlights |
| Gold Light | `#F9F1D8` | Accents, glow effects |
| Gold Dark | `#8A6B2E` | Shadows, depth |
| Deep Space Navy | `#050B14` | Background |
| Growth Teal | `#2A9D8F` | Secondary accent |

**Typography:**
- Playfair Display (Serif) - Headlines, spiritual messaging
- Inter (Sans) - UI, body text
- Amiri (Arabic) - Arabic script: البذرة

### 3D Visualization Engine (`apps/dashboard/src/components/citadel/`)

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│  Landing Page (/landing, /genesis)                      │
├─────────────────────────────────────────────────────────┤
│  GlassInterface.tsx    │  Canvas (React Three Fiber)   │
│  ├─ Phase transitions  │  ├─ Environment.tsx           │
│  ├─ Animated counters  │  │  ├─ Lighting (Gold/Teal)   │
│  └─ Glassmorphism UI   │  │  ├─ Post-processing        │
│                        │  │  └─ Stars background       │
│                        │  ├─ SeedOfLife.tsx            │
│                        │  │  └─ Sacred geometry logo   │
│                        │  └─ Citadel.tsx               │
│                        │     └─ 15,000 instanced blocks│
└─────────────────────────────────────────────────────────┘
```

**Performance Optimizations:**
- GPU Instancing: 15,000 objects in single draw call (O(1))
- Code splitting: Three.js in separate chunk (~1.4MB)
- Zustand: Transient state outside React render cycle

**Phase System:**
1. `VOID` - Initial state, animated Nuqta (dot)
2. `GENESIS` - Metrics reveal (POI, Hours)
3. `CITADEL` - Full 3D monument visualization
4. `FLIGHT` - Ascending camera view

**Access Routes:**
- `/landing` - Public showcase
- `/genesis` - Alias for landing
