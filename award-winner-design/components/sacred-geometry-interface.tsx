"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"

const AGENT_COUNT = 72

interface AgentNode {
  id: number
  type: string
  active: boolean
}

const AGENT_TYPES = [
  "Consciousness Explorer",
  "Sacred Geometer",
  "Quantum Navigator",
  "Wisdom Integrator",
  "Spiritual Analyst",
  "Tech Mystic",
  "Blockchain Sage",
  "Neural Mystic",
  "Digital Shaman",
  "Cosmic Researcher",
  "Meditation Guide",
  "Energy Harmonizer",
]

const SYSTEM_STATS = [
  { label: "Neural Activity", value: "97.8%" },
  { label: "Quantum Field", value: "Stable" },
  { label: "Data Flow", value: "12.4 TB/s" },
  { label: "Convergence", value: "Optimal" },
]

const SACRED_METRICS = [
  "Spiritual Resonance: 432Hz",
  "Dimensional Alignment: 97%",
  "Wisdom Integration: High",
  "Tech-Spirit Balance: Optimal",
  "User Enlightenment: +47%",
  "Global Impact: Expanding",
]

export function SacredGeometryInterface() {
  const [agents, setAgents] = useState<AgentNode[]>([])
  const [consciousnessLevel, setConsciousnessLevel] = useState(85)

  // Initialize agents
  useEffect(() => {
    const initialAgents: AgentNode[] = Array.from({ length: AGENT_COUNT }, (_, i) => ({
      id: i + 1,
      type: AGENT_TYPES[i % AGENT_TYPES.length],
      active: Math.random() > 0.3,
    }))
    setAgents(initialAgents)
  }, [])

  // Animate agents
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) => prev.map((agent) => (Math.random() > 0.95 ? { ...agent, active: !agent.active } : agent)))
      setConsciousnessLevel((prev) => {
        const delta = (Math.random() - 0.5) * 10
        return Math.min(100, Math.max(70, prev + delta))
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const activeCount = useMemo(() => agents.filter((a) => a.active).length, [agents])

  const handleAgentClick = useCallback((agent: AgentNode) => {
    alert(
      `Agent ${agent.id} - ${agent.type}\nStatus: ${agent.active ? "Active" : "Processing"}\nConsciousness Level: ${(85 + Math.random() * 15).toFixed(1)}%`,
    )
  }, [])

  return (
    <div className="w-full min-h-screen bg-[#0A1828] text-white relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-5 bg-[#0A1828]/80 backdrop-blur-md border-b border-[#D4AF37]/20 z-20 relative">
        <div className="text-2xl font-light tracking-[0.2em] text-[#D4AF37]">BIZRA</div>
        <div className="flex gap-8">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span>{activeCount} Agents Active</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span>Quantum Coherence: {consciousnessLevel.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span>Blockchain Synced</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[300px_1fr_300px] h-[calc(100vh-180px)]">
        {/* Left Sidebar - Agent Grid */}
        <aside className="bg-[#0A1828]/60 backdrop-blur-md border-r border-[#D4AF37]/20 p-6 overflow-y-auto">
          <h3 className="text-lg font-medium text-[#D4AF37] mb-6 text-center">Neural Agents</h3>
          <div className="grid grid-cols-6 gap-2 mb-8">
            {agents.map((agent) => (
              <motion.button
                key={agent.id}
                onClick={() => handleAgentClick(agent)}
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] transition-all cursor-pointer ${
                  agent.active
                    ? "bg-[#D4AF37] text-[#0A1828] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.6)]"
                    : "bg-[#D4AF37]/20 text-white/70 border-[#D4AF37]/40"
                }`}
                whileHover={{ scale: 1.1 }}
                title={`Agent ${agent.id} - ${agent.type}`}
              >
                {agent.id}
              </motion.button>
            ))}
          </div>

          <h3 className="text-lg font-medium text-[#D4AF37] mb-4 text-center mt-8">Active Processes</h3>
          <ul className="text-xs text-white/60 leading-relaxed space-y-1">
            <li>• Consciousness Expansion</li>
            <li>• Sacred Geometry Analysis</li>
            <li>• Quantum Entanglement</li>
            <li>• Blockchain Integration</li>
            <li>• Neural Pathway Mapping</li>
            <li>• Spiritual Data Processing</li>
          </ul>
        </aside>

        {/* Main Content - Sacred Geometry */}
        <main className="flex items-center justify-center relative">
          <div className="relative w-[600px] h-[600px] flex items-center justify-center">
            {/* Flower of Life SVG */}
            <motion.div
              className="absolute w-[500px] h-[500px]"
              animate={{ rotate: 360 }}
              transition={{ duration: 120, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <svg viewBox="0 0 500 500" className="w-full h-full drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                <circle cx="250" cy="250" r="100" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.6" />
                <circle cx="250" cy="150" r="100" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.6" />
                <circle cx="250" cy="350" r="100" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.6" />
                <circle cx="150" cy="250" r="100" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.6" />
                <circle cx="350" cy="250" r="100" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.6" />
                <circle cx="183" cy="183" r="100" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.6" />
                <circle cx="317" cy="183" r="100" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.6" />
                <circle cx="183" cy="317" r="100" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.6" />
                <circle cx="317" cy="317" r="100" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.6" />
                <circle cx="250" cy="250" r="50" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.4" />
              </svg>
            </motion.div>

            {/* Central Core */}
            <motion.div
              className="absolute w-[120px] h-[120px] rounded-full bg-gradient-to-br from-[#D4AF37] to-[#D4AF37]/30 shadow-[0_0_40px_rgba(212,175,55,0.4)] flex items-center justify-center text-2xl font-light text-[#0A1828]"
              animate={{
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 0 40px rgba(212,175,55,0.4)",
                  "0 0 60px rgba(212,175,55,0.6)",
                  "0 0 40px rgba(212,175,55,0.4)",
                ],
              }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              {activeCount}
            </motion.div>
          </div>
        </main>

        {/* Right Sidebar - System Status */}
        <aside className="bg-[#0A1828]/60 backdrop-blur-md border-l border-[#D4AF37]/20 p-6 overflow-y-auto">
          <h3 className="text-lg font-medium text-[#D4AF37] mb-6 text-center">System Status</h3>

          <div className="space-y-4 mb-8">
            {SYSTEM_STATS.map((stat) => (
              <div key={stat.label} className="flex justify-between items-center py-3 border-b border-[#D4AF37]/10">
                <span className="text-sm text-white/70">{stat.label}</span>
                <span className="text-base font-medium text-[#D4AF37]">{stat.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="text-sm text-white/70 mb-3">Collective Consciousness</div>
            <div className="w-full h-2 bg-white/10 rounded overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] rounded shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                animate={{ width: [`${consciousnessLevel - 10}%`, `${consciousnessLevel}%`] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse", ease: "easeInOut" }}
              />
            </div>
          </div>

          <h3 className="text-lg font-medium text-[#D4AF37] mb-4 text-center mt-8">Sacred Metrics</h3>
          <ul className="text-xs text-white/60 leading-relaxed space-y-1">
            {SACRED_METRICS.map((metric) => (
              <li key={metric}>• {metric}</li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-10 py-5 bg-[#0A1828]/80 backdrop-blur-md border-t border-[#D4AF37]/20 z-20 relative">
        <div className="flex gap-10">
          <span className="text-sm text-white/60">
            <strong className="text-[#D4AF37] font-medium">{activeCount}</strong> Neural Agents
          </span>
          <span className="text-sm text-white/60">
            <strong className="text-[#D4AF37] font-medium">Quantum</strong> Coherence
          </span>
          <span className="text-sm text-white/60">
            <strong className="text-[#D4AF37] font-medium">Sacred</strong> Geometry
          </span>
          <span className="text-sm text-white/60">
            <strong className="text-[#D4AF37] font-medium">Blockchain</strong> Integration
          </span>
        </div>
        <div className="text-sm text-white/60">Where Spirituality Meets Technology</div>
      </footer>
    </div>
  )
}
