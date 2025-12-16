# 🤖 BIZRA Dual Agentic System Activation

## Node0 Homebase — SAT + PAT Activation Guide

This document shows how to activate the complete **dual agentic system** on Choau (Node0 Homebase):

| Team | Purpose | Agents |
|------|---------|--------|
| **PAT** (Personal Agent Team) | User-facing AI assistants | 7 specialized agents |
| **SAT** (System Agent Team) | Protocol-level governance | 5 system agents |

Both teams train on your 1.7 TB gold mine and test the full BIZRA ecosystem.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BIZRA NODE0 (CHOAU)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │                    DASHBOARD (Next.js)                   │       │
│   │                   http://localhost:3000                  │       │
│   └─────────────────────────────────────────────────────────┘       │
│                               │                                     │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │              RUST BACKEND (Axum)                         │       │
│   │              http://localhost:8080                       │       │
│   │   ┌───────────────────┬───────────────────────────┐     │       │
│   │   │     PAT AGENTS    │       SAT AGENTS          │     │       │
│   │   │   MasterReasoner  │     PoiVerifier           │     │       │
│   │   │   MemoryArchitect │     ResourceAllocator     │     │       │
│   │   │   CreativeSynth   │     RiskGuardian          │     │       │
│   │   │   DataAnalyzer    │     GovernanceEngine      │     │       │
│   │   │   Communicator    │     EvidenceEngine        │     │       │
│   │   │   ExecutionPlanner│                           │     │       │
│   │   │   EthicsGuardian  │                           │     │       │
│   │   └───────────────────┴───────────────────────────┘     │       │
│   └──────────────────────────┬──────────────────────────────┘       │
│                              │                                      │
│   ┌──────────────────────────┼──────────────────────────────┐       │
│   │                  INFERENCE BACKENDS                      │       │
│   │   ┌─────────────────┐   ┌─────────────────────────────┐ │       │
│   │   │    OLLAMA       │   │        LM STUDIO            │ │       │
│   │   │  :11434         │   │        :1234                │ │       │
│   │   │ deepseek-r1:7b  │   │   agentflow-7b (planning)   │ │       │
│   │   │ qwen2.5:7b      │   │   deepseek-coder-v2 (code)  │ │       │
│   │   │ mistral:7b      │   │   llama-3.3-70b (flagship)  │ │       │
│   │   └─────────────────┘   └─────────────────────────────┘ │       │
│   └─────────────────────────────────────────────────────────┘       │
│                              │                                      │
│   ┌──────────────────────────┼──────────────────────────────┐       │
│   │             HYPERGRAPH RAG KNOWLEDGE                     │       │
│   │   ┌─────────────────────────────────────────────────┐   │       │
│   │   │  ASSET_INVENTORY.json (multi-root dedup scan)   │   │       │
│   │   │  REFINED_KNOWLEDGE_BASE.json (chunked/indexed)  │   │       │
│   │   │  graph/ (nodes, edges, hyperedges, indices)     │   │       │
│   │   └─────────────────────────────────────────────────┘   │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │                 YOUR 1.7 TB GOLD MINE                    │       │
│   │   C:\Projects  D:\Archive  E:\Backup  scattered...      │       │
│   └─────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Activation

### Phase 1: Prepare Knowledge (Gold Mine → RAG)

```powershell
# 1. Scan your scattered data (multi-root, deduplicated)
python knowledge\ingest_assets.py `
  --root "C:\bizra-genesis-node-repaired" `
  --root "C:\Projects" `
  --root "D:\Archive" `
  --max-files 500000 `
  --output "knowledge\ASSET_INVENTORY.json"

# 2. Refine into searchable chunks
python knowledge\refinery.py

# 3. (Optional) Build full hypergraph for deep RAG
python knowledge\scripts\build_knowledge_graph.py --source "C:\BIZRA-DATA-LAKE" --output knowledge\graph

# 4. (Optional) Generate embeddings if you have Qdrant
python knowledge\scripts\generate_embeddings.py --graph knowledge\graph
```

### Phase 2: Start Inference Backends

```powershell
# Terminal 1: Ollama
ollama serve

# Terminal 2: Pull required models (one-time)
ollama pull deepseek-r1:7b
ollama pull qwen2.5:7b
ollama pull mistral:7b

# Terminal 3: LM Studio (GUI)
# - Load agentflow-7b for ExecutionPlanner
# - Enable API server on port 1234
```

### Phase 3: Start BIZRA Services

```powershell
# Terminal 4: Start Rust backend
cd backend
cargo run --release

# Terminal 5: Start Dashboard
cd apps\dashboard
pnpm dev

# Terminal 6: (Optional) Start Bridge for WebSocket telemetry
cd bridge
pnpm dev
```

### Phase 4: Activate Agents via API

```powershell
# List available PAT agents
curl http://localhost:8080/api/pat/agents

# Chat with Master Reasoner (strategic thinking)
curl -X POST http://localhost:8080/api/pat/chat `
  -H "Content-Type: application/json" `
  -d '{"message": "Analyze my data lake and suggest organization strategy", "agent_role": "MasterReasoner"}'

# Chat with Execution Planner (powered by AgentFlow 7B)
curl -X POST http://localhost:8080/api/pat/chat `
  -H "Content-Type: application/json" `
  -d '{"message": "Create a 30-day plan to organize my 1.7TB of scattered files", "agent_role": "ExecutionPlanner"}'

# List SAT agents
curl http://localhost:8080/api/sat/agents

# Get SAT resource allocation recommendation
curl http://localhost:8080/api/sat/resources
```

---

## Agent → Model Mapping

### PAT Agents (User-facing)

| Agent | Model | Backend | Specialization |
|-------|-------|---------|----------------|
| **MasterReasoner** | deepseek-r1:7b | Ollama | Strategic thinking, complex decisions |
| **MemoryArchitect** | qwen2.5:7b | Ollama | Knowledge organization, connections |
| **CreativeSynthesizer** | qwen2.5:7b | Ollama | Writing, brainstorming, ideation |
| **DataAnalyzer** | mistral:7b | Ollama | Pattern recognition, insights |
| **Communicator** | mistral:7b | Ollama | Professional messaging |
| **ExecutionPlanner** | agentflow-7b | LM Studio | Task breakdown, scheduling |
| **EthicsGuardian** | qwen2.5:7b | Ollama | Safety compliance, Ihsan checks |

### SAT Agents (System-level)

| Agent | Function | Code Location |
|-------|----------|---------------|
| **PoiVerifier** | Validates Proof-of-Impact claims, enforces Ihsan threshold | `sat.rs:verify_poi_event` |
| **ResourceAllocator** | Manages CPU/GPU allocation | `sat.rs:recommend_allocation` |
| **RiskGuardian** | Monitors security threats | `sat.rs:assess_risk` |
| **GovernanceEngine** | Implements parameter changes | `sat.rs` |
| **EvidenceEngine** | Produces dashboards, reports | `sat.rs` |

---

## Training Mode: Real Tasks for Both Teams

The goal is to **train SAT + PAT on real Bizra workloads** so they learn patterns specific to your ecosystem.

### PAT Training Tasks

| Task | Agent | Goal |
|------|-------|------|
| "Organize my scattered data lake" | MemoryArchitect | Learn your file patterns, naming conventions |
| "Create roadmap for Bizra 2025" | ExecutionPlanner | Learn project structure, dependencies |
| "Draft investor update email" | Communicator | Learn tone, style, priorities |
| "Analyze performance of Node0" | DataAnalyzer | Learn system metrics, thresholds |
| "Review this code for ethics" | EthicsGuardian | Learn Ihsan criteria in practice |

### SAT Training Tasks

| Task | Agent | Goal |
|------|-------|------|
| Submit real PoI events | PoiVerifier | Calibrate Ihsan threshold on real data |
| Run under various CPU/GPU loads | ResourceAllocator | Learn optimal allocation patterns |
| Simulate security events | RiskGuardian | Build threat pattern database |
| Implement parameter changes | GovernanceEngine | Test upgrade logic safely |
| Generate weekly health reports | EvidenceEngine | Learn what metrics matter |

---

## Environment Variables

Create `.env` in repo root:

```env
# Inference backends
OLLAMA_URL=http://localhost:11434
LMSTUDIO_URL=http://localhost:1234

# Knowledge enrichment
KNOWLEDGE_ENRICHMENT=true
KNOWLEDGE_GRAPH_DIR=./knowledge/graph

# SAT thresholds
POI_IHSAN_THRESHOLD=0.85
RESOURCE_CPU_PERCENT=25
RESOURCE_GPU_ENABLED=true

# Dashboard
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Verification Checklist

- [ ] Ollama running: `curl http://localhost:11434/api/tags`
- [ ] LM Studio running: `curl http://localhost:1234/v1/models`
- [ ] Backend running: `curl http://localhost:8080/health`
- [ ] Dashboard running: `open http://localhost:3000`
- [ ] Knowledge indexed: `ls knowledge/ASSET_INVENTORY.json`
- [ ] PAT responds: `curl http://localhost:8080/api/pat/agents`
- [ ] SAT responds: `curl http://localhost:8080/api/sat/agents`

---

## Toward Bizra Family of Models

As you train PAT + SAT on real workloads, you're collecting:

1. **Conversations**: User ↔ Agent dialogue patterns
2. **Corrections**: When you fix agent outputs, that's training signal
3. **Preferences**: Which agents you use for which tasks
4. **Context patterns**: How knowledge enrichment helps responses

This data becomes the foundation for fine-tuning your own **Bizra family of models**:

| Model | Base | Specialization |
|-------|------|----------------|
| `bizra-reasoner-7b` | DeepSeek R1 | Strategic thinking tuned to Bizra context |
| `bizra-planner-7b` | AgentFlow | Task planning for your workflow patterns |
| `bizra-coder-7b` | Qwen Coder | Code generation for your stack (Rust/TS/Next) |
| `bizra-ethics-7b` | Qwen | Ihsan/Adl/Amānah calibrated to your values |

### Data Collection for Fine-Tuning

```sql
-- Collect PAT conversations for fine-tuning
CREATE TABLE training_data (
    id UUID PRIMARY KEY,
    agent_role TEXT,
    user_message TEXT,
    agent_response TEXT,
    user_rating INTEGER,  -- 1-5 thumbs
    corrected_response TEXT,  -- if user edited
    knowledge_context TEXT,  -- RAG context used
    created_at TIMESTAMPTZ
);
```

When you have ~10K high-quality examples per agent, you can fine-tune the base models into your Bizra family.

---

## Next Steps

1. **Run the activation sequence** (Phases 1-4 above)
2. **Start using agents for real tasks** (not toy examples)
3. **Collect feedback** (ratings, corrections)
4. **Iterate on prompts** (refine system prompts based on patterns)
5. **Fine-tune** when data is sufficient

---

*"The dual agentic system is the nervous system of Bizra. Train it on real work, and it becomes uniquely yours."* 🧬
