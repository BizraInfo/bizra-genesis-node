#!/usr/bin/env python3
import sys
import re
from typing import Tuple, List

USAGE = f"Usage: {sys.argv[0]} <bench-output.txt> <threshold-us> [name-regex]"

def to_microseconds(value: float, unit: str) -> float:
    unit = unit.lower()
    if unit.startswith("ns"):
        return value / 1000.0
    if unit.startswith("µs") or unit.startswith("us"):
        return value
    if unit.startswith("ms"):
        return value * 1000.0
    if unit.startswith("s"):
        return value * 1_000_000.0
    # default: assume microseconds
    return value

def parse_benchmarks(text: str, name_regex: str = None) -> List[Tuple[str, float]]:
    """
    Returns list of (label, value_us).
    We try to handle common Criterion formats, e.g.:

    'harmonic_synthesis time:   [244.00 ns 245.00 ns 246.00 ns]'
    or
    'harmonic_synthesis          244 ns'

    If name_regex is provided, only benchmark names matching it are considered.
    """
    name_filter = re.compile(name_regex) if name_regex else None
    results = []

    # Pattern 1: <name> ... [<val> <unit> ...]
    pattern_bracket = re.compile(
        r"^(?P<name>\S[^\[]*?)\s+.*\[(?P<val>\d+(\.\d+)?)\s*(?P<unit>ns|µs|us|ms|s)\b",
        re.MULTILINE,
    )
    # Pattern 2: <name> ... <val> <unit>
    pattern_simple = re.compile(
        r"^(?P<name>\S.*?)\s+(?P<val>\d+(\.\d+)?)\s*(?P<unit>ns|µs|us|ms|s)\b",
        re.MULTILINE,
    )

    for pattern in (pattern_bracket, pattern_simple):
        for m in pattern.finditer(text):
            name = m.group("name").strip()
            if name_filter and not name_filter.search(name):
                continue
            val = float(m.group("val"))
            unit = m.group("unit")
            us = to_microseconds(val, unit)
            results.append((name, us))

    return results

def main():
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print(USAGE)
        sys.exit(2)

    path = sys.argv[1]
    threshold_us = float(sys.argv[2])
    name_regex = sys.argv[3] if len(sys.argv) == 4 else None

    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except Exception as e:
        print(f"❌ Failed to read benchmark output '{path}': {e}")
        sys.exit(2)

    benches = parse_benchmarks(text, name_regex)
    if not benches:
        print("⚠️ No benchmarks parsed from output; check format or name filter.")
        sys.exit(2)

    worst_name, worst_val = max(benches, key=lambda x: x[1])

    if worst_val > threshold_us:
        print(f"❌ Benchmark regression: {worst_name} = {worst_val:.2f}µs "
              f"(> {threshold_us:.2f}µs threshold)")
        sys.exit(1)

    print("✅ Benchmarks within threshold. Summary:")
    for name, val in benches:
        print(f"  - {name}: {val:.2f}µs")
    sys.exit(0)

if __name__ == "__main__":
    main()
