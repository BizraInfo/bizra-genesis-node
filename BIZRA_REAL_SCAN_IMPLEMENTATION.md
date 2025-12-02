# BIZRA Genesis Node: Real System Scan Implementation

## Overview
This document details the transition from "Simulated" environment detection to "Real" hardware scanning within the BIZRA Installer. This ensures that every Genesis Node is tailored to the specific physical reality of the user's machine.

## 1. True System Scanning (Web Native)
We have replaced the mock random data generator with a sophisticated browser-based probing engine.

### Capabilities
| Component | Detection Method | Real Data Point |
|-----------|------------------|-----------------|
| **CPU** | `navigator.hardwareConcurrency` | Physical Core Count |
| **RAM** | `navigator.deviceMemory` | Approximate GB (capped by browser privacy) |
| **GPU** | `WebGLRenderer` | Vendor (NVIDIA/AMD) & Renderer Name |
| **Storage** | `navigator.storage.estimate()` | Available Quota & Usage |
| **Network** | `navigator.connection` | Effective Type (4G) & Downlink Speed |
| **OS** | `navigator.userAgent` | Operating System Platform |

### Implementation
Located in `apps/dashboard/src/app/installer/page.tsx`, the `runSystemScan` function now executes a 4-phase analysis:
1. **Environment Phase**: OS & CPU Core detection.
2. **Memory Phase**: RAM approximation & Storage quota estimation.
3. **Graphics Phase**: WebGL context creation to query GPU strings.
4. **Analysis Phase**: Synthesis of data into a `HardwareProfile`.

## 2. Real Installer Generation
The "Simulation" of installation has been replaced by a "Generator" that produces a functional PowerShell script.

### The Bootstrap Script (`.ps1`)
The installer now generates a script that:
- **Verifies Admin Privileges**: Ensures the node can bind to system ports.
- **Creates File Structure**: `C:\Program Files\BIZRA\{bin,data,config,logs}`.
- **Injects Hardware Profile**: The `bizra.json` config now includes the *actual* scanned hardware specs.
- **Deploys Node0 Runtime**: Writes a lightweight Node.js kernel (`node0-runtime.js`) to disk.
- **Creates Shortcuts**: Places "Start Node" and "Connect Network" on the desktop.

## 3. Hardware-Aware Configuration
The `bizra.json` created on the user's machine now contains:
```json
"hardware": {
    "cpu_cores": 12,
    "ram_gb": 16,
    "has_gpu": true,
    "gpu_name": "NVIDIA GeForce RTX 3080",
    "tier": "high"
}
```
This allows the BIZRA Node to optimize its AI model loading strategy based on the *actual* machine it is running on.

## Status
- **Scan Logic**: ✅ Real (Web APIs)
- **Installer**: ✅ Real (PowerShell Generation)
- **Configuration**: ✅ Dynamic (Hardware-based)
