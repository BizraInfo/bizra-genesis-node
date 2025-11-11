# BIZRA Genesis Node - Observability Quick Reference

**Version**: 1.0.0
**Last Updated**: 2025-11-11

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Set password
export GF_ADMIN_PASS='your-secure-password'

# 2. Start stack
make obs-up

# 3. Run tests
make obs-test
```

**Access**:
- Grafana: http://localhost:3000 (user: `viewer`, pass: `$GF_ADMIN_PASS`)
- Prometheus: http://localhost:9090
- Renderer: http://localhost:8081

---

## 📋 Make Targets

### Stack Management

```bash
make obs-up          # Start observability stack
make obs-down        # Stop and remove stack
make obs-logs        # Show logs (follow mode)
make obs-clean       # Clean artifacts and volumes
```

### Testing

```bash
make obs-test             # Run all tests
make obs-test-spec        # Dashboard spec validation only
make obs-test-rules       # Prometheus rule tests only
make obs-test-scenario    # Panel data assertions (needs live node)
make obs-report           # Generate coverage report
```

### Development

```bash
make build         # Build BIZRA Genesis Node
make quickstart    # Build + start stack + run node
```

---

## 🧪 Testing Commands

### 1. Dashboard Spec Validation

```bash
# Validate dashboard structure and security
node scripts/validate-dashboards.mjs

# Expected output:
# ✅ PASS core-kpis.json
#    Spec Coverage: 1/1 (100.0%)
```

**Checks**:
- Required fields (uid, title, panels, schemaVersion, tags)
- Stable UID
- Signed plugins only
- No external datasources

### 2. Prometheus Rule Tests

```bash
# Unit test alert rules
promtool test rules obsv/prometheus/rules_test.yml

# Lint rule syntax
promtool check rules obsv/prometheus/rules/*.yml
```

**Tests**:
- Alert fires when error rate > 1%
- Alert fires when P95 latency > 300ms
- Alert fires when PoI validation < 99%
- Recording rules produce correct aggregations

### 3. Panel Data Assertions

```bash
# Prerequisites:
# - Observability stack running (make obs-up)
# - BIZRA Genesis Node running (cargo run --release -- validation-api)
# - GF_TOKEN environment variable set

# Create Grafana viewer token
export GF_TOKEN=$(curl -sS -X POST http://localhost:3000/api/auth/keys \
  -H "Content-Type: application/json" \
  -u "viewer:$GF_ADMIN_PASS" \
  -d '{"name":"test","role":"Viewer","secondsToLive":3600}' | jq -r '.key')

# Run k6 synthetic scenario
k6 run k6/scenarios/api-slo.js

# Assert panels have data
node scripts/assert-grafana.mjs
```

### 4. Coverage Report

```bash
# Generate unified report
node scripts/coverage-report.mjs > artifacts/obsv-coverage.json

# View summary
cat artifacts/obsv-coverage.json | jq '.summary'
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Required
export GF_ADMIN_PASS='your-secure-password'

# Optional
export GF_URL='http://localhost:3000'        # Grafana URL
export GF_TOKEN='<viewer-api-token>'         # Grafana API token
export API_URL='http://localhost:3006'        # BIZRA API URL
export DASH_UID='bizra-core-kpis'            # Dashboard UID
```

### Docker Compose Override

Create `docker-compose.obsv.override.yml`:

```yaml
version: "3.8"
services:
  grafana:
    ports:
      - "3001:3000"  # Use different port
    environment:
      - GF_SERVER_ROOT_URL=http://localhost:3001
```

Run: `docker compose -f docker-compose.obsv.yml -f docker-compose.obsv.override.yml up -d`

---

## 📊 Coverage Thresholds

| Layer | Threshold | Command |
|-------|-----------|---------|
| Spec Coverage | ≥90% | `make obs-test-spec` |
| Rule/Alert Coverage | ≥80% | `make obs-test-rules` |
| Scenario Coverage | ≥60% | `make obs-test-scenario` |
| Visual/Threshold | ≥80% | (Future) |
| **Overall** | **≥75%** | `make obs-report` |

---

## 🐛 Common Issues

### "GF_ADMIN_PASS not set"

```bash
export GF_ADMIN_PASS='your-password'
make obs-up
```

### "Cannot connect to Grafana"

```bash
# Check if running
docker ps | grep grafana

# Check logs
docker logs bizra-grafana-test

# Restart
make obs-down && make obs-up
```

### "No data in panels"

```bash
# 1. Check BIZRA Genesis Node is running
curl http://localhost:3006/health

# 2. Check Prometheus is scraping
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.job=="bizra-genesis")'

# 3. Run synthetic scenario
k6 run k6/scenarios/api-slo.js

# 4. Wait 30 seconds for Prometheus to scrape
```

### "Panel assertions fail"

```bash
# 1. Verify GF_TOKEN is set
echo $GF_TOKEN

# 2. If not set, create token
export GF_TOKEN=$(curl -sS -X POST http://localhost:3000/api/auth/keys \
  -H "Content-Type: application/json" \
  -u "viewer:$GF_ADMIN_PASS" \
  -d '{"name":"test","role":"Viewer","secondsToLive":3600}' | jq -r '.key')

# 3. Test token
curl -H "Authorization: Bearer $GF_TOKEN" http://localhost:3000/api/health
```

---

## 📈 Prometheus Queries

### Error Rate

```promql
sum(rate(http_requests_total{job="bizra-genesis",status=~"5.."}[5m]))
/
sum(rate(http_requests_total{job="bizra-genesis"}[5m]))
```

### P95 Latency

```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{job="bizra-genesis"}[5m])) by (le)
)
```

### PoI Validation Success Rate

```promql
sum(rate(poi_validation_success_total{job="bizra-genesis"}[5m]))
/
sum(rate(poi_validation_total{job="bizra-genesis"}[5m]))
```

### Consensus Latency P95

```promql
histogram_quantile(0.95,
  sum(rate(consensus_duration_seconds_bucket{job="bizra-genesis"}[5m])) by (le)
)
```

---

## 🔐 Security Best Practices

### Token Management

```bash
# Create short-lived viewer token (1 hour)
curl -X POST http://localhost:3000/api/auth/keys \
  -H "Content-Type: application/json" \
  -u "viewer:$GF_ADMIN_PASS" \
  -d '{"name":"test","role":"Viewer","secondsToLive":3600}'

# List tokens
curl -H "Authorization: Bearer $GF_TOKEN" \
  http://localhost:3000/api/auth/keys

# Revoke token
curl -X DELETE http://localhost:3000/api/auth/keys/{id} \
  -u "viewer:$GF_ADMIN_PASS"
```

### Plugin Verification

```bash
# Check for unsigned plugins in dashboard
cat obsv/grafana/dashboards/core-kpis.json | \
  jq '.[] | select(.id | test("unsigned|dev"))'

# Should return empty
```

---

## 📂 File Locations

### Configuration

- Stack: `docker-compose.obsv.yml`
- Prometheus: `obsv/prometheus/prometheus.yml`
- Alert Rules: `obsv/prometheus/rules/bizra-slos.yml`
- Rule Tests: `obsv/prometheus/rules_test.yml`
- Datasource: `obsv/grafana/provisioning/datasources/prometheus.yml`
- Dashboard Provisioning: `obsv/grafana/provisioning/dashboards/default.yml`

### Dashboards

- Core KPIs: `obsv/grafana/dashboards/core-kpis.json`

### Scripts

- Spec Validator: `scripts/validate-dashboards.mjs`
- Panel Assertions: `scripts/assert-grafana.mjs`
- Coverage Report: `scripts/coverage-report.mjs`

### Scenarios

- K6 Synthetic: `k6/scenarios/api-slo.js`

### Artifacts

- Spec Coverage: `artifacts/spec-coverage.json`
- Scenario Coverage: `artifacts/scenario-coverage.json`
- Unified Report: `artifacts/obsv-coverage.json`

---

## 🎯 Workflow Examples

### Daily Development

```bash
# Start observability
make obs-up

# Develop...
cargo run --release -- validation-api

# Check metrics in Grafana
# http://localhost:3000/d/bizra-core-kpis

# Stop when done
make obs-down
```

### Before Committing

```bash
# Run all tests
make obs-test

# Check coverage
cat artifacts/obsv-coverage.json | jq '.summary.overall'

# If passed, commit
git add obsv/ scripts/ k6/
git commit -m "feat: Update observability configuration"
```

### CI/CD Pipeline

```bash
# Triggered automatically on push to main
# See: .github/workflows/obsv.yml

# Manual trigger
gh workflow run obsv.yml
```

---

## 📚 Additional Resources

- [Full Guide](OBSERVABILITY_TEST_COVERAGE.md) - Comprehensive documentation
- [Integration Guide](OBSERVABILITY_INTEGRATION.md) - Connect to BIZRA node
- [Troubleshooting](OBSERVABILITY_TROUBLESHOOTING.md) - Detailed solutions
- [Implementation Summary](../OBSERVABILITY_IMPLEMENTATION_SUMMARY.md) - Complete overview

---

## 🆘 Get Help

**Issues**:
- GitHub Issues: https://github.com/your-org/bizra-genesis-node/issues
- Tag with `observability` label

**Documentation**:
- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/
- K6: https://k6.io/docs/

---

*Built with إحسان (Excellence) • Quick Reference for Developers 🚀*

**Version**: 1.0.0
**Last Updated**: 2025-11-11
