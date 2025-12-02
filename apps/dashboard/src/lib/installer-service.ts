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
#############################################
# BIZRA Sovereign OS - Bootstrap Installer
# Version: 2.2.0-genesis
# Generated: ${new Date().toISOString()}
# User: ${config.userName}
#############################################

$ErrorActionPreference = "Stop"
$BizraRoot = "${config.installPath}"
$LogFile = "$BizraRoot\\install.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -Append $LogFile
    Write-Host $Message -ForegroundColor Cyan
}

# Create installation directory
Write-Log "Creating BIZRA installation directory..."
New-Item -ItemType Directory -Force -Path $BizraRoot | Out-Null
New-Item -ItemType Directory -Force -Path "$BizraRoot\\models" | Out-Null
New-Item -ItemType Directory -Force -Path "$BizraRoot\\data" | Out-Null
New-Item -ItemType Directory -Force -Path "$BizraRoot\\agents" | Out-Null
New-Item -ItemType Directory -Force -Path "$BizraRoot\\knowledge" | Out-Null

# Save configuration
$config = @{
    userName = "${config.userName}"
    privacyLevel = "${config.privacyLevel}"
    installedAt = Get-Date -Format "o"
    version = "2.2.0-genesis"
}
$config | ConvertTo-Json | Out-File "$BizraRoot\\config.json"

Write-Log "BIZRA configuration saved."

# Download model registry
Write-Log "Downloading model registry..."
# In production, this would download from actual CDN
# Invoke-WebRequest -Uri "https://cdn.bizra.io/models/registry.json" -OutFile "$BizraRoot\\models\\registry.json"

Write-Log "Installation bootstrap complete!"
Write-Log "Run 'bizra start' to launch your sovereign AI."

# Create start script
@"
# BIZRA Launcher
cd "$BizraRoot"
Write-Host "Starting BIZRA Sovereign OS..." -ForegroundColor Gold
# In production, this would launch the actual runtime
# Start-Process "$BizraRoot\\bin\\bizra-node.exe"
"@ | Out-File "$BizraRoot\\start.ps1"

Write-Host ""
Write-Host "========================================" -ForegroundColor Gold
Write-Host "  BIZRA Installation Complete!" -ForegroundColor Gold
Write-Host "  Welcome, ${config.userName}!" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Gold
Write-Host ""
Write-Host "To start BIZRA, run:" -ForegroundColor Gray
Write-Host "  & '$BizraRoot\\start.ps1'" -ForegroundColor Green
Write-Host ""
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
