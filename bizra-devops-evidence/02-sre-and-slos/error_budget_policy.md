# BIZRA Error Budget Policy

> Evidence for: SRE-003, PIPE-003

## Overview

This policy defines how error budgets are calculated, consumed, and managed across the BIZRA Genesis Node platform.

## Error Budget Calculation

### Monthly Budget Allocation

| SLO | Target | Monthly Budget |
|-----|--------|----------------|
| Availability (99.95%) | 99.95% | 21.6 minutes |
| Latency P95 (99.0%) | 99.0% | 7.2 hours |
| Error Rate (99.0%) | 99.0% | 7.2 hours |

### Formula

```
Error Budget = (1 - SLO Target) × Time Window

Example (Availability):
  Budget = (1 - 0.9995) × 43,200 minutes/month
  Budget = 0.0005 × 43,200 = 21.6 minutes
```

## Burn Rate Alerts

### Fast Burn (Critical)

**Condition:** Budget consumption rate > 14.4x normal
**Time to Exhaust:** 2 days at this rate
**Action:** Page on-call immediately

```yaml
# Prometheus Alert Rule
- alert: ErrorBudgetFastBurn
  expr: |
    (
      sum(rate(http_requests_total{status=~"5.."}[1h])) /
      sum(rate(http_requests_total[1h]))
    ) > (14.4 * 0.0005)
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Error budget fast burn detected"
    action: "Page on-call, investigate immediately"
```

### Slow Burn (Warning)

**Condition:** Budget consumption rate > 6x normal
**Time to Exhaust:** 5 days at this rate
**Action:** Create ticket, page if sustained for 1 hour

```yaml
- alert: ErrorBudgetSlowBurn
  expr: |
    (
      sum(rate(http_requests_total{status=~"5.."}[6h])) /
      sum(rate(http_requests_total[6h]))
    ) > (6 * 0.0005)
  for: 1h
  labels:
    severity: warning
```

## Budget Consumption Thresholds

### Green Zone (0-50% consumed)

**Status:** Normal operations
**Actions:**
- Continue regular deployments
- Standard change process
- Feature development proceeds

### Yellow Zone (50-75% consumed)

**Status:** Caution
**Actions:**
- Review recent changes for issues
- Increase monitoring scrutiny
- Consider slowing deployment velocity
- No risky changes without extra review

### Orange Zone (75-90% consumed)

**Status:** Deploy Freeze
**Actions:**
- All non-critical deployments frozen
- Focus on stability improvements
- Incident review for recent issues
- Daily budget review meetings

### Red Zone (90-100% consumed)

**Status:** Incident Response Mode
**Actions:**
- All changes require director approval
- Engineering focus on reliability
- Post-incident reviews mandatory
- Communication to stakeholders

### Budget Exhausted (100%+)

**Status:** Emergency
**Actions:**
- Change freeze (no deployments)
- All hands on reliability
- Executive communication required
- External status page update

## Automated Rollback Policy

When error budget consumption accelerates post-deployment:

### Trigger Conditions

```
IF (
  error_rate > 1% for 5 minutes
  OR p95_latency > 500ms for 5 minutes
  OR health_check_failures >= 3 consecutive
)
AND deployment_age < 30 minutes
THEN trigger_automatic_rollback()
```

### Rollback Procedure

1. **Detection** (T+0): Alert fires
2. **Confirmation** (T+30s): Validate not a monitoring false positive
3. **Rollback** (T+1m): `kubectl rollout undo`
4. **Verification** (T+3m): Confirm previous version healthy
5. **Notification** (T+5m): Notify team and update incident channel

### Post-Rollback Actions

- [ ] Create incident ticket
- [ ] Preserve deployment artifacts
- [ ] Notify release owner
- [ ] Schedule blameless post-mortem

## Budget Reset

Error budgets reset on the 1st of each month at 00:00 UTC.

### Carryover Policy

- Unused budget does NOT carry over
- Negative budget (exceeded) does NOT carry over
- Each month starts fresh

### Exception Process

For planned maintenance or migrations that may consume significant budget:

1. Submit RFC describing expected impact
2. Get approval from SRE lead
3. Allocate reserved budget (max 25% of monthly)
4. Execute during low-traffic window
5. Document actual vs expected consumption

## Reporting

### Weekly Report Contents

- Budget consumption percentage
- Burn rate trend (7-day)
- Top error contributors
- Deployment velocity impact

### Monthly Review

- Total budget consumed
- Incidents and their budget impact
- Recommendations for next month
- SLO target adjustments (if needed)

## Stakeholder Communication

| Budget Level | Communication |
|--------------|---------------|
| > 50% | Internal Slack update |
| > 75% | Engineering all-hands mention |
| > 90% | VP notification |
| 100% | Executive status email |

## References

- Google SRE Book: Chapter 4 (Service Level Objectives)
- BIZRA SLO Contract: `02-sre-and-slos/slos.yaml`
- Incident Response Runbook: `docs/GENESIS_NODE_RUNBOOK.md`
