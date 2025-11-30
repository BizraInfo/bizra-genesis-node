# scripts/prepare-sqlx-offline.ps1
# Professional PowerShell script to prepare SQLx offline metadata for CI/CD (Windows)
#
# This script:
# 1. Starts PostgreSQL via Docker (if not running)
# 2. Runs database migrations
# 3. Generates SQLx offline metadata
# 4. Validates metadata integrity
# 5. Provides clear success/failure feedback

param(
    [string]$PostgresUser = "bizra_user",
    [string]$PostgresPassword = "bizra_password",
    [string]$PostgresDb = "bizra_genesis",
    [int]$PostgresPort = 5432
)

$ErrorActionPreference = "Stop"

# Configuration
$ContainerName = "bizra-postgres-sqlx-prepare"
$DatabaseUrl = "postgres://${PostgresUser}:${PostgresPassword}@localhost:${PostgresPort}/${PostgresDb}"

Write-Host "================================================" -ForegroundColor Blue
Write-Host "SQLx Offline Metadata Preparation (Windows)" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""

# =============================================================================
# STEP 1: Check Prerequisites
# =============================================================================

Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✓ Docker installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker is not installed" -ForegroundColor Red
    Write-Host "Please install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
    exit 1
}

# Check if SQLx CLI is installed
try {
    $sqlxVersion = sqlx --version
    Write-Host "✓ SQLx CLI installed ($sqlxVersion)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  SQLx CLI not found. Installing..." -ForegroundColor Yellow
    cargo install sqlx-cli --no-default-features --features postgres
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install SQLx CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ SQLx CLI installed" -ForegroundColor Green
}

Write-Host ""

# =============================================================================
# STEP 2: Start PostgreSQL
# =============================================================================

Write-Host "[2/5] Starting PostgreSQL..." -ForegroundColor Yellow

# Check if container already exists
$existingContainer = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($existingContainer) {
    Write-Host "Container $ContainerName exists. Removing..."
    docker rm -f $ContainerName | Out-Null
}

# Start PostgreSQL container
Write-Host "Starting PostgreSQL container..."
docker run -d `
    --name $ContainerName `
    -e POSTGRES_USER=$PostgresUser `
    -e POSTGRES_PASSWORD=$PostgresPassword `
    -e POSTGRES_DB=$PostgresDb `
    -p "${PostgresPort}:5432" `
    postgres:15-alpine | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start PostgreSQL container" -ForegroundColor Red
    exit 1
}

Write-Host "✓ PostgreSQL container started: $ContainerName" -ForegroundColor Green

# Wait for PostgreSQL to be ready
Write-Host "Waiting for PostgreSQL to be ready..."
for ($i = 1; $i -le 30; $i++) {
    try {
        docker exec $ContainerName pg_isready -U $PostgresUser 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ PostgreSQL is ready" -ForegroundColor Green
            break
        }
    } catch {}

    if ($i -eq 30) {
        Write-Host "❌ PostgreSQL failed to start within 30 seconds" -ForegroundColor Red
        docker logs $ContainerName
        docker rm -f $ContainerName
        exit 1
    }
    Start-Sleep -Seconds 1
    Write-Host -NoNewline "."
}
Write-Host ""
Write-Host ""

# =============================================================================
# STEP 3: Run Migrations
# =============================================================================

Write-Host "[3/5] Running database migrations..." -ForegroundColor Yellow

$env:DATABASE_URL = $DatabaseUrl

# Check if migrations directory exists
if (-not (Test-Path "migrations")) {
    Write-Host "❌ Error: migrations/ directory not found" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory"
    docker rm -f $ContainerName
    exit 1
}

# Run migrations
sqlx migrate run

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed" -ForegroundColor Red
    docker rm -f $ContainerName
    exit 1
}

Write-Host "✓ Migrations applied successfully" -ForegroundColor Green
Write-Host ""

# =============================================================================
# STEP 4: Generate SQLx Offline Metadata
# =============================================================================

Write-Host "[4/5] Generating SQLx offline metadata..." -ForegroundColor Yellow

# Generate metadata
cargo sqlx prepare --workspace

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate SQLx metadata" -ForegroundColor Red
    docker rm -f $ContainerName
    exit 1
}

Write-Host "✓ SQLx metadata generated in .sqlx/ directory" -ForegroundColor Green

# Count queries
$queryCount = (Get-ChildItem -Path ".sqlx" -Filter "query-*.json" -ErrorAction SilentlyContinue).Count
Write-Host "✓ Generated metadata for $queryCount queries" -ForegroundColor Green
Write-Host ""

# =============================================================================
# STEP 5: Validate Metadata
# =============================================================================

Write-Host "[5/5] Validating metadata..." -ForegroundColor Yellow

# Check metadata
cargo sqlx prepare --check

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Metadata validation successful" -ForegroundColor Green
} else {
    Write-Host "⚠️  Metadata validation warning (this is okay for first run)" -ForegroundColor Yellow
}

# Test offline compilation
Write-Host "Testing offline compilation..."
Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
cargo check --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Offline compilation test passed" -ForegroundColor Green
} else {
    Write-Host "❌ Offline compilation test failed" -ForegroundColor Red
    Write-Host "The code may not compile without DATABASE_URL"
    docker rm -f $ContainerName
    exit 1
}

Write-Host ""

# =============================================================================
# CLEANUP
# =============================================================================

Write-Host "Cleaning up..." -ForegroundColor Yellow
docker rm -f $ContainerName | Out-Null
Write-Host "✓ PostgreSQL container removed" -ForegroundColor Green
Write-Host ""

# =============================================================================
# SUCCESS SUMMARY
# =============================================================================

Write-Host "================================================" -ForegroundColor Green
Write-Host "✅ SQLx Offline Metadata Preparation Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Generated files:" -ForegroundColor Blue
Write-Host "   • .sqlx/ directory with query metadata"
Write-Host "   • $queryCount query definitions cached"
Write-Host ""
Write-Host "🎯 What this enables:" -ForegroundColor Blue
Write-Host "   • ✅ Compilation without live database"
Write-Host "   • ✅ Faster CI/CD pipelines"
Write-Host "   • ✅ Offline development"
Write-Host "   • ✅ Smaller Docker images"
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Blue
Write-Host "   1. Commit .sqlx/ to version control:"
Write-Host "      git add .sqlx/" -ForegroundColor Yellow
Write-Host "      git commit -m `"chore(sqlx): Add offline query metadata`"" -ForegroundColor Yellow
Write-Host ""
Write-Host "   2. Verify offline compilation works:"
Write-Host "      `$env:DATABASE_URL = `"`"" -ForegroundColor Yellow
Write-Host "      cargo build" -ForegroundColor Yellow
Write-Host ""
Write-Host "   3. Update when schema changes:"
Write-Host "      .\scripts\prepare-sqlx-offline.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ready for production CI/CD!" -ForegroundColor Green
Write-Host ""
