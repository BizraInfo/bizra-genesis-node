// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - METRICS DASHBOARD HOOK                             ║
// ║  Real-time formatted metrics for performance monitoring dashboard         ║
// ║  Connects to the enhanced API metrics endpoint and WebSocket updates     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { useEffect, useState, useCallback } from 'react'
import { useWebSocket } from '../contexts/WebSocketContext'
import { MessageType } from '../services/websocket'

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTED METRICS TYPES - Mirror of backend formatMetricsForDashboard()
// ═══════════════════════════════════════════════════════════════════════════

/** Consensus metrics group */
export interface ConsensusMetrics {
  totalOperations: number
  avgLatencyMicroseconds: number
  paretoCandidates: number
  health: number // 0.0-1.0 health score
}

/** Proof-of-Impact metrics group */
export interface POIMetrics {
  validationSuccessRate: number
  attemptsTotal: number
  successTotal: number
  failureTotal: number
  scoreDistribution: Record<string, number>
}

/** Thompson Sampling routing metrics group */
export interface RoutingMetrics {
  totalOperations: number
  avgLatencyMicroseconds: number
  winRates: Record<string, number>
}

/** Quality gate metrics group */
export interface QualityMetrics {
  ihsanScores: Record<string, number>
  ihsanPasses: number
  ihsanRejections: number
  passRate: number
}

/** Database metrics group */
export interface DatabaseMetrics {
  activeConnections: number
  idleConnections: number
  queryDurations: Record<string, number>
  operationsTotal: Record<string, number>
  errorsTotal: Record<string, number>
  migrationsApplied: number
}

/** Cache metrics group */
export interface CacheMetrics {
  hitRate: number
  operations: Record<string, number>
  avgDurationSeconds: number
}

/** Cryptographic metrics group */
export interface CryptoMetrics {
  receiptsGenerated: number
  avgReceiptLatency: number
  verificationSuccessRate: number
}

/** APEX Performance Engine metrics group */
export interface ApexMetrics {
  performanceGain: number
  qualityImprovement: number
  cognitiveAmplification: number
  capabilityMultiplier: number
}

/** SNR Intelligence metrics group */
export interface SNRMetrics {
  consensusClarity: number
  agentReliability: number
  decisionQuality: number
}

/** System coherence metrics group */
export interface CoherenceMetrics {
  systemCoherence: number
  componentVariance: number
  stabilityScore: number
}

/**
 * Complete formatted metrics dashboard data structure
 * This matches the backend formatMetricsForDashboard() return value
 */
export interface FormattedMetricsDashboard {
  // Core system metric groups
  consensus: ConsensusMetrics
  poi: POIMetrics
  routing: RoutingMetrics
  quality: QualityMetrics
  database: DatabaseMetrics
  cache: CacheMetrics
  crypto: CryptoMetrics

  // Advanced revolutionary technology metrics
  apex: ApexMetrics
  snr: SNRMetrics
  coherence: CoherenceMetrics
}

/** Connection status for the metrics dashboard */
export type MetricsDashboardStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// ═══════════════════════════════════════════════════════════════════════════
// METRICS DASHBOARD HOOK
// ═══════════════════════════════════════════════════════════════════════════

interface UseMetricsDashboardOptions {
  /** Auto-fetch initial data if WebSocket not connected (default: true) */
  fetchInitialData?: boolean
  /** API endpoint for fetching metrics (default: /rust-metrics) */
  apiEndpoint?: string
}

interface UseMetricsDashboardReturn {
  /** Current formatted metrics data (null if not yet received) */
  metrics: FormattedMetricsDashboard | null
  /** Connection status */
  status: MetricsDashboardStatus
  /** Time since last metrics update in ms */
  lastUpdateAge: number
  /** Manual refresh of metrics */
  refresh: () => Promise<void>
}

/**
 * Hook for streaming real-time formatted metrics for the performance dashboard
 *
 * Connects to WebSocket broadcasts and falls back to REST API polling.
 * Provides formatted metrics grouped for dashboard visualization.
 *
 * @example
 * ```tsx
 * function PerformanceDashboard() {
 *   const { metrics, status } = useMetricsDashboard()
 *
 *   if (!metrics) return <LoadingSpinner />
 *
 *   return (
 *     <div className="dashboard-grid">
 *       <ConsensusMetricsCard data={metrics.consensus} />
 *       <APEXPerformanceCard data={metrics.apex} />
 *       <SNRIntelligenceCard data={metrics.snr} />
 *       <DatabaseHealthCard data={metrics.database} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useMetricsDashboard(options: UseMetricsDashboardOptions = {}): UseMetricsDashboardReturn {
  const { fetchInitialData = true, apiEndpoint = '/api/rust-metrics' } = options

  const { client, connected } = useWebSocket()
  const [metrics, setMetrics] = useState<FormattedMetricsDashboard | null>(null)
  const [status, setStatus] = useState<MetricsDashboardStatus>('connecting')
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const [lastUpdateAge, setLastUpdateAge] = useState<number>(0)

  // Fetch metrics via REST API
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(apiEndpoint)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.formatted) {
        setMetrics(data.formatted)
        setLastUpdateTime(Date.now())
        setLastUpdateAge(0)
        // console.log('📈 [Metrics] Updated via REST API')
      }
    } catch (error) {
      console.warn('⚠️ [Metrics] REST fetch failed:', (error as Error).message)
      if (status !== 'connected') {
        setStatus('error')
      }
    }
  }, [apiEndpoint, status])

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: { message_type: MessageType; payload?: unknown }) => {
    if (message.message_type === MessageType.MetricsDashboardUpdate && message.payload) {
      setMetrics(message.payload as FormattedMetricsDashboard)
      setLastUpdateTime(Date.now())
      setLastUpdateAge(0)
      setStatus('connected')
      // console.log('📈 [Metrics] Updated via WebSocket')
    }
  }, [])

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchMetrics()
  }, [fetchMetrics])

  // Setup WebSocket listener
  useEffect(() => {
    if (!connected || !client) {
      if (fetchInitialData && status === 'connecting') {
        // Fallback to REST when WebSocket not available
        void fetchMetrics()
      }
      return
    }

    setStatus('connected')
    // console.log('📈 [Metrics] WebSocket connected, listening for updates')

    client.on(MessageType.MetricsDashboardUpdate, handleWebSocketMessage)

    // Fetch initial data if available
    if (fetchInitialData) {
      void fetchMetrics()
    }

    return () => {
      client.off(MessageType.MetricsDashboardUpdate, handleWebSocketMessage)
    }
  }, [client, connected, fetchInitialData, fetchMetrics, handleWebSocketMessage, status])

  // Update age tracking
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdateTime > 0) {
        setLastUpdateAge(Date.now() - lastUpdateTime)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lastUpdateTime])

  // Get initial status based on WebSocket connection
  useEffect(() => {
    setStatus(connected ? 'connected' : 'disconnected')
  }, [connected])

  return {
    metrics,
    status,
    lastUpdateAge,
    refresh
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get health color for metrics (green/yellow/red)
 * @param health Health score 0.0-1.0
 * @returns CSS color string
 */
export function getHealthColor(health: number): string {
  if (health >= 0.8) {
    return '#10B981' // Green
  }
  if (health >= 0.6) {
    return '#F59E0B' // Yellow
  }
  return '#EF4444' // Red
}

/**
 * Format capability multiplier for display
 * @param multiplier Raw capability multiplier value
 * @returns Formatted string like "42.7x"
 */
export function formatCapabilityMultiplier(multiplier: number): string {
  if (multiplier < 10) {
    return `${multiplier.toFixed(1)}x`
  }
  return `${Math.round(multiplier)}x`
}

/**
 * Format SNR clarity as percentage
 * @param clarity SNR clarity value (typically 0-2 range)
 * @returns Formatted percentage string
 */
export function formatSNRClarity(clarity: number): string {
  const percentage = Math.min(100, clarity * 50) // Scale to percentage
  return `${percentage.toFixed(1)}%`
}

/**
 * Get coherence status description
 * @param coherence Coherence score
 * @returns Human-readable status
 */
export function getCoherenceStatus(coherence: number): string {
  if (coherence >= 0.9) {
    return 'Harmonic'
  }
  if (coherence >= 0.7) {
    return 'Coherent'
  }
  if (coherence >= 0.5) {
    return 'Balanced'
  }
  return 'Fragmented'
}

/**
 * Get color for SNR values
 * @param snr SNR value (0-2 range)
 * @returns CSS color string
 */
export function getSNRColor(snr: number): string {
  if (snr >= 1.5) {
    return '#FFD700' // Gold for excellent signal
  }
  if (snr >= 0.8) {
    return '#00CED1' // Teal for good signal
  }
  return '#FFA500' // Orange for poor signal
}

/**
 * Get color for coherence levels
 * @param coherence Coherence score (0-1)
 * @returns CSS color string
 */
export function getCoherenceColor(coherence: number): string {
  if (coherence >= 0.8) {
    return '#10B981' // Green
  }
  if (coherence >= 0.6) {
    return '#F59E0B' // Yellow
  }
  return '#EF4444' // Red
}

export default useMetricsDashboard
