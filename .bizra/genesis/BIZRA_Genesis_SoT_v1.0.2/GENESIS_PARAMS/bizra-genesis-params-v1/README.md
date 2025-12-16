# BIZRA Genesis Parameters Pack (v1)

This folder contains **DRAFT** parameter files intended to be **sealed** into a single
Genesis hash (root of trust) via `generate_genesis_seal.py`.

## Files
- `ihsan_v1.yaml` — Ihsān vector weights, metric definitions, and thresholds.
- `sape_v1.yaml` — SAPE 9-probe protocol and scoring.
- `network_multiplier_v1.yaml` — Logistic multiplier based on Ihsān + decentralization (+ SNR).
- `bzt_issuance_v1.yaml` — BZT issuance formula and caps.

## Seal flow (3-node replication, air-gapped)
1) On three independent machines:
   - Copy this folder (no network).
   - Run: `python generate_genesis_seal.py seal --params-dir .`
2) Compare the printed `combined_hash_sha256` across the three machines.
   - If all match: the parameter set is deterministic and can be adopted as Genesis v1.
   - If any mismatch: treat as a *critical* drift; stop and investigate.

## IMPORTANT
Do not claim "VERIFIED" in docs unless you can link to:
- an evidence receipt in the ledger, or
- a reproducible command output captured and sealed.
