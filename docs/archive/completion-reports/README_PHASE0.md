# Phase 0 Verification - BIZRA Genesis Node

**Status:** ⚠️ In Progress
**Last Updated:** 2025-11-13 (Dubai, UTC+4)
**Version:** 1.0.0

## Overview

Phase 0 establishes the baseline quality, security, and operational readiness of the BIZRA Genesis Node before proceeding to Phase 1 (SDLC/PMLC Documentation) and beyond.

This verification suite ensures:
- ✅ All code compiles and tests pass
- ✅ Code meets formatting and lint standards
- ✅ No critical security vulnerabilities
- ✅ Container images are secure
- ✅ Supply chain is auditable (SBOMs)
- ✅ System is ready for staging deployment

## Quick Start

### Option 1: Using Make (Recommended)

```bash
# Run complete Phase 0 verification
make phase0              # Linux/macOS/WSL
make phase0-windows      # Windows PowerShell

# Or run individual checks
make check               # Quick checks (fmt, clippy, test)
make fix                 # Auto-fix formatting and lint issues
make sbom                # Generate SBOMs
make docker-scan         # Build and scan Docker image
make phase0-clean        # Clean artifacts
```

### Option 2: Manual Scripts

**Bash (Linux/macOS/WSL):**
```bash
bash scripts/phase0-verify.sh
```

**PowerShell (Windows):**
```powershell
.\scripts\phase0-verify.ps1
```

### Option 3: CI Pipeline

Push to `main` or `develop` branch, or create a pull request. The GitHub Actions workflow will automatically run Phase 0 verification.

View results at: `.github/workflows/ci-phase0.yml`

---

## Prerequisites

### Required Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Rust** | Compiler (≥1.70) | https://rustup.rs |
| **Cargo** | Package manager | Included with Rust |

### Optional Tools (Recommended)

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Clang/LLVM** | C/C++ compiler | https://releases.llvm.org/ |
| **Docker** | Container runtime | https://docker.com/get-started |
| **Trivy** | Security scanner | https://aquasecurity.github.io/trivy/ |
| **cargo-audit** | Vulnerability DB | `cargo install cargo-audit --locked` |
| **cargo-deny** | Policy enforcement | `cargo install cargo-deny --locked` |
| **cargo-about** | License SBOM | `cargo install cargo-about --locked` |
| **cargo-cyclonedx** | Supply chain SBOM | `cargo install cargo-cyclonedx --locked` |

### Ubuntu/Debian Setup

```bash
# System dependencies
sudo apt-get update
sudo apt-get install -y clang llvm build-essential

# Rust tools
cargo install cargo-audit cargo-deny cargo-about cargo-cyclonedx --locked

# Trivy
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install -y trivy
```

### Windows Setup

```powershell
# Install Rust from https://rustup.rs

# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Install dependencies
choco install llvm docker-desktop

# Rust tools
cargo install cargo-audit cargo-deny cargo-about cargo-cyclonedx --locked

# Trivy
choco install trivy
```

---

## Verification Steps

Phase 0 runs the following checks in sequence:

### 1. Toolchain Verification
- ✅ Rust compiler version
- ✅ Cargo version
- ⚠️ Clang/LLVM (optional)
- ⚠️ Docker availability

### 2. Build & Test
```bash
cargo test --workspace --all-features --locked
```
- **Expected:** 151/151 tests passing (main crate)
- **Expected:** 5/5 unit tests passing (bizra-moe)
- **Note:** 3 bizra-moe integration tests may fail without Ollama running (this is normal)

### 3. Code Quality
```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-features -- -D warnings
```
- **Expected:** Zero formatting issues
- **Expected:** Zero clippy warnings
- **Current Status:** ❌ Needs fixes (see below)

### 4. Security Audit
```bash
cargo audit
cargo deny check bans licenses sources
```
- **Expected:** Zero critical/high vulnerabilities
- **Current Status:** ❌ 4 vulnerabilities found (see below)

### 5. Container Security
```bash
docker build -t bizra/orchestrator:verify .
trivy image --severity CRITICAL,HIGH bizra/orchestrator:verify
```
- **Expected:** Zero critical/high vulnerabilities
- **Status:** ⏳ Pending Docker availability

### 6. SBOM Generation
```bash
cargo about generate --format json > target/SBOM.licenses.json
cargo cyclonedx --all --output target/SBOM.cyclonedx.json
```
- **Expected:** Two SBOM files generated
- **Status:** ⏳ Pending tool installation

---

## Current Status & Required Actions

### ❌ Security Vulnerabilities (4 found)

#### 1. protobuf 2.28.0 (via prometheus 0.13.4)
- **Advisory:** RUSTSEC-2024-0437
- **Issue:** Uncontrolled recursion crash
- **Fix:** Update `Cargo.toml` to use prometheus ≥0.14
```toml
[dependencies]
prometheus = "0.14"
```

#### 2. ring 0.16.20 (via quinn 0.10.2)
- **Advisory:** RUSTSEC-2025-0009
- **Issue:** AES panic with overflow checking
- **Fix:** Update quinn to ≥0.11
```toml
[dependencies]
quinn = "0.11"
```

#### 3. sqlx 0.7.4
- **Advisory:** RUSTSEC-2024-0363
- **Issue:** Binary protocol misinterpretation
- **Fix:** Update to sqlx ≥0.8.1
```toml
[dependencies]
sqlx = { version = "0.8.1", features = ["postgres", "runtime-tokio-rustls"] }
```

#### 4. rsa 0.9.8 (via sqlx-mysql)
- **Advisory:** RUSTSEC-2023-0071
- **Issue:** Marvin Attack - timing sidechannel
- **Severity:** Medium (5.9)
- **Fix:** No direct fix available; will be resolved with sqlx upgrade

**Action:** Run after updating dependencies:
```bash
cargo update
cargo audit
```

### ❌ Code Formatting Issues

**Fix automatically:**
```bash
make fix
# or
cargo fmt --all
```

**Affected files:**
- benches/*.rs (import ordering)
- src/*.rs (import ordering, whitespace)

### ❌ Clippy Warning

**bizra-moe/src/lib.rs:347 - OllamaClient needs Default trait**

**Fix manually:**
```rust
impl Default for OllamaClient {
    fn default() -> Self {
        Self::new()
    }
}
```

---

## Outputs & Artifacts

After running Phase 0 verification, the following artifacts are generated:

### Reports
- `docs/verification/phase0-report.md` - Comprehensive verification report
- `docs/verification/artifacts/*.txt` - Raw command outputs

### SBOMs
- `target/SBOM.licenses.json` - License Bill of Materials
- `target/SBOM.cyclonedx.json` - CycloneDX Supply Chain BOM

### Logs
- `docs/verification/artifacts/cargo-test.txt`
- `docs/verification/artifacts/cargo-audit.txt`
- `docs/verification/artifacts/cargo-deny.txt`
- `docs/verification/artifacts/rustfmt.txt`
- `docs/verification/artifacts/clippy.txt`
- `docs/verification/artifacts/docker-build.txt`
- `docs/verification/artifacts/trivy.txt`
- `docs/verification/artifacts/toolchain.txt`

---

## CI/CD Integration

The Phase 0 verification workflow runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual trigger via GitHub Actions UI

**Workflow:** `.github/workflows/ci-phase0.yml`

**Quality Gates:**
- ✅ All tests must pass
- ✅ Zero formatting issues
- ✅ Zero clippy warnings
- ✅ Zero critical/high vulnerabilities
- ✅ Container scan passes

If any gate fails, the CI pipeline blocks the merge.

---

## Troubleshooting

### "cargo-audit not found"
```bash
cargo install cargo-audit --locked
```

### "docker: command not found"
Install Docker Desktop from https://docker.com/get-started

### "Tests failing with Ollama connection error"
This is expected. The 3 bizra-moe integration tests require Ollama running:
```bash
# Install Ollama (optional)
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
```

### "Permission denied: scripts/phase0-verify.sh"
```bash
chmod +x scripts/phase0-verify.sh
```

### "Trivy scan takes too long"
Trivy downloads vulnerability DB on first run. Subsequent runs are faster. You can also use `--skip-update` flag for cached DB.

### "cargo-about fails to generate"
Ensure you have `about.toml` configured, or use default:
```bash
cargo about init
cargo about generate --format json > target/SBOM.licenses.json
```

---

## Next Steps

Once Phase 0 verification passes (all ✅), proceed to:

### Phase 1: SDLC/PMLC Documentation (Weeks 1-2)
- Software Requirements Specification (SRS)
- Software Architecture Document (SAD)
- Architecture Decision Records (ADRs)
- Project Management Plan (PMP)
- Risk Register
- Quality Assurance Plan
- Requirements Traceability Matrix (RTM)
- Security Operations Plan
- Operational Runbooks

### Phase 2: Staging Environment (Weeks 1-2, Parallel)
- Database integration (PostgreSQL, Redis)
- Keycloak OIDC setup
- ECS Fargate deployment
- Observability stack configuration
- SLO monitoring

### Phase 3: Security & Performance Hardening (Weeks 2-3)
- OWASP ZAP baseline scan
- Load testing with k6
- Performance tuning
- Cache optimization

### Phase 4: Canary Deployment (Weeks 3-4)
- Progressive rollout (10% → 50% → 100%)
- SLO monitoring
- 7-day bake period
- Post-launch report

---

## Resources

- **BIZRA Genesis Documentation:** `docs/`
- **Environment Matrix:** `docs/ops/environments.md`
- **Phase 0 Report:** `docs/verification/phase0-report.md`
- **CI Workflow:** `.github/workflows/ci-phase0.yml`
- **Makefile Targets:** Run `make help`

---

## Support

For issues or questions:
1. Review `docs/verification/phase0-report.md` for detailed diagnostics
2. Check `docs/verification/artifacts/*.txt` for command outputs
3. Open a GitHub issue with Phase 0 verification logs
4. Contact BIZRA Engineering Team

---

**Last Verified:** 2025-11-13
**Next Review:** Before Phase 1 kickoff
**Status:** ⚠️ Needs fixes (security vulnerabilities, formatting, clippy)
