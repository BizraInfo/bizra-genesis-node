# BIZRA Node0 - PowerShell Start Script (Windows)
# Document ID: BIZRA-NODE0-v1.0.0-GENESIS

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "BIZRA Node0 - Starting All Services" -ForegroundColor Cyan
Write-Host "Node: NODE0-TITAN" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
    Write-Host "✓ Environment variables loaded from .env" -ForegroundColor Green
} else {
    Write-Host "WARNING: .env file not found. Using defaults." -ForegroundColor Yellow
}

# Start Docker services
Write-Host ""
Write-Host "Starting Docker infrastructure..." -ForegroundColor Yellow
Write-Host "----------------------------------------"
docker-compose -f docker/docker-compose.node0.yml up -d

# Wait for services to be healthy
Write-Host ""
Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
function Test-ServiceHealth {
    param(
        [string]$Name,
        [string]$Url,
        [int]$MaxAttempts = 30
    )
    
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✓ $Name is healthy" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "  Waiting for $Name... (attempt $attempt/$MaxAttempts)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Host "✗ $Name failed to start" -ForegroundColor Red
    return $false
}

Write-Host ""
Write-Host "Checking service health..." -ForegroundColor Yellow
Write-Host "----------------------------------------"
Test-ServiceHealth -Name "Ollama" -Url "http://localhost:11434/api/tags" | Out-Null
Test-ServiceHealth -Name "Neo4j" -Url "http://localhost:7474" | Out-Null
Test-ServiceHealth -Name "Qdrant" -Url "http://localhost:6333/collections" | Out-Null

# Start Rust Backend (in new terminal)
Write-Host ""
Write-Host "Starting Rust API Server..." -ForegroundColor Yellow
Write-Host "----------------------------------------"
if (Test-Path "backend/Cargo.toml") {
    Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd backend; cargo run --release --bin apiserver" -WindowStyle Normal
    Write-Host "✓ Rust API Server starting in new terminal" -ForegroundColor Green
} else {
    Write-Host "! Rust backend not found, skipping..." -ForegroundColor Yellow
}

# Start Node.js Bridge (in new terminal)
Write-Host ""
Write-Host "Starting Node.js Telemetry Bridge..." -ForegroundColor Yellow
Write-Host "----------------------------------------"
if (Test-Path "bridge/package.json") {
    Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd bridge; npm start" -WindowStyle Normal
    Write-Host "✓ Telemetry Bridge starting in new terminal" -ForegroundColor Green
} else {
    Write-Host "! Node.js bridge not found, skipping..." -ForegroundColor Yellow
}

# Start React Frontend (in new terminal)
Write-Host ""
Write-Host "Starting React Dashboard..." -ForegroundColor Yellow
Write-Host "----------------------------------------"
if (Test-Path "apps/dashboard/package.json") {
    Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd apps/dashboard; npm run dev" -WindowStyle Normal
    Write-Host "✓ React Dashboard starting in new terminal" -ForegroundColor Green
} else {
    Write-Host "! React dashboard not found, skipping..." -ForegroundColor Yellow
}

# Final status
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "BIZRA Node0 Services Started" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor White
Write-Host "  • PostgreSQL:    localhost:5432" -ForegroundColor Gray
Write-Host "  • Redis:         localhost:6379" -ForegroundColor Gray
Write-Host "  • Ollama:        localhost:11434" -ForegroundColor Gray
Write-Host "  • Neo4j:         localhost:7474 (browser)" -ForegroundColor Gray
Write-Host "  • Neo4j Bolt:    localhost:7687" -ForegroundColor Gray
Write-Host "  • Qdrant:        localhost:6333" -ForegroundColor Gray
Write-Host ""
Write-Host "Applications:" -ForegroundColor White
Write-Host "  • API Server:    http://localhost:8080" -ForegroundColor Gray
Write-Host "  • Telemetry WS:  ws://localhost:3002/telemetry" -ForegroundColor Gray
Write-Host "  • Dashboard:     http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "Health Check:" -ForegroundColor White
Write-Host "  Invoke-WebRequest http://localhost:8080/health" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop all services:" -ForegroundColor White
Write-Host "  .\scripts\stop-all.ps1" -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Cyan
