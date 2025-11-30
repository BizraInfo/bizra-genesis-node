# BIZRA Genesis Operations Directory

This directory contains operational scripts and utilities for the BIZRA Genesis Node.

## Canonical Ignition Protocol

The primary entry point for all Genesis Node operations is the **Ignition Protocol**:

```bash
ops/ignite.sh [MODE] [OPTIONS]
```

### Quick Start

```bash
# Start the full stack
ops/ignite.sh

# Development mode with live reload
ops/ignite.sh dev

# Production mode with monitoring
ops/ignite.sh prod

# Start just the Kernel (Rust backend)
ops/ignite.sh kernel --logs

# Clean start of database services
ops/ignite.sh database --clean
```

### Architecture Layers

The ignition protocol aligns with the BIZRA Manifest's three-tier architecture:

| Layer | Mode | Description | Location |
|:------|:-----|:------------|:---------|
| **Kernel** | `kernel` | Rust cognitive engine | `src/` |
| **Nervous System** | `nervous` | Node.js orchestration | `backend/` |
| **Visual Cortex** | `cortex` | React dashboard | `apps/dashboard/` |

### Available Modes

- **`full`** - Complete three-tier stack (default)
- **`kernel`** - Rust backend services only
- **`nervous`** - Node.js orchestration layer (currently integrated)
- **`cortex`** - React dashboard only
- **`dev`** - Development mode (hot reload enabled)
- **`prod`** - Production mode with monitoring
- **`database`** - Database services (PostgreSQL, Redis, RocksDB)
- **`monitoring`** - Monitoring stack (Prometheus, Grafana)
- **`test`** - Run test suite without external services

### Options

- **`--detach`** - Run containers in background
- **`--build`** - Rebuild containers before starting
- **`--logs`** - Tail logs after starting (only without --detach)
- **`--clean`** - Clean volumes before starting (fresh state)
- **`--help`** - Show detailed help message

### Examples

```bash
# Full stack with clean volumes
ops/ignite.sh full --clean

# Dev mode with rebuild and log following
ops/ignite.sh dev --build --logs

# Production mode in background
ops/ignite.sh prod --detach

# Test mode (no Docker, just Rust tests)
ops/ignite.sh test
```

### Manifest Alignment

This ignition protocol implements the canonical startup sequence described in the BIZRA Manifest. It provides a unified interface to the various docker-compose configurations while using Manifest-aligned terminology.

For detailed architecture documentation, see:
- **BIZRA_MANIFEST_FINAL_PUBLIC.md** - Public-facing architectural vision
- **BIZRA_IMPLEMENTATION_COMPANION_v1.0.md** - Implementation reality mapping

### Future Enhancements

When the architecture evolves to full three-tier separation:

1. **Nervous System Mode** will start dedicated Node.js orchestration
2. **BlockTree** integration when implemented
3. **Multi-region** deployment support
4. **Health check** integration with ignition sequence

---

**Created:** 2025-11-24
**Purpose:** Canonical operational interface aligned with BIZRA Manifest
**Status:** Production-ready
