# Genesis Node Operator Runbook

**System:** BIZRA Genesis Node (Node₀)
**Version:** δ-13
**Status:** PRODUCTION READY
**Last Updated:** 2025-11-26

---

## 1. Quick Reference Card

### Key URLs

| Resource | URL | Purpose |
|----------|-----|---------|
| API Server | `http://localhost:3000` | Main API |
| Health Check | `http://localhost:3000/health` | Liveness probe |
| Telemetry | `http://localhost:3000/telemetry` | Real-time state |
| SLO Status | `http://localhost:3000/telemetry/slo` | SLO evaluation |
| Metrics | `http://localhost:3000/metrics` | Prometheus metrics |
| Glass Cockpit | `http://localhost:5173/telemetry-playground` | Visual dashboard |
| Grafana | `http://localhost:3001` | Metrics dashboard |

### SLO Thresholds (Know These!)

| SLO | HEALTHY | WARNING | CRITICAL |
|-----|---------|---------|----------|
| IHSAN | ≥ 0.90 | 0.80-0.90 | < 0.80 |
| LATENCY | ≤ 200ms | 200-400ms | > 400ms |
| ERROR_RATE | < 1% | 1-3% | > 3% |
| CONSENSUS | STABLE/CONVERGING | RECOVERY | DEGRADED/OFFLINE |
| AGENT_CAPACITY | ≥ 10 | 5-9 | < 5 |

### Emergency Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | [Slack: #genesis-oncall] |
| Platform Team | [Slack: #platform-engineering] |
| Escalation | [PagerDuty: Genesis Critical] |

---

## 2. Normal Operations (SLO = HEALTHY)

When all SLOs are green, the system is operating normally.

### Daily Health Check

```bash
# 1. Verify API is responding
curl -s http://localhost:3000/health | jq .

# 2. Check SLO status
curl -s http://localhost:3000/telemetry/slo | jq '.overall'
# Expected: "HEALTHY"

# 3. Verify all checks healthy
curl -s http://localhost:3000/telemetry/slo | jq '.checks[] | {name, state}'
# All should show "HEALTHY"

# 4. Check telemetry values
curl -s http://localhost:3000/telemetry | jq '{ihsan: .ihsan_score, latency_ms: (.latency_us/1000), error_rate: .error_rate}'
```

### Metrics to Monitor

Keep an eye on these even when healthy:

1. **IHSAN trend** - Is it slowly declining? Investigate before it hits warning.
2. **Latency P99** - Even if P50 is good, P99 spikes can indicate problems.
3. **Error rate trend** - A slowly rising error rate often precedes issues.
4. **Agent count** - Watch for gradual agent attrition.

### Proactive Maintenance

- [ ] Check for pending model updates
- [ ] Review consensus cluster health
- [ ] Verify backup agents are available
- [ ] Check database connection pool stats

---

## 3. WARNING State Response

**When you see: SLO = WARNING (amber flight strip)**

### Immediate Actions (< 5 minutes)

1. **Identify the failing check(s)**
   ```bash
   curl -s http://localhost:3000/telemetry/slo | jq '.checks[] | select(.state != "HEALTHY")'
   ```

2. **Open Glass Cockpit** - Get visual on all metrics at once
   - Navigate to `/telemetry-playground`
   - Note which gauges are amber

3. **Check recent changes**
   ```bash
   # Recent deployments?
   kubectl get events --sort-by='.lastTimestamp' | head -20

   # Recent config changes?
   git log --oneline -10
   ```

### Per-Check Response (WARNING)

#### IHSAN WARNING (0.80-0.90)

**Likely Causes:**
- Model quality degradation
- Unusual input patterns
- Increased bias detection

**Actions:**
```bash
# Check recent PoI scores
curl -s http://localhost:3000/api/poi/recent | jq '.[].impact_score'

# Review model routing decisions
curl -s http://localhost:3000/api/routing/stats | jq .

# Check for anomalous inputs
grep "IHSAN_LOW" /var/log/genesis/api.log | tail -20
```

**If persists > 15 minutes:**
- Consider switching to conservative model routing
- Review and potentially roll back recent model config changes

#### LATENCY_MS WARNING (200-400ms)

**Likely Causes:**
- Database connection pool saturation
- External API slowdown
- Increased request volume
- Memory pressure

**Actions:**
```bash
# Check DB connection pool
curl -s http://localhost:3000/telemetry | jq '.db_pool'

# Check request rate
curl -s http://localhost:3000/metrics | grep http_requests_total

# Check system resources
top -bn1 | head -15
df -h
```

**If persists > 10 minutes:**
- Consider scaling horizontally (add instances)
- Check downstream dependencies
- Enable request coalescing if available

#### ERROR_RATE_PERCENT WARNING (1-3%)

**Likely Causes:**
- Upstream service degradation
- Bad deployment
- Rate limiting hitting
- Authentication issues

**Actions:**
```bash
# Check error breakdown
grep -E "ERROR|WARN" /var/log/genesis/api.log | tail -50

# Check recent error types
curl -s http://localhost:3000/metrics | grep http_requests_total | grep -v 200
```

**If persists > 10 minutes:**
- Check for recent deployments to roll back
- Verify all downstream services healthy
- Consider enabling circuit breaker

#### CONSENSUS WARNING (RECOVERY)

**Likely Causes:**
- Network partition resolved
- Node rejoined cluster
- Split-brain recovery

**Actions:**
```bash
# Check consensus details
curl -s http://localhost:3000/telemetry | jq '.consensus_state'

# Verify cluster membership
curl -s http://localhost:3000/api/cluster/status | jq .
```

**Note:** RECOVERY state is often transient. Allow 5-10 minutes for natural recovery.

#### AGENT_CAPACITY WARNING (5-9 agents)

**Likely Causes:**
- Agents crashed or unresponsive
- Scaling event in progress
- Resource constraints

**Actions:**
```bash
# Check agent counts by type
curl -s http://localhost:3000/telemetry | jq '.active_agents'

# List running agents
curl -s http://localhost:3000/api/agents/status | jq .
```

**If persists > 5 minutes:**
- Manually restart failed agents
- Check for resource exhaustion
- Verify agent deployment health

---

## 4. CRITICAL State Response

**When you see: SLO = CRITICAL (red flight strip, pulsing)**

### Immediate Actions (< 1 minute)

1. **Acknowledge the incident**
   - Open PagerDuty/incident channel
   - Announce in #genesis-oncall

2. **Get current state snapshot**
   ```bash
   curl -s http://localhost:3000/telemetry/slo > /tmp/slo_snapshot.json
   curl -s http://localhost:3000/telemetry > /tmp/telemetry_snapshot.json
   date >> /tmp/incident_log.txt
   cat /tmp/slo_snapshot.json >> /tmp/incident_log.txt
   ```

3. **Identify critical check(s)**
   ```bash
   cat /tmp/slo_snapshot.json | jq '.checks[] | select(.state == "CRITICAL")'
   ```

### Per-Check Response (CRITICAL)

#### IHSAN CRITICAL (< 0.80)

**This is a spiritual/ethical health emergency.**

**Immediate Actions:**
1. Enable safe-mode (autopilot may have done this)
   ```bash
   curl -X POST http://localhost:3000/api/admin/safe-mode/enable
   ```

2. Disable non-essential agents
   ```bash
   curl -X POST http://localhost:3000/api/agents/disable-non-essential
   ```

3. Review recent outputs for quality issues
   ```bash
   curl -s http://localhost:3000/api/audit/recent?limit=100 | jq '.[].quality_score'
   ```

**Root Cause Investigation:**
- Check for model misconfiguration
- Review PoI attestation failures
- Look for data poisoning attempts

**Recovery:**
- Fix root cause
- Gradually re-enable agents
- Exit safe-mode only after IHSAN > 0.90 for 10+ minutes

#### LATENCY_MS CRITICAL (> 400ms)

**System is unacceptably slow - user experience severely impacted.**

**Immediate Actions:**
1. Shed non-critical load
   ```bash
   curl -X POST http://localhost:3000/api/admin/traffic-shed/enable
   ```

2. Check for obvious bottlenecks
   ```bash
   # Database
   curl -s http://localhost:3000/telemetry | jq '.db_pool'

   # Check for blocking queries
   psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
            FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '1 second';"
   ```

3. Consider temporary concurrency reduction
   ```bash
   curl -X POST http://localhost:3000/api/admin/concurrency/reduce
   ```

**Root Cause Investigation:**
- Identify slow queries
- Check for memory leaks
- Review recent scaling events
- Check external dependency latency

**Recovery:**
- Scale up if needed
- Optimize or fix slow queries
- Re-enable full traffic gradually

#### ERROR_RATE_PERCENT CRITICAL (> 3%)

**Too many requests are failing.**

**Immediate Actions:**
1. Open circuit breaker if not already
   ```bash
   curl -X POST http://localhost:3000/api/admin/circuit-breaker/open
   ```

2. Check for cascading failures
   ```bash
   curl -s http://localhost:3000/api/dependencies/health | jq .
   ```

3. If recent deployment, ROLL BACK
   ```bash
   kubectl rollout undo deployment/genesis-api
   ```

**Root Cause Investigation:**
- Review error logs for patterns
- Check for authentication/authorization failures
- Verify database connectivity
- Check rate limiting status

**Recovery:**
- Fix or roll back the root cause
- Close circuit breaker gradually
- Monitor error rate as traffic returns

#### CONSENSUS CRITICAL (DEGRADED/OFFLINE)

**Consensus algorithm has failed - data integrity at risk.**

**Immediate Actions:**
1. PAUSE ALL WRITES
   ```bash
   curl -X POST http://localhost:3000/api/admin/writes/pause
   ```

2. Allow only reads
   ```bash
   curl -X POST http://localhost:3000/api/admin/read-only-mode/enable
   ```

3. Check cluster status
   ```bash
   curl -s http://localhost:3000/api/cluster/detailed-status | jq .
   ```

**Root Cause Investigation:**
- Network partition between nodes
- Node failure
- Split-brain condition
- Configuration mismatch

**Recovery:**
- Resolve network issues
- Restart failed nodes
- Force leader election if needed
- Resume writes only after STABLE for 5+ minutes

#### AGENT_CAPACITY CRITICAL (< 5 agents)

**Insufficient agents to handle workload.**

**Immediate Actions:**
1. Emergency scale-up
   ```bash
   kubectl scale deployment/genesis-agents --replicas=15
   ```

2. Check for common agent failure
   ```bash
   kubectl logs -l app=genesis-agent --tail=100
   ```

3. Route traffic to available agents only
   ```bash
   curl -X POST http://localhost:3000/api/routing/healthy-only/enable
   ```

**Root Cause Investigation:**
- Check for OOM kills
- Review agent crash logs
- Verify resource quotas
- Check for deployment issues

**Recovery:**
- Scale agents back up
- Fix underlying crash cause
- Verify agent health before removing restrictions

---

## 5. Autopilot & Manual Override

### Understanding Autopilot

The autopilot system (`src/autopilot/mod.rs`) monitors SLO transitions and takes automatic actions:

| Transition | Autopilot Action |
|------------|------------------|
| HEALTHY → WARNING | Logs structured warning |
| ANY → CRITICAL | Enters safe-mode |
| Recovery | No automatic action (manual exit) |

### Current Autopilot Limitations

**Autopilot is advisory, not fully autonomous:**
- It logs and sets flags
- It does NOT automatically shed traffic
- It does NOT automatically scale
- Safe-mode requires manual exit

### Manual Safe-Mode Control

```bash
# Check safe-mode status
curl -s http://localhost:3000/api/admin/safe-mode/status | jq .

# Enter safe-mode manually
curl -X POST http://localhost:3000/api/admin/safe-mode/enable

# Exit safe-mode (only after SLO HEALTHY for 10+ minutes!)
curl -X POST http://localhost:3000/api/admin/safe-mode/disable
```

### When to Override Autopilot

Override autopilot decisions when:
1. False positive (metrics incorrect but system healthy)
2. Planned maintenance causing temporary degradation
3. Testing/chaos engineering in progress

```bash
# Suppress autopilot for 30 minutes (maintenance window)
curl -X POST http://localhost:3000/api/admin/autopilot/suppress?duration=30m
```

---

## 6. Common Scenarios

### Scenario: Deployment Caused Issues

```bash
# 1. Identify the bad deployment
kubectl rollout history deployment/genesis-api

# 2. Roll back
kubectl rollout undo deployment/genesis-api

# 3. Monitor recovery
watch -n 5 'curl -s http://localhost:3000/telemetry/slo | jq .overall'
```

### Scenario: Database Issues

```bash
# 1. Check connection pool
curl -s http://localhost:3000/telemetry | jq '.db_pool'

# 2. Check for connection leaks
psql -c "SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE 'genesis%';"

# 3. Reset connection pool if needed
curl -X POST http://localhost:3000/api/admin/db-pool/reset
```

### Scenario: External Dependency Down

```bash
# 1. Check dependency health
curl -s http://localhost:3000/api/dependencies/health | jq .

# 2. Enable graceful degradation
curl -X POST http://localhost:3000/api/admin/graceful-degradation/enable

# 3. Monitor until dependency recovers
```

### Scenario: Sudden Traffic Spike

```bash
# 1. Enable rate limiting
curl -X POST http://localhost:3000/api/admin/rate-limit/strict

# 2. Scale up
kubectl scale deployment/genesis-api --replicas=5

# 3. Monitor load distribution
curl -s http://localhost:3000/metrics | grep http_requests_total
```

---

## 7. Post-Incident

After any CRITICAL incident:

### Immediate (< 1 hour after resolution)

1. **Document the timeline**
   - When did it start?
   - What was the impact?
   - What actions were taken?
   - When was it resolved?

2. **Verify full recovery**
   ```bash
   curl -s http://localhost:3000/telemetry/slo | jq .
   # All checks should be HEALTHY
   ```

3. **Check for lingering issues**
   ```bash
   # Verify no elevated error rate
   curl -s http://localhost:3000/metrics | grep error | head -10
   ```

### Within 24 Hours

1. **Write incident report**
   - Include: Timeline, Impact, Root Cause, Resolution, Action Items

2. **Schedule post-mortem**
   - Blameless retrospective
   - Focus on systemic improvements

3. **Update runbook**
   - Did this scenario exist?
   - Were the instructions helpful?
   - What can be improved?

---

## 8. Useful Commands Reference

### Health & Status

```bash
# Full health
curl -s http://localhost:3000/health | jq .

# SLO status
curl -s http://localhost:3000/telemetry/slo | jq .

# Raw telemetry
curl -s http://localhost:3000/telemetry | jq .

# Prometheus metrics
curl -s http://localhost:3000/metrics
```

### Diagnostics

```bash
# API logs (recent)
kubectl logs deployment/genesis-api --tail=100

# Agent logs
kubectl logs -l app=genesis-agent --tail=50

# Check Kubernetes events
kubectl get events --sort-by='.lastTimestamp'

# Database status
psql -c "SELECT * FROM pg_stat_database WHERE datname = 'bizra_genesis';"
```

### Administrative Actions

```bash
# Safe mode
curl -X POST http://localhost:3000/api/admin/safe-mode/enable
curl -X POST http://localhost:3000/api/admin/safe-mode/disable

# Traffic control
curl -X POST http://localhost:3000/api/admin/traffic-shed/enable
curl -X POST http://localhost:3000/api/admin/traffic-shed/disable

# Circuit breaker
curl -X POST http://localhost:3000/api/admin/circuit-breaker/open
curl -X POST http://localhost:3000/api/admin/circuit-breaker/close
```

---

## 9. Appendix

### Related Documents

- `docs/SLO_FLIGHT_RULES_GENESIS_NODE.md` - SLO specification
- `docs/CHAOS_SCENARIOS_GENESIS_NODE.md` - Chaos engineering scenarios
- `k8s/monitoring/genesis-slo-alerts.yaml` - Alert rules
- `k8s/monitoring/genesis-slo-dashboard.json` - Grafana dashboard

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-26 | Genesis Team | Initial runbook |

---

**Document Classification:** Internal - Operations
**Review Cycle:** Monthly or after significant incidents
