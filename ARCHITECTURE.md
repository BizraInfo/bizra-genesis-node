# BIZRA Genesis Node - System Architecture Map

> **Version**: 1.0.0 | **Generated**: 2025-11-26 | **Architect Review**: Production-Ready

---

## Quick Navigation

| Section | Purpose |
|---------|---------|
| [System Overview](#system-overview) | High-level architecture diagram |
| [Core Components](#core-components) | Backend module breakdown |
| [Frontend Architecture](#frontend-architecture) | Dashboard structure |
| [Data Flow](#data-flow) | Request/response pathways |
| [Integration Points](#integration-points) | External system connections |
| [Error Hotspots](#error-hotspots) | Known issues and TODOs |
| [Debugging Guide](#debugging-guide) | Tracing and diagnostics |

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BIZRA GENESIS NODE v1.0.0                             │
│                     Professional AI Orchestration System                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │  React Dashboard │◄──►│   Axum API      │◄──►│  PostgreSQL 15  │             │
│  │  (port 5173)    │    │   (port 3000)   │    │  (port 5432)    │             │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────┘             │
│           │                      │                                              │
│           │              ┌───────┴───────┐                                      │
│           │              │               │                                      │
│           ▼              ▼               ▼                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │
│  │   WebSocket     │  │  Synthesis      │  │     Redis 7     │                 │
│  │   Server        │  │  Orchestrator   │  │   (port 6379)   │                 │
│  └─────────────────┘  └────────┬────────┘  └─────────────────┘                 │
│                                │                                                │
│                    ┌───────────┼───────────┐                                   │
│                    │           │           │                                    │
│                    ▼           ▼           ▼                                    │
│           ┌────────────┐ ┌────────────┐ ┌────────────┐                         │
│           │ Thompson   │ │  Weighted  │ │   Trust    │                         │
│           │ Router     │ │  Consensus │ │   Bridge   │                         │
│           └────────────┘ └────────────┘ └────────────┘                         │
│                    │           │           │                                    │
│                    └───────────┼───────────┘                                   │
│                                ▼                                                │
│                    ┌─────────────────────┐                                     │
│                    │   Local AI Stack    │                                     │
│                    │  (Ollama Models)    │                                     │
│                    │   port 11434        │                                     │
│                    └─────────────────────┘                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Entry Points (`src/bin/`)

| Binary | File | Purpose |
|--------|------|---------|
| `api_server` | `src/bin/api_server.rs:34` | Main HTTP server with graceful shutdown |
| `hivemind_cli` | `src/bin/hivemind_cli.rs` | Command-line orchestration tool |
| `generate-openapi` | `src/bin/generate-openapi.rs` | OpenAPI spec generator |

### 2. Library Root (`src/lib.rs`)

**Core Orchestrator** - Lines 90-211

```rust
SynthesisOrchestrator {
    router: ThompsonRouter,        // Model selection
    ihsan_gate: IhsanGate,         // Quality validation (0.85 floor)
    consensus: WeightedScoreConsensus,
    genesis_validator: GenesisValidator,
    trust_bridge: TrustBridge,     // Ed25519 signing
    impact_tracker: ImpactTracker,
    ai_backend: Box<dyn AIBackend>,
}
```

**Synthesis Pipeline** (8 phases):
1. **Routing** → Thompson Sampling selection
2. **Generation** → AI backend candidates
3. **Scoring** → Ihsan quality gates
4. **Consensus** → WSC with Pareto
5. **Genesis Validation** → Spiritual alignment
6. **Impact** → Proof-of-Impact calculation
7. **Signing** → Cryptographic receipt
8. **Telemetry** → SLI metrics

### 3. Module Architecture

```
src/
├── aegis/                    # AEGIS Multi-Agent Consensus
│   ├── mod.rs               # Re-exports
│   ├── consensus/
│   │   ├── mod.rs
│   │   └── engine.rs        # WeightedSelectiveConsensus
│   ├── error.rs             # AegisError, AegisResult
│   ├── task.rs              # Task definitions
│   └── types.rs             # Agent, AgentId, AgentType
│
├── agents/                   # PAT + SAT Agent Ecosystem
│   ├── mod.rs:20-101        # AgentRole enum (12 roles)
│   ├── pat/                 # Personal Agentic Team (7 agents)
│   │   ├── planner.rs       # Strategic planning
│   │   ├── researcher.rs    # Information gathering
│   │   ├── coder.rs         # Code generation
│   │   ├── evaluator.rs     # Quality assessment
│   │   ├── ethicist.rs      # Ihsan compliance
│   │   ├── publisher.rs     # Output formatting
│   │   └── integrator.rs    # Multi-output synthesis
│   ├── sat/                 # System Agentic Team (5 agents)
│   │   ├── infrastructure.rs
│   │   ├── performance.rs
│   │   ├── security.rs
│   │   ├── backup.rs
│   │   └── resources.rs
│   └── a2a.rs               # Agent-to-Agent communication
│
├── api/                      # REST API Layer
│   ├── mod.rs:30-111        # Router creation with middleware stack
│   ├── auth/                # Authentication
│   │   ├── login.rs         # POST /auth/login
│   │   ├── register.rs      # POST /auth/register
│   │   └── refresh.rs       # POST /auth/refresh
│   ├── health.rs            # GET /health, /health/live, /health/ready
│   ├── metrics.rs           # GET /metrics (Prometheus)
│   ├── telemetry.rs         # GET /telemetry (Glass Cockpit)
│   ├── sat.rs               # SAT-LAB endpoints
│   ├── poi/                 # Proof of Impact
│   │   ├── mod.rs
│   │   ├── types.rs
│   │   └── verifier.rs
│   ├── poi_rewards/         # Reward distribution
│   │   ├── mod.rs
│   │   ├── types.rs
│   │   └── handlers.rs
│   └── alpha_invites.rs     # Alpha program management
│
├── middleware/               # HTTP Middleware Stack
│   ├── mod.rs               # Re-exports
│   ├── cors.rs              # CORS configuration
│   ├── jwt.rs               # JWT validation
│   ├── rbac.rs              # Role-based access control
│   ├── rate_limit.rs        # Rate limiting
│   ├── security_headers.rs  # OWASP headers
│   ├── request_id.rs        # Correlation IDs
│   ├── metrics_middleware.rs
│   └── tracing_context.rs
│
├── models/                   # AI Provider Integration
│   ├── mod.rs:50-100        # Provider architecture
│   ├── traits.rs            # ModelProvider trait
│   ├── ollama.rs            # Ollama local models
│   ├── openai.rs            # OpenAI API
│   ├── anthropic.rs         # Claude API
│   ├── registry.rs          # ProviderRegistry
│   ├── thompson_sampling.rs # Model selection algorithm
│   ├── streaming.rs         # Stream handling
│   ├── rate_limit.rs        # Provider rate limits
│   ├── circuit_breaker.rs   # Resilience patterns
│   └── ab_testing.rs        # Experiment framework
│
├── routing.rs               # Thompson Sampling Router
│   └── ThompsonRouter       # Beta distribution sampling
│
├── consensus.rs             # Weighted-Score Consensus
│   ├── ConsensusEngine
│   └── WeightedScoreConsensus
│
├── scoring.rs               # Ihsan Quality Gates
│   └── IhsanGate           # 4-dimensional scoring
│
├── trust.rs                 # Cryptographic Trust Bridge
│   ├── RunReceipt          # Ed25519 signed receipts
│   ├── TrustBridge         # Signing operations
│   └── ProofOfImpact       # Impact metrics
│
├── rewards/                  # Reward System
│   ├── service.rs          # RewardService
│   └── settlement.rs       # SettlementService
│
├── sat/                      # SAT-LAB System
│   ├── mod.rs
│   ├── lab.rs              # SatOutboxItem, SatRecommendation
│   └── orchestrator.rs     # Campaign orchestration
│
├── observability/            # Monitoring Stack
│   ├── mod.rs
│   ├── metrics.rs          # Prometheus integration
│   └── http.rs             # HTTP metrics handler
│
├── persistence/              # Database Layer (feature-gated)
│   ├── mod.rs
│   ├── agents.rs           # Agent state persistence
│   ├── cache.rs            # Redis caching
│   ├── consensus.rs        # Consensus history
│   ├── poi.rs              # POI records
│   ├── receipts.rs         # Trust receipts
│   └── router.rs           # Router stats
│
├── websocket/                # Real-time Communication
│   ├── mod.rs
│   ├── server.rs           # WebSocket server
│   ├── handlers.rs         # Message handlers
│   ├── session.rs          # Session management
│   ├── types.rs            # Message types
│   ├── encryption.rs       # AES-GCM encryption
│   └── rate_limit.rs       # WS rate limiting
│
├── secrets/                  # Secret Management
│   ├── mod.rs
│   ├── manager.rs          # SecretManager
│   ├── vault.rs            # HashiCorp Vault
│   └── kms.rs              # Google Cloud KMS
│
├── security/                 # Security Features
│   ├── mfa.rs              # Multi-factor auth
│   └── audit/mod.rs        # Audit logging
│
├── autopilot/                # SLO Autopilot
│   └── mod.rs              # Automated SLO responses
│
├── sovereign_stack.rs        # Sovereign model config
├── sovereign_bridge.rs       # Config → MOE bridge
├── genesis_validation.rs     # Spiritual alignment
├── app_state.rs              # AppState struct
└── types.rs                  # Core type definitions
```

---

## Frontend Architecture

### Dashboard Structure (`apps/dashboard/`)

```
apps/dashboard/
├── src/
│   ├── App.tsx              # Route definitions
│   ├── main.tsx             # Entry point
│   │
│   ├── contexts/            # React Context Providers
│   │   ├── AuthContext.tsx  # Authentication state
│   │   ├── WebSocketContext.tsx
│   │   └── OnboardingContext.tsx
│   │
│   ├── pages/               # Route Components
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── Agents.tsx       # Agent management
│   │   ├── Synthesis.tsx    # Synthesis view
│   │   ├── Monitoring.tsx   # System monitoring
│   │   ├── Achievements.tsx # Gamification
│   │   ├── Settings.tsx     # User settings
│   │   ├── Admin.tsx        # Admin panel
│   │   └── TelemetryPlayground.tsx
│   │
│   ├── components/
│   │   ├── agents/          # Agent UI components
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentGrid.tsx
│   │   │   ├── AgentChat.tsx
│   │   │   └── AgentMetrics.tsx
│   │   ├── onboarding/      # Wizard steps
│   │   ├── rewards/         # Reward components
│   │   ├── poi/             # POI dashboard
│   │   ├── telemetry/       # Telemetry widgets
│   │   ├── sacred/          # Sacred geometry UI
│   │   └── ui/              # ~80 shadcn/ui components
│   │
│   ├── services/            # API clients
│   │   ├── api.ts           # Base API service
│   │   ├── poi.ts           # POI service
│   │   └── rewards.ts       # Rewards service
│   │
│   ├── hooks/               # Custom hooks
│   │   ├── useConsciousness.ts
│   │   └── useTelemetryStream.tsx
│   │
│   └── store/               # State management
│
├── package.json             # React 19.2 + Vite 7.2
└── vite.config.ts
```

### Route Map

| Route | Component | Protection |
|-------|-----------|------------|
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/dashboard` | Dashboard | Protected |
| `/agents` | Agents | Protected |
| `/synthesis` | Synthesis | Protected |
| `/monitoring` | Monitoring | Protected |
| `/achievements` | Achievements | Protected |
| `/settings` | Settings | Protected |
| `/admin` | Admin | Protected |
| `/onboarding` | OnboardingWizard | Protected |
| `/telemetry-playground` | TelemetryPlayground | Public |

---

## Data Flow

### Request Lifecycle

```
Client Request
       │
       ▼
┌──────────────────┐
│  request_id      │ ← Add correlation ID
│  middleware      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  CORS layer      │ ← Handle preflight
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  security_headers│ ← OWASP headers
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  RBAC middleware │ ← Extract JWT roles
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  metrics         │ ← Record request metrics
│  middleware      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Rate Limiter    │ ← 2/sec, burst 5
│  (auth routes)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Route Handler   │ ← Business logic
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Database Pool   │ ← SQLx + PgPool
└──────────────────┘
```

### Synthesis Pipeline

```
Task Input
    │
    ▼
┌─────────────────────────────────────┐
│ 1. ROUTING (Thompson Sampling)      │
│    select_route(&available_routes)  │
│    → Beta(α,β) distribution sample  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. CANDIDATE GENERATION             │
│    ai_backend.generate_candidates() │
│    → 3 candidates per route         │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 3. IHSAN SCORING                    │
│    ihsan_gate.score(candidate)      │
│    → Validity, Correctness,         │
│      Safety, Efficiency             │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 4. CONSENSUS (WSC)                  │
│    Composite = 0.4×Acc + 0.3×Safe   │
│              + 0.2×Eff + 0.1×Ihsan  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 5. GENESIS VALIDATION               │
│    Spiritual alignment check        │
│    → Ramadan 2023 principles        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 6. PROOF-OF-IMPACT                  │
│    quality + utility + trust +      │
│    fairness + diversity             │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 7. CRYPTOGRAPHIC RECEIPT            │
│    Ed25519 signature + BLAKE3 hash  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 8. TELEMETRY                        │
│    SLI metrics + quality metrics    │
└─────────────────────────────────────┘
```

---

## Integration Points

### External Dependencies

| System | Purpose | Config |
|--------|---------|--------|
| **PostgreSQL 15** | Primary database | `DATABASE_URL` |
| **Redis 7** | Caching, sessions | `REDIS_URL` |
| **Ollama** | Local AI models | `OLLAMA_BASE_URL` |
| **OpenAI** | Cloud AI (optional) | `OPENAI_API_KEY` |
| **Anthropic** | Claude API (optional) | `ANTHROPIC_API_KEY` |
| **Prometheus** | Metrics collection | Port 9090 |
| **Grafana** | Dashboards | Port 3000 |

### Sovereign Model Stack (`config/bizra-model-stack.toml`)

| Model | Role | Size | Purpose |
|-------|------|------|---------|
| `bizra-planner:latest` | Brain | 6.3 GB | Planning, orchestration |
| `qwen2.5:7b` | Vision | 4.7 GB | Image understanding |
| `llama3.2:latest` | Reasoner | 2.0 GB | Fast filtering |
| `deepseek-r1:8b` | Deep Thinker | 5.2 GB | Code, math, security |
| `kimi-7b-voice` | Voice | TBD | Speech I/O |

### API Endpoints Summary

```
# Health & Monitoring
GET  /health                    → Comprehensive health
GET  /health/live               → Liveness probe
GET  /health/ready              → Readiness probe
GET  /metrics                   → Prometheus metrics
GET  /telemetry                 → Glass Cockpit data
GET  /telemetry/slo             → SLO status

# Authentication
POST /auth/register             → User registration
POST /auth/login                → User login
POST /auth/refresh              → Token refresh

# Alpha Program
POST /alpha/request             → Request access
POST /alpha/accept/:code        → Accept invite
GET  /alpha/requests            → List requests

# SAT-LAB
GET  /api/sat/outbox            → Content for approval
POST /api/sat/outbox/:id/approve
POST /api/sat/outbox/:id/reject
POST /api/sat/outbox/:id/publish
GET  /api/sat/recommendations
POST /api/sat/trigger-cycle

# POI System
GET  /api/poi/attestations
POST /api/poi/attestations
GET  /api/poi/rewards
POST /api/poi/rewards/claim
```

---

## Error Hotspots

### Critical TODOs (24 items in 12 files)

| File | Line | Priority | Issue |
|------|------|----------|-------|
| `middleware/jwt.rs` | 53 | **HIGH** | JWT validation uses placeholder |
| `websocket/handlers.rs` | 76 | **HIGH** | JWT token validation TODO |
| `websocket/handlers.rs` | 122 | MEDIUM | Agent routing not implemented |
| `api/poi/verifier.rs` | 103 | **HIGH** | Ed25519 verification placeholder |
| `rewards/settlement.rs` | 88 | MEDIUM | Ledger integration pending |
| `secrets/kms.rs` | 24-77 | LOW | GCP KMS not implemented |
| `autopilot/mod.rs` | 207-228 | MEDIUM | Safe-mode behavior TODO |
| `api/alpha_invites.rs` | 202, 414 | LOW | Email service integration |
| `sat/orchestrator.rs` | 190 | LOW | JSON parsing improvement |
| `middleware/tracing_context.rs` | 12 | LOW | Tracing propagation |
| `middleware/rate_limiter.rs` | 324 | MEDIUM | JWT user ID extraction |
| `api/telemetry.rs` | 207 | LOW | Epoch service integration |

### Panic/Unwrap Analysis

**335 occurrences across 59 files**

High-risk files (>10 unwraps):
- `src/metrics.rs` - 56 occurrences
- `src/types.rs` - 14 occurrences
- `src/middleware/security_headers.rs` - 14 occurrences
- `src/lib.rs` - 15 occurrences
- `src/parser.rs` - 12 occurrences
- `src/models/anthropic.rs` - 12 occurrences

---

## Debugging Guide

### Logging Levels

```bash
# Verbose all modules
RUST_LOG=trace cargo run --bin api_server

# Specific modules
RUST_LOG=bizra_genesis_node::api=debug cargo run

# SQL queries
RUST_LOG=sqlx=debug cargo run

# Full backtrace
RUST_BACKTRACE=1 cargo run
```

### Key Log Points

| Module | Tracing Event | Purpose |
|--------|---------------|---------|
| `api_server.rs:44` | `🚀 Starting BIZRA...` | Server startup |
| `api_server.rs:59` | `✅ Database connection...` | DB connected |
| `lib.rs:156` | `Selected route: {}` | Routing decision |
| `lib.rs:163` | `Generated {} candidates` | Candidate count |
| `lib.rs:168` | `Consensus reached: {}` | Winner model |
| `lib.rs:190` | `Impact recorded: {}` | POI score |
| `lib.rs:194` | `Receipt signed: {}` | Cryptographic proof |

### Health Check Verification

```bash
# Basic health
curl http://localhost:3000/health

# Kubernetes probes
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready

# Metrics
curl http://localhost:3000/metrics

# Telemetry
curl http://localhost:3000/telemetry
```

### Database Diagnostics

```sql
-- Check connection pool
SELECT count(*) FROM pg_stat_activity WHERE datname = 'bizra_genesis';

-- Migration status
SELECT * FROM _sqlx_migrations ORDER BY installed_on DESC;

-- SAT outbox items
SELECT * FROM sat_outbox_items WHERE status = 'draft';
```

---

## Deployment Architecture

### Kubernetes Resources (`k8s/`)

```
k8s/
├── base/
│   ├── namespace.yaml
│   └── api-deployment.yaml
├── monitoring/
│   ├── enterprise-dashboards.yaml
│   └── genesis-slo-alerts.yaml
├── scaling/
│   └── keda-scaledobjects.yaml
├── istio/
│   └── global-load-balancer.yaml
├── argocd-applications/
│   ├── staging-app.yaml
│   └── production-app.yaml
└── canary-deployment.yaml
```

### CI/CD Workflows (`.github/workflows/`)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR | Build, test, lint |
| `security-scan.yml` | Schedule | Security audits |
| `performance.yml` | Push | Benchmark tracking |
| `e2e-tests.yml` | PR | End-to-end tests |
| `quality-gates.yml` | PR | Quality checks |
| `deploy.yml` | Tag | Deployment |
| `release.yml` | Tag | Release automation |
| `chaos-engineering.yml` | Schedule | Chaos testing |
| `slo-monitor.yml` | Schedule | SLO monitoring |

---

## Quick Reference

### Start Development

```bash
# 1. Start databases
docker-compose -f docker-compose.database.yml up -d

# 2. Run migrations
cargo sqlx migrate run

# 3. Start API server
cargo run --bin api_server

# 4. Start dashboard
cd apps/dashboard && npm run dev
```

### Environment Variables

```bash
# Required
DATABASE_URL=postgres://user:pass@localhost:5432/bizra_genesis
REDIS_URL=redis://localhost:6379/0

# Optional
RUST_LOG=info
PORT=3000
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
JWT_SECRET=
IHSAN_FLOOR=0.85
```

### Feature Flags

```toml
[features]
default = ["simd"]
simd = ["dep:simd-json"]   # SIMD JSON parsing
avx2 = []                  # AVX2 optimizations
avx512 = []                # AVX512 optimizations
prusti = []                # Formal verification
database = []              # PostgreSQL/Redis features
```

---

*Last updated: 2025-11-26 | BIZRA Genesis Node Architecture Map*
