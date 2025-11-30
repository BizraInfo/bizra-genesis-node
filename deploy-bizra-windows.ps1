# BIZRA NODE0 - Windows 11 Deployment Script
# Target: MSI i9-14900HX with RTX 4090
# Auto-detected: Rust, Ollama, Python, Node, Docker all installed
# Version: 3.0.0-GENESIS

<#
.SYNOPSIS
    Complete BIZRA Synthesis Orchestrator deployment for Windows 11

.DESCRIPTION
    This script:
    1. Validates your environment (all tools already detected!)
    2. Downloads required Ollama models (5 models)
    3. Builds BIZRA orchestrator from source
    4. Initializes genesis node
    5. Runs validation tests
    6. Starts the orchestrator

.PARAMETER SkipModelDownload
    Skip downloading Ollama models (if already downloaded)

.PARAMETER SkipBuild
    Skip building from source (use existing binaries)

.PARAMETER DevMode
    Run in development mode with verbose output

.EXAMPLE
    .\deploy-bizra-windows.ps1
    
.EXAMPLE
    .\deploy-bizra-windows.ps1 -SkipModelDownload -DevMode
#>

param(
    [switch]$SkipModelDownload,
    [switch]$SkipBuild,
    [switch]$DevMode,
    [string]$InstallPath = "$env:USERPROFILE\BIZRA"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warning-Custom { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error-Custom { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Step { param($msg) Write-Host "`n🔹 $msg" -ForegroundColor Magenta }

# Banner
function Show-Banner {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "    BIZRA NODE0 v3.0.0-GENESIS - Windows 11 Deployment    " -ForegroundColor White
    Write-Host "       MSI i9-14900HX | RTX 4090 | 128GB RAM              " -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

# System validation
function Test-SystemRequirements {
    Write-Step "Validating System Requirements"
    
    $checks = @{
        "Rust (rustc)" = { (Get-Command rustc -ErrorAction SilentlyContinue) -ne $null }
        "Cargo" = { (Get-Command cargo -ErrorAction SilentlyContinue) -ne $null }
        "Ollama" = { (Get-Command ollama -ErrorAction SilentlyContinue) -ne $null }
        "Node.js" = { (Get-Command node -ErrorAction SilentlyContinue) -ne $null }
        "Python" = { (Get-Command python -ErrorAction SilentlyContinue) -ne $null }
        "Docker" = { (Get-Command docker -ErrorAction SilentlyContinue) -ne $null }
        "Git" = { (Get-Command git -ErrorAction SilentlyContinue) -ne $null }
    }
    
    $allPassed = $true
    foreach ($check in $checks.GetEnumerator()) {
        if (& $check.Value) {
            Write-Success "$($check.Key) detected"
        } else {
            Write-Error-Custom "$($check.Key) NOT FOUND"
            $allPassed = $false
        }
    }
    
    if (-not $allPassed) {
        throw "Missing required tools. Please install missing components."
    }
    
    # Show versions
    Write-Info "Rust: $(rustc --version)"
    Write-Info "Ollama: $(ollama --version)"
    Write-Info "Node: $(node --version)"
    Write-Info "Python: $(python --version)"
    
    # Check GPU
    try {
        $gpu = nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits
        Write-Success "GPU: $gpu"
    } catch {
        Write-Warning-Custom "NVIDIA GPU not detected or nvidia-smi not available"
    }
}

# Download Ollama models
function Install-OllamaModels {
    if ($SkipModelDownload) {
        Write-Info "Skipping model download (SkipModelDownload flag set)"
        return
    }
    
    Write-Step "Downloading Ollama Models (5 models, ~20GB total)"
    Write-Info "This may take 15-20 minutes depending on your internet speed..."
    
    $models = @(
        @{Name="llama3.2:3b"; Size="2.0 GB"},
        @{Name="mistral:7b"; Size="4.1 GB"},
        @{Name="gemma2:9b"; Size="5.5 GB"},
        @{Name="qwen2.5:7b"; Size="4.7 GB"},
        @{Name="deepseek-coder:6.7b"; Size="3.8 GB"}
    )
    
    # Check Ollama service
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 5
        Write-Success "Ollama service is running"
    } catch {
        Write-Error-Custom "Ollama service not responding. Please start Ollama first."
        Write-Info "Run: ollama serve (in a separate terminal)"
        throw "Ollama service not available"
    }
    
    foreach ($model in $models) {
        Write-Info "Downloading $($model.Name) (~$($model.Size))..."
        
        $startTime = Get-Date
        try {
            & ollama pull $model.Name
            $duration = ((Get-Date) - $startTime).TotalSeconds
            Write-Success "$($model.Name) downloaded in $([math]::Round($duration, 1))s"
        } catch {
            Write-Warning-Custom "Failed to download $($model.Name): $_"
        }
    }
    
    # Verify models
    Write-Info "Verifying installed models..."
    $installedModels = & ollama list
    Write-Host $installedModels
}

# Build BIZRA from source
function Build-BIZRA {
    param([string]$WorkspacePath)
    
    if ($SkipBuild) {
        Write-Info "Skipping build (SkipBuild flag set)"
        return
    }
    
    Write-Step "Building BIZRA Synthesis Orchestrator"
    
    if (-not (Test-Path $WorkspacePath)) {
        throw "Workspace not found: $WorkspacePath"
    }
    
    Push-Location $WorkspacePath
    
    try {
        Write-Info "Running: cargo build --release --workspace"
        Write-Info "This will take 2-3 minutes..."
        
        $buildOutput = cargo build --release --workspace 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "Build failed!"
            Write-Host $buildOutput
            throw "Cargo build failed with exit code $LASTEXITCODE"
        }
        
        Write-Success "Build completed successfully"
        
        # Verify binaries
        $node0Path = Join-Path $WorkspacePath "target\release\node0.exe"
        if (Test-Path $node0Path) {
            Write-Success "node0.exe binary created: $node0Path"
            
            # Show binary size
            $size = (Get-Item $node0Path).Length / 1MB
            Write-Info "Binary size: $([math]::Round($size, 2)) MB"
        } else {
            throw "node0.exe not found after build"
        }
        
    } finally {
        Pop-Location
    }
}

# Initialize genesis node
function Initialize-GenesisNode {
    param([string]$WorkspacePath)
    
    Write-Step "Initializing Genesis Node"
    
    $node0 = Join-Path $WorkspacePath "target\release\node0.exe"
    $dataPath = Join-Path $InstallPath "data"
    
    if (-not (Test-Path $node0)) {
        throw "node0.exe not found: $node0"
    }
    
    # Create data directory
    if (-not (Test-Path $dataPath)) {
        New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
    }
    
    Write-Info "Running: node0 init --output $dataPath"
    
    $initOutput = & $node0 init --output $dataPath 2>&1
    Write-Host $initOutput
    
    if ($LASTEXITCODE -ne 0) {
        throw "Genesis initialization failed"
    }
    
    # Verify genesis file
    $genesisFile = Join-Path $dataPath "genesis.json"
    if (Test-Path $genesisFile) {
        Write-Success "Genesis node initialized: $genesisFile"
        
        # Show genesis data
        $genesis = Get-Content $genesisFile | ConvertFrom-Json
        Write-Info "Genesis Hash: $($genesis.genesis_hash)"
        Write-Info "Node ID: $($genesis.id)"
        Write-Info "Impact Score: $($genesis.impact_score)"
    } else {
        throw "Genesis file not created: $genesisFile"
    }
}

# Run validation tests
function Test-BIZRA {
    param([string]$WorkspacePath)
    
    Write-Step "Running Validation Tests"
    
    Push-Location $WorkspacePath
    
    try {
        Write-Info "Running: cargo test --workspace --release"
        
        $testOutput = cargo test --workspace --release 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Warning-Custom "Some tests failed"
            Write-Host $testOutput
        } else {
            Write-Success "All tests passed!"
        }
        
        # Run CLI validation
        $node0 = Join-Path $WorkspacePath "target\release\node0.exe"
        
        Write-Info "Running: node0 validate"
        $validateOutput = & $node0 validate 2>&1
        Write-Host $validateOutput
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "System validation passed"
        } else {
            Write-Warning-Custom "Validation checks failed"
        }
        
    } finally {
        Pop-Location
    }
}

# Create shortcuts and environment
function Install-Shortcuts {
    param([string]$WorkspacePath)
    
    Write-Step "Creating Shortcuts and Environment"
    
    $node0 = Join-Path $WorkspacePath "target\release\node0.exe"
    
    # Desktop shortcut
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopPath "BIZRA NODE0.lnk"
    
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $node0
    $shortcut.Arguments = "start --ihsan-threshold 0.990"
    $shortcut.WorkingDirectory = $WorkspacePath
    $shortcut.Description = "BIZRA NODE0 Synthesis Orchestrator"
    $shortcut.Save()
    
    Write-Success "Desktop shortcut created: $shortcutPath"
    
    # Add to PATH (user level)
    $binPath = Join-Path $WorkspacePath "target\release"
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($currentPath -notlike "*$binPath*") {
        [Environment]::SetEnvironmentVariable(
            "Path",
            "$currentPath;$binPath",
            "User"
        )
        Write-Success "Added to PATH: $binPath"
        Write-Info "Restart terminal for PATH changes to take effect"
    }
}

# Start orchestrator
function Start-Orchestrator {
    param([string]$WorkspacePath, [switch]$Background)
    
    Write-Step "Starting BIZRA Orchestrator"
    
    $node0 = Join-Path $WorkspacePath "target\release\node0.exe"
    
    if ($Background) {
        Write-Info "Starting in background mode..."
        $logPath = Join-Path $InstallPath "logs\node0.log"
        
        # Create logs directory
        $logsDir = Split-Path $logPath
        if (-not (Test-Path $logsDir)) {
            New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
        }
        
        Start-Process -FilePath $node0 -ArgumentList "start --ihsan-threshold 0.990" -RedirectStandardOutput $logPath -NoNewWindow
        
        Write-Success "Orchestrator started in background"
        Write-Info "Logs: $logPath"
    } else {
        Write-Info "Starting orchestrator (Ctrl+C to stop)..."
        Write-Host ""
        
        & $node0 start --ihsan-threshold 0.990
    }
}

# Show completion message
function Show-CompletionMessage {
    param([string]$WorkspacePath)
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "   ✅ BIZRA NODE0 DEPLOYMENT COMPLETE!" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    
    $node0 = Join-Path $WorkspacePath "target\release\node0.exe"
    
    Write-Host "📍 Location: $WorkspacePath" -ForegroundColor Cyan
    Write-Host "🎯 Binary: $node0" -ForegroundColor Cyan
    Write-Host "📊 Data: $InstallPath\data" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "🚀 Quick Commands:" -ForegroundColor Yellow
    Write-Host "   node0 start                    # Start orchestrator" -ForegroundColor White
    Write-Host "   node0 status                   # Check system status" -ForegroundColor White
    Write-Host "   node0 validate                 # Run validation" -ForegroundColor White
    Write-Host "   node0 benchmark                # Performance test" -ForegroundColor White
    Write-Host ""
    
    Write-Host "📚 Documentation:" -ForegroundColor Yellow
    Write-Host "   README.md                      # Main documentation" -ForegroundColor White
    Write-Host "   QUICKSTART.md                  # Getting started" -ForegroundColor White
    Write-Host "   IMPLEMENTATION-REPORT.md       # Technical details" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🎉 Ready to build with إحسان excellence!" -ForegroundColor Green
    Write-Host ""
}

# Main execution
function Main {
    try {
        $startTime = Get-Date
        
        Show-Banner
        
        # Step 1: Validate system
        Test-SystemRequirements
        
        # Step 2: Setup workspace
        Write-Step "Setting Up Workspace"
        $workspacePath = Join-Path $InstallPath "bizra-synthesis-orchestrator"
        
        if (-not (Test-Path $workspacePath)) {
            Write-Info "Workspace not found at: $workspacePath"
            Write-Info "Please ensure the workspace is available at this location"
            Write-Info "Or modify the script to point to your workspace location"
            throw "Workspace not found"
        }
        
        Write-Success "Workspace found: $workspacePath"
        
        # Step 3: Download models
        if (-not $SkipModelDownload) {
            Install-OllamaModels
        }
        
        # Step 4: Build BIZRA
        Build-BIZRA -WorkspacePath $workspacePath
        
        # Step 5: Initialize genesis
        Initialize-GenesisNode -WorkspacePath $workspacePath
        
        # Step 6: Run tests
        Test-BIZRA -WorkspacePath $workspacePath
        
        # Step 7: Install shortcuts
        Install-Shortcuts -WorkspacePath $workspacePath
        
        # Calculate total time
        $duration = ((Get-Date) - $startTime).TotalMinutes
        Write-Success "Deployment completed in $([math]::Round($duration, 1)) minutes"
        
        # Step 8: Show completion
        Show-CompletionMessage -WorkspacePath $workspacePath
        
        # Step 9: Optional - start orchestrator
        if ($DevMode) {
            Write-Host ""
            $response = Read-Host "Start orchestrator now? (y/n)"
            if ($response -eq 'y') {
                Start-Orchestrator -WorkspacePath $workspacePath
            }
        }
        
    } catch {
        Write-Error-Custom "Deployment failed: $_"
        Write-Host $_.ScriptStackTrace
        exit 1
    }
}

# Run main function
Main
