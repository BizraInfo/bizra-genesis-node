// Application State
const appState = {
  currentView: 'dashboard',
  isLive: true,
  charts: {}
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
    }
  }
}

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
function renderPersonalAgents() {
  const container = document.getElementById('personalAgentsGrid');
  if (!container || container.children.length > 0) return;
  
  container.innerHTML = personalAgents.map(agent => `
    <div class="agent-card">
      <div class="agent-header">
        <div>
          <div class="agent-name">${agent.name}</div>
          <div class="agent-status">${agent.status}</div>
        </div>
      </div>
      <div class="agent-task">${agent.current_task}</div>
      <div class="agent-metrics">
        <div class="agent-metric">
          <div class="agent-metric-label">Performance</div>
          <div class="agent-metric-value">${agent.performance}%</div>
        </div>
        <div class="agent-metric">
          <div class="agent-metric-label">Uptime</div>
          <div class="agent-metric-value">${agent.uptime}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// Render System Agents
function renderSystemAgents() {
  const container = document.getElementById('systemAgentsGrid');
  if (!container || container.children.length > 0) return;
  
  container.innerHTML = systemAgents.map(agent => `
    <div class="agent-card">
      <div class="agent-header">
        <div>
          <div class="agent-name">${agent.name}</div>
          <div class="agent-status">${agent.status}</div>
        </div>
      </div>
      <div class="agent-task">${agent.current_task}</div>
      <div class="agent-metrics">
        <div class="agent-metric">
          <div class="agent-metric-label">Performance</div>
          <div class="agent-metric-value">${agent.performance}%</div>
        </div>
        <div class="agent-metric">
          <div class="agent-metric-label">Status</div>
          <div class="agent-metric-value">Online</div>
        </div>
      </div>
    </div>
  `).join('');
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

// Real-time Updates Simulation
function startLiveUpdates() {
  setInterval(() => {
    if (!appState.isLive) return;
    
    // Update charts with new data
    if (appState.charts.gpu) {
      const data = appState.charts.gpu.data.datasets[0].data;
      data.shift();
      data.push(75 + Math.random() * 8);
      appState.charts.gpu.update('none');
    }
    
    if (appState.charts.cpu) {
      const data = appState.charts.cpu.data.datasets[0].data;
      data.shift();
      data.push(42 + Math.random() * 6);
      appState.charts.cpu.update('none');
    }
    
    if (appState.charts.ram) {
      const data = appState.charts.ram.data.datasets[0].data;
      data.shift();
      data.push(50 + Math.random() * 4);
      appState.charts.ram.update('none');
    }
  }, 2000);
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