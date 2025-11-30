# Runbook: Availability SLO Breach

- Owner: SRE Team (@oncall-sre)
- Severity: Critical
- Last Updated: 2025-11-29

 
## 1. Symptom

Alert `AvailabilitySLOBreach` indicates service availability dropped below 99.95% over a 1h window.

- Alert: `AvailabilitySLOBreach`
- Trigger: `(1 - (sum(rate(http_requests_total{status=~"5.."}[1h])) / sum(rate(http_requests_total}[1h])))) < 0.9995`
- Impact: SLA breach risk; customer-facing outage or error spike.

 
## 2. Immediate Actions (First 5 Minutes)

- [ ] Acknowledge alert in AlertManager
- [ ] Check deployment events (annotations on dashboard)
- [ ] Review error rate, latency panels
- [ ] Validate external dependencies (DB/Redis/LLM)

 
## 3. Investigation

### 3.1 Metrics

- Primary: `slo:availability:1h`
- Supporting:
  - Error rate: `(sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100`
  - Latency P95: `http:latency:p95`
  - HPA replicas: `kube_horizontalpodautoscaler_status_current_replicas`

### 3.2 Logs

```pwsh
kubectl logs -n bizra-production -l app=bizra-genesis-node --tail=2000 | Select-String -Pattern "ERROR|5..|panic"
```

### 3.3 Infra Health

- Pod restarts: `rate(kube_pod_container_status_restarts_total[15m])`
- CPU throttling: `rate(container_cpu_cfs_throttled_seconds_total[5m])`
- DB pool: `pg_stat_database_numbackends / pg_settings_max_connections`

 
## 4. Remediation

### 4.1 Immediate Mitigation

- [ ] Rollback last deployment
- [ ] Scale replicas/HPA max
- [ ] Enable circuit breaker/feature flags for problematic endpoints

### 4.2 Root Cause Fix

- Address failing endpoints, optimize DB queries, reduce tail latency
- Add retries/backoff, improve error handling

 
## 5. Escalation

- Primary: `@oncall-sre`
- Secondary: `@backend-team`
- Critical: `@cto` if outage >30 minutes

 
## 6. Verification

- [ ] Availability back >99.95%
- [ ] Error rate <1%
- [ ] Post-incident added and RCA scheduled

 
## 7. Prevention

- Add synthetic monitoring for critical endpoints
- Tighten Canary/Blue-Green rollout strategies
- Capacity planning review
