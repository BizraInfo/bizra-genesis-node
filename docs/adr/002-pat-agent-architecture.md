# ADR-002: PAT Agent Architecture

| **Status** | Accepted |
|------------|----------|
| **Date** | 2024-12-02 |
| **Decision Makers** | BIZRA Core Team |
| **Tags** | agents, pat, ai-architecture |

## Context

Users need personalized AI assistance that adapts to their unique needs, work styles, and goals. Traditional AI assistants are:

1. Generic and not personalized
2. Stateless between sessions
3. Not specialized for different tasks
4. Opaque in their reasoning

BIZRA requires a system of Personal AI Tutors (PATs) that truly understand and serve individual users.

## Decision

We will implement a **Multi-Agent PAT Architecture** with specialized agents coordinated by a Master Reasoner.

### Agent Roles

```typescript
enum PatAgent {
  MasterReasoner     = "The Orchestrator - coordinates all agents",
  MemoryArchitect    = "Long-term context and preference management",
  CreativeSynthesizer = "Creative ideation and content generation",
  DataAnalyzer       = "Quantitative analysis and pattern recognition",
  Communicator       = "Natural conversation and professional writing",
  ExecutionPlanner   = "Task breakdown and scheduling",
  EthicsGuardian     = "Ihsan compliance and ethical oversight"
}
```

### Architecture

```
                    ┌─────────────────────┐
                    │   MasterReasoner    │
                    │  (Orchestration)    │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────┴───────┐    ┌────────┴────────┐    ┌───────┴───────┐
│   Memory      │    │    Creative     │    │    Data       │
│   Architect   │    │   Synthesizer   │    │   Analyzer    │
└───────────────┘    └─────────────────┘    └───────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────┴───────┐    ┌────────┴────────┐    ┌───────┴───────┐
│ Communicator  │    │   Execution     │    │    Ethics     │
│               │    │   Planner       │    │   Guardian    │
└───────────────┘    └─────────────────┘    └───────────────┘
```

### Agent Selection Algorithm

```rust
fn select_primary_agent(user_query: &Query, context: &UserContext) -> PatAgent {
    let intent = analyze_intent(user_query);
    let user_preference = context.preferred_agent;
    let task_complexity = estimate_complexity(user_query);
    
    match (intent, task_complexity) {
        (Intent::Creative, _) => PatAgent::CreativeSynthesizer,
        (Intent::Analysis, Complexity::High) => PatAgent::DataAnalyzer,
        (Intent::Planning, _) => PatAgent::ExecutionPlanner,
        (Intent::Communication, _) => PatAgent::Communicator,
        (Intent::Recall, _) => PatAgent::MemoryArchitect,
        (_, Complexity::High) => PatAgent::MasterReasoner,
        _ => user_preference.unwrap_or(PatAgent::Communicator),
    }
}
```

### Memory Architecture

Each PAT agent has access to:

1. **Episodic Memory**: Recent conversation history (Redis)
2. **Semantic Memory**: Long-term knowledge (PostgreSQL + pgvector)
3. **Procedural Memory**: Learned user preferences (JSON profiles)

```sql
-- Vector storage for semantic memory
CREATE TABLE agent_memories (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    agent_type TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accessed_at TIMESTAMPTZ,
    importance_score REAL DEFAULT 0.5
);

-- Index for similarity search
CREATE INDEX ON agent_memories USING ivfflat (embedding vector_cosine_ops);
```

### Ethics Integration

The `EthicsGuardian` agent implements the Genesis Covenant:

```typescript
interface EthicsCheck {
  axiomId: string;
  passed: boolean;
  concern?: string;
  recommendation?: string;
}

async function validateAction(
  action: AgentAction,
  covenant: GenesisCovenant
): Promise<EthicsCheck[]> {
  return covenant.axioms.map(axiom => ({
    axiomId: axiom.id,
    passed: axiom.validate(action),
    concern: axiom.getConcern(action),
    recommendation: axiom.getRecommendation(action),
  }));
}
```

## Consequences

### Positive

- ✅ Specialized agents for different task types
- ✅ Coordinated responses through MasterReasoner
- ✅ Persistent memory across sessions
- ✅ Built-in ethical oversight
- ✅ User can select preferred primary agent

### Negative

- ⚠️ Higher compute requirements for multi-agent coordination
- ⚠️ Complexity in agent communication
- ⚠️ Potential for agent disagreement

### Mitigations

1. **Compute**: Efficient routing minimizes unnecessary agent calls
2. **Complexity**: Clear protocols for agent communication
3. **Disagreement**: MasterReasoner has final authority, logged for review

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Single agent response | < 500ms | TBD |
| Multi-agent coordination | < 2s | TBD |
| Memory retrieval | < 100ms | TBD |
| Ethics check | < 50ms | TBD |

## Related Decisions

- ADR-001: Sovereign AI Architecture
- ADR-003: Federation Protocol
- ADR-005: User Profile System

## References

- [PAT Agent API Spec](../api/pat-agents.md)
- [Memory Architecture](../api/memory-system.md)
