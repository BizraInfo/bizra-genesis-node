# BIZRA Block0/Node0 — Single Source of Truth (SoT) Pack v1.0.1

This pack is intended to be checked into your repo as the **only source of truth** for Genesis (Block0/Node0).

## Recommended placement
- `.bizra/genesis/` (recommended, keeps canon isolated)
OR
- `configs/genesis/`

## Canon decisions (locked)
- Tokens: SEED (utility), BLOOM (governance). Legacy aliases BZT/BZC are deprecated.
- Sovereignty: no mandatory centralized services; pinned OSS libs allowed only with SBOM + reproducible build.

## Run locally
```bash
python TOOLS/verify_sot.py
python TOOLS/generate_genesis_seal.py
```

## CI Gate
Workflow: `.github/workflows/bizra_genesis_gate.yml`
- Verifies manifest + truth index
- Generates deterministic seal artifacts

## Signing (optional at Genesis)
Sign `genesis_seal.sha256` using Node0 Ed25519 key and store `genesis_seal.sig`.
