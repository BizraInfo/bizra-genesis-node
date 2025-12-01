# BIZRA Node0 Architecture - v1.0.1

**Document ID:** `BIZRA-NODE0-v1.0.1-GENESIS`  
**Status:** Production Blueprint  
**Last Updated:** 2025-12-02  

---

## Overview

BIZRA Node0 (codename: TITAN) is the Genesis Node implementation - a reference design for sovereign AI infrastructure that combines local compute, ethical AI governance, and economic participation in the BIZRA network.

This document describes the complete technical architecture of a single-node deployment, optimized for high-performance workstations.

---

## Layer 1: Infrastructure (The Body)

### Hardware Profile

```
CPU: Intel i9-14900HX (24 cores, 32 threads)
GPU: NVIDIA RTX 4090 (16GB VRAM)
RAM: 128GB DDR5
Storage: 3TB NVMe SSD
OS: Windows 11 Pro + WSL2 Ubuntu 22.04 (optional)
```

### Software Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Docker | Postgres, Redis | Core data services (containerized) |
| Host services (baseline) | Ollama (Windows app) | LLM inference (GPU-accelerated) |
| Optional Phase 2+ | Neo4j (graph DB), containerized Ollama | Extended knowledge graph & scaling |
| Runtime | Rust 1.75+ | Backend API server |
| Dashboard | Next.js 14 | Web interface |
| Telemetry | Node.js Bridge | Real-time WebSocket metrics |

### Docker Compose (v1 Minimal)

```bash
docker-compose -f docker/docker-compose.node0.yml up -d
```

Services:
- **PostgreSQL 16**: Primary data store (user profiles, PoI ledger, assets)
- **Redis 7**: Cache, message bus, session store

---

## Layer 2: Intelligence (The Mind)

### PAT - Personal Agent Team

Seven specialized AI agents optimized for different cognitive tasks:

| Agent | Model | Role |
|-------|-------|------|
| MasterReasoner | deepseek-r1:7b | Strategic thinking, complex analysis |
| MemoryArchitect | qwen2.5:7b | Knowledge organization, recall |
| CreativeSynthesizer | qwen2.5:7b | Writing, ideation, brainstorming |
| DataAnalyzer | mistral:7b | Data analysis, pattern recognition |
| Communicator | mistral:7b | Emails, presentations, messaging |
| ExecutionPlanner | agentflow-7b | Schedules, checklists, task sequencing |
| EthicsGuardian | qwen2.5:7b | Safety, bias detection, ethical review |

### SAT - System Agent Team

Background system-level agents:

| Agent | Role |
|-------|------|
| TMP Operator | Consciousness safety monitoring |
| PoI Verifier | Impact validation & scoring |
| Asset Indexer | File discovery & embedding |
| Resource Manager | Compute allocation |

### Model Orchestration

**Ollama Endpoint:** `http://127.0.0.1:11434`

Model loading is optimized for:
- 16GB VRAM constraint
- Concurrent model slots: 2-3
- Keep-alive: 24h for frequently used models

---

## Layer 3: Data & Assets (The Memory)

### PostgreSQL Schema

Core tables:
- `user_profile` - Identity, seed state, preferences
- `asset_registry` - Indexed files and documents
- `poi_ledger` - Proof-of-Impact event log
- `knowledge_base` - Vector embeddings (pgvector)
- `resource_pool` - Node resource allocation
- `pat_sessions` - Conversation history
- `plans` - 7-day action plans
- `system_health` - Telemetry snapshots

### Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Layer 4: API Surface

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/api/env/snapshot` | GET | Hardware & service status |
| `/api/pat/chat` | POST | Chat with PAT agent |
| `/api/pat/agents` | GET | List available agents |
| `/api/poi/log` | POST | Record PoI event |
| `/api/poi/stats` | GET | User PoI statistics |
| `/api/resources/status` | GET | Node resource status |
| `/api/user/profile` | GET/POST | User profile management |

### WebSocket

**Genesis Synapse Bridge** provides real-time telemetry:
- System metrics (CPU, RAM, GPU, disk)
- Agent activity (PAT/SAT counts)
- PoI stream (pending/verified)

---

## Layer 5: Economic (The Rewards)

### Proof-of-Impact (PoI)

Every valuable action generates a PoI event:

```typescript
interface PoIEvent {
  event_type: string;      // 'task_completed', 'learning_session', etc.
  impact_score: number;    // Magnitude of contribution
  ihsan_score: number;     // Quality/ethics score (0-1)
  duration_minutes: number;
  resources_used: object;
  assets_produced: string[];
}
```

### Token Rewards (Simulated)

| Token | Type | Calculation |
|-------|------|-------------|
| BZC | Utility | `impact × duration × 0.1` |
| IMP | Soulbound | `ihsan × impact × 0.5` |

---

## Definition of Done

### Infrastructure

- [ ] All core services healthy: Postgres, Redis
- [ ] Host Ollama reachable at http://127.0.0.1:11434
- [ ] (Optional v1.1) Neo4j container healthy
- [ ] Backend API responding on port 8080
- [ ] Dashboard serving on port 3000

### Intelligence

- [ ] At least 2 models installed (planner + general chat) for v1.0
- [ ] (Recommended v1.1) Total of 5+ specialist models installed
- [ ] PAT chat endpoint returning responses
- [ ] Ihsan scoring operational

### Data

- [ ] PostgreSQL schema initialized
- [ ] Default resource_pool row for NODE0-TITAN
- [ ] User profile table accessible

### UX

- [ ] `/ops` page showing live system status
- [ ] `/chat` page functional with agent selection
- [ ] (Optional v1.1) `/bizraverse` 3D preview with Three.js
- [ ] PoI timeline displaying events

---

## Activation Sequence

```bash
# 1. Start Docker services
docker-compose -f docker/docker-compose.node0.yml up -d

# 2. Wait for healthy (30 seconds)
sleep 30

# 3. Verify Ollama (host service)
curl http://127.0.0.1:11434/api/tags

# 4. Start backend
cd backend && cargo run

# 5. Start dashboard
cd apps/dashboard && npm run dev

# 6. Verify health
curl http://localhost:8080/health
curl http://localhost:8080/api/env/snapshot
```

---

## File Structure

```
bizra-genesis-node/
├── apps/
│   └── dashboard/          # Next.js frontend
├── backend/
│   └── src/
│       ├── main.rs         # Axum API server
│       └── lib/
│           ├── agents/     # PAT/SAT implementations
│           ├── api/        # Route handlers
│           └── services/   # Core services
├── bridge/                 # Node.js telemetry bridge
├── docker/
│   └── docker-compose.node0.yml
├── scripts/
│   ├── init-db.sql         # PostgreSQL schema
│   └── start-all.ps1       # Windows start script
├── docs/
│   └── BIZRA-NODE0-ARCHITECTURE-v1.0.1.md
└── .env.example
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0.0 | 2025-11-15 | Initial Genesis Node design |
| v1.0.1 | 2025-12-02 | Hardware profile correction (128GB RAM, 3TB storage), Docker stack simplified to Postgres+Redis baseline, Ollama as host service |

---

*Document maintained by BIZRA Foundation*
