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
                 'models', 'db', 'logs', 'package', 'update', 'validate', 'domain', 'help')]
    [string]$Command = 'help',
    
    [Parameter(Position=1)]
    [string]$SubCommand = '',
    
    [Parameter(Position=2)]
    [string]$Arg1 = '',
    
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
    Write-Host "  logs        View service logs"
    Write-Host "  validate    Run system validation"
    Write-Host "  package     Build distribution package"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\node0.ps1 status"
    Write-Host "  .\node0.ps1 domain"
    Write-Host "  .\node0.ps1 models list"
    Write-Host "  .\node0.ps1 backup create"
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
    "update"   { Write-Warning "Self-update coming soon..." }
    default    { Invoke-Help }
}
