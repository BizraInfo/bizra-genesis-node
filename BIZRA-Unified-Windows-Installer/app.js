// Application State
const state = {
  currentStep: 1,
  systemSpecs: {},
  userProfile: {},
  isNewUser: true,
  generationProgress: 0
};

// System specifications based on JSON data
const systemRequirements = {
  minRAM: 12,
  minStorage: 50,
  recommendedRAM: 32,
  recommendedStorage: 100
};

// Personal Agents from JSON
const personalAgents = [
  { name: "Strategic Planner", role: "High-level planning and goal decomposition", icon: "🎯", color: "#FFD700" },
  { name: "Research Assistant", role: "Information gathering and analysis", icon: "🔍", color: "#4169E1" },
  { name: "Creative Designer", role: "Visual and creative problem solving", icon: "🎨", color: "#FF6347" },
  { name: "Data Analyst", role: "Quantitative analysis and insights", icon: "📊", color: "#32CD32" },
  { name: "Security Guardian", role: "Privacy and security enforcement", icon: "🛡️", color: "#8A2BE2" },
  { name: "Learning Optimizer", role: "Continuous improvement and adaptation", icon: "📈", color: "#FF1493" },
  { name: "Task Coordinator", role: "Multi-agent orchestration", icon: "🔄", color: "#00CED1" }
];

// Installation Phases from JSON
const installationPhases = [
  { phase: "Environment Scan", description: "Analyzing your system capabilities", duration: "30 seconds" },
  { phase: "Profile Setup", description: "Creating your personal AI configuration", duration: "60 seconds" },
  { phase: "Component Download", description: "Retrieving BIZRA Sovereign OS components", duration: "5-10 minutes" },
  { phase: "Agent Deployment", description: "Initializing your 7 personal AI agents", duration: "2-3 minutes" },
  { phase: "System Integration", description: "Connecting to desktop environment", duration: "1-2 minutes" },
  { phase: "Validation & Testing", description: "Verifying installation success", duration: "1 minute" }
];

// Initialize Application
function init() {
  setupEventListeners();
  renderAgentPreview();
}

// Setup Event Listeners
function setupEventListeners() {
  // Step 1 - Start Scan
  document.getElementById('start-scan').addEventListener('click', startSystemScan);
  
  // Step 2 - Navigation
  document.getElementById('back-to-scan').addEventListener('click', () => goToStep(1));
  document.getElementById('continue-to-profile').addEventListener('click', () => goToStep(3));
  
  // Step 3 - Profile Setup
  document.getElementById('back-to-results').addEventListener('click', () => goToStep(2));
  document.getElementById('continue-to-generation').addEventListener('click', validateAndGenerate);
  
  // Step 5 - Success Actions
  document.getElementById('generate-another').addEventListener('click', () => goToStep(1));
  document.getElementById('download-installer').addEventListener('click', downloadInstaller);
}

// Navigate to Step
function goToStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll('.step').forEach(step => {
    step.classList.remove('active');
  });
  
  // Show target step
  const targetStep = document.getElementById(`step-${stepNumber}`);
  if (targetStep) {
    targetStep.classList.add('active');
    state.currentStep = stepNumber;
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Start System Scan
function startSystemScan() {
  const statusEl = document.getElementById('scan-status');
  const detailEl = document.getElementById('scan-detail');
  const btnEl = document.getElementById('start-scan');
  
  btnEl.disabled = true;
  btnEl.textContent = 'Scanning...';
  
  const scanSteps = [
    { status: 'Detecting Hardware...', detail: 'Analyzing CPU, GPU, RAM, and Storage' },
    { status: 'Checking System Profile...', detail: 'Looking for existing BIZRA configurations' },
    { status: 'Analyzing Capabilities...', detail: 'Determining optimal settings' },
    { status: 'Scan Complete!', detail: 'System analysis finished successfully' }
  ];
  
  let currentScan = 0;
  
  const scanInterval = setInterval(() => {
    if (currentScan < scanSteps.length) {
      statusEl.textContent = scanSteps[currentScan].status;
      detailEl.textContent = scanSteps[currentScan].detail;
      currentScan++;
    } else {
      clearInterval(scanInterval);
      setTimeout(() => {
        performSystemScan();
        goToStep(2);
      }, 500);
    }
  }, 1200);
}

// Perform System Scan (Simulated)
function performSystemScan() {
  // Simulate system detection
  state.systemSpecs = {
    gpu: {
      model: 'NVIDIA RTX 4090',
      vram: '24 GB',
      suitable: true
    },
    cpu: {
      model: 'Intel Core i9-14900K',
      cores: 24,
      suitable: true
    },
    ram: {
      total: 64,
      available: 58,
      suitable: true
    },
    storage: {
      total: 2000,
      available: 847,
      type: 'NVMe SSD',
      suitable: true
    }
  };
  
  // Check for existing profile
  state.isNewUser = true; // Simulated - no existing config
  
  // Render system specs
  renderSystemSpecs();
  renderProfileStatus();
}

// Render System Specifications
function renderSystemSpecs() {
  const container = document.getElementById('system-specs');
  const specs = state.systemSpecs;
  
  container.innerHTML = `
    <div class="info-card">
      <div class="info-icon">🎮</div>
      <div class="info-content">
        <h3>GPU</h3>
        <p>${specs.gpu.model}</p>
        <div class="info-value">${specs.gpu.vram} VRAM</div>
      </div>
    </div>
    
    <div class="info-card">
      <div class="info-icon">⚡</div>
      <div class="info-content">
        <h3>CPU</h3>
        <p>${specs.cpu.model}</p>
        <div class="info-value">${specs.cpu.cores} Cores</div>
      </div>
    </div>
    
    <div class="info-card">
      <div class="info-icon">💾</div>
      <div class="info-content">
        <h3>RAM</h3>
        <p>Available Memory</p>
        <div class="info-value">${specs.ram.total} GB Total</div>
      </div>
    </div>
    
    <div class="info-card">
      <div class="info-icon">💿</div>
      <div class="info-content">
        <h3>Storage</h3>
        <p>${specs.storage.type}</p>
        <div class="info-value">${specs.storage.available} GB Free</div>
      </div>
    </div>
  `;
}

// Render Profile Status
function renderProfileStatus() {
  const titleEl = document.getElementById('profile-status-title');
  const descEl = document.getElementById('profile-status-desc');
  
  if (state.isNewUser) {
    titleEl.textContent = 'New User Detected';
    descEl.textContent = 'No existing BIZRA configuration found. We\'ll create a personalized profile optimized for your hardware.';
  } else {
    titleEl.textContent = 'Existing Profile Found';
    descEl.textContent = 'We detected an existing BIZRA configuration. Your settings will be preserved and upgraded.';
  }
}

// Render Agent Preview
function renderAgentPreview() {
  const container = document.getElementById('agent-preview');
  
  container.innerHTML = personalAgents.map(agent => `
    <div class="agent-card">
      <div class="agent-icon">${agent.icon}</div>
      <h4>${agent.name}</h4>
      <p>${agent.role}</p>
    </div>
  `).join('');
}

// Validate and Generate
function validateAndGenerate() {
  const userName = document.getElementById('user-name').value.trim();
  
  if (!userName) {
    alert('Please enter your name to continue.');
    return;
  }
  
  // Store profile data
  state.userProfile = {
    name: userName,
    installPath: document.getElementById('install-path').value,
    privacyLevel: document.getElementById('privacy-level').value
  };
  
  // Go to generation step
  goToStep(4);
  startGeneration();
}

// Start Installer Generation
function startGeneration() {
  // Render installation phases
  renderInstallationPhases();
  
  // Simulate generation progress
  let progress = 0;
  let currentPhase = 0;
  
  const generationInterval = setInterval(() => {
    progress += Math.random() * 3;
    
    if (progress > 100) {
      progress = 100;
      clearInterval(generationInterval);
      setTimeout(() => {
        goToStep(5);
        updateInstallerName();
      }, 500);
    }
    
    // Update progress bar
    updateProgress(progress);
    
    // Update phase status
    const phaseIndex = Math.floor((progress / 100) * installationPhases.length);
    if (phaseIndex !== currentPhase && phaseIndex < installationPhases.length) {
      currentPhase = phaseIndex;
      updatePhaseStatus(currentPhase);
    }
  }, 400);
}

// Render Installation Phases
function renderInstallationPhases() {
  const container = document.getElementById('installation-phases');
  
  container.innerHTML = installationPhases.map((phase, index) => `
    <div class="phase-item" id="phase-${index}">
      <div class="phase-status">⋯</div>
      <div class="phase-info">
        <div class="phase-name">${phase.phase}</div>
        <div class="phase-desc">${phase.description}</div>
      </div>
      <div class="phase-duration">${phase.duration}</div>
    </div>
  `).join('');
}

// Update Progress
function updateProgress(percentage) {
  const percent = Math.min(100, Math.max(0, percentage));
  
  document.getElementById('progress-fill').style.width = `${percent}%`;
  document.getElementById('progress-percent').textContent = `${Math.round(percent)}%`;
  
  // Update progress text based on percentage
  let progressText = 'Initializing...';
  if (percent < 20) progressText = 'Scanning environment...';
  else if (percent < 35) progressText = 'Creating user profile...';
  else if (percent < 60) progressText = 'Downloading components...';
  else if (percent < 75) progressText = 'Deploying agents...';
  else if (percent < 90) progressText = 'Integrating with system...';
  else if (percent < 100) progressText = 'Validating installation...';
  else progressText = 'Generation complete!';
  
  document.getElementById('progress-text').textContent = progressText;
}

// Update Phase Status
function updatePhaseStatus(currentPhase) {
  installationPhases.forEach((phase, index) => {
    const phaseEl = document.getElementById(`phase-${index}`);
    const statusEl = phaseEl.querySelector('.phase-status');
    
    if (index < currentPhase) {
      // Completed
      phaseEl.classList.remove('active');
      phaseEl.classList.add('complete');
      statusEl.textContent = '✓';
    } else if (index === currentPhase) {
      // Active
      phaseEl.classList.add('active');
      phaseEl.classList.remove('complete');
      statusEl.textContent = '●';
    } else {
      // Pending
      phaseEl.classList.remove('active', 'complete');
      statusEl.textContent = '⋯';
    }
  });
}

// Update Installer Name
function updateInstallerName() {
  const userName = state.userProfile.name;
  const installerName = `BIZRA-Sovereign-OS-${userName.replace(/\s+/g, '-')}-Setup.exe`;
  document.getElementById('installer-name').textContent = installerName;
}

// Download Installer (Simulated)
function downloadInstaller() {
  const userName = state.userProfile.name;
  const installerName = `BIZRA-Sovereign-OS-${userName.replace(/\s+/g, '-')}-Setup.exe`;
  
  // Create a simulated download
  const downloadInfo = {
    name: installerName,
    size: '4.2 GB',
    version: 'v2.2.0-rc1',
    profile: state.userProfile,
    specs: state.systemSpecs,
    agents: personalAgents,
    timestamp: new Date().toISOString()
  };
  
  // In a real application, this would trigger an actual download
  // For this demo, we'll log the configuration
  console.log('Installer Configuration:', downloadInfo);
  
  // Show confirmation
  alert(`Installer package generated!\n\nFile: ${installerName}\nSize: 4.2 GB\n\nIn a production environment, this would download to your system.\n\nThe installer includes:\n- AgentFlow 8B Planner\n- 87 MCP Tools\n- 7 Personal AI Agents\n- HyperGraph RAG\n- Proof-of-Impact Blockchain\n- Desktop Integration`);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}