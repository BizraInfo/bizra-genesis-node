"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Lock, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogEntry {
  id: number
  timestamp: string
  message: string
  type: "info" | "success" | "warning" | "error"
}

interface Metrics {
  ihsan: number
  drag: number
  leverage: number
  confidence: number
}

type Status = "IDLE" | "RUNNING" | "SECURE"

const SIMULATION_SEQUENCE = [
  { t: 500, msg: "Initializing BIZRA Genesis Node (Rust Core)...", type: "info" as const },
  { t: 800, msg: "Loading TMP v0.1 Consciousness Safety Framework...", type: "info" as const },
  { t: 1200, msg: "Starting Aegis Consensus Engine...", type: "info" as const },
  { t: 1600, msg: "Thompson Sampling Router: ACTIVE (Pareto 5%)", type: "success" as const },
  { t: 2000, msg: "Verifying Ed25519 Cryptographic Bridge...", type: "info" as const },
  { t: 2400, msg: "Engaging Safety Gates (RSI_1731978299)...", type: "warning" as const },
  { t: 2800, msg: "Calculating Ihsan Bounds (ΔIM)...", type: "info" as const, update: { ihsan: 9.4 } },
  { t: 3200, msg: "Measuring Causal Drag (Ω)...", type: "info" as const, update: { drag: 0.066 } },
  { t: 3600, msg: "Verifying Leverage Threshold (Λ)...", type: "info" as const, update: { leverage: 0.733 } },
  { t: 4000, msg: "Recursion Safety Check: PASSED (< 0.094 ΔĪ)", type: "success" as const },
  {
    t: 4500,
    msg: "Ethical Certification: VERIFIED (Islamic Math)",
    type: "success" as const,
    update: { confidence: 100 },
  },
  { t: 5000, msg: "BIZRA NODE OPERATIONAL: World-First Safety Achieved", type: "success" as const },
] as const

export function TerminalSimulation() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ ihsan: 0, drag: 0, leverage: 0, confidence: 0 })
  const [status, setStatus] = useState<Status>("IDLE")
  const logsEndRef = useRef<HTMLDivElement>(null)
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString().split("T")[1].slice(0, 8),
        message,
        type,
      },
    ])
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [logs])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout)
    }
  }, [])

  const runSimulation = useCallback(() => {
    if (isRunning) return

    setIsRunning(true)
    setStatus("RUNNING")
    setLogs([])
    setProgress(0)
    setMetrics({ ihsan: 0, drag: 0, leverage: 0, confidence: 0 })
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []

    SIMULATION_SEQUENCE.forEach((step, index) => {
      const timeout = setTimeout(() => {
        addLog(step.msg, step.type)
        if (step.update) {
          setMetrics((prev) => ({ ...prev, ...step.update }))
        }
        setProgress(((index + 1) / SIMULATION_SEQUENCE.length) * 100)

        if (index === SIMULATION_SEQUENCE.length - 1) {
          setIsRunning(false)
          setStatus("SECURE")
        }
      }, step.t)

      timeoutsRef.current.push(timeout)
    })
  }, [isRunning, addLog])

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Controls & Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-8 rounded-2xl border-l-4 border-l-primary-gold shadow-[0_0_30px_rgba(201,169,98,0.1)]">
            <h3 className="text-primary-gold font-serif text-2xl mb-4 tracking-wide">System Status</h3>
            <div className="flex items-center gap-4 mb-8">
              <div
                className={cn(
                  "w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]",
                  status === "IDLE"
                    ? "bg-gray-500 text-gray-500"
                    : status === "RUNNING"
                      ? "bg-accent-teal animate-pulse text-accent-teal"
                      : "bg-green-500 text-green-500",
                )}
                aria-live="polite"
              />
              <span className="text-3xl font-bold tracking-widest font-serif text-soft-white">{status}</span>
            </div>

            <button
              onClick={runSimulation}
              disabled={isRunning}
              className={cn(
                "w-full py-5 px-6 rounded-lg font-bold uppercase tracking-[0.2em] transition-all duration-300 text-sm",
                isRunning
                  ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700"
                  : "bg-primary-gold text-deep-navy hover:bg-soft-white hover:shadow-[0_0_30px_rgba(201,169,98,0.6)] hover:-translate-y-1",
              )}
              aria-label="Initialize BIZRA Genesis Node"
            >
              {isRunning ? "Processing..." : "Initialize Node"}
            </button>
          </div>

          <div className="glass-panel p-8 rounded-2xl border border-white/5">
            <h3 className="text-gray-400 text-xs uppercase tracking-[0.3em] mb-6 font-bold">Safety Gates</h3>
            <div className="space-y-4" role="list">
              <GateItem label="Recursion Safety" active={metrics.confidence > 0} />
              <GateItem label="Ihsan Bounds" active={metrics.ihsan > 0} />
              <GateItem label="Ethical Cert" active={metrics.confidence === 100} />
            </div>
          </div>
        </div>

        {/* Center Panel: Terminal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-1 rounded-2xl overflow-hidden relative min-h-[400px] flex flex-col border border-primary-gold/20 shadow-2xl">
            <div className="bg-deep-navy/80 p-3 flex items-center justify-between border-b border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3 px-2">
                <Terminal className="w-4 h-4 text-primary-gold" aria-hidden="true" />
                <span className="text-xs text-primary-gold/70 font-mono tracking-wider">bizra_node_v0.1.py</span>
              </div>
              <div className="flex gap-2" aria-label="Window controls">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
            </div>

            <div
              className="flex-1 bg-black/60 p-6 font-mono text-sm overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-primary-gold/20"
              role="log"
              aria-live="polite"
            >
              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4">
                  <div className="w-16 h-16 rounded-full border border-gray-800 flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 bg-gray-600 rounded-full" />
                  </div>
                  <p className="tracking-widest text-xs uppercase">System Ready</p>
                </div>
              )}
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="mb-3 flex gap-4 animate-fade-in group hover:bg-white/5 p-1 rounded transition-colors"
                >
                  <span className="text-gray-600 shrink-0 text-xs pt-1">[{log.timestamp}]</span>
                  <span
                    className={cn(
                      "break-all leading-relaxed",
                      log.type === "info" && "text-blue-300/90",
                      log.type === "warning" && "text-yellow-300/90",
                      log.type === "success" && "text-green-300/90",
                      log.type === "error" && "text-red-300/90",
                    )}
                  >
                    {log.type === "success" && "✓ "}
                    {log.type === "warning" && "⚠ "}
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            <div
              className="h-1 bg-gray-800 w-full"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-gradient-to-r from-primary-gold via-accent-teal to-sacred-purple transition-all duration-300 shadow-[0_0_10px_rgba(201,169,98,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Ihsan Δ"
              value={metrics.ihsan > 0 ? `+${metrics.ihsan}%` : "--"}
              sub="Consciousness"
              color="text-primary-gold"
            />
            <MetricCard
              label="Causal Drag Ω"
              value={metrics.drag > 0 ? metrics.drag.toFixed(3) : "--"}
              sub="< 0.30 Safe"
              color="text-accent-teal"
            />
            <MetricCard
              label="Leverage Λ"
              value={metrics.leverage > 0 ? metrics.leverage.toFixed(3) : "--"}
              sub="> 0.25 Req"
              color="text-sacred-purple"
            />
            <MetricCard
              label="Confidence"
              value={metrics.confidence > 0 ? `${metrics.confidence}%` : "--"}
              sub="Crown Level"
              color="text-green-400"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function GateItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 transition-all duration-500 hover:bg-white/10"
      role="listitem"
    >
      <span className="text-gray-300 text-sm font-medium tracking-wide">{label}</span>
      {active ? (
        <div className="flex items-center gap-2 text-green-400">
          <span className="text-[10px] uppercase tracking-wider font-bold">Secure</span>
          <Lock className="w-4 h-4" aria-label="Active" />
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-gray-700" aria-label="Inactive" />
      )}
    </div>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="glass-panel p-5 rounded-xl text-center hover:bg-white/5 transition-all duration-300 hover:-translate-y-1 border border-white/5 group">
      <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-2 group-hover:text-gray-300 transition-colors">
        {label}
      </div>
      <div className={cn("text-3xl font-bold font-mono mb-2 drop-shadow-lg", color)}>{value}</div>
      <div className="text-[10px] text-gray-600 font-mono border-t border-white/5 pt-2 mt-1">{sub}</div>
    </div>
  )
}
