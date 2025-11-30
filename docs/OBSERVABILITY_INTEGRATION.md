# BIZRA Genesis Node - Observability Integration Guide

**Version**: 1.0.0
**Last Updated**: 2025-11-11

---

## 🎯 Purpose

This guide shows how to integrate the observability stack (Prometheus + Grafana) with your BIZRA Genesis Node to monitor SLOs, track performance, and validate system health.

---

## 📋 Prerequisites

### Required

- ✅ Docker + Docker Compose installed
- ✅ BIZRA Genesis Node built (`cargo build --release`)
- ✅ Node.js 20+ (for validation scripts)
- ✅ K6 installed (for synthetic scenarios)

### Optional

- promtool (for rule testing)
- jq (for JSON parsing)
- curl (for API testing)

---

## 🚀 Integration Steps

### Step 1: Configure BIZRA Genesis Node

The BIZRA Genesis Node must expose metrics for Prometheus to scrape.

#### Option A: Validation API Mode (Default)

```bash
# Start validation API with metrics endpoint
cargo run --release -- validation-api

# Default port: 3006
# Metrics endpoint: http://localhost:3006/metrics
```

**Verify metrics are exposed**:
```bash
curl http://localhost:3006/metrics

# Expected output:
# # HELP http_requests_total Total number of HTTP requests
# # TYPE http_requests_total counter
# http_requests_total{status="200"} 42
# ...
```

#### Option B: Custom Port

```bash
# Set custom port via environment variable
export VALIDATION_API_PORT=8080
cargo run --release -- validation-api

# Metrics: http://localhost:8080/metrics
```

**Update Prometheus scrape config**:
```yaml
# obsv/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'bizra-genesis'
    static_configs:
      - targets: ['host.docker.internal:8080']  # Change port
```

### Step 2: Start Observability Stack

```bash
# Set Grafana admin password
export GF_ADMIN_PASS='your-secure-password'

# Start stack
make obs-up

# Or manually:
docker compose -f docker-compose.obsv.yml up -d
```

**Services started**:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- Renderer: http://localhost:8081
- Node Exporter: http://localhost:9100

### Step 3: Verify Prometheus Scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.job=="bizra-genesis")'

# Expected output:
# {
#   "discoveredLabels": {...},
#   "labels": {
#     "instance": "host.docker.internal:3006",
#     "job": "bizra-genesis"
#   },
#   "scrapePool": "bizra-genesis",
#   "scrapeUrl": "http://host.docker.internal:3006/metrics",
#   "globalUrl": "http://host.docker.internal:3006/metrics",
#   "lastError": "",
#   "lastScrape": "2025-11-11T15:00:00.000Z",
#   "lastScrapeDuration": 0.002,
#   "health": "up"
# }
```

**If target is DOWN**:
1. Verify BIZRA node is running: `curl http://localhost:3006/health`
2. Check Docker network can reach host: `docker exec bizra-prometheus-test curl http://host.docker.internal:3006/metrics`
3. Check firewall rules allow Docker to access host

### Step 4: Access Grafana

```bash
# Open Grafana
# URL: http://localhost:3000
# User: viewer
# Pass: $GF_ADMIN_PASS
```

**Navigate to Core KPIs dashboard**:
1. Click "Dashboards" in left sidebar
2. Select "BIZRA Genesis Node - Core KPIs"
3. Panels should show data (may take 30-60 seconds for first scrape)

### Step 5: Generate Traffic (Optional)

If panels show "No data", generate synthetic traffic:

```bash
# Run k6 synthetic scenario
k6 run k6/scenarios/api-slo.js

# This will:
# - Generate requests to /health, /validate/genesis, /validate/poi, /metrics
# - Run for 1 minute with 5 VUs
# - Populate metrics in Prometheus
```

Wait 30-60 seconds for Prometheus to scrape, then refresh Grafana dashboard.

---

## 🔧 Advanced Integration

### Custom Metrics

Add custom metrics to BIZRA Genesis Node:

```rust
// In your Rust code
use prometheus::{Counter, Histogram, Registry};

// Create metrics
let request_counter = Counter::new("http_requests_total", "Total HTTP requests")?;
let latency_histogram = Histogram::new("http_request_duration_seconds", "Request latency")?;

// Register with registry
let registry = Registry::new();
registry.register(Box::new(request_counter.clone()))?;
registry.register(Box::new(latency_histogram.clone()))?;

// Increment in handlers
request_counter.inc();
latency_histogram.observe(duration.as_secs_f64());

// Expose via /metrics endpoint
let metrics = prometheus::TextEncoder::new().encode_to_string(&registry.gather())?;
```

**Update Prometheus rules** (`obsv/prometheus/rules/bizra-slos.yml`):
```yaml
groups:
  - name: custom_metrics
    rules:
      - alert: CustomMetricAlert
        expr: my_custom_metric > 100
        for: 5m
```

**Add to dashboard** (`obsv/grafana/dashboards/core-kpis.json`):
```json
{
  "id": 8,
  "title": "My Custom Metric",
  "targets": [{
    "expr": "my_custom_metric"
  }]
}
```

### Multi-Node Deployment

For multiple BIZRA nodes:

```yaml
# obsv/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'bizra-genesis'
    static_configs:
      - targets:
        - 'node1.example.com:3006'
        - 'node2.example.com:3006'
        - 'node3.example.com:3006'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

**Update dashboard** to filter by instance:
```promql
# Panel query
sum by (instance) (rate(http_requests_total{job="bizra-genesis"}[5m]))
```

### Remote Write (Production)

Send metrics to remote Prometheus instance:

```yaml
# obsv/prometheus/prometheus.yml
remote_write:
  - url: https://prometheus.example.com/api/v1/write
    basic_auth:
      username: 'your-username'
      password: 'your-password'
```

### Alertmanager Integration

Send alerts to Slack/PagerDuty/Email:

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname']
  receiver: 'slack'

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: 'BIZRA Genesis Alert'
```

**Update docker-compose**:
```yaml
services:
  alertmanager:
    image: prom/alertmanager:v0.27.0
    volumes:
      - ./obsv/alertmanager:/etc/alertmanager
    ports:
      - "9093:9093"
```

**Update Prometheus**:
```yaml
# obsv/prometheus/prometheus.yml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

---

## 🧪 Testing Integration

### 1. Validate Metrics Endpoint

```bash
# Test metrics endpoint structure
curl http://localhost:3006/metrics | head -20

# Should see Prometheus format:
# # HELP <metric_name> <description>
# # TYPE <metric_name> <type>
# <metric_name>{labels} <value>
```

### 2. Validate Dashboard Spec

```bash
node scripts/validate-dashboards.mjs

# Expected: 100% spec coverage
```

### 3. Validate Alert Rules

```bash
promtool test rules obsv/prometheus/rules_test.yml

# Expected: Unit Testing: SUCCESS
```

### 4. Validate Panel Data

```bash
# Create Grafana API token
export GF_TOKEN=$(curl -sS -X POST http://localhost:3000/api/auth/keys \
  -H "Content-Type: application/json" \
  -u "viewer:$GF_ADMIN_PASS" \
  -d '{"name":"test","role":"Viewer","secondsToLive":3600}' | jq -r '.key')

# Run synthetic scenario
k6 run k6/scenarios/api-slo.js

# Assert panels have data
node scripts/assert-grafana.mjs

# Expected: Scenario Coverage ≥60%
```

---

## 🔐 Security Integration

### Metrics Authentication

Add authentication to metrics endpoint:

```rust
// In your Rust code
async fn metrics_handler(
    headers: HeaderMap,
) -> Result<String, StatusCode> {
    // Verify bearer token
    let auth = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !auth.starts_with("Bearer ") {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = &auth[7..];
    if token != std::env::var("METRICS_TOKEN").unwrap_or_default() {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Return metrics
    Ok(prometheus::TextEncoder::new().encode_to_string(&registry.gather())?)
}
```

**Update Prometheus scrape config**:
```yaml
scrape_configs:
  - job_name: 'bizra-genesis'
    static_configs:
      - targets: ['host.docker.internal:3006']
    authorization:
      type: Bearer
      credentials: 'your-secret-token'
```

### TLS/HTTPS

Enable HTTPS for metrics endpoint:

```rust
// Use axum with rustls
use axum_server::tls_rustls::RustlsConfig;

let config = RustlsConfig::from_pem_file(
    "certs/cert.pem",
    "certs/key.pem"
).await?;

axum_server::bind_rustls(addr, config)
    .serve(app.into_make_service())
    .await?;
```

**Update Prometheus**:
```yaml
scrape_configs:
  - job_name: 'bizra-genesis'
    scheme: https
    tls_config:
      ca_file: /etc/prometheus/certs/ca.pem
    static_configs:
      - targets: ['host.docker.internal:3006']
```

---

## 🐛 Troubleshooting Integration

### Prometheus Can't Scrape Metrics

**Symptom**: Target shows "DOWN" in Prometheus

**Solutions**:

```bash
# 1. Verify BIZRA node is running
curl http://localhost:3006/health

# 2. Verify metrics endpoint works from host
curl http://localhost:3006/metrics

# 3. Test from Prometheus container
docker exec bizra-prometheus-test curl http://host.docker.internal:3006/metrics

# 4. If curl fails from container, check Docker network
docker network inspect bizra-obsv

# 5. On Linux, may need to use IP instead of host.docker.internal
# Get host IP
ip addr show docker0 | grep inet | awk '{print $2}' | cut -d/ -f1

# Update prometheus.yml targets
# - targets: ['172.17.0.1:3006']  # Use actual IP
```

### Grafana Shows "No Data"

**Symptom**: Panels show "No data" even though Prometheus is scraping

**Solutions**:

```bash
# 1. Verify Prometheus has data
curl 'http://localhost:9090/api/v1/query?query=up{job="bizra-genesis"}' | jq

# 2. Check time range in Grafana (top-right corner)
# Set to "Last 15 minutes" or "Last 1 hour"

# 3. Verify datasource is working
curl -H "Authorization: Bearer $GF_TOKEN" \
  http://localhost:3000/api/datasources/uid/prom | jq

# 4. Test query directly
curl -H "Authorization: Bearer $GF_TOKEN" \
  -X POST http://localhost:3000/api/ds/query \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [{
      "refId": "A",
      "datasource": {"type": "prometheus", "uid": "prom"},
      "expr": "up",
      "range": true
    }],
    "from": "now-15m",
    "to": "now"
  }' | jq

# 5. Generate traffic if no data yet
k6 run k6/scenarios/api-slo.js
```

### Alert Rules Not Firing

**Symptom**: Expected alerts don't show in Grafana

**Solutions**:

```bash
# 1. Check rule syntax
promtool check rules obsv/prometheus/rules/bizra-slos.yml

# 2. Test rules locally
promtool test rules obsv/prometheus/rules_test.yml

# 3. Check Prometheus rules status
curl http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name=="bizra_slo_alerts")'

# 4. Manually trigger alert conditions
# Generate high error rate
for i in {1..100}; do
  curl http://localhost:3006/invalid-endpoint
done

# Wait 5 minutes, then check
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.alertname=="ApiHighErrorRate")'
```

---

## 📚 Integration Examples

### Example 1: Local Development

```bash
# Terminal 1: Start observability
export GF_ADMIN_PASS='dev-password'
make obs-up

# Terminal 2: Start BIZRA node
cargo run --release -- validation-api

# Terminal 3: Generate traffic
k6 run k6/scenarios/api-slo.js

# View metrics in Grafana
# http://localhost:3000/d/bizra-core-kpis
```

### Example 2: Docker Compose Integration

```yaml
# docker-compose.yml
version: "3.8"
services:
  bizra-node:
    build: .
    environment:
      - VALIDATION_API_PORT=3006
    ports:
      - "3006:3006"
    networks:
      - bizra

  prometheus:
    image: prom/prometheus:v2.54.0
    volumes:
      - ./obsv/prometheus:/etc/prometheus
    ports:
      - "9090:9090"
    networks:
      - bizra

  grafana:
    image: grafana/grafana:11.1.0
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GF_ADMIN_PASS}
    volumes:
      - ./obsv/grafana/provisioning:/etc/grafana/provisioning
    ports:
      - "3000:3000"
    networks:
      - bizra

networks:
  bizra:
    driver: bridge
```

**Update Prometheus targets**:
```yaml
# obsv/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'bizra-genesis'
    static_configs:
      - targets: ['bizra-node:3006']  # Use service name
```

### Example 3: Kubernetes Integration

```yaml
# kubernetes/prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    scrape_configs:
      - job_name: 'bizra-genesis'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - bizra-genesis
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: bizra-genesis-node
          - source_labels: [__meta_kubernetes_pod_ip]
            target_label: __address__
            replacement: $1:3006
```

---

## ✅ Integration Checklist

Before going to production:

- [ ] Metrics endpoint authenticated
- [ ] Prometheus scraping successfully (all targets UP)
- [ ] Grafana dashboards loading with data
- [ ] Alert rules tested and firing correctly
- [ ] Alertmanager configured and routing alerts
- [ ] TLS/HTTPS enabled for metrics endpoint
- [ ] Firewall rules configured
- [ ] Monitoring documented for ops team
- [ ] Runbooks created for common alerts
- [ ] Load testing completed with monitoring active

---

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [K6 Documentation](https://k6.io/docs/)
- [Observability Quick Reference](OBSERVABILITY_QUICK_REFERENCE.md)
- [Troubleshooting Guide](OBSERVABILITY_TROUBLESHOOTING.md)

---

*Built with إحسان (Excellence) • Integration Guide for Production 🚀*

**Version**: 1.0.0
**Last Updated**: 2025-11-11
