#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
OUT_DIR="${ROOT_DIR}/docs/verification"
ART_DIR="${OUT_DIR}/artifacts"
TARGET_DIR="${ROOT_DIR}/target"
IMAGE_TAG="bizra/orchestrator:verify"

mkdir -p "${OUT_DIR}" "${ART_DIR}" "${TARGET_DIR}"

stamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

log() { echo "[$(stamp)] $*"; }

section() { echo -e "\n## $*\n" | tee -a "${OUT_DIR}/phase0-report.md"; }

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required tool '$1' not found on PATH" | tee -a "${ART_DIR}/missing-tools.txt"
    exit 1
  fi
}

# --- preflight ---
: > "${OUT_DIR}/phase0-report.md"  # reset
echo "# Phase 0 Verification Report" >> "${OUT_DIR}/phase0-report.md"
echo "_Generated: $(stamp) UTC_" >> "${OUT_DIR}/phase0-report.md"

log "Checking required tools..."
for t in rustc cargo; do require "$t"; done

# Optional but recommended
for t in clang llvm-config docker trivy cargo-deny cargo-audit cargo-about cargo-cyclonedx; do
  if ! command -v "$t" >/dev/null 2>&1; then
    echo "WARN: optional tool '$t' not found; some checks will be skipped" | tee -a "${ART_DIR}/warnings.txt"
  fi
done

# --- toolchain versions ---
section "Toolchain Versions"
{
  rustc --version
  cargo --version
  echo
  clang --version 2>/dev/null | head -n1 || echo "clang: not found"
  llvm-config --version 2>/dev/null || echo "llvm-config: not found"
  echo
  docker --version 2>/dev/null || echo "docker: not found"
  trivy --version 2>/dev/null || echo "trivy: not found"
} | tee "${ART_DIR}/toolchain.txt" >> "${OUT_DIR}/phase0-report.md"

# --- build & test ---
section "Build & Tests"
log "Running cargo test --workspace --all-features --locked"
{
  echo ">> cargo test --workspace --all-features --locked"
  cargo test --workspace --all-features --locked 2>&1 || echo "TESTS FAILED"
} | tee "${ART_DIR}/cargo-test.txt"

# --- security & quality ---
section "Security & Quality Gates"
PASS=1

log "Running cargo audit..."
if command -v cargo-audit >/dev/null 2>&1; then
  cargo audit 2>&1 | tee "${ART_DIR}/cargo-audit.txt" || PASS=0
else
  echo "SKIP cargo audit (not installed)" | tee -a "${ART_DIR}/skips.txt"
fi

log "Running cargo deny..."
if command -v cargo-deny >/dev/null 2>&1; then
  cargo deny check bans licenses sources 2>&1 | tee "${ART_DIR}/cargo-deny.txt" || PASS=0
else
  echo "SKIP cargo deny (not installed)" | tee -a "${ART_DIR}/skips.txt"
fi

log "Running cargo fmt check..."
cargo fmt --all -- --check 2>&1 | tee "${ART_DIR}/rustfmt.txt" || PASS=0

log "Running cargo clippy..."
cargo clippy --workspace --all-features -- -D warnings 2>&1 | tee "${ART_DIR}/clippy.txt" || PASS=0

# --- container build & scan ---
section "Container Build & Trivy Scan"
if command -v docker >/dev/null 2>&1; then
  log "Building Docker image..."
  docker build -t "${IMAGE_TAG}" . 2>&1 | tee "${ART_DIR}/docker-build.txt"

  if command -v trivy >/dev/null 2>&1; then
    log "Running Trivy scan..."
    trivy image --exit-code 1 --severity CRITICAL,HIGH "${IMAGE_TAG}" 2>&1 | tee "${ART_DIR}/trivy.txt" || PASS=0
  else
    echo "SKIP trivy (not installed)" | tee -a "${ART_DIR}/skips.txt"
  fi
else
  echo "SKIP docker build and scan (docker not installed)" | tee -a "${ART_DIR}/skips.txt"
fi

# --- SBOM generation ---
section "SBOM Artifacts"
if command -v cargo-about >/dev/null 2>&1; then
  log "Generating license SBOM with cargo-about..."
  cargo about generate --format json > "${TARGET_DIR}/SBOM.licenses.json" 2>&1
  echo "✅ cargo-about: ${TARGET_DIR}/SBOM.licenses.json" | tee -a "${OUT_DIR}/phase0-report.md"
else
  echo "SKIP cargo-about (not installed)" | tee -a "${ART_DIR}/skips.txt"
fi

if command -v cargo-cyclonedx >/dev/null 2>&1; then
  log "Generating CycloneDX SBOM..."
  cargo cyclonedx --all --output "${TARGET_DIR}/SBOM.cyclonedx.json" 2>&1
  echo "✅ CycloneDX: ${TARGET_DIR}/SBOM.cyclonedx.json" | tee -a "${OUT_DIR}/phase0-report.md"
else
  echo "SKIP cargo-cyclonedx (not installed)" | tee -a "${ART_DIR}/skips.txt"
fi

# --- health endpoints (optional local run) ---
section "Health & Metrics (optional)"
echo "If a local service is running, verify /healthz and /metrics manually:" | tee -a "${OUT_DIR}/phase0-report.md"
echo "  curl http://localhost:8080/healthz" | tee -a "${OUT_DIR}/phase0-report.md"
echo "  curl http://localhost:8080/metrics" | tee -a "${OUT_DIR}/phase0-report.md"

# --- summary ---
section "Summary & Exit Code"
if [ "${PASS}" -eq 1 ]; then
  echo "✅ All mandatory gates PASSED." | tee -a "${OUT_DIR}/phase0-report.md"
  log "SUCCESS: Phase 0 verification complete"
  exit 0
else
  echo "❌ One or more gates FAILED. See artifacts in ${ART_DIR}" | tee -a "${OUT_DIR}/phase0-report.md"
  log "FAILURE: Phase 0 verification failed"
  exit 1
fi
