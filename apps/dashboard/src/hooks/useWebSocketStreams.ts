// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET STREAM HOOKS                             ║
// ║  Custom hooks for real-time agent status and consensus updates           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { useEffect, useState, useCallback, useRef } from 'react'
import { useWebSocket } from '../contexts/WebSocketContext'
import { AgentResponse, MessageType } from '../services/websocket'

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface AgentStatusEvent {
  agent_id: string
  agent_name: string
  status: 'idle' | 'processing' | 'streaming' | 'error'
  current_task?: string
  progress?: number
  last_update: number
}

export interface ConsensusUpdateEvent {
  consensus_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  agents_voted: number
  total_agents: number
  confidence_score?: number
  result?: unknown
  timestamp: number
}

export interface MetricUpdateEvent {
  metric_type: 'latency' | 'throughput' | 'error_rate' | 'consensus_time'
  value: number
  unit: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface NotificationEvent {
  notification_id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
  read: boolean
}

interface SystemMessagePayload {
  type?: string
  id?: string
  consensus_id?: string
  status?: 'pending' | 'in_progress' | 'completed' | 'failed'
  agents_voted?: number
  total_agents?: number
  confidence_score?: number
  result?: unknown
  timestamp?: number
  metric_type?: 'latency' | 'throughput' | 'error_rate' | 'consensus_time'
  value?: number
  unit?: string
  metadata?: Record<string, unknown>
  notification_id?: string
  notification_type?: 'info' | 'success' | 'warning' | 'error'
  severity?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message?: string
  read?: boolean
}

interface SystemMessage {
  payload: SystemMessagePayload
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT STREAM HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for streaming agent status updates in real-time
 *
 * @example
 * ```tsx
 * const agentStatuses = useAgentStream()
 *
 * return (
 *   <div>
 *     {Object.values(agentStatuses).map(agent => (
 *       <AgentCard key={agent.agent_id} status={agent} />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useAgentStream() {
  const { onAgentResponse, connected } = useWebSocket()
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatusEvent>>({})
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Convert AgentResponse to AgentStatusEvent
  const processAgentResponse = useCallback((response: AgentResponse) => {
    const agentName = typeof response.metadata?.agent_name === 'string' 
      ? response.metadata.agent_name 
      : response.agent_id
    const progress = typeof response.metadata?.progress === 'number' 
      ? response.metadata.progress 
      : undefined
    
    const status: AgentStatusEvent = {
      agent_id: response.agent_id,
      agent_name: agentName,
      status: response.is_streaming ? 'streaming' : response.is_complete ? 'idle' : 'processing',
      current_task: response.content,
      progress,
      last_update: Date.now()
    }

    setAgentStatuses(prev => ({
      ...prev,
      [response.agent_id]: status
    }))

    // Auto-reset to idle after 30 seconds of no activity
    const existingTimeout = timeoutRefs.current.get(response.agent_id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    if (response.is_complete) {
      const timeout = setTimeout(() => {
        setAgentStatuses(prev => {
          const updated = { ...prev }
          if (updated[response.agent_id]) {
            updated[response.agent_id] = {
              ...updated[response.agent_id],
              status: 'idle',
              current_task: undefined
            }
          }
          return updated
        })
        timeoutRefs.current.delete(response.agent_id)
      }, 30000)
      timeoutRefs.current.set(response.agent_id, timeout)
    }
  }, [])

  useEffect(() => {
    if (!connected) { return }

    const unsubscribe = onAgentResponse(processAgentResponse)

    return () => {
      unsubscribe()
      // Clear all timeouts on cleanup
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      timeoutRefs.current.clear()
    }
  }, [connected, onAgentResponse, processAgentResponse])

  return agentStatuses
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSENSUS STREAM HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for streaming consensus updates in real-time
 *
 * @example
 * ```tsx
 * const { currentConsensus, consensusHistory } = useConsensusStream()
 *
 * return (
 *   <div>
 *     <ConsensusProgress
 *       voted={currentConsensus?.agents_voted}
 *       total={currentConsensus?.total_agents}
 *     />
 *   </div>
 * )
 * ```
 */
export function useConsensusStream(maxHistory: number = 10) {
  const { client, connected } = useWebSocket()
  const [currentConsensus, setCurrentConsensus] = useState<ConsensusUpdateEvent | null>(null)
  const [consensusHistory, setConsensusHistory] = useState<ConsensusUpdateEvent[]>([])

  useEffect(() => {
    if (!connected || !client) { return }

    // Listen for system messages that contain consensus updates
    const handler = (message: unknown) => {
      const sysMsg = message as SystemMessage
      const payload = sysMsg.payload

      // Check if this is a consensus update
      if (payload.type === 'consensus_update' || payload.consensus_id) {
        const update: ConsensusUpdateEvent = {
          consensus_id: payload.consensus_id || payload.id || '',
          status: payload.status || 'in_progress',
          agents_voted: payload.agents_voted || 0,
          total_agents: payload.total_agents || 18,
          confidence_score: payload.confidence_score,
          result: payload.result,
          timestamp: payload.timestamp || Date.now()
        }

        setCurrentConsensus(update)

        // Add to history if completed
        if (update.status === 'completed' || update.status === 'failed') {
          setConsensusHistory(prev => {
            const updated = [update, ...prev].slice(0, maxHistory)
            return updated
          })
        }
      }
    }

    client.on(MessageType.SystemMessage, handler)

    return () => {
      client.off(MessageType.SystemMessage, handler)
    }
  }, [connected, client, maxHistory])

  return { currentConsensus, consensusHistory }
}

// ═══════════════════════════════════════════════════════════════════════════
// METRIC STREAM HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for streaming real-time metrics
 *
 * @example
 * ```tsx
 * const metrics = useMetricStream(['latency', 'throughput'])
 * ```
 */
export function useMetricStream(metricTypes?: string[]) {
  const { client, connected } = useWebSocket()
  const [metrics, setMetrics] = useState<Record<string, MetricUpdateEvent>>({})

  useEffect(() => {
    if (!connected || !client) { return }

    const handler = (message: unknown) => {
      const sysMsg = message as SystemMessage
      const payload = sysMsg.payload

      if (payload.type === 'metric_update' || payload.metric_type) {
        // Ensure metric_type is valid
        const metricType = payload.metric_type as MetricUpdateEvent['metric_type']
        if (!metricType) { return }

        const metric: MetricUpdateEvent = {
          metric_type: metricType,
          value: payload.value || 0,
          unit: payload.unit || '',
          timestamp: payload.timestamp || Date.now(),
          metadata: payload.metadata
        }

        // Filter by metric types if specified
        if (!metricTypes || metricTypes.includes(metric.metric_type)) {
          setMetrics(prev => ({
            ...prev,
            [metric.metric_type]: metric
          }))
        }
      }
    }

    client.on(MessageType.SystemMessage, handler)

    return () => {
      client.off(MessageType.SystemMessage, handler)
    }
  }, [connected, client, metricTypes])

  return metrics
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION STREAM HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for streaming notifications
 *
 * @example
 * ```tsx
 * const { notifications, unreadCount, markAsRead } = useNotificationStream()
 * ```
 */
export function useNotificationStream(maxNotifications: number = 50) {
  const { client, connected } = useWebSocket()
  const [notifications, setNotifications] = useState<NotificationEvent[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!connected || !client) { return }

    const handler = (message: unknown) => {
      const sysMsg = message as SystemMessage
      const payload = sysMsg.payload

      if (payload.type === 'notification' || payload.notification_id) {
        const notification: NotificationEvent = {
          notification_id: payload.notification_id || `notif-${Date.now()}`,
          type: payload.notification_type || payload.severity || 'info',
          title: payload.title || 'Notification',
          message: payload.message || '',
          timestamp: payload.timestamp || Date.now(),
          read: false
        }

        setNotifications(prev => {
          const updated = [notification, ...prev].slice(0, maxNotifications)
          return updated
        })

        setUnreadCount(prev => prev + 1)
      }
    }

    client.on(MessageType.SystemMessage, handler)

    return () => {
      client.off(MessageType.SystemMessage, handler)
    }
  }, [connected, client, maxNotifications])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.notification_id === notificationId
          ? { ...notif, read: true }
          : notif
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, markAsRead, markAllAsRead }
}
