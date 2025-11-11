#!/usr/bin/env python3
"""
Criterion Benchmark Comparison Script

Compares Criterion benchmark results between baseline and current runs.
Detects performance regressions and exits with non-zero status if threshold exceeded.

Usage:
    python scripts/compare_criterion.py \\
        --baseline baseline/criterion \\
        --current evidence/criterion \\
        --threshold 0.10
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional


class BenchmarkResult:
    """Represents a single benchmark result."""
    
    def __init__(self, name: str, mean: float, std_dev: float, unit: str = "ns"):
        self.name = name
        self.mean = mean
        self.std_dev = std_dev
        self.unit = unit
    
    def __repr__(self):
        return f"BenchmarkResult(name={self.name}, mean={self.mean:.2f}{self.unit})"


class BenchmarkComparison:
    """Compares two benchmark results and calculates regression."""
    
    def __init__(self, baseline: BenchmarkResult, current: BenchmarkResult):
        self.baseline = baseline
        self.current = current
        self.name = baseline.name
        
    @property
    def relative_change(self) -> float:
        """Calculate relative change as a ratio (positive = regression)."""
        if self.baseline.mean == 0:
            return 0.0
        return (self.current.mean - self.baseline.mean) / self.baseline.mean
    
    @property
    def percent_change(self) -> float:
        """Calculate percentage change."""
        return self.relative_change * 100
    
    @property
    def is_regression(self) -> bool:
        """True if current is slower than baseline."""
        return self.current.mean > self.baseline.mean
    
    @property
    def is_improvement(self) -> bool:
        """True if current is faster than baseline."""
        return self.current.mean < self.baseline.mean


def find_estimate_files(directory: Path) -> List[Path]:
    """Find all estimates.json files in the Criterion directory structure."""
    estimate_files = []
    
    if not directory.exists():
        print(f"Warning: Directory does not exist: {directory}")
        return estimate_files
    
    # Criterion stores results in: target/criterion/<benchmark_name>/base/estimates.json
    for estimates_file in directory.rglob("estimates.json"):
        estimate_files.append(estimates_file)
    
    return estimate_files


def parse_estimates_file(file_path: Path) -> Optional[BenchmarkResult]:
    """Parse a Criterion estimates.json file."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Extract benchmark name from path
        # Path structure: .../criterion/<benchmark_name>/<group>/estimates.json
        parts = file_path.parts
        criterion_idx = parts.index('criterion') if 'criterion' in parts else -1
        
        if criterion_idx >= 0 and criterion_idx + 1 < len(parts):
            bench_name = parts[criterion_idx + 1]
            
            # Add group name if available
            if criterion_idx + 2 < len(parts) and parts[criterion_idx + 2] != 'base':
                bench_name = f"{bench_name}/{parts[criterion_idx + 2]}"
        else:
            bench_name = file_path.parent.name
        
        # Extract mean and std_dev from estimates
        # Criterion format: {"mean": {"point_estimate": value, ...}, "std_dev": {...}}
        mean = data.get('mean', {}).get('point_estimate', 0)
        std_dev = data.get('std_dev', {}).get('point_estimate', 0)
        
        # Unit is typically nanoseconds
        unit = "ns"
        
        return BenchmarkResult(bench_name, mean, std_dev, unit)
    
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return None


def load_benchmarks(directory: Path) -> Dict[str, BenchmarkResult]:
    """Load all benchmark results from a Criterion directory."""
    benchmarks = {}
    
    estimate_files = find_estimate_files(directory)
    
    if not estimate_files:
        print(f"Warning: No benchmark estimates found in {directory}")
        return benchmarks
    
    print(f"Found {len(estimate_files)} benchmark estimate files in {directory}")
    
    for file_path in estimate_files:
        result = parse_estimates_file(file_path)
        if result:
            benchmarks[result.name] = result
    
    return benchmarks


def compare_benchmarks(
    baseline: Dict[str, BenchmarkResult],
    current: Dict[str, BenchmarkResult],
    threshold: float
) -> Tuple[List[BenchmarkComparison], bool]:
    """
    Compare baseline and current benchmarks.
    
    Returns:
        Tuple of (comparisons, has_regressions)
    """
    comparisons = []
    
    # Find common benchmarks
    common_names = set(baseline.keys()) & set(current.keys())
    
    if not common_names:
        print("Warning: No common benchmarks found between baseline and current")
        return comparisons, False
    
    print(f"\nComparing {len(common_names)} benchmarks:")
    
    for name in sorted(common_names):
        comp = BenchmarkComparison(baseline[name], current[name])
        comparisons.append(comp)
    
    # Check for regressions exceeding threshold
    has_regressions = False
    
    for comp in comparisons:
        change_pct = comp.percent_change
        threshold_pct = threshold * 100
        
        if comp.is_regression and abs(comp.relative_change) > threshold:
            has_regressions = True
            status = "❌ REGRESSION"
        elif comp.is_regression:
            status = "⚠️  SLOWER"
        elif comp.is_improvement:
            status = "✅ FASTER"
        else:
            status = "➡️  SAME"
        
        print(f"  {status:15} {comp.name:40} "
              f"{comp.baseline.mean:12.2f} -> {comp.current.mean:12.2f} ns "
              f"({change_pct:+7.2f}%)")
    
    return comparisons, has_regressions


def print_summary(comparisons: List[BenchmarkComparison], threshold: float):
    """Print a summary of benchmark comparisons."""
    if not comparisons:
        print("\nNo benchmarks to compare")
        return
    
    threshold_pct = threshold * 100
    
    total = len(comparisons)
    regressions = sum(1 for c in comparisons if c.is_regression and abs(c.relative_change) > threshold)
    minor_regressions = sum(1 for c in comparisons if c.is_regression and abs(c.relative_change) <= threshold)
    improvements = sum(1 for c in comparisons if c.is_improvement)
    
    print("\n" + "=" * 80)
    print("BENCHMARK COMPARISON SUMMARY")
    print("=" * 80)
    print(f"Total benchmarks:        {total}")
    print(f"Major regressions:       {regressions} (>{threshold_pct}% slower)")
    print(f"Minor regressions:       {minor_regressions} (<={threshold_pct}% slower)")
    print(f"Improvements:            {improvements}")
    print(f"Regression threshold:    {threshold_pct}%")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description="Compare Criterion benchmark results and detect regressions"
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        required=True,
        help="Path to baseline criterion directory"
    )
    parser.add_argument(
        "--current",
        type=Path,
        required=True,
        help="Path to current criterion directory"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.10,
        help="Regression threshold as decimal (default: 0.10 = 10%%)"
    )
    
    args = parser.parse_args()
    
    print("=" * 80)
    print("CRITERION BENCHMARK COMPARISON")
    print("=" * 80)
    print(f"Baseline:  {args.baseline}")
    print(f"Current:   {args.current}")
    print(f"Threshold: {args.threshold * 100}%")
    print("=" * 80)
    
    # Load benchmarks
    baseline_benchmarks = load_benchmarks(args.baseline)
    current_benchmarks = load_benchmarks(args.current)
    
    if not baseline_benchmarks:
        print("\n❌ No baseline benchmarks found")
        sys.exit(1)
    
    if not current_benchmarks:
        print("\n❌ No current benchmarks found")
        sys.exit(1)
    
    # Compare
    comparisons, has_regressions = compare_benchmarks(
        baseline_benchmarks,
        current_benchmarks,
        args.threshold
    )
    
    # Print summary
    print_summary(comparisons, args.threshold)
    
    # Exit with appropriate code
    if has_regressions:
        print(f"\n❌ PERFORMANCE REGRESSION DETECTED (threshold: {args.threshold * 100}%)")
        print("   Performance degradation exceeds acceptable threshold")
        sys.exit(1)
    else:
        print("\n✅ PERFORMANCE CHECK PASSED")
        print("   No significant performance regressions detected")
        sys.exit(0)


if __name__ == "__main__":
    main()
