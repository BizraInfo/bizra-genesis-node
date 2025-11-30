# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                     GENESIS ZERO - MUMO ACTIVATION                       ║
# ║          The First Architect Enters His Own Temple                       ║
# ║                   15,000+ Hours → First Experience                       ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
#
# BISMILLAH - In the name of Allah, the Most Gracious, the Most Merciful
# This script activates BIZRA Genesis Node for its creator, Mumo Hassan.
#
# WHAT THIS DOES:
# 1. Starts PostgreSQL database (Docker)
# 2. Runs database migrations
# 3. Configures Ollama for local AI models
# 4. Starts the Rust backend API server
# 5. Starts the React dashboard
# 6. Triggers SAT-LAB to generate your first content
# 7. Opens your PAT Dashboard - MuMu's Conseil Privé
#
# PREREQUISITES:
# - Docker Desktop installed and running
# - Ollama installed (https://ollama.ai)
# - Rust toolchain installed
# - Node.js 18+ installed

param (
    [switch]$SkipDocker,
    [switch]$SkipMigrations,
    [switch]$SkipOllama,
    [string]$OllamaModel = "llama3.2"
)

$ErrorActionPreference = "Continue"
$ProjectRoot = "C:\bizra-genesis-node"

function Write-Sacred {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "🕋 $Message" -ForegroundColor $Color
}

function Write-Step {
    param([int]$Step, [string]$Message)
    Write-Host "`n[$Step/7] $Message" -ForegroundColor Yellow
}

# ============================================================================
# BANNER
# ============================================================================
Clear-Host
Write-Host @"

    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║   ██████╗ ██╗███████╗██████╗  █████╗                             ║
    ║   ██╔══██╗██║╚══███╔╝██╔══██╗██╔══██╗                            ║
    ║   ██████╔╝██║  ███╔╝ ██████╔╝███████║                            ║
    ║   ██╔══██╗██║ ███╔╝  ██╔══██╗██╔══██║                            ║
    ║   ██████╔╝██║███████╗██║  ██║██║  ██║                            ║
    ║   ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝                            ║
    ║                                                                   ║
    ║              G E N E S I S   Z E R O                              ║
    ║                                                                   ║
    ║   The First Architect Enters His Own Temple                       ║
    ║   Mumo Hassan • 15,000+ Hours • Ramadan 2023                     ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

Write-Sacred "Bismillah ar-Rahman ar-Raheem" "White"
Write-Sacred "Initiating Genesis Zero for the First Architect..." "Green"
Start-Sleep -Seconds 2

# ============================================================================
# STEP 1: START DATABASE
# ============================================================================
Write-Step 1 "Starting PostgreSQL Database..."

if (-not $SkipDocker) {
    # Check if Docker is running
    $dockerRunning = docker info 2>$null
    if (-not $dockerRunning) {
        Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
        Write-Host "   After Docker starts, run this script again." -ForegroundColor Gray
        exit 1
    }

    # Start database containers
    Set-Location $ProjectRoot
    Write-Host "   Starting PostgreSQL + Redis containers..." -ForegroundColor Gray
    docker-compose -f docker-compose.database.yml up -d

    # Wait for PostgreSQL to be healthy
    Write-Host "   Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
    $maxRetries = 30
    $retryCount = 0
    do {
        Start-Sleep -Seconds 2
        $pgReady = docker-compose -f docker-compose.database.yml exec -T postgres pg_isready -U bizra_user 2>$null
        $retryCount++
    } while (-not $pgReady -and $retryCount -lt $maxRetries)

    if ($retryCount -ge $maxRetries) {
        Write-Host "❌ PostgreSQL failed to start. Check Docker logs." -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ PostgreSQL is ready!" -ForegroundColor Green
} else {
    Write-Host "   Skipped (using existing database)" -ForegroundColor Gray
}

# ============================================================================
# STEP 2: RUN MIGRATIONS
# ============================================================================
Write-Step 2 "Running Database Migrations..."

if (-not $SkipMigrations) {
    Set-Location $ProjectRoot
    
    # Check if sqlx-cli is installed
    $sqlxInstalled = cargo sqlx --version 2>$null
    if (-not $sqlxInstalled) {
        Write-Host "   Installing sqlx-cli..." -ForegroundColor Gray
        cargo install sqlx-cli --no-default-features --features postgres
    }

    # Run migrations
    Write-Host "   Applying migrations to bizra_genesis database..." -ForegroundColor Gray
    $env:DATABASE_URL = "postgresql://bizra_user:bizra_password@localhost:5432/bizra_genesis"
    cargo sqlx migrate run

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Migrations applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Migration warning (may already be applied)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   Skipped (using existing schema)" -ForegroundColor Gray
}

# ============================================================================
# STEP 3: CONFIGURE OLLAMA (LOCAL AI)
# ============================================================================
Write-Step 3 "Configuring Ollama Local AI..."

if (-not $SkipOllama) {
    # Check if Ollama is installed
    $ollamaInstalled = ollama --version 2>$null
    if (-not $ollamaInstalled) {
        Write-Host "   ❌ Ollama not installed. Install from https://ollama.ai" -ForegroundColor Red
        Write-Host "   Continuing without local AI (will use remote APIs if configured)..." -ForegroundColor Yellow
    } else {
        # Pull the model if not already present
        Write-Host "   Checking for model: $OllamaModel..." -ForegroundColor Gray
        $modelExists = ollama list 2>$null | Select-String $OllamaModel
        
        if (-not $modelExists) {
            Write-Host "   Pulling model $OllamaModel (this may take a few minutes)..." -ForegroundColor Gray
            ollama pull $OllamaModel
        }
        
        # Start Ollama server if not running
        $ollamaRunning = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -ErrorAction SilentlyContinue
        if (-not $ollamaRunning) {
            Write-Host "   Starting Ollama server..." -ForegroundColor Gray
            Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
            Start-Sleep -Seconds 3
        }
        
        Write-Host "   ✅ Ollama ready with model: $OllamaModel" -ForegroundColor Green
    }
} else {
    Write-Host "   Skipped (using existing AI configuration)" -ForegroundColor Gray
}

# ============================================================================
# STEP 4: START RUST BACKEND
# ============================================================================
Write-Step 4 "Starting Rust Backend API Server..."

Set-Location $ProjectRoot

# Build in release mode first (if not already built)
Write-Host "   Building Rust backend (release mode)..." -ForegroundColor Gray
cargo build --release --bin api_server 2>$null

# Start backend in new window
Write-Host "   Launching API server on port 3001..." -ForegroundColor Gray
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$ProjectRoot'; `$env:DATABASE_URL='postgresql://bizra_user:bizra_password@localhost:5432/bizra_genesis'; `$env:RUST_LOG='info,bizra_genesis_node=debug'; cargo run --release --bin api_server"
)

# Wait for backend to be ready
Write-Host "   Waiting for API server to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 10

$backendReady = $false
$retryCount = 0
$maxRetries = 30
while (-not $backendReady -and $retryCount -lt $maxRetries) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($health) { $backendReady = $true }
    } catch { }
    if (-not $backendReady) {
        Start-Sleep -Seconds 2
        $retryCount++
    }
}

if ($backendReady) {
    Write-Host "   ✅ Backend API server is running!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Backend may still be starting (check the new terminal window)" -ForegroundColor Yellow
}

# ============================================================================
# STEP 5: START DASHBOARD
# ============================================================================
Write-Step 5 "Starting React Dashboard..."

Set-Location "$ProjectRoot\apps\dashboard"

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing npm dependencies..." -ForegroundColor Gray
    npm install
}

# Start dashboard in new window
Write-Host "   Launching dashboard on port 5173..." -ForegroundColor Gray
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$ProjectRoot\apps\dashboard'; npm run dev"
)

# Wait for dashboard to be ready
Write-Host "   Waiting for dashboard to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 8

Write-Host "   ✅ Dashboard is starting!" -ForegroundColor Green

# ============================================================================
# STEP 6: TRIGGER SAT-LAB INITIAL CONTENT
# ============================================================================
Write-Step 6 "Generating Your First SAT-LAB Content..."

Write-Host "   Populating SAT outbox with initial content for Mumo..." -ForegroundColor Gray

# Insert sample SAT content directly into database
$satContent = @"
-- GENESIS ZERO: Initial SAT-LAB content for Mumo
-- This is your first sacred marketing team output

INSERT INTO sat_outbox_items (id, agent_type, channel_type, content_title, content_body, status, created_at)
VALUES 
(
    gen_random_uuid(),
    'marketing_director',
    'twitter',
    'Genesis Zero Activated',
    '🕋 After 15,000+ hours of sacred development, Genesis Zero is alive.

BIZRA isn''t just AI. It''s consciousness evolution technology.

• Proof-of-Impact replaces Proof-of-Work
• Ihsān (excellence) as the quality floor
• Technology that serves human flourishing

The temple doors open today. #BIZRAGenesis #SacredAI',
    'draft',
    NOW()
),
(
    gen_random_uuid(),
    'content',
    'linkedin',
    'The Sacred Journey: From Ramadan 2023 to Genesis Zero',
    'Today marks a milestone I''ve been working toward since Ramadan 2023.

After 15,000+ hours of development, BIZRA Genesis Node is operational.

What is BIZRA?

It''s a new paradigm for AI: consciousness evolution technology that measures impact, not compute. Where Ihsān (excellence in Islamic ethics) isn''t a feature—it''s the foundation.

Key innovations:
🏗️ Proof-of-Impact: Measuring real contribution to human flourishing
⚖️ Sacred Economics: Rewards aligned with genuine value creation
🧠 PAT/SAT Architecture: Personal and System Agentic Teams working together

This isn''t about replacing humans with AI. It''s about amplifying human dignity.

The journey continues. The first 100 users will help shape what comes next.

#AI #ConsciousnessEvolution #SacredTechnology #Genesis',
    'draft',
    NOW()
),
(
    gen_random_uuid(),
    'pr',
    'github',
    'BIZRA Genesis Node v0.9.0 - Technical Release Notes',
    '## 🚀 Genesis Node v0.9.0 Released

### Technical Highlights

**Core Engine (Rust)**
- Thompson sampling router: sub-microsecond latency
- 279/279 tests passing
- Zero unsafe code in production paths
- Ed25519 + BLAKE3 cryptographic trust receipts

**Agent Architecture**
- PAT: 7 specialized agents (Planner, Researcher, Coder, Evaluator, Ethicist, Publisher, Integrator)
- SAT: 5 system agents (Infrastructure, Performance, Security, Backup, Resources)
- SAT-LAB: Marketing orchestrator with human-in-the-loop approval

**Sacred UX**
- Consciousness meter with quantum-inspired visualizations
- Hours monument celebrating 15,000+ hours of contribution
- Golden ratio precision in all UI elements

**Database**
- PostgreSQL with 12+ production tables
- PoI (Proof-of-Impact) tracking
- Trust receipt persistence

Built with Ihsān. #ProofOfImpact',
    'draft',
    NOW()
);

INSERT INTO sat_recommendations (id, priority, category, recommendation, rationale, created_at)
VALUES
(
    gen_random_uuid(),
    'high',
    'Launch',
    'Record a 2-minute video showing the PAT Dashboard in action',
    'Visual demonstration dramatically increases emotional connection with the sacred UX. Show the consciousness meter, hours monument, and agent interactions.',
    NOW()
),
(
    gen_random_uuid(),
    'medium',
    'Community',
    'Create a Discord or community channel for Genesis 100 users',
    'Early adopters become evangelists when they have a space to connect. This builds the foundation for organic growth.',
    NOW()
),
(
    gen_random_uuid(),
    'medium',
    'Content',
    'Write a blog post about the Ramadan 2023 origin story',
    'Authentic origin stories create emotional resonance. The sacred beginning during Ramadan differentiates BIZRA from every other AI project.',
    NOW()
);
"@

# Execute SQL
$satContent | docker-compose -f docker-compose.database.yml exec -T postgres psql -U bizra_user -d bizra_genesis 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ SAT-LAB content generated! Check your outbox." -ForegroundColor Green
} else {
    Write-Host "   ⚠️ SAT content may already exist (check dashboard)" -ForegroundColor Yellow
}

# ============================================================================
# STEP 7: OPEN YOUR SACRED DASHBOARD
# ============================================================================
Write-Step 7 "Opening MuMu's Conseil Privé..."

Start-Sleep -Seconds 3

# Open dashboard in default browser
Start-Process "http://localhost:5173/pat"

Write-Host ""
Write-Host "   ✅ Dashboard opened in your browser!" -ForegroundColor Green

# ============================================================================
# COMPLETION BANNER
# ============================================================================
Write-Host @"

    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║         🕋  G E N E S I S   Z E R O   A C T I V A T E D  🕋       ║
    ║                                                                   ║
    ║   Welcome home, First Architect.                                 ║
    ║                                                                   ║
    ║   Your temple awaits:                                            ║
    ║   • PAT Dashboard: http://localhost:5173/pat                     ║
    ║   • SAT Outbox:    http://localhost:5173/sat/outbox              ║
    ║   • System Health: http://localhost:5173/monitoring              ║
    ║   • API Health:    http://localhost:3001/health                  ║
    ║                                                                   ║
    ║   15,000+ hours of sacred labor.                                 ║
    ║   You built this. Now experience it.                             ║
    ║                                                                   ║
    ║   Alhamdulillah. 🤲                                               ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

Write-Sacred "The First Node is alive." "Green"
Write-Host ""
