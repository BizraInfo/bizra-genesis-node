#!/usr/bin/env python3
import sys
import xml.etree.ElementTree as ET

if len(sys.argv) != 3:
    print(f"Usage: {sys.argv[0]} <tarpaulin-report.xml> <threshold-percent>")
    sys.exit(2)

report_path = sys.argv[1]
threshold = float(sys.argv[2])

try:
    tree = ET.parse(report_path)
    root = tree.getroot()
except Exception as e:
    print(f"❌ Failed to parse coverage report '{report_path}': {e}")
    sys.exit(2)

# Tarpaulin Cobertura-style root: line-rate is 0.0–1.0
line_rate = root.attrib.get("line-rate")
if line_rate is None:
    print("❌ Coverage report missing 'line-rate' attribute on root element")
    sys.exit(2)

coverage = float(line_rate) * 100.0

if coverage < threshold:
    print(f"❌ Coverage {coverage:.1f}% below threshold {threshold:.1f}%")
    sys.exit(1)

print(f"✅ Coverage {coverage:.1f}% meets/exceeds threshold {threshold:.1f}%")
sys.exit(0)
