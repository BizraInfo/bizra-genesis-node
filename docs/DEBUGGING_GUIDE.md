# BIZRA Genesis Node - Debugging Guide

## Document Information

| **Document ID** | DEBUG-GUIDE-001 |
|----------------|------------------|
| **Version** | 1.0 |
| **Date** | November 29, 2025 |
| **Status** | Approved |
| **Classification** | Internal |

**Approval Authority**: DevOps Engineering Review Board
**Document Owner**: Principal Engineer
**Review Cycle**: Monthly

---

## Overview

This guide provides quick-start debugging procedures for common issues in the BIZRA Genesis Node system. For detailed troubleshooting procedures, see the [Debugging Playbook](DEBUGGING_PLAYBOOK.md).

## Quick Health Check

Run this first for any issue:

```bash
# Comprehensive health check
curl -s http://localhost:8080/health | jq

# Check all services
kubectl get pods -l app=bizra-genesis

# View recent errors
kubectl logs --tail=50 -l app=bizra-genesis | grep -i error
```

## Common Issues & Solutions

### 1. Consensus Not Reaching Agreement

**Symptoms**: Requests timeout, consensus failures in logs

**Quick Check**:
```bash
# Check agent health
curl -s http://localhost:8080/api/agents/health | jq '.healthy | length'

# Verify quorum (need 7+ healthy agents)
curl -s 'http://localhost:9090/api/v1/query?query=bizra_agents_active' | jq
```

**Solutions**:
- Restart failed agents: `kubectl rollout restart deployment/agent-orchestrator`
- Check network connectivity between agents
- See [Consensus Debugging](DEBUGGING_PLAYBOOK.md#4-consensus-algorithm-debugging) for details

### 2. High Latency (>100μs P95)

**Symptoms**: Slow response times, timeouts

**Quick Check**:
```bash
# Check consensus latency
curl -s 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95, rate(bizra_consensus_latency_bucket[5m]))' | jq

# Check router performance
curl -s 'http://localhost:9090/api/v1/query?query=bizra_router_latency' | jq
```

**Solutions**:
- Profile with `perf`: `perf record -g ./target/release/bizra-consensus-engine`
- Check SIMD optimizations: `cargo bench --bench json_parsing`
- See [Performance Profiling](DEBUGGING_PLAYBOOK.md#8-performance-profiling) for details

### 3. WebSocket Connection Issues

**Symptoms**: Real-time updates not working, connection drops

**Quick Check**:
```bash
# Test WebSocket connection
websocat ws://localhost:8081/ws

# Check connection count
curl -s 'http://localhost:9090/api/v1/query?query=bizra_ws_connections_active' | jq
```

**Solutions**:
- Verify CORS settings in API gateway
- Check heartbeat configuration
- See [WebSocket Debugging](DEBUGGING_PLAYBOOK.md#5-websocket-connection-issues) for details

### 4. Authentication Failures

**Symptoms**: 401/403 errors, login issues

**Quick Check**:
```bash
# Validate JWT token
echo $JWT_TOKEN | jq -R 'split(".") | .[0],.[1] | @base64d | fromjson'

# Check auth service logs
kubectl logs -l app=auth-service | grep -i "auth_fail"
```

**Solutions**:
- Verify token expiration and signature
- Check RBAC permissions
- See [Authentication Debugging](DEBUGGING_PLAYBOOK.md#7-authentication--authorization) for details

### 5. Metrics Not Appearing in Grafana

**Symptoms**: Dashboards show no data, missing metrics

**Quick Check**:
```bash
# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# Verify metrics endpoint
curl -s http://localhost:3006/metrics | grep bizra_ | head -5
```

**Solutions**:
- Restart metrics exporters
- Check Grafana data source configuration
- See [Telemetry Debugging](DEBUGGING_PLAYBOOK.md#6-telemetry--monitoring-issues) for details

### 6. Agent Coordination Failures

**Symptoms**: Tasks not being processed, agent errors

**Quick Check**:
```bash
# Check agent status
curl -s http://localhost:8080/api/agents | jq '.agents[] | select(.status != "healthy")'

# View agent logs
kubectl logs -l app=agent-orchestrator --tail=20
```

**Solutions**:
- Restart agent orchestrator
- Check inter-agent communication
- See [Agent Debugging](DEBUGGING_PLAYBOOK.md#9-agent-ecosystem-debugging) for details

## Emergency Procedures

### System Down - Immediate Actions

1. **Assess Impact**: Run health check script
2. **Isolate Issue**: Scale down failing components
3. **Check Logs**: Review error patterns
4. **Restart Services**: Controlled restart in dependency order
5. **Verify Recovery**: Full health check

### Data Recovery

1. **Check Backups**: Verify backup integrity
2. **Stop Services**: Prevent data corruption
3. **Restore Data**: Use latest clean backup
4. **Validate Integrity**: Check cryptographic proofs
5. **Resume Operations**: Gradual service restart

## Diagnostic Scripts

### System Diagnostic

```bash
#!/bin/bash
# diagnostic.sh

echo "=== BIZRA System Diagnostic ==="
echo "Timestamp: $(date)"
echo ""

# Services
echo "Service Status:"
kubectl get pods -l app=bizra-genesis --no-headers | awk '{print "  " $1 ": " $3}'

# Metrics
echo ""
echo "Key Metrics:"
curl -s 'http://localhost:9090/api/v1/query?query=up{job="bizra-genesis"}' 2>/dev/null | jq -r '.data.result[0].value[1]' || echo "  Prometheus: DOWN"

# Errors
echo ""
echo "Recent Errors:"
kubectl logs --all-containers --tail=10 -l app=bizra-genesis 2>/dev/null | grep -i error | tail -3 || echo "  No recent errors"

echo ""
echo "=== Diagnostic Complete ==="
```

### Performance Snapshot

```bash
#!/bin/bash
# perf-snapshot.sh

echo "=== Performance Snapshot ==="
echo "Timestamp: $(date)"
echo ""

# Latency metrics
echo "Latency (P95):"
curl -s 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95, rate(bizra_consensus_latency_bucket[5m]))' 2>/dev/null | jq -r '.data.result[0].value[1]' | xargs printf "  Consensus: %.2f μs\n"

# Throughput
echo ""
echo "Throughput:"
curl -s 'http://localhost:9090/api/v1/query?query=rate(bizra_requests_total[5m])' 2>/dev/null | jq -r '.data.result[0].value[1]' | xargs printf "  Requests/sec: %.1f\n"

# Resources
echo ""
echo "Resources:"
kubectl top pods -l app=bizra-genesis 2>/dev/null | tail -n +2 | while read line; do echo "  $line"; done

echo ""
echo "=== Snapshot Complete ==="
```

## Getting Help

1. **Check Documentation**: Review this guide and the [Debugging Playbook](DEBUGGING_PLAYBOOK.md)
2. **Run Diagnostics**: Use the scripts above to gather information
3. **Escalate if Needed**: Contact the on-call engineer for complex issues
4. **Document Findings**: Update incident reports with root cause analysis

## Prevention

- **Monitor Regularly**: Use the health check script in cron jobs
- **Review Logs**: Daily log review for early issue detection
- **Update Monitoring**: Add alerts for new failure patterns
- **Test Changes**: Use chaos engineering for resilience testing

---

**Document Control:**
- **Next Review**: December 29, 2025
- **Change History**: Initial release v1.0
- **Related Documents**:
  - [Debugging Playbook](DEBUGGING_PLAYBOOK.md) - Detailed procedures
  - [Observability Guide](OBSERVABILITY_QUICK_REFERENCE.md) - Monitoring setup
  - [Performance Testing](testing/PERFORMANCE_TESTING.md) - Load testing

*Built with إحسان (Excellence) • Quick Debugging Reference 🔧*