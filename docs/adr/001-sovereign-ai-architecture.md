# ADR-001: Sovereign AI Architecture

| **Status** | Accepted |
|------------|----------|
| **Date** | 2024-12-02 |
| **Decision Makers** | BIZRA Core Team |
| **Tags** | architecture, sovereignty, ai |

## Context

BIZRA requires a fundamentally different approach to AI infrastructure that prioritizes user sovereignty, data privacy, and local-first computation. Traditional cloud-based AI services pose significant risks:

1. **Data Sovereignty**: User data leaves their control
2. **Dependency Lock-in**: Reliance on third-party API availability
3. **Cost Unpredictability**: Usage-based pricing without control
4. **Latency**: Network round-trips for every AI interaction
5. **Privacy Violations**: Training on user data without consent

## Decision

We will implement a **Local-First AI Architecture** with the following principles:

### Core Principles

1. **All AI Models Run Locally**
   - Ollama as the primary model serving infrastructure
   - Support for llama.cpp, vLLM as alternatives
   - GPU acceleration via CUDA for RTX 4090

2. **Zero Cloud AI Dependencies**
   - No OpenAI, Anthropic, Google AI, or similar services
   - Pre-commit hooks enforce this at code level
   - CI/CD pipeline includes sovereignty verification

3. **Data Never Leaves the Node**
   - PostgreSQL for persistent storage
   - Redis for ephemeral/cache data
   - All processing happens on user's hardware

4. **Federation Over Centralization**
   - Nodes can communicate peer-to-peer
   - No central authority required
   - Proof Protocol enables distributed consensus

### Technical Implementation

```
┌─────────────────────────────────────────────────────┐
│                    USER'S HARDWARE                   │
│  ┌─────────────────────────────────────────────┐   │
│  │              BIZRA Dashboard                 │   │
│  │            (Next.js Frontend)               │   │
│  └─────────────────────────────────────────────┘   │
│                        │                            │
│  ┌─────────────────────────────────────────────┐   │
│  │              BIZRA API Server               │   │
│  │              (Rust/Axum)                    │   │
│  └─────────────────────────────────────────────┘   │
│         │              │              │            │
│  ┌──────┴──────┐ ┌─────┴─────┐ ┌──────┴──────┐   │
│  │  Ollama     │ │ PostgreSQL│ │   Redis     │   │
│  │  (Local AI) │ │  (Data)   │ │  (Cache)    │   │
│  └─────────────┘ └───────────┘ └─────────────┘   │
│         │                                          │
│  ┌──────┴──────┐                                  │
│  │   GPU       │                                  │
│  │  (RTX 4090) │                                  │
│  └─────────────┘                                  │
└─────────────────────────────────────────────────────┘
```

### Model Selection Criteria

| Model | Size | Use Case | VRAM Required |
|-------|------|----------|---------------|
| llama3:8b | 8B | General reasoning | 8GB |
| llama3:70b | 70B | Complex tasks | 48GB+ |
| codellama:34b | 34B | Code generation | 24GB |
| mistral:7b | 7B | Fast responses | 6GB |
| deepseek-coder:6.7b | 6.7B | Code assistant | 6GB |

## Consequences

### Positive

- ✅ Complete data sovereignty
- ✅ Zero usage-based costs after hardware investment
- ✅ Consistent latency (no network dependency)
- ✅ Works offline
- ✅ User owns the infrastructure

### Negative

- ⚠️ Higher initial hardware investment
- ⚠️ User responsible for model updates
- ⚠️ Limited to models that fit in local hardware
- ⚠️ No access to proprietary frontier models

### Mitigations

1. **Hardware Investment**: RTX 4090 provides excellent price/performance
2. **Model Updates**: Automated update system via Ollama
3. **Model Limitations**: Federation allows borrowing compute from peers (opt-in)
4. **Frontier Models**: Open-source models catching up rapidly

## Compliance

This decision ensures compliance with:

- **GDPR Article 17**: Right to erasure (all data is local)
- **CCPA**: Consumer data control (user owns data)
- **AI Act**: Transparency (open-source models)

## Related Decisions

- ADR-002: PAT Agent Architecture
- ADR-003: Federation Protocol
- ADR-004: Proof of Impact Protocol

## References

- [Ollama Documentation](https://ollama.ai/docs)
- [Local AI Manifesto](https://localai.io)
- [BIZRA Genesis Covenant](../lib/GenesisCovenant.ts)
