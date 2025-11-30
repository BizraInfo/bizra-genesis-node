# Runbook: Critical Security Hotspots Detected

- Owner: Security Team (@security-team)
- Severity: Critical
- Last Updated: 2025-11-29

## 1. Symptom
A critical alert `CriticalSecurityHotspotsDetected` fired, indicating one or more high-risk security issues detected by the Architecture Scanner.

- Alert: `CriticalSecurityHotspotsDetected`
- Trigger: `scanner_security_hotspots_total{severity="critical"} > 0`
- Context: Hardcoded secrets, unsafe code patterns, injection risks present in codebase.

## 2. Immediate Actions (First 5 Minutes)
- [ ] Acknowledge alert in AlertManager
- [ ] Open Grafana Security panel: https://grafana.bizra.io/d/bizra-genesis-node (Security row)
- [ ] Open latest scanner report: https://bizra.io/scanner/latest-report.html
- [ ] Identify types: hardcoded_secrets, unsafe_code, missing_validation

## 3. Investigation

### 3.1 Metrics
- Primary Query: `scanner_security_hotspots_total{severity="critical"}`
- Supporting Queries:
  - `scanner_security_hotspots_total by (type)`
  - `increase(scanner_security_hotspots_total{severity="high"}[24h])`

### 3.2 Evidence
- Source: `ARCHITECTURE.scanner.md` and `architecture.map.json`
- For each hotspot:
  - Confirm file path, line numbers, snippet, confidence score
  - Cross-reference with git blame and recent commits

### 3.3 Logs
- Check for exploitation signs (failed auth, anomalous API usage)

```pwsh
kubectl logs -n bizra-production -l app=bizra-genesis-node --tail=2000 | Select-String -Pattern "auth", "token", "error", "denied"
```

## 4. Remediation

### 4.1 Hardcoded Secrets
- [ ] Identify all secrets (JWT, API keys, DB creds) in source files
- [ ] Remove from code and move to environment variables or secret manager
- [ ] Rotate compromised credentials immediately
- [ ] Add pre-commit hook to detect secrets (e.g., gitleaks)

### 4.2 Unsafe Code Patterns (Rust)
- [ ] Replace `unsafe {}` blocks unless critically justified
- [ ] Remove `unwrap()`/`expect()` in production paths; use `Result` and typed errors
- [ ] Add validation for all external inputs (HTTP, DB, WS)

### 4.3 Missing Validation / Injection Risks
- [ ] Validate all user inputs (length, type, enum)
- [ ] Use parameterized queries only (sqlx prepared statements)
- [ ] Sanitize HTML and avoid `innerHTML` in frontend

## 5. Escalation
- Primary: `@security-team`
- Secondary: `@oncall-sre`
- Critical: `@cto` for credential rotation approval

## 6. Verification
- [ ] Re-run architecture scanner; ensure critical count = 0
- [ ] Validate service health on Grafana
- [ ] Confirm no residual secrets via gitleaks/secret scanning

## 7. Prevention
- Add CI gates for secret scanning and SAST (Trivy/Snyk)
- Add lint rules for unsafe patterns
- Periodic scanner runs (daily) with trend monitoring

## Appendix
- Dashboard: https://grafana.bizra.io/d/bizra-genesis-node
- Scanner Report: https://bizra.io/scanner/latest-report.html
- PromQL:
  - `scanner_security_hotspots_total{severity="critical"}`
  - `scanner_security_hotspots_total by (type)`
