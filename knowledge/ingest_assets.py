#!/usr/bin/env python3
"""
BIZRA Asset Miner v2.0 — Multi-Root, Deduplicating Gold Mine Scanner
=====================================================================
Designed for Choau (Node0 Homebase) where 1.7 TB of wisdom is scattered
across many folders. Scans multiple roots, skips duplicates, and outputs
a single unified ASSET_INVENTORY.json for downstream RAG.
"""

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Set


KNOWLEDGE_DIR = Path(__file__).parent
DEFAULT_OUTPUT_PATH = KNOWLEDGE_DIR / "ASSET_INVENTORY.json"

EXTENSIONS_OF_INTEREST: dict[str, str] = {
    ".md": "Documentation",
    ".txt": "Notes",
    ".pdf": "Documents",
    ".doc": "Documents",
    ".docx": "Documents",
    ".xls": "Spreadsheet",
    ".xlsx": "Spreadsheet",
    ".csv": "Data",
    ".ts": "Code (TypeScript)",
    ".tsx": "Code (React)",
    ".js": "Code (JavaScript)",
    ".jsx": "Code (React)",
    ".rs": "Code (Rust)",
    ".py": "Code (Python)",
    ".go": "Code (Go)",
    ".java": "Code (Java)",
    ".c": "Code (C)",
    ".cpp": "Code (C++)",
    ".h": "Code (Header)",
    ".json": "Data",
    ".yaml": "Config",
    ".yml": "Config",
    ".toml": "Config",
    ".html": "Design",
    ".css": "Style",
    ".sql": "Database",
    ".sh": "Script",
    ".bat": "Script",
    ".ps1": "Script",
    ".ipynb": "Notebook",
}

DEFAULT_SKIP_DIRS: Set[str] = {
    ".git",
    ".next",
    ".turbo",
    ".cache",
    "__pycache__",
    "node_modules",
    "target",
    "dist",
    "build",
    "coverage",
    "venv",
    ".venv",
    ".idea",
    ".vscode",
    "$RECYCLE.BIN",
    "System Volume Information",
    "Windows",
    "Program Files",
    "Program Files (x86)",
    "ProgramData",
    "AppData",
}


def _parse_extensions_csv(value: str) -> set[str]:
    items = [v.strip().lower() for v in value.split(",") if v.strip()]
    normalized: set[str] = set()
    for item in items:
        if not item:
            continue
        if not item.startswith("."):
            item = f".{item}"
        normalized.add(item)
    return normalized


def _fast_file_hash(path: Path, chunk_size: int = 65536) -> str:
    """Compute a fast hash (first+last chunks + size) for dedup without reading entire file."""
    try:
        size = path.stat().st_size
        if size == 0:
            return f"empty-{path.name}"
        h = hashlib.blake2b(digest_size=16)
        h.update(str(size).encode())
        with open(path, "rb") as f:
            first = f.read(chunk_size)
            h.update(first)
            if size > chunk_size * 2:
                f.seek(-chunk_size, 2)
                last = f.read(chunk_size)
                h.update(last)
        return h.hexdigest()
    except Exception:
        return ""

class AssetMiner:
    """
    Multi-root, deduplicating asset scanner for scattered homebase data.
    """

    def __init__(
        self,
        *,
        extensions_of_interest: Dict[str, str] | None = None,
        skip_dirs: Set[str] | None = None,
        max_depth: int | None = None,
        max_files: int | None = None,
        deduplicate: bool = True,
    ):
        self.assets: List[Dict[str, Any]] = []
        self.extensions_of_interest = extensions_of_interest or EXTENSIONS_OF_INTEREST
        self.skip_dirs = skip_dirs or DEFAULT_SKIP_DIRS
        self.stats = {ext: 0 for ext in self.extensions_of_interest}
        self.total_size = 0
        self.start_time = time.time()
        self.max_depth = max_depth
        self.max_files = max_files
        self.files_seen = 0
        self.dirs_seen = 0
        self.deduplicate = deduplicate
        self.seen_hashes: Set[str] = set()
        self.duplicates_skipped = 0
        self.roots_scanned: List[str] = []
        self._stopped = False

    def scan_directory(self, path: Path, *, depth: int = 0):
        """Recursively scans the directory for valuable assets."""
        if self._stopped:
            return
        if self.max_depth is not None and depth > self.max_depth:
            return

        self.dirs_seen += 1
        if self.dirs_seen % 500 == 0:
            elapsed = max(0.001, time.time() - self.start_time)
            rate = self.files_seen / elapsed
            print(
                f"... progress: dirs={self.dirs_seen:,} files={self.files_seen:,} "
                f"assets={len(self.assets):,} dupes_skipped={self.duplicates_skipped:,} ({rate:.1f} files/s)",
                flush=True,
            )

        try:
            for entry in os.scandir(path):
                if self._stopped:
                    return
                if entry.is_dir(follow_symlinks=False):
                    if entry.name.startswith(".") or entry.name in self.skip_dirs:
                        continue
                    self.scan_directory(Path(entry.path), depth=depth + 1)
                elif entry.is_file(follow_symlinks=False):
                    self.files_seen += 1
                    if self.max_files is not None and self.files_seen > self.max_files:
                        self._stopped = True
                        print(f"... max-files limit reached ({self.max_files})")
                        return
                    self._process_file(Path(entry.path))
        except PermissionError:
            pass  # silently skip inaccessible dirs
        except OSError:
            pass

    def _process_file(self, file_path: Path):
        """Analyzes a single file to determine its asset value."""
        ext = file_path.suffix.lower()
        if ext not in self.extensions_of_interest:
            return
        try:
            stats = file_path.stat()
            size = stats.st_size
            modified = stats.st_mtime

            # deduplication via fast hash
            if self.deduplicate:
                fhash = _fast_file_hash(file_path)
                if fhash and fhash in self.seen_hashes:
                    self.duplicates_skipped += 1
                    return
                if fhash:
                    self.seen_hashes.add(fhash)

            asset = {
                "name": file_path.name,
                "path": str(file_path),
                "type": self.extensions_of_interest[ext],
                "size_bytes": size,
                "modified_timestamp": modified,
                "value_score": self._calculate_value_score(file_path, size),
            }

            self.assets.append(asset)
            self.stats[ext] = self.stats.get(ext, 0) + 1
            self.total_size += size

        except Exception:
            pass  # skip unreadable files silently

    def _calculate_value_score(self, path: Path, size: int) -> int:
        """Heuristic to estimate the 'value' of a file."""
        score = 1
        name = path.name.lower()
        
        # High value keywords
        if 'architecture' in name: score += 5
        if 'roadmap' in name: score += 5
        if 'plan' in name: score += 3
        if 'api' in name: score += 3
        if 'secret' in name or 'key' in name: score += 10 # Security risk, but high value
        
        # Code is valuable
        if path.suffix in ['.ts', '.rs', '.py']: score += 2
        
        return score

    def save_report(self, *, output_path: Path):
        """Saves the asset inventory to a JSON file."""
        elapsed = time.time() - self.start_time
        report = {
            "scan_timestamp": time.time(),
            "duration_seconds": elapsed,
            "roots_scanned": self.roots_scanned,
            "total_assets_found": len(self.assets),
            "duplicates_skipped": self.duplicates_skipped,
            "total_size_bytes": self.total_size,
            "asset_breakdown": {k: v for k, v in self.stats.items() if v > 0},
            "top_valuable_assets": sorted(self.assets, key=lambda x: x["value_score"], reverse=True)[:50],
            "inventory": self.assets,
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        print(f"\n{'='*60}")
        print("  BIZRA ASSET MINER — SCAN COMPLETE")
        print(f"{'='*60}")
        print(f"  Roots Scanned:       {len(self.roots_scanned)}")
        print(f"  Directories Visited: {self.dirs_seen:,}")
        print(f"  Files Seen:          {self.files_seen:,}")
        print(f"  Assets Indexed:      {len(self.assets):,}")
        print(f"  Duplicates Skipped:  {self.duplicates_skipped:,}")
        print(f"  Total Size:          {self.total_size / (1024*1024*1024):.2f} GB")
        print(f"  Duration:            {elapsed:.1f}s")
        print(f"  Report:              {output_path}")
        print(f"{'='*60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="BIZRA Asset Miner v2.0 — Multi-root, deduplicating gold mine scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scan multiple roots (your scattered data):
  python ingest_assets.py --root "C:\\Projects" --root "D:\\Bizra" --root "E:\\Archive"

  # Bounded scan for huge folders:
  python ingest_assets.py --root "C:\\bizra-genesis-node-repaired" --max-depth 10 --max-files 200000

  # Signal-first (docs only):
  python ingest_assets.py --root "C:\\Data" --extensions "md,txt,pdf,docx"
""",
    )
    parser.add_argument(
        "--root",
        action="append",
        dest="roots",
        default=[],
        help="Root directory to scan (repeatable for multi-root)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(DEFAULT_OUTPUT_PATH),
        help="Output JSON path for the inventory report",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=None,
        help="Optional recursion depth limit (useful for huge repos)",
    )
    parser.add_argument(
        "--max-files",
        type=int,
        default=None,
        help="Optional hard stop after scanning N files",
    )
    parser.add_argument(
        "--skip-dir",
        action="append",
        default=[],
        help="Add a directory name to skip (repeatable), e.g. --skip-dir .git",
    )
    parser.add_argument(
        "--extensions",
        type=str,
        default=None,
        help="Comma-separated extensions to include (overrides defaults), e.g. md,txt,py",
    )
    parser.add_argument(
        "--no-dedup",
        action="store_true",
        help="Disable deduplication (faster but may include duplicates)",
    )
    args = parser.parse_args()

    if not args.roots:
        print("ERROR: at least one --root is required for safety on large machines.")
        print('Example: python ingest_assets.py --root "C:\\Projects" --root "D:\\Bizra"')
        sys.exit(2)

    roots = [Path(r).expanduser() for r in args.roots]
    output_path = Path(args.output).expanduser()

    missing = [r for r in roots if not r.exists()]
    if missing:
        print(f"ERROR: root path(s) do not exist: {missing}")
        sys.exit(2)

    extensions_of_interest = EXTENSIONS_OF_INTEREST
    if args.extensions:
        selected = _parse_extensions_csv(args.extensions)
        extensions_of_interest = {ext: EXTENSIONS_OF_INTEREST.get(ext, "Other") for ext in selected}

    skip_dirs = set(DEFAULT_SKIP_DIRS)
    for item in args.skip_dir:
        if item:
            skip_dirs.add(item.strip())

    print("=" * 60)
    print("  BIZRA ASSET MINER v2.0 — Multi-Root Gold Mine Scanner")
    print("=" * 60)
    print(f"  Roots:      {len(roots)}")
    for r in roots:
        print(f"              - {r}")
    print(f"  Output:     {output_path}")
    if args.max_depth is not None:
        print(f"  MaxDepth:   {args.max_depth}")
    if args.max_files is not None:
        print(f"  MaxFiles:   {args.max_files}")
    if args.extensions:
        print(f"  Extensions: {', '.join(sorted(extensions_of_interest.keys()))}")
    if args.skip_dir:
        print(f"  SkipDirs:   {', '.join(args.skip_dir)}")
    print(f"  Dedup:      {not args.no_dedup}")
    print("=" * 60)
    print()

    miner = AssetMiner(
        extensions_of_interest=extensions_of_interest,
        skip_dirs=skip_dirs,
        max_depth=args.max_depth,
        max_files=args.max_files,
        deduplicate=not args.no_dedup,
    )

    for root in roots:
        print(f">>> Scanning root: {root}")
        miner.roots_scanned.append(str(root))
        miner.scan_directory(root)
        if miner._stopped:
            break

    miner.save_report(output_path=output_path)
