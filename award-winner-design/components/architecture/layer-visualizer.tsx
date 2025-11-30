"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Cpu, Shield, Database, Network, Lock, Activity, Server } from "lucide-react"
import { cn } from "@/lib/utils"

const ARCHITECTURE_LAYERS = [
  {
    id: "L0",
    name: "TMP v0.1 RSIC",
    icon: Shield,
    desc: "Consciousness Safety Core",
    details: {
      components: ["Islamic Mathematics", "Mathematical Bounds"],
      hotspots: ["Consciousness Equations", "RSI Prevention"],
      debug: "Solve Consciousness Equations",
    },
    color: "text-sacred-purple",
  },
  {
    id: "L1",
    name: "Rust Orchestrator",
    icon: Cpu,
    desc: "Core System Logic",
    details: {
      components: ["Tokio Async Runtime", "Aegis Consensus"],
      hotspots: ["Consensus Race", "Deadlock Prevention"],
      debug: "cargo test consensus",
    },
    color: "text-primary-gold",
  },
  {
    id: "L2",
    name: "Consensus Engine",
    icon: Network,
    desc: "Thompson Sampling Router",
    details: {
      components: ["WSC Consensus", "Pareto 5% Logic"],
      hotspots: ["Beta Distribution", "Routing Latency"],
      debug: "cargo bench thompson",
    },
    color: "text-accent-teal",
  },
  {
    id: "L3",
    name: "Quality Gate",
    icon: Award,
    desc: "Ihsan 4D Evaluation",
    details: {
      components: ["Spiritual Math", "Ethical Bounds"],
      hotspots: ["Rating Calibration", "Multi-dim Scoring"],
      debug: "test_ihsan --metrics",
    },
    color: "text-blue-400",
  },
  {
    id: "L4",
    name: "Trust Bridge",
    icon: Lock,
    desc: "Cryptographic Verification",
    details: {
      components: ["Ed25519 Signatures", "BLAKE3 Receipts"],
      hotspots: ["Signature Verify", "Receipt Corruption"],
      debug: "cargo test trust_bridge",
    },
    color: "text-green-400",
  },
  {
    id: "L5",
    name: "AI/MOE Layer",
    icon: Brain,
    desc: "Model Orchestration",
    details: {
      components: ["BizRA-MOE", "Hybrid Strategies"],
      hotspots: ["Provider API", "Rate Limiting"],
      debug: "cargo run --bin node0",
    },
    color: "text-purple-400",
  },
  {
    id: "L6",
    name: "Agent Swarm",
    icon: Users,
    desc: "Personal & System Teams",
    details: {
      components: ["Consensus → PAT", "SAT → Components"],
      hotspots: ["Coordination Deadlock", "Handoff Latency"],
      debug: "cargo run --bin pat_planner",
    },
    color: "text-orange-400",
  },
  {
    id: "L7",
    name: "Archive Node",
    icon: Database,
    desc: "Temporal Archaeology",
    details: {
      components: ["Compression Algos", "SAPE Validator"],
      hotspots: ["Data Corruption", "Epistemology Math"],
      debug: "cargo run --bin ta_analyze",
    },
    color: "text-gray-400",
  },
]

import { Award, Brain, Users } from "lucide-react"

export function LayerVisualizer() {
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null)

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-serif text-soft-white mb-4">
          Architectural <span className="text-primary-gold">Hierarchy</span>
        </h2>
        <p className="text-gray-400">Interactive System Map • BIZRA Genesis Node</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Layer Stack */}
        <div className="space-y-2">
          {ARCHITECTURE_LAYERS.map((layer) => (
            <motion.div
              key={layer.id}
              layoutId={layer.id}
              onClick={() => setSelectedLayer(layer.id)}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all duration-300 relative overflow-hidden group",
                selectedLayer === layer.id
                  ? "bg-white/10 border-primary-gold shadow-[0_0_20px_rgba(201,169,98,0.2)]"
                  : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20",
              )}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded-md bg-black/20", layer.color)}>
                    <layer.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-0.5">{layer.id}</div>
                    <div className="font-bold text-soft-white">{layer.name}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 hidden sm:block">{layer.desc}</div>
              </div>
              {selectedLayer === layer.id && (
                <motion.div
                  layoutId="highlight"
                  className="absolute inset-0 bg-gradient-to-r from-primary-gold/5 to-transparent"
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Detail View */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {selectedLayer ? (
              <motion.div
                key={selectedLayer}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-panel p-8 rounded-2xl h-full border-t-4 border-t-primary-gold"
              >
                {(() => {
                  const layer = ARCHITECTURE_LAYERS.find((l) => l.id === selectedLayer)!
                  return (
                    <div className="space-y-8">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <layer.icon className={cn("w-8 h-8", layer.color)} />
                          <h3 className="text-2xl font-serif text-soft-white">{layer.name}</h3>
                        </div>
                        <p className="text-gray-400">{layer.desc}</p>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Core Components</h4>
                          <div className="flex flex-wrap gap-2">
                            {layer.details.components.map((comp, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300"
                              >
                                {comp}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs uppercase tracking-widest text-red-400/70 mb-3">Error Hotspots</h4>
                          <div className="space-y-2">
                            {layer.details.hotspots.map((spot, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                                <Activity className="w-4 h-4 text-red-400/50" />
                                {spot}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                          <div className="flex items-center gap-2 text-xs font-mono text-gray-500 bg-black/30 p-3 rounded-lg">
                            <Terminal className="w-4 h-4" />
                            <span className="text-green-400">$</span>
                            {layer.details.debug}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 glass-panel rounded-2xl border-dashed border-2 border-white/5">
                <div className="text-center">
                  <Server className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Select a layer to inspect architecture</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

import { Terminal } from "lucide-react"
