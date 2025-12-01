# BIZRA Node0 - Quick Reference Guide

## 🚀 One-Command Deploy

```powershell
# From project root
.\scripts\start-all.ps1
```

## 📍 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Dashboard | http://localhost:3000 | Main UI |
| Backend API | http://localhost:8080 | REST API |
| WebSocket | ws://localhost:3002 | Telemetry |
| Ollama | http://localhost:11434 | LLM API (Ollama) |
| LM Studio | http://localhost:1234 | LLM API (LM Studio) |
| Neo4j Browser | http://localhost:7474 | Graph DB |
| Qdrant Dashboard | http://localhost:6333/dashboard | Vector DB |

## 🔑 Default Credentials

| Service | Username | Password (change these!) |
|---------|----------|--------------------------|
| PostgreSQL | bizra_node0 | bizra_genesis_2025 |
| Neo4j | neo4j | bizra_graph_2025 |
| Redis | - | (no auth in dev) |

## 🎯 Dashboard Routes

| Route | Description |
|-------|-------------|
| `/` | Home - System overview |
| `/onboarding` | Seed Test & PAT selection |
| `/chat` | PAT Console - AI chat interface |
| `/plan` | Daily Plan - Task management |
| `/resources` | Resource allocation sliders |
| `/rewards` | PoI Rewards dashboard |
| `/ops` | System operations & health |

## 📡 Key API Endpoints

```bash
# Health Check
GET /health

# User Profile
POST /api/user/profile
GET  /api/user/profile

# PAT Chat
POST /api/pat/chat

# Daily Plan
GET  /api/plan/daily?date=2025-01-15
POST /api/plan/generate

# PoI Ledger
GET  /api/poi/ledger
GET  /api/poi/stats
POST /api/poi/events

# Resources
GET  /api/resources/pool
PUT  /api/resources/allocation
```

## 🤖 PAT Agent IDs

Use these in API calls:
- `MasterReasoner` - DeepSeek R1 7B (Ollama)
- `MemoryArchitect` - Qwen 2.5 7B (Ollama)
- `CreativeSynthesizer` - Qwen 2.5 7B (Ollama)
- `DataAnalyzer` - Mistral 7B (Ollama)
- `Communicator` - Mistral 7B (Ollama)
- `ExecutionPlanner` - **AgentFlow 7B** (LM Studio) ⭐ Specialized planner
- `EthicsGuardian` - Qwen 2.5 7B (Ollama)

## 🧠 LM Studio Models

LM Studio hosts specialized models for enhanced capabilities:

| Model | Use Case | Agent |
|-------|----------|-------|
| `agentflow-7b` | Advanced task planning | ExecutionPlanner |
| `deepseek-coder-v2` | Code generation | (Future: CodeAgent) |
| `qwen2.5-coder-32b` | Complex coding tasks | (Future: CodeAgent) |
| `llama-3.3-70b` | Flagship reasoning | (Future: SuperReasoner) |

**To load models in LM Studio:**
1. Open LM Studio GUI
2. Download desired models from Model Search
3. Load model and ensure server is running on port 1234

## 🔧 Common Commands

```powershell
# Start everything
.\scripts\start-all.ps1

# Stop everything
.\scripts\stop-all.ps1

# View logs
docker-compose -f docker/docker-compose.node0.yml logs -f

# Restart specific service
docker-compose -f docker/docker-compose.node0.yml restart ollama

# Pull new model
ollama pull deepseek-r1:14b

# Check database
psql -h localhost -U bizra_node0 -d bizra_genesis

# Run frontend in dev mode
cd apps/dashboard && npm run dev

# Build frontend
cd apps/dashboard && npm run build
```

## 🐛 Quick Troubleshooting

### "Connection refused" errors
```powershell
docker-compose -f docker/docker-compose.node0.yml up -d
```

### "Model not found" in chat
```powershell
ollama pull deepseek-r1:7b
```

### Dashboard blank
```powershell
cd apps/dashboard
npm install
npm run dev
```

### Database issues
```powershell
docker-compose -f docker/docker-compose.node0.yml restart postgres
psql -h localhost -U bizra_node0 -d bizra_genesis -f scripts/init-db.sql
```

## 📊 Genesis Synapse Telemetry

WebSocket message format (sent every 1s):
```json
{
  "type": "genesis_synapse",
  "timestamp": "2025-01-15T12:00:00Z",
  "system": {
    "cpu_usage": 45.2,
    "memory_used": 32.1,
    "memory_total": 64.0,
    "gpu_usage": 75.5,
    "disk_usage": 42.0
  },
  "agents": {
    "pat_active": 3,
    "sat_active": 2
  },
  "poi": {
    "pending": 5,
    "verified": 142,
    "rewards_pending": 12.75
  }
}
```

## 🏗️ Layer Architecture

```
Layer 4: Experience   → React Dashboard (port 3000)
Layer 3: Data        → Postgres, Neo4j, Qdrant
Layer 2: Intelligence → Ollama + PAT/SAT agents
Layer 1: Infrastructure → Docker containers
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `docker/docker-compose.node0.yml` | All Docker services |
| `scripts/init-db.sql` | Database schema |
| `backend/src/main.rs` | API server |
| `backend/src/lib/agents/pat.rs` | PAT orchestrator |
| `backend/src/lib/agents/sat.rs` | SAT orchestrator |
| `bridge/src/index.ts` | WebSocket telemetry |
| `apps/dashboard/src/lib/api.ts` | API client |
| `.env` | All configuration |

---

> **Node0 Status: GENESIS READY** 🌱
