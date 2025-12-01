// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET CONTEXT                                  ║
// ║  React context for WebSocket connection management                       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import {
  WebSocketClient,
  getWebSocketClient,
  MessageType,
  AgentResponse,
  TypingIndicator,
  PresenceUpdate,
  WebSocketMessage
} from '../services/websocket'
import { useAuth } from './AuthContext'
import { WS_URL } from '../config'

interface WebSocketContextType {
  client: WebSocketClient | null
  connected: boolean
  authenticated: boolean
  connect: () => Promise<void>
  disconnect: () => void
  sendAgentMessage: (agentId: string, content: string, metadata?: Record<string, unknown>) => void
  onAgentResponse: (handler: (response: AgentResponse) => void) => () => void
  onTypingIndicator: (handler: (indicator: TypingIndicator) => void) => () => void
  onPresenceUpdate: (handler: (update: PresenceUpdate) => void) => () => void
  sendTypingIndicator: (actorId: string, isTyping: boolean) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

interface WebSocketProviderProps {
  children: ReactNode
  url?: string
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url = WS_URL
}) => {
  const { token, isAuthenticated } = useAuth()
  const [client] = useState<WebSocketClient>(() => getWebSocketClient(url))
  const [connected, setConnected] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  const connect = useCallback(async () => {
    try {
      if (!token) {
        throw new Error('No authentication token available')
      }
      await client.connect(token)
      setConnected(true)
      setAuthenticated(true)
    } catch (error) {
      console.error('Failed to connect:', error)
      throw error
    }
  }, [client, token])

  const disconnect = useCallback(() => {
    client.disconnect()
    setConnected(false)
    setAuthenticated(false)
  }, [client])

  useEffect(() => {
    // Set up connection handlers
    client.onConnect(() => {
      console.log('✅ WebSocket connected')
      setConnected(true)
    })

    client.onDisconnect(() => {
      console.log('🔌 WebSocket disconnected')
      setConnected(false)
      setAuthenticated(false)
    })

    client.onError((error) => {
      console.error('❌ WebSocket error:', error)
    })

    // Auto-connect if user is authenticated
    if (isAuthenticated && token && !connected) {
      void connect()
    }

    return () => {
      client.disconnect()
    }
  }, [client, isAuthenticated, token, connected, connect])

  useEffect(() => {
    // Re-connect when authentication status changes
    if (isAuthenticated && token && !connected) {
      void connect()
    } else if (!isAuthenticated && connected) {
      disconnect()
    }
  }, [isAuthenticated, token, connected, connect, disconnect])

  const sendAgentMessage = (agentId: string, content: string, metadata?: Record<string, unknown>) => {
    if (!connected || !authenticated) {
      throw new Error('WebSocket not connected or authenticated')
    }
    client.sendAgentMessage(agentId, content, metadata)
  }

  const onAgentResponse = (handler: (response: AgentResponse) => void) => {
    const messageHandler = (message: WebSocketMessage) => {
      handler(message.payload as AgentResponse)
    }
    client.on(MessageType.AgentResponse, messageHandler)
    return () => client.off(MessageType.AgentResponse, messageHandler)
  }

  const onTypingIndicator = (handler: (indicator: TypingIndicator) => void) => {
    const messageHandler = (message: WebSocketMessage) => {
      handler(message.payload as TypingIndicator)
    }
    client.on(MessageType.TypingIndicator, messageHandler)
    return () => client.off(MessageType.TypingIndicator, messageHandler)
  }

  const onPresenceUpdate = (handler: (update: PresenceUpdate) => void) => {
    const messageHandler = (message: WebSocketMessage) => {
      handler(message.payload as PresenceUpdate)
    }
    client.on(MessageType.PresenceUpdate, messageHandler)
    return () => client.off(MessageType.PresenceUpdate, messageHandler)
  }

  const sendTypingIndicator = (actorId: string, isTyping: boolean) => {
    if (connected && authenticated) {
      client.sendTypingIndicator(actorId, isTyping)
    }
  }

  const value: WebSocketContextType = {
    client,
    connected,
    authenticated,
    connect,
    disconnect,
    sendAgentMessage,
    onAgentResponse,
    onTypingIndicator,
    onPresenceUpdate,
    sendTypingIndicator
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
