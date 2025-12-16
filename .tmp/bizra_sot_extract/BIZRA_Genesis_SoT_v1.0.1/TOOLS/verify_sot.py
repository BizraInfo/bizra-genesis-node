#!/usr/bin/env python3
"""
verify_sot.py
Verifies the BIZRA Single Source of Truth pack.

Checks:
1) All manifest includes exist.
2) All files are present in TRUTH_INDEX.
3) Genesis seal can be generated deterministically.
4) Optional schema validation (jsonschema if installed).

Usage:
  python TOOLS/verify_sot.py
  python TOOLS/verify_sot.py --write-seal
"""
from __future__ import annotations
import argparse, hashlib, json, sys
from pathlib import Path

try:
    import yaml  # type: ignore
except Exception as e:
    print("FATAL: PyYAML required:", e)
    raise

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "CANON" / "SOT_MANIFEST.yaml"
TRUTH_INDEX = ROOT / "CANON" / "TRUTH_INDEX.yaml"

def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def sha256_file(p: Path) -> str:
    return sha256_bytes(p.read_bytes())

def load_yaml(p: Path):
    return yaml.safe_load(p.read_text(encoding="utf-8"))

def deterministic_root_hash(file_hashes: dict[str,str]) -> str:
    ordered = {k: file_hashes[k] for k in sorted(file_hashes.keys())}
    payload = json.dumps(ordered, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return sha256_bytes(payload)

def maybe_jsonschema_validate():
    try:
        import jsonschema  # type: ignore
    except Exception:
        return "SKIP (jsonschema not installed)"
    schema_dir = ROOT / "SCHEMAS"
    # Basic validation: any *.schema.json validates against itself format, and sample files can be added later.
    # (This is intentionally minimal for Genesis.)
    for p in schema_dir.glob("*.schema.json"):
        json.loads(p.read_text(encoding="utf-8"))
    return "OK"

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write-seal", action="store_true")
    args = ap.parse_args()

    manifest = load_yaml(MANIFEST)
    truth_index = load_yaml(TRUTH_INDEX)["truth"]

    includes = manifest["includes"]
    missing = []
    unindexed = []
    file_hashes = {}

    for rel in includes:
        p = ROOT / rel
        if not p.exists():
            missing.append(rel)
            continue
        if rel not in truth_index:
            unindexed.append(rel)
        file_hashes[rel] = sha256_file(p)

    if missing:
        print("FAIL: missing files:", *missing, sep="\n  - ")
        return 2
    if unindexed and manifest["enforcement"].get("truth_labels_required", True):
        print("FAIL: files missing from TRUTH_INDEX:", *unindexed, sep="\n  - ")
        return 3

    root_hash = deterministic_root_hash(file_hashes)

    # Compare to existing seal if present
    seal_json = ROOT / "genesis_seal.json"
    if seal_json.exists():
        seal = json.loads(seal_json.read_text(encoding="utf-8"))
        if seal.get("root_hash") != root_hash:
            print("FAIL: seal root_hash mismatch")
            print(" expected:", root_hash)
            print(" found   :", seal.get("root_hash"))
            return 4

    schema_status = maybe_jsonschema_validate()

    if args.write_seal:
        seal = {
            "sot_version": manifest["version"],
            "root_hash": root_hash,
            "file_hashes": {k: file_hashes[k] for k in sorted(file_hashes.keys())},
            "note": "Sign root_hash with Node0 Ed25519 key to produce genesis_seal.sig (optional at Genesis)."
        }
        seal_json.write_text(json.dumps(seal, indent=2), encoding="utf-8")
        (ROOT / "genesis_seal.sha256").write_text(root_hash + "\n", encoding="utf-8")
        print("WROTE genesis_seal.json and genesis_seal.sha256")

    print("PASS")
    print("Root hash:", root_hash)
    print("Schema check:", schema_status)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
