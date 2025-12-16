#!/usr/bin/env python3
"""
BIZRA Genesis Seal Generator
- Deterministically hashes parameter files (YAML/JSON) into a single combined hash.
- Optionally signs the combined hash with an Ed25519 key.

Design goals:
- Deterministic canonicalization (same inputs -> same combined hash).
- Audit-friendly manifest with per-file hashes and sizes.
- Minimal dependencies (PyYAML + cryptography are common; both optional if you only hash raw bytes).

Usage:
  python generate_genesis_seal.py seal --params-dir . --out genesis_seal.json
  python generate_genesis_seal.py verify --seal genesis_seal.json --params-dir .

"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover
    yaml = None

try:
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
    from cryptography.hazmat.primitives import serialization
except Exception:  # pragma: no cover
    Ed25519PrivateKey = None  # type: ignore
    Ed25519PublicKey = None   # type: ignore
    serialization = None      # type: ignore


CANON_EXTS = {".yaml", ".yml", ".json"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonicalize_obj(obj: Any) -> bytes:
    """
    Canonical JSON: sort keys, no whitespace, stable floats.
    """
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def load_and_canonicalize(path: Path) -> Tuple[bytes, str]:
    """
    Returns: (canonical_bytes, canonical_sha256)
    """
    ext = path.suffix.lower()
    raw = path.read_bytes()

    if ext not in CANON_EXTS:
        # Fallback: canonical is raw bytes
        can = raw
        return can, sha256_bytes(can)

    if ext in {".yaml", ".yml"}:
        if yaml is None:
            raise RuntimeError("PyYAML is not installed but YAML canonicalization was requested.")
        obj = yaml.safe_load(raw.decode("utf-8"))
        can = canonicalize_obj(obj)
        return can, sha256_bytes(can)

    if ext == ".json":
        obj = json.loads(raw.decode("utf-8"))
        can = canonicalize_obj(obj)
        return can, sha256_bytes(can)

    # Should not reach
    can = raw
    return can, sha256_bytes(can)


def stable_file_list(params_dir: Path) -> List[Path]:
    files: List[Path] = []
    for p in params_dir.rglob("*"):
        if p.is_file() and p.name not in {"genesis_seal.json", "genesis_seal.sig", "public_key.pem", "private_key.pem"}:
            files.append(p)
    # Stable ordering by posix path
    files.sort(key=lambda x: x.as_posix())
    return files


def make_manifest(params_dir: Path, policy_version: str = "genesis_params_v1") -> Dict[str, Any]:
    files = stable_file_list(params_dir)

    entries: List[Dict[str, Any]] = []
    for p in files:
        rel = p.relative_to(params_dir).as_posix()
        raw = p.read_bytes()
        raw_hash = sha256_bytes(raw)
        can_bytes, can_hash = load_and_canonicalize(p)
        entries.append(
            {
                "path": rel,
                "size_bytes": len(raw),
                "raw_sha256": raw_hash,
                "canonical_sha256": can_hash,
                "canonicalization": "json_sorted_keys" if p.suffix.lower() in CANON_EXTS else "raw_bytes",
            }
        )

    # Combined hash: hash of concatenated canonical hashes (in stable path order)
    concatenated = "".join(e["canonical_sha256"] for e in entries).encode("utf-8")
    combined_hash = sha256_bytes(concatenated)

    manifest = {
        "schema": "bizra_genesis_seal_v1",
        "policy_version": policy_version,
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "params_dir": params_dir.resolve().as_posix(),
        "files": entries,
        "combined_hash_sha256": combined_hash,
    }
    return manifest


def ensure_ed25519_keypair(key_dir: Path) -> Tuple[Path, Path]:
    """
    Returns (private_key_path, public_key_path)
    """
    if Ed25519PrivateKey is None or serialization is None:
        raise RuntimeError("cryptography is not installed; cannot generate/sign with Ed25519.")

    priv_path = key_dir / "private_key.pem"
    pub_path = key_dir / "public_key.pem"

    if priv_path.exists() and pub_path.exists():
        return priv_path, pub_path

    key_dir.mkdir(parents=True, exist_ok=True)
    priv = Ed25519PrivateKey.generate()
    pub = priv.public_key()

    priv_bytes = priv.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub_bytes = pub.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    priv_path.write_bytes(priv_bytes)
    pub_path.write_bytes(pub_bytes)
    return priv_path, pub_path


def sign_manifest(manifest: Dict[str, Any], key_dir: Path) -> Dict[str, Any]:
    if Ed25519PrivateKey is None or serialization is None:
        raise RuntimeError("cryptography is not installed; cannot sign.")

    priv_path, pub_path = ensure_ed25519_keypair(key_dir)
    priv = serialization.load_pem_private_key(priv_path.read_bytes(), password=None)
    if not isinstance(priv, Ed25519PrivateKey):
        raise RuntimeError("Unexpected key type; expected Ed25519 private key.")

    msg = manifest["combined_hash_sha256"].encode("utf-8")
    sig = priv.sign(msg)
    manifest["signature"] = {
        "algo": "ed25519",
        "public_key_pem": pub_path.read_text(encoding="utf-8"),
        "signature_b64": base64.b64encode(sig).decode("ascii"),
        "signed_message": "combined_hash_sha256",
    }
    return manifest


def verify_seal(seal_path: Path, params_dir: Path) -> int:
    seal = json.loads(seal_path.read_text(encoding="utf-8"))
    expected = seal.get("combined_hash_sha256")
    if not expected:
        print("Seal missing combined_hash_sha256", file=sys.stderr)
        return 2

    fresh = make_manifest(params_dir, policy_version=seal.get("policy_version", "unknown"))
    got = fresh["combined_hash_sha256"]

    if got != expected:
        print("❌ VERIFY FAILED")
        print(f"expected: {expected}")
        print(f"got:      {got}")
        return 1

    # Optional signature verification
    sig = seal.get("signature")
    if sig and Ed25519PublicKey is not None and serialization is not None:
        try:
            pub_pem = sig["public_key_pem"].encode("utf-8")
            pub = serialization.load_pem_public_key(pub_pem)
            if not isinstance(pub, Ed25519PublicKey):
                raise RuntimeError("Unexpected public key type.")
            signature = base64.b64decode(sig["signature_b64"])
            pub.verify(signature, expected.encode("utf-8"))
            print("✅ VERIFY OK (hash + signature)")
        except Exception as e:
            print("⚠️  Hash matches, but signature verification FAILED:", str(e))
            return 3
    else:
        print("✅ VERIFY OK (hash)")

    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    seal = sub.add_parser("seal", help="Create a genesis seal manifest")
    seal.add_argument("--params-dir", type=str, required=True, help="Directory containing parameter files")
    seal.add_argument("--out", type=str, default="genesis_seal.json", help="Output manifest JSON path")
    seal.add_argument("--policy-version", type=str, default="genesis_params_v1", help="Policy version label")
    seal.add_argument("--sign", action="store_true", help="Sign the combined hash with Ed25519")
    seal.add_argument("--key-dir", type=str, default=".keys", help="Directory to store/load Ed25519 keys")

    ver = sub.add_parser("verify", help="Verify a genesis seal against a parameter directory")
    ver.add_argument("--seal", type=str, required=True, help="Path to genesis_seal.json")
    ver.add_argument("--params-dir", type=str, required=True, help="Directory containing parameter files")

    args = ap.parse_args()

    if args.cmd == "seal":
        params_dir = Path(args.params_dir).resolve()
        manifest = make_manifest(params_dir, policy_version=args.policy_version)
        if args.sign:
            manifest = sign_manifest(manifest, Path(args.key_dir))
        out_path = Path(args.out).resolve()
        out_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("✅ Genesis seal created")
        print("combined_hash_sha256:", manifest["combined_hash_sha256"])
        print("output:", out_path.as_posix())
        if args.sign:
            print("signature: ed25519 (embedded public key)")
        return 0

    if args.cmd == "verify":
        return verify_seal(Path(args.seal).resolve(), Path(args.params_dir).resolve())

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
