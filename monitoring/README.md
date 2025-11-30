# BIZRA Genesis Node - Elite Observability Stack

## Overview

This directory contains production-grade observability infrastructure implementing **world-class DevOps standards** with comprehensive monitoring, alerting, and visualization capabilities.

## Architecture

```
monitoring/
├── prometheus/               # Metrics collection & alerting
│   ├── prometheus.yml       # Scrape configuration, recording rules
│   └── rules/
│       └── slo-alerts.yml   # SLO-based alerting rules
└── grafana/                  # Visualization & dashboards
    └── dashboards/
        └── bizra-genesis-node.json   # Elite performance dashboard
```

## Quick Start

### 1. Deploy Prometheus

```bash
# Apply Prometheus configuration
kubectl create configmap prometheus-config \
  --from-file=monitoring/prometheus/prometheus.yml \
  -n bizra-production

kubectl create configmap prometheus-rules \
  --from-file=monitoring/prometheus/rules/ \
  -n bizra-production

# Deploy Prometheus (assumes existing deployment)
kubectl apply -f k8s/base/
```

### 2. Configure Grafana

```bash
# Import dashboard
curl -X POST http://grafana.bizra.io/api/dashboards/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -d @monitoring/grafana/dashboards/bizra-genesis-node.json

# Or via Grafana UI:
# Settings → Data Sources → Add Prometheus → http://prometheus:9090
# Dashboards → Import → Upload bizra-genesis-node.json
```

### 3. Verify Metrics

```bash
# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Test query
curl -G http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=up{job="bizra-genesis-node"}'
```

---

## SLO Definitions

### HTTP Request Latency
- **P95 Target**: <500ms
- **P99 Target**: <1s
- **Measurement**: `http_request_duration_seconds` histogram
- **Alert Threshold**: P95 >500ms for 5 minutes

### Error Rate
- **Target**: <1%
- **Measurement**: `http_requests_total{status=~"5.."}` / `http_requests_total`
- **Alert Threshold**: Error rate >1% for 5 minutes

### Availability
- **Target**: 99.95%
- **Measurement**: (1 - error_rate) over 1 hour window
- **Alert Threshold**: <99.95% for 10 minutes

### Consensus Finalization
- **Target**: P95 <2s
- **Measurement**: `consensus_finalization_duration_seconds` histogram
- **Alert Threshold**: P95 >2s for 5 minutes

### Database Query Latency
- **Target**: P95 <100ms
- **Measurement**: `db_query_duration_seconds` histogram
- **Alert Threshold**: P95 >100ms for 5 minutes

### WebSocket Stability
- **Target**: <1% disconnection rate
- **Measurement**: `websocket_disconnections_total` / `websocket_connections_total`
- **Alert Threshold**: >1% for 10 minutes

---

## Alert Rules

### SLO Violations (Critical)

| Alert | Threshold | Duration | Action | Runbook |
|-------|-----------|----------|--------|---------|
| `HTTPLatencyP95Breach` | P95 >500ms | 5m | Investigate slow endpoints | `docs/runbooks/http-latency-p95-breach.md` |
| `HTTPErrorRateSLOBreach` | Error rate >1% | 5m | Check logs, recent deploys | `docs/runbooks/TEMPLATE.md` |
| `AvailabilitySLOBreach` | <99.95% | 10m | **Escalate to @oncall-sre** | `docs/runbooks/availability-slo-breach.md` |
| `ConsensusFinalizationSLOBreach` | P95 >2s | 5m | Check consensus mechanism | `docs/runbooks/TEMPLATE.md` |

### Security Hotspots (Critical)

| Alert | Threshold | Duration | Action | Runbook |
|-------|-----------|----------|--------|---------|
| `CriticalSecurityHotspotsDetected` | >0 critical | 0m | **Review scanner report immediately** | `docs/runbooks/security-hotspot-remediation.md` |
| `HardcodedSecretsInProduction` | >0 secrets | 0m | **Rotate credentials, escalate to security** | `docs/runbooks/security-hotspot-remediation.md` |
| `HighSecurityHotspotsAccumulating` | +5 high/24h | 1h | Prioritize remediation in sprint | `docs/runbooks/security-hotspot-remediation.md` |

### Performance Bottlenecks (Warning)

| Alert | Threshold | Duration | Action |
|-------|-----------|----------|--------|
| `ExcessiveCloningDetected` | >10 instances | 30m | Review scanner report for optimization |
| `BlockingIOInAsyncContext` | >5 instances | 1h | Refactor to async I/O |
| `GodModulesExceedingComplexity` | >3 modules | 24h | Plan refactoring |

### Infrastructure Health (Critical/Warning)

| Alert | Threshold | Duration | Action |
|-------|-----------|----------|--------|
| `PodCrashLooping` | Restart rate >0 | 5m | Check logs, investigate crash |
| `PodMemoryPressure` | >90% limit | 5m | Review memory usage, scale vertically |
| `HPAMaxReplicasReached` | At max replicas | 15m | Increase max replicas or cluster capacity |
| `DatabaseConnectionPoolExhaustion` | >80% capacity | 5m | Scale connection pool or pods |

---

## Dashboard Overview

### SLO Compliance Overview
- **HTTP Latency P95**: Real-time SLO compliance with color-coded status
- **Error Rate**: Current error percentage with SLO threshold visualization
- **Availability**: 1-hour rolling availability percentage
- **Consensus Finalization P95**: Blockchain-specific latency metrics

### HTTP Performance Metrics
- **Latency Distribution**: P50/P95/P99 over time with SLO threshold lines
- **Request Rate by Status**: Stacked area chart showing 2xx/4xx/5xx breakdown
- **Top Endpoints by Latency**: Identify slow endpoints requiring optimization

### Security & Performance Hotspots
- **Critical/High Security Hotspots**: Real-time counts from architecture scanner
- **Performance Bottlenecks**: High-impact issues (memory pressure, blocking I/O)
- **Hotspot Tables**: Detailed breakdown by type, severity, impact

### Infrastructure Health
- **Pod Memory Usage**: Per-pod memory usage with 90% threshold line
- **Pod CPU Usage**: Per-pod CPU usage with throttling indicators
- **HPA Replica Count**: Current/desired/max replicas visualization
- **Database Connection Pool**: Active connections vs. max capacity

### Business Metrics
- **Transaction Processing Rate**: Blockchain transactions per second
- **API Request Volume**: Top 10 endpoints by request rate

---

## Metric Instrumentation

### Required Metrics

Your application must expose these metrics for full observability:

#### HTTP Metrics
```rust
// Counter: Total HTTP requests
http_requests_total{status="200", method="GET", endpoint="/api/v1/users"}

// Histogram: Request duration
http_request_duration_seconds_bucket{le="0.1", endpoint="/api/v1/users"}
http_request_duration_seconds_sum{endpoint="/api/v1/users"}
http_request_duration_seconds_count{endpoint="/api/v1/users"}
```

#### Database Metrics
```rust
// Histogram: Query duration
db_query_duration_seconds_bucket{le="0.05", query_type="select"}
db_query_duration_seconds_sum{query_type="select"}
db_query_duration_seconds_count{query_type="select"}

// Gauge: Connection pool
pg_stat_database_numbackends{datname="bizra_production"}
pg_settings_max_connections
```

#### Consensus Metrics
```rust
// Histogram: Finalization duration
consensus_finalization_duration_seconds_bucket{le="1.0"}
consensus_finalization_duration_seconds_sum
consensus_finalization_duration_seconds_count

// Counter: Transactions processed
consensus_transactions_processed_total
```

#### WebSocket Metrics
```rust
// Counter: Connections
websocket_connections_total
websocket_disconnections_total

// Gauge: Active connections
websocket_active_connections
```

#### Scanner Metrics
```rust
// Gauge: Security hotspots
scanner_security_hotspots_total{severity="critical", type="hardcoded_secrets"}

// Gauge: Performance bottlenecks
scanner_performance_bottlenecks_total{impact="memory_pressure", type="excessive_cloning"}
```

### Implementation Example

```rust
use prometheus::{Counter, Histogram, Gauge, register_counter, register_histogram, register_gauge};

// In your metrics module
lazy_static! {
    static ref HTTP_REQUESTS: Counter = register_counter!(
        "http_requests_total",
        "Total HTTP requests"
    ).unwrap();
    
    static ref HTTP_DURATION: Histogram = register_histogram!(
        "http_request_duration_seconds",
        "HTTP request duration",
        vec![0.001, 0.01, 0.1, 0.5, 1.0, 5.0]
    ).unwrap();
}

// In your handler
let timer = HTTP_DURATION.start_timer();
let response = handle_request().await;
timer.observe_duration();
HTTP_REQUESTS.inc();
```

---

## Alerting Configuration

### Slack Integration

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'namespace']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'slack-notifications'
  routes:
    - match:
        severity: critical
      receiver: 'slack-critical'
      continue: true
    - match:
        team: security
      receiver: 'slack-security'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: $SLACK_WEBHOOK_URL
        channel: '#bizra-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
  
  - name: 'slack-critical'
    slack_configs:
      - api_url: $SLACK_WEBHOOK_URL
        channel: '#bizra-critical'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        actions:
          - type: button
            text: 'View Runbook'
            url: '{{ (index .Alerts 0).Annotations.runbook_url }}'
  
  - name: 'slack-security'
    slack_configs:
      - api_url: $SLACK_WEBHOOK_URL
        channel: '#bizra-security'
        title: '🔒 SECURITY: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

### PagerDuty Integration

```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: $PAGERDUTY_SERVICE_KEY
        description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'
        details:
          severity: '{{ .GroupLabels.severity }}'
          impact: '{{ .GroupLabels.impact }}'
          runbook: '{{ .Annotations.runbook_url }}'
```

---

## Runbook URLs

All critical alerts include runbook URLs for standardized response procedures:

- **HTTP Latency**: https://bizra.io/runbooks/http-latency-p95-breach
- **Error Rate**: https://bizra.io/runbooks/error-rate-slo-breach
- **Availability**: https://bizra.io/runbooks/availability-slo-breach
- **Security Hotspots**: https://bizra.io/runbooks/security-hotspot-remediation
- **Performance Bottlenecks**: https://bizra.io/runbooks/memory-optimization

Create these runbooks in your internal documentation system with:
1. **Symptom**: What the alert indicates
2. **Impact**: Business/user impact
3. **Investigation Steps**: Where to look (logs, metrics, traces)
4. **Resolution Steps**: Standard remediation procedures
5. **Escalation Path**: When and whom to escalate to

---

## Performance Standards

### Elite DevOps Benchmarks

| Metric | Elite Standard | Current Target | Notes |
|--------|---------------|----------------|-------|
| **Deployment Frequency** | >10/day | Multiple/day | GitOps CD pipeline |
| **Lead Time for Changes** | <1 hour | <4 hours | PR merge to production |
| **MTTR (Mean Time to Recover)** | <1 hour | <2 hours | SLO-based alerting |
| **Change Failure Rate** | <5% | <10% | Rollback automation |
| **Availability** | 99.99% | 99.95% | SLO compliance |
| **P95 Latency** | <100ms | <500ms | HTTP requests |
| **Security Response Time** | <15 minutes | <1 hour | Critical hotspots |

---

## Maintenance

### Weekly Tasks
- [ ] Review SLO compliance dashboard
- [ ] Analyze top 10 security hotspots
- [ ] Check HPA scaling patterns
- [ ] Review database connection pool trends

### Monthly Tasks
- [ ] Calibrate alert thresholds based on traffic patterns
- [ ] Update scanner confidence scoring
- [ ] Review and update runbooks
- [ ] Capacity planning based on growth trends

### Quarterly Tasks
- [ ] SLO review and adjustment
- [ ] Dashboard refresh (add new metrics, remove obsolete)
- [ ] Alert fatigue analysis (false positive rate)
- [ ] Observability stack upgrade planning

---

## Troubleshooting

### Prometheus Not Scraping Targets

```bash
# Check Prometheus logs
kubectl logs -n bizra-production -l app=prometheus

# Verify service discovery
kubectl get servicemonitor -n bizra-production

# Test target endpoint
kubectl port-forward -n bizra-production svc/bizra-genesis-node 9090:9090
curl http://localhost:9090/metrics
```

### Grafana Dashboard Not Loading Data

```bash
# Test Prometheus data source
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://grafana.bizra.io/api/datasources/proxy/1/api/v1/query?query=up

# Check query syntax
# Use Prometheus UI to validate queries before adding to dashboard
```

### Missing Metrics

```bash
# List all available metrics
curl http://prometheus:9090/api/v1/label/__name__/values

# Check metric cardinality
curl http://prometheus:9090/api/v1/query?query=count(up)

# Verify application instrumentation
kubectl logs -n bizra-production -l app=bizra-genesis-node | grep "metric"
```

---

## Best Practices

1. **Metric Naming**: Follow Prometheus conventions (`<namespace>_<subsystem>_<name>_<unit>`)
2. **Label Cardinality**: Keep labels low-cardinality (avoid user IDs, timestamps)
3. **Alert Hygiene**: Every alert must have a runbook and clear remediation path
4. **Dashboard Organization**: Use rows to group related panels logically
5. **SLO-Based Alerting**: Alert on SLO breaches, not arbitrary thresholds
6. **Evidence-Based Thresholds**: Use scanner confidence scores and historical data

---

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Google SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Site Reliability Workbook - Alerting](https://sre.google/workbook/alerting-on-slos/)
- [BIZRA Architecture Scanner](../../tools/architecture-scanner/README.md)

---

**Last Updated**: 2025-01-01  
**Owner**: SRE Team (@oncall-sre)  
**Review Cycle**: Quarterly
