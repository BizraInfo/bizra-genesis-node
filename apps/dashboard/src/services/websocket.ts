// BIZRA GENESIS NODE - WEBSOCKET CLIENT SERVICE
// Typed WebSocket client with reconnection and defensive parsing.

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
  MetricsDashboardUpdate = 'metrics_dashboard_update',
}

export interface WebSocketMessage {
  message_type: MessageType
  payload: unknown
  timestamp: number
  message_id: string
  session_id?: string
}

export interface AgentMessage {
  agent_id: string
  content: string
  metadata?: Record<string, unknown>
  parent_id?: string
}

export interface AgentResponse {
  agent_id: string
  content: string
  metadata?: Record<string, unknown>
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
  context?: Record<string, unknown>
}

type MessagePayloadMap = {
  [MessageType.Authenticate]: { token: string }
  [MessageType.AuthResponse]: AuthResponse
  [MessageType.AgentMessage]: AgentMessage
  [MessageType.AgentResponse]: AgentResponse
  [MessageType.TypingIndicator]: TypingIndicator
  [MessageType.PresenceUpdate]: PresenceUpdate
  [MessageType.SystemMessage]: Record<string, unknown>
  [MessageType.Error]: ErrorMessage
  [MessageType.Ping]: Record<string, never>
  [MessageType.Pong]: Record<string, never>
  [MessageType.MetricsDashboardUpdate]: Record<string, unknown>
}

type MessageHandler = (message: WebSocketMessage) => void
type ErrorHandler = (error: Error) => void
type ConnectionHandler = () => void

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toError = (error: unknown): Error =>
  error instanceof Error
    ? error
    : new Error(typeof error === 'string' ? error : 'Unexpected error')

const isWebSocketMessage = (value: unknown): value is WebSocketMessage => {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.message_type === 'string' &&
    typeof value.timestamp === 'number' &&
    typeof value.message_id === 'string'
  )
}

const isAuthResponse = (value: unknown): value is AuthResponse => {
  if (!isRecord(value) || typeof value.success !== 'boolean') {
    return false
  }
  const userIdValid = value.user_id === undefined || typeof value.user_id === 'string'
  const errorValid = value.error === undefined || typeof value.error === 'string'
  const sessionValid = value.session_id === undefined || typeof value.session_id === 'string'
  return userIdValid && errorValid && sessionValid
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private readonly url: string
  private token: string | null = null
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private reconnectDelayMs = 1000
  private readonly maxReconnectDelayMs = 30000
  private isAuthenticated = false
  private shouldReconnect = true
  private readonly messageHandlers: Map<MessageType, Set<MessageHandler>> = new Map()
  private readonly errorHandlers: Set<ErrorHandler> = new Set()
  private readonly connectHandlers: Set<ConnectionHandler> = new Set()
  private readonly disconnectHandlers: Set<ConnectionHandler> = new Set()
  private pingInterval: ReturnType<typeof setInterval> | null = null

  constructor(url: string = 'ws://localhost:8080') {
    this.url = url
  }

  async connect(token?: string): Promise<void> {
    if (token) {
      this.token = token
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          this.reconnectDelayMs = 1000
          this.startPingInterval()

          const finalizeConnection = (): void => {
            this.connectHandlers.forEach(handler => handler())
            resolve()
          }

          if (this.token) {
            this.authenticate(this.token).then(finalizeConnection).catch(reject)
          } else {
            finalizeConnection()
          }
        }

        this.ws.onmessage = (event) => {
          const raw = typeof event.data === 'string' ? event.data : ''
          if (!raw) {
            return
          }
          try {
            const parsed = JSON.parse(raw) as unknown
            if (isWebSocketMessage(parsed)) {
              this.handleMessage(parsed)
            } else {
              this.emitError(new Error('Invalid WebSocket message'))
            }
          } catch (error) {
            this.emitError(toError(error))
          }
        }

        this.ws.onerror = () => {
          const error = new Error('WebSocket error')
          this.emitError(error)
          reject(error)
        }

        this.ws.onclose = () => {
          this.cleanup()
          this.disconnectHandlers.forEach(handler => handler())
          this.attemptReconnect()
        }
      } catch (error) {
        const err = toError(error)
        this.emitError(err)
        reject(err)
      }
    })
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.ws) {
      this.ws.close()
    }
    this.cleanup()
  }

  send<T extends MessageType>(messageType: T, payload: MessagePayloadMap[T]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    const message: WebSocketMessage = {
      message_type: messageType,
      payload,
      timestamp: Date.now(),
      message_id: this.generateMessageId(),
    }

    this.ws.send(JSON.stringify(message))
  }

  authenticate(token: string): Promise<AuthResponse> {
    return new Promise((resolve, reject) => {
      const handleAuth = (message: WebSocketMessage): void => {
        const payload = this.parsePayload(message.payload, isAuthResponse)
        if (!payload) {
          this.off(MessageType.AuthResponse, handleAuth)
          reject(new Error('Invalid auth response payload'))
          return
        }

        if (payload.success) {
          this.isAuthenticated = true
          resolve(payload)
        } else {
          reject(new Error(payload.error ?? 'Authentication failed'))
        }
        this.off(MessageType.AuthResponse, handleAuth)
      }

      this.on(MessageType.AuthResponse, handleAuth)
      this.send(MessageType.Authenticate, { token })
    })
  }

  sendAgentMessage(agentId: string, content: string, metadata?: Record<string, unknown>, parentId?: string): void {
    const message: AgentMessage = {
      agent_id: agentId,
      content,
      metadata,
      parent_id: parentId,
    }
    this.send(MessageType.AgentMessage, message)
  }

  sendTypingIndicator(actorId: string, isTyping: boolean): void {
    const indicator: TypingIndicator = {
      actor_id: actorId,
      is_typing: isTyping,
    }
    this.send(MessageType.TypingIndicator, indicator)
  }

  sendPresenceUpdate(userId: string, status: 'online' | 'away' | 'offline'): void {
    const update: PresenceUpdate = {
      user_id: userId,
      status,
      last_activity: Date.now(),
    }
    this.send(MessageType.PresenceUpdate, update)
  }

  on(messageType: MessageType, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set())
    }
    this.messageHandlers.get(messageType)?.add(handler)
  }

  off(messageType: MessageType, handler: MessageHandler): void {
    this.messageHandlers.get(messageType)?.delete(handler)
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.add(handler)
  }

  onConnect(handler: ConnectionHandler): void {
    this.connectHandlers.add(handler)
  }

  onDisconnect(handler: ConnectionHandler): void {
    this.disconnectHandlers.add(handler)
  }

  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  get authenticated(): boolean {
    return this.isAuthenticated
  }

  private handleMessage(message: WebSocketMessage): void {
    this.messageHandlers.get(message.message_type)?.forEach(handler => handler(message))
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.connected) {
        try {
          this.send(MessageType.Ping, {})
        } catch (error) {
          this.emitError(toError(error))
        }
      }
    }, 30000)
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    this.isAuthenticated = false
    this.ws = null
  }

  private attemptReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emitError(new Error('Max reconnection attempts reached'))
      }
      return
    }

    this.reconnectAttempts += 1
    const delay = Math.min(
      this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelayMs
    )

    setTimeout(() => {
      void this.connect(this.token ?? undefined)
    }, delay)
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }

  private parsePayload<T>(payload: unknown, guard: (value: unknown) => value is T): T | null {
    return guard(payload) ? payload : null
  }

  private emitError(error: Error): void {
    this.errorHandlers.forEach(handler => handler(error))
  }
}

let wsClient: WebSocketClient | null = null

export function getWebSocketClient(url?: string): WebSocketClient {
  if (wsClient === null) {
    wsClient = new WebSocketClient(url ?? 'ws://localhost:8080')
  }
  return wsClient
}

export function resetWebSocketClient(): void {
  if (wsClient) {
    wsClient.disconnect()
    wsClient = null
  }
}
