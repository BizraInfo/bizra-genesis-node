// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SLO FLIGHT STRIP                                    ║
// ║  β-11 Flight Rules & SLO Autopilot                                        ║
// ║  Visual indicator for Service Level Objectives status                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { motion } from 'framer-motion'
import { useTelemetry } from '../../hooks/useTelemetryStream'

// ═══════════════════════════════════════════════════════════════════════════
// SLO TYPES - Mirrors Rust schema
// ═══════════════════════════════════════════════════════════════════════════

export type SloState = 'HEALTHY' | 'WARNING' | 'CRITICAL'

export interface SloCheck {
  name: string
  description: string
  target: number
  actual: number
  state: SloState
  unit?: string
}

export interface SloStatus {
  overall: SloState
  timestamp: string
  checks: SloCheck[]
}

// ═══════════════════════════════════════════════════════════════════════════
// SLO EVALUATOR - Client-side evaluation (mirrors Rust logic)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate SLOs from telemetry data
 * This mirrors the Rust evaluate_slo function for client-side computation
 */
export function evaluateSloFromTelemetry(telemetry: {
  ihsan_score: number
  latency_us: number
  error_rate: number
  consensus_state: string
  active_agents: { PAT: number; SAT: number; TAT: number }
}): SloStatus {
  const checks: SloCheck[] = []

  // SLO 1: IHSAN
  const ihsanActual = telemetry.ihsan_score
  const ihsanTarget = 0.90
  const ihsanState: SloState = ihsanActual >= ihsanTarget
    ? 'HEALTHY'
    : ihsanActual >= 0.80
      ? 'WARNING'
      : 'CRITICAL'

  checks.push({
    name: 'IHSAN',
    description: 'Overall ethical/spiritual system health',
    target: ihsanTarget,
    actual: ihsanActual,
    state: ihsanState
  })

  // SLO 2: LATENCY
  const latencyMs = telemetry.latency_us / 1000
  const latencyTarget = 200
  const latencyState: SloState = latencyMs <= latencyTarget
    ? 'HEALTHY'
    : latencyMs <= 400
      ? 'WARNING'
      : 'CRITICAL'

  checks.push({
    name: 'LATENCY_MS',
    description: 'Median request latency',
    target: latencyTarget,
    actual: latencyMs,
    state: latencyState,
    unit: 'ms'
  })

  // SLO 3: ERROR RATE
  const errorPercent = telemetry.error_rate * 100
  const errorTarget = 1.0
  const errorState: SloState = errorPercent < errorTarget
    ? 'HEALTHY'
    : errorPercent < 3.0
      ? 'WARNING'
      : 'CRITICAL'

  checks.push({
    name: 'ERROR_RATE_PERCENT',
    description: 'Error rate percentage',
    target: errorTarget,
    actual: errorPercent,
    state: errorState,
    unit: '%'
  })

  // SLO 4: CONSENSUS
  const healthyConsensus = ['STABLE', 'CONVERGING']
  const warningConsensus = ['RECOVERY']
  const consensusState: SloState = healthyConsensus.includes(telemetry.consensus_state)
    ? 'HEALTHY'
    : warningConsensus.includes(telemetry.consensus_state)
      ? 'WARNING'
      : 'CRITICAL'

  const consensusActual = healthyConsensus.includes(telemetry.consensus_state)
    ? 1.0
    : warningConsensus.includes(telemetry.consensus_state)
      ? 0.5
      : 0.0

  checks.push({
    name: 'CONSENSUS',
    description: 'Consensus algorithm state',
    target: 1.0,
    actual: consensusActual,
    state: consensusState
  })

  // SLO 5: AGENT CAPACITY
  const totalAgents = telemetry.active_agents.PAT + telemetry.active_agents.SAT
  const agentTarget = 10
  const agentState: SloState = totalAgents >= agentTarget
    ? 'HEALTHY'
    : totalAgents >= 5
      ? 'WARNING'
      : 'CRITICAL'

  checks.push({
    name: 'AGENT_CAPACITY',
    description: 'Active agent count (PAT + SAT)',
    target: agentTarget,
    actual: totalAgents,
    state: agentState
  })

  // OVERALL
  const overall: SloState = checks.some(c => c.state === 'CRITICAL')
    ? 'CRITICAL'
    : checks.some(c => c.state === 'WARNING')
      ? 'WARNING'
      : 'HEALTHY'

  return {
    overall,
    timestamp: new Date().toISOString(),
    checks
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SLO FLIGHT STRIP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SloFlightStripProps {
  /** Show individual check details on hover/click */
  showDetails?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * SLO Flight Strip - Visual indicator for Service Level Objectives
 *
 * Displays a color-coded bar showing the overall SLO status:
 * - HEALTHY (green): All objectives met
 * - WARNING (amber): One or more objectives in warning band
 * - CRITICAL (red): One or more objectives breached
 */
export function SloFlightStrip({
  showDetails = true,
  className = ''
}: SloFlightStripProps) {
  const { telemetry, status } = useTelemetry()

  // Calculate SLO status from telemetry
  const sloStatus = telemetry ? evaluateSloFromTelemetry(telemetry) : null

  // State configuration
  const stateConfig = {
    HEALTHY: {
      bg: 'bg-emerald-500',
      text: 'text-white',
      icon: '✅',
      label: 'All objectives met',
      pulse: false
    },
    WARNING: {
      bg: 'bg-amber-500',
      text: 'text-black',
      icon: '⚠️',
      label: 'Check: ',
      pulse: false
    },
    CRITICAL: {
      bg: 'bg-red-500',
      text: 'text-white',
      icon: '🔴',
      label: 'Immediate action required',
      pulse: true
    }
  }

  // Loading state
  if (status === 'connecting' || !sloStatus) {
    return (
      <div className={`rounded-lg px-4 py-2 bg-slate-700 animate-pulse ${className}`}>
        <span className="text-slate-400 text-sm">Evaluating SLOs...</span>
      </div>
    )
  }

  // Disconnected state
  if (status === 'disconnected' || status === 'error') {
    return (
      <div className={`rounded-lg px-4 py-2 bg-slate-600 ${className}`}>
        <span className="text-slate-300 text-sm">
          ⚠️ SLO: OFFLINE - No telemetry data
        </span>
      </div>
    )
  }

  const config = stateConfig[sloStatus.overall]

  // Get warning/critical checks for label
  const problemChecks = sloStatus.checks
    .filter(c => c.state !== 'HEALTHY')
    .map(c => c.name)

  const detailLabel = sloStatus.overall === 'HEALTHY'
    ? config.label
    : sloStatus.overall === 'WARNING'
      ? `Check: ${problemChecks.join(', ')}`
      : config.label

  return (
    <motion.div
      className={`rounded-lg overflow-hidden ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Main strip */}
      <motion.div
        className={`px-4 py-2 ${config.bg} ${config.text}`}
        animate={config.pulse ? {
          opacity: [1, 0.8, 1]
        } : {}}
        transition={config.pulse ? {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        } : {}}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{config.icon}</span>
            <span className="font-semibold text-sm">
              SLO: {sloStatus.overall}
            </span>
          </div>
          <span className="text-sm opacity-90">
            {detailLabel}
          </span>
        </div>
      </motion.div>

      {/* Details panel (collapsible) */}
      {showDetails && sloStatus.overall !== 'HEALTHY' && (
        <motion.div
          className="bg-slate-800/80 px-4 py-2 border-t border-slate-700"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="grid grid-cols-5 gap-2 text-xs">
            {sloStatus.checks.map(check => (
              <div
                key={check.name}
                className={`px-2 py-1 rounded ${
                  check.state === 'HEALTHY'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : check.state === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                }`}
              >
                <div className="font-mono truncate">{check.name}</div>
                <div className="opacity-70">
                  {check.actual.toFixed(check.unit === '%' ? 1 : 0)}
                  {check.unit || ''} / {check.target}{check.unit || ''}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPACT SLO INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

interface SloIndicatorProps {
  className?: string
}

/**
 * Compact SLO indicator - shows just the status badge
 */
export function SloIndicator({ className = '' }: SloIndicatorProps) {
  const { telemetry, status } = useTelemetry()
  const sloStatus = telemetry ? evaluateSloFromTelemetry(telemetry) : null

  if (status !== 'connected' || !sloStatus) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-600 text-slate-300 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        SLO: ---
      </span>
    )
  }

  const colors = {
    HEALTHY: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    WARNING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  const dotColors = {
    HEALTHY: 'bg-emerald-500',
    WARNING: 'bg-amber-500',
    CRITICAL: 'bg-red-500'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${colors[sloStatus.overall]} ${className}`}>
      <motion.span
        className={`w-2 h-2 rounded-full ${dotColors[sloStatus.overall]}`}
        animate={sloStatus.overall === 'CRITICAL' ? { opacity: [1, 0.5, 1] } : {}}
        transition={sloStatus.overall === 'CRITICAL' ? { duration: 0.8, repeat: Infinity } : {}}
      />
      SLO: {sloStatus.overall}
    </span>
  )
}

export default SloFlightStrip
