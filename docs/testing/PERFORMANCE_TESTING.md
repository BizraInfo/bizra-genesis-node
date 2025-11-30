# Performance Regression Testing Guide

**Comprehensive guide for database performance benchmarking and regression detection**

This guide explains how to run, interpret, and act on performance regression tests for the BIZRA Genesis Node database persistence layer.

---

## Table of Contents

1. [Overview](#overview)
2. [Performance Targets](#performance-targets)
3. [Running Benchmarks](#running-benchmarks)
4. [Interpreting Results](#interpreting-results)
5. [Detecting Regressions](#detecting-regressions)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting Performance Issues](#troubleshooting-performance-issues)

---

## Overview

The database performance benchmark suite (`benches/database_performance.rs`) provides comprehensive testing of the persistence layer to ensure we meet our professional elite performance targets.

**What we benchmark:**
- Trust receipt INSERT operations
- Router state UPDATE/SELECT operations
- Proof-of-Impact INSERT operations
- Redis cache performance
- Connection pool efficiency under load
- End-to-end synthesis workflows

**Why it matters:**
- **Prevent regressions** - Catch performance degradation before production
- **Validate targets** - Ensure we meet <5ms database operations
- **Optimize hot paths** - Identify bottlenecks in critical code paths
- **Capacity planning** - Understand throughput under concurrent load

---

## Performance Targets

### Database Operations

| Operation | Target (P50) | Target (P95) | Alert Threshold |
|-----------|--------------|--------------|-----------------|
| Receipt INSERT | 2-3ms | <5ms | >10ms |
| Router UPDATE | 2ms | <3ms | >5ms |
| Router SELECT | 1-2ms | <5ms | >10ms (cache should handle) |
| PoI INSERT | 2-3ms | <5ms | >10ms |
| Cache GET | <500μs | <1ms | >5ms |

### Throughput Targets

| Workload | Target Throughput | Concurrent Users |
|----------|-------------------|------------------|
| Receipt inserts | >200/sec | 10 |
| Router updates | >300/sec | 10 |
| Cache reads | >10,000/sec | 100 |

### Connection Pool

- **Max connections:** 100
- **Min connections:** 10
- **Target active:** 10-30 (at 100 concurrent users)
- **Acquire timeout:** <30s

---

## Running Benchmarks

### Prerequisites

1. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose -f docker-compose.database.yml up -d

   # Verify connectivity
   psql -U bizra_user -d bizra_genesis -c "SELECT version();"
   redis-cli ping
   ```

2. **Environment Configuration**
   ```bash
   export DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"
   export REDIS_URL="redis://localhost:6379/0"
   ```

### Running All Benchmarks

```bash
# Run complete benchmark suite
cargo bench --bench database_performance

# Run with verbose output
cargo bench --bench database_performance -- --verbose

# Save baseline for comparison
cargo bench --bench database_performance -- --save-baseline main
```

### Running Specific Benchmark Groups

```bash
# Receipt operations only
cargo bench --bench database_performance receipt

# Router operations only
cargo bench --bench database_performance router

# Cache operations only
cargo bench --bench database_performance cache

# Complete workflows only
cargo bench --bench database_performance workflow

# Concurrent operations only
cargo bench --bench database_performance concurrent
```

### Running Individual Benchmarks

```bash
# Single receipt insert
cargo bench --bench database_performance single_receipt

# Router state updates
cargo bench --bench database_performance update_state

# Cache hits
cargo bench --bench database_performance cache_hit
```

---

## Interpreting Results

### Understanding Criterion Output

```
receipt_insert/single_receipt
                        time:   [2.3421 ms 2.4156 ms 2.4952 ms]
                        change: [-1.2450% -0.4527% +0.3891%] (p = 0.29 > 0.05)
                        No change in performance detected.
Found 3 outliers among 100 measurements (3.00%)
  1 (1.00%) low mild
  2 (2.00%) high mild
```

**Key metrics:**
- **Time:** [lower_bound median upper_bound] - median is the most important
- **Change:** Percentage change from previous baseline
- **p-value:** Statistical significance (p < 0.05 = significant change)
- **Outliers:** Measurements far from median (normal to have a few)

### Performance Interpretation

✅ **EXCELLENT** - Meeting or exceeding targets
```
receipt_insert/single_receipt time: [2.1 ms 2.3 ms 2.5 ms]
```
*Median 2.3ms < 3ms target ✓*

⚠️ **WARNING** - Approaching limits
```
receipt_insert/single_receipt time: [4.5 ms 4.8 ms 5.1 ms]
```
*Median 4.8ms approaching 5ms limit*

❌ **REGRESSION** - Exceeding targets
```
receipt_insert/single_receipt time: [8.2 ms 8.9 ms 9.5 ms]
```
*Median 8.9ms > 5ms target - REGRESSION!*

### Throughput Interpretation

```
receipt_batch_insert/100  time: [245.32 ms 251.89 ms 259.17 ms]
                          thrpt: [385.91/sec 397.00/sec 407.66/sec]
```

**Calculation:** 100 operations / 0.25189s = ~397 ops/sec

**Target:** >200 ops/sec ✓

---

## Detecting Regressions

### Comparing Against Baseline

```bash
# 1. Save current performance as baseline
cargo bench --bench database_performance -- --save-baseline main

# 2. Make code changes
# ...

# 3. Compare against baseline
cargo bench --bench database_performance -- --baseline main
```

**Example output showing regression:**
```
receipt_insert/single_receipt
                        time:   [3.8421 ms 3.9156 ms 4.0952 ms]
                        change: [+63.245% +67.452% +71.389%] (p = 0.00 < 0.05)
                        Performance has regressed.
```

### Statistical Significance

- **p < 0.05:** Statistically significant change (likely real regression)
- **p > 0.05:** Not statistically significant (could be noise)

**Important:** Small changes (<5%) may not be statistically significant even if real.

### Regression Thresholds

| Change | Action |
|--------|--------|
| <5% slower | ✅ Acceptable (noise) |
| 5-20% slower | ⚠️ Investigate |
| >20% slower | ❌ Regression - fix before merge |
| >50% slower | 🚨 Critical regression - revert immediately |

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Performance Regression Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: bizra_user
          POSTGRES_PASSWORD: bizra_password
          POSTGRES_DB: bizra_genesis
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          profile: minimal

      - name: Cache Criterion Baselines
        uses: actions/cache@v3
        with:
          path: target/criterion
          key: criterion-${{ github.base_ref }}-${{ hashFiles('**/Cargo.lock') }}
          restore-keys: |
            criterion-${{ github.base_ref }}-
            criterion-main-

      - name: Run Database Migrations
        env:
          DATABASE_URL: postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis
        run: |
          cargo install sqlx-cli --no-default-features --features postgres
          sqlx migrate run

      - name: Run Benchmarks
        env:
          DATABASE_URL: postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis
          REDIS_URL: redis://localhost:6379/0
        run: cargo bench --bench database_performance -- --save-baseline pr-${{ github.event.pull_request.number }}

      - name: Compare Against Main
        if: github.event_name == 'pull_request'
        env:
          DATABASE_URL: postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis
          REDIS_URL: redis://localhost:6379/0
        run: |
          cargo bench --bench database_performance -- --baseline main || true

      - name: Upload Benchmark Results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: target/criterion

      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = fs.readFileSync('target/criterion/report/index.html', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Performance Benchmark Results\n\nView full report in artifacts.`
            });
```

### Automated Regression Detection

```bash
#!/bin/bash
# scripts/check-performance-regression.sh

set -euo pipefail

# Run benchmarks and save output
cargo bench --bench database_performance --message-format json > bench_output.json

# Parse results and check for regressions
python3 <<EOF
import json
import sys

THRESHOLDS = {
    'receipt_insert': 0.005,  # 5ms
    'router_state_update': 0.003,  # 3ms
    'cache_operations': 0.001,  # 1ms
}

regressions = []

with open('bench_output.json') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('reason') == 'benchmark-complete':
                name = data['id']
                median = data['typical']['estimate']

                for key, threshold in THRESHOLDS.items():
                    if key in name and median > threshold:
                        regressions.append(f"{name}: {median*1000:.2f}ms > {threshold*1000}ms")
        except:
            pass

if regressions:
    print("❌ PERFORMANCE REGRESSIONS DETECTED:")
    for r in regressions:
        print(f"  - {r}")
    sys.exit(1)
else:
    print("✅ All benchmarks within performance targets")
    sys.exit(0)
EOF
```

---

## Troubleshooting Performance Issues

### Common Issues and Solutions

#### 1. Slow Database Queries (>10ms)

**Symptoms:**
```
receipt_insert/single_receipt time: [12.5 ms 13.2 ms 14.1 ms]
```

**Diagnosis:**
```sql
-- Check slow query log
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 10
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';
```

**Solutions:**
- Add missing indexes (GIN for JSONB, BTREE for foreign keys)
- Increase `shared_buffers` and `work_mem`
- Optimize queries (use EXPLAIN ANALYZE)
- Increase connection pool size if pool exhaustion

#### 2. Low Cache Hit Rate (<50%)

**Symptoms:**
```
cache_operations/cache_hit time: [5.2 ms 5.8 ms 6.3 ms]
```

**Diagnosis:**
```bash
# Check Redis stats
redis-cli INFO stats | grep keyspace

# Check cache hit/miss ratio
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

**Solutions:**
- Increase cache TTL for hot data
- Pre-warm cache on startup
- Increase Redis maxmemory
- Check cache invalidation logic (too aggressive?)

#### 3. Connection Pool Exhaustion

**Symptoms:**
```
Error: acquire timeout after 30s
```

**Diagnosis:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity
WHERE state = 'active';

-- Check long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

**Solutions:**
- Increase max_connections (PostgreSQL + pool)
- Reduce acquire_timeout for faster failure
- Fix slow queries causing connection hogging
- Add connection retry logic

#### 4. High P95/P99 Latency (Long Tail)

**Symptoms:**
```
time: [2.1 ms 2.3 ms 15.8 ms]  # P50 good, P99 terrible
```

**Causes:**
- Garbage collection pauses
- Connection pool cold starts
- Disk I/O spikes (check SSD vs HDD)
- Network latency spikes

**Solutions:**
- Use SSD storage for database
- Increase connection pool min_connections (avoid cold starts)
- Monitor system metrics (CPU, disk, network)
- Add circuit breakers for failing dependencies

---

## Performance Optimization Checklist

### Database Layer

- [ ] Indexes on all foreign keys
- [ ] JSONB GIN indexes for frequently queried JSON fields
- [ ] Computed columns for common calculations (e.g., win_rate)
- [ ] Connection pooling configured (min=10, max=100)
- [ ] PostgreSQL tuned for SSD (`random_page_cost = 1.1`)

### Cache Layer

- [ ] Cache-first pattern for hot data (router state)
- [ ] Automatic cache invalidation on writes
- [ ] Appropriate TTLs (300s for router, 60s for metrics)
- [ ] Redis persistence (AOF + RDB) configured
- [ ] maxmemory and eviction policy set

### Application Layer

- [ ] Async/await used throughout (no blocking)
- [ ] Batch operations where possible
- [ ] Metrics instrumentation for observability
- [ ] Circuit breakers for external dependencies
- [ ] Proper error handling (don't retry expensive operations)

---

## Continuous Monitoring

### Grafana Dashboards

Create dashboards to monitor real-world performance:

**Database Performance Dashboard:**
- Query latency (P50, P95, P99)
- Connection pool utilization
- Slow query count
- Error rate

**Cache Performance Dashboard:**
- Hit rate percentage
- Operations per second
- Latency distribution
- Memory usage

### Alerting Rules

```yaml
# Alert on performance degradation
- alert: DatabaseQuerySlow
  expr: histogram_quantile(0.95, rate(bizra_db_query_duration_seconds_bucket[5m])) > 0.01
  for: 5m
  annotations:
    summary: "Database queries slower than 10ms (P95)"

- alert: CacheHitRateLow
  expr: bizra_cache_hit_rate < 0.5
  for: 10m
  annotations:
    summary: "Cache hit rate below 50%"
```

---

## Next Steps

1. **Baseline Establishment** - Run benchmarks on main branch, save as baseline
2. **Pre-Merge Validation** - Run on all PRs, compare against baseline
3. **Weekly Regression Testing** - Schedule weekly runs to catch gradual degradation
4. **Production Monitoring** - Deploy Prometheus + Grafana for real-time metrics

---

*BIZRA Genesis Node - Professional Elite Implementation*
*Copyright © 2025 BIZRA Development Team*
