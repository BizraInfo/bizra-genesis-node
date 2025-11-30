# SLO Flight Rules - BIZRA Genesis Node

**System:** BIZRA Genesis Node (Node₀)
**Version:** β-11
**Status:** ACTIVE
**Effective Date:** 2025-11-26

---

## 1. Purpose & Scope

This document defines the **Service Level Objectives (SLOs)** for the BIZRA Genesis Node. These SLOs serve as:

1. **Flight Rules** - Machine-readable health contracts that define "good enough"
2. **Warning Lights** - Thresholds that trigger operator attention or automated responses
3. **Reliability Contracts** - Auditable guarantees for stakeholders and regulators

**Scope:** This specification applies to **Node₀ (Genesis)** only. Future cluster nodes will inherit these rules with node-specific adjustments.

---

## 2. Core Metrics

All SLOs are derived from the `GenesisTelemetry` payload:

| Metric | Type | Range | Source |
|--------|------|-------|--------|
| `ihsan_score` | float | [0.0, 1.0] | Lyapunov stability function |
| `latency_us` | integer | [0, ∞) | P50 request latency (microseconds) |
| `error_rate` | float | [0.0, 1.0] | Error ratio over window |
| `uptime_seconds` | integer | [0, ∞) | Time since last restart |
| `consensus_state` | enum | 5 states | Consensus algorithm state |
| `poi_events_last_minute` | integer | [0, ∞) | Proof-of-Impact events |
| `active_agents.PAT` | integer | [0, ∞) | Primary Agent Tasks |
| `active_agents.SAT` | integer | [0, ∞) | Secondary Agent Tasks |
| `active_agents.TAT` | integer | [0, ∞) | Tertiary Agent Tasks |

---

## 3. Service Level Objectives

### 3.1 IHSAN SLO - Spiritual/Ethical Health

The Ihsan score is the "soul" of the system - a Lyapunov-style stability function measuring ethical alignment and overall system health.

| Parameter | Value |
|-----------|-------|
| **Metric** | `ihsan_score` |
| **Target** | ≥ 0.90 |
| **Warning Threshold** | < 0.90 AND ≥ 0.80 |
| **Critical Threshold** | < 0.80 |
| **Window** | Instantaneous (future: 5-minute rolling) |

**Impact:**
- HEALTHY: System operating at peak virtue
- WARNING: Optimization attention needed
- CRITICAL: Intervention required, consider safe-mode

**Calculation:**
```
ihsan_state =
  if ihsan_score >= 0.90 → HEALTHY
  elif ihsan_score >= 0.80 → WARNING
  else → CRITICAL
```

---

### 3.2 LATENCY SLO - Responsiveness

Measures API responsiveness to ensure acceptable user experience and system throughput.

| Parameter | Value |
|-----------|-------|
| **Metric** | `latency_us / 1000` (converted to ms) |
| **Target** | ≤ 200 ms |
| **Warning Threshold** | > 200 ms AND ≤ 400 ms |
| **Critical Threshold** | > 400 ms |
| **Window** | Instantaneous (future: P50 over 5 minutes) |

**Impact:**
- HEALTHY: Acceptable responsiveness
- WARNING: Performance degradation, investigate
- CRITICAL: Unacceptable latency, scale or shed load

**Calculation:**
```
latency_ms = latency_us / 1000
latency_state =
  if latency_ms <= 200 → HEALTHY
  elif latency_ms <= 400 → WARNING
  else → CRITICAL
```

---

### 3.3 ERROR SLO - Stability

Measures system stability through error rate monitoring.

| Parameter | Value |
|-----------|-------|
| **Metric** | `error_rate * 100` (percentage) |
| **Target** | < 1% |
| **Warning Threshold** | ≥ 1% AND < 3% |
| **Critical Threshold** | ≥ 3% |
| **Window** | Instantaneous (future: 5-minute rolling) |

**Impact:**
- HEALTHY: Stable operation
- WARNING: Elevated errors, review logs
- CRITICAL: System unstable, consider circuit breaker

**Calculation:**
```
error_percent = error_rate * 100
error_state =
  if error_percent < 1.0 → HEALTHY
  elif error_percent < 3.0 → WARNING
  else → CRITICAL
```

---

### 3.4 CONSENSUS SLO - Core Correctness

Monitors the consensus algorithm state to ensure core system correctness.

| Parameter | Value |
|-----------|-------|
| **Metric** | `consensus_state` |
| **Target** | `STABLE` or `CONVERGING` |
| **Warning Threshold** | `RECOVERY` |
| **Critical Threshold** | `DEGRADED` or `OFFLINE` |
| **Window** | Instantaneous |

**Impact:**
- HEALTHY: Consensus operating normally
- WARNING: System recovering, monitor closely
- CRITICAL: Consensus broken, immediate action required

**Calculation:**
```
consensus_state_value =
  if consensus_state ∈ {STABLE, CONVERGING} → HEALTHY
  elif consensus_state == RECOVERY → WARNING
  else → CRITICAL
```

---

### 3.5 AGENT AVAILABILITY SLO - Operational Capacity

Monitors that minimum agent capacity is available for operations.

| Parameter | Value |
|-----------|-------|
| **Metric** | `active_agents.PAT + active_agents.SAT` |
| **Target** | ≥ 10 agents |
| **Warning Threshold** | < 10 AND ≥ 5 agents |
| **Critical Threshold** | < 5 agents |
| **Window** | Instantaneous |

**Impact:**
- HEALTHY: Full operational capacity
- WARNING: Reduced capacity, may affect throughput
- CRITICAL: Minimal agents, system degraded

**Calculation:**
```
total_agents = PAT + SAT
agent_state =
  if total_agents >= 10 → HEALTHY
  elif total_agents >= 5 → WARNING
  else → CRITICAL
```

---

## 4. Overall SLO State

The overall system SLO state is derived from individual SLO states:

```
overall_state =
  if ANY check is CRITICAL → CRITICAL
  elif ANY check is WARNING → WARNING
  else → HEALTHY
```

### State Definitions

| State | Symbol | Meaning | Action |
|-------|--------|---------|--------|
| **HEALTHY** | ✅ | All SLOs met | Normal operation |
| **WARNING** | ⚠️ | One or more SLOs in warning band | Operator review, prepare mitigation |
| **CRITICAL** | 🔴 | One or more SLOs breached | Immediate intervention required |

---

## 5. API Contract

### Endpoint: `GET /telemetry/slo`

Returns machine-readable SLO status.

**Response Schema:**
```typescript
interface SloStatus {
  overall: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  timestamp: string  // ISO 8601
  checks: SloCheck[]
}

interface SloCheck {
  name: string           // e.g., "IHSAN", "LATENCY_MS"
  description: string    // Human-readable description
  target: number         // Target value
  actual: number         // Current value
  state: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  unit?: string          // e.g., "ms", "%"
}
```

**Example Response:**
```json
{
  "overall": "HEALTHY",
  "timestamp": "2025-11-26T12:00:00Z",
  "checks": [
    {
      "name": "IHSAN",
      "description": "Overall ethical/spiritual system health",
      "target": 0.90,
      "actual": 0.95,
      "state": "HEALTHY"
    },
    {
      "name": "LATENCY_MS",
      "description": "Median request latency",
      "target": 200.0,
      "actual": 45.0,
      "state": "HEALTHY",
      "unit": "ms"
    },
    {
      "name": "ERROR_RATE_PERCENT",
      "description": "Error rate percentage",
      "target": 1.0,
      "actual": 0.1,
      "state": "HEALTHY",
      "unit": "%"
    },
    {
      "name": "CONSENSUS",
      "description": "Consensus algorithm state",
      "target": 1.0,
      "actual": 1.0,
      "state": "HEALTHY"
    },
    {
      "name": "AGENT_CAPACITY",
      "description": "Active agent count (PAT + SAT)",
      "target": 10.0,
      "actual": 12.0,
      "state": "HEALTHY"
    }
  ]
}
```

---

## 6. Visual Representation (Glass Cockpit)

The SLO status is displayed as a **Flight Strip** at the top of the System Telemetry Panel:

### HEALTHY State
```
┌────────────────────────────────────────────────────────────────┐
│  ✅ SLO: HEALTHY                    All objectives met         │
└────────────────────────────────────────────────────────────────┘
```
- Background: Green (#10B981)
- Text: White

### WARNING State
```
┌────────────────────────────────────────────────────────────────┐
│  ⚠️ SLO: WARNING                    Check: LATENCY, IHSAN      │
└────────────────────────────────────────────────────────────────┘
```
- Background: Amber (#F59E0B)
- Text: Black

### CRITICAL State
```
┌────────────────────────────────────────────────────────────────┐
│  🔴 SLO: CRITICAL                   Immediate action required  │
└────────────────────────────────────────────────────────────────┘
```
- Background: Red (#EF4444)
- Text: White
- Animation: Gentle pulse

---

## 7. SLO → Metrics → Alerts Mapping

This section documents the observability pipeline from SLO evaluation to Prometheus metrics to alert rules.

### 7.1 Prometheus Metrics

The SLO evaluator exposes the following metrics (defined in `src/api/metrics.rs`):

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `genesis_slo_overall_state` | Gauge | - | Overall SLO state (0=healthy, 1=warning, 2=critical) |
| `genesis_slo_check_state` | GaugeVec | `check` | Individual SLO check state |
| `genesis_slo_check_actual` | GaugeVec | `check` | Current actual value for each SLO check |
| `genesis_slo_violation_total` | CounterVec | `check`, `severity` | Total count of SLO violations |
| `genesis_slo_transition_total` | CounterVec | `from_state`, `to_state` | State transition counts |

**Check Labels:**
- `ihsan` - IHSAN spiritual/ethical health
- `latency_ms` - Request latency
- `error_rate_percent` - Error rate
- `consensus` - Consensus algorithm state
- `agent_capacity` - Active agent count

### 7.2 Alert Rules File

Alert rules are defined in: `k8s/monitoring/genesis-slo-alerts.yaml`

**Alert Groups:**

| Group | Alerts | Purpose |
|-------|--------|---------|
| `genesis-slo-overall` | `GenesisSloCritical`, `GenesisSloWarning` | Overall system health |
| `genesis-slo-individual` | Per-check critical/warning alerts | Individual SLO violations |
| `genesis-slo-transitions` | `GenesisSloTransitionToCritical`, `GenesisSloUnstable` | State change detection |
| `genesis-slo-violations` | `GenesisSloHighViolationRate` | Violation rate tracking |

### 7.3 SLO State → Metric Value Mapping

| SLO State | Metric Value | Prometheus Query |
|-----------|--------------|------------------|
| HEALTHY | 0 | `genesis_slo_overall_state == 0` |
| WARNING | 1 | `genesis_slo_overall_state == 1` |
| CRITICAL | 2 | `genesis_slo_overall_state == 2` |

### 7.4 Alert Severity Mapping

| SLO Transition | Alert Severity | Firing Duration |
|----------------|----------------|-----------------|
| ANY → CRITICAL | `critical` | 1 minute |
| ANY → WARNING | `warning` | 5 minutes |
| State instability | `warning` | 15 minutes |
| High violation rate | `warning` | 10 minutes |

### 7.5 Integration Points

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ GenesisTelemetry│───▶│  evaluate_slo()  │───▶│ SloStatus       │
│ (src/api/       │    │  (telemetry.rs)  │    │                 │
│  telemetry.rs)  │    └──────────────────┘    └────────┬────────┘
└─────────────────┘                                     │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Prometheus      │◀───│ record_slo_      │◀───│ MetricsCollector│
│ /metrics        │    │ metrics()        │    │ (metrics.rs)    │
└────────┬────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Alertmanager    │◀───│ PrometheusRule   │◀───│ genesis-slo-    │
│                 │    │ (k8s CRD)        │    │ alerts.yaml     │
└────────┬────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐
│ Autopilot       │◀───│ decide_autopilot │
│ (autopilot/     │    │ _action()        │
│  mod.rs)        │    └──────────────────┘
└─────────────────┘
```

---

## 8. Autopilot Hooks

The autopilot system (`src/autopilot/mod.rs`) monitors SLO state transitions and triggers automated responses.

### 8.1 Autopilot Actions

| Action | Description | When Triggered |
|--------|-------------|----------------|
| `None` | No action required | Same state, or recovery |
| `LogWarning` | Log structured warning | HEALTHY → WARNING |
| `EnterSafeMode` | Activate safe-mode protections | ANY → CRITICAL |
| `ThrottleNonCritical` | Shed optional workloads | Load-based triggers |
| `OpenCircuitBreaker` | Stop accepting new requests | Sustained critical state |

### 8.2 State Transition Matrix

| From State | To State | Autopilot Action | Implementation |
|------------|----------|------------------|----------------|
| HEALTHY | HEALTHY | `None` | ✅ Implemented |
| HEALTHY | WARNING | `LogWarning` | ✅ Implemented |
| HEALTHY | CRITICAL | `EnterSafeMode` | ✅ Implemented |
| WARNING | HEALTHY | `None` (recovery) | ✅ Implemented |
| WARNING | WARNING | `None` | ✅ Implemented |
| WARNING | CRITICAL | `EnterSafeMode` | ✅ Implemented |
| CRITICAL | HEALTHY | `None` (recovery) | ✅ Implemented |
| CRITICAL | WARNING | `None` (recovery) | ✅ Implemented |
| CRITICAL | CRITICAL | `None` | ✅ Implemented |

### 8.3 Safe-Mode Behavior

When safe-mode is activated:
- Structured error log emitted with failing checks
- `safe_mode_active` flag set to true
- Manual exit required via `exit_safe_mode()` after recovery

**Future enhancements** (TODO in code):
- Reduce concurrency limits
- Disable non-essential background tasks
- Increase timeout margins
- Switch to conservative model routing

### 8.4 Usage Example

```rust
use bizra_genesis_node::{Autopilot, api::telemetry::{evaluate_slo, GenesisTelemetry}};

let autopilot = Autopilot::new();

// On each telemetry tick:
let telemetry = get_current_telemetry();
let slo_status = evaluate_slo(&telemetry);
let action = autopilot.process(&slo_status);

// Check safe-mode status:
if autopilot.is_safe_mode_active() {
    // Apply safe-mode restrictions
}

// After manual intervention:
autopilot.exit_safe_mode();
```

---

## 9. Monitoring & Alerting

### Prometheus Metrics

The SLO evaluator exposes metrics for Prometheus scraping:

```
# HELP genesis_slo_state Current SLO state (0=healthy, 1=warning, 2=critical)
# TYPE genesis_slo_state gauge
genesis_slo_state{check="overall"} 0
genesis_slo_state{check="ihsan"} 0
genesis_slo_state{check="latency"} 0
genesis_slo_state{check="error_rate"} 0
genesis_slo_state{check="consensus"} 0
genesis_slo_state{check="agent_capacity"} 0

# HELP genesis_slo_actual Current actual value for each SLO
# TYPE genesis_slo_actual gauge
genesis_slo_actual{check="ihsan"} 0.95
genesis_slo_actual{check="latency_ms"} 45.0
genesis_slo_actual{check="error_rate_percent"} 0.1
genesis_slo_actual{check="agent_capacity"} 12
```

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-26 | Genesis Team | Initial specification |
| 1.1 | 2025-11-26 | Genesis Team | γ-12: Added Prometheus metrics, alerts, autopilot hooks |

---

## 11. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering | | | |
| Operations | | | |
| Compliance | | | |

---

**Document Classification:** Internal - Technical Specification
**Review Cycle:** Quarterly or upon significant system changes
