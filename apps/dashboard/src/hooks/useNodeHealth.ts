"use client"

import { useState, useEffect } from "react"

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

export function useNodeHealth() {
  const [health, setHealth] = useState<NodeHealth | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:3001/health")
        if (res.ok) {
          const data = await res.json()
          setHealth(data)
          setIsConnected(true)
          setLastUpdated(new Date())
        } else {
          setIsConnected(false)
        }
      } catch (error) {
        setIsConnected(false)
      }
    }

    // Check immediately
    checkHealth()

    // Poll every 2 seconds
    const interval = setInterval(checkHealth, 2000)

    return () => clearInterval(interval)
  }, [])

  return { health, isConnected, lastUpdated }
}
