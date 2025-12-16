# BIZRA Node0 — Unified Elite Execution Blueprint (PMBOK × DevOps × Ihsān × SAPE)

Related:
- [docs/UNIFIED_MASTERPIECE_BLUEPRINT.md](docs/UNIFIED_MASTERPIECE_BLUEPRINT.md)
- [docs/BIZRA_SYSTEM_ARCHITECTURE_ATLAS.md](docs/BIZRA_SYSTEM_ARCHITECTURE_ATLAS.md)
- [docs/APEX_SYSTEM.md](docs/APEX_SYSTEM.md)

**Purpose**: Turn the current BIZRA Node0 repo into a consistently shippable, measurable, and ethically governed sovereign-AI product by unifying architecture, security, performance, documentation, and delivery operations into a single actionable framework.

**Scope**: This blueprint is grounded in the repo’s current artifacts:
- CI/CD and quality gates already implemented in GitHub Actions (notably `.github/workflows/ci.yml`, plus other workflows)
- Existing DevOps and architecture docs (`DEVOPS_BLUEPRINT.md`, `docs/DEVELOPMENT-BLUEPRINT.md`, `docs/BIZRA-NODE0-ARCHITECTURE-v1.0.1.md`)
- Existing SRE runbooks (`docs/runbook/*`)

---

## 0) Executive Snapshot (High-SNR)

### What’s already strong
- **Multi-language, full-stack system**: Rust API, Next.js dashboard, Node bridge, Python knowledge tooling.
- **Operational maturity scaffolding exists**: SLOs + incident runbook + multiple CI/security workflows.
- **Security tooling is present** (CodeQL, Trivy, Semgrep, Gitleaks/TruffleHog, cargo-audit/deny).
- **Performance tooling exists** (Lighthouse CI, k6 scripts, performance budgets).

### What’s currently drifting (highest leverage to fix)
1. **Policy ↔ code drift**: security docs claim restrictive CORS/CSP, but backend CORS allows any origin (`backend/src/main.rs` uses `CorsLayer::allow_origin(Any)`), weakening trust.
2. **Pipeline sprawl**: there are multiple overlapping CI/CD workflows with different assumptions; at least one appears aspirational and may reference paths/scripts that don’t exist or are placeholders.
3. **Monorepo ergonomics drift**: the repo uses pnpm + workspaces but lacked `pnpm-workspace.yaml` (now added) — CI reliability depends on workspace correctness.
4. **SNR erosion risk**: many docs are “elite” but not always “executable”—the next step is unifying them into a minimal set of decision gates + measurable acceptance criteria.

### North Star
**Ship sovereignty with integrity**: every release must be (1) secure-by-default, (2) observable + measurable against SLOs, (3) performance-budgeted, (4) ethically governed (Ihsān/Adl/Amānah), and (5) truth-aligned (docs reflect code).

---

## 1) Operating Principles

### 1.1 Ihsān / Adl / Amānah as engineering gates
Treat these as **enforceable, testable quality gates**, not vibes.

- **Ihsān (Excellence & benevolence)**
  - “Does this change reduce harm and increase clarity?”
  - Evidence: perf budgets, SLOs, failure modes, user safety.
- **Adl (Justice & fairness)**
  - “Does this behave consistently across users and environments?”
  - Evidence: deterministic config, no hidden privilege paths, explicit access control.
- **Amānah (Trust & stewardship)**
  - “Does this protect user data and avoid deception?”
  - Evidence: least privilege, logging discipline, secure defaults, no silent failures.

### 1.2 SAPE: Symbolic → Abstraction → Probe → Elevation
Use SAPE as a weekly loop that converts ideas into shipped improvements:
- **Symbolic**: name the failure precisely (e.g., “CORS policy drift”).
- **Abstraction**: generalize into a reusable standard (e.g., “Config & security policy must be single-source”).
- **Probe**: implement the smallest measurable experiment (e.g., CI check that fails if CORS is Any in production builds).
- **Elevation**: integrate into the platform (docs + automation + culture).

### 1.3 Optimized SNR (Signal-to-Noise Ratio)
SNR rules for this repo:
- Prefer **executable docs** (commands, owners, acceptance criteria).
- Prefer **one canonical workflow** per intent (CI, security, performance).
- Prefer **failing fast** over `|| true` on safety-critical steps.

---

## 2) System Model (Architecture as a living contract)

### 2.1 Runtime topology
- **Dashboard** (Next.js): port 3000
- **Backend** (Rust/Axum): port 8080
- **Bridge** (Node/WebSocket telemetry): port 3002 (and historically a 3001 health server in some modes)
- **Ollama** (local inference): port 11434
- **Postgres**: 5432
- **Redis**: 6379

### 2.2 Contract principle: “Ports, URLs, and health shapes are sacred”
- A single env var (`NEXT_PUBLIC_API_URL`) should govern client ↔ backend.
- Health endpoints should be stable and versioned or normalized.
- CI should validate “dashboard boots + can reach backend health” in a minimal smoke run.

---

## 3) Delivery System (DevOps + CI/CD) — Make the repo shippable by construction

### 3.1 Canonical workflow policy
The repo contains several workflows. Treat them like a portfolio:
- **Canonical CI** (recommended): `.github/workflows/ci.yml` (already covers lint, security, build, integration, e2e, docker).
- **Security scanning**: `.github/workflows/security-scan.yml` (scheduled + PR/push).
- **Web performance**: `.github/workflows/lighthouse.yml`.

**Action**: explicitly declare one canonical “merge gate” workflow (CI), and treat the others as specialized audits.

### 3.2 Quality Gates (world-class but practical)
1. **Gate A — Integrity (Amānah)**
   - Secret scanning passes.
   - No “silent success”: minimize `|| true` on security-critical checks.
2. **Gate B — Secure-by-default**
   - CORS and auth posture match documented security policy.
   - Dependency scanning has a remediation SLA (see Roadmap).
3. **Gate C — Correctness**
   - Rust tests; dashboard typecheck; key integration smoke tests.
4. **Gate D — Performance budget**
   - Lighthouse scores and k6 p95 thresholds.
5. **Gate E — Reliability**
   - SLO instrumentation and alert rules are present and validated.
6. **Gate F — Ethical compliance (Ihsān/Adl)**
   - PR contains an “Ethical Impact” section and a minimal risk assessment.

### 3.3 Pipeline automation: evidence-driven improvements
**Immediate improvement implemented**: `pnpm-workspace.yaml` added so pnpm workspaces work reliably.

Next improvements are in the Roadmap (unify workflows, remove placeholders, add explicit smoke tests).

---

## 4) Security Blueprint (Shift-left, truth-aligned)

### 4.1 Threat model (minimum viable)
- **Primary assets**: user data (profiles, sessions), PoI ledger integrity, model outputs (safety), local machine resources.
- **Primary threats**: auth bypass, injection, CORS abuse, data exfiltration, supply chain compromise, prompt injection via RAG.

### 4.2 “Docs must match code” rule
Example drift to close:
- `SECURITY.md` says “Restrictive CORS policy” and “CSP headers”.
- Backend currently allows any origin via CORS (`backend/src/main.rs`).

**Blueprint decision**:
- Dev mode: permissive allowed.
- Staging/prod: explicit allowlist + strict headers.

### 4.3 Security backlog (measurable)
- Replace global permissive CORS with environment-based allowlist.
- Add security headers at the edge (dashboard) and API (where appropriate).
- Add request-size limits + structured error responses.
- Add authentication and authorization enforcement where claims exist.

---

## 5) Performance + Quality Engineering (PQE)

### 5.1 SLO-driven engineering
Use `docs/runbook/slo-definitions.md` as the authority.

Engineering rule:
- Any feature that can threaten p95 latency must include a perf note + measurement plan.

### 5.2 Performance toolchain
- **Lighthouse CI**: regression guard for dashboard.
- **k6**: load/stress/soak scenarios.
- **Rust benches**: criterion.

### 5.3 Performance roadmap rule
Performance work must be:
- tied to a metric (p95, memory, build time),
- tied to a bottleneck hypothesis,
- validated in CI or a reproducible local script.

---

## 6) LLM Excellence: ethically grounded “Graph-of-Thought” operations

This repo’s strategic advantage is sovereign cognition. To “activate untapped capacities” without sacrificing integrity:

### 6.1 Architecture: Retrieval → Graph → Reasoning → Verification
- **Retrieve**: high-precision retrieval (RAG).
- **Graph**: represent entities/claims/links (hypergraph), not just text chunks.
- **Reason**: multi-agent coordination (PAT roles), with explicit constraints.
- **Verify**: automated checks (consistency, citations to internal knowledge, policy compliance), and telemetry.

### 6.2 Safety posture (Ihsān gate)
- Always separate: user intent → system constraints → tool execution.
- Log model decisions at a high level (no secrets), include refusal reasons.

### 6.3 SNR rule for AI
- For every “smart” layer, include a “simple fallback path” that keeps the system usable.

---

## 7) PMBOK Integration (turn engineering into an execution machine)

### 7.1 Minimal PMBOK artifacts for this repo
- **Project Charter**: “BIZRA Node0 Sovereign MVP Hardening”
- **Scope statement**: what is in/out (avoid feature creep).
- **WBS**: security hardening, CI rationalization, perf budgets, docs consolidation.
- **Schedule**: Now/Next/Later roadmap.
- **Risk register**: see Section 8.
- **Change control**: PR template + merge gates.
- **Stakeholder comms**: weekly release notes + incident summaries.

### 7.2 RACI (default)
- **Responsible**: component owners (Backend, Dashboard, Bridge, Knowledge).
- **Accountable**: Tech Lead.
- **Consulted**: Security/DevOps.
- **Informed**: Stakeholders/users.

---

## 8) Cascading Risk Strategy (prevent chain failures)

### 8.1 Cascade patterns observed in systems like this
- Config drift → health checks mismatch → dashboards show false negatives → operators ignore alerts.
- “Elite” workflows with placeholders → false confidence → production incidents.
- Policy docs claim strict security → permissive runtime → trust collapse.

### 8.2 Anti-cascade controls
- **Single-source config**: typed env + `.env.example` parity.
- **Truth gates**: CI checks that compare policy vs runtime configuration.
- **Remove silent success**: reduce `|| true` for critical checks.

---

## 9) Prioritized Optimization Roadmap (Now / Next / Later)

Each item includes: **Outcome**, **Owner**, **Acceptance Criteria**.

### NOW (0–14 days): stabilize truth + ship reliability
1) **Unify CI as the merge gate**
- Outcome: One workflow is authoritative for PR merges; others become advisory.
- Owner: DevOps
- Acceptance: PRs require `.github/workflows/ci.yml` green.

2) **Close security-policy drift (CORS + headers)**
- Outcome: staging/prod are strict-by-default.
- Owner: Backend + DevOps
- Acceptance: production config uses allowlist; security docs updated to reflect exact behavior.

3) **Remove silent failures from critical gates**
- Outcome: security-critical steps fail build when needed.
- Owner: DevOps + Security
- Acceptance: secret scan + dependency criticals are blocking; non-critical remain advisory.

4) **Smoke test: dashboard ↔ backend health contract**
- Outcome: breakages in ports/URLs/health shape are caught pre-merge.
- Owner: QA/DevOps
- Acceptance: CI runs a minimal boot + health check.

### NEXT (2–6 weeks): hardening and observability
5) **Authentication/authorization truth pass**
- Outcome: endpoints that require auth enforce it consistently.
- Owner: Backend
- Acceptance: documented RBAC exists and is tested.

6) **Performance budgets become release criteria**
- Outcome: SLO + budget adherence is automatic.
- Owner: Perf/DevOps
- Acceptance: Lighthouse and k6 thresholds are enforced with clear remediation guidance.

7) **Runbook drills + incident retros**
- Outcome: operational readiness is practiced.
- Owner: SRE
- Acceptance: monthly game day; postmortem template in repo.

### LATER (6–12 weeks): scale the sovereign cognition engine
8) **Graph-of-thought knowledge substrate**
- Outcome: retrieval is explainable, auditable, and resilient.
- Owner: AI/Knowledge
- Acceptance: graph-based indexing + evaluation harness; prompt-injection defenses.

9) **Multi-node federation readiness**
- Outcome: safe expansion beyond Node0.
- Owner: Backend/Infra
- Acceptance: signed messages, replay protection, audit logs.

---

## 10) Definition of Done (DoD) — elite, measurable, ethical

A change is “Done” only if:
- **Correctness**: tests + typecheck pass.
- **Security**: no new high/critical findings without an issue + SLA.
- **Performance**: budgets not regressed beyond tolerance.
- **Docs**: public-facing behavior is documented truthfully.
- **Ihsān**: PR includes impact + harm minimization notes.

---

## Appendix A — Recommended repo conventions (SNR-first)
- Declare the canonical workflows in README.
- Add PR template: “Risk / Security / Performance / Ethics / Rollback”.
- Keep docs as “one-pagers” linked to deeper references.
