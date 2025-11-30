# Runbook: {{ ALERT_NAME }}

- Owner: {{ TEAM_OR_OWNER }}
- Severity: {{ SEVERITY }}
- Last Updated: {{ DATE }}

 
## 1. Symptom
Describe what this alert means and the user/business impact.

- Alert: `{{ ALERT_NAME }}`
- Trigger: `{{ PROMQL_EXPR }}`
- Context: {{ CONTEXT_SUMMARY }}

 
## 2. Immediate Actions (First 5 Minutes)

- [ ] Acknowledge alert in AlertManager
- [ ] Check Grafana dashboard: {{ DASHBOARD_URL }}
- [ ] Validate traffic spike or deploy event
- [ ] Capture current metrics and logs for RCA

 
## 3. Investigation
 
### 3.1 Metrics

- Primary Query: `{{ PRIMARY_QUERY }}`
- Supporting Queries:
  - `{{ SUPPORTING_QUERY_1 }}`
  - `{{ SUPPORTING_QUERY_2 }}`

 
### 3.2 Logs

- Service: `{{ SERVICE_NAME }}`
- Command:

```pwsh
kubectl logs -n bizra-production -l app={{ SERVICE_NAME }} --tail=500 | Out-String
```

 
### 3.3 Traces (if available)

- Trace dashboard: {{ TRACES_URL }}

 
## 4. Remediation
 
### 4.1 Immediate Mitigation

- [ ] Rollback last deployment (if correlated)
- [ ] Scale resources/HPA if saturation-related
- [ ] Apply feature flag or circuit breaker (if supported)

 
### 4.2 Root Cause Fix

- Provide code/config changes required and acceptance criteria.

 
## 5. Escalation

- Primary: `@oncall-sre`
- Secondary: `@backend-team`
- Security: `@security-team` (if applicable)
- Critical: `@cto`

 
## 6. Verification

- [ ] Alert cleared in Grafana/AlertManager
- [ ] SLO back within target
- [ ] Add post-incident notes to runbook

 
## 7. Prevention

- Update tests/alerts/dashboards to prevent recurrence.
- Document learnings and add automation where possible.
