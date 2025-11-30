# Operational Pipeline Standards

This document defines mandatory quality, security, performance, and reliability enforcement criteria for the Bizra Genesis Node CI/CD and nightly governance workflows.

## 1. Scope
Applies to all pull requests, protected branches, nightly maintenance runs, and benchmark executions. Deviations require an approved exception issue labeled `exception-approved` referencing compensating controls.

## 2. Quality Gates (CI)
- Build & Tests: All unit/integration tests must pass; no `#[ignore]` tests gating critical paths.
- Linting (future): Rust `cargo clippy -- -D warnings` and TypeScript `tsc --noEmit` (to be added) must succeed.
- Secrets: `gitleaks` zero findings of type `HIGH` or `CRITICAL`.
- Vulnerabilities:
  - `cargo audit`: No `Critical` unsoundness advisories. High severity allowed only with mitigation issue linked.
  - `npm audit --audit-level=high`: Zero high/critical vulnerabilities unless exception issue exists.
  - `trivy fs .`: Fail on `CRITICAL` package vulns in runtime container context.
- Dependency Licensing (future): `cargo deny` and `npm license-checker` policy compliance.
- Architecture Scanner:
  - Critical Security Hotspots: = 0 (fail otherwise).
  - Performance Bottleneck Critical (if implemented): = 0.
- Performance Smoke (k6):
  - P95 latency < 500ms (HTTP service baseline endpoints).
  - Error rate < 1%.

## 3. Benchmark Standards
Executed via `performance-benchmark.yml` dispatch:
- Test Types: `standard`, `extended` (future), `load` (future).
- Duration: Minimum 1m for statistically meaningful P95; default 2m.
- Thresholds:
  - P95 < 450ms target (hard fail at 500ms).
  - Error rate < 0.5% target (hard fail at 1%).
  - Success rate > 99%.
- Result Parsing: JSON summary consumed; failures block PR merge if linked to a PR.

## 4. Nightly Maintenance
- Runs all scans even if CI skipped:
  - Secrets, vulnerabilities, architecture scanner.
  - Generates issues for any non-zero critical hotspots.
- Future Enhancements:
  - Automatic creation of remediation subtasks in Taskmaster via MCP.
  - Auto-close issues when hotspot count returns to 0.

## 5. Observability & Metrics Integration
- Scanner metrics exposed via Prometheus exporter (planned) under `scanner_security_hotspots_total` and `scanner_performance_bottlenecks_total`.
- Alert rules enforce SLO-based gating; pipeline uses same numeric thresholds for consistency.
- Benchmark workflow to push latency summary as a Prometheus Pushgateway job (future).

## 6. Exceptions & Waivers
- Create issue labeled `exception-request` with:
  - Description of failing gate.
  - Risk assessment.
  - Mitigation or temporary control.
  - Sunset date (<= 30 days).
- Approval requires label `exception-approved` added by a code owner.
- CI references exceptions by issue number in logs; nightly job reevaluates outstanding exceptions.

## 7. Enforcement Mechanics
- Each gate sets `GATE_<NAME>=pass|fail` environment outputs consumed by a final `quality_gate` job.
- Merge Protection Recommendation: Require success of `ci-quality-gates` and `performance-benchmark` (for perf-sensitive changes labeled `perf-impact`).
- Manual override only via admin merge accompanied by `exception-approved` issue.

## 8. Roadmap Additions
| Area | Enhancement | Target Date |
|------|-------------|-------------|
| Lint | Clippy strict + TS strict mode | Week 2 |
| Licenses | cargo deny + npm license policy | Week 2 |
| Exporter | Architecture scanner Prometheus exporter | Week 1 |
| Perf Push | Pushgateway integration | Week 3 |
| Auto Tasks | Nightly to create Taskmaster subtasks | Week 2 |
| SBOM | Generate CycloneDX + Trivy SBOM scan | Week 3 |
| DAST | Add OWASP ZAP baseline scan | Week 4 |

## 9. File Mapping & Ownership
- `.github/workflows/ci-quality-gates.yml` – DevOps team
- `.github/workflows/performance-benchmark.yml` – Performance Lead
- `.github/workflows/nightly-maintenance.yml` – SRE team
- `monitoring/prometheus/rules/slo-alerts.yml` – Observability Owner
- `docs/runbooks/*.md` – SRE team
- `tools/architecture-scanner/*` – Architecture Governance Lead

## 10. Change Control
- Modifications to thresholds require PR referencing comparative benchmark evidence and risk impact.
- Observability metric name changes must update: Prometheus rules, Grafana dashboard panels, alert runbooks, and pipeline parsing scripts.

## 11. Failure Response Workflow
1. Gate fails → CI annotates summary in PR comment.
2. Developer triages: fix vs. exception request.
3. If exception: create issue; add mitigation; request approval.
4. On merge: Ensure follow-up task added if mitigation pending.
5. Nightly job audits unresolved exceptions.

## 12. Security Posture Integration
- All critical hotspot issues auto-labeled `security` + `hotspot` + severity tag.
- Pipeline ensures zero silent regressions by correlating scanner runtime metrics & static scan results (future correlation matrix).

## 13. Metrics to Track (Dashboard Alignment)
| Domain | Metric | Source |
|--------|-------|--------|
| Security | `scanner_security_hotspots_total` | Scanner Exporter |
| Performance | `http_request_duration_seconds_p95` | Prometheus recording rule |
| Reliability | `http_availability_ratio` | Prometheus recording rule |
| Throughput | `http_requests_total` | Service instrumentation |
| Errors | `http_request_errors_total` | Service instrumentation |

## 14. Glossary
- P95: 95th percentile latency.
- Hotspot: Code pattern flagged as high-risk security issue.
- Bottleneck: Pattern likely causing performance degradation under load.
- SLO: Service Level Objective – target reliability/performance benchmark.

---
Last updated: YYYY-MM-DD
