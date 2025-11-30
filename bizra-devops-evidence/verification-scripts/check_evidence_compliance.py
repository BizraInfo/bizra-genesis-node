#!/usr/bin/env python3
"""
BIZRA DevOps Evidence Compliance Checker

Validates that claimed DevOps capabilities have corresponding evidence artifacts.
Maps claims to artifacts and produces verification reports for audits.

Usage:
    python check_evidence_compliance.py --summary
    python check_evidence_compliance.py --full-audit
    python check_evidence_compliance.py --full-audit --output reports/audit.json
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Fix Windows console encoding for Unicode symbols
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Optional YAML support
try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


# Repository root (parent of verification-scripts)
ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "verification-scripts" / "config" / "criteria.yaml"
INDEX_PATH = ROOT / "EVIDENCE_INDEX.md"


def load_criteria() -> dict[str, Any]:
    """Load claim criteria from YAML configuration."""
    if not CONFIG_PATH.exists():
        print(f"Warning: Config file not found at {CONFIG_PATH}", file=sys.stderr)
        return {}

    if not YAML_AVAILABLE:
        print("Warning: PyYAML not installed. Run: pip install pyyaml", file=sys.stderr)
        return {}

    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def artifact_exists(path: str) -> bool:
    """Check if an evidence artifact exists at the given path."""
    full_path = ROOT / path
    return full_path.exists()


def artifact_has_content(path: str, min_bytes: int = 100) -> bool:
    """Check if artifact exists and has meaningful content."""
    full_path = ROOT / path
    if not full_path.exists():
        return False

    if full_path.is_dir():
        # For directories, check if they contain any files
        return any(full_path.iterdir())

    # For files, check minimum size
    return full_path.stat().st_size >= min_bytes


def evaluate_claim(claim_id: str, config: dict[str, Any]) -> dict[str, Any]:
    """Evaluate a single claim against its required evidence."""
    required_paths = config.get("paths", [])
    severity = config.get("severity", "standard")
    min_content_bytes = config.get("min_content_bytes", 100)

    missing = []
    empty = []
    found = []

    for path in required_paths:
        if not artifact_exists(path):
            missing.append(path)
        elif not artifact_has_content(path, min_content_bytes):
            empty.append(path)
        else:
            found.append(path)

    # Determine status
    if missing:
        status = "not_implemented"
        symbol = "\u274c"  # Red X
    elif empty:
        status = "partial"
        symbol = "\u26a0\ufe0f"  # Warning
    else:
        status = "verified"
        symbol = "\u2705"  # Green check

    return {
        "id": claim_id,
        "description": config.get("description", ""),
        "category": config.get("category", "unknown"),
        "severity": severity,
        "status": status,
        "symbol": symbol,
        "required_paths": required_paths,
        "found": found,
        "missing": missing,
        "empty": empty,
    }


def evaluate_all_claims(criteria: dict[str, Any]) -> tuple[list[dict], dict[str, Any]]:
    """Evaluate all claims and compute summary statistics."""
    results = []

    claims = criteria.get("claims", {})

    for claim_id, config in claims.items():
        result = evaluate_claim(claim_id, config)
        results.append(result)

    # Compute statistics
    total = len(results)
    verified = sum(1 for r in results if r["status"] == "verified")
    partial = sum(1 for r in results if r["status"] == "partial")
    not_implemented = sum(1 for r in results if r["status"] == "not_implemented")

    verification_rate = (verified / total * 100) if total > 0 else 0.0

    # Group by category
    by_category = {}
    for r in results:
        cat = r["category"]
        if cat not in by_category:
            by_category[cat] = {"verified": 0, "partial": 0, "not_implemented": 0}
        by_category[cat][r["status"]] += 1

    stats = {
        "total_claims": total,
        "verified": verified,
        "partial": partial,
        "not_implemented": not_implemented,
        "verification_rate": verification_rate,
        "by_category": by_category,
        "audit_timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }

    return results, stats


def print_summary(results: list[dict], stats: dict[str, Any]) -> None:
    """Print human-readable summary to console."""
    print()
    print("=" * 60)
    print("  BIZRA DEVOPS EVIDENCE AUDIT")
    print("=" * 60)
    print()
    print(f"  Audit Time: {stats['audit_timestamp']}")
    print()

    # Group results by category
    categories = {}
    for r in results:
        cat = r["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(r)

    for category, claims in sorted(categories.items()):
        print(f"\n  [{category.upper()}]")
        print("  " + "-" * 40)
        for r in claims:
            print(f"  {r['symbol']} {r['id']}: {r['description']}")
            if r["missing"]:
                for path in r["missing"]:
                    print(f"       Missing: {path}")
            if r["empty"]:
                for path in r["empty"]:
                    print(f"       Empty: {path}")

    print()
    print("=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print()
    print(f"  Total Claims:      {stats['total_claims']}")
    print(f"  Verified:          {stats['verified']} \u2705")
    print(f"  Partial:           {stats['partial']} \u26a0\ufe0f")
    print(f"  Not Implemented:   {stats['not_implemented']} \u274c")
    print()
    print(f"  Verification Rate: {stats['verification_rate']:.1f}%")
    print()

    # Category breakdown
    print("  By Category:")
    for cat, counts in sorted(stats["by_category"].items()):
        total_cat = sum(counts.values())
        verified_cat = counts["verified"]
        rate = (verified_cat / total_cat * 100) if total_cat > 0 else 0
        print(f"    {cat}: {verified_cat}/{total_cat} ({rate:.0f}%)")

    print()
    print("=" * 60)
    print()


def generate_report(results: list[dict], stats: dict[str, Any]) -> dict[str, Any]:
    """Generate full audit report as dictionary."""
    return {
        "meta": {
            "system": "BIZRA Genesis Node - DevOps Evidence Dossier",
            "version": "1.0.0",
            "generated_at": stats["audit_timestamp"],
            "generator": "check_evidence_compliance.py",
        },
        "summary": {
            "total_claims": stats["total_claims"],
            "verified": stats["verified"],
            "partial": stats["partial"],
            "not_implemented": stats["not_implemented"],
            "verification_rate": stats["verification_rate"],
            "by_category": stats["by_category"],
        },
        "claims": results,
    }


def main():
    parser = argparse.ArgumentParser(
        description="BIZRA DevOps Evidence Compliance Checker"
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Print human-readable summary"
    )
    parser.add_argument(
        "--full-audit",
        action="store_true",
        help="Generate full audit report"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Output file path for full audit report (JSON)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output summary as JSON instead of text"
    )

    args = parser.parse_args()

    # Load criteria
    criteria = load_criteria()

    if not criteria.get("claims"):
        print("Error: No claims found in criteria configuration.", file=sys.stderr)
        print(f"Expected config at: {CONFIG_PATH}", file=sys.stderr)
        sys.exit(1)

    # Evaluate all claims
    results, stats = evaluate_all_claims(criteria)

    # Output based on flags
    if args.summary or (not args.full_audit and not args.json):
        print_summary(results, stats)

    if args.json and not args.full_audit:
        print(json.dumps(stats, indent=2))

    if args.full_audit:
        report = generate_report(results, stats)

        if args.output:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with output_path.open("w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
            print(f"Full audit report written to: {output_path}")
        else:
            print(json.dumps(report, indent=2))

    # Exit with code based on verification rate
    if stats["verification_rate"] < 50:
        sys.exit(2)  # Critical - less than 50%
    elif stats["verification_rate"] < 80:
        sys.exit(1)  # Warning - less than 80%
    else:
        sys.exit(0)  # Success


if __name__ == "__main__":
    main()
