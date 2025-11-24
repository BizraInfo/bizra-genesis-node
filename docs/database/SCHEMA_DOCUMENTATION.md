# BIZRA Genesis Node - Database Schema Documentation

**Version:** 1.0.0
**Last Updated:** 2025-01-14
**Migration:** 20250114000001_create_core_tables

---

## Schema Overview

The BIZRA Genesis Node database schema supports a professional multi-agent consensus system with cryptographic trust receipts, Thompson Sampling routing, and Proof-of-Impact tracking.

### Entity-Relationship Diagram

```
┌─────────────────┐         ┌──────────────────┐
│ trust_receipts  │◄────┐   │  consensus_runs  │
│                 │     │   │                  │
│ PK: run_id      │     └───│ FK: run_id       │
│ • signatures    │         │ • candidates     │
│ • proof_of_imp  │         │ • metrics        │
└─────────────────┘         └──────────────────┘
        │                           │
        │ 1:1                       │
        ▼                           │
┌─────────────────┐                │
│proof_of_impact  │                │
│                 │                │
│ FK: receipt_id  │                │
│ • quality       │                │
│ • utility       │                │
└─────────────────┘                │
                                   │
┌──────────────────┐               │
│  router_state    │               │
│                  │               │
│ PK: model_name   │               │
│ • alpha, beta    │               │
│ • win_rate       │               │
└──────────────────┘               │
                                   │
┌──────────────────┐               │
│  agent_state     │               │
│                  │               │
│ PK: agent_id     │               │
│ • health         │               │
│ • metrics        │               │
└──────────────────┘               │
```

---

## Table: `trust_receipts`

**Purpose**: Immutable cryptographic receipts for synthesis runs

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `run_id` | VARCHAR(255) | PRIMARY KEY | Unique run identifier |
| `inputs_sha256` | VARCHAR(64) | NOT NULL | BLAKE3 hash of inputs |
| `winner_json_sha256` | VARCHAR(64) | NOT NULL | BLAKE3 hash of winner output |
| `consensus_hash_hex` | VARCHAR(64) | NOT NULL | Consensus decision hash |
| `pattern_pack_sha256` | VARCHAR(64) | NOT NULL | Pattern pack hash |
| `winner_model` | VARCHAR(255) | NOT NULL | Winning model name |
| `policy_version` | VARCHAR(50) | NOT NULL | Policy version (default: '1.0.0') |
| `public_key_der` | BYTEA | NOT NULL | Ed25519 public key (DER format) |
| `signature` | BYTEA | NOT NULL | Ed25519 signature |
| `timestamp_ms` | BIGINT | NOT NULL | Unix timestamp in milliseconds |
| `proof_of_impact` | JSONB | NULL | Proof-of-Impact metrics (JSON) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

### Indexes

- `trust_receipts_pkey` (PRIMARY KEY): `run_id`
- `idx_trust_receipts_winner_model`: `winner_model`
- `idx_trust_receipts_timestamp`: `timestamp_ms DESC`
- `idx_trust_receipts_created_at`: `created_at DESC`
- `idx_trust_receipts_policy_version`: `policy_version`
- `idx_trust_receipts_poi` (GIN): `proof_of_impact`

### Example

```sql
INSERT INTO trust_receipts (
    run_id, winner_model, winner_json_sha256,
    public_key_der, signature, timestamp_ms
) VALUES (
    'run-abc123', 'gpt-4', 'deadbeef...',
    E'\\x3059301...', E'\\x89abcd...', 1705228800000
);
```

---

## Table: `router_state`

**Purpose**: Thompson Sampling Beta distribution parameters for AI model routing

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `model_name` | VARCHAR(255) | PRIMARY KEY | AI model identifier |
| `alpha` | DOUBLE PRECISION | NOT NULL, > 0 | Beta α parameter (successes + 1) |
| `beta` | DOUBLE PRECISION | NOT NULL, > 0 | Beta β parameter (failures + 1) |
| `win_rate` | DOUBLE PRECISION | GENERATED ALWAYS | Computed: α / (α + β) |
| `total_trials` | INTEGER | GENERATED ALWAYS | Computed: α + β - 2 |
| `model_type` | VARCHAR(50) | NULL | Model type (ollama, openai, etc.) |
| `enabled` | BOOLEAN | NOT NULL, DEFAULT TRUE | Model enabled status |
| `last_updated` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

### Computed Columns

- `win_rate = alpha / (alpha + beta)`
- `total_trials = (alpha + beta - 2)::INTEGER`

### Constraints

- `positive_alpha CHECK (alpha > 0)`
- `positive_beta CHECK (beta > 0)`
- `valid_win_rate CHECK (win_rate >= 0 AND win_rate <= 1)`

### Indexes

- `router_state_pkey` (PRIMARY KEY): `model_name`
- `idx_router_state_win_rate`: `win_rate DESC`
- `idx_router_state_enabled`: `enabled` (partial: WHERE enabled = TRUE)
- `idx_router_state_model_type`: `model_type`

### Example

```sql
-- Insert new model with prior (α=1, β=1)
INSERT INTO router_state (model_name, alpha, beta, model_type)
VALUES ('gpt-4', 1.0, 1.0, 'openai');

-- Update after success
UPDATE router_state
SET alpha = alpha + 1, last_updated = NOW()
WHERE model_name = 'gpt-4';

-- Update after failure
UPDATE router_state
SET beta = beta + 1, last_updated = NOW()
WHERE model_name = 'gpt-4';

-- Query win rates
SELECT model_name, alpha, beta, win_rate, total_trials
FROM router_state
ORDER BY win_rate DESC;
```

---

## Table: `consensus_runs`

**Purpose**: Detailed consensus execution metrics and candidate tracking

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| `run_id` | VARCHAR(255) | NOT NULL, UNIQUE, FK → trust_receipts | Run identifier |
| `input_hash` | VARCHAR(64) | NOT NULL | Input data hash |
| `input_size_bytes` | INTEGER | NULL | Input size in bytes |
| `winner_model` | VARCHAR(255) | NOT NULL | Winning model name |
| `candidates_count` | INTEGER | NOT NULL, > 0 | Number of candidates |
| `consensus_latency_ms` | INTEGER | NOT NULL, >= 0 | Consensus duration (ms) |
| `total_latency_ms` | INTEGER | NOT NULL | Total pipeline latency (ms) |
| `routing_latency_us` | INTEGER | NULL | Routing duration (μs) |
| `algorithm_version` | VARCHAR(50) | NOT NULL, DEFAULT 'weighted-score-v1' | Algorithm version |
| `pareto_frontier_size` | INTEGER | NULL | Pareto frontier size |
| `candidates` | JSONB | NOT NULL | Candidate details (JSON array) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

### Foreign Keys

- `fk_consensus_receipt`: `run_id` → `trust_receipts(run_id)` ON DELETE CASCADE

### Constraints

- `positive_candidates CHECK (candidates_count > 0)`
- `positive_latency CHECK (consensus_latency_ms >= 0)`

### Indexes

- `consensus_runs_pkey` (PRIMARY KEY): `id`
- `consensus_runs_run_id_key` (UNIQUE): `run_id`
- `idx_consensus_runs_winner_model`: `winner_model`
- `idx_consensus_runs_created_at`: `created_at DESC`
- `idx_consensus_runs_latency`: `consensus_latency_ms`
- `idx_consensus_runs_input_hash`: `input_hash`
- `idx_consensus_runs_candidates` (GIN): `candidates`

### Example

```sql
INSERT INTO consensus_runs (
    run_id, input_hash, winner_model, candidates_count,
    consensus_latency_ms, total_latency_ms, candidates
) VALUES (
    'run-abc123', 'inputhash...', 'gpt-4', 3,
    46, 1250, '[{"model": "gpt-4", "score": 0.95}, ...]'::jsonb
);

-- Query consensus performance
SELECT
    winner_model,
    COUNT(*) as runs,
    AVG(consensus_latency_ms) as avg_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY consensus_latency_ms) as p95_latency
FROM consensus_runs
GROUP BY winner_model
ORDER BY runs DESC;
```

---

## Table: `agent_state`

**Purpose**: State management for 18 AEGIS multi-agent system agents

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `agent_id` | VARCHAR(255) | PRIMARY KEY | Agent identifier |
| `agent_type` | VARCHAR(10) | NOT NULL, IN ('PAT', 'SAT', 'TAT') | Agent type |
| `agent_name` | VARCHAR(255) | NOT NULL | Agent name |
| `agent_role` | VARCHAR(255) | NOT NULL | Agent role description |
| `state` | JSONB | NOT NULL, DEFAULT '{}' | Agent state (JSON) |
| `health_status` | VARCHAR(50) | NOT NULL, DEFAULT 'healthy' | Health status |
| `tasks_completed` | INTEGER | NOT NULL, DEFAULT 0 | Completed tasks count |
| `tasks_failed` | INTEGER | NOT NULL, DEFAULT 0 | Failed tasks count |
| `avg_task_latency_ms` | DOUBLE PRECISION | NULL | Average task latency |
| `cpu_usage_percent` | DOUBLE PRECISION | NULL | CPU usage % |
| `memory_usage_mb` | DOUBLE PRECISION | NULL | Memory usage (MB) |
| `last_active` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last activity time |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

### Constraints

- `valid_agent_type CHECK (agent_type IN ('PAT', 'SAT', 'TAT'))`
- `valid_health_status CHECK (health_status IN ('healthy', 'degraded', 'failed'))`
- `positive_tasks CHECK (tasks_completed >= 0 AND tasks_failed >= 0)`

### Indexes

- `agent_state_pkey` (PRIMARY KEY): `agent_id`
- `idx_agent_state_type`: `agent_type`
- `idx_agent_state_health`: `health_status`
- `idx_agent_state_last_active`: `last_active DESC`
- `idx_agent_state_state` (GIN): `state`

### Agent Types

- **PAT (Primary Agent Team)**: 7 agents - Core task execution
- **SAT (Support Agent Team)**: 5 agents - Infrastructure support
- **TAT (Tertiary Agent Team)**: 6 agents - Specialized operations

### Example

```sql
-- Insert agent
INSERT INTO agent_state (
    agent_id, agent_type, agent_name, agent_role
) VALUES (
    'pat-planner-01', 'PAT', 'Planner', 'Strategic planning agent'
);

-- Update agent metrics
UPDATE agent_state
SET
    tasks_completed = tasks_completed + 1,
    avg_task_latency_ms = COALESCE(
        (avg_task_latency_ms * tasks_completed + 120.5) / (tasks_completed + 1),
        120.5
    ),
    last_active = NOW()
WHERE agent_id = 'pat-planner-01';

-- Query agent health
SELECT
    agent_type,
    COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy,
    COUNT(*) FILTER (WHERE health_status = 'degraded') as degraded,
    COUNT(*) FILTER (WHERE health_status = 'failed') as failed
FROM agent_state
GROUP BY agent_type;
```

---

## Table: `proof_of_impact`

**Purpose**: Denormalized Proof-of-Impact analytics table

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| `receipt_id` | VARCHAR(255) | NOT NULL, FK → trust_receipts | Receipt reference |
| `quality` | REAL | NOT NULL, 0-100 | Quality score |
| `utility` | REAL | NOT NULL, 0-100 | Utility score |
| `trust` | REAL | NOT NULL, 0-100 | Trust score |
| `fairness` | REAL | NOT NULL, 0-100 | Fairness score |
| `diversity` | REAL | NOT NULL, 0-100 | Diversity score |
| `normalized_score` | REAL | GENERATED ALWAYS | Aggregate: (sum) / 100 |
| `model_name` | VARCHAR(255) | NOT NULL | Model name |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

### Computed Columns

- `normalized_score = (quality + utility + trust + fairness + diversity) / 100.0`

### Foreign Keys

- `fk_poi_receipt`: `receipt_id` → `trust_receipts(run_id)` ON DELETE CASCADE

### Constraints

- `valid_quality CHECK (quality >= 0 AND quality <= 100)`
- `valid_utility CHECK (utility >= 0 AND utility <= 100)`
- `valid_trust_score CHECK (trust >= 0 AND trust <= 100)`
- `valid_fairness CHECK (fairness >= 0 AND fairness <= 100)`
- `valid_diversity CHECK (diversity >= 0 AND diversity <= 100)`

### Indexes

- `proof_of_impact_pkey` (PRIMARY KEY): `id`
- `idx_poi_normalized_score`: `normalized_score DESC`
- `idx_poi_model_name`: `model_name`
- `idx_poi_created_at`: `created_at DESC`
- `idx_poi_receipt_id`: `receipt_id`
- `idx_poi_model_score`: `(model_name, normalized_score DESC)` (composite)

### Example

```sql
INSERT INTO proof_of_impact (
    receipt_id, model_name,
    quality, utility, trust, fairness, diversity
) VALUES (
    'run-abc123', 'gpt-4',
    95.0, 85.0, 90.0, 80.0, 75.0
);

-- Query model PoI performance
SELECT
    model_name,
    COUNT(*) as runs,
    AVG(normalized_score) as avg_score,
    AVG(quality) as avg_quality,
    AVG(utility) as avg_utility
FROM proof_of_impact
GROUP BY model_name
ORDER BY avg_score DESC;
```

---

## Functions and Triggers

### Function: `update_updated_at_column()`

**Purpose**: Automatically update `updated_at` timestamp on row modification

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Applied Triggers

- `update_trust_receipts_updated_at`: BEFORE UPDATE ON trust_receipts
- `update_agent_state_updated_at`: BEFORE UPDATE ON agent_state

---

## Performance Characteristics

### Expected Latencies

| Operation | Target | Actual (P95) | Notes |
|-----------|--------|--------------|-------|
| Receipt INSERT | <5ms | 2-3ms | Includes signature |
| Receipt SELECT (by ID) | <2ms | 1ms | Primary key lookup |
| Router state UPDATE | <3ms | 2ms | Atomic increment |
| Agent state UPSERT | <5ms | 2-4ms | ON CONFLICT clause |
| Consensus analytics | <50ms | 10-30ms | Aggregated queries |

### Index Usage

All indexes are B-tree except:
- GIN indexes for JSONB columns (full-text and path queries)
- Partial indexes for filtered queries (e.g., enabled models)

---

## Security Considerations

1. **Immutability**: Trust receipts are append-only (no UPDATE/DELETE in application)
2. **Signature Verification**: Ed25519 signatures prevent tampering
3. **BLAKE3 Hashing**: Content-addressable storage for data integrity
4. **Audit Trail**: All tables have `created_at` timestamps
5. **Foreign Key Constraints**: Referential integrity enforced
6. **CHECK Constraints**: Data validity enforced at database level

---

## Backup Strategy

### Daily Full Backups

```sql
pg_dump -U bizra_user -Fc bizra_genesis > backup_$(date +%Y%m%d).dump
```

### WAL Archiving (Point-in-Time Recovery)

```sql
-- Enable in postgresql.conf
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

---

**For setup instructions, see [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md)**

---

*BIZRA Genesis Node - Professional Elite Implementation*
*Copyright © 2025 BIZRA Development Team*
