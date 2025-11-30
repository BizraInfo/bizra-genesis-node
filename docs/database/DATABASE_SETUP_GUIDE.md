# BIZRA Genesis Node - Database Setup Guide

**Version:** 1.0.0
**Last Updated:** 2025-01-14
**Phase:** Phase 2 - Enterprise Integration

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [PostgreSQL Setup](#postgresql-setup)
5. [Redis Setup](#redis-setup)
6. [Running Migrations](#running-migrations)
7. [Configuration](#configuration)
8. [Testing](#testing)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Overview

BIZRA Genesis Node uses a **polyglot persistence architecture** optimized for different data access patterns:

- **PostgreSQL**: ACID-compliant transactional storage for trust receipts, consensus runs, and agent state
- **Redis**: High-performance in-memory caching layer (<1ms latency) for hot data

### Key Features

- ✅ **Compile-Time Query Verification**: SQLx macros ensure SQL correctness at build time
- ✅ **Connection Pooling**: Optimized for 10,000+ concurrent users
- ✅ **Cache-Aside Pattern**: Redis caching with automatic invalidation
- ✅ **Database Migrations**: Version-controlled schema evolution
- ✅ **Performance Monitoring**: Built-in metrics and health checks

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │       BIZRA Genesis Node (Rust Application)         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │ Receipt  │  │ Router   │  │ Agent    │          │    │
│  │  │   Repo   │  │   Repo   │  │   Repo   │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                        │         │
                        ▼         ▼
        ┌───────────────────┬───────────────────┐
        │                   │                   │
        ▼                   ▼                   │
┌──────────────┐    ┌──────────────┐            │
│  PostgreSQL  │    │    Redis     │            │
│  (Primary)   │    │   (Cache)    │            │
│              │    │              │            │
│ • Receipts   │    │ • Router     │            │
│ • Consensus  │    │   State      │            │
│ • Agents     │    │ • Agent      │            │
│ • PoI        │    │   Metrics    │            │
└──────────────┘    └──────────────┘            │
        │                   │                   │
        └───────────────────┴───────────────────┘
                        │
                        ▼
              ┌────────────────────┐
              │   Persistent       │
              │   Storage          │
              │   (Volumes/Disks)  │
              └────────────────────┘
```

### Data Flow

1. **Write Path**: Application → PostgreSQL (source of truth) → Redis (cache update)
2. **Read Path**: Application → Redis (cache hit) → PostgreSQL (cache miss)
3. **Invalidation**: Write operation → Redis cache invalidation → Fresh read from PostgreSQL

---

## Prerequisites

### Required Software

- **PostgreSQL 15+**: Relational database
- **Redis 7+**: In-memory cache
- **Rust 1.75+**: Application runtime
- **SQLx CLI**: Database migration tool

### Optional (for Production)

- **Docker & Docker Compose**: Containerization
- **PgBouncer**: Connection pooling (if not using built-in pool)
- **Redis Sentinel/Cluster**: High availability

---

## PostgreSQL Setup

### Option 1: Docker (Recommended for Development)

```bash
# Create Docker network
docker network create bizra-network

# Run PostgreSQL container
docker run -d \
  --name bizra-postgres \
  --network bizra-network \
  -e POSTGRES_USER=bizra_user \
  -e POSTGRES_PASSWORD=bizra_password \
  -e POSTGRES_DB=bizra_genesis \
  -p 5432:5432 \
  -v bizra_pgdata:/var/lib/postgresql/data \
  postgres:15-alpine

# Verify connection
docker exec -it bizra-postgres psql -U bizra_user -d bizra_genesis -c "SELECT version();"
```

### Option 2: Local Installation

#### Ubuntu/Debian

```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install postgresql-15 postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER bizra_user WITH PASSWORD 'bizra_password';
CREATE DATABASE bizra_genesis OWNER bizra_user;
GRANT ALL PRIVILEGES ON DATABASE bizra_genesis TO bizra_user;
ALTER USER bizra_user WITH SUPERUSER; -- For migrations
\q
EOF
```

#### macOS (Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database and user
psql postgres <<EOF
CREATE USER bizra_user WITH PASSWORD 'bizra_password';
CREATE DATABASE bizra_genesis OWNER bizra_user;
GRANT ALL PRIVILEGES ON DATABASE bizra_genesis TO bizra_user;
\q
EOF
```

#### Windows

1. Download PostgreSQL 15 installer from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run installer and follow wizard
3. Use pgAdmin 4 or psql to create database:

```sql
CREATE USER bizra_user WITH PASSWORD 'bizra_password';
CREATE DATABASE bizra_genesis OWNER bizra_user;
GRANT ALL PRIVILEGES ON DATABASE bizra_genesis TO bizra_user;
```

### Verify PostgreSQL Setup

```bash
# Test connection
psql -U bizra_user -d bizra_genesis -c "SELECT 1;"

# Should output:
# ?column?
# ----------
#        1
# (1 row)
```

---

## Redis Setup

### Option 1: Docker (Recommended for Development)

```bash
# Run Redis container
docker run -d \
  --name bizra-redis \
  --network bizra-network \
  -p 6379:6379 \
  -v bizra_redis:/data \
  redis:7-alpine redis-server --appendonly yes

# Verify connection
docker exec -it bizra-redis redis-cli ping
# Should output: PONG
```

### Option 2: Local Installation

#### Ubuntu/Debian

```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping  # Should output: PONG
```

#### macOS (Homebrew)

```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Verify
redis-cli ping  # Should output: PONG
```

#### Windows

1. Download Redis from [redis.io](https://redis.io/download) or use [Memurai](https://www.memurai.com/)
2. Extract and run `redis-server.exe`
3. Verify: `redis-cli.exe ping`

---

## Running Migrations

### Install SQLx CLI

```bash
# Install SQLx CLI with PostgreSQL support
cargo install sqlx-cli --no-default-features --features postgres
```

### Run Migrations

```bash
# Navigate to project root
cd /path/to/bizra-genesis-node

# Set database URL
export DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"

# Run migrations
sqlx migrate run

# Expected output:
# Applied 20250114000001/migrate create core tables (success)
```

### Migration Commands

```bash
# Check migration status
sqlx migrate info

# Revert last migration (if needed)
sqlx migrate revert

# Create new migration
sqlx migrate add create_new_table
```

### Verify Schema

```sql
-- Connect to database
psql -U bizra_user -d bizra_genesis

-- List tables
\dt

-- Should show:
-- trust_receipts
-- router_state
-- consensus_runs
-- agent_state
-- proof_of_impact

-- Describe trust_receipts table
\d trust_receipts
```

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Key Configuration Parameters

```bash
# PostgreSQL
DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"
DATABASE_MAX_CONNECTIONS=100
DATABASE_MIN_CONNECTIONS=10

# Redis
REDIS_URL="redis://localhost:6379/0"
CACHE_TTL_ROUTER_STATE=300  # 5 minutes
CACHE_TTL_AGENT_METRICS=60  # 1 minute

# Application
RUST_LOG=info,bizra_genesis_node=debug,sqlx=warn
TOKIO_WORKER_THREADS=8
```

### Production Configuration

For production deployment, consider:

1. **Connection Pooling**: Increase `DATABASE_MAX_CONNECTIONS` based on load
2. **Cache TTL**: Tune TTL values based on data freshness requirements
3. **TLS/SSL**: Enable encrypted connections
4. **Monitoring**: Configure metrics export
5. **Backup**: Set up automated backups (pg_dump, WAL archiving)

---

## Testing

### Unit Tests

```bash
# Run unit tests (mocked database)
cargo test --lib
```

### Integration Tests

```bash
# Set test database URL
export TEST_DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis_test"
export TEST_REDIS_URL="redis://localhost:6379/1"

# Create test database
createdb -U bizra_user bizra_genesis_test

# Run migrations on test database
sqlx migrate run --database-url $TEST_DATABASE_URL

# Run integration tests
cargo test --test '*' -- --test-threads=1

# Run specific database tests
cargo test --test database_integration
```

### Performance Benchmarks

```bash
# Run database performance benchmarks
cargo bench --bench db_benchmarks
```

---

## Production Deployment

### Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: bizra_user
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: bizra_genesis
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bizra_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  bizra-app:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://bizra_user:${PG_PASSWORD}@postgres:5432/bizra_genesis
      REDIS_URL: redis://redis:6379/0
    ports:
      - "8080:8080"
      - "9090:9090"  # Metrics

volumes:
  pg_data:
  redis_data:
```

Deploy:

```bash
# Set password
export PG_PASSWORD=your_secure_password

# Start services
docker-compose up -d

# Run migrations
docker-compose exec bizra-app sqlx migrate run

# Check logs
docker-compose logs -f bizra-app
```

### Kubernetes Deployment

See [`infra/k8s/database/`](../infra/k8s/database/) for Kubernetes manifests.

---

## Troubleshooting

### Common Issues

#### 1. Connection Refused

**Symptom:**
```
Error: Connection refused (os error 111)
```

**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check if Redis is running
sudo systemctl status redis-server

# Verify ports
netstat -an | grep 5432  # PostgreSQL
netstat -an | grep 6379  # Redis
```

#### 2. Authentication Failed

**Symptom:**
```
Error: password authentication failed for user "bizra_user"
```

**Solution:**
```bash
# Reset password
sudo -u postgres psql
ALTER USER bizra_user WITH PASSWORD 'new_password';
\q

# Update DATABASE_URL in .env
```

#### 3. Migration Fails

**Symptom:**
```
Error: migration 20250114000001 failed
```

**Solution:**
```bash
# Check migration status
sqlx migrate info

# Revert and retry
sqlx migrate revert
sqlx migrate run

# If stuck, reset test database
dropdb bizra_genesis_test
createdb bizra_genesis_test
sqlx migrate run --database-url $TEST_DATABASE_URL
```

#### 4. Connection Pool Exhausted

**Symptom:**
```
Error: timed out waiting for connection
```

**Solution:**
```bash
# Increase max connections in .env
DATABASE_MAX_CONNECTIONS=200

# Check active connections
psql -U bizra_user -d bizra_genesis -c "SELECT count(*) FROM pg_stat_activity;"
```

#### 5. Redis Out of Memory

**Symptom:**
```
Error: OOM command not allowed when used memory > 'maxmemory'
```

**Solution:**
```bash
# Configure Redis maxmemory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 2gb

# Make persistent
echo "maxmemory 2gb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
```

### Getting Help

- **GitHub Issues**: [bizra-genesis-node/issues](https://github.com/bizra/bizra-genesis-node/issues)
- **Documentation**: [docs/database/](../database/)
- **Logs**: `tail -f logs/bizra-genesis-node.log`

---

## Performance Tuning

### PostgreSQL Optimization

Edit `postgresql.conf`:

```ini
# Connection settings
max_connections = 200
shared_buffers = 2GB
effective_cache_size = 6GB

# Query performance
random_page_cost = 1.1  # For SSD
work_mem = 16MB

# Write performance
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### Redis Optimization

Edit `redis.conf`:

```ini
# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

---

## Security Best Practices

1. **Use Strong Passwords**: 20+ characters with mixed case, numbers, symbols
2. **Enable TLS/SSL**: Encrypt all database connections
3. **Restrict Network Access**: Use firewall rules to limit database access
4. **Regular Backups**: Automated daily backups with off-site replication
5. **Audit Logging**: Enable PostgreSQL audit logging
6. **Rotate Credentials**: Change passwords quarterly
7. **Principle of Least Privilege**: Grant minimal permissions needed

---

## Backup and Recovery

### PostgreSQL Backup

```bash
# Full backup
pg_dump -U bizra_user bizra_genesis > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -U bizra_user bizra_genesis | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
psql -U bizra_user bizra_genesis < backup_20250114.sql
```

### Redis Backup

```bash
# Trigger save
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backup/redis_$(date +%Y%m%d).rdb

# Restore
cp /backup/redis_20250114.rdb /var/lib/redis/dump.rdb
systemctl restart redis-server
```

---

**For additional information, see:**
- [Schema Documentation](./SCHEMA_DOCUMENTATION.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Performance Guide](./PERFORMANCE_GUIDE.md)

---

*BIZRA Genesis Node - Professional Elite Implementation*
*Copyright © 2025 BIZRA Development Team*
