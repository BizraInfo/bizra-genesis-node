// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SYSTEM TELEMETRY PANEL                             ║
// ║  Glass Cockpit - Full real-time system state visualization               ║
// ║  The beating heart of Node₀ made visible                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { motion } from 'framer-motion'
import {
  useTelemetry,
  formatUptime,
  formatLatency,
  type ConsensusState
} from '../../hooks/useTelemetryStream'
import { IhsanMeter } from './IhsanMeter'

interface SystemTelemetryPanelProps {
  /** Show detailed view with all metrics */
  detailed?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * SYSTEM TELEMETRY PANEL - Glass Cockpit Overview
 *
 * Displays comprehensive real-time system telemetry from the Rust API:
 * - Ihsan quality score (central focus)
 * - Consensus state
 * - Agent counts (PAT/SAT/TAT)
 * - Latency metrics
 * - Error rate
 * - System uptime
 * - Model health
 * - Database pool status
 *
 * @example
 * ```tsx
 * <TelemetryProvider>
 *   <SystemTelemetryPanel detailed />
 * </TelemetryProvider>
 * ```
 */
export function SystemTelemetryPanel({
  detailed = false,
  className = ''
}: SystemTelemetryPanelProps) {
  const { telemetry, status, lastUpdateAge } = useTelemetry()

  // Consensus state colors
  const consensusColors: Record<ConsensusState, string> = {
    STABLE: '#10B981',      // Emerald
    CONVERGING: '#3B82F6',  // Blue
    DEGRADED: '#F59E0B',    // Amber
    RECOVERY: '#8B5CF6',    // Purple
    OFFLINE: '#EF4444'      // Red
  }

  // Connection status indicator
  const statusColors: Record<typeof status, string> = {
    connecting: '#F59E0B',
    connected: '#10B981',
    disconnected: '#6B7280',
    error: '#EF4444'
  }

  return (
    <div className={`bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800 p-6 ${className}`}>
      {/* Header with connection status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Glass Cockpit</h2>
          <span className="text-xs text-slate-500 font-mono">
            {telemetry?.node_id || 'NODE0'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColors[status] }}
            animate={status === 'connected' ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs text-slate-400 capitalize">{status}</span>
          {status === 'connected' && lastUpdateAge > 0 && (
            <span className="text-xs text-slate-500">
              ({Math.round(lastUpdateAge / 1000)}s ago)
            </span>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Ihsan Meter (central focus) */}
        <div className="flex flex-col items-center justify-center lg:col-span-1">
          <IhsanMeter size="large" showPulse />
        </div>

        {/* Right columns - Metrics grid */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Consensus State */}
          <MetricCard
            label="Consensus"
            value={telemetry?.consensus_state || 'OFFLINE'}
            color={consensusColors[telemetry?.consensus_state || 'OFFLINE']}
            icon="🔄"
          />

          {/* Epoch */}
          <MetricCard
            label="Epoch"
            value={telemetry?.epoch?.toLocaleString() || '0'}
            subtext="current"
            icon="📅"
          />

          {/* Latency */}
          <MetricCard
            label="Latency (P50)"
            value={formatLatency(telemetry?.latency_us || 0)}
            subtext="response time"
            icon="⚡"
          />

          {/* Error Rate */}
          <MetricCard
            label="Error Rate"
            value={`${((telemetry?.error_rate || 0) * 100).toFixed(2)}%`}
            color={telemetry?.error_rate && telemetry.error_rate > 0.05 ? '#EF4444' : '#10B981'}
            icon="⚠️"
          />

          {/* Uptime */}
          <MetricCard
            label="Uptime"
            value={formatUptime(telemetry?.uptime_seconds || 0)}
            icon="⏱️"
          />

          {/* PoI Events */}
          <MetricCard
            label="PoI Events"
            value={telemetry?.poi_events_last_minute?.toString() || '0'}
            subtext="/minute"
            icon="📊"
          />
        </div>
      </div>

      {/* Detailed view - Agent counts and system health */}
      {detailed && telemetry && (
        <motion.div
          className="mt-6 pt-6 border-t border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agent Counts */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Agent Teams</h3>
              <div className="flex gap-4">
                <AgentTeamBadge
                  team="PAT"
                  count={telemetry.active_agents.PAT}
                  color="#3B82F6"
                  description="Production"
                />
                <AgentTeamBadge
                  team="SAT"
                  count={telemetry.active_agents.SAT}
                  color="#8B5CF6"
                  description="Support"
                />
                <AgentTeamBadge
                  team="TAT"
                  count={telemetry.active_agents.TAT}
                  color="#10B981"
                  description="Trading"
                />
              </div>
            </div>

            {/* Model Health */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Model Health</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Active Provider</span>
                  <span className="text-sm font-mono text-white">
                    {telemetry.model_health.active_provider}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Primary</span>
                  <StatusIndicator active={telemetry.model_health.primary_available} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Fallback</span>
                  <StatusIndicator active={telemetry.model_health.fallback_available} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Circuit Breaker</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                    telemetry.model_health.circuit_breaker_state === 'CLOSED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : telemetry.model_health.circuit_breaker_state === 'HALF_OPEN'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {telemetry.model_health.circuit_breaker_state}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Database Pool Status */}
          <div className="mt-4 bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Database Pool</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Connections</span>
                  <span>{telemetry.db_pool_status.active} / {telemetry.db_pool_status.max_size}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(telemetry.db_pool_status.active / telemetry.db_pool_status.max_size) * 100}%`
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{telemetry.db_pool_status.idle}</div>
                <div className="text-xs text-slate-400">Idle</div>
              </div>
              <StatusIndicator active={telemetry.db_pool_status.healthy} label="Healthy" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  color?: string
  icon?: string
}

function MetricCard({ label, value, subtext, color, icon }: MetricCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div
        className="text-xl font-bold font-mono"
        style={{ color: color || '#FFFFFF' }}
      >
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-slate-500">{subtext}</div>
      )}
    </div>
  )
}

interface AgentTeamBadgeProps {
  team: string
  count: number
  color: string
  description: string
}

function AgentTeamBadge({ team, count, color, description }: AgentTeamBadgeProps) {
  return (
    <div className="flex-1 text-center">
      <div
        className="text-2xl font-bold font-mono"
        style={{ color }}
      >
        {count}
      </div>
      <div className="text-sm font-medium text-white">{team}</div>
      <div className="text-xs text-slate-500">{description}</div>
    </div>
  )
}

interface StatusIndicatorProps {
  active: boolean
  label?: string
}

function StatusIndicator({ active, label }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </div>
  )
}

export default SystemTelemetryPanel
