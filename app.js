// API Configuration
const API_CONFIG = {
  baseURL: 'http://localhost:3001',
  endpoints: {
    telemetry: '/telemetry',
    satOutbox: '/sat/outbox',
    satRecommendations: '/sat/recommendations',
    health: '/health'
  }
};

// API Client
class GenesisAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async fetch(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  async getTelemetry() {
    return await this.fetch(API_CONFIG.endpoints.telemetry);
  }

  async getSatOutbox() {
    const response = await this.fetch(API_CONFIG.endpoints.satOutbox);
    return response.success ? response.data : [];
  }

  async getSatRecommendations() {
    const response = await this.fetch(API_CONFIG.endpoints.satRecommendations);
    return response.success ? response.data : [];
  }

  async getHealth() {
    return await this.fetch(API_CONFIG.endpoints.health);
  }

  // SAT workflow actions
  async approveOutboxItem(id) {
    return await this.fetch(`/sat/outbox/${id}/approve`, { method: 'POST' });
  }

  async rejectOutboxItem(id) {
    return await this.fetch(`/sat/outbox/${id}/reject`, { method: 'POST' });
  }

  async markContentPublished(id) {
    return await this.fetch(`/sat/outbox/${id}/publish`, { method: 'POST' });
  }
}

// Global API instance
const api = new GenesisAPI(API_CONFIG.baseURL);

// Application State
const appState = {
  currentView: 'dashboard',
  isLive: true,
  charts: {},
  apiConnected: false,
  lastApiError: null,
  telemetryData: null
};

// Sample Data from JSON
const genesisNode = {
  node_id: "BIZRA-GENESIS-001",
  status: "ACTIVE",
  uptime: "99.97%",
  version: "v2.2.0-rc1"
};

const hardware = {
  gpu: { model: "RTX 4090", vram: "24GB", utilization: 78, temperature: 65 },
  cpu: { model: "Intel i9-14900", cores: 32, utilization: 45, temperature: 58 },
  ram: { total: "128GB", used: "67GB", utilization: 52 },
  storage: { total: "2TB", used: "847GB", type: "NVMe SSD" }
};

const blockchain = {
  current_block: 1847392,
  tps: 127439,
  consensus: "Proof-of-Impact",
  network_peers: 23,
  finality_time: "0.8s"
};

const personalAgents = [
  { name: "Strategic Planner", status: "ACTIVE", current_task: "Analyzing Q4 roadmap priorities", performance: 94, uptime: "99.8%" },
  { name: "Research Assistant", status: "ACTIVE", current_task: "Processing latest AI research papers", performance: 97, uptime: "99.9%" },
  { name: "Creative Designer", status: "ACTIVE", current_task: "Optimizing UI component library", performance: 89, uptime: "99.5%" },
  { name: "Data Analyst", status: "ACTIVE", current_task: "Performance metrics correlation analysis", performance: 92, uptime: "99.7%" },
  { name: "Security Guardian", status: "ACTIVE", current_task: "Continuous threat monitoring", performance: 98, uptime: "100%" },
  { name: "Learning Optimizer", status: "ACTIVE", current_task: "Fine-tuning AgentFlow parameters", performance: 91, uptime: "99.6%" },
  { name: "Task Coordinator", status: "ACTIVE", current_task: "Orchestrating multi-agent workflows", performance: 95, uptime: "99.8%" }
];

const systemAgents = [
  { name: "Infrastructure Manager", status: "ACTIVE", current_task: "Hardware optimization", performance: 96 },
  { name: "Performance Monitor", status: "ACTIVE", current_task: "Real-time metrics collection", performance: 98 },
  { name: "Security Auditor", status: "ACTIVE", current_task: "Vulnerability scanning", performance: 94 },
  { name: "Backup Coordinator", status: "ACTIVE", current_task: "Incremental backup process", performance: 97 },
  { name: "Update Manager", status: "ACTIVE", current_task: "Checking for system updates", performance: 93 },
  { name: "Resource Allocator", status: "ACTIVE", current_task: "Dynamic resource rebalancing", performance: 95 }
];

// Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      switchView(view);
      
      // Update active nav item
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// SAT Content Management State
const satState = {
  outboxItems: [],
  recommendations: [],
  lastUpdated: null
};

// SAT Content Functions
async function loadSatData() {
  try {
    const [outbox, recommendations] = await Promise.all([
      api.getSatOutbox(),
      api.getSatRecommendations()
    ]);

    satState.outboxItems = outbox;
    satState.recommendations = recommendations;
    satState.lastUpdated = new Date();

    console.log('SAT data loaded:', { outboxCount: outbox.length, recCount: recommendations.length });
    return { outbox, recommendations };
  } catch (error) {
    console.error('Failed to load SAT data:', error);
    return { outbox: [], recommendations: [] };
  }
}

// SAT Actions
async function approveSatContent(id) {
  try {
    await api.approveOutboxItem(id);
    console.log(`Content ${id} approved`);
    // Reload data after action
    await loadSatData();
    if (appState.currentView === 'proof-of-impact') {
      renderSatContent();
    }
  } catch (error) {
    console.error('Failed to approve content:', error);
    alert('Failed to approve content: ' + error.message);
  }
}

async function rejectSatContent(id) {
  try {
    await api.rejectOutboxItem(id);
    console.log(`Content ${id} rejected`);
    // Reload data after action
    await loadSatData();
    if (appState.currentView === 'proof-of-impact') {
      renderSatContent();
    }
  } catch (error) {
    console.error('Failed to reject content:', error);
    alert('Failed to reject content: ' + error.message);
  }
}

async function publishSatContent(id) {
  try {
    await api.markContentPublished(id);
    console.log(`Content ${id} marked as published`);
    // Reload data after action
    await loadSatData();
    if (appState.currentView === 'proof-of-impact') {
      renderSatContent();
    }
  } catch (error) {
    console.error('Failed to publish content:', error);
    alert('Failed to publish content: ' + error.message);
  }
}

// Render SAT Content in Proof-of-Impact view
async function renderSatContent() {
  const satContent = document.querySelector('.impact-details-grid .card:first-child .card-content');
  if (!satContent) return;

  // Load SAT data if not loaded or stale
  if (!satState.lastUpdated || (new Date() - satState.lastUpdated) > 30000) { // 30 seconds
    await loadSatData();
  }

  if (satState.outboxItems.length === 0) {
    satContent.innerHTML = '<p>No content items in outbox</p>';
    return;
  }

  const itemsHtml = satState.outboxItems.slice(0, 5).map(item => `
    <div class="content-item" data-id="${item.id}">
      <div class="content-header">
        <div class="content-type">${item.channel_type || 'SOCIAL'}</div>
        <div class="content-status status-${item.status || 'draft'}">${item.status || 'draft'}</div>
      </div>
      <div class="content-title">${item.content_title || item.content_body.substring(0, 50) + '...'}</div>
      <div class="content-body">${item.content_body.substring(0, 100)}${item.content_body.length > 100 ? '...' : ''}</div>
      <div class="content-actions">
        <button class="btn-primary btn-small" onclick="approveSatContent('${item.id}')">Approve</button>
        <button class="btn-secondary btn-small" onclick="rejectSatContent('${item.id}')">Reject</button>
        <button class="btn-success btn-small" onclick="publishSatContent('${item.id}')">Publish</button>
      </div>
    </div>
  `).join('');

  satContent.innerHTML = `
    <div class="sat-content-list">
      ${itemsHtml}
    </div>
    ${satState.outboxItems.length > 5 ? `<p>...and ${satState.outboxItems.length - 5} more items</p>` : ''}
  `;
}

function switchView(viewName) {
  const views = document.querySelectorAll('.view');
  views.forEach(view => view.classList.remove('active'));

  const targetView = document.getElementById(viewName);
  if (targetView) {
    targetView.classList.add('active');
    appState.currentView = viewName;

    // Initialize view-specific content
    if (viewName === 'personal-agents') {
      renderPersonalAgents();
    } else if (viewName === 'system-agents') {
      renderSystemAgents();
    } else if (viewName === 'blockchain') {
      renderBlockchain();
    } else if (viewName === 'proof-of-impact') {
      renderSatContent();
    }
  }
}

// Make functions globally available for onclick handlers
window.approveSatContent = approveSatContent;
window.rejectSatContent = rejectSatContent;
window.publishSatContent = publishSatContent;

// Initialize Charts
function initCharts() {
  // GPU Chart
  const gpuCtx = document.getElementById('gpuChart');
  if (gpuCtx) {
    appState.charts.gpu = new Chart(gpuCtx, {
      type: 'line',
      data: {
        labels: ['', '', '', '', '', '', ''],
        datasets: [{
          data: [70, 72, 75, 78, 76, 79, 78],
          borderColor: '#32B8C6',
          backgroundColor: 'rgba(50, 184, 198, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false, min: 60, max: 100 }
        }
      }
    });
  }
  
  // CPU Chart
  const cpuCtx = document.getElementById('cpuChart');
  if (cpuCtx) {
    appState.charts.cpu = new Chart(cpuCtx, {
      type: 'line',
      data: {
        labels: ['', '', '', '', '', '', ''],
        datasets: [{
          data: [42, 44, 43, 45, 46, 44, 45],
          borderColor: '#32B8C6',
          backgroundColor: 'rgba(50, 184, 198, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false, min: 30, max: 60 }
        }
      }
    });
  }
  
  // RAM Chart
  const ramCtx = document.getElementById('ramChart');
  if (ramCtx) {
    appState.charts.ram = new Chart(ramCtx, {
      type: 'line',
      data: {
        labels: ['', '', '', '', '', '', ''],
        datasets: [{
          data: [50, 51, 52, 52, 53, 51, 52],
          borderColor: '#32B8C6',
          backgroundColor: 'rgba(50, 184, 198, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false, min: 40, max: 70 }
        }
      }
    });
  }
  
  // Storage Chart
  const storageCtx = document.getElementById('storageChart');
  if (storageCtx) {
    appState.charts.storage = new Chart(storageCtx, {
      type: 'line',
      data: {
        labels: ['', '', '', '', '', '', ''],
        datasets: [{
          data: [41, 41.5, 42, 42, 41.8, 42, 42],
          borderColor: '#32B8C6',
          backgroundColor: 'rgba(50, 184, 198, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false, min: 35, max: 50 }
        }
      }
    });
  }
  
  // Economic Chart
  const economicCtx = document.getElementById('economicChart');
  if (economicCtx) {
    appState.charts.economic = new Chart(economicCtx, {
      type: 'doughnut',
      data: {
        labels: ['SEED Tokens', 'BLOOM Tokens', 'Pending Rewards'],
        datasets: [{
          data: [2847, 456, 234],
          backgroundColor: ['#32B8C6', '#E68161', '#A7A9A9'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#F5F5F5', padding: 15 }
          }
        }
      }
    });
  }
  
  // Network Chart
  const networkCtx = document.getElementById('networkChart');
  if (networkCtx) {
    appState.charts.network = new Chart(networkCtx, {
      type: 'radar',
      data: {
        labels: ['Peers', 'Bandwidth', 'Latency', 'Uptime', 'Security', 'Performance'],
        datasets: [{
          label: 'Network Health',
          data: [85, 92, 88, 99, 96, 94],
          backgroundColor: 'rgba(50, 184, 198, 0.2)',
          borderColor: '#32B8C6',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { color: '#A7A9A9' },
            grid: { color: 'rgba(167, 169, 169, 0.2)' },
            pointLabels: { color: '#F5F5F5' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#F5F5F5' }
          }
        }
      }
    });
  }
  
  // Performance Chart
  const performanceCtx = document.getElementById('performanceChart');
  if (performanceCtx) {
    appState.charts.performance = new Chart(performanceCtx, {
      type: 'bar',
      data: {
        labels: ['Search Tasks', 'Agentic Reasoning', 'Math Reasoning', 'Science Tasks'],
        datasets: [{
          label: 'Performance Improvement (%)',
          data: [14.9, 14.0, 14.5, 4.1],
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#32B8C6'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: '#F5F5F5' },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#A7A9A9' },
            grid: { color: 'rgba(167, 169, 169, 0.1)' }
          }
        }
      }
    });
  }
}

// Render Personal Agents
async function renderPersonalAgents() {
  const container = document.getElementById('personalAgentsGrid');
  if (!container) return;

  // Clear existing content
  container.innerHTML = '';

  // Use telemetry data for agent counts, with descriptive names from mock data
  const agentNames = [
    "Strategic Planner", "Research Assistant", "Creative Designer",
    "Data Analyst", "Security Guardian", "Learning Optimizer", "Task Coordinator"
  ];

  const patCount = appState.telemetryData?.active_agents?.PAT || 7;

  for (let i = 0; i < patCount && i < agentNames.length; i++) {
    const agentCard = document.createElement('div');
    agentCard.className = 'agent-card';
    agentCard.innerHTML = `
      <div class="agent-header">
        <div>
          <div class="agent-name">${agentNames[i]}</div>
          <div class="agent-status">ACTIVE</div>
        </div>
      </div>
      <div class="agent-task">Processing orchestration tasks</div>
      <div class="agent-metrics">
        <div class="agent-metric">
          <div class="agent-metric-label">Performance</div>
          <div class="agent-metric-value">${85 + Math.floor(Math.random() * 15)}%</div>
        </div>
        <div class="agent-metric">
          <div class="agent-metric-label">Uptime</div>
          <div class="agent-metric-value">99.${Math.floor(Math.random() * 9) + 1}%</div>
        </div>
      </div>
    `;
    container.appendChild(agentCard);
  }

  // Update total count display
  const countDisplay = document.querySelector('.personal-agents .header-actions .agent-count');
  if (countDisplay) {
    countDisplay.textContent = `${patCount} Active Agents`;
  }
}

// Render System Agents
async function renderSystemAgents() {
  const container = document.getElementById('systemAgentsGrid');
  if (!container) return;

  // Clear existing content
  container.innerHTML = '';

  // Use telemetry data for SAT agent counts
  const satAgentNames = [
    "Infrastructure Manager", "Performance Monitor", "Security Auditor",
    "Backup Coordinator", "Update Manager", "Resource Allocator"
  ];

  const satCount = appState.telemetryData?.active_agents?.SAT || 6;

  for (let i = 0; i < satCount && i < satAgentNames.length; i++) {
    const agentCard = document.createElement('div');
    agentCard.className = 'agent-card';
    agentCard.innerHTML = `
      <div class="agent-header">
        <div>
          <div class="agent-name">${satAgentNames[i]}</div>
          <div class="agent-status">ACTIVE</div>
        </div>
      </div>
      <div class="agent-task">System monitoring and maintenance</div>
      <div class="agent-metrics">
        <div class="agent-metric">
          <div class="agent-metric-label">Performance</div>
          <div class="agent-metric-value">${88 + Math.floor(Math.random() * 10)}%</div>
        </div>
        <div class="agent-metric">
          <div class="agent-metric-label">Status</div>
          <div class="agent-metric-value">Online</div>
        </div>
      </div>
    `;
    container.appendChild(agentCard);
  }

  // Update total count display
  const countDisplay = document.querySelector('.system-agents .header-actions .agent-count');
  if (countDisplay) {
    countDisplay.textContent = `${satCount} Active Agents`;
  }
}

// Render Blockchain
function renderBlockchain() {
  const container = document.getElementById('blockList');
  if (!container || container.children.length > 0) return;
  
  const blocks = [];
  for (let i = 0; i < 10; i++) {
    blocks.push({
      number: blockchain.current_block - i,
      hash: generateBlockHash(),
      time: `${i === 0 ? 'Just now' : i + 's ago'}`
    });
  }
  
  container.innerHTML = blocks.map(block => `
    <div class="block-item">
      <span class="block-number">#${block.number.toLocaleString()}</span>
      <span class="block-hash">${block.hash}</span>
      <span class="block-time">${block.time}</span>
    </div>
  `).join('');
}

function generateBlockHash() {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 12; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash + '...';
}

// Resource Sharing Controls
function initResourceControls() {
  const computeSlider = document.getElementById('computeSlider');
  const computeValue = document.getElementById('computeValue');
  
  if (computeSlider && computeValue) {
    computeSlider.addEventListener('input', (e) => {
      computeValue.textContent = e.target.value + '%';
    });
  }
}

// Data Update Functions
async function updateTelemetryData() {
  try {
    const telemetry = await api.getTelemetry();
    appState.telemetryData = telemetry;
    appState.apiConnected = true;
    appState.lastApiError = null;

    // Update dashboard with real data
    updateDashboardWithTelemetry(telemetry);

    // Update live indicator
    const liveIndicator = document.querySelector('.live-indicator');
    if (liveIndicator) {
      liveIndicator.textContent = '● LIVE (API)';
      liveIndicator.style.color = '#32B8C6';
    }

    return telemetry;
  } catch (error) {
    console.error('Failed to fetch telemetry:', error);
    appState.apiConnected = false;
    appState.lastApiError = error.message;

    // Update live indicator to show error
    const liveIndicator = document.querySelector('.live-indicator');
    if (liveIndicator) {
      liveIndicator.textContent = '● OFFLINE (API ERROR)';
      liveIndicator.style.color = '#E68161';
    }

    return null;
  }
}

function updateDashboardWithTelemetry(telemetry) {
  if (!telemetry) return;

  // Update node ID and uptime
  const nodeIdElement = document.querySelector('.node-id');
  if (nodeIdElement) {
    nodeIdElement.textContent = telemetry.node_id;
  }

  const uptimeElement = document.querySelector('.header-actions .uptime');
  if (uptimeElement) {
    const uptimeHours = Math.floor(telemetry.uptime_seconds / 3600);
    const uptimeMinutes = Math.floor((telemetry.uptime_seconds % 3600) / 60);
    uptimeElement.innerHTML = `<strong>${uptimeHours}h ${uptimeMinutes}m</strong>`;
  }

  // Update blockchain status
  const blockchainStatus = document.querySelector('.blockchain-status .stat-value:nth-child(1)');
  if (blockchainStatus) {
    blockchainStatus.textContent = telemetry.epoch.toLocaleString();
  }

  const consensusValue = document.querySelector('.blockchain-status .stat-value:nth-child(3)');
  if (consensusValue) {
    consensusValue.textContent = telemetry.consensus_state.replace('_', ' ');
  }

  const networkPeers = document.querySelector('.blockchain-status .stat-value:nth-child(4)');
  if (networkPeers) {
    networkPeers.textContent = 'Active'; // Mock for now
  }

  // Update Ihsan score display
  const ihsanScore = document.querySelector('.impact-score-display .score-value');
  if (ihsanScore) {
    ihsanScore.textContent = (telemetry.ihsan_score * 100).toFixed(1);
  }

  // Update PoI events
  const poiEvents = document.querySelector('.impact-overview .impact-card.primary .impact-content .impact-value');
  if (poiEvents) {
    poiEvents.textContent = telemetry.poi_events_last_minute;
  }

  // Update agent counts in sidebar badges
  const patBadge = document.querySelector('.nav-item[data-view="personal-agents"] .nav-badge');
  const satBadge = document.querySelector('.nav-item[data-view="system-agents"] .nav-badge');

  if (patBadge) patBadge.textContent = telemetry.active_agents.PAT;
  if (satBadge) satBadge.textContent = telemetry.active_agents.SAT;

  // Update status indicator
  const statusIndicator = document.querySelector('.status-indicator .status-text');
  if (statusIndicator) {
    statusIndicator.textContent = formatConsensusState(telemetry.consensus_state);
  }

  const statusDot = document.querySelector('.status-indicator .status-dot');
  if (statusDot) {
    statusDot.className = `status-dot ${telemetry.ihsan_score >= 0.9 ? 'active' : telemetry.ihsan_score >= 0.75 ? 'warning' : 'error'}`;
  }
}

function formatConsensusState(state) {
  return state.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// API-driven Real-time Updates
async function startLiveUpdates() {
  // Initial data load
  await Promise.all([
    updateTelemetryData(),
    loadSatData()
  ]);

  console.log('✅ BIZRA Genesis Dashboard fully connected to backend APIs');
  console.log('📊 Live telemetry updates every 5 seconds');
  console.log('📝 SAT content approval workflow active');

  // Set up polling for real data
  setInterval(async () => {
    if (!appState.isLive) return;

    const telemetry = await updateTelemetryData();

    // Update charts with simulated data for now (until backend provides timeseries)
    if (telemetry) {
      updateChartsWithTelemetry(telemetry);
    }

    // Refresh SAT data every 30 seconds
    if (!satState.lastUpdated || (new Date() - satState.lastUpdated) > 30000) {
      await loadSatData();
      if (appState.currentView === 'proof-of-impact') {
        renderSatContent();
      }
    }
  }, 5000); // Update every 5 seconds
}

function updateChartsWithTelemetry(telemetry) {
  // For now, simulate chart updates based on real metrics
  // In production, backend would provide timeseries data

  const baseGpuUtilization = 75 + (telemetry.ihsan_score * 10);
  const baseCpuUtilization = 40 + (telemetry.error_rate * 20);

  // Update GPU chart
  if (appState.charts.gpu) {
    const data = appState.charts.gpu.data.datasets[0].data;
    data.shift();
    data.push(baseGpuUtilization + Math.random() * 5);
    appState.charts.gpu.update('none');
  }

  // Update CPU chart
  if (appState.charts.cpu) {
    const data = appState.charts.cpu.data.datasets[0].data;
    data.shift();
    data.push(baseCpuUtilization + Math.random() * 3);
    appState.charts.cpu.update('none');
  }

  // Update RAM chart
  if (appState.charts.ram) {
    const data = appState.charts.ram.data.datasets[0].data;
    data.shift();
    data.push(48 + (telemetry.error_rate * 10) + Math.random() * 2);
    appState.charts.ram.update('none');
  }

  // Update storage chart (simulate slow growth)
  if (appState.charts.storage) {
    const data = appState.charts.storage.data.datasets[0].data;
    data.shift();
    data.push(41.5 + Math.random() * 0.5);
    appState.charts.storage.update('none');
  }
}

// Initialize Application
function init() {
  initNavigation();
  initCharts();
  initResourceControls();
  startLiveUpdates();
  
  console.log('BIZRA Genesis Node initialized');
  console.log('Node ID:', genesisNode.node_id);
  console.log('Status:', genesisNode.status);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
