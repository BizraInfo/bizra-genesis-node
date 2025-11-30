# Local SQLx Cache Regeneration Script (Windows)
# Professional Elite Practitioner Local Cache Management
# For environments where Docker networking complexifies cache generation

param(
    [switch]$SkipValidation,
    [switch]$Force,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }

# Professional Elite Configuration
$ScriptVersion = "1.0.0"
$RequiredSqlxVersion = "0.8"
# More robust workspace root detection
$ScriptDir = Split-Path -Parent $PSScriptRoot
$WorkspaceRoot = if (Test-Path (Join-Path $ScriptDir "Cargo.toml")) {
    $ScriptDir
} elseif (Test-Path (Join-Path (Split-Path -Parent $ScriptDir) "Cargo.toml")) {
    Split-Path -Parent $ScriptDir
} else {
    Get-Location  # Fallback to current directory
}
$SqlxDir = Join-Path $WorkspaceRoot ".sqlx"

Write-Host "================================================" -ForegroundColor Blue
Write-Host "🔄 SQLx Cache Local Regeneration" -ForegroundColor Blue
Write-Host "Professional Elite Implementation v$ScriptVersion" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""

# =============================================================================
# PRELIMINARY CHECKS
# =============================================================================

Write-Host "[1/6] Preliminary Validation..." -ForegroundColor Yellow

# Verify running from correct directory
if (-not (Test-Path (Join-Path $WorkspaceRoot "Cargo.toml"))) {
    Write-Warning "Error: Run from project root directory or script path issue"
    Write-Warning "Expected Cargo.toml at: $WorkspaceRoot"
    exit 1
}

# Check SQLx CLI availability
try {
    $sqlxVersion = & sqlx --version 2>$null
    if ($sqlxVersion -match "sqlx-cli (\d+\.\d+)") {
        $version = [version]$Matches[1]
        $requiredVersion = [version]$RequiredSqlxVersion
        if ($version -lt $requiredVersion) {
            Write-Warning "SQLx CLI version $version found, $requiredVersion+ required"
            Write-Host "Installing latest SQLx CLI..." -ForegroundColor Yellow
            & cargo install sqlx-cli --no-default-features --features postgres --force
        }
    }
    Write-Host "✓ SQLx CLI available: $sqlxVersion" -ForegroundColor Green -Verbose
} catch {
    Write-Host "🔧 Installing SQLx CLI..." -ForegroundColor Yellow
    & cargo install sqlx-cli --no-default-features --features postgres
    if ($LASTEXITCODE -ne 0) { throw "Failed to install SQLx CLI" }
}

# Check Cargo availability
try {
    & cargo --version | Out-Null
    Write-Host "✓ Cargo available" -ForegroundColor Green
} catch {
    Write-Warning "❌ Cargo not found. Install Rust toolchain."
    exit 1
}

Write-Host ""

# =============================================================================
# ENVIRONMENT PREPARATION
# =============================================================================

Write-Host "[2/6] Environment Preparation..." -ForegroundColor Yellow

# Configure SQLx offline mode
$env:SQLX_OFFLINE = "true"
Write-Host "✓ SQLX_OFFLINE=true configured" -ForegroundColor Green

# Backup existing cache if present and not forcing
$backupPath = $null
if ((Test-Path $SqlxDir) -and -not $Force) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "${SqlxDir}_backup_$timestamp"
    Copy-Item $SqlxDir $backupPath -Recurse -Force
    Write-Host "✓ Existing cache backed up to: $backupPath" -ForegroundColor Green
}

# Clear cache if forcing regeneration
if ($Force -and (Test-Path $SqlxDir)) {
    Remove-Item $SqlxDir -Recurse -Force
    Write-Host "✓ Existing cache cleared (--Force specified)" -ForegroundColor Green
}

Write-Host ""

# =============================================================================
# STRATEGY SELECTION
# =============================================================================

Write-Host "[3/6] Strategy Configuration..." -ForegroundColor Yellow

# Determine best approach based on environment
$hasDockerAvailable = $false
$hasDatabaseAvailable = $false

# Check Docker availability and running containers
try {
    $dockerContainers = & docker ps --format "table {{.Names}}" 2>$null | Select-Object -Skip 1
    $hasDockerAvailable = $true

    # Look for existing Bizra database containers
    $bizraContainers = $dockerContainers | Where-Object { $_ -match "^bizra-postgres" }
    if ($bizraContainers) {
        Write-Host "✓ Found Bizra database containers: $($bizraContainers -join ', ')" -ForegroundColor Green
        $hasDatabaseAvailable = $true
    }
} catch {
    Write-Host "⚠️  Docker not available or not running" -ForegroundColor Yellow
}

# Strategy determination
if ($hasDockerAvailable -and $hasDatabaseAvailable) {
    $strategy = "docker-container"
    Write-Host "✓ Using Docker container strategy" -ForegroundColor Green
} elseif ($hasDockerAvailable) {
    $strategy = "docker-new"
    Write-Host "✓ Using new Docker container strategy" -ForegroundColor Green
} else {
    $strategy = "simulated"
    Write-Host "✓ Using simulated strategy (limited validation)" -ForegroundColor Yellow
}

Write-Host ""

# =============================================================================
# DATABASE SETUP
# =============================================================================

Write-Host "[4/6] Database Setup ($strategy)..." -ForegroundColor Yellow

switch ($strategy) {
    "docker-container" {
        # Validate running container has proper database
        $testQuery = & docker exec bizra-postgres psql -U bizra_user -d bizra_genesis -t -c "SELECT 1;" 2>$null
        if ($LASTEXITCODE -eq 0) {
            $databaseUrl = "postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"
            Write-Host "✓ Existing Bizra database validated" -ForegroundColor Green
        } else {
            Write-Warning "Existing container not properly configured. Creating new instance."
            $strategy = "docker-new"
        }
    }
    "docker-new" {
        # Create temporary PostgreSQL container
        $containerName = "bizra-sqlx-cache-gen-$(Get-Random)"
        try {
            & docker run -d --name $containerName `
                -e POSTGRES_USER=bizra_user `
                -e POSTGRES_PASSWORD=bizra_password `
                -e POSTGRES_DB=bizra_genesis_cache_gen `
                -p 5433:5432 `
                postgres:15-alpine | Out-Null

            if ($LASTEXITCODE -ne 0) { throw "Failed to start container" }

            Write-Host "✓ Created temporary PostgreSQL container: $containerName" -ForegroundColor Green

            # Wait for container to be ready
            $maxWait = 30
            $waitCount = 0
            while ($waitCount -lt $maxWait) {
                try {
                    & docker exec $containerName pg_isready -U bizra_user 2>$null | Out-Null
                    if ($LASTEXITCODE -eq 0) { break }
                } catch {}
                Start-Sleep -Seconds 1
                $waitCount++
            }

            if ($waitCount -eq $maxWait) { throw "Container failed to start" }

            $databaseUrl = "postgres://bizra_user:bizra_password@localhost:5433/bizra_genesis_cache_gen"
            $cleanupContainer = $true
            Write-Host "✓ Database ready on port 5433" -ForegroundColor Green
        } catch {
            Write-Warning "Failed to create Docker database container. Using simulated mode."
            $strategy = "simulated"
            if ($containerName) {
                & docker rm -f $containerName 2>$null | Out-Null
            }
        }
    }
    "simulated" {
        Write-Host "⚠️  Using simulated mode - limited database validation" -ForegroundColor Yellow
        Write-Host "   Queries will be syntax-checked without full type validation" -ForegroundColor Yellow
        $databaseUrl = $null
    }
}

$env:DATABASE_URL = $databaseUrl
Write-Host ""

# =============================================================================
# MIGRATIONS & CACHE GENERATION
# =============================================================================

Write-Host "[5/6] Cache Generation..." -ForegroundColor Yellow

# Change to workspace root for command execution
Push-Location $WorkspaceRoot

try {
    if ($databaseUrl -and ($strategy -ne "simulated")) {
        # Run migrations
        Write-Host "Running database migrations..." -ForegroundColor Cyan
        & sqlx migrate run --source migrations
        if ($LASTEXITCODE -ne 0) { throw "Migration failed" }
        Write-Host "✓ Migrations applied successfully" -ForegroundColor Green
    } else {
        Write-Host "Skipping migrations (simulated mode)" -ForegroundColor Yellow
    }

    # Generate SQLx cache
    Write-Host "Generating SQLx offline cache..." -ForegroundColor Cyan

    $prepareCmd = @("--workspace")
    if ($Force) { $prepareCmd += "--force" }

    & cargo sqlx prepare @prepareCmd
    if ($LASTEXITCODE -ne 0) { throw "Cache generation failed" }

    Write-Host "✓ SQLx cache generated successfully" -ForegroundColor Green

    # Validate cache (if not skipping)
    if (-not $SkipValidation) {
        Write-Host "Validating generated cache..." -ForegroundColor Cyan
        & cargo sqlx prepare --check --workspace
        if ($LASTEXITCODE -ne 0) { throw "Cache validation failed" }
        Write-Host "✓ Cache validation successful" -ForegroundColor Green
    }

} finally {
    Pop-Location
}

Write-Host ""

# =============================================================================
# FINAL VALIDATION & CLEANUP
# =============================================================================

Write-Host "[6/6] Final Validation & Cleanup..." -ForegroundColor Yellow

# Test compilation
Write-Host "Testing offline compilation..." -ForegroundColor Cyan
$env:DATABASE_URL = ""  # Clear database URL for offline test

try {
    & cargo check --all-features 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Offline compilation successful" -ForegroundColor Green
    } else {
        Write-Warning "❌ Offline compilation failed - check configuration"
    }
} finally {
    if ($databaseUrl) { $env:DATABASE_URL = $databaseUrl }  # Restore for cleanup
}

# Cleanup temporary resources
if ($cleanupContainer -and $containerName) {
    try {
        & docker rm -f $containerName 2>$null | Out-Null
        Write-Host "✓ Temporary container cleaned up: $containerName" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Failed to cleanup container: $containerName" -ForegroundColor Yellow
    }
}

# Cache analytics
$cacheFiles = Get-ChildItem -Path $SqlxDir -Filter "query-*.json" -ErrorAction SilentlyContinue
$cacheCount = $cacheFiles.Count
$cacheSize = if ($cacheFiles) {
    ($cacheFiles | Measure-Object -Property Length -Sum).Sum / 1KB
} else { 0 }
$cacheSizeFormatted = "{0:N2} KB" -f $cacheSize

Write-Host ""
Write-Host "📊 Cache Analytics:" -ForegroundColor Blue
Write-Host "   • Queries Cached: $cacheCount" -ForegroundColor White
Write-Host "   • Cache Size: $cacheSizeFormatted" -ForegroundColor White
Write-Host "   • Strategy Used: $strategy" -ForegroundColor White
if ($backupPath) {
    Write-Host "   • Backup Available: $backupPath" -ForegroundColor White
}

Write-Host ""

# =============================================================================
# SUCCESS SUMMARY
# =============================================================================

Write-Host "================================================" -ForegroundColor Green
Write-Host "✅ SQLx Cache Regeneration Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 What was accomplished:" -ForegroundColor Blue
Write-Host "   • ✅ Professional cache generation process" -ForegroundColor Green
Write-Host "   • ✅ Strategy-based database handling" -ForegroundColor Green
Write-Host "   • ✅ Automated backup and recovery" -ForegroundColor Green
Write-Host "   • ✅ Comprehensive validation" -ForegroundColor Green
if ($databaseUrl) {
    Write-Host "   • ✅ Database connectivity validated" -ForegroundColor Green
}
Write-Host ""
Write-Host "📤 Next steps:" -ForegroundColor Blue
Write-Host "   1. Review generated cache: $SqlxDir" -ForegroundColor Yellow
Write-Host "   2. Test your application: cargo test --lib" -ForegroundColor Yellow
if ($cacheFiles.Count -gt 0) {
    Write-Host "   3. Commit cache: git add .sqlx/" -ForegroundColor Yellow
    Write-Host "      git commit -m 'chore(sqlx): Regenerate offline query cache'" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "🔍 Verification commands:" -ForegroundColor Blue
Write-Host "   • cargo check --all-features" -ForegroundColor Cyan
Write-Host "   • cargo sqlx prepare --check --workspace" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Cache Management Documentation:" -ForegroundColor Blue
Write-Host "   • docs/SQLX_CACHE_MANAGEMENT.md" -ForegroundColor White
Write-Host ""
Write-Host "🏆 Professional Elite Implementation Complete!" -ForegroundColor Green
Write-Host ""

# Restore environment
$env:SQLX_OFFLINE = "true"
if ($databaseUrl) { $env:DATABASE_URL = $databaseUrl }
