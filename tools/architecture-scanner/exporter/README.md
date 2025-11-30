# Architecture Scanner Prometheus Exporter

Serves scanner metrics in Prometheus text format at `/metrics`.

- Metrics:
  - `scanner_security_hotspots_total{severity="critical"}`
  - `scanner_performance_bottlenecks_total{severity="critical"}`

## Usage

Prerequisites: Node.js 18+

```bash
node exporter/prometheus-export.js
```

Or with ts-node:

```bash
npx ts-node exporter/prometheus-export.ts
```

Environment:

- `PORT` (default `9109`)
- `HOST` (default `0.0.0.0`)

Sources read from `tools/architecture-scanner/architecture.map.json` or `ARCHITECTURE.scanner.md`.
