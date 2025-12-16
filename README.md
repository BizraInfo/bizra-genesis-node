# BIZRA Node0 - Genesis Node

**Document ID:** BIZRA-NODE0-v1.0.0-GENESIS  
**Node:** NODE0-TITAN (MSI GT77 HX, Dubai)  
**Author:** Mahmoud Hassan (MoMo) + Claude (Synthesis Engine)  
**Status:** READY FOR DEPLOYMENT

---

## 🌱 What is BIZRA Node0?

BIZRA Node0 is the canonical seed pattern for a planetary-scale sovereign AI network. It is:

1. **A Sovereign Home Base** - Your machine becomes a BIZRA-OS node with zero cloud dependencies
2. **A Complete Single-User Universe** - Full lifecycle support: onboarding → daily AI → contribution → rewards
3. **The Reference Implementation** - Everything built later scales this exact pattern

> "Perfect one node, then replicate perfection."

## 📚 Strategic Documents

- System Architecture Atlas (DDAGI blueprint): [docs/BIZRA_SYSTEM_ARCHITECTURE_ATLAS.md](docs/BIZRA_SYSTEM_ARCHITECTURE_ATLAS.md)
- Unified Masterpiece Blueprint (actionable roadmap): [docs/UNIFIED_MASTERPIECE_BLUEPRINT.md](docs/UNIFIED_MASTERPIECE_BLUEPRINT.md)
- APEX convergence (Experts + Ihsān kernel): [docs/APEX_SYSTEM.md](docs/APEX_SYSTEM.md)
- **Brand Identity & Design Governance**: [docs/BRAND_IDENTITY.md](docs/BRAND_IDENTITY.md)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ LAYER 4: EXPERIENCE (PAT Console Dashboard)            │
│ - Chat, Plan View, Resource Pool, PoI Rewards, Ops     │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │ WebSocket + REST API
                           ▼
┌─────────────────────────────────────────────────────────┐
│ LAYER 3: DATA & ASSETS (The Memory)                    │
│ - PostgreSQL, Neo4j, Qdrant Vector DB                  │
│ - Asset Registry, Knowledge Base, PoI Ledger           │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │ SQL, Vector Search, Graph
                           ▼
┌─────────────────────────────────────────────────────────┐
│ LAYER 2: INTELLIGENCE (The Mind)                       │
│ - PAT: 7 agents (Master Reasoner, Memory, Creative...) │
│ - SAT: 5 agents (PoI Verifier, Allocator, Guardian...) │
│ - Ollama Models (DeepSeek, Qwen, Mistral, LLaMA)       │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │ Model API, Agent Orchestration
                           ▼
┌─────────────────────────────────────────────────────────┐
│ LAYER 1: INFRASTRUCTURE (The Body)                     │
│ - Docker: Postgres, Redis, Ollama, Neo4j, Qdrant       │
│ - Windows 11 + WSL2 Ubuntu 22.04                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

- **OS:** Windows 11 Pro with WSL2 Ubuntu 22.04
- **Docker:** Docker Desktop 4.25+ with WSL2 backend
- **Hardware (Recommended):**
  - CPU: 8+ cores (Intel i9 / AMD Ryzen 9)
  - RAM: 32GB+ (64GB for full model stack)
  - GPU: NVIDIA RTX 3080+ (16GB VRAM for vision models)
  - Storage: 500GB+ NVMe SSD
- **Software:**
  - Git
  - Node.js 20+
  - Rust 1.75+
  - PowerShell 7+

---

## 🚀 Quick Start

### Step 1: Clone Repository

```powershell
git clone https://github.com/bizra/bizra-genesis-node
cd bizra-genesis-node
```

### Step 2: Configure Environment

```powershell
# Copy example environment file
Copy-Item .env.example .env

# Edit with your passwords
notepad .env
```

**Required changes in `.env`:**
```
DB_PASSWORD=your_secure_password_here
GRAPH_PASSWORD=your_neo4j_password_here
JWT_SECRET=your_jwt_secret_min_32_chars
ENCRYPTION_KEY=your_encryption_key_min_32_chars
```

### Step 3: Start Infrastructure

```powershell
# Start Docker services
docker-compose -f docker/docker-compose.node0.yml up -d

# Verify services are healthy
docker-compose -f docker/docker-compose.node0.yml ps
```

Expected output:
```
NAME                    STATUS
bizra-node0-db         Up (healthy)
bizra-node0-redis      Up (healthy)
bizra-node0-ollama     Up
bizra-node0-graph      Up
bizra-node0-vector     Up
```

### Step 4: Pull Ollama Models

```powershell
# This takes 15-30 minutes depending on internet speed
./scripts/models-setup.sh

# Or pull models manually:
ollama pull deepseek-r1:7b
ollama pull qwen2.5:7b
ollama pull mistral:7b
ollama pull codellama:13b
ollama pull nomic-embed-text
```

### Step 5: Initialize Database

```powershell
# Connect to PostgreSQL and run init script
psql -h localhost -U bizra_node0 -d bizra_genesis -f scripts/init-db.sql
```

### Step 6: Start All Services

```powershell
# Windows PowerShell
.\scripts\start-all.ps1

# Or WSL2/Bash
./scripts/start-all.sh
```

### Step 7: Access Dashboard

Open your browser to: **http://localhost:3000**

---

## 🤖 PAT (Personal Agent Team)

| Agent | Role | Model | Backend | Purpose |
|-------|------|-------|---------|---------|
| Master Reasoner | Strategic thinking | DeepSeek R1 7B | Ollama | Hard decisions, complex analysis |
| Memory Architect | Knowledge organization | Qwen 2.5 7B | Ollama | Structuring notes, recall |
| Creative Synthesizer | Content creation | Qwen 2.5 7B | Ollama | Writing, brainstorming |
| Data Analyzer | Insights extraction | Mistral 7B | Ollama | Data analysis, patterns |
| Communicator | Messaging polish | Mistral 7B | Ollama | Email drafts, presentations |
| **Execution Planner** | Task breakdown | **AgentFlow 7B** | **LM Studio** | Schedules, checklists, workflows |
| Ethics Guardian | Safety compliance | Qwen 2.5 7B | Ollama | Checks outputs for harm |

### LM Studio Integration

Node0 supports dual inference backends:
- **Ollama** (port 11434): General-purpose models
- **LM Studio** (port 1234): Specialized models like AgentFlow 7B

**Available LM Studio Models:**
| Model | Specialization |
|-------|---------------|
| `agentflow-7b` | Advanced planning & task orchestration |
| `deepseek-coder-v2` | Code generation & debugging |
| `qwen2.5-coder-32b` | Complex coding tasks |
| `llama-3.3-70b` | Flagship reasoning (requires high VRAM) |

---

## 📊 API Endpoints

### Health Check
```bash
curl http://localhost:8080/health
# Response: {"status":"healthy","node_id":"NODE0-TITAN"}
```

### PAT Chat
```bash
curl -X POST http://localhost:8080/api/pat/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Help me plan my week", "agent_role": "MasterReasoner"}'
```

### PoI Statistics
```bash
curl http://localhost:8080/api/poi/stats
```

### Full API Documentation
Access Swagger UI at: **http://localhost:8080/api/docs**

---

## 🛠️ Troubleshooting

### Ollama model not found
```powershell
# List installed models
ollama list

# Pull missing model
ollama pull deepseek-r1:7b
```

### PostgreSQL connection refused
```powershell
# Check if container is running
docker ps | Select-String postgres

# Restart container
docker-compose -f docker/docker-compose.node0.yml restart postgres
```

### High GPU memory usage
```powershell
# Check Ollama loaded models
curl http://localhost:11434/api/tags

# Reduce concurrent models in .env
# OLLAMA_MAX_LOADED_MODELS=2
```

### Dashboard not loading
```powershell
# Check if frontend is built
cd apps/dashboard
npm run build

# Check for errors
npm run dev
```

---

## 🧠 Hypergraph RAG - Knowledge Intelligence

Node0 includes the **Hypergraph RAG** system that transforms your 15,000+ hours of wisdom into accessible, connected intelligence.

```
┌─────────────────────────────────────────────────────────┐
│ Layer 3: CONTEXT ASSEMBLY                               │
│ Token-aware, hierarchical context for LLM consumption   │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │ Multi-hop traversal
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: VECTOR EMBEDDINGS                              │
│ Semantic similarity via sentence-transformers + Qdrant  │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │ Graph + Vector fusion
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 1: KNOWLEDGE GRAPH                                │
│ Nodes (files) + Edges (relationships) + Hyperedges      │
└─────────────────────────────────────────────────────────┘
```

### Activate the Gold Mine

```powershell
cd knowledge
.\ACTIVATE-GOLD-MINE.bat
```

This will:
1. Scan your `C:\BIZRA-DATA-LAKE` (413k+ files)
2. Extract concepts, entities, and relationships
3. Build node/edge/hyperedge graph structure
4. Generate semantic embeddings with sentence-transformers
5. Store vectors in Qdrant for fast similarity search

### Query Your Knowledge

```python
from knowledge.scripts.query_engine import QueryEngine
from pathlib import Path

engine = QueryEngine(Path("knowledge/graph"))
result = engine.query("What is the SAPE consciousness architecture?")
print(result.formatted_context)
```

### Capabilities

| Feature | Description |
|---------|-------------|
| **Temporal Archaeology** | Find what you knew at any point in time |
| **Causal Reasoning** | Trace how ideas evolved across files |
| **Pattern Mining** | Discover hidden connections |
| **Concept Mapping** | Navigate your knowledge by theme |
| **Multi-Dimensional Search** | Query across time, space, and meaning |

---

## 📁 Project Structure

```
bizra-genesis-node/
├── backend/              # Rust API server
│   ├── src/
│   │   ├── main.rs
│   │   └── lib/
│   │       ├── agents/   # PAT & SAT orchestrators
│   │       ├── services/ # Core services
│   │       └── api/      # HTTP handlers
│   └── Cargo.toml
├── bridge/               # Node.js WebSocket bridge
│   ├── src/
│   │   └── telemetry-bridge.ts
│   └── package.json
├── apps/
│   └── dashboard/        # React frontend
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── hooks/
│       └── package.json
├── knowledge/            # Hypergraph RAG system
│   ├── scripts/
│   │   ├── build_knowledge_graph.py   # Graph builder
│   │   ├── generate_embeddings.py     # Vector generation
│   │   ├── query_engine.py            # Multi-hop search
│   │   └── context_assembler.py       # LLM-ready context
│   ├── graph/            # Generated graph files
│   │   ├── nodes.jsonl
│   │   ├── edges.jsonl
│   │   ├── hyperedges.jsonl
│   │   └── indices/
│   ├── ACTIVATE-GOLD-MINE.bat
│   └── requirements.txt
├── docker/
│   └── docker-compose.node0.yml
├── scripts/
│   ├── init-db.sql       # Database schema
│   ├── models-setup.sh   # Ollama model downloads
│   ├── start-all.ps1     # Windows start script
│   └── stop-all.ps1      # Windows stop script
├── docs/
│   └── ARCHITECTURE.md
├── .env.example
└── README.md
```

---

## 🎯 Definition of Done

Node0 is complete when:

- [ ] Docker stack runs on one command
- [ ] All services healthy (Postgres, Redis, Ollama, Neo4j)
- [ ] 3+ PAT agents functional
- [ ] Onboarding flow works end-to-end
- [ ] Chat with PAT returns responses < 10s
- [ ] PoI events log correctly
- [ ] Resource contribution works (simulated)
- [ ] Evidence dashboard shows metrics

---

## 📈 Success Metrics

| Milestone | Criteria |
|-----------|----------|
| Alpha Success | 7 consecutive days of daily use |
| Beta Success | 10 users, 500+ PoI events |
| Network Launch | 100 nodes, 10k daily events |

---

## 🔗 Links

- **Architecture Document:** [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **API Documentation:** http://localhost:8080/api/docs
- **BIZRA Foundation:** https://bizra.foundation (coming soon)

---

## 📜 License

Copyright © 2025 BIZRA Foundation. All rights reserved.

---

> **From Seed to Cosmos. Node0 Activation Ready.** 🌱→🌌
