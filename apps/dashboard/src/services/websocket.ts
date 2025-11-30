// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - WEBSOCKET CLIENT SERVICE                           ║
// ║  Real-time agent communication with automatic reconnection               ║
// ║  Sprint 4.1 Week 31-32: Agent Interaction Interface                      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

export enum MessageType {
  Authenticate = 'authenticate',
  AuthResponse = 'auth_response',
  AgentMessage = 'agent_message',
  AgentResponse = 'agent_response',
  TypingIndicator = 'typing_indicator',
  PresenceUpdate = 'presence_update',
  SystemMessage = 'system_message',
  Error = 'error',
  Ping = 'ping',
  Pong = 'pong',
  // Dashboard metrics updates
  MetricsDashboardUpdate = 'metrics_dashboard_update'
}

export interface WebSocketMessage {
  message_type: MessageType
  payload: any
  timestamp: number
  message_id: string
  session_id?: string
}

export interface AgentMessage {
  agent_id: string
  content: string
  metadata?: any
  parent_id?: string
}

export interface AgentResponse {
  agent_id: string
  content: string
  metadata?: any
  message_id: string
  is_streaming: boolean
  is_complete: boolean
}

export interface TypingIndicator {
  actor_id: string
  is_typing: boolean
}

export interface PresenceUpdate {
  user_id: string
  status: 'online' | 'away' | 'offline'
  last_activity: number
}

export interface AuthResponse {
  success: boolean
  user_id?: string
  error?: string
  session_id?: string
}

export interface ErrorMessage {
  code: string
  message: string
  context?: any
}

type MessageHandler = (message: WebSocketMessage) => void
type ErrorHandler = (error: Error) => void
type ConnectionHandler = () => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private token: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Start at 1 second
  private maxReconnectDelay = 30000 // Max 30 seconds
  private isAuthenticated = false
  private messageHandlers: Map<MessageType, Set<MessageHandler>> = new Map()
  private errorHandlers: Set<ErrorHandler> = new Set()
  private connectHandlers: Set<ConnectionHandler> = new Set()
  private disconnectHandlers: Set<ConnectionHandler> = new Set()
  private pingInterval: ReturnType<typeof setInterval> | null = null

  constructor(url: string = 'ws://localhost:8080') {
    this.url = url
  }

  /**
   * Connect to WebSocket server
   */
  connect(token?: string): Promise<void> {
    if (token) {
      this.token = token
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected')
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000

          // Start ping interval
          this.startPingInterval()

          // Authenticate if token is available
          if (this.token) {
            this.authenticate(this.token)
              .then(() => {
                this.connectHandlers.forEach(handler => handler())
                resolve()
              })
              .catch(reject)
          } else {
            this.connectHandlers.forEach(handler => handler())
            resolve()
          }
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse message:', error)
          }
        }

        this.ws.onerror = (event) => {
          console.error('❌ WebSocket error:', event)
          const error = new Error('WebSocket error')
          this.errorHandlers.forEach(handler => handler(error))
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected')
          this.cleanup()
          this.disconnectHandlers.forEach(handler => handler())
          this.attemptReconnect()
        }
      } catch (error) {
        console.error('Failed to connect:', error)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.maxReconnectAttempts = 0 // Prevent reconnection
    if (this.ws) {
      this.ws.close()
    }
    this.cleanup()
  }

  /**
   * Send message to server
   */
  send(messageType: MessageType, payload: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    const message: Partial<WebSocketMessage> = {
      message_type: messageType,
      payload,
      timestamp: Date.now(),
      message_id: this.generateMessageId()
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Authenticate with server
   */
  authenticate(token: string): Promise<AuthResponse> {
    return new Promise((resolve, reject) => {
      const handleAuth = (message: WebSocketMessage) => {
        const response: AuthResponse = message.payload
        if (response.success) {
          this.isAuthenticated = true
          console.log('✅ Authenticated as', response.user_id)
          resolve(response)
        } else {
          console.error('❌ Authentication failed:', response.error)
          reject(new Error(response.error || 'Authentication failed'))
        }
        this.off(MessageType.AuthResponse, handleAuth)
      }

      this.on(MessageType.AuthResponse, handleAuth)
      this.send(MessageType.Authenticate, { token })
    })
  }

  /**
   * Send agent message
   */
  sendAgentMessage(agentId: string, content: string, metadata?: any, parentId?: string): void {
    const message: AgentMessage = {
      agent_id: agentId,
      content,
      metadata,
      parent_id: parentId
    }
    this.send(MessageType.AgentMessage, message)
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(actorId: string, isTyping: boolean): void {
    const indicator: TypingIndicator = {
      actor_id: actorId,
      is_typing: isTyping
    }
    this.send(MessageType.TypingIndicator, indicator)
  }

  /**
   * Send presence update
   */
  sendPresenceUpdate(userId: string, status: 'online' | 'away' | 'offline'): void {
    const update: PresenceUpdate = {
      user_id: userId,
      status,
      last_activity: Date.now()
    }
    this.send(MessageType.PresenceUpdate, update)
  }

  /**
   * Register message handler
   */
  on(messageType: MessageType, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set())
    }
    this.messageHandlers.get(messageType)!.add(handler)
  }

  /**
   * Unregister message handler
   */
  off(messageType: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.add(handler)
  }

  /**
   * Register connection handler
   */
  onConnect(handler: ConnectionHandler): void {
    this.connectHandlers.add(handler)
  }

  /**
   * Register disconnection handler
   */
  onDisconnect(handler: ConnectionHandler): void {
    this.disconnectHandlers.add(handler)
  }

  /**
   * Get connection status
   */
  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Get authentication status
   */
  get authenticated(): boolean {
    return this.isAuthenticated
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.message_type)
    if (handlers) {
      handlers.forEach(handler => handler(message))
    }
  }

  /**
   * Start ping interval
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.connected) {
        this.send(MessageType.Ping, {})
      }
    }, 30000) // Ping every 30 seconds
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    this.isAuthenticated = false
    this.ws = null
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    )

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect(this.token || undefined)
    }, delay)
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null

/**
 * Get WebSocket client singleton
 */
export function getWebSocketClient(url?: string): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient(url)
  }
  return wsClient
}

/**
 * Reset WebSocket client (for testing)
 */
export function resetWebSocketClient(): void {
  if (wsClient) {
    wsClient.disconnect()
    wsClient = null
  }
}
