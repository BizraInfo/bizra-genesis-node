# 🧠 BIZRA Agent Experts

**Self-Improving Agents with Persistent Mental Models**

## The Problem We Solve

Traditional agents **forget everything** after each task. Engineers become memory managers, constantly rebooting context.

Agent Experts **execute AND learn**:
- Accumulate domain expertise in YAML mental models
- Validate against actual codebase (code is source of truth)
- Self-improve after each action
- Never relearn what they already know

## Directory Structure

```
/experts/
  /{domain}/
    ├── expertise.yaml        # Mental model (machine-readable knowledge)
    ├── question.prompt       # Query interface  
    └── self-improve.prompt   # Learning mechanism
```

## Available Experts

| Expert | Domain | Mental Model | Status |
|--------|--------|--------------|--------|
| **auth** | Authentication flows, JWT, sessions | `auth/expertise.yaml` | Active |
| **database** | Schema, relations, queries | `database/expertise.yaml` | Active |
| **websocket** | Events, handlers, protocols | `websocket/expertise.yaml` | Active |
| **inference** | LLM calls, prompts, tokens | `inference/expertise.yaml` | Active |
| **pat** | PAT agents, orchestration | `pat/expertise.yaml` | Active |
| **sat** | SAT agents, PoI, governance | `sat/expertise.yaml` | Active |

## Usage

### Query an Expert
```bash
python expert_runner.py --expert database --query "How do tables relate to each other?"
```

### Trigger Self-Improvement
```bash
python expert_runner.py --expert websocket --self-improve --diff "path/to/changes.diff"
```

### Interactive Mode
```bash
python expert_runner.py
# Then: /expert database
# Then: Ask questions
```

## The Three-Part Pattern

### 1. expertise.yaml (Mental Model)
```yaml
domain: database
version: "1.0.0"
last_updated: "2025-12-16T00:00:00Z"
snr_score: 0.87

knowledge:
  tables:
    - name: users
      purpose: "Core user identity"
      relations: ["sessions", "poi_events"]
  
  patterns:
    - name: "cascade_delete"
      description: "When user deleted, cascade to sessions"
      
  edge_cases:
    - scenario: "Orphaned sessions"
      handling: "Background job cleans up"
```

### 2. question.prompt (Query Interface)
```
You are the BIZRA Database Expert.

FIRST: Read your expertise file to understand current knowledge.
SECOND: Validate your mental model against actual code.
THIRD: Answer the question using validated knowledge.
FOURTH: If you learned something new, flag it for self-improvement.
```

### 3. self-improve.prompt (Learning Mechanism)
```
Analyze the code changes provided.
Update expertise.yaml with:
- New tables/relations discovered
- New patterns observed
- Edge cases encountered
- SNR improvements from learnings
```

## Integration with SystemProtocolKernel

All expert queries flow through the Ihsān-enforcing kernel:
- SNR tracked per expert
- Expertise freshness monitored
- Auto-improvement triggered when SNR drops
- Protocol hash logged for auditability

## The Rule of Three

- After 3 similar prompts → create Meta-Prompt
- After 3 similar agents → create Meta-Agent  
- After 3 similar experts → create Meta-Expert

This is how the system builds itself.
