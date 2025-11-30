// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - TELEMETRY PLAYGROUND                               ║
// ║  α-10 Glass Cockpit Validation - Isolated test environment               ║
// ║  β-11 Flight Rules & SLO Autopilot                                       ║
// ║  "The Silent Giant's eyes under the microscope"                          ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import {
  TelemetryProvider,
  SystemTelemetryPanel,
  useTelemetry,
  IhsanMeter,
  SloFlightStrip,
  SloIndicator
} from '../components/telemetry'

/**
 * TELEMETRY PLAYGROUND
 *
 * Isolated testing environment for the Glass Cockpit telemetry system.
 * Use this page to:
 * - Verify real-time data flow from Rust API → Node Bridge → React
 * - Test connection resilience (kill/restart services)
 * - Profile performance under various conditions
 *
 * To run the full stack:
 * 1. cargo run --bin api_server        # Port 3000
 * 2. node backend/server.js            # Port 3002 + WS 8080
 * 3. npm run dev                       # Dashboard
 * 4. Navigate to /telemetry-playground
 */
export function TelemetryPlayground() {
  return (
    <TelemetryProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-3">
                  <span className="text-2xl">🔬</span>
                  Telemetry Playground
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  α-10 Glass Cockpit Validation Environment
                </p>
              </div>
              <div className="flex items-center gap-3">
                <SloIndicator />
                <ConnectionStatusBadge />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Instructions */}
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Quick Start
            </h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <StepCard
                step={1}
                title="Start Rust API"
                command="cargo run --bin api_server"
                port="3000"
              />
              <StepCard
                step={2}
                title="Start Node Backend"
                command="node backend/server.js"
                port="8080 (WS)"
              />
              <StepCard
                step={3}
                title="Verify Connection"
                command="curl http://localhost:8080/health"
                port="Check"
              />
            </div>
          </section>

          {/* β-11 SLO Flight Strip */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              SLO Flight Strip (β-11)
            </h2>
            <SloFlightStrip showDetails />
          </section>

          {/* Main Glass Cockpit */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              System Telemetry Panel (Full)
            </h2>
            <SystemTelemetryPanel detailed />
          </section>

          {/* Component Gallery */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Component Gallery
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Small Meter */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-xs text-slate-400 uppercase mb-4">Small Meter</h3>
                <div className="flex justify-center">
                  <IhsanMeter size="small" />
                </div>
              </div>

              {/* Medium Meter */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-xs text-slate-400 uppercase mb-4">Medium Meter</h3>
                <div className="flex justify-center">
                  <IhsanMeter size="medium" />
                </div>
              </div>

              {/* Large Meter */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-xs text-slate-400 uppercase mb-4">Large Meter</h3>
                <div className="flex justify-center">
                  <IhsanMeter size="large" showPulse />
                </div>
              </div>
            </div>
          </section>

          {/* Raw Telemetry Data */}
          <RawTelemetryViewer />

          {/* Validation Checklist */}
          <ValidationChecklist />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 mt-12 py-6">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-xs text-slate-500 text-center">
              BIZRA Genesis Node • α-10 Glass Cockpit Validation Sprint
            </p>
          </div>
        </footer>
      </div>
    </TelemetryProvider>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ConnectionStatusBadge() {
  const { status, lastUpdateAge } = useTelemetry()

  const statusConfig = {
    connecting: { color: 'bg-amber-500', text: 'Connecting...' },
    connected: { color: 'bg-emerald-500', text: 'Connected' },
    disconnected: { color: 'bg-slate-500', text: 'Disconnected' },
    error: { color: 'bg-red-500', text: 'Error' }
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full">
        <div className={`w-2 h-2 rounded-full ${config.color} ${status === 'connected' ? 'animate-pulse' : ''}`} />
        <span className="text-sm text-slate-300">{config.text}</span>
      </div>
      {status === 'connected' && lastUpdateAge > 0 && (
        <span className="text-xs text-slate-500">
          Last update: {Math.round(lastUpdateAge / 1000)}s ago
        </span>
      )}
    </div>
  )
}

interface StepCardProps {
  step: number
  title: string
  command: string
  port: string
}

function StepCard({ step, title, command, port }: StepCardProps) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">
          {step}
        </span>
        <span className="text-white font-medium">{title}</span>
      </div>
      <code className="text-xs text-emerald-400 bg-slate-950 px-2 py-1 rounded block mb-2 font-mono">
        {command}
      </code>
      <span className="text-xs text-slate-500">Port: {port}</span>
    </div>
  )
}

function RawTelemetryViewer() {
  const { telemetry, status } = useTelemetry()

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Raw Telemetry Data
      </h2>
      <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
          <span className="text-xs text-slate-400 font-mono">GenesisTelemetry JSON</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/20 text-slate-400'
          }`}>
            {status === 'connected' ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-300 overflow-auto max-h-96">
          {telemetry
            ? JSON.stringify(telemetry, null, 2)
            : '// Waiting for telemetry data...\n// Ensure Rust API and Node backend are running.'}
        </pre>
      </div>
    </section>
  )
}

function ValidationChecklist() {
  const { telemetry, status } = useTelemetry()

  const checks = [
    {
      name: 'WebSocket Connection',
      passed: status === 'connected',
      detail: status === 'connected' ? 'Connected to ws://localhost:8080' : `Status: ${status}`
    },
    {
      name: 'Telemetry Received',
      passed: telemetry !== null,
      detail: telemetry ? `Node: ${telemetry.node_id}` : 'No telemetry data'
    },
    {
      name: 'Ihsan Score Valid',
      passed: telemetry?.ihsan_score !== undefined && telemetry.ihsan_score >= 0 && telemetry.ihsan_score <= 1,
      detail: telemetry ? `Score: ${(telemetry.ihsan_score * 100).toFixed(1)}%` : 'N/A'
    },
    {
      name: 'Consensus State',
      passed: telemetry?.consensus_state !== undefined,
      detail: telemetry?.consensus_state || 'N/A'
    },
    {
      name: 'Agent Counts',
      passed: telemetry?.active_agents !== undefined,
      detail: telemetry
        ? `PAT: ${telemetry.active_agents.PAT}, SAT: ${telemetry.active_agents.SAT}, TAT: ${telemetry.active_agents.TAT}`
        : 'N/A'
    },
    {
      name: 'Model Health',
      passed: telemetry?.model_health?.primary_available !== undefined,
      detail: telemetry
        ? `Primary: ${telemetry.model_health.primary_available ? '✓' : '✗'}, Fallback: ${telemetry.model_health.fallback_available ? '✓' : '✗'}`
        : 'N/A'
    },
    {
      name: 'Database Pool',
      passed: telemetry?.db_pool_status?.healthy === true,
      detail: telemetry
        ? `Active: ${telemetry.db_pool_status.active}/${telemetry.db_pool_status.max_size}, Healthy: ${telemetry.db_pool_status.healthy ? '✓' : '✗'}`
        : 'N/A'
    }
  ]

  const passedCount = checks.filter(c => c.passed).length

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Validation Checklist
        </h2>
        <span className={`text-sm font-mono px-3 py-1 rounded-full ${
          passedCount === checks.length
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          {passedCount}/{checks.length} passing
        </span>
      </div>
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl divide-y divide-slate-700/30">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                check.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/20 text-slate-400'
              }`}>
                {check.passed ? '✓' : '○'}
              </span>
              <span className="text-sm text-white">{check.name}</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{check.detail}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default TelemetryPlayground
