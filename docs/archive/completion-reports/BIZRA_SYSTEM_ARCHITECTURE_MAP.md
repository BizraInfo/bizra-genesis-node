# BIZRA Genesis Node - Comprehensive System Architecture Map

> **Senior Codebase Architect Analysis** | **Version**: 1.0.0 | **Last Updated**: 2025-11-29 | **System Type**: AI-Orchestration Monolithic with Multi-Agent Consensus

---

## 📊 Quick Reference Navigation

| Section | Focus | Critical Paths | Error Hotspots |
|---------|--------|----------------|----------------|
| [System Overview](#system-overview) | High-level architecture | Synthesis Pipeline | ⚠️ 335 unwrap() locations |
| [Technology Stack](#technology-stack) | Dependencies & Infra | HTTP Request Flow | 🔴 JWT validation TODO |
| [Backend Module Hierarchy](#backend-module-hierarchy) | Rust Component Map | Consensus Engine | 🔴 Ed25519 verification |
| [Frontend Component Architecture](#frontend-component-architecture) | React Structure | WebSocket Real-time | ⚠️ 14 rate-limiting issues |
| [Data Flow & Integrations](#data-flow--integrations) | Request Lifecycles | DB Pool Connections | 🔴 Ledger integration TODO |
| [Error Hotspots Matrix](#error-hotspots-matrix) | Known Issues | Debugging Pathways | 📊 12 files with unwraps >10 |
| [Debugging & Observability](#debugging--observability) | Tracing Strategies | Health Checks | 🔍 Prometheus metrics |

**System Characteristics:**
- **Lines of Code**: ~50K+ Rust, ~20K+ TypeScript
- **Modules**: 47 backend, 80+ frontend components
- **External Integrations**: PostgreSQL, Redis, Ollama, P2P
- **Critical Hotspots**: 24 TODO items, unwrap analysis in 59 files

---

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               BIZRA GENESIS NODE v1.0.0                            │
│                    PRO AI ORCHESTRATION & MULTI-AGENT CONSENSUS                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                 │
│  │   React 19      │◄──►│   Axum Rust     │◄──►│  PostgreSQL 15  │                 │
│  │   Dashboard     │    │   API Server    │    │  Primary DB     │                 │
│  │   (port 5173)   │    │   (port 3000)   │    │  (port 5432)    │                 │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────┘                 │
│           │                      │                                                  │
│           │              ┌───────┼───────┐                                          │
│           │              │       │       │                                          │
│           ▼              ▼       ▼       ▼                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                     │
│  │   WebSocket     │  │   AI Synthesis   │  │     Redis 7     │                     │
│  │   Server        │  │   Orchestrator  │  │   Cache/Sessions │                     │
│  │   (port 9090)   │  │  ⊗8-Stage Pipeline│  │   (port 6379)   │                     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                     │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                     🔄️ SYNTHESIS ORCHESTRATOR CORE                           │ │
│  ├─────────────────────────────────────────────────────────────────────────────────┤ │
│  │ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │ │
│  │ │   ROUTING  │►│ GENERATION │►│  SCORING  │►│ CONSENSUS  │►│ VALIDATION  │    │ │
│  │ │ Thompson   │ │ Candidates │ │ IhsanGate │ │ WSC Engine │ │ Genesis     │    │ │
│  │ │ Sampling   │ │ (3×route)  │ │ Quality    │ │ Pareto     │ │ Alignment   │    │ │
│  │ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘    │ │
│  │                                                                                 │ │
│  │ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                    │ │
│  │ │   IMPACT   │►│   SIGNING  │►│ TELEMETRY  │►│    POI     │                    │ │
│  │ │    Calc    │ │ Ed25519    │ │ SLI Metrics│ │   Rewards   │                    │ │
│  │ │ Utility    │ │ Receipt    │ │ & Logging  │ │   System    │                    │ │
│  │ │ Scoring    │ │ BLAKE3     │ │           │ │            │                    │ │
│  │ └─ 🔴HOT─────┘ └────────────┘ └────────────┘ └─ ⚠️INTEGRATION ──┘                    │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                          🤖 AGENT ECOSYSTEM v2.0                              │ │
│  ├─────────────────────────────────────────────────────────────────────────────────┤ │
│  │ ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐              │ │
│  │ │   PAT (7)       │    │   SAT (5)       │    │   A2A Comm      │              │ │
│  │ │ Personal Agents │    │ System Agents   │    │ Agent-to-Agent  │              │ │
│  │ ├─────────────────┤    ├─────────────────┤    ├─────────────────┤              │ │
│  │ │ • Planner       │    │ • Infrastructure│    │ Consensus Mgmt  │              │ │
│  │ │ • Researcher    │    │ • Performance   │    │ Trust Bridge    │              │ │
│  │ │ • Coder         │    │ • Security       │    │ Message Routing │              │ │
│  │ │ • Evaluator     │    │ • Backup        │    │ QOS Priority    │              │ │
│  │ │ • Ethicist      │    │ • Resources     │    │ 🔄 24/7 Active  │              │ │
│  │ │ • Publisher     │    │ •               │    │   ┌─────────┐    │              │ │
│  │ │ • Integrator    │    │ •               │    │   │ WebSock │    │              │ │
│  │ └─────────────────┘    └─────────────────┘    └─┐ │ Stream   │ ┌──┘              │ │
│  │                                                 └─┼─► Updates ├──┘                │ │
│  │                                                   └─────────────┘                 │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                      🔐 TRUST & CONSENSUS ENGINE                               │ │
│  ├─────────────────────────────────────────────────────────────────────────────────┤ │
│  │ ┌────────────┐ ┌────────────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐ │ │
│  │ │ AEGIS      │ │ Trust Bridge   │ │ Genesis   │ │ Thompson   │ │ IhsanGate  │ │
│  │ │ Multi-Agent│ │ Ed25519 Sign   │ │ Validate  │ │ Router     │ │ Quality    │ │
│  │ │ Consensus  │ │ RunReceipt     │ │ Spiritual │ │ Sampling   │ │ Gates      │ │
│  │ └────────────┘ └────────────────┘ └──────────┘ └────────────┘ └────────────┘ │ │
│  │ ┌────────────┐ ┌────────────────┐ ┌──────────┐                               │ │
│  │ │ Consensus  │ │ POI System     │ │ SAT-LAB  │                               │ │
│  │ │ WSC Engine │ │ Impact Calc    │ │ Content   │                               │ │
│  │ │ Pareto     │ │ Rewards        │ │ Approval  │                               │ │
│  │ └─ ⚠️ TODO ──┘ └─ 🟡 INTEGRATION ┘ └──────────┘                               │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Legend:**
- 🔴 **Critical Hotspots**: >10 unwrap() calls or high-priority TODOs
- 🟡 **Integration Risk**: External system dependencies (Ledger, Email)
- 🔄 **Real-time Paths**: WebSocket streams, Metric updates

---

## 🛠️ Technology Stack

### Core Runtime & Languages
| Component | Technology | Version | Purpose | Dependencies |
|-----------|------------|---------|---------|--------------|
| **Backend** | Rust | 2021 Edition | High-performance server | Axum, Tokio async, Serde |
| **Frontend** | TypeScript | 5.9.x | Type-safe React apps | React 19.2, Vite 7.2 |
| **Database** | PostgreSQL | 15.x | Primary data store | SQLx, pgPool, migrations |
| **Cache** | Redis | 7.x | Sessions, caching | redis crate, connection manager |
| **AI Stack** | Ollama | Local | Sovereign AI models | HTTP client, local inference |

### HTTP & Networking
| Protocol | Framework | Port | Purpose |
|----------|-----------|------|---------|
| **HTTP REST** | Axum | 3000 | API endpoints, health checks |
| **WebSocket** | Axum/tungstenite | 9090 | Real-time agent updates |
| **P2P Network** | libp2p | Dynamic | Decentralized communication |
| **Metrics** | Prometheus | 9090 | System observability |

### Security & Cryptography
| Component | Algorithm | Purpose | Implementation Status |
|-----------|-----------|---------|----------------------|
| **Digital Signatures** | Ed25519 | Receipt verification | 🔴 TODO in poi/verifier.rs |
| **JWT Authentication** | HS256 | User sessions | 🔴 Placeholder in jwt.rs |
| **AES Encryption** | GCM mode | WebSocket security | ✅ Websocket/encryption.rs |
| **Cryptographic Hash** | BLAKE3 | Receipt hashing | ✅ trust.rs |

### Key Dependencies Analysis
```rust
// Critical Security Dependencies
ed25519-dalek = "2.1"    // Digital signatures - HIGH SECURITY
ring = "0.17"            // Cryptographic primitives
bcrypt = "0.15"          // Password hashing
jsonwebtoken = "9.2"     // JWT handling - 🔴 TODO in middleware

// AI Integration Stack
ollama = { path = "models/ollama.rs" }  // Local models
anthropic = { path = "models/anthropic.rs" }  // Cloud fallback
reqwest = "0.11"         // HTTP client for AI APIs

// Database & Caching
sqlx = { version = "0.8", features = ["postgres", "runtime-tokio-rustls", "uuid"] }
redis = { version = "0.24", features = ["tokio-comp", "connection-manager"] }

// High-Performance Async
tokio = { version = "1.35", features = ["full"] }
rayon = "1.8"            // Parallel processing
parking_lot = "0.12"     // Lock-free concurrency

// P2P & Networking
libp2p = "0.53"          // Decentralized networking
tonic = "0.10"           // gRPC support
hyper = "1.0"            // HTTP foundation
```

---

## 🔧 Backend Module Hierarchy

### Core Orchestration Layer (`src/`)
```
src/
├── bin/                           # 🚀 Entry Points (3 binaries)
│   ├── api_server.rs            # Main HTTP server
│   ├── hivemind_cli.rs           # CLI orchestrator
│   └── generate-openapi.rs       # Spec generator
│
├── lib.rs                        # 📊 Synthesis Orchestrator (534 lines)
│   └── SynthesisOrchestrator {
│       router: ThompsonRouter,   # Model selection
│       consensus: WeightedScoreConsensus,
│       trust_bridge: TrustBridge,
│       genesis_validator: GenesisValidator,
│       ⭐ ai_backend: Box<dyn AIBackend>
│   }
│
├── 🔐 aegis/                     # Multi-Agent Consensus (HIGH COMPLEXITY)
│   ├── consensus/engine.rs       # WeightedSelectiveConsensus algorithm
│   ├── types.rs                  # Agent, AgentId, AgentType
│   └── error.rs                  # AegisError, AegisResult ⚠️ 14 unwraps
│
├── 🤖 agents/                    # PAT/SAT Ecosystem (12 agents total)
│   ├── pat/                      # Personal Agentic Team (7 agents)
│   │   ├── planner.rs           # Strategic planning, task decomposition
│   │   ├── researcher.rs        # Multi-source information gathering
│   │   ├── coder.rs             # Code generation synthesis
│   │   ├── evaluator.rs         # Quality assessment (Ihsan gates)
│   │   ├── ethicist.rs          # Ramadhan 2023 moral alignment
│   │   ├── publisher.rs         # Output formatting optimization
│   │   └── integrator.rs        # Multi-response synthesis
│   ├── sat/                      # System Agentic Team (5 agents)
│   │   ├── infrastructure.rs    # Infrastructure monitoring
│   │   ├── performance.rs       # SLO tracking & optimization
│   │   ├── security.rs          # Security posture monitoring
│   │   ├── backup.rs            # Data backup orchestration
│   │   └── resources.rs         # Resource utilization optimization
│   └── a2a.rs                    # Agent-to-agent communication protocol
│
├── 🌐 api/                       # HTTP API Layer (15 endpoints)
│   ├── mod.rs                    # Router creation with 10 middleware layers
│   ├── auth/                     # Authentication (POST /auth/*)
│   │   ├── login.rs             # JWT token generation
│   │   ├── register.rs          # User registration
│   │   ├── refresh.rs           # Token refresh
│   │   └── types.rs             # Authentication data structures
│   ├── health.rs                # Health checks (GET /health/*)
│   ├── metrics.rs               # Prometheus metrics exposure
│   ├── telemetry.rs             # Glass cockpit data ⭐ (SLO dashboard)
│   ├── sat.rs                    # SAT-LAB content approval
│   ├── poi/                     # Proof-of-Impact attestations
│   ├── poi_rewards/             # Reward distribution logic
│   ├── alpha_invites.rs         # Alpha program management 🟡 Email integration TODO
│   └── compare.rs               # Model comparison endpoint
│
├── 🛡️  middleware/               # HTTP Request Pipeline (10 layers)
│   ├── mod.rs                   # Stack composition
│   ├── cors.rs                  # CORS configuration
│   ├── security_headers.rs      # OWASP security headers
│   ├── request_id.rs           # Correlation ID injection
│   ├── rbac.rs                  # Role-based access control
│   ├── jwt.rs                   # JWT validation 🔴 PLACEHOLDER TODO
│   ├── rate_limit.rs            # Rate limiting (2/sec, burst 5)
│   ├── tracing_context.rs       # Distributed tracing 🟡 Propagation TODO
│   ├── metrics_middleware.rs    # Request metrics collection
│   └── csrf.rs                  # CSRF protection
│
├── 🧠 models/                   # AI Provider Integration (7 providers)
│   ├── mod.rs                   # Provider architecture (lines 90-211)
│   ├── traits.rs                # ModelProvider trait definition
│   ├── ollama.rs                # Local Ollama integration (port 11434)
│   ├── openai.rs                # OpenAI API client
│   ├── anthropic.rs             # Claude API client
│   ├── registry.rs              # Dynamic provider registry
│   ├── thompson_sampling.rs     # Model selection algorithm ⚠️Beta distribution
│   ├── streaming.rs             # Response streaming logic
│   ├── rate_limit.rs            # Provider rate limiting
│   ├── circuit_breaker.rs       # Reliability patterns
│   └── ab_testing.rs            # Model experimentation framework
│
├── 🔄 consensus.rs               # Consensus Engine
│   ├── ConsensusEngine         # Executive decision logic
│   └── WeightedScoreConsensus  # Pareto optimization with 4 dimensions
│
├── 📏 scoring.rs                 # Quality Gates
│   └── IhsanGate               # Multi-dimensional quality assessment
│       // 4 Scoring Dimensions: Validity, Correctness, Safety, Efficiency
│
├── 🎯 routing.rs                 # Model Selection
│   └── ThompsonRouter           # Multi-armed bandit algorithm
│       // Beta(α,β) distribution sampling, exploration vs exploitation
│
├── 🔐 trust.rs                   # Cryptographic Infrastructure
│   ├── RunReceipt              # Signed execution receipts
│   ├── TrustBridge             # Ed25519 signing operations
│   └── ProofOfImpact           # Impact metrics calculation
│
├── 💰 rewards/                   # POI Reward System
│   ├── service.rs              # RewardService implementation
│   └── settlement.rs           # Settlement logic 🟡 Ledger integration TODO (88)
│
├── 🌟 sat/                       # SAT-LAB Content Management
│   ├── lab.rs                   # Outbox item definitions
│   ├── orchestrator.rs         # Campaign orchestration 🔴 JSON parsing TODO
│   └── types.rs                 # SAT data structures
│
├── 📊 observability/             # Monitoring Stack
│   ├── mod.rs                   # Unified telemetry interface
│   ├── metrics.rs               # Prometheus integration ⚠️ 56 unwrap calls
│   └── http.rs                  # HTTP metrics handler
│
├── 💾 persistence/               # Database Layer (*feature-gated)
│   ├── mod.rs                   # Database abstraction layer
│   ├── agents.rs               # Agent state persistence
│   ├── cache.rs                # Redis caching strategies
│   ├── consensus.rs            # Consensus history storage
│   ├── poi.rs                  # Proof-of-Impact records
│   ├── receipts.rs             # Trust receipt storage
│   └── router.rs               # Router statistics tracking
│
├── 🌐 websocket/                 # Real-time Communications
│   ├── mod.rs                   # WebSocket server management
│   ├── server.rs               # Axum WebSocket server
│   ├── handlers.rs             # Message routing 🔴 JWT auth TODO
│   ├── session.rs              # Session management
│   ├── types.rs                # Message type definitions
│   ├── encryption.rs           # AES-GCM encryption
│   └── rate_limit.rs           # WebSocket rate limiting
│
├── 🔒 secrets/                   # Secret Management
│   ├── mod.rs                   # Unified secrets interface
│   ├── manager.rs              # SecretManager trait
│   ├── vault.rs                # HashiCorp Vault integration
│   └── kms.rs                  # Google Cloud KMS 🟡 NOT IMPLEMENTED
│
├── 🔐 security/                  # Security Features
│   ├── mfa.rs                   # Multi-factor authentication
│   └── audit/mod.rs             # Comprehensive audit logging
│
├── 🚀 autopilot/                 # SLO Autopilot
│   └── mod.rs                   # Automated SLO response systems 🟡 Safe-mode TODO
│
├── ☸️  sovereign_stack.rs        # Sovereign model configuration
├── 🪶 sovereign_bridge.rs        # Config-to-MOE bridge
├── 🌀 genesis_validation.rs      # Spiritual alignment validation
├── 📱 app_state.rs               # Shared application state
├── 📋 types.rs                   # Core type definitions & traits
└── 🏗️  knowledge/                # Knowledge Graph & Embeddings
    ├── embeddings.rs            # Vector representations
    ├── hypergraph.rs            # Knowledge structure
    └── retrieval.rs             # Context retrieval
```

### Module Complexity Analysis
| Module Category | Files | Lines | Complexity | Hotspots |
|-----------------|-------|-------|------------|----------|
| **Core Synthesis** | 15 | 3,200+ | ⭐⭐⭐⭐⭐ | Router, Consensus, Trust |
| **Agent Ecosystem** | 14 | 1,800+ | ⭐⭐⭐⭐⭐ | PAT/SAT orchestration |
| **API & Middleware** | 18 | 2,100+ | ⭐⭐⭐⭐ | JWT, CSRF, RBAC |
| **AI Integration** | 12 | 1,500+ | ⭐⭐⭐⭐ | Model providers, Streaming |
| **Security & Trust** | 8 | 900+ | ⭐⭐⭐⭐ | Ed25519, Cryptography |
| **Persistence** | 7 | 800+ | ⭐⭐⭐ | SQLx, Redis connections |
| **WebSocket** | 6 | 650+ | ⭐⭐⭐ | Real-time messaging |
| **Observability** | 5 | 700+ | ⭐⭐⭐ | Prometheus metrics |

---

## 🎨 Frontend Component Architecture

### React Dashboard Structure (`apps/dashboard/`)
```
apps/dashboard/
├── src/
│   ├── App.tsx                    # 🔄 Route Configuration (18 routes)
│   ├── main.tsx                   # Entry point with React 19
│   │
│   ├── layouts/
│   │   └── MainLayout.tsx        # Navigation & authentication guards
│   │
│   ├── contexts/                  # React Context Providers (4 providers)
│   │   ├── AuthContext.tsx       # User authentication state
│   │   ├── WebSocketContext.tsx  # Real-time connections 🔄
│   │   ├── OnboardingContext.tsx # Wizard flow state
│   │   └── ProtectedRoute.tsx    # Route-level auth guards
│   │
│   ├── pages/                     # Route Components (18 pages)
│   │   ├── Dashboard.tsx         # Main synthesis dashboard
│   │   ├── Agents.tsx            # PAT/SAT management interface
│   │   ├── Synthesis.tsx         # Orchestration control panel
│   │   ├── Monitoring.tsx        # System health & metrics
│   │   ├── Achievements.tsx      # Gamification progress
│   │   ├── Settings.tsx          # User preferences
│   │   ├── Admin.tsx             # Administrative panel
│   │   ├── Login/Register.tsx    # Authentication flows
│   │   └── TelemetryPlayground.tsx # Debugging sandbox
│   │
│   ├── components/                # UI Component Library (80+ shadcn/ui)
│   │   ├── agents/               # Agent interaction widgets
│   │   │   ├── AgentCard.tsx     # Individual agent displays
│   │   │   ├── AgentGrid.tsx     # Agent overview layouts
│   │   │   └── AgentMetrics.tsx  # Performance visualizations
│   │   ├── onboarding/           # Wizard flow components
│   │   ├── poi/                  # Proof-of-Impact UI
│   │   ├── rewards/              # Reward system displays
│   │   ├── telemetry/            # Real-time metric widgets
│   │   ├── ui/                   # Base UI primitives (80 components)
│   │   └── sacred/               # Sacred geometry visualizations
│   │
│   ├── hooks/                     # Custom React Hooks (10+ hooks)
│   │   ├── useConsciousness.ts   # Agent awareness states
│   │   ├── useDebounce.ts        # Input debouncing
│   │   ├── useMediaQuery.ts      # Responsive design
│   │   ├── useTelemetryStream.tsx # WebSocket data streams
│   │   └── useWebSocketStreams.ts # Multi-stream management
│   │
│   ├── services/                  # API Client Layer
│   │   ├── api.ts                # Base HTTP client configuration
│   │   ├── poi.ts                # POI service interactions
│   │   └── rewards.ts            # Reward system API calls
│   │
│   ├── store/                     # State Management (Zustand)
│   │   └── stores/               # Centralized state stores
│   │
│   ├── lib/                       # Utility Libraries
│   │   ├── synapse/               # Advanced AI integration
│   │   ├── journeys/             # Multi-step process flows
│   │   └── utils.ts              # General utilities
│   │
│   └── types/                     # TypeScript Definitions
│       └── index.ts              # Application-wide types
│
├── package.json                   # Dependencies & Scripts
│   ├── React 19.2 + Framer Motion # Modern UI library
│   ├── Vite 7.2 + TypeScript     # Build system
│   ├── Tailwind CSS + Shadcn/UI  # Design system
│   ├── Three.js + React Three Fiber # 3D visualizations
│   ├── Playwright + Jest         # Testing frameworks
│   └── Chart.js + React Chart.js 2 # Data visualizations
│
└── e2e/                          # End-to-End Test Suite
    ├── playwright.config.ts      # Playwright configuration
    └── tests/                    # Test specifications
        ├── auth.spec.ts         # Authentication flows
        ├── dashboard.spec.ts    # Main UI functionality
        └── landing.spec.ts      # Public landing page
```

---

## 🌊 Data Flow & Integrations

### Request Lifecycle Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────►│   Axum      │────►│ Middleware  │────►│   Handler   │
│   Request   │     │   Router    │     │   Stack     │     │   Logic     │
│   (React)   │     │ (port 3000) │     │ (10 layers) │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
 ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
 │WebSocket    │     │   Synthesis │     │ Output     │     │ Database    │
 │Real-time    │◄────│ Orchestrator│────►│ Streaming  │────►│   Pool      │
 │Updates      │     │   Pipeline  │     │   (SSE)    │     │ (SQLx)      │
 └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      ▲                   ▲                   ▲                   ▲
      │                   │                   │                   │
      └───────────────────┼───────────────────┼───────────────────┘
                      ┌───┴───┐
                      │Agent  │
                      │Updates│
                      │SAT/PAT│
                      └───────┘
```

### Middleware Pipeline Architecture
```rust
// 10-Layer Pipeline (api/mod.rs:30-111)
pub fn create_router(app_state: AppState) -> Router {
    Router::new()
        // 1. Request Correlation (adds request_id)
        .layer(RequestIdLayer)
        // 2. CORS Configuration
        .layer(CorsLayer::permissive())
        // 3. Security Headers (OWASP compliance)
        .layer(SecurityHeadersLayer)
        // 4. Rate Limiting (2/sec, burst 5)
        .layer(RateLimitLayer::new())
        // 5. CSRF Protection ⭐ HIGH SECURITY
        .layer(CsrfProtectionLayer)
        // 6. JWT Authentication 🔴 PLACEHOLDER TODO
        .layer(JwtAuthLayer)
        // 7. RBAC Authorization
        .layer(RbacLayer)
        // 8. Tracing Context 🟡 PROPAGATION TODO
        .layer(TracingContextLayer)
        // 9. Metrics Collection
        .layer(MetricsMiddlewareLayer)
        // 10. Error Handling
        .layer(ErrorHandlingLayer)
        .with_state(app_state)
}
```

### External System Integrations

| System | Protocol | Port | Purpose | Criticality |
|--------|----------|------|---------|-------------|
| **PostgreSQL** | TCP/SQL | 5432 | Primary data store | ⭐⭐⭐⭐⭐ |
| **Redis** | TCP/RESP | 6379 | Caching, sessions, pubsub | ⭐⭐⭐⭐⭐ |
| **Ollama** | HTTP/REST | 11434 | Local AI inference | ⭐⭐⭐⭐⭐ |
| **Prometheus** | HTTP/Pull | 9090 | Metrics collection | ⭐⭐⭐⭐ |
| **Grafana** | HTTP/Dashboards | 3000 | Visualization | ⭐⭐⭐ |
| **OpenAI API** | HTTPS | 443 | Cloud AI fallback | ⭐⭐⭐ |
| **Anthropic** | HTTPS | 443 | Claude API | ⭐⭐⭐ |
| **HashiCorp Vault** | HTTPS | 8200 | Secret management | ⭐⭐⭐ |
| **SMTP Server** | SMTP | 587 | Email notifications 🟡 NOT IMPLEMENTED | ⭐⭐ |

---

## 🚨 Error Hotspots Matrix

### Critical TODO Analysis (24 items across 12 files)

| Priority | File | Line | Issue | Impact | Status |
|----------|------|------|-------|--------|--------|
| 🔴 HIGH | middleware/jwt.rs | 53 | JWT validation uses placeholder | Auth bypass risk | Blocking |
| 🔴 HIGH | websocket/handlers.rs | 76 | WebSocket JWT auth TODO | Unauthorized access | Blocking |
| 🔴 HIGH | api/poi/verifier.rs | 103 | Ed25519 verification placeholder | Invalid POI claims | Critical |
| 🔴 HIGH | websocket/handlers.rs | 122 | Agent routing not implemented | Message routing failure | Blocking |
| 🟡 MEDIUM | rewards/settlement.rs | 88 | Ledger integration pending | Settlement delays | Functional |
| 🟡 MEDIUM | middleware/rate_limiter.rs | 324 | JWT user ID extraction | Inaccurate limits | Performance |
| 🟡 MEDIUM | autopilot/mod.rs | 207-228 | Safe-mode behavior TODO | SLO violations | Recovery |
| 🟡 LOW | api/alpha_invites.rs | 202, 414 | Email service integration | No notifications | UX |
| 🟡 LOW | sat/orchestrator.rs | 190 | JSON parsing improvement | Parse errors | Robustness |
| 🟡 LOW | middleware/tracing_context.rs | 12 | Tracing propagation | Observability gaps | Monitoring |
| 🟡 LOW | secrets/kms.rs | 24-77 | GCP KMS not implemented | Limited secrets management | Security |
| 🟡 LOW | api/telemetry.rs | 207 | Epoch service integration | Incomplete telemetry | Analytics |

### Unwrap() Panic Analysis (335 occurrences across 59 files)

| File | Occurrences | Risk Level | Context |
|------|-------------|------------|---------|
| src/metrics.rs | 56 | 🔴 CRITICAL | Prometheus metrics collection - potential server crash |
| src/types.rs | 14 | 🟡 MEDIUM | Core type conversions |
| src/middleware/security_headers.rs | 14 | 🟡 MEDIUM | Security header construction |
| src/lib.rs | 15 | 🔴 HIGH | Core orchestrator logic |
| src/parser.rs | 12 | 🟡 MEDIUM | Input parsing logic |
| src/models/anthropic.rs | 12 | 🟡 MEDIUM | AI provider API handling |
| ALL OTHER FILES | 232 total | 🟢 LOW-MEDIUM | Various utility and helper functions |

---

## 🔍 Debugging & Observability

### Tracing Configuration

```bash
# Enable Full Tracing
RUST_LOG=trace cargo run --bin api_server

# Module-Specific Debugging
RUST_LOG=bizra_genesis_node::api=debug,bizra_genesis_node::consensus=debug cargo run

# Database Query Logging
RUST_LOG=sqlx=debug cargo run

# Backtrace for Panics
RUST_BACKTRACE=1 cargo run
```

### Key Debug Points

| Component | Tracing Event | Logs When | Criticality |
|-----------|---------------|-----------|-------------|
| API Server | `🚀 Starting BIZRA...` | App startup | Startup validation |
| Database | `✅ Database connection established` | Connection success | Service availability |
| Router | `Selected route: {}` | Model selection | Orchestration flow |
| Generation | `Generated {} candidates` | AI responses | Synthesis pipeline |
| Consensus | `Consensus reached: {}` | Winner selection | Decision making |
| Trust | `Receipt signed: {}` | Cryptographic proof | Security validation |
| Impact | `Impact recorded: {}` | POI calculation | Reward system |

### Health Check Endpoints

```bash
# Comprehensive Health
GET /health
# Returns: CPU, memory, DB connectivity, AI models, metrics

# Kubernetes Probes
GET /health/live     # Liveness check
GET /health/ready    # Readiness check

# Metrics Dashboard
GET /metrics         # Prometheus format
GET /telemetry       # Glass cockpit data
```

### Common Failure Modes

| Symptom | Likely Cause | Debug Command | Resolution |
|---------|--------------|---------------|------------|
| JWT auth failures | Placeholder in jwt.rs:53 | Check logs for auth failures | Implement proper JWT validation |
| WebSocket connections fail | Missing JWT auth (76) | Debug WebSocket handler logs | Add proper JWT checking |
| POI verification fails | Ed25519 placeholder (103) | Check cryptographic logs | Implement Ed25519 verification |
| Rate limiting too aggressive | User ID extraction error (324) | Debug rate limiter metrics | Fix JWT user extraction |
| Metrics collection errors | 56 unwrap() calls in metrics.rs | Enable metrics tracing | Resolve unwrap() locations |

---

## 📊 Performance Characteristics

### Resource Utilization Baseline
- **Memory**: ~200MB base, +100MB per active synthesis
- **CPU**: Single-threaded synthesis, multi-threaded agents
- **Network**: High I/O for AI models, WebSocket streams
- **Database**: 100ms P95 queries, connection pooling required

### Scalability Considerations
- **Horizontal Scaling**: Stateless design, Redis-based sessions
- **Database Load**: 50 concurrent users → 10k QPS
- **WebSocket Capacity**: 1k concurrent connections via Tokio
- **AI Throughput**: 3 candidates × 5 routes = 15 model calls/synthesis

### Performance Hotspots
| Component | Operation | Baseline | Optimization Path |
|-----------|-----------|----------|-------------------|
| **Consensus Engine** | Pareto optimization | ~50ms | SIMD acceleration |
| **AI Routing** | Thompson sampling | ~25ms | Cached probabilities |
| **Database Queries** | POI attestations | ~100ms | Query optimization |
| **WebSocket Encryption** | AES-GCM | ~5ms | Hardware acceleration |

---

## 🔐 Security Architecture

### Authentication Flow
```
Client → JWT Token → Middleware Validation → Route Handler
     ↓         ↓             ↓                   ↓
   Frontend   Expires         🔴 TODO             Business Logic
     ↓         ↓
   Refresh    Storage        Rate Limiting → RBAC
     ↓
   Protected Routes
```

### Cryptographic Operations
- **Ed25519 Signatures**: POI receipts and trust bridge
- **AES-GCM**: WebSocket message encryption
- **BLAKE3**: Receipt hashing and verification
- **bcrypt**: Password hashing
- **HMAC-SHA256**: JWT signing (when implemented)

### Threat Model
- **High Risk**: JWT placeholder bypass
- **Medium Risk**: WebSocket auth gaps
- **Medium Risk**: Ed25519 verification TODO
- **Low Risk**: Rate limiting inaccuracies

---

## 🚀 Deployment & Infrastructure

### Kubernetes Manifests (`k8s/`)
```
k8s/
├── base/
│   ├── namespace.yaml
│   ├── api-deployment.yaml      # Main service (3 replicas)
│   └── database-pvc.yaml        # PostgreSQL storage
├── monitoring/
│   ├── prometheus-service.yaml  # Metrics collection
│   └── grafana-dashboard.yaml   # SLO visualization
├── scaling/
│   └── keda-scaledobjects.yaml  # AI load scaling
├── security/
│   └── network-policies.yaml    # Pod isolation
├── config/
│   └── sovereign-models.yaml    # Ollama configuration
└── ci/
    └── github-actions.yaml      # CI/CD pipelines
```

### Production Considerations
- **Secrets Management**: HashiCorp Vault integration
- **Load Balancing**: Global distribution with istio
- **Disaster Recovery**: Multi-region replication
- **Monitoring**: SLO-based alerting and autopilots

---

**Navigation Guide:**
- 🔴 **Start here for critical issues**: Check error hotspots and TODOs
- 🔄 **For real-time debugging**: Follow request lifecycle and WebSocket flows
- 📊 **For system understanding**: Examine synthesis pipeline and agent ecosystem
- 🐛 **For troubleshooting**: Use tracing guide and health checks

This architecture represents a sophisticated AI-orchestration system with multi-agent consensus, requiring careful attention to the identified hotspots for production readiness.
