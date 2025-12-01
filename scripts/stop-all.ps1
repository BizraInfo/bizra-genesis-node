# BIZRA Node0 - PowerShell Stop Script (Windows)
# Document ID: BIZRA-NODE0-v1.0.0-GENESIS

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "BIZRA Node0 - Stopping All Services" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot

# Stop application processes
Write-Host "Stopping application processes..." -ForegroundColor Yellow
Write-Host "----------------------------------------"

# Kill Node.js processes
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "✓ Node.js processes stopped" -ForegroundColor Green
} else {
    Write-Host "! No Node.js processes running" -ForegroundColor Gray
}

# Kill Rust API server
$rustProcesses = Get-Process -Name "apiserver" -ErrorAction SilentlyContinue
if ($rustProcesses) {
    $rustProcesses | Stop-Process -Force
    Write-Host "✓ Rust API Server stopped" -ForegroundColor Green
} else {
    Write-Host "! Rust API Server not running" -ForegroundColor Gray
}

# Stop Docker services
Write-Host ""
Write-Host "Stopping Docker services..." -ForegroundColor Yellow
Write-Host "----------------------------------------"
docker-compose -f docker/docker-compose.node0.yml down

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "All BIZRA Node0 services stopped" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start again:" -ForegroundColor White
Write-Host "  .\scripts\start-all.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "To remove all data (DESTRUCTIVE):" -ForegroundColor Red
Write-Host "  docker-compose -f docker/docker-compose.node0.yml down -v" -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Cyan
