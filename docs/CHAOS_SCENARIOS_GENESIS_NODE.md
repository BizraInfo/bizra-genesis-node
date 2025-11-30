# Chaos Scenarios - BIZRA Genesis Node

**System:** BIZRA Genesis Node (Node₀)
**Version:** δ-13
**Status:** RELIABILITY READINESS
**Effective Date:** 2025-11-26

---

## 1. Purpose

This document defines **chaos engineering scenarios** for validating that Genesis Node's SLO system, Prometheus metrics, alert rules, and autopilot hooks behave correctly under failure conditions.

Each scenario:
- Describes the failure stimulus
- States expected SLO state transitions
- Lists expected metric changes
- Identifies alerts that should fire
- Documents the autopilot action that should trigger

**Goal:** Prove the observability and reliability stack works as designed.

---

## 2. Test Environment Setup

### Prerequisites

```bash
# Ensure all services are running
cargo run --bin api_server --release &
cd apps/dashboard && npm run dev &

# Verify baseline health
curl http://localhost:3000/health
curl http://localhost:3000/telemetry/slo

# Open Glass Cockpit
# Navigate to http://localhost:5173/telemetry-playground
```

### Baseline State

Before each scenario, verify:
- `/telemetry/slo` returns `overall: "HEALTHY"`
- All 5 SLO checks are `HEALTHY`
- `genesis_slo_overall_state` metric = 0
- No alerts firing

---

## 3. Scenario Matrix

| ID | Scenario | SLO Impact | Primary Check | Expected Autopilot |
|----|----------|------------|---------------|-------------------|
| CS-01 | API Server Down | CRITICAL | All | EnterSafeMode |
| CS-02 | Node Bridge Down | CRITICAL | All (UI only) | None (backend unaware) |
| CS-03 | High Latency | WARNING → CRITICAL | LATENCY_MS | LogWarning → EnterSafeMode |
| CS-04 | Elevated Error Rate | WARNING → CRITICAL | ERROR_RATE_PERCENT | LogWarning → EnterSafeMode |
| CS-05 | Consensus Degraded | CRITICAL | CONSENSUS | EnterSafeMode |
| CS-06 | Ihsan Score Drop | WARNING → CRITICAL | IHSAN | LogWarning → EnterSafeMode |
| CS-07 | Agent Capacity Drop | WARNING → CRITICAL | AGENT_CAPACITY | LogWarning → EnterSafeMode |
| CS-08 | Database Connection Loss | CRITICAL | Multiple | EnterSafeMode |

---

## 4. Detailed Scenarios

### CS-01: API Server Down

**Description:** Rust API server process terminates unexpectedly.

**Stimulus:**
```bash
# Find and kill the API server process
pkill -f "api_server"
# OR on Windows:
taskkill /F /IM api_server.exe
```

**Expected Behavior:**

| Aspect | Expected |
|--------|----------|
| SLO State | N/A (no telemetry available) |
| Metrics | No new data points |
| Alerts | `GenesisSloCritical` after 1m (stale data) |
| Autopilot | Cannot execute (server down) |
| Glass Cockpit | Shows "OFFLINE - No telemetry data" |

**Verification Steps:**
1. [ ] Glass Cockpit SLO strip shows disconnected state
2. [ ] `/telemetry` endpoint returns connection refused
3. [ ] Prometheus sees stale metrics (no updates)
4. [ ] After restart, SLO returns to HEALTHY

**Recovery:**
```bash
cargo run --bin api_server --release
```

**Evidence:**
```
[Screenshot: Glass Cockpit showing OFFLINE state]
[Log excerpt: Connection refused errors]
```

---

### CS-02: Node Bridge Down

**Description:** WebSocket bridge between Rust API and React UI disconnects.

**Stimulus:**
```bash
# Kill the Node WebSocket bridge
pkill -f "websocket.js"
# OR manually close WebSocket connection from browser DevTools
```

**Expected Behavior:**

| Aspect | Expected |
|--------|----------|
| SLO State | Backend: still HEALTHY |
| Metrics | Still updating normally |
| Alerts | None (backend unaffected) |
| Autopilot | None (no state change) |
| Glass Cockpit | Shows "Connecting..." then "Disconnected" |

**Verification Steps:**
1. [ ] Backend `/telemetry/slo` still returns HEALTHY
2. [ ] Glass Cockpit shows connection error
3. [ ] Metrics continue updating in Prometheus
4. [ ] UI reconnects automatically when bridge restarts

**Recovery:**
```bash
node backend/websocket.js
# OR: Dashboard auto-reconnects when backend available
```

**Evidence:**
```
[Screenshot: Glass Cockpit showing connection error]
[Screenshot: Backend health still OK via curl]
```

---

### CS-03: High Latency

**Description:** System latency exceeds SLO thresholds (200ms → 400ms).

**Stimulus:**
```bash
# Option 1: Inject artificial delay via environment variable
INJECT_LATENCY_MS=250 cargo run --bin api_server

# Option 2: Use traffic shaping
tc qdisc add dev eth0 root netem delay 300ms

# Option 3: Modify telemetry collector to return high latency
# (test mode only - see TelemetryCollector::with_test_values)
```

**Expected Behavior:**

| Stage | Latency | SLO State | Check State | Autopilot |
|-------|---------|-----------|-------------|-----------|
| Baseline | < 200ms | HEALTHY | HEALTHY | None |
| Stage 1 | 200-400ms | WARNING | WARNING | LogWarning |
| Stage 2 | > 400ms | CRITICAL | CRITICAL | EnterSafeMode |

**Metrics Changes:**
```
genesis_slo_overall_state: 0 → 1 → 2
genesis_slo_check_state{check="LATENCY_MS"}: 0 → 1 → 2
genesis_slo_check_actual{check="LATENCY_MS"}: 45 → 250 → 450
genesis_slo_violation_total{check="LATENCY_MS",state="WARNING"}: +1
genesis_slo_violation_total{check="LATENCY_MS",state="CRITICAL"}: +1
genesis_slo_transition_total{from_state="HEALTHY",to_state="WARNING"}: +1
genesis_slo_transition_total{from_state="WARNING",to_state="CRITICAL"}: +1
```

**Alerts Expected:**
- `GenesisSloWarning` after 5m at WARNING
- `GenesisSloCritical` after 1m at CRITICAL
- `GenesisSloLatencyCritical` after 1m

**Verification Steps:**
1. [ ] `/telemetry/slo` shows LATENCY_MS in WARNING/CRITICAL
2. [ ] Glass Cockpit flight strip turns amber/red
3. [ ] Prometheus metrics update correctly
4. [ ] Autopilot log shows state transition messages

**Recovery:**
```bash
# Remove latency injection
unset INJECT_LATENCY_MS
# OR remove traffic shaping
tc qdisc del dev eth0 root
```

**Evidence:**
```
[Screenshot: SLO flight strip in WARNING state]
[Prometheus graph: latency metric crossing threshold]
[Log: SLO entered WARNING state - operator review recommended]
```

---

### CS-04: Elevated Error Rate

**Description:** Error rate exceeds SLO thresholds (1% → 3%).

**Stimulus:**
```bash
# Option 1: Send failing requests to increase error rate
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/invalid-endpoint
done

# Option 2: Inject error rate via test mode
ERROR_RATE_INJECT=0.025 cargo run --bin api_server

# Option 3: Introduce a bug in a handler (test env only)
```

**Expected Behavior:**

| Stage | Error Rate | SLO State | Check State | Autopilot |
|-------|------------|-----------|-------------|-----------|
| Baseline | < 1% | HEALTHY | HEALTHY | None |
| Stage 1 | 1-3% | WARNING | WARNING | LogWarning |
| Stage 2 | > 3% | CRITICAL | CRITICAL | EnterSafeMode |

**Metrics Changes:**
```
genesis_slo_check_state{check="ERROR_RATE_PERCENT"}: 0 → 1 → 2
genesis_slo_check_actual{check="ERROR_RATE_PERCENT"}: 0.1 → 2.0 → 4.0
genesis_slo_violation_total{check="ERROR_RATE_PERCENT",state="CRITICAL"}: +N
```

**Alerts Expected:**
- `GenesisSloWarning` at WARNING
- `GenesisSloCritical` at CRITICAL
- `GenesisSloErrorRateCritical` after 1m

**Verification Steps:**
1. [ ] `/telemetry/slo` shows ERROR_RATE_PERCENT degraded
2. [ ] Flight strip detail panel shows error check failing
3. [ ] Circuit breaker consideration logged

**Recovery:**
```bash
# Stop sending bad requests
# Error rate will naturally recover as window slides
```

---

### CS-05: Consensus Degraded

**Description:** Consensus algorithm enters DEGRADED or OFFLINE state.

**Stimulus:**
```bash
# Option 1: Force consensus state via test endpoint
curl -X POST http://localhost:3000/test/consensus/set-state \
  -H "Content-Type: application/json" \
  -d '{"state": "DEGRADED"}'

# Option 2: Simulate by disconnecting from other nodes (cluster scenario)
# Option 3: Inject via environment
CONSENSUS_STATE_INJECT=DEGRADED cargo run --bin api_server
```

**Expected Behavior:**

| Consensus State | SLO State | Check State | Autopilot |
|-----------------|-----------|-------------|-----------|
| STABLE | HEALTHY | HEALTHY | None |
| CONVERGING | HEALTHY | HEALTHY | None |
| RECOVERY | WARNING | WARNING | LogWarning |
| DEGRADED | CRITICAL | CRITICAL | EnterSafeMode |
| OFFLINE | CRITICAL | CRITICAL | EnterSafeMode |

**Metrics Changes:**
```
genesis_slo_check_state{check="CONSENSUS"}: 0 → 2
genesis_slo_check_actual{check="CONSENSUS"}: 1.0 → 0.0
genesis_slo_violation_total{check="CONSENSUS",state="CRITICAL"}: +1
```

**Alerts Expected:**
- `GenesisSloCritical` immediate
- `GenesisSloConsensusCritical` after 1m

**Critical Actions:**
- Pause writes/PoI events
- Only allow reads until consensus recovers
- Investigate cluster connectivity

**Recovery:**
```bash
# Restore consensus (depends on failure mode)
curl -X POST http://localhost:3000/test/consensus/set-state \
  -d '{"state": "STABLE"}'
```

---

### CS-06: Ihsan Score Drop

**Description:** Ihsan (spiritual/ethical health) score drops below thresholds.

**Stimulus:**
```bash
# Option 1: Inject low ihsan score
IHSAN_INJECT=0.75 cargo run --bin api_server

# Option 2: Generate low-quality outputs that fail Ihsan gates
# Option 3: Test mode override
```

**Expected Behavior:**

| Ihsan Score | SLO State | Check State | Autopilot |
|-------------|-----------|-------------|-----------|
| ≥ 0.90 | HEALTHY | HEALTHY | None |
| 0.80-0.90 | WARNING | WARNING | LogWarning |
| < 0.80 | CRITICAL | CRITICAL | EnterSafeMode |

**Metrics Changes:**
```
genesis_slo_check_state{check="IHSAN"}: 0 → 1 → 2
genesis_slo_check_actual{check="IHSAN"}: 0.95 → 0.85 → 0.75
genesis_slo_violation_total{check="IHSAN",state="CRITICAL"}: +1
```

**Alerts Expected:**
- `GenesisSloWarning` at WARNING
- `GenesisSloCritical` at CRITICAL
- `GenesisSloIhsanCritical` after 1m

**Critical Actions:**
- Review recent PoI events
- Check model routing decisions
- Consider disabling non-essential agents

**Recovery:**
```bash
# Investigate and fix root cause
# Ihsan should naturally recover as system stabilizes
```

---

### CS-07: Agent Capacity Drop

**Description:** Active agent count drops below minimum thresholds.

**Stimulus:**
```bash
# Option 1: Manually stop agents
# Option 2: Inject low agent count
AGENT_PAT_COUNT=3 AGENT_SAT_COUNT=1 cargo run --bin api_server

# Option 3: Simulate agent crashes
```

**Expected Behavior:**

| Total Agents | SLO State | Check State | Autopilot |
|--------------|-----------|-------------|-----------|
| ≥ 10 | HEALTHY | HEALTHY | None |
| 5-9 | WARNING | WARNING | LogWarning |
| < 5 | CRITICAL | CRITICAL | EnterSafeMode |

**Metrics Changes:**
```
genesis_slo_check_state{check="AGENT_CAPACITY"}: 0 → 1 → 2
genesis_slo_check_actual{check="AGENT_CAPACITY"}: 12 → 7 → 4
```

**Alerts Expected:**
- `GenesisSloWarning` at reduced capacity
- `GenesisSloAgentCapacityCritical` when critical

**Recovery:**
```bash
# Restart agents
# Scale up agent deployment
```

---

### CS-08: Database Connection Loss

**Description:** PostgreSQL database becomes unavailable.

**Stimulus:**
```bash
# Option 1: Stop database container
docker stop bizra-postgres

# Option 2: Block database port
iptables -A INPUT -p tcp --dport 5432 -j DROP

# Option 3: Corrupt connection string
DATABASE_URL=postgres://invalid cargo run --bin api_server
```

**Expected Behavior:**

| Aspect | Expected |
|--------|----------|
| SLO State | CRITICAL (multiple checks may fail) |
| Health Endpoint | 503 Service Unavailable |
| Metrics | May stop updating if metrics depend on DB |
| Autopilot | EnterSafeMode |

**Alerts Expected:**
- `GenesisSloCritical`
- Database-specific alerts (if configured)

**Recovery:**
```bash
docker start bizra-postgres
# OR: Restore network connectivity
iptables -D INPUT -p tcp --dport 5432 -j DROP
```

---

## 5. Composite Scenarios

### CS-MULTI-01: Cascading Failure

**Description:** High latency triggers errors, which affects consensus.

**Sequence:**
1. Inject 300ms latency → LATENCY_MS WARNING
2. Latency causes timeouts → ERROR_RATE_PERCENT WARNING
3. Errors affect consensus → CONSENSUS DEGRADED

**Expected:** Single CRITICAL state with multiple failing checks.

### CS-MULTI-02: Recovery Under Load

**Description:** System recovers from CRITICAL while under sustained load.

**Sequence:**
1. Force CRITICAL state
2. Apply moderate load
3. Remove failure stimulus
4. Verify recovery to HEALTHY

**Expected:** Smooth transition through WARNING back to HEALTHY.

---

## 6. Evidence Collection Template

For each executed scenario, collect:

### Scenario: [ID]

**Executed:** [Date/Time]
**Operator:** [Name]

**Pre-Conditions:**
```json
{
  "slo_state": "HEALTHY",
  "all_checks_healthy": true,
  "metrics_baseline": { ... }
}
```

**Stimulus Applied:**
```bash
[Command executed]
```

**Observed Behavior:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| SLO State | [X] | [Y] | ✅/❌ |
| Check States | [...] | [...] | ✅/❌ |
| Metrics | [...] | [...] | ✅/❌ |
| Alerts | [...] | [...] | ✅/❌ |
| Autopilot | [X] | [Y] | ✅/❌ |

**Screenshots:**
- [ ] Glass Cockpit state
- [ ] Prometheus metrics
- [ ] Log excerpts

**Recovery:**
```bash
[Recovery command]
```

**Post-Recovery State:**
```json
{
  "slo_state": "HEALTHY",
  "recovery_time_seconds": N
}
```

**Notes:**
[Any observations, surprises, or issues]

---

## 7. Scenario Execution Checklist

Before running chaos scenarios in any environment:

- [ ] Notify relevant stakeholders
- [ ] Ensure rollback procedures are ready
- [ ] Confirm monitoring dashboards are accessible
- [ ] Have recovery commands prepared
- [ ] Set time limit for each scenario
- [ ] Document everything

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-26 | Genesis Team | Initial chaos scenarios |

---

**Document Classification:** Internal - Reliability Engineering
**Review Cycle:** After each major system change or quarterly
