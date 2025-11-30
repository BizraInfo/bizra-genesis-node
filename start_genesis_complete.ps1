# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                  GENESIS NODE - COMPLETE STARTUP                          ║
# ║                     Backend + Frontend Integration                        ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

param (
    [switch]$SkipBackend,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Continue"
$ProjectRoot = "C:\bizra-genesis-node"

function Write-Step {
    param([int]$Step, [string]$Message)
    Write-Host "`n[$Step/3] $Message" -ForegroundColor Yellow
}

Write-Host @"

    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║       ██████╗ ██╗███████╗██████╗  █████╗                          ║
    ║       ██╔══██╗██║╚══███╔╝██╔══██╗██╔══██╗                         ║
    ║       ██████╔╝██║  ███╔╝ ██████╔╝███████║                         ║
    ║       ██╔══██╗██║ ███╔╝  ██╔══██╗██╔══██║                         ║
    ║       ██████╔╝██║███████╗██║  ██║██║  ██║                         ║
    ║       ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝                         ║
    ║                                                                   ║
    ║             G E N E S I S   N O D E   S T A R T U P                ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# ============================================================================
# STEP 1: START BACKEND (if requested)
# ============================================================================
Write-Step 1 "Starting Genesis Node Backend..."

if (-not $SkipBackend) {
    # Check if Docker is running for database
    $dockerRunning = docker info 2>$null
    if ($dockerRunning) {
        Set-Location $ProjectRoot
        Write-Host "   Starting database containers..." -ForegroundColor Gray
        docker-compose -f docker-compose.database.yml up -d

        Write-Host "   Waiting for PostgreSQL..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }

    # Start the Rust backend API server
    Write-Host "   Launching API server on port 3001..." -ForegroundColor Gray
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$ProjectRoot'; `$env:DATABASE_URL='postgres://bizra_user:bizra_password@localhost:5433/bizra_genesis'; `$env:PORT=3001; `$env:SQLX_OFFLINE='true'; & '.\target\release\api_server.exe'"
    )
} else {
    Write-Host "   Skipped backend startup" -ForegroundColor Gray
}

# ============================================================================
# STEP 2: START FRONTEND
# ============================================================================
Write-Step 2 "Starting Frontend Dashboard..."

if (-not $SkipFrontend) {
    Write-Host "   Serving frontend on port 8080..." -ForegroundColor Gray
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$ProjectRoot'; python -m http.server 8080"
    )
} else {
    Write-Host "   Skipped frontend startup" -ForegroundColor Gray
}

# ============================================================================
# STEP 3: OPEN DASHBOARD
# ============================================================================
Write-Step 3 "Opening Genesis Dashboard..."

Start-Sleep -Seconds 3

# Open dashboard in default browser
Start-Process "http://localhost:8080/index.html"

Write-Host ""
Write-Host "   ✅ Genesis Node is running!" -ForegroundColor Green
Write-Host "   📊 Dashboard: http://localhost:8080/index.html" -ForegroundColor Cyan
Write-Host "   🔌 Backend API: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "   📝 Check the 'Proof-of-Impact' view to see SAT content workflow" -ForegroundColor White
Write-Host ""

Write-Host @"

    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║              🕋  G E N E S I S   N O D E   R U N N I N G  🕋       ║
    ║                                                                   ║
    ║   Backend API:     http://localhost:3001                         ║
    ║   Frontend Dashboard: http://localhost:8080                      ║
    ║   Live Telemetry Updates Every 5 Seconds                        ║
    ║   SAT Content Approval in Proof-of-Impact View                  ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta
