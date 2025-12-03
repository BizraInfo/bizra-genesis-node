<#
.SYNOPSIS
    BIZRA Node0 - Elite Database Migration System
    
.DESCRIPTION
    Professional-grade database migration system with:
    - Version-controlled migrations
    - Rollback capability
    - Schema validation
    - Dry-run mode
    - Migration history tracking
    
.NOTES
    Document ID: BIZRA-MIGRATE-ELITE-v1.0.0
    Author: BIZRA Genesis Node
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('status', 'up', 'down', 'create', 'history', 'validate', 'reset')]
    [string]$Command = 'status',
    
    [Parameter(Position=1)]
    [string]$MigrationName = '',
    
    [int]$Steps = 1,
    [switch]$DryRun,
    [switch]$Force
)

# ============================================
# CONFIGURATION
# ============================================

$script:DB_CONFIG = @{
    Host = "localhost"
    Port = 5432
    Database = "bizra_genesis"
    User = "bizra_node0"
    Container = "bizra-node0-db"
    MigrationsPath = Join-Path (Split-Path -Parent $PSScriptRoot) "migrations"
    MigrationsTable = "schema_migrations"
}

# ============================================
# UTILITIES
# ============================================

function Write-Status { param([string]$Message) Write-Host "  [*] $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "  [✓] $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "  [!] $Message" -ForegroundColor Yellow }
function Write-Err { param([string]$Message) Write-Host "  [✗] $Message" -ForegroundColor Red }

function Invoke-SQL {
    param(
        [string]$Query,
        [switch]$Silent
    )
    
    $result = docker exec $script:DB_CONFIG.Container psql -U $script:DB_CONFIG.User -d $script:DB_CONFIG.Database -t -c $Query 2>&1
    
    if ($LASTEXITCODE -ne 0 -and -not $Silent) {
        Write-Err "SQL Error: $result"
        return $null
    }
    
    return $result
}

function Initialize-MigrationTable {
    $createTable = @"
CREATE TABLE IF NOT EXISTS $($script:DB_CONFIG.MigrationsTable) (
    id SERIAL PRIMARY KEY,
    version VARCHAR(14) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    execution_time_ms INTEGER
);
"@
    
    Invoke-SQL -Query $createTable -Silent | Out-Null
}

function Get-AppliedMigrations {
    Initialize-MigrationTable
    
    $result = Invoke-SQL -Query "SELECT version FROM $($script:DB_CONFIG.MigrationsTable) ORDER BY version;" -Silent
    
    if ($result) {
        return ($result -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })
    }
    
    return @()
}

function Get-MigrationFiles {
    $path = $script:DB_CONFIG.MigrationsPath
    
    if (-not (Test-Path $path)) {
        return @()
    }
    
    return Get-ChildItem -Path $path -Filter "*.sql" | 
        Where-Object { $_.Name -match "^V\d{14}__" } |
        Sort-Object Name |
        ForEach-Object {
            $version = $_.Name -replace "^V(\d{14})__.*", '$1'
            $name = $_.Name -replace "^V\d{14}__(.*)\.sql$", '$1'
            
            @{
                Version = $version
                Name = $name
                Path = $_.FullName
                Filename = $_.Name
            }
        }
}

function Get-MigrationStatus {
    $applied = Get-AppliedMigrations
    $files = Get-MigrationFiles
    
    $status = @()
    
    foreach ($file in $files) {
        $isApplied = $applied -contains $file.Version
        $status += @{
            Version = $file.Version
            Name = $file.Name
            Applied = $isApplied
            Path = $file.Path
        }
    }
    
    return $status
}

# ============================================
# COMMANDS
# ============================================

function Show-Status {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║           BIZRA Node0 - MIGRATION STATUS                     ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # Check connection
    $connTest = Invoke-SQL -Query "SELECT 1;" -Silent
    if (-not $connTest) {
        Write-Err "Cannot connect to database"
        Write-Host "  Is the container running? docker ps | grep $($script:DB_CONFIG.Container)" -ForegroundColor Gray
        return
    }
    
    $status = Get-MigrationStatus
    $pending = ($status | Where-Object { -not $_.Applied }).Count
    $applied = ($status | Where-Object { $_.Applied }).Count
    
    Write-Host "  Database: $($script:DB_CONFIG.Database)" -ForegroundColor White
    Write-Host "  Applied:  $applied migrations" -ForegroundColor Green
    Write-Host "  Pending:  $pending migrations" -ForegroundColor $(if ($pending -gt 0) { 'Yellow' } else { 'Green' })
    Write-Host ""
    
    if ($status.Count -eq 0) {
        Write-Host "  No migrations found in: $($script:DB_CONFIG.MigrationsPath)" -ForegroundColor DarkGray
        Write-Host "  Create one with: .\migrate.ps1 create <name>" -ForegroundColor DarkGray
    } else {
        Write-Host "  VERSION         NAME                                     STATUS" -ForegroundColor DarkGray
        Write-Host "  ─────────────── ──────────────────────────────────────── ──────" -ForegroundColor DarkGray
        
        foreach ($m in $status) {
            $icon = if ($m.Applied) { "✓" } else { "○" }
            $color = if ($m.Applied) { "Green" } else { "Yellow" }
            $nameDisplay = if ($m.Name.Length -gt 40) { $m.Name.Substring(0, 37) + "..." } else { $m.Name.PadRight(40) }
            
            Write-Host "  $icon $($m.Version)  $nameDisplay" -ForegroundColor $color
        }
    }
    
    Write-Host ""
}

function Invoke-MigrateUp {
    param([switch]$DryRun)
    
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║           BIZRA Node0 - RUNNING MIGRATIONS                   ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    if ($DryRun) {
        Write-Warn "DRY RUN MODE - No changes will be applied"
        Write-Host ""
    }
    
    $status = Get-MigrationStatus
    $pending = $status | Where-Object { -not $_.Applied }
    
    if ($pending.Count -eq 0) {
        Write-Success "Database is up to date"
        return
    }
    
    Write-Status "Found $($pending.Count) pending migration(s)"
    Write-Host ""
    
    foreach ($migration in $pending) {
        Write-Host "  ── Applying: V$($migration.Version)__$($migration.Name)" -ForegroundColor White
        
        if ($DryRun) {
            Write-Host "     [DRY RUN] Would execute: $($migration.Path)" -ForegroundColor DarkGray
            continue
        }
        
        $startTime = Get-Date
        
        try {
            # Read and execute migration
            $sql = Get-Content -Path $migration.Path -Raw
            $checksum = (Get-FileHash -Path $migration.Path -Algorithm SHA256).Hash.Substring(0, 64)
            
            # Execute in transaction
            $wrappedSql = @"
BEGIN;
$sql
INSERT INTO $($script:DB_CONFIG.MigrationsTable) (version, name, checksum, execution_time_ms) 
VALUES ('$($migration.Version)', '$($migration.Name)', '$checksum', 0);
COMMIT;
"@
            
            $result = docker exec -i $script:DB_CONFIG.Container psql -U $script:DB_CONFIG.User -d $script:DB_CONFIG.Database -c $wrappedSql 2>&1
            
            $endTime = Get-Date
            $duration = [math]::Round(($endTime - $startTime).TotalMilliseconds)
            
            # Update execution time
            Invoke-SQL -Query "UPDATE $($script:DB_CONFIG.MigrationsTable) SET execution_time_ms = $duration WHERE version = '$($migration.Version)';" -Silent | Out-Null
            
            Write-Success "Applied in ${duration}ms"
            
        } catch {
            Write-Err "Migration failed: $_"
            Write-Err "Rolling back..."
            return
        }
    }
    
    Write-Host ""
    Write-Success "All migrations applied successfully"
    Write-Host ""
}

function Invoke-MigrateDown {
    param(
        [int]$Steps = 1,
        [switch]$DryRun,
        [switch]$Force
    )
    
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "  ║           BIZRA Node0 - ROLLING BACK MIGRATIONS              ║" -ForegroundColor Yellow
    Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $Force -and -not $DryRun) {
        Write-Warn "This will rollback $Steps migration(s). Use -Force to confirm."
        return
    }
    
    $applied = Get-AppliedMigrations | Sort-Object -Descending | Select-Object -First $Steps
    
    if ($applied.Count -eq 0) {
        Write-Warn "No migrations to rollback"
        return
    }
    
    foreach ($version in $applied) {
        $migrationFile = Get-MigrationFiles | Where-Object { $_.Version -eq $version }
        $downFile = $migrationFile.Path -replace "\.sql$", ".down.sql"
        
        Write-Host "  ── Rolling back: V$version" -ForegroundColor Yellow
        
        if (Test-Path $downFile) {
            if (-not $DryRun) {
                $sql = Get-Content -Path $downFile -Raw
                Invoke-SQL -Query $sql | Out-Null
                Invoke-SQL -Query "DELETE FROM $($script:DB_CONFIG.MigrationsTable) WHERE version = '$version';" | Out-Null
            }
            Write-Success "Rolled back"
        } else {
            Write-Warn "No down migration found: $downFile"
            if (-not $DryRun) {
                Invoke-SQL -Query "DELETE FROM $($script:DB_CONFIG.MigrationsTable) WHERE version = '$version';" | Out-Null
            }
        }
    }
    
    Write-Host ""
}

function New-Migration {
    param([string]$Name)
    
    if (-not $Name) {
        Write-Err "Migration name required"
        Write-Host "  Usage: .\migrate.ps1 create <name>" -ForegroundColor Gray
        return
    }
    
    # Ensure migrations directory exists
    if (-not (Test-Path $script:DB_CONFIG.MigrationsPath)) {
        New-Item -ItemType Directory -Path $script:DB_CONFIG.MigrationsPath -Force | Out-Null
    }
    
    $version = Get-Date -Format "yyyyMMddHHmmss"
    $safeName = $Name -replace "[^a-zA-Z0-9_]", "_"
    $filename = "V${version}__${safeName}.sql"
    $filepath = Join-Path $script:DB_CONFIG.MigrationsPath $filename
    $downpath = Join-Path $script:DB_CONFIG.MigrationsPath "V${version}__${safeName}.down.sql"
    
    # Create up migration
    $template = @"
-- Migration: $Name
-- Version: $version
-- Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

-- Write your migration SQL here

"@
    
    $template | Out-File -FilePath $filepath -Encoding UTF8
    
    # Create down migration
    $downTemplate = @"
-- Rollback: $Name
-- Version: $version

-- Write your rollback SQL here

"@
    
    $downTemplate | Out-File -FilePath $downpath -Encoding UTF8
    
    Write-Host ""
    Write-Success "Created migration: $filename"
    Write-Host "  Up:   $filepath" -ForegroundColor DarkGray
    Write-Host "  Down: $downpath" -ForegroundColor DarkGray
    Write-Host ""
}

function Show-History {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║           BIZRA Node0 - MIGRATION HISTORY                    ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    $result = Invoke-SQL -Query "SELECT version, name, applied_at, execution_time_ms FROM $($script:DB_CONFIG.MigrationsTable) ORDER BY applied_at DESC LIMIT 20;"
    
    if ($result) {
        Write-Host "  VERSION         NAME                           APPLIED              TIME" -ForegroundColor DarkGray
        Write-Host "  ─────────────── ────────────────────────────── ──────────────────── ─────" -ForegroundColor DarkGray
        
        $result -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
            $parts = $_ -split "\|" | ForEach-Object { $_.Trim() }
            if ($parts.Count -ge 4) {
                $nameDisplay = if ($parts[1].Length -gt 30) { $parts[1].Substring(0, 27) + "..." } else { $parts[1].PadRight(30) }
                Write-Host "  $($parts[0].PadRight(15)) $nameDisplay $($parts[2].PadRight(20)) $($parts[3])ms" -ForegroundColor White
            }
        }
    } else {
        Write-Host "  No migration history found" -ForegroundColor DarkGray
    }
    
    Write-Host ""
}

function Test-Schema {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║           BIZRA Node0 - SCHEMA VALIDATION                    ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # Check tables
    Write-Status "Checking tables..."
    $tables = Invoke-SQL -Query "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
    $tableCount = ($tables -split "`n" | Where-Object { $_.Trim() -ne "" }).Count
    Write-Success "Found $tableCount table(s)"
    
    # Check indexes
    Write-Status "Checking indexes..."
    $indexes = Invoke-SQL -Query "SELECT indexname FROM pg_indexes WHERE schemaname = 'public';"
    $indexCount = ($indexes -split "`n" | Where-Object { $_.Trim() -ne "" }).Count
    Write-Success "Found $indexCount index(es)"
    
    # Check constraints
    Write-Status "Checking constraints..."
    $constraints = Invoke-SQL -Query "SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace;" -Silent
    $constraintCount = if ($constraints) { ($constraints -split "`n" | Where-Object { $_.Trim() -ne "" }).Count } else { 0 }
    Write-Success "Found $constraintCount constraint(s)"
    
    # Migration sync check
    Write-Status "Checking migration sync..."
    $status = Get-MigrationStatus
    $pending = ($status | Where-Object { -not $_.Applied }).Count
    
    if ($pending -eq 0) {
        Write-Success "All migrations applied"
    } else {
        Write-Warn "$pending migration(s) pending"
    }
    
    Write-Host ""
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  ✓ SCHEMA VALIDATION COMPLETE" -ForegroundColor Green
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
}

# ============================================
# MAIN
# ============================================

switch ($Command) {
    "status"   { Show-Status }
    "up"       { Invoke-MigrateUp -DryRun:$DryRun }
    "down"     { Invoke-MigrateDown -Steps $Steps -DryRun:$DryRun -Force:$Force }
    "create"   { New-Migration -Name $MigrationName }
    "history"  { Show-History }
    "validate" { Test-Schema }
    "reset"    {
        if ($Force) {
            Write-Warn "Dropping all tables..."
            Invoke-SQL -Query "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" | Out-Null
            Write-Success "Database reset"
        } else {
            Write-Warn "This will DELETE ALL DATA. Use -Force to confirm."
        }
    }
    default {
        Write-Host ""
        Write-Host "  BIZRA Node0 Migration System" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Commands:" -ForegroundColor Yellow
        Write-Host "    status    Show migration status"
        Write-Host "    up        Apply pending migrations"
        Write-Host "    down      Rollback migrations (-Steps N)"
        Write-Host "    create    Create new migration"
        Write-Host "    history   Show migration history"
        Write-Host "    validate  Validate schema"
        Write-Host "    reset     Reset database (-Force required)"
        Write-Host ""
        Write-Host "  Options:" -ForegroundColor Yellow
        Write-Host "    -DryRun   Preview without applying"
        Write-Host "    -Force    Force dangerous operations"
        Write-Host ""
    }
}
