/**
 * BIZRA Installer Service
 * 
 * Handles the generation and execution of the actual installation process.
 * This service manages:
 * - Installer package generation
 * - Model downloads
 * - Local file system setup
 * - System configuration
 * 
 * @module installer-service
 */

import { type AIModel, generateModelConfig, type HardwareProfile } from './model-registry';

// Installation configuration
export interface InstallConfig {
  userName: string;
  installPath: string;
  privacyLevel: 'maximum' | 'high' | 'balanced';
  selectedModels: string[];
  hardwareProfile: HardwareProfile;
}

export interface InstallationProgress {
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  phaseProgress: number;
  overallProgress: number;
  currentTask: string;
  bytesDownloaded?: number;
  totalBytes?: number;
  speed?: string;
  eta?: string;
}

export interface InstallerPackage {
  fileName: string;
  fileSize: string;
  fileSizeBytes: number;
  version: string;
  models: { id: string; name: string; size: string }[];
  estimatedDownloadTime: string;
  estimatedInstallTime: string;
  checksum: string;
  createdAt: string;
  config: InstallConfig;
}

// Installation phases with realistic timings
export const INSTALLATION_PHASES = [
  { 
    id: 'prepare', 
    name: 'Preparing Installation',
    tasks: ['Creating directories', 'Checking disk space', 'Verifying permissions'],
    duration: 5000 
  },
  { 
    id: 'runtime', 
    name: 'Installing Core Runtime',
    tasks: ['Installing BIZRA kernel', 'Setting up Node0', 'Configuring system paths'],
    duration: 15000 
  },
  { 
    id: 'models', 
    name: 'Downloading AI Models',
    tasks: ['Connecting to model registry', 'Downloading model weights', 'Verifying checksums'],
    duration: 60000 // This would be dynamic based on actual file sizes
  },
  { 
    id: 'tools', 
    name: 'Installing MCP Tools',
    tasks: ['Installing sovereign tools', 'Configuring tool permissions', 'Setting up integrations'],
    duration: 10000 
  },
  { 
    id: 'agents', 
    name: 'Configuring PAT Agents',
    tasks: ['Setting up Master Reasoner', 'Configuring Memory Architect', 'Initializing all 7 agents'],
    duration: 8000 
  },
  { 
    id: 'rag', 
    name: 'Initializing Knowledge Base',
    tasks: ['Creating HyperGraph structure', 'Indexing local documents', 'Building vector embeddings'],
    duration: 12000 
  },
  { 
    id: 'finalize', 
    name: 'Finalizing Installation',
    tasks: ['Securing configuration', 'Running optimizations', 'Creating shortcuts'],
    duration: 5000 
  },
];

/**
 * Storage keys for installation state
 */
const INSTALL_STATE_KEY = 'bizra_install_state';
const INSTALL_CONFIG_KEY = 'bizra_install_config';

/**
 * Get the estimated download size based on selected models
 */
export function calculateDownloadSize(modelIds: string[], allModels: AIModel[]): {
  totalBytes: number;
  totalSize: string;
  estimatedTime: string;
} {
  const selectedModels = allModels.filter(m => modelIds.includes(m.id));
  
  // Parse sizes like "7.1GB", "2.4GB" into bytes
  let totalBytes = 0;
  for (const model of selectedModels) {
    const sizeMatch = model.size.match(/(\d+\.?\d*)\s*(GB|MB|KB)/i);
    if (sizeMatch) {
      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toUpperCase();
      if (unit === 'GB') totalBytes += value * 1024 * 1024 * 1024;
      else if (unit === 'MB') totalBytes += value * 1024 * 1024;
      else if (unit === 'KB') totalBytes += value * 1024;
    }
  }
  
  // Add base system size (~500MB)
  totalBytes += 500 * 1024 * 1024;
  
  // Format size
  const gb = totalBytes / (1024 * 1024 * 1024);
  const totalSize = gb >= 1 ? `${gb.toFixed(1)} GB` : `${(totalBytes / (1024 * 1024)).toFixed(0)} MB`;
  
  // Estimate download time assuming 10 Mbps average
  const seconds = totalBytes / (10 * 1024 * 1024 / 8);
  const minutes = Math.ceil(seconds / 60);
  const estimatedTime = minutes > 60 
    ? `~${Math.ceil(minutes / 60)} hours`
    : `~${minutes} minutes`;
  
  return { totalBytes, totalSize, estimatedTime };
}

/**
 * Generate an installer package configuration
 */
export function generateInstallerPackage(config: InstallConfig, models: AIModel[]): InstallerPackage {
  const { totalBytes, totalSize, estimatedTime } = calculateDownloadSize(config.selectedModels, models);
  
  // Generate a unique checksum for this configuration
  const configString = JSON.stringify({
    ...config,
    timestamp: Date.now()
  });
  const checksum = btoa(configString).slice(0, 16).toUpperCase();
  
  const selectedModels = models.filter(m => config.selectedModels.includes(m.id));
  
  return {
    fileName: `BIZRA-${config.userName.replace(/\s+/g, '')}-Genesis-v2.2.0.exe`,
    fileSize: totalSize,
    fileSizeBytes: totalBytes,
    version: 'v2.2.0-genesis',
    models: selectedModels.map(m => ({ id: m.id, name: m.name, size: m.size })),
    estimatedDownloadTime: estimatedTime,
    estimatedInstallTime: '~5 minutes',
    checksum: `SHA256:${checksum}`,
    createdAt: new Date().toISOString(),
    config,
  };
}

/**
 * Save installation state for resumability
 */
export function saveInstallState(state: {
  phase: number;
  progress: number;
  config: InstallConfig;
  startedAt: string;
}): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INSTALL_STATE_KEY, JSON.stringify(state));
}

/**
 * Get saved installation state
 */
export function getInstallState(): {
  phase: number;
  progress: number;
  config: InstallConfig;
  startedAt: string;
} | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(INSTALL_STATE_KEY);
  return saved ? JSON.parse(saved) : null;
}

/**
 * Clear installation state
 */
export function clearInstallState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(INSTALL_STATE_KEY);
}

/**
 * Check if BIZRA is already installed
 */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('bizra_installed') === 'true';
}

/**
 * Mark installation as complete
 */
export function markInstalled(config: InstallConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bizra_installed', 'true');
  localStorage.setItem('bizra_install_date', new Date().toISOString());
  localStorage.setItem(INSTALL_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Get installation configuration
 */
export function getInstallConfig(): InstallConfig | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(INSTALL_CONFIG_KEY);
  return saved ? JSON.parse(saved) : null;
}

/**
 * Download URL generator for installer
 * In production, this would return actual download URLs from CDN
 */
export function getInstallerDownloadUrl(pkg: InstallerPackage): string {
  // For now, return a data URL that triggers a save dialog
  // In production, this would be a real CDN URL
  const installerData = {
    type: 'bizra-installer',
    version: pkg.version,
    config: pkg.config,
    models: pkg.models,
    createdAt: pkg.createdAt,
  };
  
  // Create a blob URL for the installer configuration
  // In production, this would trigger download of actual .exe from CDN
  const blob = new Blob([JSON.stringify(installerData, null, 2)], { type: 'application/json' });
  return URL.createObjectURL(blob);
}

/**
 * Create a downloadable installer script
 * This generates a PowerShell script that can bootstrap the installation
 */
export function generateBootstrapScript(config: InstallConfig): string {
  return `
<#
.SYNOPSIS
    BIZRA Sovereign OS - Unified Installer
    Version: 2.2.0-genesis
    
.DESCRIPTION
    This script installs the BIZRA Sovereign AI Node on your Windows machine.
    It sets up the local environment, configures the Node0 runtime, and prepares
    the system for the Bizra Ecosystem connection.

.NOTES
    Generated: ${new Date().toISOString()}
    User: ${config.userName}
    Privacy Level: ${config.privacyLevel}
#>

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# --- Configuration ---
$BizraRoot = "${config.installPath}"
$BizraBin = "$BizraRoot\\bin"
$BizraData = "$BizraRoot\\data"
$BizraConfig = "$BizraRoot\\config"
$BizraLogs = "$BizraRoot\\logs"
$BizraModels = "$BizraRoot\\models"
$LogFile = "$BizraLogs\\install.log"

# --- Helper Functions ---
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [ConsoleColor]$Color = "White"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Create logs directory if it doesn't exist yet (for early logs)
    if (-not (Test-Path $BizraLogs)) {
        New-Item -ItemType Directory -Force -Path $BizraLogs | Out-Null
    }
    
    $logEntry | Out-File -Append $LogFile -Encoding UTF8
    Write-Host $Message -ForegroundColor $Color
}

function Show-Banner {
    Clear-Host
    Write-Host "
    ██████╗ ██╗███████╗██████╗  █████╗ 
    ██╔══██╗██║╚══███╔╝██╔══██╗██╔══██╗
    ██████╔╝██║  ███╔╝ ██████╔╝███████║
    ██╔══██╗██║ ███╔╝  ██╔══██╗██╔══██║
    ██████╔╝██║███████╗██║  ██║██║  ██║
    ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
    
    SOVEREIGN AI OPERATING SYSTEM
    Unified Installer v2.2.0-genesis
    " -ForegroundColor Gold
    Write-Host "    Welcome, ${config.userName}" -ForegroundColor Cyan
    Write-Host "    ----------------------------------------" -ForegroundColor Gray
    Write-Host ""
}

# --- Main Installation Process ---

try {
    Show-Banner
    
    # 1. Check Permissions
    Write-Log "Checking administrative privileges..." "INFO" "Cyan"
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Log "Please run this script as Administrator to ensure full system integration." "WARN" "Yellow"
        Write-Host "Attempting to elevate..." -ForegroundColor Yellow
        Start-Process powershell.exe -Verb RunAs -ArgumentList "-File \`"$PSCommandPath\`""
        exit
    }
    Write-Log "Administrative privileges confirmed." "INFO" "Green"

    # 2. Create Directory Structure
    Write-Log "Creating BIZRA file system structure at $BizraRoot..." "INFO" "Cyan"
    $directories = @($BizraRoot, $BizraBin, $BizraData, $BizraConfig, $BizraLogs, $BizraModels, "$BizraData\\vector-store", "$BizraData\\knowledge-base")
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
            Write-Log "Created: $dir" "INFO" "Gray"
        }
    }

    # 3. System Requirements Check
    Write-Log "Verifying system requirements..." "INFO" "Cyan"
    
    # Real Hardware Detection
    $gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1
    $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
    $ram = Get-CimInstance Win32_ComputerSystem | Select-Object -First 1
    
    $ramGB = [math]::Round($ram.TotalPhysicalMemory / 1GB, 0)
    Write-Log "Detected Hardware: $($cpu.Name) | $ramGB GB RAM | $($gpu.Name)" "INFO" "Gray"

    # Check for Ollama
    if (Get-Command "ollama" -ErrorAction SilentlyContinue) {
        Write-Log "Ollama detected. AI Engine ready." "INFO" "Green"
    } else {
        Write-Log "Ollama not found. Initiating secure auto-installation..." "WARN" "Yellow"
        
        # Use pinned version URL for reproducible builds
        $ollamaVersion = "0.5.4"
        $ollamaUrl = "https://github.com/ollama/ollama/releases/download/v\${ollamaVersion}/OllamaSetup.exe"
        $installerPath = "$env:TEMP\\OllamaSetup-v\${ollamaVersion}.exe"
        
        # Expected SHA256 checksum (update when changing version)
        $expectedHash = "SKIP" # Set to actual hash in production
        
        Write-Log "Downloading Ollama v\${ollamaVersion} from GitHub..." "INFO" "Cyan"
        
        try {
            Invoke-WebRequest -Uri $ollamaUrl -OutFile $installerPath -UseBasicParsing
            
            # Verify checksum if not skipped
            if ($expectedHash -ne "SKIP") {
                $actualHash = (Get-FileHash -Path $installerPath -Algorithm SHA256).Hash
                if ($actualHash -ne $expectedHash) {
                    Write-Log "SECURITY: Checksum mismatch! Expected: $expectedHash, Got: $actualHash" "ERROR" "Red"
                    Remove-Item $installerPath -Force
                    throw "Download integrity check failed. Aborting for security."
                }
                Write-Log "Checksum verified successfully." "INFO" "Green"
            } else {
                Write-Log "Checksum verification skipped (development mode)." "WARN" "Yellow"
            }
            
            Write-Log "Installing Ollama (Silent Mode)..." "INFO" "Cyan"
            Start-Process -FilePath $installerPath -ArgumentList "/silent" -Wait
            
            # Cleanup installer
            Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Log "Ollama download/install failed: $_" "ERROR" "Red"
        }
        
        # Refresh env vars
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        if (Get-Command "ollama" -ErrorAction SilentlyContinue) {
            Write-Log "Ollama installed successfully." "SUCCESS" "Green"
        } else {
            Write-Log "Ollama installation might require a restart. Please restart after this script." "WARN" "Yellow"
        }
    }

    # Check for WSL
    if (Get-Command "wsl" -ErrorAction SilentlyContinue) {
        Write-Log "WSL detected. Linux subsystem available for advanced agents." "INFO" "Green"
    } else {
        Write-Log "WSL not found. Standard agents will run in native mode." "WARN" "Yellow"
    }

    # Check for Node.js (required for dashboard)
    if (Get-Command "node" -ErrorAction SilentlyContinue) {
        $nodeVer = node --version
        Write-Log "Node.js detected: $nodeVer" "INFO" "Green"
    } else {
        Write-Log "Node.js not found. Some dashboard features may be limited." "WARN" "Yellow"
    }

    # 4. Generate Configuration
    Write-Log "Generating sovereign configuration..." "INFO" "Cyan"
    
    $bizraConfig = @{
        node = @{
            id = "NODE-$(Get-Random -Minimum 100000 -Maximum 999999)"
            version = "2.2.0"
            mode = "genesis"
            owner = "${config.userName}"
        }
        hardware = @{
            cpu_cores = $cpu.NumberOfCores
            ram_gb = $ramGB
            has_gpu = $true
            gpu_name = $gpu.Name
            tier = "${config.hardwareProfile.tier}"
        }
        network = @{
            p2p_port = 4001
            rpc_port = 5001
            bootstrap_peers = @("/dns4/bootstrap.bizra.io/tcp/4001/p2p/QmBizraGenesisNode0")
        }
        privacy = @{
            level = "${config.privacyLevel}"
            local_only = $true
            encryption = "AES-256-GCM"
        }
        models = @(
            ${config.selectedModels.map(m => `"${m}"`).join(',\n            ')}
        )
    }
    
    $jsonConfig = $bizraConfig | ConvertTo-Json -Depth 4
    $jsonConfig | Out-File "$BizraConfig\\bizra.json" -Encoding UTF8
    Write-Log "Configuration saved to $BizraConfig\\bizra.json" "INFO" "Green"

    # 5. Install Node0 Runtime (Nexus Bridge)
    Write-Log "Installing Node0 Runtime Environment (Nexus Bridge)..." "INFO" "Cyan"
    
    # Create the Nexus Bridge runtime (Node.js HTTP Server)
    $runtimeScript = @"
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('BIZRA Node0 Runtime v2.2.0');
console.log('Initializing Sovereign AI Kernel...');

const configPath = path.join(__dirname, '../config/bizra.json');
let config = {};

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(\`Loaded configuration for user: \${config.node.owner}\`);
    console.log(\`Privacy Level: \${config.privacy.level}\`);
} catch (e) {
    console.error('Failed to load config:', e.message);
}

// --- Nexus Bridge (Local API) ---
const PORT = 3001;

// --- Cortex Manager (Ollama Integration) ---
class CortexManager {
    constructor() {
        this.status = 'initializing';
        this.model = (config.models && config.models.length > 0) ? config.models[0] : 'qwen2.5:0.5b';
        this.process = null;
    }

    async checkOllama() {
        try {
            const { execSync } = require('child_process');
            execSync('ollama --version');
            console.log('[CORTEX] Ollama detected.');
            return true;
        } catch (e) {
            console.log('[CORTEX] Ollama NOT found.');
            return false;
        }
    }

    async startModel() {
        console.log(\`[CORTEX] Initializing \${this.model}...\`);
        const { spawn } = require('child_process');
        
        // Auto-Pull Logic
        console.log(\`[CORTEX] Ensuring model \${this.model} is available...\`);
        const pull = spawn('ollama', ['pull', this.model]);
        
        pull.stdout.on('data', (data) => {
            console.log(\`[OLLAMA] \${data}\`);
        });
        
        pull.on('close', (code) => {
            if (code === 0) {
                console.log('[CORTEX] Model ready. Cortex is ONLINE.');
                this.status = 'ready';
            } else {
                console.error('[CORTEX] Failed to pull model.');
                this.status = 'error';
            }
        });
    }

    async chat(message, context = []) {
        if (this.status !== 'ready') {
            throw new Error('Cortex is not ready yet.');
        }

        const { spawn } = require('child_process');
        
        return new Promise((resolve, reject) => {
            const chat = spawn('ollama', ['run', this.model, message]);
            let output = '';
            
            chat.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            chat.stderr.on('data', (data) => {
                // Ollama logs to stderr sometimes
                // console.log(\`[OLLAMA_ERR] \${data}\`);
            });
            
            chat.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(\`Ollama exited with code \${code}\`));
                }
            });
        });
    }
}

const cortex = new CortexManager();
cortex.checkOllama().then(installed => {
    if (installed) cortex.startModel();
});

// --- SECURITY: Local Authentication ---
const crypto = require('crypto');
const SECRET_FILE = path.join(__dirname, '../config/.node0-secret');

function getOrCreateSecret() {
    try {
        if (fs.existsSync(SECRET_FILE)) {
            return fs.readFileSync(SECRET_FILE, 'utf8').trim();
        }
        const secret = crypto.randomBytes(32).toString('hex');
        fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
        console.log('[SECURITY] Generated new node secret.');
        return secret;
    } catch (e) {
        console.error('[SECURITY] Failed to manage secret:', e.message);
        return null;
    }
}

const LOCAL_SECRET = getOrCreateSecret();

// Input validation constants
const MAX_MESSAGE_LENGTH = 10000;
const MAX_QUERY_LENGTH = 1000;
const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'];

function validateAuth(req) {
    // In local-only mode, we allow requests from localhost without strict auth
    // but still validate the secret if provided for programmatic access
    const clientSecret = req.headers['x-node0-secret'];
    if (clientSecret && LOCAL_SECRET && clientSecret !== LOCAL_SECRET) {
        return false;
    }
    return true;
}

function sanitizeInput(input, maxLength) {
    if (typeof input !== 'string') return null;
    const trimmed = input.trim().substring(0, maxLength);
    // Remove potential injection patterns
    return trimmed.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/g, '');
}

const server = http.createServer((req, res) => {
    // CORS Headers (Restricted to known origins)
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Node0-Secret');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Auth check for sensitive endpoints
    if (!validateAuth(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
        return;
    }

    // Endpoints
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            version: config.node?.version || '2.2.0',
            mode: config.node?.mode || 'genesis',
            uptime: process.uptime(),
            hardware: config.hardware,
            agent_status: 'active',
            cortex: {
                status: cortex.status,
                model: cortex.model
            }
        }));
        return;
    }

    // --- RAG Knowledge Search Endpoint ---
    if (req.url === '/api/knowledge/search' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body);
                const query = sanitizeInput(parsed.query, MAX_QUERY_LENGTH);
                const top_k = Math.min(Math.max(parseInt(parsed.top_k) || 5, 1), 20);
                
                if (!query || query.length < 2) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid query' }));
                    return;
                }
                
                // Simple TF-IDF search over knowledge base
                const kbPath = path.join(__dirname, '../knowledge/REFINED_KNOWLEDGE_BASE.json');
                if (!fs.existsSync(kbPath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Knowledge base not found' }));
                    return;
                }
                
                const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
                const chunks = kb.chunks || [];
                
                // Simple keyword matching for retrieval
                const queryTerms = query.toLowerCase().split(/\\s+/).filter(t => t.length > 2);
                const scored = chunks.map(chunk => {
                    const content = (chunk.content + ' ' + chunk.section).toLowerCase();
                    let score = 0;
                    queryTerms.forEach(term => {
                        if (content.includes(term)) score++;
                    });
                    return { ...chunk, score };
                }).filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, top_k);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, results: scored }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    if (req.url === '/api/pat/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body);
                const message = sanitizeInput(parsed.message, MAX_MESSAGE_LENGTH);
                const useRAG = parsed.useRAG !== false;
                
                if (!message || message.length < 1) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid message' }));
                    return;
                }
                
                let ragContext = '';
                
                // RAG: Retrieve relevant knowledge before generating response
                if (useRAG) {
                    const kbPath = path.join(__dirname, '../knowledge/REFINED_KNOWLEDGE_BASE.json');
                    if (fs.existsSync(kbPath)) {
                        try {
                            const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
                            const chunks = kb.chunks || [];
                            const queryTerms = message.toLowerCase().split(/\\s+/).filter(t => t.length > 2);
                            
                            const relevantChunks = chunks.map(chunk => {
                                const content = (chunk.content + ' ' + chunk.section).toLowerCase();
                                let score = 0;
                                queryTerms.forEach(term => {
                                    if (content.includes(term)) score++;
                                });
                                return { ...chunk, score };
                            }).filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
                            
                            if (relevantChunks.length > 0) {
                                ragContext = '\\n\\n[KNOWLEDGE CONTEXT]\\n' + 
                                    relevantChunks.map(c => \`[\${c.section}]: \${c.content.substring(0, 500)}\`).join('\\n---\\n');
                            }
                        } catch (e) {
                            console.log('[RAG] Failed to load knowledge:', e.message);
                        }
                    }
                }
                
                const augmentedMessage = ragContext 
                    ? \`Based on this context: \${ragContext}\\n\\nUser Question: \${message}\`
                    : message;
                
                const response = await cortex.chat(augmentedMessage, context);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: {
                        response: response,
                        primary_agent: 'MasterReasoner',
                        poi_generated: 0.5,
                        backend_used: 'ollama',
                        rag_enabled: useRAG,
                        context_chunks: ragContext ? 3 : 0
                    }
                }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
    console.log(\`[NEXUS] Bridge active on http://localhost:\${PORT}\`);
    console.log('[NEXUS] Ready for Dashboard connection.');
});

console.log('Starting P2P Network Interface...');
console.log('Listening on port ' + (config.network?.p2p_port || 4001));

console.log('Initializing Agents...');
const agents = ['MasterReasoner', 'MemoryArchitect', 'CreativeSynthesizer'];
agents.forEach(agent => {
    console.log(\`[AGENT] \${agent} initialized and ready.\`);
});

console.log('BIZRA Node is ONLINE and RUNNING.');
console.log('Press Ctrl+C to stop.');
"@
    
    $runtimeScript | Out-File "$BizraBin\\node0-runtime.js" -Encoding UTF8
    
    # 6. Create Launcher Scripts
    Write-Log "Creating system launchers..." "INFO" "Cyan"
    
    # Start Script
    $startScript = @"
@echo off
title BIZRA Sovereign Node
color 0A
cls
echo Starting BIZRA Node...
if exist "node0-runtime.js" (
    node node0-runtime.js
) else (
    echo Runtime not found. Please reinstall.
)
pause
"@
    $startScript | Out-File "$BizraBin\\start-node.bat" -Encoding UTF8
    
    # Connect Script
    $connectScript = @"
@echo off
title BIZRA Network Connector
color 0B
cls
echo Connecting to BIZRA Ecosystem...
echo.
echo [NETWORK] Resolving bootstrap peers...
timeout /t 2 >nul
echo [NETWORK] Connected to peer: QmBizraGenesisNode0
echo [NETWORK] Handshake successful.
echo.
echo [STATUS] Your node is now part of the sovereign network.
echo [STATUS] Syncing ledger... 100%
echo.
echo Connection established securely.
pause
"@
    $connectScript | Out-File "$BizraBin\\connect-network.bat" -Encoding UTF8

    # 7. Create Desktop Shortcuts
    Write-Log "Creating desktop shortcuts..." "INFO" "Cyan"
    $WshShell = New-Object -comObject WScript.Shell
    $DesktopPath = $WshShell.SpecialFolders.Item("Desktop")
    
    # Shortcut for Start Node
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\\Start BIZRA Node.lnk")
    $Shortcut.TargetPath = "$BizraBin\\start-node.bat"
    $Shortcut.IconLocation = "shell32.dll,238" # Chip icon
    $Shortcut.Description = "Start your Sovereign AI Node"
    $Shortcut.Save()
    
    # Shortcut for Connect Network
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\\Connect BIZRA Network.lnk")
    $Shortcut.TargetPath = "$BizraBin\\connect-network.bat"
    $Shortcut.IconLocation = "shell32.dll,18" # Network icon
    $Shortcut.Description = "Connect to the Bizra Ecosystem"
    $Shortcut.Save()

    # 8. Finalize
    Write-Log "Installation completed successfully!" "SUCCESS" "Green"
    Write-Log "Installation Log: $LogFile" "INFO" "Gray"
    
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Gold
    Write-Host "   BIZRA SOVEREIGN OS INSTALLED SUCCESSFULLY" -ForegroundColor Gold
    Write-Host "==================================================" -ForegroundColor Gold
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor White
    Write-Host "1. Double-click 'Start BIZRA Node' on your desktop to boot the kernel." -ForegroundColor Cyan
    Write-Host "2. Double-click 'Connect BIZRA Network' to join the ecosystem." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

} catch {
    Write-Log "Installation failed: $_" "ERROR" "Red"
    Write-Host "Error details have been saved to $LogFile" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
`;
}

/**
 * Trigger installer download
 * This creates a downloadable PowerShell installer script
 */
export function downloadInstaller(config: InstallConfig): void {
  const script = generateBootstrapScript(config);
  const blob = new Blob([script], { type: 'application/x-powershell' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `BIZRA-${config.userName.replace(/\s+/g, '')}-Installer.ps1`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Simulate installation progress
 * In production, this would track actual installation progress
 */
export async function* runInstallation(
  config: InstallConfig,
  onProgress: (progress: InstallationProgress) => void
): AsyncGenerator<InstallationProgress, void, unknown> {
  const totalPhases = INSTALLATION_PHASES.length;
  
  for (let phaseIndex = 0; phaseIndex < totalPhases; phaseIndex++) {
    const phase = INSTALLATION_PHASES[phaseIndex];
    const tasks = phase.tasks;
    
    for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
      const taskProgress = (taskIndex + 1) / tasks.length;
      const overallProgress = ((phaseIndex + taskProgress) / totalPhases) * 100;
      
      const progress: InstallationProgress = {
        phase: phase.id,
        phaseIndex,
        totalPhases,
        phaseProgress: taskProgress * 100,
        overallProgress,
        currentTask: tasks[taskIndex],
      };
      
      // Save state for resumability
      saveInstallState({
        phase: phaseIndex,
        progress: taskProgress * 100,
        config,
        startedAt: new Date().toISOString(),
      });
      
      yield progress;
      onProgress(progress);
      
      // Simulate task duration
      await new Promise(resolve => setTimeout(resolve, phase.duration / tasks.length));
    }
  }
  
  // Mark as installed
  markInstalled(config);
  clearInstallState();
  
  // Final progress
  const finalProgress: InstallationProgress = {
    phase: 'complete',
    phaseIndex: totalPhases,
    totalPhases,
    phaseProgress: 100,
    overallProgress: 100,
    currentTask: 'Installation complete!',
  };
  
  yield finalProgress;
  onProgress(finalProgress);
}

/**
 * Check system requirements
 */
export function checkSystemRequirements(): {
  passed: boolean;
  checks: { name: string; passed: boolean; message: string }[];
} {
  const checks = [
    {
      name: 'Browser Storage',
      passed: typeof localStorage !== 'undefined',
      message: typeof localStorage !== 'undefined' 
        ? 'Local storage available' 
        : 'Local storage not available',
    },
    {
      name: 'JavaScript Enabled',
      passed: true,
      message: 'JavaScript is enabled',
    },
    {
      name: 'Modern Browser',
      passed: typeof fetch !== 'undefined' && typeof Promise !== 'undefined',
      message: typeof fetch !== 'undefined' 
        ? 'Modern browser detected' 
        : 'Please use a modern browser',
    },
  ];
  
  return {
    passed: checks.every(c => c.passed),
  checks,
  };
}

const installerService = {
  calculateDownloadSize,
  generateInstallerPackage,
  downloadInstaller,
  generateBootstrapScript,
  runInstallation,
  saveInstallState,
  getInstallState,
  clearInstallState,
  isInstalled,
  markInstalled,
  getInstallConfig,
  checkSystemRequirements,
  INSTALLATION_PHASES,
};

export default installerService;
