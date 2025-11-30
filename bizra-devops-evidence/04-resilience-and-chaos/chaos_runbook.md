# BIZRA Chaos Engineering Runbook

> Evidence for: RES-002

## Overview

This runbook provides operational procedures for conducting chaos experiments on BIZRA Genesis Node infrastructure. All experiments must follow these guidelines to ensure safety and learning.

## Pre-Experiment Checklist

Before running any chaos experiment:

- [ ] Verify experiment is scheduled or has approval
- [ ] Confirm blast radius controls are active
- [ ] Ensure monitoring dashboards are accessible
- [ ] Verify rollback procedures are ready
- [ ] Notify on-call engineer
- [ ] Check current error budget status
- [ ] Confirm not during change freeze

## Blast Radius Controls

### Maximum Impact Limits

| Metric | Production Limit | Staging Limit |
|--------|------------------|---------------|
| Affected pods | 50% | 100% |
| Affected nodes | 2 | All |
| Duration | 15 minutes | 60 minutes |
| Error rate trigger | 50% | 80% |

### Protected Resources

Never target these resources:
- `kube-system` namespace
- `monitoring` namespace
- Pods with label `critical: true`
- Database primary nodes
- Certificate infrastructure

### Abort Conditions

Experiment automatically aborts if:
- Error rate exceeds 50%
- P99 latency exceeds 5000ms
- Availability drops below 95%
- On-call engineer triggers abort
- Monitoring system becomes unavailable

## Experiment Procedures

### Standard Chaos Experiment

#### 1. Preparation (T-30 min)

```bash
# Verify chaos mesh is healthy
kubectl get pods -n chaos-testing

# Check current system health
curl -s https://bizra.ai/health | jq

# Verify monitoring
curl -s http://prometheus:9090/-/healthy

# Announce in incident channel
/incident-bot announce "Chaos experiment starting in 30 minutes: [EXPERIMENT_NAME]"
```

#### 2. Baseline Capture (T-10 min)

```bash
# Capture baseline metrics
./scripts/capture-baseline.sh

# Expected output:
# - Current error rate
# - P95/P99 latency
# - Request rate
# - Pod count
# - Node health
```

#### 3. Experiment Execution (T-0)

```bash
# Apply chaos experiment
kubectl apply -f chaos-experiments/[experiment].yaml

# Monitor in real-time
watch -n 5 'kubectl get pods -l app=bizra-api'

# Or use the chaos dashboard
open https://chaos-dashboard.bizra.ai
```

#### 4. Observation (Duration)

Monitor these dashboards:
- Grafana: `https://grafana.bizra.ai/d/chaos-experiment`
- Chaos Dashboard: `https://chaos-dashboard.bizra.ai`
- Error Budget: `https://slo.bizra.ai`

Record observations:
- [ ] System behavior matches expected?
- [ ] Recovery mechanisms activated?
- [ ] User impact within limits?
- [ ] Any unexpected behaviors?

#### 5. Cleanup (T+Duration)

```bash
# Remove chaos experiment
kubectl delete -f chaos-experiments/[experiment].yaml

# Verify recovery
./scripts/verify-recovery.sh

# Capture post-experiment metrics
./scripts/capture-metrics.sh post-experiment
```

#### 6. Documentation (T+1h)

Complete experiment report:
- Hypothesis vs. results
- System behavior observations
- Recovery time measurements
- Recommendations
- Follow-up actions

## Emergency Abort Procedure

If experiment causes unexpected impact:

### Immediate Actions

```bash
# 1. Abort all experiments
kubectl delete -n chaos-testing --all podchaos,networkchaos,stresschaos

# 2. Verify abort complete
kubectl get chaos -n chaos-testing

# 3. Check system recovery
curl -s https://bizra.ai/health | jq

# 4. Notify team
/incident-bot alert "Chaos experiment aborted - investigating impact"
```

### Recovery Verification

```bash
# Check all pods healthy
kubectl get pods -l app=bizra-api -o wide

# Verify error rate returning to normal
curl -s http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])

# Confirm SLO not breached
./scripts/check-slo-status.sh
```

## Specific Experiment Guides

### Network Partition (L1)

**Purpose:** Test service isolation handling

**Setup:**
```bash
kubectl apply -f chaos-experiments/network-partition.yaml
```

**Expected Behavior:**
1. API returns 503 for affected routes
2. Circuit breaker opens within 30 seconds
3. Cached responses continue serving
4. Health checks reflect degradation

**Recovery Verification:**
- Connection pool reestablishes
- Error rate returns to baseline
- No stuck connections

### Pod Kill (L2)

**Purpose:** Test pod replacement and load balancing

**Setup:**
```bash
kubectl apply -f chaos-experiments/pod-kill.yaml
```

**Expected Behavior:**
1. Kubernetes schedules replacement pod
2. Load balancer removes failed pod
3. Traffic redistributes to healthy pods
4. No dropped requests (with retries)

**Recovery Verification:**
- Pod count returns to desired state
- No pending pods
- Readiness probes passing

### Resource Stress (L3)

**Purpose:** Test HPA and resource limits

**Setup:**
```bash
kubectl apply -f chaos-experiments/cpu-stress.yaml
```

**Expected Behavior:**
1. HPA triggers scale-out at 70% CPU
2. Response time increases but within SLO
3. No OOM kills
4. Graceful degradation

**Recovery Verification:**
- HPA scales back down
- CPU utilization normalizes
- Memory stable

## Game Day Procedure

Monthly comprehensive chaos exercise:

### Pre-Game Day (1 week before)

1. Select scenarios from backlog
2. Schedule with stakeholders
3. Prepare observation stations
4. Brief participating teams
5. Document hypotheses

### Game Day Schedule

| Time | Activity |
|------|----------|
| 09:00 | Kickoff and briefing |
| 09:30 | Baseline capture |
| 10:00 | Experiment 1 |
| 10:30 | Debrief and rotate |
| 11:00 | Experiment 2 |
| 11:30 | Debrief and rotate |
| 12:00 | Lunch break |
| 13:00 | Composite scenario |
| 14:00 | Final debrief |
| 15:00 | Action item assignment |

### Post-Game Day

1. Complete all experiment reports
2. Update runbooks with learnings
3. Create tickets for improvements
4. Share summary with organization
5. Archive experiment data

## MTTR Measurement

### Definition

Mean Time To Recovery (MTTR) = Time from failure detection to full recovery

### Measurement Points

1. **Detection Time:** Alert fires
2. **Acknowledgment Time:** Engineer responds
3. **Diagnosis Time:** Root cause identified
4. **Mitigation Time:** Impact reduced
5. **Recovery Time:** Full service restored

### Target: < 5 minutes

```
Detection: 30 seconds (automated)
Acknowledgment: 1 minute (human)
Diagnosis: 1 minute (with runbooks)
Mitigation: 1 minute (automated rollback)
Recovery: 1.5 minutes (verification)
---
Total: 5 minutes
```

### Tracking

MTTR metrics stored in: `artifacts/mttr_metrics.csv`

Format:
```csv
date,experiment,detection_ms,ack_ms,diagnosis_ms,mitigation_ms,recovery_ms,total_ms
2025-11-27,pod-kill,30000,60000,45000,30000,75000,240000
```

## Contact

- **Chaos Engineering Lead:** chaos@bizra.ai
- **On-Call Channel:** #incident-response
- **Escalation:** See incident response runbook
