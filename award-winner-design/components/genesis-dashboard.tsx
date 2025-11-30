"use client"

import { useState, useEffect } from "react"

interface MetricData {
  label: string
  value: string
  detail: string
  icon: string
  chartData: number[]
}

const METRICS: MetricData[] = [
  {
    label: "GPU",
    value: "78%",
    detail: "RTX 4090 • 24GB VRAM • 65°C",
    icon: "🎮",
    chartData: [65, 70, 78, 75, 80, 78],
  },
  {
    label: "CPU",
    value: "45%",
    detail: "Intel i9-14900 • 32 Cores • 58°C",
    icon: "⚡",
    chartData: [40, 45, 42, 48, 45, 43],
  },
  { label: "RAM", value: "52%", detail: "67GB / 128GB Used", icon: "💾", chartData: [50, 52, 55, 51, 52, 54] },
  { label: "Storage", value: "42%", detail: "847GB / 2TB • NVMe SSD", icon: "💿", chartData: [40, 41, 42, 42, 42, 42] },
]

const PERSONAL_AGENTS = [
  { name: "Scribe", role: "Content Creator", status: "Active", tasks: 12 },
  { name: "Analyst", role: "Data Processor", status: "Active", tasks: 8 },
  { name: "Researcher", role: "Information Gatherer", status: "Active", tasks: 15 },
  { name: "Scheduler", role: "Task Orchestrator", status: "Active", tasks: 6 },
  { name: "Guardian", role: "Security Monitor", status: "Active", tasks: 3 },
  { name: "Advisor", role: "Decision Support", status: "Active", tasks: 9 },
  { name: "Curator", role: "Knowledge Manager", status: "Active", tasks: 7 },
]

const SYSTEM_AGENTS = [
  { name: "Consensus", role: "Blockchain Validator", status: "Synced", blocks: 1847392 },
  { name: "Network", role: "Peer Manager", status: "23 Peers", latency: "12ms" },
  { name: "Storage", role: "Data Integrity", status: "Healthy", used: "847GB" },
  { name: "Security", role: "Threat Monitor", status: "Secure", threats: 0 },
  { name: "Analytics", role: "Metrics Collector", status: "Active", events: 12847 },
  { name: "Optimizer", role: "Resource Manager", status: "Optimizing", efficiency: "94%" },
]

export function GenesisDashboard() {
  const [activeView, setActiveView] = useState("dashboard")
  const [blockHeight, setBlockHeight] = useState(1847392)

  // Simulate block height increase
  useEffect(() => {
    const interval = setInterval(() => {
      setBlockHeight((prev) => prev + 1)
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full min-h-screen bg-[#1F2121] text-[#F5F5F5] flex">
      {/* Sidebar Navigation */}
      <nav className="w-[280px] bg-[#262828] border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="text-3xl text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">⬢</div>
            <div>
              <div className="text-xl font-semibold text-[#FFD700]">BIZRA</div>
              <div className="text-xs text-white/50">Genesis Node</div>
            </div>
          </div>
          <div className="mt-4 text-xs font-mono text-white/40">BIZRA-GENESIS-001</div>
        </div>

        <div className="flex-1 p-4 space-y-1">
          {[
            { id: "dashboard", icon: "◈", label: "Dashboard" },
            { id: "personal-agents", icon: "👤", label: "Personal Agents", badge: "7" },
            { id: "system-agents", icon: "⚙", label: "System Agents", badge: "6" },
            { id: "proof-of-impact", icon: "⚡", label: "Proof-of-Impact" },
            { id: "blockchain", icon: "⛓", label: "Blockchain" },
            { id: "ai-system", icon: "🧠", label: "AI System" },
            { id: "resource-sharing", icon: "🔄", label: "Resource Sharing" },
            { id: "settings", icon: "⚙️", label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === item.id
                  ? "bg-[#32B8C6]/20 text-[#32B8C6] border border-[#32B8C6]/30"
                  : "text-white/70 hover:bg-white/5"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge && (
                <span className="bg-[#32B8C6]/20 text-[#32B8C6] text-xs px-2 py-0.5 rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-[#32B8C6] animate-pulse" />
            <span className="text-white/70">Node Active</span>
          </div>
          <div className="text-xs text-white/40 mt-2">v2.2.0-rc1</div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeView === "dashboard" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Genesis Node Dashboard</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-white/60">
                  Uptime: <strong className="text-white">99.97%</strong>
                </span>
                <span className="flex items-center gap-2 text-[#32B8C6] text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#32B8C6] animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-6">
              {METRICS.map((metric) => (
                <div key={metric.label} className="bg-[#262828] border border-white/10 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{metric.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm text-white/60">{metric.label}</div>
                      <div className="text-2xl font-semibold text-[#32B8C6]">{metric.value}</div>
                      <div className="text-xs text-white/40 mt-1">{metric.detail}</div>
                    </div>
                  </div>
                  {/* Mini Chart */}
                  <div className="flex items-end gap-1 h-10 mt-4">
                    {metric.chartData.map((val, i) => (
                      <div key={i} className="flex-1 bg-[#32B8C6]/30 rounded-t" style={{ height: `${val}%` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-3 gap-6">
              {/* Blockchain Status */}
              <div className="bg-[#262828] border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Blockchain Status</h3>
                  <span className="bg-[#32B8C6]/20 text-[#32B8C6] text-xs px-3 py-1 rounded-full">Active</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Current Block</span>
                    <span className="font-mono">{blockHeight.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Transactions/Sec</span>
                    <span>127,439 TPS</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Consensus</span>
                    <span>Proof-of-Impact</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Network Peers</span>
                    <span>23 Connected</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Finality Time</span>
                    <span>0.8s</span>
                  </div>
                </div>
              </div>

              {/* AgentFlow Status */}
              <div className="bg-[#262828] border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">AgentFlow 7B Status</h3>
                  <span className="bg-[#32B8C6]/20 text-[#32B8C6] text-xs px-3 py-1 rounded-full">Optimized</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Model</span>
                    <span>Qwen2.5-7B-Instruct</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Inference Speed</span>
                    <span>1,247 tokens/sec</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Search Tasks</span>
                    <span className="text-green-400">+14.9%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Agentic Reasoning</span>
                    <span className="text-green-400">+14.0%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Math Reasoning</span>
                    <span className="text-green-400">+14.5%</span>
                  </div>
                </div>
              </div>

              {/* Impact Score */}
              <div className="bg-[#262828] border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Proof-of-Impact Score</h3>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-[#32B8C6]">8,947</div>
                  <div className="text-sm text-white/60">Total Impact</div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌱</span>
                    <div className="flex-1">
                      <div className="font-medium">2,847.32 SEED</div>
                      <div className="text-xs text-white/40">+127.45/day</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌸</span>
                    <div className="flex-1">
                      <div className="font-medium">456.78 BLOOM</div>
                      <div className="text-xs text-white/40">0.12% Governance</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "personal-agents" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Personal Agentic Team</h1>
              <span className="text-sm text-white/60">7 Active Agents</span>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {PERSONAL_AGENTS.map((agent) => (
                <div
                  key={agent.name}
                  className="bg-[#262828] border border-white/10 rounded-xl p-6 hover:border-[#32B8C6]/50 transition-all"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#32B8C6]/20 flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div>
                      <div className="font-semibold">{agent.name}</div>
                      <div className="text-sm text-white/60">{agent.role}</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Status</span>
                    <span className="text-green-400">{agent.status}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-white/60">Active Tasks</span>
                    <span>{agent.tasks}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === "system-agents" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">System Agentic Team</h1>
              <span className="text-sm text-white/60">6 Active Agents</span>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {SYSTEM_AGENTS.map((agent) => (
                <div
                  key={agent.name}
                  className="bg-[#262828] border border-white/10 rounded-xl p-6 hover:border-[#32B8C6]/50 transition-all"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#32B8C6]/20 flex items-center justify-center text-xl">
                      ⚙
                    </div>
                    <div>
                      <div className="font-semibold">{agent.name}</div>
                      <div className="text-sm text-white/60">{agent.role}</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Status</span>
                    <span className="text-green-400">{agent.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
