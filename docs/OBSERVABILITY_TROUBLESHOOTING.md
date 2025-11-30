# BIZRA Genesis Node - Observability Troubleshooting

**Version**: 1.0.0
**Last Updated**: 2025-11-11

---

## 🎯 Purpose

Comprehensive troubleshooting guide for the BIZRA Genesis Node observability stack. Covers common issues, error messages, and step-by-step solutions.

---

## 📋 Quick Diagnosis

### Health Check Commands

```bash
# Check all services
docker ps | grep bizra

# Expected output:
# bizra-prometheus-test
# bizra-grafana-test
# bizra-renderer-test
# bizra-node-exporter

# Check service logs
docker logs bizra-prometheus-test --tail=50
docker logs bizra-grafana-test --tail=50

# Check BIZRA node
curl http://localhost:3006/health

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.job=="bizra-genesis")'

# Check Grafana health
curl http://localhost:3000/api/health | jq
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "GF_ADMIN_PASS not set"

**Error**:
```
ERROR: 'required variable GF_ADMIN_PASS not set'
```

**Cause**: Environment variable not exported

**Solution**:
```bash
# Set password
export GF_ADMIN_PASS='your-secure-password'

# Verify
echo $GF_ADMIN_PASS

# Start stack
make obs-up
```

**Persistent Solution** (add to `~/.bashrc` or `~/.zshrc`):
```bash
export GF_ADMIN_PASS='your-secure-password'
```

---

### Issue 2: "Docker daemon not running"

**Error**:
```
Cannot connect to the Docker daemon. Is the docker daemon running?
```

**Cause**: Docker not started

**Solution**:

**Windows**:
```powershell
# Start Docker Desktop
start "Docker Desktop"

# Or from PowerShell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

**Linux**:
```bash
# Start Docker service
sudo systemctl start docker

# Enable on boot
sudo systemctl enable docker

# Check status
sudo systemctl status docker
```

**macOS**:
```bash
# Start Docker Desktop
open -a Docker
```

---

### Issue 3: "Port already in use"

**Error**:
```
ERROR: for grafana  Cannot start service grafana: driver failed programming external connectivity on endpoint bizra-grafana-test (...)
Bind for 0.0.0.0:3000 failed: port is already allocated
```

**Cause**: Another service using the same port

**Solution**:

```bash
# Find process using port 3000
# Linux/macOS:
lsof -i :3000

# Windows:
netstat -ano | findstr :3000

# Kill the process
# Linux/macOS:
kill -9 <PID>

# Windows:
taskkill /PID <PID> /F

# Or change port in docker-compose.obsv.override.yml
cat > docker-compose.obsv.override.yml <<EOF
version: "3.8"
services:
  grafana:
    ports:
      - "3001:3000"  # Use different port
EOF

# Start with override
docker compose -f docker-compose.obsv.yml -f docker-compose.obsv.override.yml up -d
```

---

### Issue 4: "Prometheus target is DOWN"

**Symptom**: Prometheus shows BIZRA Genesis target as "DOWN"

**Diagnosis**:
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.job=="bizra-genesis")'

# Look for lastError field
```

**Common Causes & Solutions**:

#### 4a. BIZRA Node Not Running

```bash
# Check if BIZRA node is running
curl http://localhost:3006/health

# If connection refused, start node
cargo run --release -- validation-api
```

#### 4b. Wrong Port/Host

```bash
# Check Prometheus scrape config
cat obsv/prometheus/prometheus.yml | grep -A3 "bizra-genesis"

# Should show:
#   - targets: ['host.docker.internal:3006']

# Test connectivity from Prometheus container
docker exec bizra-prometheus-test curl http://host.docker.internal:3006/metrics

# If fails, use host IP instead (Linux)
ip addr show docker0 | grep inet | awk '{print $2}' | cut -d/ -f1

# Update prometheus.yml with actual IP
# - targets: ['172.17.0.1:3006']

# Restart Prometheus
docker restart bizra-prometheus-test
```

#### 4c. Firewall Blocking

```bash
# Linux: Allow Docker network
sudo ufw allow from 172.0.0.0/8

# Windows: Allow Docker in Windows Firewall
# Control Panel → Windows Defender Firewall → Allow an app
# Add Docker Desktop

# macOS: No firewall issues typically
```

---

### Issue 5: "No data in Grafana panels"

**Symptom**: Grafana dashboard shows "No data" or empty panels

**Diagnosis**:
```bash
# Step 1: Check Prometheus is scraping
curl 'http://localhost:9090/api/v1/query?query=up{job="bizra-genesis"}' | jq

# Should show: "value": [<timestamp>, "1"]

# Step 2: Check metrics exist
curl 'http://localhost:9090/api/v1/query?query=http_requests_total' | jq

# Step 3: Check Grafana time range
# In Grafana UI, check top-right corner time picker
# Must be recent enough to include data
```

**Solutions**:

#### 5a. No Metrics Yet

```bash
# Generate traffic
k6 run k6/scenarios/api-slo.js

# Wait 30 seconds for Prometheus to scrape
sleep 30

# Refresh Grafana dashboard
```

#### 5b. Wrong Time Range

```bash
# In Grafana:
# 1. Click time picker (top-right)
# 2. Select "Last 15 minutes" or "Last 1 hour"
# 3. Click "Apply"

# Or use API
curl -X POST http://localhost:3000/api/dashboards/uid/bizra-core-kpis/time-range \
  -H "Authorization: Bearer $GF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from":"now-15m","to":"now"}'
```

#### 5c. Datasource Misconfigured

```bash
# Test datasource
curl -H "Authorization: Bearer $GF_TOKEN" \
  http://localhost:3000/api/datasources/uid/prom | jq

# Should show:
# {
#   "url": "http://prometheus:9090",
#   "access": "proxy",
#   "isDefault": true
# }

# If wrong, update provisioning
vim obsv/grafana/provisioning/datasources/prometheus.yml

# Restart Grafana
docker restart bizra-grafana-test
```

---

### Issue 6: "Dashboard validation fails"

**Error**:
```
❌ FAIL core-kpis.json
   Issues:
     - Missing required field: uid
```

**Cause**: Dashboard JSON missing required fields

**Solution**:
```bash
# Check required fields
node scripts/validate-dashboards.mjs

# Fix dashboard JSON
# Required fields:
# - uid (stable, unique identifier)
# - title
# - panels (array of panel objects)
# - schemaVersion
# - tags (array)
# - timezone

# Example fix:
cat > obsv/grafana/dashboards/core-kpis.json <<EOF
{
  "uid": "bizra-core-kpis",
  "title": "BIZRA Genesis Node - Core KPIs",
  "tags": ["bizra", "slo"],
  "timezone": "utc",
  "schemaVersion": 39,
  "panels": [...]
}
EOF

# Re-validate
node scripts/validate-dashboards.mjs
```

---

### Issue 7: "Prometheus rule tests fail"

**Error**:
```
FAILED bizra_slo_alerts.yml: alert 'ApiHighErrorRate' at 5m0s: expected 1 alerts, got 0
```

**Cause**: Rule logic incorrect or test data wrong

**Solution**:
```bash
# Debug rule syntax
promtool check rules obsv/prometheus/rules/bizra-slos.yml

# Run tests with output
promtool test rules obsv/prometheus/rules_test.yml

# Check test input data matches rule expr
cat obsv/prometheus/rules_test.yml | grep -A20 "ApiHighErrorRate"

# Common issue: insufficient data points
# Rule: for: 5m (needs 5 minutes of data)
# Test: Should have enough time points

# Fix test:
# - interval: 5m  # Evaluation interval
#   input_series:
#     - series: 'http_requests_total{...}'
#       values: '0+2x10'  # 10 points at 5m intervals = 50m of data
```

---

### Issue 8: "Cannot create Grafana API token"

**Error**:
```
{"message":"Invalid username or password"}
```

**Cause**: Wrong credentials or password not set

**Solution**:
```bash
# Verify GF_ADMIN_PASS is set
echo $GF_ADMIN_PASS

# If not set, set it
export GF_ADMIN_PASS='your-password'

# Restart Grafana with new password
docker restart bizra-grafana-test

# Wait for startup
sleep 10

# Create token
curl -X POST http://localhost:3000/api/auth/keys \
  -H "Content-Type: application/json" \
  -u "viewer:$GF_ADMIN_PASS" \
  -d '{"name":"test","role":"Viewer","secondsToLive":3600}' | jq

# Should return:
# {
#   "id": 1,
#   "name": "test",
#   "key": "eyJrI..."
# }
```

---

### Issue 9: "K6 scenario fails"

**Error**:
```
ERRO[0000] Get "http://localhost:3006/health": dial tcp [::1]:3006: connect: connection refused
```

**Cause**: BIZRA node not running or wrong port

**Solution**:
```bash
# Check BIZRA node
curl http://localhost:3006/health

# If not running, start it
cargo run --release -- validation-api &

# Wait for startup
sleep 5

# Verify health
curl http://localhost:3006/health

# Run k6 with correct URL
export API_URL='http://localhost:3006'
k6 run k6/scenarios/api-slo.js

# Or specify in command
k6 run --env API_URL=http://localhost:3006 k6/scenarios/api-slo.js
```

---

### Issue 10: "Panel assertions fail (GF_TOKEN not set)"

**Error**:
```
❌ GF_TOKEN environment variable required
```

**Cause**: Grafana API token not created or exported

**Solution**:
```bash
# Create token
export GF_TOKEN=$(curl -sS -X POST http://localhost:3000/api/auth/keys \
  -H "Content-Type: application/json" \
  -u "viewer:$GF_ADMIN_PASS" \
  -d '{"name":"test","role":"Viewer","secondsToLive":3600}' | jq -r '.key')

# Verify token
echo $GF_TOKEN

# Test token
curl -H "Authorization: Bearer $GF_TOKEN" http://localhost:3000/api/health

# Run assertions
node scripts/assert-grafana.mjs
```

---

### Issue 11: "Coverage report shows 0%"

**Symptom**: Coverage report shows all 0% or empty data

**Cause**: Artifact files not generated

**Solution**:
```bash
# Check artifact directory
ls -la artifacts/

# Expected files:
# - spec-coverage.json
# - scenario-coverage.json

# If missing, run tests
make obs-test-spec  # Generates spec-coverage.json
make obs-test-scenario  # Generates scenario-coverage.json

# Then generate report
make obs-report

# Check output
cat artifacts/obsv-coverage.json | jq
```

---

### Issue 12: "Docker volume permission denied"

**Error** (Linux):
```
mkdir: cannot create directory '/var/lib/grafana': Permission denied
```

**Cause**: Docker running as non-root, volume permissions wrong

**Solution**:
```bash
# Fix volume permissions
sudo chown -R 472:472 ~/.docker/volumes/bizra-genesis-node_grafana-data

# Or run with privileged flag (not recommended for prod)
docker compose -f docker-compose.obsv.yml up -d --privileged

# Better solution: Use named volumes with correct permissions
# Already configured in docker-compose.obsv.yml
```

---

### Issue 13: "Renderer not working"

**Symptom**: Cannot generate panel images

**Error**:
```
{"message":"Failed to render panel","error":"dial tcp: lookup renderer on ..."}
```

**Cause**: Renderer not running or Grafana can't reach it

**Solution**:
```bash
# Check renderer is running
docker ps | grep renderer

# Check renderer logs
docker logs bizra-renderer-test

# Test renderer directly
curl http://localhost:8081/render

# Should return: "Missing required parameter: url"

# Restart renderer
docker restart bizra-renderer-test

# Update Grafana to use correct renderer URL
# Already configured in docker-compose.obsv.yml:
# GF_RENDERING_SERVER_URL=http://renderer:8081/render
```

---

## 🔧 Advanced Debugging

### Enable Debug Logging

**Prometheus**:
```yaml
# obsv/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  scrape_timeout: 10s
  evaluation_interval: 15s
  external_labels:
    monitor: 'bizra-monitor'
  query_log_file: /tmp/prometheus_queries.log

# Restart
docker restart bizra-prometheus-test

# View query log
docker exec bizra-prometheus-test tail -f /tmp/prometheus_queries.log
```

**Grafana**:
```bash
# Set debug mode
docker compose -f docker-compose.obsv.yml stop grafana
docker compose -f docker-compose.obsv.yml run -e GF_LOG_LEVEL=debug grafana

# View logs
docker logs -f bizra-grafana-test
```

**K6**:
```bash
# Run with verbose output
k6 run --verbose k6/scenarios/api-slo.js

# Or with debug
k6 run --http-debug="full" k6/scenarios/api-slo.js
```

---

### Network Diagnostics

```bash
# Check Docker network
docker network inspect bizra-obsv

# Test connectivity between containers
docker exec bizra-prometheus-test ping -c 3 grafana
docker exec bizra-grafana-test ping -c 3 prometheus

# Check DNS resolution
docker exec bizra-prometheus-test nslookup host.docker.internal

# Trace route to BIZRA node (from Prometheus)
docker exec bizra-prometheus-test traceroute host.docker.internal
```

---

### Performance Diagnostics

```bash
# Check Prometheus performance
curl http://localhost:9090/api/v1/status/tsdb | jq

# Check Grafana performance
curl -H "Authorization: Bearer $GF_TOKEN" \
  http://localhost:3000/api/admin/stats | jq

# Check container resource usage
docker stats bizra-prometheus-test bizra-grafana-test

# Check BIZRA node performance
curl http://localhost:3006/metrics | grep process_
```

---

## 📚 Diagnostic Scripts

### Complete Health Check

```bash
#!/bin/bash
# health-check.sh

echo "=== BIZRA Observability Health Check ==="
echo ""

# Check environment
echo "Environment:"
echo "  GF_ADMIN_PASS: ${GF_ADMIN_PASS:+SET} ${GF_ADMIN_PASS:-NOT SET}"
echo "  GF_TOKEN: ${GF_TOKEN:+SET} ${GF_TOKEN:-NOT SET}"
echo ""

# Check services
echo "Services:"
docker ps --filter name=bizra- --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "  ERROR: Docker not running"
echo ""

# Check endpoints
echo "Endpoints:"
curl -sf http://localhost:3006/health && echo "  ✅ BIZRA Node: UP" || echo "  ❌ BIZRA Node: DOWN"
curl -sf http://localhost:9090/-/ready && echo "  ✅ Prometheus: UP" || echo "  ❌ Prometheus: DOWN"
curl -sf http://localhost:3000/api/health | jq -e '.database=="ok"' && echo "  ✅ Grafana: UP" || echo "  ❌ Grafana: DOWN"
echo ""

# Check Prometheus targets
echo "Prometheus Targets:"
curl -sf http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets[] | select(.job=="bizra-genesis") | "  \(.health | ascii_upcase): \(.scrapeUrl)"'
echo ""

# Check dashboards
echo "Dashboards:"
node scripts/validate-dashboards.mjs 2>&1 | grep "Spec Coverage" || echo "  ERROR: Validation failed"
echo ""

echo "=== Health Check Complete ==="
```

**Usage**:
```bash
chmod +x health-check.sh
./health-check.sh
```

---

## 🆘 Emergency Procedures

### Complete Reset

```bash
# Stop all services
make obs-down

# Remove all volumes
docker volume rm $(docker volume ls | grep bizra | awk '{print $2}')

# Clean artifacts
rm -rf artifacts/*.json

# Restart from scratch
export GF_ADMIN_PASS='new-password'
make obs-up
```

### Data Recovery

```bash
# Export Grafana dashboards
for uid in bizra-core-kpis; do
  curl -H "Authorization: Bearer $GF_TOKEN" \
    "http://localhost:3000/api/dashboards/uid/$uid" | \
    jq '.dashboard' > backup-$uid.json
done

# Export Prometheus data
docker exec bizra-prometheus-test tar czf /tmp/prometheus-data.tar.gz /prometheus
docker cp bizra-prometheus-test:/tmp/prometheus-data.tar.gz ./backup/

# Restore
docker cp ./backup/prometheus-data.tar.gz bizra-prometheus-test:/tmp/
docker exec bizra-prometheus-test tar xzf /tmp/prometheus-data.tar.gz -C /
docker restart bizra-prometheus-test
```

---

## 📚 Additional Resources

- [Prometheus Troubleshooting](https://prometheus.io/docs/prometheus/latest/troubleshooting/)
- [Grafana Troubleshooting](https://grafana.com/docs/grafana/latest/troubleshooting/)
- [K6 Troubleshooting](https://k6.io/docs/misc/troubleshooting/)
- [Docker Troubleshooting](https://docs.docker.com/config/daemon/troubleshoot/)

**Internal Docs**:
- [Quick Reference](OBSERVABILITY_QUICK_REFERENCE.md)
- [Integration Guide](OBSERVABILITY_INTEGRATION.md)
- [Full Documentation](OBSERVABILITY_TEST_COVERAGE.md)

---

## 🤝 Get Help

If you encounter an issue not covered here:

1. Check GitHub Issues: https://github.com/your-org/bizra-genesis-node/issues
2. Create new issue with `observability` label
3. Include:
   - Error message
   - Health check output (`./health-check.sh`)
   - Docker logs
   - Environment details (OS, Docker version)

---

*Built with إحسان (Excellence) • Troubleshooting Guide 🔧*

**Version**: 1.0.0
**Last Updated**: 2025-11-11
