<#
.SYNOPSIS
    BIZRA Node0 Master Control - Complete Lifecycle Management
    
.DESCRIPTION
    The Genesis Block Command Center - Unified CLI for managing all Node0 components.
    This is THE control interface for Node0 operations.
    
    Commands:
        status      - Show complete system status
        start       - Start all services
        stop        - Stop all services
        restart     - Restart all services
        health      - Run health checks
        backup      - Backup system state
        restore     - Restore from backup
        models      - Manage AI models
        db          - Database operations
        logs        - View aggregated logs
        package     - Build distribution package
        update      - Self-update Node0
        validate    - Run system validation
        
.EXAMPLE
    .\node0.ps1 status
    .\node0.ps1 start
    .\node0.ps1 models list
    .\node0.ps1 backup create
    
.NOTES
    Document ID: BIZRA-NODE0-MASTER-CONTROL-v1.0.0
    Author: BIZRA Genesis Node
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('status', 'start', 'stop', 'restart', 'health', 'backup', 'restore', 
                 'models', 'db', 'logs', 'package', 'update', 'validate', 'domain', 'bench', 'elite', 'help')]
    [string]$Command = 'help',
    
    [Parameter(Position=1)]
    [string]$SubCommand = '',
    
    [Parameter(Position=2)]
    [string]$Arg1 = '',
    
    [Parameter(Position=3)]
    [string]$Arg2 = '',
    
    [switch]$Force,
    [switch]$DetailedOutput
)

# ============================================
# CONFIGURATION - BIZRA SOVEREIGN DOMAIN
# ============================================

$script:NODE0_VERSION = "1.0.0"
$script:GENESIS_BLOCK_ID = "NODE0-TITAN"
$script:OWNER = "BIZRA"
$script:PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$script:SCRIPTS_DIR = $PSScriptRoot
$script:BACKUP_DIR = Join-Path $PROJECT_ROOT "backups"
$script:LOGS_DIR = Join-Path $PROJECT_ROOT "logs"

# ============================================
# INTERDISCIPLINARY DOMAIN MAP
# You own ALL of this - complete sovereignty
# ============================================

$script:DOMAIN = @{
    # LAYER 1: DATA PERSISTENCE
    data = @{
        postgres = @{ desc = "Primary relational database"; size = "PostgreSQL 16" }
        redis = @{ desc = "Cache & session store"; size = "Redis 7" }
        knowledge = @{ desc = "RAG knowledge base"; size = "2082 chunks" }
    }
    
    # LAYER 2: AI/ML COMPUTE  
    ai = @{
        ollama = @{ 
            desc = "Local LLM inference engine"
            models = @("bizra-planner", "qwen2.5:7b", "deepseek-r1:8b", "mistral", "llama3.2")
            capacity = "22.6 GB"
        }
        lmstudio = @{
            desc = "Advanced model serving (Vision, Reasoning)"
            models = @("Magistral-Small-2509", "Qwen3-VL-8B", "AgentFlow-Planner", "Granite-4.0")
            capacity = "54.8 GB"
            endpoint = "http://192.168.8.1:1234"
        }
    }
    
    # LAYER 3: APPLICATION SERVICES
    services = @{
        api = @{ desc = "Rust Axum API (PAT/SAT agents)"; port = 8080 }
        dashboard = @{ desc = "Next.js 14 frontend"; port = 3000 }
        bridge = @{ desc = "Telemetry/metrics bridge"; port = 3002 }
    }
    
    # LAYER 4: OBSERVABILITY
    observability = @{
        grafana = @{ desc = "Metrics visualization"; port = 3001 }
        jaeger = @{ desc = "Distributed tracing"; port = 16686 }
        prometheus = @{ desc = "Metrics collection"; port = 9090 }
    }
    
    # LAYER 5: INFRASTRUCTURE
    infra = @{
        docker = @{ desc = "Container runtime" }
        kubernetes = @{ desc = "Orchestration (k8s configs ready)" }
        terraform = @{ desc = "Azure AKS provisioning" }
    }
}

# Service Configuration (runtime)
$script:SERVICES = @{
    postgres = @{
        name = "PostgreSQL"
        container = "bizra-node0-db"
        port = 5432
        healthUrl = $null
        critical = $true
    }
    redis = @{
        name = "Redis"
        container = "bizra-node0-redis"
        port = 6379
        healthUrl = $null
        critical = $true
    }
    ollama = @{
        name = "Ollama LLM"
        container = $null  # Host service
        port = 11434
        healthUrl = "http://localhost:11434/api/tags"
        critical = $true
    }
    api = @{
        name = "Rust API Server"
        container = $null  # Host process
        port = 8080
        healthUrl = "http://localhost:8080/health"
        critical = $true
    }
    bridge = @{
        name = "Telemetry Bridge"
        container = $null  # Host process
        port = 3002
        healthUrl = "http://localhost:3002/health"
        critical = $false
    }
    dashboard = @{
        name = "Dashboard"
        container = $null  # Host process
        port = 3000
        healthUrl = "http://localhost:3000"
        critical = $false
    }
}

# Required AI Models
$script:REQUIRED_MODELS = @(
    @{ name = "deepseek-r1:7b"; purpose = "Master Reasoner"; size = "4.5GB" }
    @{ name = "qwen2.5:7b"; purpose = "Memory/Creative/Ethics"; size = "4.7GB" }
    @{ name = "mistral:7b"; purpose = "Data/Communication"; size = "4.1GB" }
)

# ============================================
# HELPER FUNCTIONS
# ============================================

function Write-Banner {
    param([string]$Title)
    $width = 60
    $line = "=" * $width
    Write-Host ""
    Write-Host $line -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "  $script:GENESIS_BLOCK_ID | v$script:NODE0_VERSION" -ForegroundColor DarkCyan
    Write-Host $line -ForegroundColor Cyan
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "[$Title]" -ForegroundColor Yellow
    Write-Host ("-" * 50) -ForegroundColor DarkGray
}

function Write-Success { param([string]$Message) Write-Host "  ✓ $Message" -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host "  ✗ $Message" -ForegroundColor Red }
function Write-Warning { param([string]$Message) Write-Host "  ! $Message" -ForegroundColor Yellow }
function Write-Info { param([string]$Message) Write-Host "  • $Message" -ForegroundColor Gray }

function Test-ServiceRunning {
    param([string]$Name, [int]$Port, [string]$Container)
    
    # Check container if specified
    if ($Container) {
        $status = docker ps --filter "name=$Container" --format "{{.Status}}" 2>$null
        return $status -match "Up"
    }
    
    # Check port
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

function Test-ServiceHealth {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Get-ServiceStatus {
    param([hashtable]$Service)
    
    $running = Test-ServiceRunning -Name $Service.name -Port $Service.port -Container $Service.container
    $healthy = $false
    
    if ($running -and $Service.healthUrl) {
        $healthy = Test-ServiceHealth -Url $Service.healthUrl
    } elseif ($running) {
        $healthy = $true  # Assume healthy if no health URL
    }
    
    return @{
        running = $running
        healthy = $healthy
    }
}

# ============================================
# PREFLIGHT SAFETY - DEPENDENCY & MODEL CHECKS
# ============================================

function Assert-CommandAvailable {
    param(
        [string]$Name,
        [string]$Command = $Name
    )
    
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        Write-Error "$Name not found on PATH"
        return $false
    }
    
    Write-Success "$Name available"
    return $true
}

function Get-MissingModels {
    $missing = @()
    
    if (-not (Get-Command "ollama" -ErrorAction SilentlyContinue)) {
        Write-Warning "Ollama CLI not detected; model validation skipped"
        return $missing
    }
    
    $available = ollama list 2>$null
    foreach ($model in $script:REQUIRED_MODELS) {
        $installed = $available | Select-String $model.name
        if (-not $installed) {
            $missing += $model.name
        }
    }
    
    return $missing
}

function Invoke-Preflight {
    Write-Section "PREFLIGHT VALIDATION"
    
    $failures = @()
    
    if (-not (Assert-CommandAvailable -Name "Docker CLI" -Command "docker")) { $failures += "docker" }
    if (-not (Assert-CommandAvailable -Name "Docker Compose" -Command "docker-compose")) { $failures += "docker-compose" }
    if (-not (Assert-CommandAvailable -Name "Node.js" -Command "node")) { $failures += "node" }
    
    # Check required models
    $missingModels = Get-MissingModels
    if ($missingModels.Count -gt 0) {
        Write-Warning "Missing required models: $($missingModels -join ', ')"
        $failures += "models"
    } else {
        Write-Success "Required models present"
    }
    
    if ($failures.Count -gt 0 -and -not $Force) {
        Write-Error "Preflight failed: $($failures -join ', ')"
        throw "Preflight validation failed. Resolve issues or rerun with -Force."
    } elseif ($failures.Count -gt 0) {
        Write-Warning "Continuing despite preflight warnings due to -Force"
    } else {
        Write-Success "Preflight checks passed"
    }
}

# ============================================
# COMMAND: STATUS
# ============================================

function Invoke-Status {
    Write-Banner "NODE0 SYSTEM STATUS"
    
    # Services Status
    Write-Section "SERVICES"
    
    $allHealthy = $true
    $serviceStatuses = @()
    foreach ($key in $script:SERVICES.Keys) {
        $service = $script:SERVICES[$key]
        $status = Get-ServiceStatus -Service $service
        
        $icon = if ($status.healthy) { "🟢" } elseif ($status.running) { "🟡" } else { "🔴" }
        $statusText = if ($status.healthy) { "Healthy" } elseif ($status.running) { "Running (Unhealthy)" } else { "Stopped" }
        
        Write-Host "  $icon $($service.name.PadRight(20)) $statusText" -ForegroundColor $(if ($status.healthy) { "Green" } elseif ($status.running) { "Yellow" } else { "Red" })
        Write-Host "     Port: $($service.port)" -ForegroundColor DarkGray
        
        if (-not $status.healthy -and $service.critical) {
            $allHealthy = $false
        }

        $serviceStatuses += @{
            id = $key
            name = $service.name
            port = $service.port
            container = $service.container
            running = $status.running
            healthy = $status.healthy
            critical = $service.critical
        }
    }
    
    # Docker Status
    Write-Section "DOCKER CONTAINERS"
    docker ps --filter "name=bizra" --format "table {{.Names}}\t{{.Status}}" 2>$null
    
    # Ollama Models
    Write-Section "AI MODELS"
    $models = ollama list 2>$null
    if ($models) {
        $models | ForEach-Object { Write-Info $_ }
    } else {
        Write-Warning "Ollama not responding"
    }
    
    # Disk Usage
    Write-Section "STORAGE"
    $dockerSize = docker system df --format "{{.Size}}" 2>$null | Select-Object -First 1
    Write-Info "Docker: $dockerSize"
    
    $projectSize = (Get-ChildItem -Path $script:PROJECT_ROOT -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
    Write-Info "Project: $([math]::Round($projectSize, 2)) GB"
    
    # Summary
    Write-Section "SUMMARY"
    if ($allHealthy) {
        Write-Success "All critical services healthy"
        Write-Host "  🚀 Node0 is OPERATIONAL" -ForegroundColor Green
    } else {
        Write-Error "Some critical services are not healthy"
        Write-Host "  ⚠️  Node0 needs attention" -ForegroundColor Yellow
    }
    if ($DetailedOutput) {
        $payload = @{
            genesis_id    = $script:GENESIS_BLOCK_ID
            node_version  = $script:NODE0_VERSION
            timestamp     = (Get-Date).ToString("o")
            services      = $serviceStatuses
            missingModels = Get-MissingModels
            healthy       = $allHealthy
        }
        Write-Section "MACHINE READABLE STATUS (JSON)"
        $payload | ConvertTo-Json -Depth 4
    }
}

# ============================================
# COMMAND: START
# ============================================

function Invoke-Start {
    Write-Banner "STARTING NODE0 SERVICES"
    
    # Safety gate: ensure dependencies + models
    try {
        Invoke-Preflight
    } catch {
        Write-Error $_
        return
    }
    
    # Start Docker services
    Write-Section "DOCKER INFRASTRUCTURE"
    Set-Location $script:PROJECT_ROOT
    docker-compose -f docker/docker-compose.node0.yml up -d
    Write-Success "Docker containers started"
    
    # Wait for services
    Write-Info "Waiting for services to initialize..."
    Start-Sleep -Seconds 5
    
    # Check Ollama
    Write-Section "OLLAMA LLM ENGINE"
    $ollamaRunning = Test-NetConnection -ComputerName localhost -Port 11434 -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($ollamaRunning) {
        Write-Success "Ollama is running"
    } else {
        Write-Warning "Ollama not detected - start it manually or run: ollama serve"
    }
    
    # Start API Server
    Write-Section "RUST API SERVER"
    $apiStatus = Get-ServiceStatus -Service $script:SERVICES.api
    if ($apiStatus.running) {
        Write-Info "API Server already running on port $($script:SERVICES.api.port)"
    } elseif (Test-Path "$script:PROJECT_ROOT/backend/Cargo.toml") {
        Write-Info "Starting Rust API Server in background..."
        Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd '$script:PROJECT_ROOT/backend'; cargo run --release" -WindowStyle Minimized
        Write-Success "API Server starting (port 8080)"
    } else {
        Write-Warning "Backend not found"
    }
    
    # Start Bridge
    Write-Section "TELEMETRY BRIDGE"
    $bridgeStatus = Get-ServiceStatus -Service $script:SERVICES.bridge
    if ($bridgeStatus.running) {
        Write-Info "Telemetry Bridge already running on port $($script:SERVICES.bridge.port)"
    } elseif (Test-Path "$script:PROJECT_ROOT/bridge/package.json") {
        Write-Info "Starting Telemetry Bridge..."
        Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd '$script:PROJECT_ROOT/bridge'; npm start" -WindowStyle Minimized
        Write-Success "Telemetry Bridge starting (port 3002)"
    }
    
    # Start Dashboard
    Write-Section "DASHBOARD"
    $dashboardStatus = Get-ServiceStatus -Service $script:SERVICES.dashboard
    if ($dashboardStatus.running) {
        Write-Info "Dashboard already running on port $($script:SERVICES.dashboard.port)"
    } elseif (Test-Path "$script:PROJECT_ROOT/apps/dashboard/package.json") {
        Write-Info "Starting Dashboard..."
        Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd '$script:PROJECT_ROOT/apps/dashboard'; npm run dev" -WindowStyle Minimized
        Write-Success "Dashboard starting (port 3000)"
    }
    
    Write-Section "STARTUP COMPLETE"
    Write-Host ""
    Write-Host "  Dashboard:     http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  API:           http://localhost:8080" -ForegroundColor Cyan
    Write-Host "  Health Check:  http://localhost:8080/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Success "Node0 Genesis Block ACTIVATED"
}

# ============================================
# COMMAND: STOP
# ============================================

function Invoke-Stop {
    Write-Banner "STOPPING NODE0 SERVICES"
    
    # Stop host processes
    Write-Section "STOPPING HOST PROCESSES"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*bizra*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Success "Node.js processes stopped"
    
    # Stop Docker services
    Write-Section "STOPPING DOCKER CONTAINERS"
    Set-Location $script:PROJECT_ROOT
    docker-compose -f docker/docker-compose.node0.yml down
    Write-Success "Docker containers stopped"
    
    Write-Section "SHUTDOWN COMPLETE"
    Write-Success "Node0 services stopped"
}

# ============================================
# COMMAND: HEALTH
# ============================================

function Invoke-Health {
    Write-Banner "NODE0 HEALTH CHECK"
    
    $results = @()
    
    foreach ($key in $script:SERVICES.Keys) {
        $service = $script:SERVICES[$key]
        $status = Get-ServiceStatus -Service $service
        
        $results += @{
            name = $service.name
            running = $status.running
            healthy = $status.healthy
            critical = $service.critical
        }
        
        $icon = if ($status.healthy) { "✓" } elseif ($status.running) { "~" } else { "✗" }
        $color = if ($status.healthy) { "Green" } elseif ($status.running) { "Yellow" } else { "Red" }
        Write-Host "  $icon $($service.name)" -ForegroundColor $color
    }
    
    # Run Python validator if available
    $validatorPath = Join-Path $script:SCRIPTS_DIR "validate_system.py"
    if (Test-Path $validatorPath) {
        Write-Section "SYSTEM VALIDATION"
        python $validatorPath
    }
    
    # Summary
    $healthy = ($results | Where-Object { $_.healthy }).Count
    $total = $results.Count
    $critical = ($results | Where-Object { $_.critical -and -not $_.healthy }).Count
    
    Write-Section "HEALTH SUMMARY"
    Write-Host "  Services: $healthy/$total healthy" -ForegroundColor $(if ($healthy -eq $total) { "Green" } else { "Yellow" })
    
    if ($critical -gt 0) {
        Write-Error "$critical critical services unhealthy"
        exit 1
    } else {
        Write-Success "All critical services healthy"
        exit 0
    }
}

# ============================================
# COMMAND: MODELS
# ============================================

# LM Studio Configuration
$script:LMSTUDIO_MODELS_PATH = "$env:USERPROFILE\.lmstudio\models"
$script:LMSTUDIO_HOST = "192.168.8.1"
$script:LMSTUDIO_PORT = 1234
$script:LMSTUDIO_URL = "http://$($script:LMSTUDIO_HOST):$($script:LMSTUDIO_PORT)"

function Get-LMStudioModels {
    $models = @()
    if (Test-Path $script:LMSTUDIO_MODELS_PATH) {
        Get-ChildItem $script:LMSTUDIO_MODELS_PATH -Recurse -File -Filter "*.gguf" | ForEach-Object {
            $models += @{
                name = $_.BaseName
                size = [math]::Round($_.Length/1GB, 2)
                path = $_.FullName
                provider = "LM Studio"
            }
        }
    }
    return $models
}

function Test-LMStudioRunning {
    try {
        $response = Invoke-RestMethod -Uri "$($script:LMSTUDIO_URL)/v1/models" -TimeoutSec 2 -ErrorAction SilentlyContinue
        return $true
    } catch {
        return $false
    }
}

function Invoke-Models {
    param([string]$SubCmd, [string]$ModelName)
    
    Write-Banner "AI MODEL MANAGEMENT"
    
    switch ($SubCmd) {
        "list" {
            # Ollama Models
            Write-Section "OLLAMA MODELS"
            $ollamaRunning = Test-NetConnection -ComputerName localhost -Port 11434 -WarningAction SilentlyContinue -InformationLevel Quiet
            if ($ollamaRunning) {
                ollama list
            } else {
                Write-Warning "Ollama not running"
            }
            
            # LM Studio Models
            Write-Section "LM STUDIO MODELS"
            $lmModels = Get-LMStudioModels
            if ($lmModels.Count -gt 0) {
                $lmRunning = Test-LMStudioRunning
                $statusIcon = if ($lmRunning) { "🟢" } else { "⚫" }
                Write-Host "  Server Status: $statusIcon $(if ($lmRunning) { "Running at $script:LMSTUDIO_URL" } else { 'Not Running' })" -ForegroundColor $(if ($lmRunning) { 'Green' } else { 'Gray' })
                Write-Host ""
                Write-Host "  NAME                                          SIZE (GB)  " -ForegroundColor Cyan
                Write-Host "  ----                                          ---------  " -ForegroundColor DarkGray
                foreach ($model in $lmModels) {
                    Write-Host "  $($model.name.PadRight(45)) $($model.size.ToString().PadLeft(6))"
                }
                Write-Host ""
                Write-Host "  Total: $($lmModels.Count) models | $(($lmModels | Measure-Object -Property size -Sum).Sum) GB" -ForegroundColor DarkGray
            } else {
                Write-Info "No LM Studio models found at: $script:LMSTUDIO_MODELS_PATH"
            }
            
            # Required Models Status
            Write-Section "REQUIRED MODELS CHECK"
            foreach ($model in $script:REQUIRED_MODELS) {
                $installed = ollama list 2>$null | Select-String $model.name
                $icon = if ($installed) { "✓" } else { "✗" }
                $color = if ($installed) { "Green" } else { "Red" }
                Write-Host "  $icon $($model.name.PadRight(20)) $($model.purpose) ($($model.size))" -ForegroundColor $color
            }
        }
        "lmstudio" {
            Write-Section "LM STUDIO STATUS"
            $lmRunning = Test-LMStudioRunning
            if ($lmRunning) {
                Write-Success "LM Studio server running at $script:LMSTUDIO_URL"
                try {
                    $response = Invoke-RestMethod -Uri "$($script:LMSTUDIO_URL)/v1/models" -ErrorAction Stop
                    Write-Host "  Loaded models:" -ForegroundColor Cyan
                    foreach ($m in $response.data) {
                        Write-Host "    • $($m.id)" -ForegroundColor Green
                    }
                } catch {
                    Write-Info "No model currently loaded"
                }
            } else {
                Write-Warning "LM Studio server not running"
                Write-Info "Start LM Studio and enable 'Local Server' to use models"
            }
            
            Write-Section "INSTALLED LM STUDIO MODELS"
            $lmModels = Get-LMStudioModels
            foreach ($model in $lmModels) {
                Write-Host "  • $($model.name) ($($model.size) GB)"
            }
        }
        "pull" {
            if ($ModelName) {
                Write-Info "Pulling model: $ModelName"
                ollama pull $ModelName
            } else {
                Write-Section "PULLING ALL REQUIRED MODELS"
                foreach ($model in $script:REQUIRED_MODELS) {
                    Write-Info "Pulling $($model.name)..."
                    ollama pull $model.name
                }
            }
        }
        "remove" {
            if ($ModelName) {
                Write-Warning "Removing model: $ModelName"
                ollama rm $ModelName
            }
        }
        "verify" {
            Write-Section "VERIFYING ALL AI BACKENDS"
            
            # Check Ollama
            Write-Host ""
            Write-Host "  [OLLAMA]" -ForegroundColor Cyan
            $ollamaRunning = Test-NetConnection -ComputerName localhost -Port 11434 -WarningAction SilentlyContinue -InformationLevel Quiet
            if ($ollamaRunning) {
                Write-Success "  Ollama server running"
                $missing = @()
                foreach ($model in $script:REQUIRED_MODELS) {
                    $installed = ollama list 2>$null | Select-String $model.name
                    if ($installed) {
                        Write-Success "  $($model.name)"
                    } else {
                        Write-Error "  $($model.name) MISSING"
                        $missing += $model.name
                    }
                }
            } else {
                Write-Error "  Ollama not running"
            }
            
            # Check LM Studio
            Write-Host ""
            Write-Host "  [LM STUDIO]" -ForegroundColor Magenta
            $lmModels = Get-LMStudioModels
            if ($lmModels.Count -gt 0) {
                Write-Success "  Found $($lmModels.Count) models"
                $lmRunning = Test-LMStudioRunning
                if ($lmRunning) {
                    Write-Success "  Server running at $script:LMSTUDIO_URL"
                } else {
                    Write-Warning "  Server not running (start LM Studio for API access)"
                }
            } else {
                Write-Info "  No LM Studio models installed"
            }
        }
        default {
            Write-Host "Usage: node0 models <list|lmstudio|pull|remove|verify> [model-name]"
            Write-Host ""
            Write-Host "Commands:"
            Write-Host "  list      List all models (Ollama + LM Studio)"
            Write-Host "  lmstudio  Show LM Studio status and loaded model"
            Write-Host "  pull      Pull Ollama model"
            Write-Host "  remove    Remove Ollama model"
            Write-Host "  verify    Verify all AI backends"
        }
    }
}

# ============================================
# COMMAND: BACKUP
# ============================================

function Invoke-Backup {
    param([string]$SubCmd)
    
    Write-Banner "BACKUP MANAGEMENT"
    
    # Ensure backup directory exists
    if (-not (Test-Path $script:BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $script:BACKUP_DIR -Force | Out-Null
    }
    
    switch ($SubCmd) {
        "create" {
            $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
            $backupName = "node0_backup_$timestamp"
            $backupPath = Join-Path $script:BACKUP_DIR $backupName
            
            Write-Section "CREATING BACKUP: $backupName"
            New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
            
            # Backup PostgreSQL
            Write-Info "Backing up PostgreSQL..."
            docker exec bizra-node0-db pg_dump -U bizra_node0 bizra_genesis > "$backupPath/postgres_dump.sql"
            Write-Success "PostgreSQL backed up"
            
            # Backup Redis
            Write-Info "Backing up Redis..."
            docker exec bizra-node0-redis redis-cli BGSAVE
            Start-Sleep -Seconds 2
            docker cp bizra-node0-redis:/data/dump.rdb "$backupPath/redis_dump.rdb" 2>$null
            Write-Success "Redis backed up"
            
            # Backup Knowledge Base
            Write-Info "Backing up Knowledge Base..."
            Copy-Item "$script:PROJECT_ROOT/knowledge/REFINED_KNOWLEDGE_BASE.json" "$backupPath/" -ErrorAction SilentlyContinue
            Write-Success "Knowledge Base backed up"
            
            # Backup Configuration
            Write-Info "Backing up configuration..."
            Copy-Item "$script:PROJECT_ROOT/.env" "$backupPath/" -ErrorAction SilentlyContinue
            Write-Success "Configuration backed up"
            
            # Create manifest
            @{
                timestamp = $timestamp
                version = $script:NODE0_VERSION
                genesis_block = $script:GENESIS_BLOCK_ID
                components = @("postgres", "redis", "knowledge", "config")
            } | ConvertTo-Json | Out-File "$backupPath/manifest.json"
            
            Write-Section "BACKUP COMPLETE"
            Write-Success "Backup saved to: $backupPath"
        }
        "list" {
            Write-Section "AVAILABLE BACKUPS"
            Get-ChildItem $script:BACKUP_DIR -Directory | ForEach-Object {
                $manifest = Get-Content "$($_.FullName)/manifest.json" -ErrorAction SilentlyContinue | ConvertFrom-Json
                Write-Info "$($_.Name) - v$($manifest.version)"
            }
        }
        "restore" {
            if ($Arg1) {
                $backupPath = Join-Path $script:BACKUP_DIR $Arg1
                if (Test-Path $backupPath) {
                    Write-Warning "This will overwrite current data. Continue? (y/N)"
                    $confirm = Read-Host
                    if ($confirm -eq 'y') {
                        Write-Section "RESTORING FROM: $Arg1"
                        
                        # Restore PostgreSQL
                        Write-Info "Restoring PostgreSQL..."
                        Get-Content "$backupPath/postgres_dump.sql" | docker exec -i bizra-node0-db psql -U bizra_node0 bizra_genesis
                        Write-Success "PostgreSQL restored"
                        
                        Write-Success "Restore complete"
                    }
                } else {
                    Write-Error "Backup not found: $Arg1"
                }
            } else {
                Write-Host "Usage: node0 backup restore <backup-name>"
            }
        }
        default {
            Write-Host "Usage: node0 backup <create|list|restore> [backup-name]"
        }
    }
}

# ============================================
# COMMAND: DB
# ============================================

function Invoke-Db {
    param([string]$SubCmd)
    
    Write-Banner "DATABASE MANAGEMENT"
    
    switch ($SubCmd) {
        "status" {
            Write-Section "DATABASE STATUS"
            docker exec bizra-node0-db psql -U bizra_node0 -d bizra_genesis -c "\dt" 2>$null
        }
        "migrate" {
            Write-Section "RUNNING MIGRATIONS"
            $initSql = Join-Path $script:PROJECT_ROOT "scripts/init-db.sql"
            if (Test-Path $initSql) {
                Get-Content $initSql | docker exec -i bizra-node0-db psql -U bizra_node0 -d bizra_genesis
                Write-Success "Migrations complete"
            }
        }
        "shell" {
            Write-Info "Connecting to PostgreSQL..."
            docker exec -it bizra-node0-db psql -U bizra_node0 -d bizra_genesis
        }
        "reset" {
            Write-Warning "This will DELETE all data. Continue? (y/N)"
            $confirm = Read-Host
            if ($confirm -eq 'y') {
                docker exec bizra-node0-db psql -U bizra_node0 -d postgres -c "DROP DATABASE IF EXISTS bizra_genesis; CREATE DATABASE bizra_genesis;"
                Invoke-Db -SubCmd "migrate"
                Write-Success "Database reset complete"
            }
        }
        default {
            Write-Host "Usage: node0 db <status|migrate|shell|reset>"
        }
    }
}

# ============================================
# COMMAND: LOGS
# ============================================

function Invoke-Logs {
    param([string]$SubCmd)
    
    Write-Banner "LOG VIEWER"
    
    switch ($SubCmd) {
        "docker" {
            docker-compose -f "$script:PROJECT_ROOT/docker/docker-compose.node0.yml" logs --tail=100 -f
        }
        "api" {
            Write-Info "Tailing API logs..."
            # Would tail from log file or stdout
        }
        "all" {
            Write-Section "DOCKER LOGS"
            docker-compose -f "$script:PROJECT_ROOT/docker/docker-compose.node0.yml" logs --tail=20
        }
        default {
            Invoke-Logs -SubCmd "all"
        }
    }
}

# ============================================
# COMMAND: VALIDATE
# ============================================

function Invoke-Validate {
    Write-Banner "SYSTEM VALIDATION"
    
    $validatorPath = Join-Path $script:SCRIPTS_DIR "validate_system.py"
    if (Test-Path $validatorPath) {
        python $validatorPath
    } else {
        Write-Error "Validator not found"
    }
}

# ============================================
# COMMAND: PACKAGE
# ============================================

function Invoke-Package {
    Write-Banner "GENESIS BLOCK PACKAGE BUILDER"
    
    Write-Warning "Package builder coming soon..."
    Write-Info "This will create distribution packages for federation nodes"
}

# ============================================
# COMMAND: DOMAIN - Your Sovereign Territory
# ============================================

function Invoke-Domain {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "  ║                                                                  ║" -ForegroundColor Magenta
    Write-Host "  ║       BIZRA SOVEREIGN DOMAIN - INTERDISCIPLINARY MAP             ║" -ForegroundColor White
    Write-Host "  ║                   You Own ALL of This                            ║" -ForegroundColor Cyan
    Write-Host "  ║                                                                  ║" -ForegroundColor Magenta
    Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
    
    # Calculate totals
    $ollamaSize = 22.6
    $lmstudioSize = 54.8
    $totalAI = $ollamaSize + $lmstudioSize
    
    # LAYER 1: DATA
    Write-Host "  ┌─────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  LAYER 1: DATA PERSISTENCE                                      │" -ForegroundColor Yellow
    Write-Host "  ├─────────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  📦 PostgreSQL 16    Primary relational database     :5432      │" -ForegroundColor White
    Write-Host "  │  ⚡ Redis 7          Cache & session store           :6379      │" -ForegroundColor White
    Write-Host "  │  🧠 Knowledge Base   RAG system (2082 chunks)        Local      │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    # LAYER 2: AI/ML
    Write-Host "  ┌─────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  LAYER 2: AI/ML COMPUTE                      Total: $($totalAI.ToString('F1')) GB     │" -ForegroundColor Yellow
    Write-Host "  ├─────────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │                                                                 │" -ForegroundColor DarkGray
    Write-Host "  │  🦙 OLLAMA (localhost:11434)                         22.6 GB    │" -ForegroundColor Cyan
    Write-Host "  │     • bizra-planner      Custom planning agent                  │" -ForegroundColor White
    Write-Host "  │     • qwen2.5:7b         Memory/Creative/Ethics                 │" -ForegroundColor White
    Write-Host "  │     • deepseek-r1:8b     Deep reasoning                         │" -ForegroundColor White
    Write-Host "  │     • mistral            Fast inference                         │" -ForegroundColor White
    Write-Host "  │     • llama3.2           General purpose                        │" -ForegroundColor White
    Write-Host "  │                                                                 │" -ForegroundColor DarkGray
    Write-Host "  │  🔮 LM STUDIO (192.168.8.1:1234)                      54.8 GB   │" -ForegroundColor Magenta
    Write-Host "  │     • Magistral-Small-2509   Advanced reasoning (23GB)          │" -ForegroundColor White
    Write-Host "  │     • Qwen3-VL-8B            Vision + Language                  │" -ForegroundColor White
    Write-Host "  │     • AgentFlow-Planner      Agent orchestration                │" -ForegroundColor White
    Write-Host "  │     • Qwen3-4B-Thinking      Chain of thought                   │" -ForegroundColor White
    Write-Host "  │     • Granite-4.0-tiny       IBM efficient model                │" -ForegroundColor White
    Write-Host "  │     • nomic-embed            Embeddings for RAG                 │" -ForegroundColor White
    Write-Host "  │                                                                 │" -ForegroundColor DarkGray
    Write-Host "  └─────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    # LAYER 3: SERVICES
    Write-Host "  ┌─────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  LAYER 3: APPLICATION SERVICES                                  │" -ForegroundColor Yellow
    Write-Host "  ├─────────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  🦀 Rust API Server   PAT/SAT Agent Orchestration    :8080      │" -ForegroundColor White
    Write-Host "  │  ⚛️  Next.js 14        Dashboard & UI                 :3000      │" -ForegroundColor White
    Write-Host "  │  📡 Telemetry Bridge  Metrics/Events streaming       :3002      │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    # LAYER 4: OBSERVABILITY
    Write-Host "  ┌─────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  LAYER 4: OBSERVABILITY                                         │" -ForegroundColor Yellow
    Write-Host "  ├─────────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  📊 Grafana           Metrics visualization          :3001      │" -ForegroundColor White
    Write-Host "  │  🔍 Jaeger            Distributed tracing            :16686     │" -ForegroundColor White
    Write-Host "  │  📈 Prometheus        Metrics collection             :9090      │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    # LAYER 5: INFRASTRUCTURE
    Write-Host "  ┌─────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  LAYER 5: INFRASTRUCTURE                                        │" -ForegroundColor Yellow
    Write-Host "  ├─────────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  🐳 Docker            Container runtime              Local      │" -ForegroundColor White
    Write-Host "  │  ☸️  Kubernetes        Orchestration configs          Ready      │" -ForegroundColor White
    Write-Host "  │  🏗️  Terraform         Azure AKS provisioning         Ready      │" -ForegroundColor White
    Write-Host "  │  🔄 GitHub Actions    CI/CD (6 quality gates)        Active     │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    # SOVEREIGNTY SUMMARY
    Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║  SOVEREIGNTY SUMMARY                                             ║" -ForegroundColor Green
    Write-Host "  ╠══════════════════════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "  ║  🏰 Genesis Block:    NODE0-TITAN (Source of all federation)     ║" -ForegroundColor White
    Write-Host "  ║  🧠 AI Capacity:      77.4 GB across 14 models                   ║" -ForegroundColor White
    Write-Host "  ║  📚 Knowledge:        2082 indexed chunks (RAG-ready)            ║" -ForegroundColor White
    Write-Host "  ║  🔒 Data:             PostgreSQL + Redis (local-first)           ║" -ForegroundColor White
    Write-Host "  ║  🌐 Federation:       Ready to distribute to child nodes         ║" -ForegroundColor White
    Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  This is YOUR sovereign compute domain. All software originates here." -ForegroundColor Cyan
    Write-Host "  Child nodes receive only what Node0 authorizes for distribution." -ForegroundColor DarkCyan
    Write-Host ""
}

# ============================================
# COMMAND: BENCH - Elite Performance Benchmark
# Professional-grade system benchmarking
# ============================================

function Invoke-Bench {
    param([string]$SubCmd = 'full')
    
    Write-Banner "ELITE PERFORMANCE BENCHMARK"
    
    # Initialize results
    $benchResults = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        GenesisBlock = $script:GENESIS_BLOCK_ID
        Tests = @{}
        Score = 0
        MaxScore = 100
    }
    
    switch ($SubCmd) {
        'ai'      { $benchResults = Invoke-AIBench $benchResults }
        'db'      { $benchResults = Invoke-DBBench $benchResults }
        'api'     { $benchResults = Invoke-APIBench $benchResults }
        'net'     { $benchResults = Invoke-NetworkBench $benchResults }
        'full'    { $benchResults = Invoke-FullBench $benchResults }
        default   { 
            Write-Host "  bench [full|ai|db|api|net] - Run specific benchmark" -ForegroundColor Yellow
            return 
        }
    }
    
    # Generate final report
    Show-BenchReport $benchResults
}

function Invoke-FullBench {
    param($Results)
    
    Write-Host ""
    Write-Host "  ┌──────────────────────────────────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "  │           COMPREHENSIVE GENESIS BLOCK BENCHMARK                  │" -ForegroundColor Cyan  
    Write-Host "  │                 Testing All System Layers                        │" -ForegroundColor Cyan
    Write-Host "  └──────────────────────────────────────────────────────────────────┘" -ForegroundColor Cyan
    Write-Host ""
    
    $Results = Invoke-AIBench $Results
    $Results = Invoke-DBBench $Results
    $Results = Invoke-APIBench $Results
    $Results = Invoke-NetworkBench $Results
    $Results = Invoke-MemoryBench $Results
    $Results = Invoke-DiskBench $Results
    
    return $Results
}

function Invoke-AIBench {
    param($Results)
    
    Write-Host ""
    Write-Host "  ╭─────────────────────────────────────────────────────────────────╮" -ForegroundColor Magenta
    Write-Host "  │  🤖 AI INFERENCE BENCHMARK                                      │" -ForegroundColor Magenta
    Write-Host "  ╰─────────────────────────────────────────────────────────────────╯" -ForegroundColor Magenta
    Write-Host ""
    
    $aiResults = @{
        Ollama = @{ Status = "Unknown"; Latency = 0; TokensPerSec = 0 }
        LMStudio = @{ Status = "Unknown"; Latency = 0; TokensPerSec = 0 }
    }
    
    # Test Ollama
    Write-Host "  Testing Ollama (localhost:11434)..." -ForegroundColor Gray -NoNewline
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $testPrompt = @{ model = "llama3.2"; prompt = "Say 'benchmark complete' in 3 words"; stream = $false }
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" `
            -Method POST -ContentType "application/json" `
            -Body ($testPrompt | ConvertTo-Json) -TimeoutSec 30
        $sw.Stop()
        
        $latency = $sw.ElapsedMilliseconds
        $evalDuration = if ($response.eval_duration) { $response.eval_duration / 1000000000 } else { 1 }
        $evalCount = if ($response.eval_count) { $response.eval_count } else { 10 }
        $tokensPerSec = [math]::Round($evalCount / $evalDuration, 2)
        
        $aiResults.Ollama = @{
            Status = "✅ PASS"
            Latency = $latency
            TokensPerSec = $tokensPerSec
        }
        Write-Host " $($latency)ms | $($tokensPerSec) tok/s" -ForegroundColor Green
    }
    catch {
        $aiResults.Ollama.Status = "❌ FAIL"
        Write-Host " FAILED" -ForegroundColor Red
    }
    
    # Test LM Studio  
    Write-Host "  Testing LM Studio (192.168.8.1:1234)..." -ForegroundColor Gray -NoNewline
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $chatBody = @{
            model = "local-model"
            messages = @(@{ role = "user"; content = "Say 'benchmark complete'" })
            max_tokens = 10
        }
        $response = Invoke-RestMethod -Uri "http://192.168.8.1:1234/v1/chat/completions" `
            -Method POST -ContentType "application/json" `
            -Body ($chatBody | ConvertTo-Json -Depth 5) -TimeoutSec 30
        $sw.Stop()
        
        $latency = $sw.ElapsedMilliseconds
        $usage = if ($response.usage) { $response.usage } else { @{ completion_tokens = 5 } }
        $tokensPerSec = [math]::Round($usage.completion_tokens / ($latency / 1000), 2)
        
        $aiResults.LMStudio = @{
            Status = "✅ PASS"
            Latency = $latency
            TokensPerSec = $tokensPerSec
        }
        Write-Host " $($latency)ms | $($tokensPerSec) tok/s" -ForegroundColor Green
    }
    catch {
        $aiResults.LMStudio.Status = "❌ FAIL"
        Write-Host " FAILED (Offline or unreachable)" -ForegroundColor Red
    }
    
    # Calculate AI score (25 points max)
    $aiScore = 0
    if ($aiResults.Ollama.Status -match "PASS") { $aiScore += 12 }
    if ($aiResults.LMStudio.Status -match "PASS") { $aiScore += 13 }
    
    # Bonus for fast inference
    if ($aiResults.Ollama.TokensPerSec -gt 20) { $aiScore += 2 }
    if ($aiResults.LMStudio.TokensPerSec -gt 30) { $aiScore += 3 }
    
    $Results.Tests["AI"] = @{
        Score = [math]::Min($aiScore, 25)
        MaxScore = 25
        Details = $aiResults
    }
    
    Write-Host ""
    Write-Host "  AI Benchmark Score: $($Results.Tests['AI'].Score)/$($Results.Tests['AI'].MaxScore)" -ForegroundColor $(if ($aiScore -ge 20) { "Green" } else { "Yellow" })
    
    return $Results
}

function Invoke-DBBench {
    param($Results)
    
    Write-Host ""
    Write-Host "  ╭─────────────────────────────────────────────────────────────────╮" -ForegroundColor Blue
    Write-Host "  │  🗄️  DATABASE PERFORMANCE BENCHMARK                             │" -ForegroundColor Blue
    Write-Host "  ╰─────────────────────────────────────────────────────────────────╯" -ForegroundColor Blue
    Write-Host ""
    
    $dbResults = @{
        PostgreSQL = @{ Status = "Unknown"; ReadLatency = 0; WriteLatency = 0; QPS = 0 }
        Redis = @{ Status = "Unknown"; GetLatency = 0; SetLatency = 0; OPS = 0 }
    }
    
    # Test PostgreSQL
    Write-Host "  Testing PostgreSQL (localhost:5432)..." -ForegroundColor Gray
    try {
        $pgContainer = docker ps --filter "name=bizra" --filter "status=running" --format "{{.Names}}" 2>$null | Where-Object { $_ -match "postgres|db" } | Select-Object -First 1
        
        if ($pgContainer) {
            # Measure read latency
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            docker exec $pgContainer psql -U postgres -c "SELECT 1" 2>$null | Out-Null
            $sw.Stop()
            $readLatency = $sw.ElapsedMilliseconds
            
            # Measure write latency (create temp and drop)
            $sw.Restart()
            docker exec $pgContainer psql -U postgres -c "CREATE TEMP TABLE bench_test(id INT); DROP TABLE bench_test;" 2>$null | Out-Null
            $sw.Stop()
            $writeLatency = $sw.ElapsedMilliseconds
            
            # Estimate QPS from latency
            $estimatedQPS = [math]::Round(1000 / [math]::Max($readLatency, 1))
            
            $dbResults.PostgreSQL = @{
                Status = "✅ PASS"
                ReadLatency = $readLatency
                WriteLatency = $writeLatency
                QPS = $estimatedQPS
            }
            Write-Host "    Read: $($readLatency)ms | Write: $($writeLatency)ms | Est. QPS: ~$estimatedQPS" -ForegroundColor Green
        }
        else {
            $dbResults.PostgreSQL.Status = "⚠️ SKIP"
            Write-Host "    PostgreSQL container not running" -ForegroundColor Yellow
        }
    }
    catch {
        $dbResults.PostgreSQL.Status = "❌ FAIL"
        Write-Host "    PostgreSQL test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test Redis
    Write-Host "  Testing Redis (localhost:6379)..." -ForegroundColor Gray
    try {
        $redisContainer = docker ps --filter "name=redis" --filter "status=running" --format "{{.Names}}" 2>$null | Select-Object -First 1
        
        if ($redisContainer) {
            # Measure SET latency
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            docker exec $redisContainer redis-cli SET bench_test "benchmark_value" 2>$null | Out-Null
            $sw.Stop()
            $setLatency = $sw.ElapsedMilliseconds
            
            # Measure GET latency
            $sw.Restart()
            docker exec $redisContainer redis-cli GET bench_test 2>$null | Out-Null
            $sw.Stop()
            $getLatency = $sw.ElapsedMilliseconds
            
            # Cleanup
            docker exec $redisContainer redis-cli DEL bench_test 2>$null | Out-Null
            
            # Estimate OPS
            $estimatedOPS = [math]::Round(1000 / [math]::Max($getLatency, 1))
            
            $dbResults.Redis = @{
                Status = "✅ PASS"
                SetLatency = $setLatency
                GetLatency = $getLatency
                OPS = $estimatedOPS
            }
            Write-Host "    SET: $($setLatency)ms | GET: $($getLatency)ms | Est. OPS: ~$estimatedOPS" -ForegroundColor Green
        }
        else {
            $dbResults.Redis.Status = "⚠️ SKIP"
            Write-Host "    Redis container not running" -ForegroundColor Yellow
        }
    }
    catch {
        $dbResults.Redis.Status = "❌ FAIL"
        Write-Host "    Redis test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Calculate DB score (20 points max)
    $dbScore = 0
    if ($dbResults.PostgreSQL.Status -match "PASS") { $dbScore += 10 }
    if ($dbResults.Redis.Status -match "PASS") { $dbScore += 10 }
    
    # Bonus for sub-50ms latency
    if ($dbResults.PostgreSQL.ReadLatency -gt 0 -and $dbResults.PostgreSQL.ReadLatency -lt 50) { $dbScore += 2 }
    if ($dbResults.Redis.GetLatency -gt 0 -and $dbResults.Redis.GetLatency -lt 20) { $dbScore += 3 }
    
    $Results.Tests["Database"] = @{
        Score = [math]::Min($dbScore, 20)
        MaxScore = 20
        Details = $dbResults
    }
    
    Write-Host ""
    Write-Host "  Database Benchmark Score: $($Results.Tests['Database'].Score)/$($Results.Tests['Database'].MaxScore)" -ForegroundColor $(if ($dbScore -ge 15) { "Green" } else { "Yellow" })
    
    return $Results
}

function Invoke-APIBench {
    param($Results)
    
    Write-Host ""
    Write-Host "  ╭─────────────────────────────────────────────────────────────────╮" -ForegroundColor Green
    Write-Host "  │  🚀 API ENDPOINT BENCHMARK                                      │" -ForegroundColor Green
    Write-Host "  ╰─────────────────────────────────────────────────────────────────╯" -ForegroundColor Green
    Write-Host ""
    
    $apiResults = @{
        RustAPI = @{ Status = "Unknown"; HealthLatency = 0 }
        NextJS = @{ Status = "Unknown"; PageLatency = 0 }
    }
    
    # Test Rust API health
    Write-Host "  Testing Rust API (localhost:8080)..." -ForegroundColor Gray -NoNewline
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        $sw.Stop()
        
        $apiResults.RustAPI = @{
            Status = "✅ PASS"
            HealthLatency = $sw.ElapsedMilliseconds
        }
        Write-Host " $($sw.ElapsedMilliseconds)ms" -ForegroundColor Green
    }
    catch {
        $apiResults.RustAPI.Status = "⚠️ SKIP"
        Write-Host " Not running" -ForegroundColor Yellow
    }
    
    # Test Next.js
    Write-Host "  Testing Next.js (localhost:3000)..." -ForegroundColor Gray -NoNewline
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        $sw.Stop()
        
        $apiResults.NextJS = @{
            Status = "✅ PASS"
            PageLatency = $sw.ElapsedMilliseconds
        }
        Write-Host " $($sw.ElapsedMilliseconds)ms" -ForegroundColor Green
    }
    catch {
        $apiResults.NextJS.Status = "⚠️ SKIP"
        Write-Host " Not running" -ForegroundColor Yellow
    }
    
    # Calculate API score (15 points max)
    $apiScore = 0
    if ($apiResults.RustAPI.Status -match "PASS") { $apiScore += 7 }
    if ($apiResults.NextJS.Status -match "PASS") { $apiScore += 8 }
    
    # Bonus for sub-100ms response
    if ($apiResults.RustAPI.HealthLatency -gt 0 -and $apiResults.RustAPI.HealthLatency -lt 100) { $apiScore += 2 }
    if ($apiResults.NextJS.PageLatency -gt 0 -and $apiResults.NextJS.PageLatency -lt 500) { $apiScore += 3 }
    
    $Results.Tests["API"] = @{
        Score = [math]::Min($apiScore, 15)
        MaxScore = 15
        Details = $apiResults
    }
    
    Write-Host ""
    Write-Host "  API Benchmark Score: $($Results.Tests['API'].Score)/$($Results.Tests['API'].MaxScore)" -ForegroundColor $(if ($apiScore -ge 10) { "Green" } else { "Yellow" })
    
    return $Results
}

function Invoke-NetworkBench {
    param($Results)
    
    Write-Host ""
    Write-Host "  ╭─────────────────────────────────────────────────────────────────╮" -ForegroundColor Yellow
    Write-Host "  │  🌐 NETWORK CONNECTIVITY BENCHMARK                              │" -ForegroundColor Yellow
    Write-Host "  ╰─────────────────────────────────────────────────────────────────╯" -ForegroundColor Yellow
    Write-Host ""
    
    $netResults = @{
        Internet = @{ Status = "Unknown"; Latency = 0 }
        DNS = @{ Status = "Unknown"; Latency = 0 }
        Docker = @{ Status = "Unknown"; Network = "" }
    }
    
    # Test internet connectivity
    Write-Host "  Testing Internet connectivity..." -ForegroundColor Gray -NoNewline
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $ping = Test-Connection -ComputerName "8.8.8.8" -Count 1 -ErrorAction SilentlyContinue
        $sw.Stop()
        
        if ($ping) {
            $netResults.Internet = @{
                Status = "✅ PASS"
                Latency = $sw.ElapsedMilliseconds
            }
            Write-Host " $($sw.ElapsedMilliseconds)ms" -ForegroundColor Green
        }
        else {
            $netResults.Internet.Status = "❌ FAIL"
            Write-Host " FAILED" -ForegroundColor Red
        }
    }
    catch {
        $netResults.Internet.Status = "❌ FAIL"
        Write-Host " FAILED" -ForegroundColor Red
    }
    
    # Test DNS resolution
    Write-Host "  Testing DNS resolution..." -ForegroundColor Gray -NoNewline
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $dns = Resolve-DnsName "github.com" -ErrorAction SilentlyContinue
        $sw.Stop()
        
        if ($dns) {
            $netResults.DNS = @{
                Status = "✅ PASS"
                Latency = $sw.ElapsedMilliseconds
            }
            Write-Host " $($sw.ElapsedMilliseconds)ms" -ForegroundColor Green
        }
        else {
            $netResults.DNS.Status = "❌ FAIL"
            Write-Host " FAILED" -ForegroundColor Red
        }
    }
    catch {
        $netResults.DNS.Status = "⚠️ SKIP"
        Write-Host " Unable to test" -ForegroundColor Yellow
    }
    
    # Test Docker network
    Write-Host "  Testing Docker network..." -ForegroundColor Gray -NoNewline
    try {
        $dockerNet = docker network ls --format "{{.Name}}" 2>$null | Where-Object { $_ -match "bizra|bridge" } | Select-Object -First 1
        if ($dockerNet) {
            $netResults.Docker = @{
                Status = "✅ PASS"
                Network = $dockerNet
            }
            Write-Host " $dockerNet" -ForegroundColor Green
        }
        else {
            $netResults.Docker.Status = "⚠️ SKIP"
            Write-Host " No BIZRA network" -ForegroundColor Yellow
        }
    }
    catch {
        $netResults.Docker.Status = "❌ FAIL"
        Write-Host " FAILED" -ForegroundColor Red
    }
    
    # Calculate network score (15 points max)
    $netScore = 0
    if ($netResults.Internet.Status -match "PASS") { $netScore += 5 }
    if ($netResults.DNS.Status -match "PASS") { $netScore += 5 }
    if ($netResults.Docker.Status -match "PASS") { $netScore += 5 }
    
    # Bonus for low latency
    if ($netResults.Internet.Latency -gt 0 -and $netResults.Internet.Latency -lt 50) { $netScore += 2 }
    if ($netResults.DNS.Latency -gt 0 -and $netResults.DNS.Latency -lt 100) { $netScore += 3 }
    
    $Results.Tests["Network"] = @{
        Score = [math]::Min($netScore, 15)
        MaxScore = 15
        Details = $netResults
    }
    
    Write-Host ""
    Write-Host "  Network Benchmark Score: $($Results.Tests['Network'].Score)/$($Results.Tests['Network'].MaxScore)" -ForegroundColor $(if ($netScore -ge 10) { "Green" } else { "Yellow" })
    
    return $Results
}

function Invoke-MemoryBench {
    param($Results)
    
    Write-Host ""
    Write-Host "  ╭─────────────────────────────────────────────────────────────────╮" -ForegroundColor Cyan
    Write-Host "  │  💾 MEMORY PERFORMANCE BENCHMARK                                │" -ForegroundColor Cyan
    Write-Host "  ╰─────────────────────────────────────────────────────────────────╯" -ForegroundColor Cyan
    Write-Host ""
    
    $memResults = @{
        TotalGB = 0
        AvailableGB = 0
        UsedPercent = 0
        ProcessMB = 0
    }
    
    try {
        $os = Get-CimInstance -ClassName Win32_OperatingSystem
        $memResults.TotalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
        $memResults.AvailableGB = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
        $memResults.UsedPercent = [math]::Round(100 - ($os.FreePhysicalMemory / $os.TotalVisibleMemorySize * 100), 1)
        
        # Get current PowerShell process memory
        $proc = Get-Process -Id $PID
        $memResults.ProcessMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
        
        Write-Host "  Total Memory:     $($memResults.TotalGB) GB" -ForegroundColor White
        Write-Host "  Available:        $($memResults.AvailableGB) GB" -ForegroundColor White
        Write-Host "  Used:             $($memResults.UsedPercent)%" -ForegroundColor $(if ($memResults.UsedPercent -lt 80) { "Green" } else { "Yellow" })
        Write-Host "  Process Memory:   $($memResults.ProcessMB) MB" -ForegroundColor White
    }
    catch {
        Write-Host "  Memory stats unavailable" -ForegroundColor Red
    }
    
    # Calculate memory score (15 points max)
    $memScore = 0
    if ($memResults.TotalGB -ge 8) { $memScore += 5 }
    if ($memResults.TotalGB -ge 16) { $memScore += 3 }
    if ($memResults.TotalGB -ge 32) { $memScore += 2 }
    if ($memResults.AvailableGB -ge 4) { $memScore += 3 }
    if ($memResults.UsedPercent -lt 80) { $memScore += 2 }
    
    $Results.Tests["Memory"] = @{
        Score = [math]::Min($memScore, 15)
        MaxScore = 15
        Details = $memResults
    }
    
    Write-Host ""
    Write-Host "  Memory Benchmark Score: $($Results.Tests['Memory'].Score)/$($Results.Tests['Memory'].MaxScore)" -ForegroundColor $(if ($memScore -ge 10) { "Green" } else { "Yellow" })
    
    return $Results
}

function Invoke-DiskBench {
    param($Results)
    
    Write-Host ""
    Write-Host "  ╭─────────────────────────────────────────────────────────────────╮" -ForegroundColor DarkMagenta
    Write-Host "  │  💿 DISK I/O BENCHMARK                                          │" -ForegroundColor DarkMagenta
    Write-Host "  ╰─────────────────────────────────────────────────────────────────╯" -ForegroundColor DarkMagenta
    Write-Host ""
    
    $diskResults = @{
        Drive = ""
        TotalGB = 0
        FreeGB = 0
        WriteLatencyMs = 0
        ReadLatencyMs = 0
    }
    
    try {
        # Get drive info for project root
        $drive = (Get-Item $script:PROJECT_ROOT).PSDrive.Name
        $driveInfo = Get-PSDrive -Name $drive
        
        $diskResults.Drive = $drive
        $diskResults.TotalGB = [math]::Round(($driveInfo.Used + $driveInfo.Free) / 1GB, 2)
        $diskResults.FreeGB = [math]::Round($driveInfo.Free / 1GB, 2)
        
        Write-Host "  Drive:            $($drive):" -ForegroundColor White
        Write-Host "  Total Space:      $($diskResults.TotalGB) GB" -ForegroundColor White
        Write-Host "  Free Space:       $($diskResults.FreeGB) GB" -ForegroundColor $(if ($diskResults.FreeGB -gt 50) { "Green" } else { "Yellow" })
        
        # Simple write/read benchmark
        $testFile = Join-Path $env:TEMP "bizra_bench_$([System.Guid]::NewGuid().ToString('N')).tmp"
        $testData = [byte[]]::new(1MB)
        [System.Random]::new().NextBytes($testData)
        
        # Write test
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        [System.IO.File]::WriteAllBytes($testFile, $testData)
        $sw.Stop()
        $diskResults.WriteLatencyMs = $sw.ElapsedMilliseconds
        
        # Read test
        $sw.Restart()
        [void][System.IO.File]::ReadAllBytes($testFile)
        $sw.Stop()
        $diskResults.ReadLatencyMs = $sw.ElapsedMilliseconds
        
        # Cleanup
        Remove-Item $testFile -Force -ErrorAction SilentlyContinue
        
        Write-Host "  Write (1MB):      $($diskResults.WriteLatencyMs)ms" -ForegroundColor $(if ($diskResults.WriteLatencyMs -lt 100) { "Green" } else { "Yellow" })
        Write-Host "  Read (1MB):       $($diskResults.ReadLatencyMs)ms" -ForegroundColor $(if ($diskResults.ReadLatencyMs -lt 50) { "Green" } else { "Yellow" })
    }
    catch {
        Write-Host "  Disk stats unavailable: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Calculate disk score (10 points max)
    $diskScore = 0
    if ($diskResults.FreeGB -ge 20) { $diskScore += 3 }
    if ($diskResults.FreeGB -ge 50) { $diskScore += 2 }
    if ($diskResults.WriteLatencyMs -gt 0 -and $diskResults.WriteLatencyMs -lt 100) { $diskScore += 2 }
    if ($diskResults.ReadLatencyMs -gt 0 -and $diskResults.ReadLatencyMs -lt 50) { $diskScore += 3 }
    
    $Results.Tests["Disk"] = @{
        Score = [math]::Min($diskScore, 10)
        MaxScore = 10
        Details = $diskResults
    }
    
    Write-Host ""
    Write-Host "  Disk Benchmark Score: $($Results.Tests['Disk'].Score)/$($Results.Tests['Disk'].MaxScore)" -ForegroundColor $(if ($diskScore -ge 7) { "Green" } else { "Yellow" })
    
    return $Results
}

function Show-BenchReport {
    param($Results)
    
    # Calculate total score
    $totalScore = 0
    $maxScore = 0
    foreach ($test in $Results.Tests.Values) {
        $totalScore += $test.Score
        $maxScore += $test.MaxScore
    }
    
    $percentage = [math]::Round(($totalScore / $maxScore) * 100, 1)
    
    # Determine grade
    $grade = switch ($percentage) {
        { $_ -ge 95 } { "S"; break }
        { $_ -ge 90 } { "A+"; break }
        { $_ -ge 85 } { "A"; break }
        { $_ -ge 80 } { "B+"; break }
        { $_ -ge 75 } { "B"; break }
        { $_ -ge 70 } { "C+"; break }
        { $_ -ge 60 } { "C"; break }
        { $_ -ge 50 } { "D"; break }
        default { "F" }
    }
    
    $gradeColor = switch ($grade) {
        "S"  { "Magenta" }
        "A+" { "Green" }
        "A"  { "Green" }
        "B+" { "Cyan" }
        "B"  { "Cyan" }
        "C+" { "Yellow" }
        "C"  { "Yellow" }
        default { "Red" }
    }
    
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor $gradeColor
    Write-Host "  ║                    BENCHMARK RESULTS SUMMARY                     ║" -ForegroundColor $gradeColor
    Write-Host "  ╠══════════════════════════════════════════════════════════════════╣" -ForegroundColor $gradeColor
    Write-Host "  ║                                                                  ║" -ForegroundColor $gradeColor
    
    # Display each test category
    foreach ($testName in $Results.Tests.Keys | Sort-Object) {
        $test = $Results.Tests[$testName]
        $testPct = [math]::Round(($test.Score / $test.MaxScore) * 100, 0)
        $bar = "█" * [math]::Floor($testPct / 5) + "░" * (20 - [math]::Floor($testPct / 5))
        $testColor = if ($testPct -ge 75) { "Green" } elseif ($testPct -ge 50) { "Yellow" } else { "Red" }
        
        $testNamePadded = $testName.PadRight(12)
        Write-Host "  ║  $testNamePadded $bar $($test.Score.ToString().PadLeft(2))/$($test.MaxScore.ToString().PadLeft(2)) " -NoNewline -ForegroundColor $gradeColor
        Write-Host "($testPct%)" -ForegroundColor $testColor -NoNewline
        Write-Host "     ║" -ForegroundColor $gradeColor
    }
    
    Write-Host "  ║                                                                  ║" -ForegroundColor $gradeColor
    Write-Host "  ╠══════════════════════════════════════════════════════════════════╣" -ForegroundColor $gradeColor
    Write-Host "  ║                                                                  ║" -ForegroundColor $gradeColor
    
    # Grand total
    $totalBar = "█" * [math]::Floor($percentage / 5) + "░" * (20 - [math]::Floor($percentage / 5))
    Write-Host "  ║  TOTAL SCORE  $totalBar  $totalScore/$maxScore       ║" -ForegroundColor $gradeColor
    Write-Host "  ║                                                                  ║" -ForegroundColor $gradeColor
    Write-Host "  ║             ╭─────────────────────────────────╮                  ║" -ForegroundColor $gradeColor
    Write-Host "  ║             │      GRADE:   " -NoNewline -ForegroundColor $gradeColor
    Write-Host "$grade" -NoNewline -ForegroundColor $gradeColor
    Write-Host "   ($percentage%)        │                  ║" -ForegroundColor $gradeColor
    Write-Host "  ║             ╰─────────────────────────────────╯                  ║" -ForegroundColor $gradeColor
    Write-Host "  ║                                                                  ║" -ForegroundColor $gradeColor
    Write-Host "  ╠══════════════════════════════════════════════════════════════════╣" -ForegroundColor $gradeColor
    Write-Host "  ║  Genesis Block: $($script:GENESIS_BLOCK_ID.PadRight(15)) | Benchmark: $(Get-Date -Format 'HH:mm:ss')    ║" -ForegroundColor White
    Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor $gradeColor
    Write-Host ""
    
    # Recommendations
    if ($percentage -lt 90) {
        Write-Host "  💡 RECOMMENDATIONS:" -ForegroundColor Yellow
        
        foreach ($testName in $Results.Tests.Keys) {
            $test = $Results.Tests[$testName]
            $testPct = [math]::Round(($test.Score / $test.MaxScore) * 100, 0)
            
            if ($testPct -lt 75) {
                switch ($testName) {
                    "AI" {
                        Write-Host "     • Start AI backends: Ollama and/or LM Studio" -ForegroundColor Gray
                    }
                    "Database" {
                        Write-Host "     • Start database containers: docker-compose up -d" -ForegroundColor Gray
                    }
                    "API" {
                        Write-Host "     • Start application servers: Rust API and Next.js" -ForegroundColor Gray
                    }
                    "Network" {
                        Write-Host "     • Check network connectivity and Docker network setup" -ForegroundColor Gray
                    }
                    "Memory" {
                        Write-Host "     • Consider closing unused applications to free memory" -ForegroundColor Gray
                    }
                    "Disk" {
                        Write-Host "     • Free up disk space or consider SSD upgrade" -ForegroundColor Gray
                    }
                }
            }
        }
        Write-Host ""
    }
    else {
        Write-Host "  🏆 EXCELLENT! Your Genesis Block is performing at peak capacity!" -ForegroundColor Green
        Write-Host ""
    }
}

# ============================================
# COMMAND: HELP
# ============================================

function Invoke-Help {
    Write-Banner "NODE0 MASTER CONTROL"
    
    Write-Host ""
    Write-Host "  The Genesis Block Command Center" -ForegroundColor Cyan
    Write-Host "  Complete lifecycle management for BIZRA Node0" -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "COMMANDS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  status      Show complete system status"
    Write-Host "  start       Start all Node0 services"
    Write-Host "  stop        Stop all Node0 services"
    Write-Host "  restart     Restart all services"
    Write-Host "  health      Run comprehensive health checks"
    Write-Host "  domain      Show your sovereign interdisciplinary domain"
    Write-Host "  bench       Elite performance benchmark suite"
    Write-Host ""
    Write-Host "  models      Manage AI models"
    Write-Host "    list        List installed models (Ollama + LM Studio)"
    Write-Host "    lmstudio    Show LM Studio status"
    Write-Host "    pull        Pull required models"
    Write-Host "    verify      Verify all AI backends"
    Write-Host ""
    Write-Host "  db          Database operations"
    Write-Host "    status      Show database status"
    Write-Host "    migrate     Run migrations"
    Write-Host "    shell       Open psql shell"
    Write-Host "    reset       Reset database (DANGER)"
    Write-Host ""
    Write-Host "  backup      Backup management"
    Write-Host "    create      Create new backup"
    Write-Host "    list        List backups"
    Write-Host "    restore     Restore from backup"
    Write-Host ""
    Write-Host "  bench       Performance benchmarks"
    Write-Host "    full        Complete system benchmark (default)"
    Write-Host "    ai          AI inference benchmark"
    Write-Host "    db          Database benchmark"
    Write-Host "    api         API endpoint benchmark"
    Write-Host "    net         Network benchmark"
    Write-Host ""
    Write-Host "  elite       Project management command center" -ForegroundColor Magenta
    Write-Host "    sprint      Agile sprint management"
    Write-Host "    debug       Graph-of-thoughts debugging"
    Write-Host "    quality     SNR quality scoring"
    Write-Host "    decide      RAPID decision framework"
    Write-Host "    profile     Performance profiling"
    Write-Host "    ship        Quality-gated deployment"
    Write-Host ""
    Write-Host "  logs        View service logs"
    Write-Host "  validate    Run system validation"
    Write-Host "  package     Build distribution package"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\node0.ps1 status"
    Write-Host "  .\node0.ps1 domain"
    Write-Host "  .\node0.ps1 bench full"
    Write-Host "  .\node0.ps1 models list"
    Write-Host "  .\node0.ps1 backup create"
    Write-Host "  .\node0.ps1 elite sprint board"
    Write-Host ""
}

# ============================================
# MAIN ENTRY POINT
# ============================================

switch ($Command) {
    "status"   { Invoke-Status }
    "start"    { Invoke-Start }
    "stop"     { Invoke-Stop }
    "restart"  { Invoke-Stop; Start-Sleep -Seconds 3; Invoke-Start }
    "health"   { Invoke-Health }
    "models"   { Invoke-Models -SubCmd $SubCommand -ModelName $Arg1 }
    "backup"   { Invoke-Backup -SubCmd $SubCommand }
    "db"       { Invoke-Db -SubCmd $SubCommand }
    "logs"     { Invoke-Logs -SubCmd $SubCommand }
    "validate" { Invoke-Validate }
    "package"  { Invoke-Package }
    "domain"   { Invoke-Domain }
    "elite"    { & "$PSScriptRoot\elite.ps1" $SubCommand $Arg1 $Arg2 }
    "update"   { Write-Warning "Self-update coming soon..." }
    default    { Invoke-Help }
}
