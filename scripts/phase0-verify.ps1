# Phase 0 Verification Script (PowerShell)
# BIZRA Genesis Node - Windows Native Verification

$ErrorActionPreference = "Continue"
$ROOT_DIR = Get-Location
$OUT_DIR = Join-Path $ROOT_DIR "docs\verification"
$ART_DIR = Join-Path $OUT_DIR "artifacts"
$TARGET_DIR = Join-Path $ROOT_DIR "target"
$IMAGE_TAG = "bizra/orchestrator:verify"

# Create directories
New-Item -ItemType Directory -Force -Path $OUT_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $ART_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $TARGET_DIR | Out-Null

function Get-Timestamp {
    return (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

function Write-Log {
    param($Message)
    $timestamp = Get-Timestamp
    Write-Host "[$timestamp] $Message"
}

function Write-Section {
    param($Title)
    $separator = "`n## $Title`n"
    Write-Host $separator
    Add-Content -Path (Join-Path $OUT_DIR "phase0-report.md") -Value $separator
}

function Test-CommandExists {
    param($Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Initialize report
$reportPath = Join-Path $OUT_DIR "phase0-report.md"
"# Phase 0 Verification Report" | Set-Content $reportPath
"_Generated: $(Get-Timestamp) UTC_`n" | Add-Content $reportPath

Write-Log "Starting Phase 0 verification..."

# Check required tools
Write-Log "Checking required tools..."
$requiredTools = @("rustc", "cargo")
foreach ($tool in $requiredTools) {
    if (-not (Test-CommandExists $tool)) {
        $errorMsg = "ERROR: required tool '$tool' not found on PATH"
        Write-Host $errorMsg -ForegroundColor Red
        Add-Content -Path (Join-Path $ART_DIR "missing-tools.txt") -Value $errorMsg
        exit 1
    }
}

# Check optional tools
$optionalTools = @("clang", "llvm-config", "docker", "trivy", "cargo-audit", "cargo-deny", "cargo-about", "cargo-cyclonedx")
foreach ($tool in $optionalTools) {
    if (-not (Test-CommandExists $tool)) {
        $warnMsg = "WARN: optional tool '$tool' not found; some checks will be skipped"
        Write-Host $warnMsg -ForegroundColor Yellow
        Add-Content -Path (Join-Path $ART_DIR "warnings.txt") -Value $warnMsg
    }
}

# Toolchain versions
Write-Section "Toolchain Versions"
$toolchainPath = Join-Path $ART_DIR "toolchain.txt"
@"
$(rustc --version)
$(cargo --version)

"@ | Tee-Object -FilePath $toolchainPath -Append | Add-Content $reportPath

if (Test-CommandExists "clang") {
    clang --version | Select-Object -First 1 | Tee-Object -FilePath $toolchainPath -Append | Add-Content $reportPath
} else {
    "clang: not found" | Tee-Object -FilePath $toolchainPath -Append | Add-Content $reportPath
}

if (Test-CommandExists "llvm-config") {
    llvm-config --version | Tee-Object -FilePath $toolchainPath -Append | Add-Content $reportPath
} else {
    "llvm-config: not found" | Tee-Object -FilePath $toolchainPath -Append | Add-Content $reportPath
}

"`n" | Add-Content $toolchainPath

if (Test-CommandExists "docker") {
    docker --version | Tee-Object -FilePath $toolchainPath -Append | Add-Content $reportPath
} else {
    "docker: not found" | Tee-Object -FilePath $toolchainPath -Append | Add-Content $reportPath
}

if (Test-CommandExists "trivy") {
    trivy --version | Tee-Object -FilePath $toolchainPath -Append | Add-Content $reportPath
} else {
    "trivy: not found" | Tee-Object -FilePath $toolchainPath -Append | Add-Content $reportPath
}

# Build & Test
Write-Section "Build & Tests"
Write-Log "Running cargo test --workspace --all-features --locked"
$testPath = Join-Path $ART_DIR "cargo-test.txt"
">> cargo test --workspace --all-features --locked" | Set-Content $testPath
cargo test --workspace --all-features --locked 2>&1 | Tee-Object -FilePath $testPath -Append

# Security & Quality
Write-Section "Security & Quality Gates"
$PASS = $true

# Cargo audit
Write-Log "Running cargo audit..."
if (Test-CommandExists "cargo-audit") {
    $auditPath = Join-Path $ART_DIR "cargo-audit.txt"
    cargo audit 2>&1 | Tee-Object -FilePath $auditPath
    if ($LASTEXITCODE -ne 0) { $PASS = $false }
} else {
    "SKIP cargo audit (not installed)" | Add-Content (Join-Path $ART_DIR "skips.txt")
}

# Cargo deny
Write-Log "Running cargo deny..."
if (Test-CommandExists "cargo-deny") {
    $denyPath = Join-Path $ART_DIR "cargo-deny.txt"
    cargo deny check bans licenses sources 2>&1 | Tee-Object -FilePath $denyPath
    if ($LASTEXITCODE -ne 0) { $PASS = $false }
} else {
    "SKIP cargo deny (not installed)" | Add-Content (Join-Path $ART_DIR "skips.txt")
}

# Cargo fmt
Write-Log "Running cargo fmt check..."
$fmtPath = Join-Path $ART_DIR "rustfmt.txt"
cargo fmt --all -- --check 2>&1 | Tee-Object -FilePath $fmtPath
if ($LASTEXITCODE -ne 0) { $PASS = $false }

# Cargo clippy
Write-Log "Running cargo clippy..."
$clippyPath = Join-Path $ART_DIR "clippy.txt"
cargo clippy --workspace --all-features -- -D warnings 2>&1 | Tee-Object -FilePath $clippyPath
if ($LASTEXITCODE -ne 0) { $PASS = $false }

# Container build & scan
Write-Section "Container Build & Trivy Scan"
if (Test-CommandExists "docker") {
    Write-Log "Building Docker image..."
    $dockerPath = Join-Path $ART_DIR "docker-build.txt"
    docker build -t $IMAGE_TAG . 2>&1 | Tee-Object -FilePath $dockerPath

    if (Test-CommandExists "trivy") {
        Write-Log "Running Trivy scan..."
        $trivyPath = Join-Path $ART_DIR "trivy.txt"
        trivy image --exit-code 1 --severity CRITICAL,HIGH $IMAGE_TAG 2>&1 | Tee-Object -FilePath $trivyPath
        if ($LASTEXITCODE -ne 0) { $PASS = $false }
    } else {
        "SKIP trivy (not installed)" | Add-Content (Join-Path $ART_DIR "skips.txt")
    }
} else {
    "SKIP docker build and scan (docker not installed)" | Add-Content (Join-Path $ART_DIR "skips.txt")
}

# SBOM generation
Write-Section "SBOM Artifacts"
if (Test-CommandExists "cargo-about") {
    Write-Log "Generating license SBOM with cargo-about..."
    $sbomLicense = Join-Path $TARGET_DIR "SBOM.licenses.json"
    cargo about generate --format json | Out-File -FilePath $sbomLicense -Encoding utf8
    "✅ cargo-about: $sbomLicense" | Add-Content $reportPath
} else {
    "SKIP cargo-about (not installed)" | Add-Content (Join-Path $ART_DIR "skips.txt")
}

if (Test-CommandExists "cargo-cyclonedx") {
    Write-Log "Generating CycloneDX SBOM..."
    $sbomCyclone = Join-Path $TARGET_DIR "SBOM.cyclonedx.json"
    cargo cyclonedx --all --output $sbomCyclone 2>&1
    "✅ CycloneDX: $sbomCyclone" | Add-Content $reportPath
} else {
    "SKIP cargo-cyclonedx (not installed)" | Add-Content (Join-Path $ART_DIR "skips.txt")
}

# Health endpoints
Write-Section "Health & Metrics (optional)"
@"
If a local service is running, verify /healthz and /metrics manually:
  curl http://localhost:8080/healthz
  curl http://localhost:8080/metrics
"@ | Add-Content $reportPath

# Summary
Write-Section "Summary & Exit Code"
if ($PASS) {
    $successMsg = "✅ All mandatory gates PASSED."
    Write-Host $successMsg -ForegroundColor Green
    Add-Content $reportPath $successMsg
    Write-Log "SUCCESS: Phase 0 verification complete"
    exit 0
} else {
    $failMsg = "❌ One or more gates FAILED. See artifacts in $ART_DIR"
    Write-Host $failMsg -ForegroundColor Red
    Add-Content $reportPath $failMsg
    Write-Log "FAILURE: Phase 0 verification failed"
    exit 1
}
