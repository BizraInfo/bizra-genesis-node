// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - TELEMETRY STREAM HOOK                              ║
// ║  Real-time system telemetry from Rust API via WebSocket Bridge           ║
// ║  The Glass Cockpit's connection to the beating heart of Node₀            ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { useEffect, useState, useCallback, useRef, createContext, useContext, ReactNode } from 'react'
import { WS_URL } from '../config'

// ═══════════════════════════════════════════════════════════════════════════
// GENESIS TELEMETRY TYPES - Mirror of Rust API schema
// ═══════════════════════════════════════════════════════════════════════════

/** Consensus state enumeration */
export type ConsensusState = 'STABLE' | 'CONVERGING' | 'DEGRADED' | 'RECOVERY' | 'OFFLINE'

/** Circuit breaker state */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/** Active agent counts by team */
export interface AgentCounts {
  PAT: number
  SAT: number
  TAT: number
}

/** Model provider health status */
export interface ModelHealth {
  primary_available: boolean
  fallback_available: boolean
  active_provider: string
  circuit_breaker_state: CircuitBreakerState
}

/** Database pool status */
export interface DbPoolStatus {
  active: number
  idle: number
  max_size: number
  healthy: boolean
}

/**
 * Genesis Telemetry - canonical schema for real-time dashboard updates
 * This is the "pulse" of the system visible to the Citadel UI
 */
export interface GenesisTelemetry {
  /** ISO 8601 timestamp of this telemetry snapshot */
  timestamp: string
  /** Unique node identifier */
  node_id: string
  /** Request latency in microseconds (P50 over last minute) */
  latency_us: number
  /**
   * Ihsan quality score [0.0 - 1.0] - the "soul" of the system
   * >= 0.90: Gold (Excellence)
   * >= 0.75: Teal (Good)
   * < 0.75: Red (Needs Attention)
   */
  ihsan_score: number
  /** Current consensus state */
  consensus_state: ConsensusState
  /** Current reward epoch number */
  epoch: number
  /** Active agent counts by team */
  active_agents: AgentCounts
  /** Proof-of-Impact events in last minute */
  poi_events_last_minute: number
  /** Error rate over last 5 minutes [0.0 - 1.0] */
  error_rate: number
  /** System uptime in seconds */
  uptime_seconds: number
  /** Model provider health status */
  model_health: ModelHealth
  /** Database connection pool status */
  db_pool_status: DbPoolStatus
}

/** Connection status for the telemetry stream */
export type TelemetryConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/** Ihsan visual state based on score thresholds */
export type IhsanVisualState = 'excellence' | 'stable' | 'attention' | 'degraded'

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derive visual state from Ihsan score
 * @param score Ihsan quality score [0.0 - 1.0]
 * @returns Visual state for UI rendering
 */
export function getIhsanVisualState(score: number): IhsanVisualState {
  if (score >= 0.95) {return 'excellence'}
  if (score >= 0.85) {return 'stable'}
  if (score >= 0.70) {return 'attention'}
  return 'degraded'
}

/**
 * Get color for Ihsan visual state
 * @param state Ihsan visual state
 * @returns CSS color value
 */
export function getIhsanColor(state: IhsanVisualState): string {
  switch (state) {
    case 'excellence':
      return '#FFD700' // Gold
    case 'stable':
      return '#00CED1' // Dark Cyan / Teal
    case 'attention':
      return '#FFA500' // Orange / Amber
    case 'degraded':
      return '#DC143C' // Crimson / Red
  }
}

/**
 * Format uptime seconds to human-readable string
 * @param seconds Total uptime in seconds
 * @returns Formatted string like "2d 5h 30m"
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0) {parts.push(`${days}d`)}
  if (hours > 0) {parts.push(`${hours}h`)}
  if (minutes > 0 || parts.length === 0) {parts.push(`${minutes}m`)}

  return parts.join(' ')
}

/**
 * Format latency microseconds to human-readable string
 * @param us Latency in microseconds
 * @returns Formatted string like "1.2ms" or "850μs"
 */
export function formatLatency(us: number): string {
  if (us >= 1000) {
    return `${(us / 1000).toFixed(1)}ms`
  }
  return `${us}μs`
}

// ═══════════════════════════════════════════════════════════════════════════
// TELEMETRY STREAM HOOK
// ═══════════════════════════════════════════════════════════════════════════

interface UseTelemetryStreamOptions {
  /** WebSocket URL for telemetry bridge (default: ws://localhost:8080) */
  wsUrl?: string
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean
  /** Max reconnection attempts (default: 10) */
  maxReconnectAttempts?: number
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelay?: number
}

interface UseTelemetryStreamReturn {
  /** Current telemetry data (null if not yet received) */
  telemetry: GenesisTelemetry | null
  /** Connection status */
  status: TelemetryConnectionStatus
  /** Time since last telemetry update in ms */
  lastUpdateAge: number
  /** Manually trigger reconnection */
  reconnect: () => void
  /** Manually disconnect */
  disconnect: () => void
  /** Derived Ihsan visual state */
  ihsanState: IhsanVisualState
  /** Derived Ihsan color */
  ihsanColor: string
}

/**
 * Hook for streaming real-time Genesis Telemetry from the Rust API
 *
 * Connects directly to the WebSocket Telemetry Bridge (ws://localhost:8080)
 * which polls the Rust API at /telemetry and broadcasts updates.
 *
 * @example
 * ```tsx
 * function GlassCockpit() {
 *   const { telemetry, status, ihsanState, ihsanColor } = useTelemetryStream()
 *
 *   if (!telemetry) return <Loading />
 *
 *   return (
 *     <div style={{ backgroundColor: ihsanColor }}>
 *       <ConsciousnessMeter score={telemetry.ihsan_score} state={ihsanState} />
 *       <LatencyPanel value={telemetry.latency_us} />
 *       <AgentGrid counts={telemetry.active_agents} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useTelemetryStream(options: UseTelemetryStreamOptions = {}): UseTelemetryStreamReturn {
  const {
    wsUrl = WS_URL,
    autoReconnect = true,
    maxReconnectAttempts = 10,
    reconnectDelay = 1000,
  } = options

  const [telemetry, setTelemetry] = useState<GenesisTelemetry | null>(null)
  const [status, setStatus] = useState<TelemetryConnectionStatus>('disconnected')
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const [lastUpdateAge, setLastUpdateAge] = useState<number>(0)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (ageIntervalRef.current) {
      clearInterval(ageIntervalRef.current)
      ageIntervalRef.current = null
    }
  }, [])

  // Disconnect function
  const disconnect = useCallback(() => {
    cleanup()
    reconnectAttemptsRef.current = maxReconnectAttempts // Prevent reconnection
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    setStatus('disconnected')
  }, [cleanup, maxReconnectAttempts])

  // Connect function
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    setStatus('connecting')

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ [Telemetry] WebSocket connected to', wsUrl)
        setStatus('connected')
        reconnectAttemptsRef.current = 0

        // Start age tracking interval
        ageIntervalRef.current = setInterval(() => {
          if (lastUpdateTime > 0) {
            setLastUpdateAge(Date.now() - lastUpdateTime)
          }
        }, 1000)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          // Handle telemetry update messages from the bridge
          if (message.message_type === 'telemetry_update' && message.payload) {
            setTelemetry(message.payload as GenesisTelemetry)
            setLastUpdateTime(Date.now())
            setLastUpdateAge(0)
          }
        } catch (error) {
          console.error('[Telemetry] Failed to parse message:', error)
        }
      }

      ws.onerror = (event) => {
        console.error('[Telemetry] WebSocket error:', event)
        setStatus('error')
      }

      ws.onclose = (event) => {
        console.log('[Telemetry] WebSocket closed:', event.code, event.reason)
        wsRef.current = null
        cleanup()

        if (event.code !== 1000 && autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          setStatus('disconnected')
          reconnectAttemptsRef.current++

          const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1)
          console.log(`[Telemetry] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, Math.min(delay, 30000)) // Cap at 30 seconds
        } else {
          setStatus('disconnected')
        }
      }
    } catch (error) {
      console.error('[Telemetry] Failed to create WebSocket:', error)
      setStatus('error')
    }
  }, [wsUrl, autoReconnect, maxReconnectAttempts, reconnectDelay, cleanup, lastUpdateTime])

  // Reconnect function (resets attempt counter)
  const reconnect = useCallback(() => {
    cleanup()
    reconnectAttemptsRef.current = 0
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual reconnect')
      wsRef.current = null
    }
    // Small delay to ensure clean disconnect
    setTimeout(connect, 100)
  }, [cleanup, connect])

  // Auto-connect on mount
  useEffect(() => {
    connect()

    return () => {
      cleanup()
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount')
        wsRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive Ihsan visual state
  const ihsanState = telemetry ? getIhsanVisualState(telemetry.ihsan_score) : 'stable'
  const ihsanColor = getIhsanColor(ihsanState)

  return {
    telemetry,
    status,
    lastUpdateAge,
    reconnect,
    disconnect,
    ihsanState,
    ihsanColor,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TELEMETRY CONTEXT (Optional - for app-wide sharing)
// ═══════════════════════════════════════════════════════════════════════════

const TelemetryContext = createContext<UseTelemetryStreamReturn | null>(null)

interface TelemetryProviderProps {
  children: ReactNode
  wsUrl?: string
}

/**
 * Provider component for sharing telemetry stream across the app
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <TelemetryProvider>
 *       <GlassCockpit />
 *     </TelemetryProvider>
 *   )
 * }
 * ```
 */
export function TelemetryProvider({ children, wsUrl }: TelemetryProviderProps) {
  const telemetryStream = useTelemetryStream({ wsUrl })

  return (
    <TelemetryContext.Provider value={telemetryStream}>
      {children}
    </TelemetryContext.Provider>
  )
}

/**
 * Hook to access shared telemetry stream from TelemetryProvider
 * @throws If used outside of TelemetryProvider
 */
export function useTelemetry(): UseTelemetryStreamReturn {
  const context = useContext(TelemetryContext)
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider')
  }
  return context
}

export default useTelemetryStream
