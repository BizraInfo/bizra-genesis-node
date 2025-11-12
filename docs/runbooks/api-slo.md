# API SLO Runbook
## Burn-rate breach (fast/slow)
1. Check current rollout; if active, consider rollback via Argo.
2. Inspect traces and error taxonomy for hot endpoints.
3. Activate feature-flag kill-switch if applicable.
4. Create incident note and attach Grafana panels.
