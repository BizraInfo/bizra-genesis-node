# Architecture Scanner Summary

- Files scanned: 14
- Generated: 2025-11-29T12:54:17.216Z

## 🔒 Security Hotspots

**Total Detected:** 2
**Average Confidence:** 86.7%


### High Severity (2)

- **unsafe_code** in `architecture-scanner\src\parsers\rust.ts:91`
  - Risk: runtime_crash
  - Confidence: 80%
  - Evidence: `while ((match = patternRegex.exec(content)) !== null) {
      const lineNum = c...`
- **unsafe_code** in `architecture-scanner\src\parsers\rust.ts:108`
  - Risk: runtime_crash
  - Confidence: 80%
  - Evidence: `while ((match = patternRegex.exec(content)) !== null) {
      const lineNum = c...`






## ⚡ Performance Bottlenecks

**Total Detected:** 1

### High Severity (1)

- **large_god_module** in `architecture-scanner\src\audit-report-generator.ts:1`
  - Impact: maintainability
  - Confidence: 100%
  - Evidence: `Component has 369 lines of code (threshold: 300)...`







## Integration Surface

- Database: 2 files
- HTTP/WebSocket: 4 files
- LLM/AI: 2 files
- Observability: 5 files

## Hotspots (Top 10)

- C:\bizra-genesis-node\tools\architecture-scanner\src\index.ts (score 15)
- C:\bizra-genesis-node\tools\architecture-scanner\src\parsers\rust.ts (score 15)
- C:\bizra-genesis-node\tools\architecture-scanner\src\parsers\ts.ts (score 15)
- C:\bizra-genesis-node\tools\perf\compare-k6.js (score 5)
- C:\bizra-genesis-node\tools\architecture-scanner\exporter\prometheus-export.ts (score 5)
- C:\bizra-genesis-node\tools\perf\k6\regression.js (score 5)
- C:\bizra-genesis-node\tools\perf\k6\smoke.js (score 5)

---

**Audit Quality Metrics:**
- Overall Confidence: 86.7%
- False Positive Estimate: <13.3%
- Total Patterns: 21 audit-grade detection rules (13 security + 8 performance)
