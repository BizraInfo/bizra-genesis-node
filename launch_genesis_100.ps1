# 🚀 GENESIS 100 DAY 1 LAUNCH ORCHESTRATOR
# Professional Elite Execution Script

$ErrorActionPreference = "Continue"
Write-Host "🚀 INITIATING GENESIS 100 LAUNCH SEQUENCE..." -ForegroundColor Cyan

# 1. Start Backend (New Window)
Write-Host "1. Starting Backend (API Server)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\bizra-genesis-node; cargo run --release --bin api_server"

# 2. Start Frontend (New Window)
Write-Host "2. Starting Frontend (Dashboard)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\bizra-genesis-node\apps\dashboard; npm run dev"

# 3. Start Support Bot (New Window)
Write-Host "3. Starting Support Bot..." -ForegroundColor Yellow
if (Test-Path "c:\bizra-genesis-node\support-bot\.env") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\bizra-genesis-node\support-bot; npm start"
}
else {
    Write-Host "⚠️ Support Bot skipped: .env not configured. Copy .env.example to .env and add token." -ForegroundColor Red
}

# 4. Wait for services to warm up
Write-Host "⏳ Waiting 10 seconds for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# 5. Run Smoke Test
Write-Host "🧪 Running Post-Launch Smoke Test..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File "c:\bizra-genesis-node\scripts\genesis-100-smoke-test.ps1"

Write-Host "`n✅ LAUNCH SEQUENCE INITIATED." -ForegroundColor Green
Write-Host "Monitor the opened windows for logs." -ForegroundColor Gray
