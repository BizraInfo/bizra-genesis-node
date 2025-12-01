# BIZRA Node0 - System Verification Script
# Document ID: BIZRA-NODE0-v1.0.0-GENESIS
# Verifies all components are in place

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   BIZRA NODE0 GENESIS - System Verification" -ForegroundColor Cyan
Write-Host "   Document ID: BIZRA-NODE0-v1.0.0-GENESIS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

$pass = 0
$fail = 0

function Test-Component {
    param([string]$Name, [string]$Path, [string]$Type)
    
    if ($Type -eq "file") {
        $exists = Test-Path $Path -PathType Leaf
    } else {
        $exists = Test-Path $Path -PathType Container
    }
    
    if ($exists) {
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [FAIL] $Name - Not found: $Path" -ForegroundColor Red
        return $false
    }
}

# ============================================
# LAYER 1: INFRASTRUCTURE
# ============================================
Write-Host "`nLAYER 1: Infrastructure (The Foundation)" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow

if (Test-Component "Docker Compose" "$rootDir\docker\docker-compose.node0.yml" "file") { $pass++ } else { $fail++ }
if (Test-Component "Database Schema" "$rootDir\scripts\init-db.sql" "file") { $pass++ } else { $fail++ }
if (Test-Component "Environment Example" "$rootDir\.env.example" "file") { $pass++ } else { $fail++ }
if (Test-Component "Start Script (PS1)" "$rootDir\scripts\start-all.ps1" "file") { $pass++ } else { $fail++ }
if (Test-Component "Stop Script (PS1)" "$rootDir\scripts\stop-all.ps1" "file") { $pass++ } else { $fail++ }
if (Test-Component "Start Script (Bash)" "$rootDir\scripts\start-all.sh" "file") { $pass++ } else { $fail++ }
if (Test-Component "Stop Script (Bash)" "$rootDir\scripts\stop-all.sh" "file") { $pass++ } else { $fail++ }
if (Test-Component "Models Setup" "$rootDir\scripts\models-setup.sh" "file") { $pass++ } else { $fail++ }

# ============================================
# LAYER 2: AI ENGINE
# ============================================
Write-Host "`nLAYER 2: AI Engine (The Brain)" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow

if (Test-Component "Rust Backend" "$rootDir\backend" "directory") { $pass++ } else { $fail++ }
if (Test-Component "Cargo.toml" "$rootDir\backend\Cargo.toml" "file") { $pass++ } else { $fail++ }
if (Test-Component "Main Entry" "$rootDir\backend\src\main.rs" "file") { $pass++ } else { $fail++ }
if (Test-Component "PAT Orchestrator" "$rootDir\backend\src\lib\agents\pat.rs" "file") { $pass++ } else { $fail++ }
if (Test-Component "SAT Orchestrator" "$rootDir\backend\src\lib\agents\sat.rs" "file") { $pass++ } else { $fail++ }
if (Test-Component "Env Snapshot Service" "$rootDir\backend\src\lib\services\env_snapshot.rs" "file") { $pass++ } else { $fail++ }
if (Test-Component "Asset Registry Service" "$rootDir\backend\src\lib\services\asset_registry.rs" "file") { $pass++ } else { $fail++ }
if (Test-Component "PoI Ledger Service" "$rootDir\backend\src\lib\services\poi_ledger.rs" "file") { $pass++ } else { $fail++ }
if (Test-Component "Resource Pool Service" "$rootDir\backend\src\lib\services\resource_pool.rs" "file") { $pass++ } else { $fail++ }
if (Test-Component "Knowledge Service" "$rootDir\backend\src\lib\services\knowledge.rs" "file") { $pass++ } else { $fail++ }
if (Test-Component "Knowledge API" "$rootDir\backend\src\lib\api\knowledge.rs" "file") { $pass++ } else { $fail++ }

# ============================================
# LAYER 3: DATA & ASSETS
# ============================================
Write-Host "`nLAYER 3: Data & Assets (The Memory)" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

if (Test-Component "Knowledge Directory" "$rootDir\knowledge" "directory") { $pass++ } else { $fail++ }
if (Test-Component "Knowledge README" "$rootDir\knowledge\README.md" "file") { $pass++ } else { $fail++ }
if (Test-Component "Knowledge Scripts" "$rootDir\knowledge\scripts" "directory") { $pass++ } else { $fail++ }
if (Test-Component "Build Knowledge Graph" "$rootDir\knowledge\scripts\build_knowledge_graph.py" "file") { $pass++ } else { $fail++ }
if (Test-Component "Generate Embeddings" "$rootDir\knowledge\scripts\generate_embeddings.py" "file") { $pass++ } else { $fail++ }
if (Test-Component "Query Engine" "$rootDir\knowledge\scripts\query_engine.py" "file") { $pass++ } else { $fail++ }
if (Test-Component "Context Assembler" "$rootDir\knowledge\scripts\context_assembler.py" "file") { $pass++ } else { $fail++ }
if (Test-Component "Knowledge Test Suite" "$rootDir\knowledge\scripts\test_knowledge.py" "file") { $pass++ } else { $fail++ }
if (Test-Component "Requirements.txt" "$rootDir\knowledge\requirements.txt" "file") { $pass++ } else { $fail++ }
if (Test-Component "ACTIVATE Gold Mine" "$rootDir\knowledge\ACTIVATE-GOLD-MINE.bat" "file") { $pass++ } else { $fail++ }

# ============================================
# LAYER 4: INTERFACE
# ============================================
Write-Host "`nLAYER 4: Interface (The Face)" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

if (Test-Component "Dashboard App" "$rootDir\apps\dashboard" "directory") { $pass++ } else { $fail++ }
if (Test-Component "Dashboard package.json" "$rootDir\apps\dashboard\package.json" "file") { $pass++ } else { $fail++ }
if (Test-Component "Dashboard Layout" "$rootDir\apps\dashboard\src\app\layout.tsx" "file") { $pass++ } else { $fail++ }

# Dashboard Pages
Write-Host "`n  Dashboard Pages:" -ForegroundColor Cyan
if (Test-Component "  - Home Page" "$rootDir\apps\dashboard\src\app\page.tsx" "file") { $pass++ } else { $fail++ }
if (Test-Component "  - Chat Page" "$rootDir\apps\dashboard\src\app\chat\page.tsx" "file") { $pass++ } else { $fail++ }
if (Test-Component "  - Plan Page" "$rootDir\apps\dashboard\src\app\plan\page.tsx" "file") { $pass++ } else { $fail++ }
if (Test-Component "  - Resources Page" "$rootDir\apps\dashboard\src\app\resources\page.tsx" "file") { $pass++ } else { $fail++ }
if (Test-Component "  - Rewards Page" "$rootDir\apps\dashboard\src\app\rewards\page.tsx" "file") { $pass++ } else { $fail++ }
if (Test-Component "  - Ops Page" "$rootDir\apps\dashboard\src\app\ops\page.tsx" "file") { $pass++ } else { $fail++ }
if (Test-Component "  - Onboarding Page" "$rootDir\apps\dashboard\src\app\onboarding\page.tsx" "file") { $pass++ } else { $fail++ }
if (Test-Component "  - BIZRAverse Page" "$rootDir\apps\dashboard\src\app\bizraverse\page.tsx" "file") { $pass++ } else { $fail++ }
if (Test-Component "  - Settings Page" "$rootDir\apps\dashboard\src\app\settings\page.tsx" "file") { $pass++ } else { $fail++ }
if (Test-Component "  - Knowledge Page" "$rootDir\apps\dashboard\src\app\knowledge\page.tsx" "file") { $pass++ } else { $fail++ }

# ============================================
# BRIDGE / TELEMETRY
# ============================================
Write-Host "`nBRIDGE: Telemetry Server" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

if (Test-Component "Bridge Directory" "$rootDir\bridge" "directory") { $pass++ } else { $fail++ }
if (Test-Component "Bridge package.json" "$rootDir\bridge\package.json" "file") { $pass++ } else { $fail++ }
if (Test-Component "Bridge Entry" "$rootDir\bridge\src\index.ts" "file") { $pass++ } else { $fail++ }

# ============================================
# DOCUMENTATION
# ============================================
Write-Host "`nDOCUMENTATION" -ForegroundColor Yellow
Write-Host "=============" -ForegroundColor Yellow

if (Test-Component "README.md" "$rootDir\README.md" "file") { $pass++ } else { $fail++ }
if (Test-Component "QUICKSTART.md" "$rootDir\QUICKSTART.md" "file") { $pass++ } else { $fail++ }

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "                  SUMMARY" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PASSED: $pass" -ForegroundColor Green
Write-Host "  FAILED: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($fail -eq 0) {
    Write-Host "  STATUS: ALL SYSTEMS READY" -ForegroundColor Green
    Write-Host ""
    Write-Host "  To start the system:" -ForegroundColor Yellow
    Write-Host "    1. Copy .env.example to .env and configure" -ForegroundColor White
    Write-Host "    2. Run: .\scripts\start-all.ps1" -ForegroundColor White
    Write-Host "    3. Open: http://localhost:3000" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "  STATUS: INCOMPLETE - $fail components missing" -ForegroundColor Red
    Write-Host ""
}

Write-Host "================================================" -ForegroundColor Cyan
