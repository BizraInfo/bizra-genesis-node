# BIZRA Node0 - Service Level Objectives (SLOs)
# Document ID: BIZRA-NODE0-v1.0.1-SLO
# Elite Reliability Engineering Standards

## Overview

This document defines the Service Level Objectives for BIZRA Node0. These SLOs represent our commitment to reliability and form the basis for our operational decisions.

---

## Core SLOs

### 1. API Availability

| Metric | Target | Window | Measurement |
|--------|--------|--------|-------------|
| Availability | 99.9% | 30 days | `(successful_requests / total_requests) * 100` |

**Definition**: A request is successful if it returns HTTP 2xx/3xx within the latency threshold.

**Error Budget**: 43.2 minutes/month of downtime

**Prometheus Query**:
```promql
# Availability SLI
sum(rate(http_requests_total{status=~"2..|3.."}[30d])) /
sum(rate(http_requests_total[30d])) * 100
```

**Alerting**:
```yaml
- alert: SLOAvailabilityBreach
  expr: |
    (
      sum(rate(http_requests_total{status=~"2..|3.."}[1h])) /
      sum(rate(http_requests_total[1h]))
    ) < 0.999
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "API availability below 99.9% SLO"
```

---

### 2. API Latency

| Percentile | Target | Measurement |
|------------|--------|-------------|
| P50 | < 100ms | 50th percentile response time |
| P95 | < 500ms | 95th percentile response time |
| P99 | < 1000ms | 99th percentile response time |

**Prometheus Query**:
```promql
# P95 Latency SLI
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)
```

**Alerting**:
```yaml
- alert: SLOLatencyP95Breach
  expr: |
    histogram_quantile(0.95, 
      sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
    ) > 0.5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "P95 latency exceeds 500ms SLO"
```

---

### 3. Dashboard Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse FCP |
| Largest Contentful Paint | < 2.5s | Lighthouse LCP |
| Time to Interactive | < 3.5s | Lighthouse TTI |
| Cumulative Layout Shift | < 0.1 | Lighthouse CLS |

**Synthetic Monitoring**:
```javascript
// Lighthouse CI configuration
module.exports = {
  ci: {
    assert: {
      assertions: {
        'first-contentful-paint': ['warn', {maxNumericValue: 1500}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'interactive': ['warn', {maxNumericValue: 3500}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
      },
    },
  },
};
```

---

### 4. PAT Agent Response Time

| Metric | Target | Measurement |
|--------|--------|-------------|
| Simple query | < 500ms | Time to first token |
| Complex query | < 2s | Time to first token |
| Full response | < 10s | Time to complete response |

**Definition**: 
- Simple query: < 50 tokens input
- Complex query: > 50 tokens input or multi-agent coordination

**Prometheus Query**:
```promql
# PAT Agent Latency P95
histogram_quantile(0.95,
  sum(rate(pat_agent_response_duration_seconds_bucket[5m])) by (le, agent_type)
)
```

---

### 5. Database Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Query latency P95 | < 50ms | PostgreSQL query time |
| Connection pool utilization | < 80% | Active / max connections |
| Replication lag | < 100ms | Primary to replica delay |

**Prometheus Query**:
```promql
# Query latency
pg_stat_statements_mean_time_seconds{quantile="0.95"}

# Connection utilization
pg_stat_activity_count / pg_settings_max_connections * 100
```

---

### 6. AI Model Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Model load time | < 30s | Time from request to ready |
| Inference latency | < 100ms/token | Tokens per second |
| GPU utilization | 60-90% | NVIDIA SMI |
| GPU memory utilization | < 95% | VRAM usage |

**Prometheus Query**:
```promql
# Tokens per second
rate(ollama_tokens_generated_total[1m])

# GPU utilization
nvidia_gpu_utilization_ratio
```

---

## Error Budgets

### Monthly Error Budget Calculation

| SLO | Target | Error Budget |
|-----|--------|--------------|
| Availability 99.9% | 43.2 min/month | ~1.44 min/day |
| Latency P95 < 500ms | 5% requests slow | 5% of requests |
| Dashboard LCP < 2.5s | 5% slow loads | 5% of page loads |

### Error Budget Policy

**When budget is healthy (> 50% remaining)**:
- Normal deployment velocity
- Feature development prioritized
- Experimentation allowed

**When budget is concerning (25-50% remaining)**:
- Deployment review required
- Focus on reliability improvements
- New features require SRE approval

**When budget is critical (< 25% remaining)**:
- Feature freeze
- All hands on reliability
- Only critical fixes deployed
- Post-incident reviews mandatory

---

## Monitoring Dashboard

### Key Metrics Dashboard (Grafana)

```json
{
  "title": "BIZRA SLO Dashboard",
  "panels": [
    {
      "title": "Availability (30d)",
      "type": "gauge",
      "targets": [{
        "expr": "sum(rate(http_requests_total{status=~\"2..|3..\"}[30d])) / sum(rate(http_requests_total[30d])) * 100"
      }],
      "thresholds": [
        {"value": 99.9, "color": "green"},
        {"value": 99.5, "color": "yellow"},
        {"value": 99.0, "color": "red"}
      ]
    },
    {
      "title": "Error Budget Remaining",
      "type": "stat",
      "targets": [{
        "expr": "1 - ((1 - (sum(rate(http_requests_total{status=~\"2..|3..\"}[30d])) / sum(rate(http_requests_total[30d])))) / 0.001)"
      }]
    },
    {
      "title": "P95 Latency (5m)",
      "type": "timeseries",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
      }]
    }
  ]
}
```

---

## SLO Review Process

### Weekly Review
- Check error budget consumption
- Review any SLO breaches
- Identify trends

### Monthly Review
- Full SLO report to stakeholders
- Error budget reset
- SLO target evaluation

### Quarterly Review
- SLO target adjustments based on data
- New SLOs for new features
- Deprecate irrelevant SLOs

---

## Appendix: Prometheus Recording Rules

```yaml
# slo-recording-rules.yml
groups:
  - name: slo-metrics
    interval: 30s
    rules:
      # Availability SLI (30-day rolling)
      - record: slo:api_availability:ratio_30d
        expr: |
          sum(rate(http_requests_total{status=~"2..|3.."}[30d])) /
          sum(rate(http_requests_total[30d]))
      
      # Error budget remaining
      - record: slo:error_budget:remaining_ratio
        expr: |
          1 - ((1 - slo:api_availability:ratio_30d) / (1 - 0.999))
      
      # Latency SLIs
      - record: slo:api_latency:p50_seconds
        expr: histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
      
      - record: slo:api_latency:p95_seconds
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
      
      - record: slo:api_latency:p99_seconds
        expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

---

## References

- [Google SRE Book - SLOs](https://sre.google/sre-book/service-level-objectives/)
- [BIZRA Incident Response Runbook](./incident-response.md)
- [Prometheus Alerting Rules](../monitoring/prometheus/alerts.yml)
