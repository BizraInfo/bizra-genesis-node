"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface CortexStatus {
  status: string
  model: string
}

interface NodeHealth {
  status: string
  version: string
  mode: string
  uptime: number
  hardware: any
  agent_status: string
  cortex: CortexStatus
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface NodeHealthState {
  health: NodeHealth | null
  connectionState: ConnectionState
  lastUpdated: Date | null
  error: string | null
  retryCount: number
}

const MAX_RETRIES = 5
const BASE_DELAY = 2000 // 2 seconds
const MAX_DELAY = 30000 // 30 seconds

export function useNodeHealth() {
  const [state, setState] = useState<NodeHealthState>({
    health: null,
    connectionState: 'connecting',
    lastUpdated: null,
    error: null,
    retryCount: 0
  })
  
  const retryCountRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
      
      const res = await fetch(`${apiUrl}/health`, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (res.ok) {
        const data = await res.json()
        retryCountRef.current = 0
        setState({
          // Normalize different health payloads (API server vs local installer).
          health: {
            status: data.status ?? 'healthy',
            version: data.version ?? 'unknown',
            mode: data.mode ?? 'genesis',
            uptime: data.uptime ?? 0,
            hardware: data.hardware ?? null,
            agent_status: data.agent_status ?? 'unknown',
            cortex: data.cortex ?? { status: 'unknown', model: '' },
          },
          connectionState: 'connected',
          lastUpdated: new Date(),
          error: null,
          retryCount: 0
        })
      } else {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
    } catch (error) {
      retryCountRef.current++
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setState(prev => ({
        ...prev,
        connectionState: retryCountRef.current >= MAX_RETRIES ? 'error' : 'disconnected',
        error: retryCountRef.current >= MAX_RETRIES 
          ? `Node offline. Check if BIZRA Node is running. (${errorMessage})`
          : `Retrying... (${retryCountRef.current}/${MAX_RETRIES})`,
        retryCount: retryCountRef.current
      }))
    }
  }, [])

  useEffect(() => {
    // Initial check
    checkHealth()

    // Set up polling with exponential backoff on errors
    const setupInterval = () => {
      const delay = Math.min(
        BASE_DELAY * Math.pow(1.5, retryCountRef.current),
        MAX_DELAY
      )
      
      intervalRef.current = setTimeout(() => {
        checkHealth()
        setupInterval()
      }, delay)
    }
    
    setupInterval()

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
    }
  }, [checkHealth])

  // Manual retry function
  const retry = useCallback(() => {
    retryCountRef.current = 0
    setState(prev => ({
      ...prev,
      connectionState: 'connecting',
      error: null,
      retryCount: 0
    }))
    checkHealth()
  }, [checkHealth])

  return {
    health: state.health,
    isConnected: state.connectionState === 'connected',
    connectionState: state.connectionState,
    lastUpdated: state.lastUpdated,
    error: state.error,
    retry
  }
}
