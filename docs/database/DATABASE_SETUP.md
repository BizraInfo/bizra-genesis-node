# Database Setup Guide - BIZRA Genesis Node

**Version**: 1.0.0
**Date**: 2025-01-14
**Author**: BIZRA Development Team

---

## Overview

BIZRA Genesis Node uses a polyglot persistence architecture (per [ADR-003](../architecture/adr-003-database-architecture.md)):

- **PostgreSQL 15+**: Transactional data (receipts, consensus runs, agents)
- **Redis 7+**: Caching layer (router state, agent metrics)
- **Neo4j 5** (Phase 3): Graph database for agent relationships
- **ChromaDB 0.4** (Phase 3): Vector database for AI embeddings

**Phase 2 Sprint 2.1 Focus**: PostgreSQL + Redis implementation

---

## Prerequisites

### Required Software

1. **PostgreSQL 15 or later**
   - Windows: [PostgreSQL Installer](https://www.postgresql.org/download/windows/)
   - Linux: `sudo apt-get install postgresql-15 postgresql-contrib`
   - macOS: `brew install postgresql@15`

2. **Redis 7 or later**
   - Windows: [Redis for Windows](https://github.com/tporadowski/redis/releases) or use WSL2
   - Linux: `sudo apt-get install redis-server`
   - macOS: `brew install redis`

3. **SQLx CLI** (for migrations)
   ```bash
   cargo install sqlx-cli --no-default-features --features postgres
   ```

---

## PostgreSQL Setup

### 1. Create Database User

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create BIZRA database user
CREATE USER bizra_user WITH PASSWORD 'bizra_password';

-- Create databases
CREATE DATABASE bizra_genesis OWNER bizra_user;
CREATE DATABASE bizra_genesis_test OWNER bizra_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bizra_genesis TO bizra_user;
GRANT ALL PRIVILEGES ON DATABASE bizra_genesis_test TO bizra_user;

-- Exit psql
\q
```

### 2. Enable Required Extensions

```sql
-- Connect to the database
psql -U bizra_user -d bizra_genesis

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\q
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update:

```bash
DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"
TEST_DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis_test"
```

### 4. Run Migrations

```bash
# Ensure DATABASE_URL is set
export DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"

# Run migrations
sqlx migrate run

# Verify migration status
sqlx migrate info
```

**Expected Output:**
```
Applied migrations:
- 20250114000001_create_core_tables
```

### 5. Verify Schema

```bash
psql -U bizra_user -d bizra_genesis

# List tables
\dt

# Expected tables:
# - trust_receipts
# - router_state
# - consensus_runs
# - agent_state
# - proof_of_impact

# Check a table structure
\d trust_receipts

\q
```

---

## Redis Setup

### 1. Start Redis Server

**Linux/macOS:**
```bash
redis-server
```

**Windows (WSL2):**
```bash
redis-server
```

**Windows (native):**
```bash
redis-server.exe
```

### 2. Verify Redis Connection

```bash
# Connect to Redis CLI
redis-cli

# Test connection
127.0.0.1:6379> PING
PONG

# Exit
127.0.0.1:6379> EXIT
```

### 3. Configure Environment Variables

In `.env`:
```bash
REDIS_URL="redis://localhost:6379"
REDIS_POOL_SIZE=20
```

---

## SQLx Compile-Time Verification

SQLx provides compile-time query verification, which requires either:

### Option 1: Online Mode (Recommended for Development)

Set `DATABASE_URL` in your environment, and SQLx will verify queries against the live database during compilation:

```bash
export DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"
cargo build
```

### Option 2: Offline Mode (CI/CD, No Database)

Generate query metadata cache for offline compilation:

```bash
# With DATABASE_URL set
cargo sqlx prepare

# This creates .sqlx/query-*.json files
# Commit these files to git for CI/CD
```

**In CI/CD**, set:
```bash
SQLX_OFFLINE=true
cargo build
```

---

## Database Schema

### Core Tables

#### 1. `trust_receipts`
Stores immutable cryptographic receipts with Ed25519 signatures.

| Column | Type | Description |
|--------|------|-------------|
| `run_id` | VARCHAR(255) PK | Unique run identifier |
| `winner_model` | VARCHAR(255) | Winning AI model name |
| `winner_json_sha256` | VARCHAR(64) | BLAKE3 hash of output |
| `public_key_der` | BYTEA | Ed25519 public key |
| `signature` | BYTEA | Ed25519 signature |
| `proof_of_impact` | JSONB | PoI metrics (nullable) |
| `timestamp_ms` | BIGINT | Unix timestamp (ms) |

**Indexes:**
- `idx_trust_receipts_winner_model` - Performance
- `idx_trust_receipts_timestamp` - Time-based queries
- `idx_trust_receipts_poi` - JSONB GIN index

#### 2. `router_state`
Thompson Sampling Beta distribution parameters.

| Column | Type | Description |
|--------|------|-------------|
| `model_name` | VARCHAR(255) PK | AI model name |
| `alpha` | DOUBLE PRECISION | Successes + 1 |
| `beta` | DOUBLE PRECISION | Failures + 1 |
| `win_rate` | DOUBLE PRECISION | Computed: α/(α+β) |
| `total_trials` | INTEGER | Computed: α+β-2 |
| `enabled` | BOOLEAN | Model enabled flag |

**Computed Columns:**
- `win_rate` - Generated always as `alpha / (alpha + beta)`
- `total_trials` - Generated always as `(alpha + beta - 2)::INTEGER`

#### 3. `consensus_runs`
Consensus execution metrics and results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated ID |
| `run_id` | VARCHAR(255) UNIQUE | Links to trust_receipts |
| `winner_model` | VARCHAR(255) | Winning model |
| `consensus_latency_ms` | INTEGER | Consensus latency |
| `candidates` | JSONB | Full candidate details |

#### 4. `agent_state`
AEGIS multi-agent system state (18 agents).

| Column | Type | Description |
|--------|------|-------------|
| `agent_id` | VARCHAR(255) PK | Unique agent ID |
| `agent_type` | VARCHAR(10) | PAT, SAT, or TAT |
| `state` | JSONB | Agent-specific state |
| `health_status` | VARCHAR(50) | healthy/degraded/failed |
| `tasks_completed` | INTEGER | Success counter |

#### 5. `proof_of_impact`
Denormalized PoI analytics table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated ID |
| `receipt_id` | VARCHAR(255) FK | Links to trust_receipts |
| `quality` | REAL | Quality score (0-100) |
| `utility` | REAL | Utility score (0-100) |
| `trust` | REAL | Trust score (0-100) |
| `fairness` | REAL | Fairness score (0-100) |
| `diversity` | REAL | Diversity score (0-100) |
| `normalized_score` | REAL | Computed aggregate (0-5) |

---

## Testing

### Unit Tests (No Database)

```bash
cargo test --lib
```

### Integration Tests (Requires Database)

```bash
# Set test database URL
export TEST_DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis_test"

# Run migrations on test database
sqlx migrate run --database-url "$TEST_DATABASE_URL"

# Run integration tests
cargo test --test '*'
```

**Note:** Integration tests are marked with `#[ignore]` by default. Run with:
```bash
cargo test -- --ignored
```

---

## Connection Pooling

### PostgreSQL Pool Configuration

The `DatabasePool` uses PgPool with optimized settings:

```rust
PgPoolOptions::new()
    .max_connections(100)      // Maximum concurrent connections
    .min_connections(10)       // Warm pool size
    .acquire_timeout(30s)      // Connection acquisition timeout
    .idle_timeout(10m)         // Idle connection timeout
    .max_lifetime(30m)         // Maximum connection lifetime
```

### Redis Pool Configuration

Redis connection manager with configurable pool size:

```rust
redis::aio::ConnectionManager::new(client)
    .pool_size(20)  // Configurable via REDIS_POOL_SIZE
```

---

## Performance Optimization

### PostgreSQL Tuning

Edit `postgresql.conf`:

```ini
# Memory Settings
shared_buffers = 256MB              # 25% of RAM for dedicated DB server
effective_cache_size = 1GB          # 50-75% of RAM
work_mem = 16MB                     # Per-operation memory

# Write-Ahead Log
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Query Planner
random_page_cost = 1.1              # For SSD storage
effective_io_concurrency = 200      # For SSD storage

# Monitoring
log_min_duration_statement = 1000   # Log queries >1s
```

### Redis Tuning

Edit `redis.conf`:

```ini
# Memory Management
maxmemory 512mb
maxmemory-policy allkeys-lru        # Evict least recently used

# Persistence (for router state durability)
appendonly yes
appendfsync everysec

# Performance
tcp-backlog 511
timeout 300
```

---

## Troubleshooting

### Problem: `sqlx migrate run` fails

**Solution:**
```bash
# Check database connection
psql -U bizra_user -d bizra_genesis -c "SELECT version();"

# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Check migrations directory exists
ls migrations/
```

### Problem: Compile-time query errors

**Solution:**
```bash
# Option 1: Set DATABASE_URL
export DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"

# Option 2: Use offline mode
cargo sqlx prepare
export SQLX_OFFLINE=true
cargo build
```

### Problem: Connection pool exhausted

**Solution:**
```bash
# Increase max connections in PostgreSQL
# Edit postgresql.conf:
max_connections = 200

# Restart PostgreSQL
sudo systemctl restart postgresql

# Or adjust pool size in .env:
DATABASE_MAX_CONNECTIONS=150
```

---

## Backup and Recovery

### PostgreSQL Backup

```bash
# Daily backup script
pg_dump -U bizra_user bizra_genesis > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U bizra_user bizra_genesis < backup_20250114.sql
```

### Redis Backup

Redis automatically saves to `dump.rdb` based on save policy:

```bash
# Manual backup
redis-cli SAVE

# Copy dump.rdb to backup location
cp /var/lib/redis/dump.rdb /backup/redis_$(date +%Y%m%d).rdb
```

---

## Monitoring

### Health Checks

```bash
# PostgreSQL health
psql -U bizra_user -d bizra_genesis -c "SELECT 1;"

# Redis health
redis-cli PING
```

### Query Performance

```sql
-- Find slow queries (PostgreSQL)
SELECT
    query,
    calls,
    total_time / calls AS avg_time_ms,
    min_time AS min_ms,
    max_time AS max_ms
FROM pg_stat_statements
WHERE total_time > 1000
ORDER BY avg_time_ms DESC
LIMIT 10;
```

### Connection Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'bizra_genesis';

-- Connection details
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE datname = 'bizra_genesis';
```

---

## Security Considerations

### PostgreSQL Security

1. **Use strong passwords** (minimum 16 characters)
2. **Enable SSL/TLS** in production:
   ```sql
   ALTER SYSTEM SET ssl = 'on';
   SELECT pg_reload_conf();
   ```
3. **Row-level security** for multi-tenancy (future phase)
4. **Regular security patches**

### Redis Security

1. **Require password authentication**:
   ```ini
   requirepass your_strong_password_here
   ```
2. **Bind to localhost** in development:
   ```ini
   bind 127.0.0.1 ::1
   ```
3. **Disable dangerous commands**:
   ```ini
   rename-command FLUSHDB ""
   rename-command FLUSHALL ""
   ```

---

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/15/)
- [Redis Documentation](https://redis.io/docs/)
- [SQLx Documentation](https://docs.rs/sqlx/)
- [ADR-003: Database Architecture](../architecture/adr-003-database-architecture.md)
- [ADR-005: PostgreSQL + Redis for Data](../adrs/ADR-005-postgresql-redis-data.md)

---

**Next Steps:**
- [Implement Redis Caching Layer](./REDIS_INTEGRATION.md)
- [Run Integration Tests](../../tests/README.md)
- [Deploy to Kubernetes](../ops/k8s-deployment.md)

---

*إن شاء الله - Excellence through robust data persistence*
