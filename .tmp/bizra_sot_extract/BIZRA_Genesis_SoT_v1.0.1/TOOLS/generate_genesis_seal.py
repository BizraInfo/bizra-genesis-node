#!/usr/bin/env python3
"""
generate_genesis_seal.py
Creates deterministic genesis seal over CANON/SOT_MANIFEST.yaml includes.

Usage:
  python TOOLS/generate_genesis_seal.py
"""
from __future__ import annotations
import subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main() -> int:
    # Delegate to verify tool with --write-seal so there is one source of truth.
    cmd = [sys.executable, str(ROOT / "TOOLS" / "verify_sot.py"), "--write-seal"]
    return subprocess.call(cmd)

if __name__ == "__main__":
    raise SystemExit(main())
