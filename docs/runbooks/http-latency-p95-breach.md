# Runbook: HTTP Latency P95 Breach

- Owner: Backend Team (@backend-team)
- Severity: Critical
- Last Updated: 2025-11-29

 
## 1. Symptom

Alert `HTTPLatencyP95Breach` indicates HTTP P95 latency > 500ms for 5 minutes.

- Alert: `HTTPLatencyP95Breach`
- Trigger: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, namespace, pod)) > 0.5`
- Impact: Degraded user experience, potential timeouts.

 
## 2. Immediate Actions (First 5 Minutes)

- [ ] Acknowledge alert in AlertManager
- [ ] Open dashboard: <https://grafana.bizra.io/d/bizra-genesis-node>
- [ ] Identify top slow endpoints (API Request Volume and Latency panels)
- [ ] Check deployment annotations for recent changes

 
## 3. Investigation

### 3.1 Metrics
 
- P50/P95/P99 latency timeseries per endpoint
- Request rate by status (2xx/4xx/5xx)
- Pod CPU/memory usage and throttling

### 3.2 Endpoint Analysis
 
- Top endpoints: `topk(10, sum(rate(http_requests_total[5m])) by (endpoint))`
- Latency per endpoint: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))`

### 3.3 Logs

```pwsh
kubectl logs -n bizra-production -l app=bizra-genesis-node --tail=2000 | Select-String -Pattern "timeout|slow|latency|error"
```

## 4. Remediation

### 4.1 Immediate Mitigation
 
- [ ] Scale replicas and ensure HPA max not reached
- [ ] Enable caching on hot endpoints (Redis)
- [ ] Reduce payload sizes and N+1 queries

### 4.2 Root Cause Fix
 
- Optimize hot path code; avoid `.clone()` in hot loops
- Replace blocking I/O with async primitives
- Add pagination and server-side filters

## 5. Escalation
 
- Primary: `@backend-team`
- Secondary: `@oncall-sre`
- Critical: `@cto` for customer communications if widespread

## 6. Verification
 
- [ ] P95 latency < 500ms
- [ ] Error rate stable <1%
- [ ] No CPU throttling; HPA not at max

## 7. Prevention
 
- Add endpoint-level SLOs and budgets
- Implement performance regression tests (k6) in CI
- Add profiling in hot paths and revisit regularly
