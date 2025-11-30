# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - E2E Rewards Test Runner (PowerShell)               ║
# ║  Complete validation flow for Genesis Economic Engine v0.1               ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

param(
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$Validate
)

$ErrorActionPreference = "Stop"

Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " BIZRA GENESIS ECONOMIC ENGINE - E2E TEST SUITE" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# PRE-FLIGHT CHECKS
# ════════════════════════════════════════════════════════════════════════════

Write-Host "📋 Pre-flight checks..." -ForegroundColor Cyan

# Check PostgreSQL connection
if (-not $DatabaseUrl) {
    $DatabaseUrl = "postgresql://bizra_user:bizra_pass@localhost:5432/bizra_genesis"
    Write-Host "⚠️  Using default DATABASE_URL: $DatabaseUrl" -ForegroundColor Yellow
}

# Check psql availability
try {
    $psqlVersion = psql --version
    Write-Host "✅ PostgreSQL client: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ psql not found. Install PostgreSQL client." -ForegroundColor Red
    exit 1
}

# Check cargo availability (for backend)
if (-not $SkipBackend) {
    try {
        $cargoVersion = cargo --version
        Write-Host "✅ Rust/Cargo: $cargoVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ cargo not found. Install Rust toolchain." -ForegroundColor Red
        exit 1
    }
}

# Check npm availability (for frontend)
if (-not $SkipFrontend) {
    try {
        $npmVersion = npm --version
        Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  npm not found. Skipping frontend checks." -ForegroundColor Yellow
        $SkipFrontend = $true
    }
}

Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# STEP 1: Compile Backend
# ════════════════════════════════════════════════════════════════════════════

if (-not $SkipBackend) {
    Write-Host "🔨 Compiling backend..." -ForegroundColor Cyan
    cargo check --lib
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend compilation failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Backend compilation successful" -ForegroundColor Green
    Write-Host ""
}

# ════════════════════════════════════════════════════════════════════════════
# STEP 2: Type-check Frontend
# ════════════════════════════════════════════════════════════════════════════

if (-not $SkipFrontend) {
    Write-Host "🔍 Type-checking frontend..." -ForegroundColor Cyan
    Push-Location apps\dashboard
    npm run type-check
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Frontend type check warnings (non-blocking)" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Frontend type check passed" -ForegroundColor Green
    }
    Pop-Location
    Write-Host ""
}

# ════════════════════════════════════════════════════════════════════════════
# STEP 3: Verify Migrations
# ════════════════════════════════════════════════════════════════════════════

Write-Host "📊 Verifying database migrations..." -ForegroundColor Cyan
$migrationCheck = psql $DatabaseUrl -c "SELECT COUNT(*) FROM poi_reward_epoch LIMIT 1;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema ready (poi_reward_epoch table exists)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Migrations may not be applied. Run: sqlx migrate run" -ForegroundColor Yellow
}
Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# STEP 4: Run Setup Script (Create Test Epoch + Attestations)
# ════════════════════════════════════════════════════════════════════════════

if (-not $Validate) {
    Write-Host "🧪 Creating test epoch and attestations..." -ForegroundColor Cyan
    psql $DatabaseUrl -f scripts\e2e-rewards-test.sql

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Test setup failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " TEST DATA CREATED" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Green
    Write-Host "  1. Start backend:   cargo run --bin api_server" -ForegroundColor White
    Write-Host "  2. Start frontend:  cd apps\dashboard && npm run dev" -ForegroundColor White
    Write-Host "  3. Login as admin:  http://localhost:5173/admin/rewards" -ForegroundColor White
    Write-Host "  4. Click 'Distribute' button for the test epoch" -ForegroundColor White
    Write-Host "  5. Run validation:  .\scripts\run-e2e-rewards-test.ps1 -Validate" -ForegroundColor White
    Write-Host ""
} else {
    # ════════════════════════════════════════════════════════════════════════════
    # STEP 5: Validate Distribution Results
    # ════════════════════════════════════════════════════════════════════════════

    Write-Host "✅ Running post-distribution validation..." -ForegroundColor Cyan
    Write-Host ""
    psql $DatabaseUrl -f scripts\e2e-rewards-validate.sql

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host " VALIDATION COMPLETE" -ForegroundColor Yellow
        Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "✅ Genesis Economic Engine v0.1 - Verified Run #1 COMPLETE" -ForegroundColor Green
        Write-Host ""
        Write-Host "Document this execution:" -ForegroundColor Cyan
        Write-Host "  Timestamp: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) UTC" -ForegroundColor White
        Write-Host "  Environment: Local Development" -ForegroundColor White
        Write-Host "  Status: All invariants validated" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ Validation failed - check output above" -ForegroundColor Red
        exit 1
    }
}

Write-Host "════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
