# BIZRA Genesis Node - Prometheus Metrics Guide

**Complete reference for observability and monitoring metrics**

This guide documents all Prometheus metrics exposed by the BIZRA Genesis Node, including database persistence metrics, consensus algorithm performance, and cryptographic trust operations.

---

## Table of Contents

1. [Overview](#overview)
2. [Metrics Endpoint](#metrics-endpoint)
3. [Database & Persistence Metrics](#database--persistence-metrics)
4. [Consensus Algorithm Metrics](#consensus-algorithm-metrics)
5. [Thompson Sampling Router Metrics](#thompson-sampling-router-metrics)
6. [Proof-of-Impact Metrics](#proof-of-impact-metrics)
7. [Cryptographic Trust Metrics](#cryptographic-trust-metrics)
8. [Ihsan Quality Gate Metrics](#ihsan-quality-gate-metrics)
9. [Grafana Dashboards](#grafana-dashboards)
10. [Alert Rules](#alert-rules)

---

## Overview

The BIZRA Genesis Node exposes **28 Prometheus metrics** across 6 categories:

| Category | Metrics Count | Purpose |
|----------|---------------|---------|
| Database & Persistence | 9 | Connection pool, query performance, cache efficiency |
| Consensus Algorithm | 3 | Weighted Selective Consensus latency and operations |
| Thompson Sampling Router | 3 | Routing decisions and model win rates |
| Proof-of-Impact | 5 | PoI validation success rates and scores |
| Cryptographic Trust | 3 | Receipt generation and verification |
| Ihsan Quality Gate | 3 | Quality threshold enforcement |

**Performance Targets:**
- Consensus latency: P99 < 50μs
- Routing latency: P99 < 2.3μs
- Database queries: P95 < 5ms
- Cache operations: P95 < 1ms
- PoI validation: >99% success rate

---

## Metrics Endpoint

### HTTP Endpoint

```
GET /metrics
```

**Response Format:** Prometheus text exposition format

**Example:**
```bash
curl http://localhost:9090/metrics
```

**Output:**
```
# HELP bizra_consensus_latency_microseconds Weighted Selective Consensus algorithm latency in microseconds
# TYPE bizra_consensus_latency_microseconds histogram
bizra_consensus_latency_microseconds_bucket{le="10"} 1245
bizra_consensus_latency_microseconds_bucket{le="20"} 2890
bizra_consensus_latency_microseconds_bucket{le="30"} 4123
...
```

### Kubernetes Service Configuration

The application deployment includes a metrics port:

```yaml
ports:
  - name: http
    containerPort: 8080    # Application API
  - name: metrics
    containerPort: 9090    # Prometheus metrics
```

---

## Database & Persistence Metrics

### Connection Pool Metrics

**bizra_db_pool_active_connections**
- **Type:** Gauge
- **Description:** Number of active PostgreSQL connections in the pool
- **Target:** 10-30 (out of 100 max)
- **Alert:** > 90 (approaching pool exhaustion)

```promql
bizra_db_pool_active_connections
```

**bizra_db_pool_idle_connections**
- **Type:** Gauge
- **Description:** Number of idle PostgreSQL connections in the pool
- **Target:** 70-90 (healthy reserve)
- **Alert:** < 10 (insufficient idle connections)

```promql
bizra_db_pool_idle_connections
```

**Example Queries:**
```promql
# Connection pool utilization percentage
(bizra_db_pool_active_connections / 100) * 100

# Connection pool efficiency (should be low for good performance)
bizra_db_pool_active_connections / (bizra_db_pool_active_connections + bizra_db_pool_idle_connections)
```

### Query Performance Metrics

**bizra_db_query_duration_seconds**
- **Type:** Histogram
- **Description:** Database query duration in seconds by operation and table
- **Labels:** `operation` (insert, select, update, delete), `table` (trust_receipts, router_state, etc.)
- **Buckets:** 1ms, 2ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s
- **Target:** P95 < 5ms, P99 < 10ms

```promql
# P95 query latency by table
histogram_quantile(0.95, rate(bizra_db_query_duration_seconds_bucket[5m])) by (table)

# P99 latency for INSERT operations
histogram_quantile(0.99, rate(bizra_db_query_duration_seconds_bucket{operation="insert"}[5m]))

# Slow queries (>100ms)
sum(rate(bizra_db_query_duration_seconds_bucket{le="0.1"}[5m])) by (table)
```

**bizra_db_operations_total**
- **Type:** Counter (IntCounterVec)
- **Description:** Total number of database operations by type and table
- **Labels:** `operation`, `table`

```promql
# Operations per second by table
rate(bizra_db_operations_total[5m]) by (table)

# Read/write ratio
sum(rate(bizra_db_operations_total{operation="select"}[5m])) /
sum(rate(bizra_db_operations_total{operation=~"insert|update|delete"}[5m]))

# Top 5 most queried tables
topk(5, sum(rate(bizra_db_operations_total[5m])) by (table))
```

### Error Tracking

**bizra_db_errors_total**
- **Type:** Counter (IntCounterVec)
- **Description:** Total number of database errors by error type and table
- **Labels:** `error_type` (connection_timeout, query_failed, not_found, etc.), `table`
- **Target:** < 0.1% of operations

```promql
# Error rate percentage
(sum(rate(bizra_db_errors_total[5m])) / sum(rate(bizra_db_operations_total[5m]))) * 100

# Errors by type
sum(rate(bizra_db_errors_total[5m])) by (error_type)

# Alert on high error rate
rate(bizra_db_errors_total[5m]) > 0.01  # > 1% error rate
```

### Cache Performance Metrics

**bizra_cache_hit_rate**
- **Type:** Gauge
- **Description:** Redis cache hit rate (0.0-1.0)
- **Target:** > 0.80 (80% hit rate)
- **Alert:** < 0.50 (cache not effective)

```promql
bizra_cache_hit_rate
```

**bizra_cache_operations_total**
- **Type:** Counter (IntCounterVec)
- **Description:** Total number of cache operations by type
- **Labels:** `operation` (hit, miss, set, delete)

```promql
# Cache hit rate calculation
sum(rate(bizra_cache_operations_total{operation="hit"}[5m])) /
(sum(rate(bizra_cache_operations_total{operation="hit"}[5m])) +
 sum(rate(bizra_cache_operations_total{operation="miss"}[5m])))

# Cache operations per second
sum(rate(bizra_cache_operations_total[5m])) by (operation)
```

**bizra_cache_operation_duration_seconds**
- **Type:** Histogram
- **Description:** Redis cache operation duration in seconds
- **Labels:** `operation`
- **Buckets:** 0.1ms, 0.2ms, 0.5ms, 1ms, 2ms, 5ms, 10ms, 25ms
- **Target:** P95 < 1ms, P99 < 2ms

```promql
# P95 cache latency by operation
histogram_quantile(0.95, rate(bizra_cache_operation_duration_seconds_bucket[5m])) by (operation)

# Slow cache operations (>5ms)
sum(rate(bizra_cache_operation_duration_seconds_bucket{le="0.005"}[5m]))
```

### Migration Metrics

**bizra_db_migration_duration_seconds**
- **Type:** Histogram
- **Description:** Database migration execution time in seconds
- **Buckets:** 100ms, 500ms, 1s, 2s, 5s, 10s, 30s, 60s, 120s
- **Target:** < 10s per migration

```promql
# Average migration time
rate(bizra_db_migration_duration_seconds_sum[5m]) / rate(bizra_db_migration_duration_seconds_count[5m])
```

**bizra_db_migrations_applied_total**
- **Type:** Counter
- **Description:** Total number of database migrations applied
- **Target:** Increments only on app startup or schema changes

```promql
bizra_db_migrations_applied_total
```

---

## Consensus Algorithm Metrics

**bizra_consensus_latency_microseconds**
- **Type:** Histogram
- **Description:** Weighted Selective Consensus algorithm latency in microseconds
- **Buckets:** 10μs, 20μs, 30μs, 40μs, 50μs, 75μs, 100μs, 150μs, 200μs, 500μs
- **Target:** P99 < 50μs (goal: 46μs)

```promql
# P99 consensus latency
histogram_quantile(0.99, rate(bizra_consensus_latency_microseconds_bucket[5m]))

# Average consensus latency
rate(bizra_consensus_latency_microseconds_sum[5m]) / rate(bizra_consensus_latency_microseconds_count[5m])
```

**bizra_consensus_operations_total**
- **Type:** Counter
- **Description:** Total number of consensus operations performed

```promql
# Consensus operations per second
rate(bizra_consensus_operations_total[5m])
```

**bizra_consensus_pareto_candidates**
- **Type:** Histogram
- **Description:** Number of Pareto-optimal candidates found per consensus operation
- **Buckets:** 1, 2, 3, 4, 5, 10, 20
- **Target:** 2-5 candidates typical

```promql
# Average Pareto candidates
rate(bizra_consensus_pareto_candidates_sum[5m]) / rate(bizra_consensus_pareto_candidates_count[5m])
```

---

## Thompson Sampling Router Metrics

**bizra_routing_latency_microseconds**
- **Type:** Histogram
- **Description:** Thompson Sampling routing decision latency in microseconds
- **Buckets:** 0.5μs, 1μs, 1.5μs, 2μs, 2.5μs, 3μs, 5μs, 10μs, 20μs, 50μs
- **Target:** P99 < 2.3μs

```promql
# P99 routing latency
histogram_quantile(0.99, rate(bizra_routing_latency_microseconds_bucket[5m]))
```

**bizra_routing_operations_total**
- **Type:** Counter
- **Description:** Total number of routing decisions made

```promql
# Routing decisions per second
rate(bizra_routing_operations_total[5m])
```

**bizra_route_win_rate**
- **Type:** Histogram
- **Description:** Win rate per route (0.0-1.0)
- **Labels:** `route_name` (model name)
- **Buckets:** 0.0, 0.1, 0.2, ..., 1.0

```promql
# Win rate by model
avg(bizra_route_win_rate) by (route_name)

# Top 5 performing models
topk(5, avg(bizra_route_win_rate) by (route_name))
```

---

## Proof-of-Impact Metrics

**bizra_poi_validation_success_rate**
- **Type:** Gauge
- **Description:** Proof-of-Impact validation success rate (0.0-1.0)
- **Target:** > 0.99 (99% success)

**bizra_poi_validation_attempts_total**
- **Type:** Counter
- **Description:** Total number of PoI validation attempts

**bizra_poi_validation_success_total**
- **Type:** Counter
- **Description:** Total number of successful PoI validations

**bizra_poi_validation_failure_total**
- **Type:** Counter
- **Description:** Total number of failed PoI validations

**bizra_poi_score_distribution**
- **Type:** Histogram
- **Description:** Distribution of normalized PoI scores (0.0-1.0)
- **Buckets:** 0.1, 0.2, ..., 1.0

```promql
# PoI success rate
sum(rate(bizra_poi_validation_success_total[5m])) / sum(rate(bizra_poi_validation_attempts_total[5m]))

# PoI failure rate
sum(rate(bizra_poi_validation_failure_total[5m])) / sum(rate(bizra_poi_validation_attempts_total[5m]))

# Average PoI score
rate(bizra_poi_score_distribution_sum[5m]) / rate(bizra_poi_score_distribution_count[5m])
```

---

## Cryptographic Trust Metrics

**bizra_receipt_generation_latency_microseconds**
- **Type:** Histogram
- **Description:** Cryptographic receipt generation latency in microseconds (Ed25519 signing)
- **Buckets:** 10μs, 50μs, 100μs, 200μs, 500μs, 1ms, 2ms
- **Target:** P99 < 500μs

**bizra_receipts_generated_total**
- **Type:** Counter
- **Description:** Total number of cryptographic receipts generated

**bizra_receipt_verification_success_rate**
- **Type:** Gauge
- **Description:** Receipt verification success rate (0.0-1.0)
- **Target:** 1.0 (100% - all signatures should verify)

---

## Ihsan Quality Gate Metrics

**bizra_ihsan_score_distribution**
- **Type:** Histogram
- **Description:** Distribution of Ihsan quality scores (0.0-1.0)
- **Buckets:** 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.97, 0.99, 1.0

**bizra_ihsan_rejections_total**
- **Type:** Counter
- **Description:** Total number of candidates rejected by Ihsan quality gate

**bizra_ihsan_passes_total**
- **Type:** Counter
- **Description:** Total number of candidates passing Ihsan quality gate

```promql
# Ihsan pass rate
sum(rate(bizra_ihsan_passes_total[5m])) /
(sum(rate(bizra_ihsan_passes_total[5m])) + sum(rate(bizra_ihsan_rejections_total[5m])))

# Average Ihsan score
rate(bizra_ihsan_score_distribution_sum[5m]) / rate(bizra_ihsan_score_distribution_count[5m])
```

---

## Grafana Dashboards

### Database Performance Dashboard

```json
{
  "dashboard": {
    "title": "BIZRA Genesis - Database Performance",
    "panels": [
      {
        "title": "Connection Pool Utilization",
        "targets": [
          {
            "expr": "bizra_db_pool_active_connections",
            "legendFormat": "Active"
          },
          {
            "expr": "bizra_db_pool_idle_connections",
            "legendFormat": "Idle"
          }
        ]
      },
      {
        "title": "Query Latency (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(bizra_db_query_duration_seconds_bucket[5m])) by (table)",
            "legendFormat": "{{table}}"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "bizra_cache_hit_rate * 100",
            "legendFormat": "Hit Rate %"
          }
        ]
      }
    ]
  }
}
```

### Application Performance Dashboard

```json
{
  "dashboard": {
    "title": "BIZRA Genesis - Application Performance",
    "panels": [
      {
        "title": "Consensus Latency (P99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(bizra_consensus_latency_microseconds_bucket[5m]))",
            "legendFormat": "P99 Consensus Latency (μs)"
          }
        ]
      },
      {
        "title": "Routing Latency (P99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(bizra_routing_latency_microseconds_bucket[5m]))",
            "legendFormat": "P99 Routing Latency (μs)"
          }
        ]
      },
      {
        "title": "Model Win Rates",
        "targets": [
          {
            "expr": "avg(bizra_route_win_rate) by (route_name)",
            "legendFormat": "{{route_name}}"
          }
        ]
      }
    ]
  }
}
```

---

## Alert Rules

### Critical Alerts

```yaml
groups:
  - name: bizra-critical
    interval: 30s
    rules:
      # Database pool exhaustion
      - alert: DatabasePoolExhausted
        expr: bizra_db_pool_active_connections > 90
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "Active connections: {{ $value }}/100"

      # High database error rate
      - alert: HighDatabaseErrorRate
        expr: (sum(rate(bizra_db_errors_total[5m])) / sum(rate(bizra_db_operations_total[5m]))) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High database error rate detected"
          description: "Error rate: {{ $value | humanizePercentage }}"

      # Cache completely ineffective
      - alert: CacheIneffective
        expr: bizra_cache_hit_rate < 0.3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Cache hit rate below 30%"
          description: "Current hit rate: {{ $value | humanizePercentage }}"

      # Slow database queries
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, rate(bizra_db_query_duration_seconds_bucket[5m])) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database queries slower than 10ms (P95)"
          description: "P95 latency: {{ $value }}s"
```

### Performance Degradation Alerts

```yaml
      # Consensus latency degradation
      - alert: ConsensusLatencyDegradation
        expr: histogram_quantile(0.99, rate(bizra_consensus_latency_microseconds_bucket[5m])) > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Consensus P99 latency above 50μs target"
          description: "Current P99: {{ $value }}μs"

      # Routing latency degradation
      - alert: RoutingLatencyDegradation
        expr: histogram_quantile(0.99, rate(bizra_routing_latency_microseconds_bucket[5m])) > 2.3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Routing P99 latency above 2.3μs target"
          description: "Current P99: {{ $value }}μs"

      # Low PoI success rate
      - alert: LowPoISuccessRate
        expr: bizra_poi_validation_success_rate < 0.99
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PoI validation success rate below 99%"
          description: "Current rate: {{ $value | humanizePercentage }}"
```

---

## Integration with Code

### Metrics Helper Functions

The metrics module provides convenient helper functions:

```rust
use bizra_genesis_node::metrics;

// Update connection pool metrics
metrics::update_db_pool_metrics(active_count, idle_count);

// Record database query with timing
let start = std::time::Instant::now();
// ... execute query ...
metrics::record_db_query("insert", "trust_receipts", start.elapsed().as_secs_f64());

// Record cache operation
let start = std::time::Instant::now();
// ... cache operation ...
metrics::record_cache_operation("hit", start.elapsed().as_secs_f64());

// Update cache hit rate (call periodically)
metrics::update_cache_hit_rate();
```

### Initialization

```rust
use bizra_genesis_node::metrics;

#[tokio::main]
async fn main() {
    // Initialize all metrics at startup
    metrics::initialize_metrics();

    // Start metrics server
    let metrics_server = warp::path("metrics")
        .map(|| metrics::gather_metrics());

    warp::serve(metrics_server).run(([0, 0, 0, 0], 9090)).await;
}
```

---

## Performance Targets Summary

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Consensus P99 latency | < 50μs | > 50μs |
| Routing P99 latency | < 2.3μs | > 2.3μs |
| Database query P95 | < 5ms | > 10ms |
| Cache operation P95 | < 1ms | > 5ms |
| Cache hit rate | > 80% | < 50% |
| Database error rate | < 0.1% | > 1% |
| PoI success rate | > 99% | < 99% |
| Connection pool usage | 10-30 active | > 90 active |

---

*BIZRA Genesis Node - Professional Elite Implementation*
*Copyright © 2025 BIZRA Development Team*
