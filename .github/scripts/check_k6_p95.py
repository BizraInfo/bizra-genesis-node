#!/usr/bin/env python3
import sys
import re

USAGE = f"Usage: {sys.argv[0]} <k6-output.txt> <threshold-ms>"

def to_milliseconds(value: float, unit: str) -> float:
    unit = unit.lower()
    if unit.startswith("ms"):
        return value
    if unit == "s":
        return value * 1000.0
    if unit == "µs" or unit == "us":
        return value / 1000.0
    # default assume ms
    return value

def main():
    if len(sys.argv) != 3:
        print(USAGE)
        sys.exit(2)

    path = sys.argv[1]
    threshold_ms = float(sys.argv[2])

    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except Exception as e:
        print(f"❌ Failed to read k6 output '{path}': {e}")
        sys.exit(2)

    # Look for the http_req_duration line, then p(95)=...
    line_re = re.compile(r"^http_req_duration.*$", re.MULTILINE)
    p95_re = re.compile(r"p\(95\)=\s*(\d+(\.\d+)?)\s*(ns|µs|us|ms|s)\b")

    match_line = line_re.search(text)
    if not match_line:
        print("❌ Could not find 'http_req_duration' line in k6 output.")
        sys.exit(2)

    line = match_line.group(0)
    match_p95 = p95_re.search(line)
    if not match_p95:
        print("❌ Could not find p(95) in http_req_duration line.")
        sys.exit(2)

    val = float(match_p95.group(1))
    unit = match_p95.group(3)
    p95_ms = to_milliseconds(val, unit)

    if p95_ms > threshold_ms:
        print(f"⚠️ k6 http_req_duration p(95) = {p95_ms:.2f}ms "
              f"(> {threshold_ms:.2f}ms threshold)")
        # For warning-only gate, exit 0 so CI does not fail.
        sys.exit(0)

    print(f"✅ k6 http_req_duration p(95) = {p95_ms:.2f}ms "
          f"(<= {threshold_ms:.2f}ms threshold)")
    sys.exit(0)

if __name__ == "__main__":
    main()
