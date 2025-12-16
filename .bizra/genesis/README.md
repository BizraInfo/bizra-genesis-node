# BIZRA Genesis — Canonical Single Source of Truth (SoT)

This directory hosts the **canonical** Genesis Single Source of Truth pack for BIZRA Block0/Node0.

## Current Canon Pack
- `.bizra/genesis/BIZRA_Genesis_SoT_v1.0.2/`

## Verify + Seal (deterministic)
Run from inside the pack directory:

- `python3 TOOLS/verify_sot.py`
- `python3 TOOLS/verify_sot.py --write-seal`

Outputs:
- `genesis_seal.json`
- `genesis_seal.sha256`

## Notes
- The verifier enforces that every file in `CANON/SOT_MANIFEST.yaml` is present in `CANON/TRUTH_INDEX.yaml`.
- For distribution, use the generated archive at `BIZRA_Genesis_SoT_v1.0.2_CANON.zip`.
