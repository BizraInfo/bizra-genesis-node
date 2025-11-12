# Flagship Proof Pack — BIZRA

This bundle provides **drop-in** guardrails, verification, and evidence scripts to upgrade the platform to an **undisputed North Star** posture.

## Quick Start
1) Commit policies, rollouts, alerts, CI/CD changes in a `hardening` branch.
2) Enable Kyverno (or Gatekeeper), Argo Rollouts, Prometheus.
3) Run the assurance drills below and capture artifacts.

## Assurance Drills
- **Signature Enforcement**: attempt to deploy an unsigned image → expect admission **denied**.
- **Policy Deny**: deploy pod using `:latest` and privileged → expect **blocked**.
- **Canary Auto-Rollback**: ship a synthetic faulty build → Rollouts reverts automatically.
- **Burn-Rate Page**: induce 5xx to exceed fast burn → on-call paged in <2m.
- **DR Drill**: `dr/restore-check.sh` restores & validates service in isolated ns.
- **Chaos**: apply `chaos/latency-injection.yaml` and `chaos/pod-kill.yaml`; observe no SLO breach.

Each drill generates **evidence** (logs, screenshots, rollout history) to attach to the Release Evidence page.
