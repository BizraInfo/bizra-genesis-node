# BIZRA Incident Response Playbooks

> Evidence for: RES-004
> Last Updated: 2025-11-27
> Owner: SRE Team

## Overview

This document defines automated incident response procedures for BIZRA Genesis Node. All playbooks integrate with PagerDuty for alerting and follow the MTTR targets defined in our SLO contract.

---

## Severity Classification

| Severity | Name | Impact | MTTR Target | Examples |
|----------|------|--------|-------------|----------|
| P1 | Critical | Complete service outage | < 15 min | API down, data loss, security breach |
| P2 | High | Major feature degraded | < 1 hour | Auth failures, payment issues, >10% errors |
| P3 | Medium | Minor feature impacted | < 4 hours | Slow queries, partial degradation |
| P4 | Low | Minimal user impact | < 24 hours | UI bugs, non-critical warnings |

### Severity Decision Tree

```
Is the service completely unavailable?
├── YES → P1 (Critical)
└── NO → Is a core feature broken (auth, payments, data)?
         ├── YES → Is it affecting >10% of users?
         │         ├── YES → P1 (Critical)
         │         └── NO → P2 (High)
         └── NO → Is performance degraded >50%?
                  ├── YES → P2 (High)
                  └── NO → Is there user-visible impact?
                           ├── YES → P3 (Medium)
                           └── NO → P4 (Low)
```

---

## Escalation Matrix

### On-Call Rotation

| Role | Primary | Secondary | Escalation Time |
|------|---------|-----------|-----------------|
| First Responder | On-call Engineer | Backup Engineer | Immediate |
| Incident Commander | SRE Lead | Platform Lead | 5 min (P1/P2) |
| Engineering Lead | CTO | VP Engineering | 15 min (P1) |
| Communications | DevRel Lead | Marketing | 30 min (P1) |
| Executive | CEO | COO | 60 min (P1 only) |

### Auto-Escalation Rules

```yaml
# PagerDuty Escalation Policy
escalation_policy:
  name: "BIZRA Genesis Escalation"
  rules:
    - escalation_delay_in_minutes: 0
      targets:
        - type: schedule_reference
          id: "on-call-primary"

    - escalation_delay_in_minutes: 5
      targets:
        - type: schedule_reference
          id: "on-call-secondary"

    - escalation_delay_in_minutes: 15
      targets:
        - type: user_reference
          id: "sre-lead"

    - escalation_delay_in_minutes: 30
      targets:
        - type: user_reference
          id: "engineering-lead"
```

---

## Playbook Index

| ID | Playbook | Triggers | Severity |
|----|----------|----------|----------|
| PB-001 | API Server Down | Health check failures | P1 |
| PB-002 | Database Connection Failures | Connection pool exhausted | P1 |
| PB-003 | High Error Rate | 5xx > 5% for 5 min | P1/P2 |
| PB-004 | High Latency | P95 > 1000ms for 5 min | P2 |
| PB-005 | Authentication Failures | Auth error rate > 10% | P2 |
| PB-006 | Memory Exhaustion | Memory > 90% | P2 |
| PB-007 | CPU Saturation | CPU > 90% for 10 min | P2/P3 |
| PB-008 | Disk Space Critical | Disk > 85% | P3 |
| PB-009 | Certificate Expiry | Cert expires < 7 days | P3 |
| PB-010 | Security Alert | Anomaly detection trigger | P1/P2 |

---

## Playbook Details

### PB-001: API Server Down

**Severity:** P1 (Critical)
**MTTR Target:** < 15 minutes

#### Alert Configuration

```yaml
# Prometheus Alert Rule
- alert: APIServerDown
  expr: up{job="api-server"} == 0
  for: 1m
  labels:
    severity: critical
    playbook: PB-001
  annotations:
    summary: "API Server is down"
    description: "{{ $labels.instance }} has been down for more than 1 minute"
    runbook_url: "https://docs.bizra.ai/runbooks/pb-001"
```

#### Response Steps

1. **Acknowledge** (0-2 min)
   - [ ] Acknowledge alert in PagerDuty
   - [ ] Join incident Slack channel `#incident-active`
   - [ ] Announce: "Investigating API outage"

2. **Diagnose** (2-5 min)
   ```bash
   # Check pod status
   kubectl get pods -n production -l app=api-server

   # Check recent events
   kubectl get events -n production --sort-by='.lastTimestamp' | head -20

   # Check logs
   kubectl logs -n production -l app=api-server --tail=100
   ```

3. **Mitigate** (5-10 min)
   ```bash
   # Option A: Restart pods
   kubectl rollout restart deployment/api-server -n production

   # Option B: Rollback to previous version
   kubectl rollout undo deployment/api-server -n production

   # Option C: Scale up healthy replicas
   kubectl scale deployment/api-server --replicas=5 -n production
   ```

4. **Verify** (10-15 min)
   - [ ] Health endpoint returns 200
   - [ ] Error rate < 1%
   - [ ] Latency P95 < 500ms
   - [ ] Announce: "API restored, monitoring"

5. **Resolve**
   - [ ] Mark incident resolved in PagerDuty
   - [ ] Create post-incident ticket
   - [ ] Schedule PIR within 72 hours

---

### PB-002: Database Connection Failures

**Severity:** P1 (Critical)
**MTTR Target:** < 15 minutes

#### Alert Configuration

```yaml
- alert: DatabaseConnectionExhausted
  expr: pg_stat_activity_count > pg_settings_max_connections * 0.9
  for: 2m
  labels:
    severity: critical
    playbook: PB-002
```

#### Response Steps

1. **Immediate Actions**
   ```bash
   # Check connection count
   psql -c "SELECT count(*) FROM pg_stat_activity;"

   # Identify long-running queries
   psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
            FROM pg_stat_activity
            WHERE state != 'idle'
            ORDER BY duration DESC
            LIMIT 10;"

   # Kill long-running queries if needed
   psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
            WHERE duration > interval '5 minutes' AND state != 'idle';"
   ```

2. **Mitigation**
   ```bash
   # Increase connection pool (if PgBouncer)
   # Edit pgbouncer.ini: max_client_conn = 200

   # Restart API to reset connections
   kubectl rollout restart deployment/api-server -n production
   ```

3. **Verification**
   - [ ] Connection count < 80% of max
   - [ ] Query latency normal
   - [ ] No connection timeout errors

---

### PB-003: High Error Rate

**Severity:** P1/P2 (based on rate)
**MTTR Target:** < 15 min (P1) / < 1 hour (P2)

#### Alert Configuration

```yaml
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m]))
    / sum(rate(http_requests_total[5m])) > 0.05
  for: 5m
  labels:
    severity: critical
    playbook: PB-003
```

#### Response Steps

1. **Identify Error Source**
   ```bash
   # Check error distribution by endpoint
   curl -s localhost:9090/api/v1/query?query='topk(10,sum(rate(http_requests_total{status=~"5.."}[5m]))by(handler))'

   # Check recent deployments
   kubectl rollout history deployment/api-server -n production
   ```

2. **Mitigation Options**
   - Recent deployment? → Rollback
   - Specific endpoint? → Feature flag disable
   - External dependency? → Circuit breaker
   - Resource exhaustion? → Scale up

3. **Rollback Command**
   ```bash
   # Rollback to previous revision
   kubectl rollout undo deployment/api-server -n production

   # Or specific revision
   kubectl rollout undo deployment/api-server --to-revision=5 -n production
   ```

---

### PB-004: High Latency

**Severity:** P2 (High)
**MTTR Target:** < 1 hour

#### Alert Configuration

```yaml
- alert: HighLatency
  expr: |
    histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1.0
  for: 5m
  labels:
    severity: high
    playbook: PB-004
```

#### Response Steps

1. **Diagnose**
   ```bash
   # Check slow endpoints
   curl -s localhost:9090/api/v1/query?query='topk(5,histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket[5m]))by(handler,le)))'

   # Check database query times
   kubectl logs -n production -l app=api-server | grep "slow query"

   # Check external API latency
   kubectl logs -n production -l app=api-server | grep "external_api_duration"
   ```

2. **Mitigation**
   - Add caching for slow endpoints
   - Optimize database queries
   - Scale horizontally
   - Enable request queuing

---

### PB-005: Authentication Failures

**Severity:** P2 (High)
**MTTR Target:** < 1 hour

#### Alert Configuration

```yaml
- alert: AuthenticationFailureSpike
  expr: |
    sum(rate(auth_failures_total[5m])) / sum(rate(auth_attempts_total[5m])) > 0.1
  for: 5m
  labels:
    severity: high
    playbook: PB-005
```

#### Response Steps

1. **Determine Cause**
   - Credential stuffing attack? → Enable rate limiting
   - JWT validation errors? → Check secret rotation
   - SSO provider down? → Fallback auth
   - Database issues? → Check user table

2. **Security Response**
   ```bash
   # Check for attack patterns
   kubectl logs -n production -l app=api-server | grep "auth_failure" | \
     awk '{print $NF}' | sort | uniq -c | sort -rn | head -20

   # Block suspicious IPs (if attack)
   kubectl apply -f k8s/network-policy-block.yaml
   ```

---

### PB-010: Security Alert

**Severity:** P1/P2 (based on threat level)
**MTTR Target:** < 15 min (P1)

#### Alert Types

| Alert | Severity | Response |
|-------|----------|----------|
| Intrusion attempt | P1 | Isolate, investigate, report |
| Data exfiltration | P1 | Block, forensics, legal |
| Credential leak | P1 | Rotate all secrets |
| Anomalous access | P2 | Investigate, monitor |
| Failed security scan | P2 | Fix vulnerabilities |

#### Response Steps

1. **Containment** (Immediate)
   ```bash
   # Isolate affected pods
   kubectl cordon <node>
   kubectl drain <node> --ignore-daemonsets

   # Revoke compromised credentials
   kubectl delete secret <compromised-secret> -n production
   ```

2. **Investigation**
   - Preserve logs and evidence
   - Identify attack vector
   - Assess data exposure
   - Document timeline

3. **Communication**
   - Notify security team
   - Legal notification if breach
   - Customer communication plan

---

## Post-Incident Review (PIR)

### PIR Template

```markdown
# Post-Incident Review: [INCIDENT-ID]

## Summary
- **Date:** YYYY-MM-DD
- **Duration:** X hours Y minutes
- **Severity:** P1/P2/P3/P4
- **Impact:** [Description of user impact]

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert triggered |
| HH:MM | Incident acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Service restored |

## Root Cause
[Technical explanation of what caused the incident]

## What Went Well
- [Item 1]
- [Item 2]

## What Could Be Improved
- [Item 1]
- [Item 2]

## Action Items
| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| [Action] | [Name] | YYYY-MM-DD | Open |

## Lessons Learned
[Key takeaways for preventing future incidents]
```

### PIR Schedule

| Severity | PIR Required | Deadline |
|----------|--------------|----------|
| P1 | Yes (mandatory) | 72 hours |
| P2 | Yes | 1 week |
| P3 | Optional | 2 weeks |
| P4 | No | N/A |

---

## Automation Integration

### PagerDuty Webhook

```json
{
  "routing_key": "PAGERDUTY_ROUTING_KEY",
  "event_action": "trigger",
  "dedup_key": "{{ $labels.alertname }}-{{ $labels.instance }}",
  "payload": {
    "summary": "{{ $labels.alertname }}: {{ $annotations.summary }}",
    "severity": "{{ $labels.severity }}",
    "source": "{{ $labels.instance }}",
    "custom_details": {
      "playbook": "{{ $labels.playbook }}",
      "runbook_url": "{{ $annotations.runbook_url }}"
    }
  }
}
```

### Slack Integration

```yaml
# Alertmanager Slack Config
receivers:
  - name: 'slack-critical'
    slack_configs:
      - api_url: 'SLACK_WEBHOOK_URL'
        channel: '#incidents'
        title: '{{ .Status | toUpper }}: {{ .CommonLabels.alertname }}'
        text: |
          *Severity:* {{ .CommonLabels.severity }}
          *Playbook:* {{ .CommonLabels.playbook }}
          *Summary:* {{ .CommonAnnotations.summary }}
          <{{ .CommonAnnotations.runbook_url }}|View Runbook>
```

---

## MTTR Tracking

### Current Performance

| Severity | Target MTTR | Actual (30-day avg) | Status |
|----------|-------------|---------------------|--------|
| P1 | < 15 min | TBD | Tracking |
| P2 | < 1 hour | TBD | Tracking |
| P3 | < 4 hours | TBD | Tracking |
| P4 | < 24 hours | TBD | Tracking |

### MTTR Breakdown

```
MTTR = Detection + Acknowledgment + Diagnosis + Mitigation + Verification

Target breakdown for P1:
- Detection: < 1 min (automated monitoring)
- Acknowledgment: < 2 min (on-call response)
- Diagnosis: < 5 min (playbook-guided)
- Mitigation: < 5 min (automated rollback)
- Verification: < 2 min (health checks)
```

---

## Contact Information

| Role | Contact | Backup |
|------|---------|--------|
| SRE On-Call | PagerDuty | Slack #sre |
| Security | security@bizra.ai | Slack #security |
| Database | dba@bizra.ai | Slack #data |
| Engineering Lead | eng-lead@bizra.ai | Slack #engineering |

---

## Related Documents

- [SLO Contract](../02-sre-and-slos/slos.yaml)
- [Error Budget Policy](../02-sre-and-slos/error_budget_policy.md)
- [Chaos Runbook](./chaos_runbook.md)
- [Change Management Policy](../06-governance-and-process/change_management_policy.md)
