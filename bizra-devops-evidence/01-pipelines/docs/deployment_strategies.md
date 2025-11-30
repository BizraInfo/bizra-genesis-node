# BIZRA Deployment Strategies

> Evidence for: PIPE-004

## Overview

BIZRA Genesis Node supports multiple deployment strategies to minimize risk and enable fast recovery.

## Supported Strategies

### 1. Rolling Update (Default for Staging)

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%
    maxUnavailable: 25%
```

**Characteristics:**
- Gradual pod replacement
- Zero downtime
- Automatic rollback on health check failure

### 2. Blue-Green Deployment

```yaml
# Blue environment (current production)
apiVersion: v1
kind: Service
metadata:
  name: bizra-api
spec:
  selector:
    app: bizra-api
    version: blue  # or green

# Traffic switch is atomic
```

**Characteristics:**
- Full environment duplication
- Instant rollback (service selector change)
- Higher resource cost
- Used for: Major version releases

### 3. Canary Deployment (Production Default)

```yaml
# Canary configuration
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: bizra-api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bizra-api
  progressDeadlineSeconds: 3600
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
```

**Progression:**
1. Deploy canary (10% traffic)
2. Monitor for 10 minutes
3. If healthy: increment to 20%, 30%, 50%
4. If unhealthy: automatic rollback
5. Full promotion after 30 minutes

## Environment-Specific Defaults

| Environment | Strategy | Canary % | Monitor Time |
|-------------|----------|----------|--------------|
| Development | Rolling | N/A | 0 |
| Staging | Blue-Green | N/A | 5 min |
| Production | Canary | 10 → 50 → 100 | 30 min |

## Rollback Triggers

Automatic rollback is triggered when:

1. **Error Rate** > 1% for 5 minutes
2. **P95 Latency** > 500ms for 5 minutes
3. **Health Check** fails 3 consecutive times
4. **Canary Analysis** detects anomaly

## Manual Rollback

```bash
# Kubernetes rollback
kubectl rollout undo deployment/bizra-api -n production

# Flagger canary rollback
kubectl patch canary bizra-api -n production \
  --type merge \
  -p '{"spec":{"suspend":true}}'
```

## Deployment Windows

| Window | Allowed | Notes |
|--------|---------|-------|
| Monday-Thursday 09:00-17:00 UTC | Yes | Standard |
| Friday | Warning | Requires approval |
| Weekend | Emergency only | Requires 2 approvals |
| Holiday periods | Blocked | Change freeze |

## Verification Checklist

- [ ] Pre-deployment smoke tests pass
- [ ] Database migrations applied
- [ ] Feature flags configured
- [ ] Monitoring dashboards ready
- [ ] On-call engineer notified
- [ ] Rollback plan documented
