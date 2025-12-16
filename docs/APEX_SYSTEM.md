# BIZRA APEX System — The Convergence

See also: [docs/BIZRA_SYSTEM_ARCHITECTURE_ATLAS.md](docs/BIZRA_SYSTEM_ARCHITECTURE_ATLAS.md)

**Version:** 1.0.0  
**Date:** 2025-12-16  
**Status:** ✅ Operational

---

## The Three Pillars

### 1. Agent Experts (Self-Improving Intelligence)
Traditional agents execute and forget. **Agent Experts execute AND learn**.

Each expert maintains a persistent mental model (`expertise.yaml`) that accumulates knowledge automatically:

```
experts/
├── pat/expertise.yaml      # PAT agent orchestration
├── sat/expertise.yaml      # SAT rule-based governance
├── database/expertise.yaml # PostgreSQL/Redis schema
├── inference/expertise.yaml # LLM backend optimization
└── knowledge/expertise.yaml # RAG pipeline expertise
```

**Key Insight:** At runtime, the expert's mental model is injected into every query, providing domain-specific context without re-training.

### 2. SystemProtocolKernel (Ethical Microkernel)
The **Ihsān enforcement layer** that governs all APEX operations:

- **Ihsān Vector (8 dimensions):** correctness, safety, user_benefit, efficiency, auditability, anti_centralization, robustness, adl_fairness
- **SNR Optimization:** `(useful_tokens / total_tokens) × confidence × ethics × directness`
- **Protocol Hashing:** Cryptographic auditability for every action
- **FATE Escalation:** Automatic human-in-the-loop when thresholds violated

### 3. APEX Runner (Unified Orchestration)
The **convergence point** that combines Experts + Kernel:

```python
from apex_runner import APEXRunner

runner = APEXRunner()
result = runner.query_with_kernel("pat", "How do I add a new agent?")
# Result includes: response, ihsan_score, snr_score, latency_ms, session_audit
```

---

## Quick Start

### Status Check
```bash
python apex_runner.py --status
```

### Query an Expert
```bash
python apex_runner.py --expert pat "How do I orchestrate multiple agents?"
```

### Validate Expert Knowledge
```bash
python apex_runner.py --validate database
```

### Interactive Mode
```bash
python apex_runner.py --interactive
```

Commands:
- `/status` — System status
- `/experts` — List all experts
- `/expert <name>` — Switch expert
- `/validate` — Validate current expert
- `/kernel` — Kernel metrics
- `/quit` — Exit

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     APEX RUNNER (Layer 7)                       │
│              Unified Query Interface + Session Mgmt             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SYSTEM PROTOCOL KERNEL (Layer 4)                │
│              Ihsān Enforcement │ SNR Tracking │ FATE            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT EXPERTS (Layer 3)                      │
│                                                                 │
│   ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌───────┐ │
│   │   PAT   │ │   SAT   │ │ Database │ │ Inference │ │ Know. │ │
│   │ Expert  │ │ Expert  │ │  Expert  │ │  Expert   │ │Expert │ │
│   └────┬────┘ └────┬────┘ └────┬─────┘ └─────┬─────┘ └───┬───┘ │
│        │           │           │             │           │      │
│   expertise   expertise   expertise     expertise   expertise   │
│     .yaml       .yaml       .yaml         .yaml       .yaml     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LLM BACKENDS (Layer 2)                       │
│              Ollama (:11434) │ LM Studio (:1234)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Expert Mental Model Structure

Each `expertise.yaml` follows this structure:

```yaml
domain: "<name>"
version: "1.0.0"
description: "<what this expert knows>"
snr_score: 0.85
ihsan_score: 0.92
last_updated: "2025-12-16T00:00:00Z"

key_files:
  - path: "path/to/file.py"
    description: "Purpose of this file"

concepts:
  - name: "Concept Name"
    description: "What it does"
    implementation: "Where/how it's implemented"

common_patterns:
  - pattern: "Pattern Name"
    description: "When to use it"
    example: "Code example"

edge_cases:
  - description: "Tricky situation"
    resolution: "How to handle it"

improvement_history:
  - date: "2025-12-16"
    delta: 0.03
    source: "validation_run"
    details: "What was learned"
```

---

## Self-Improvement Mechanism

Experts improve their mental models automatically:

1. **Validation:** Compare `key_files` against actual codebase
2. **Query Analysis:** Track successful vs failed queries
3. **SNR Delta:** Measure improvement in token efficiency
4. **Knowledge Injection:** Update `concepts` and `common_patterns`

```bash
# Trigger self-improvement for an expert
python expert_runner.py --expert pat --self-improve
```

The expert analyzes recent interactions and updates its `expertise.yaml` with new insights.

---

## Ihsān Thresholds

| Dimension           | Weight | Threshold |
|---------------------|--------|-----------|
| Correctness         | 0.22   | ≥ 0.90    |
| Safety              | 0.22   | ≥ 0.95    |
| User Benefit        | 0.14   | ≥ 0.85    |
| Efficiency          | 0.12   | ≥ 0.80    |
| Auditability        | 0.12   | ≥ 0.90    |
| Anti-Centralization | 0.08   | ≥ 0.70    |
| Robustness          | 0.06   | ≥ 0.80    |
| ADL Fairness        | 0.04   | ≥ 0.85    |

**Composite Threshold:** I_vec ≥ 0.95

---

## Files

| File | Purpose |
|------|---------|
| [apex_runner.py](apex_runner.py) | Unified APEX runner |
| [system_protocol_kernel.py](system_protocol_kernel.py) | Ihsān enforcement kernel |
| [expert_runner.py](expert_runner.py) | Expert query & self-improvement |
| [experts/README.md](experts/README.md) | Expert documentation |
| [experts/*/expertise.yaml](experts/) | Mental models |

---

## The Vision

> "The best way to predict the future is to build it." — Alan Kay

BIZRA APEX represents the convergence of:
- **SystemProtocol 2.0:** Bounded autonomy with cryptographic proof
- **Ihsān Ethics:** 8-dimensional ethical alignment
- **Agent Experts:** Self-improving intelligence without fine-tuning
- **SNR Optimization:** Maximum signal, minimum noise

This is not just a system—it's a **living architecture** that gets smarter with every interaction while maintaining ethical alignment.

---

**Built with Ihsān. Governed by Protocol. Improved by Experience.**
