# α-10 Glass Cockpit Validation Sprint

**System:** BIZRA Genesis Node
**Scope:** Telemetry pipeline from Rust kernel → Node bridge → React dashboard
**Status:** Phase 3 – Validation & Hardening
**Date:** 2025-11-26

---

## 1. Purpose

The goal of the α-10 Glass Cockpit Validation Sprint is to prove that the
Genesis Node telemetry system is:

- **Accurate** – UI reflects the true internal state of Node₀.
- **Resilient** – Survives partial failures without lying or crashing.
- **Performant** – Delivers real-time feedback without degrading UX.
- **Operator-friendly** – Clear enough to be used as a primary operational console.

This sprint does not introduce new features; it *tests and hardens* what was
implemented in Phase 2.

---

## 2. Test Environment

- **Rust API server**
  - Binary: `api_server`
  - Port: `3000`
- **Node WebSocket bridge**
  - File: `backend/server.js`
  - HTTP poll → `/telemetry` (port 3000)
  - WebSocket broadcast: `ws://localhost:8080`
- **React dashboard**
  - App: `apps/dashboard`
  - Dev server: `http://localhost:5173`
  - Validation route: `/telemetry-playground`

Bringup runbook:

```bash
# Terminal 1 – Rust API
cargo run --bin api_server --release

# Terminal 2 – Node bridge
cd backend
node server.js

# Terminal 3 – Dashboard
cd apps/dashboard
npm run dev

# Access validation UI:
# http://localhost:5173/telemetry-playground
```

---

## 3. Test Cases

### 3.1 Baseline Correctness

**Objective:** Verify that the dashboard matches the raw telemetry JSON.

* Hit `GET http://localhost:3000/telemetry` and capture a sample.
* Compare the following fields against the Glass Cockpit:

  * `ihsan_score` → IhsanMeter percentage and color
  * `latency_us` → latency metric (converted to ms)
  * `uptime_seconds` → uptime display
  * `consensus_state` → consensus/status pill
  * `active_agents` → PAT/SAT/TAT counts
* Confirm that values match within expected time skew (≤ 2 seconds).

**Pass criteria:** All displayed values correspond 1:1 with backend JSON.

**Ihsan Color Thresholds:**
| Score Range | State | Color |
|-------------|-------|-------|
| ≥ 0.95 | Excellence | Gold (#FFD700) |
| ≥ 0.85 | Stable | Teal (#14B8A6) |
| ≥ 0.70 | Attention | Amber (#F59E0B) |
| < 0.70 | Degraded | Red (#EF4444) |

---

### 3.2 Failure Modes – API and Bridge

**Objective:** Ensure graceful degradation when components fail.

1. **Rust API down**

   * Stop `api_server`.
   * Observe:

     * Bridge circuit breaker transitions to OPEN.
     * WebSocket closes; client status becomes `disconnected`/`error`.
     * UI shows offline state without crashing.

2. **Bridge down**

   * Restart `api_server`.
   * Stop `backend/server.js`.
   * Observe:

     * WebSocket disconnect is detected.
     * Cockpit stops updating and shows a clear "no data" state.

3. **Recovery**

   * Restart bridge.
   * Confirm that the dashboard auto-reconnects and resumes updates.

**Pass criteria:** No unhandled exceptions, no false "healthy" display when the stack is broken.

---

### 3.3 Performance Under Load

**Objective:** Validate rendering and resource usage under higher update rates.

* Temporarily configure the bridge to poll `/telemetry` at ~200–300ms.
* Use browser devtools to profile:

  * FPS / responsiveness
  * React render frequency
  * Memory usage over a 1–2 minute window

**Pass criteria:**

* No UI freezes or severe jank.
* Only telemetry-related components re-render on updates.
* No unbounded memory growth.

If necessary, poll interval can be returned to 1000ms and/or sampling added on the client side.

---

### 3.4 Metric Dynamics

**Objective:** Confirm that the cockpit reacts correctly to changing system conditions.

* Generate scenarios (as available in the current build) that:

  * Increase latency and/or error rate.
  * Change agent counts.
  * Affect consensus state or PoI events.
* Observe the trajectory of:

  * Ihsan score and color state.
  * Latency and error cards.
  * Consensus status and PoI badge.

**Pass criteria:** Metrics move in the expected direction and the Ihsan state
remains an intuitive summary of overall health.

---

### 3.5 Operator Experience

**Objective:** Assess usability for real-time operation.

Checklist:

* [ ] Connection status is clearly displayed at all times.
* [ ] Error / offline states are explicit but not overwhelming.
* [ ] Raw telemetry JSON is easily discoverable for debugging.
* [ ] No noisy console logs during normal operation or expected failures.

**Pass criteria:** An operator can understand "Is Node₀ healthy?" within
a few seconds of looking at the cockpit.

---

## 4. Acceptance Criteria

The α-10 Glass Cockpit Validation Sprint is considered **complete** when:

1. All test cases in Section 3 have been exercised and documented.
2. No crashes or misleading UI states are observed under tested scenarios.
3. Performance remains acceptable at the target update interval (1s).
4. Any identified UX or logging issues have been triaged and either fixed
   or recorded in the backlog.

Once these conditions are met, the Glass Cockpit is approved as the
primary real-time observability interface for the BIZRA Genesis Node.

---

## 5. Test Execution Log

### 5.1 Baseline Correctness (Section 3.1)

**Date:** ___________
**Tester:** ___________

| Field | API Value | UI Value | Match? |
|-------|-----------|----------|--------|
| ihsan_score | | | |
| latency_us | | | |
| uptime_seconds | | | |
| consensus_state | | | |
| active_agents.PAT | | | |
| active_agents.SAT | | | |
| active_agents.TAT | | | |

**Notes:**

---

### 5.2 Failure Modes (Section 3.2)

**Date:** ___________

| Scenario | Expected Behavior | Observed Behavior | Pass? |
|----------|-------------------|-------------------|-------|
| API down | Status → disconnected/error, no crash | | |
| Bridge down | WebSocket closes, "no data" state | | |
| Recovery | Auto-reconnect, data resumes | | |

**Notes:**

---

### 5.3 Performance (Section 3.3)

**Date:** ___________

| Metric | Value |
|--------|-------|
| Poll interval tested | ms |
| FPS during test | |
| Memory growth | |
| Jank observed? | Yes / No |

**Notes:**

---

### 5.4 Metric Dynamics (Section 3.4)

**Date:** ___________

| Scenario | Ihsan Response | Other Metrics | Correct? |
|----------|----------------|---------------|----------|
| | | | |

**Notes:**

---

### 5.5 Operator Experience (Section 3.5)

**Date:** ___________

- [ ] Connection status always visible
- [ ] Error states clear but not alarming
- [ ] Raw JSON accessible
- [ ] Console clean

**Notes:**

---

## 6. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Operations | | | |

---

## Appendix A: Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Dashboard (5173)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  TelemetryPlayground                       │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              TelemetryProvider                       │  │  │
│  │  │  ┌─────────────┐  ┌─────────────────────────────┐   │  │  │
│  │  │  │ IhsanMeter  │  │   SystemTelemetryPanel      │   │  │  │
│  │  │  │  (Ring)     │  │   (Full Cockpit)            │   │  │  │
│  │  │  └─────────────┘  └─────────────────────────────┘   │  │  │
│  │  │                useTelemetryStream()                  │  │  │
│  │  │                     ↓ WebSocket                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ ws://localhost:8080
┌─────────────────────────────────────────────────────────────────┐
│                  Node WebSocket Bridge (8080)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  TelemetryBridge                                           │  │
│  │  - HTTP poll every 1000ms                                  │  │
│  │  - Circuit breaker (5 failures → OPEN)                     │  │
│  │  - Broadcast to all WS clients                             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ GET /telemetry
┌─────────────────────────────────────────────────────────────────┐
│                    Rust API Server (3000)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /telemetry endpoint                                       │  │
│  │  Returns: GenesisTelemetry JSON                            │  │
│  │  - ihsan_score, latency_us, uptime_seconds                 │  │
│  │  - consensus_state, epoch                                  │  │
│  │  - active_agents (PAT/SAT/TAT)                             │  │
│  │  - model_health, db_pool_status                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Appendix B: Telemetry Schema

```typescript
interface GenesisTelemetry {
  timestamp: string           // ISO 8601
  node_id: string             // e.g., "genesis-node-0"
  latency_us: number          // API response latency in microseconds
  ihsan_score: number         // 0.0 - 1.0 quality score
  consensus_state: ConsensusState
  epoch: number
  active_agents: {
    PAT: number               // Primary Agent Tasks
    SAT: number               // Secondary Agent Tasks
    TAT: number               // Tertiary Agent Tasks
  }
  poi_events_last_minute: number
  error_rate: number          // 0.0 - 1.0
  uptime_seconds: number
  model_health: {
    primary_available: boolean
    fallback_available: boolean
    active_model: string
    circuit_breaker_state: CircuitBreakerState
  }
  db_pool_status: {
    active: number
    idle: number
    max_size: number
    healthy: boolean
  }
}

type ConsensusState = 'STABLE' | 'CONVERGING' | 'DEGRADED' | 'RECOVERY' | 'OFFLINE'
type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'
```
