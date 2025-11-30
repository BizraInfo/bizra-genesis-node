// WebSocket Bridge for BIZRA Dashboard
// Provides real-time communication with the backend

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

export interface WebSocketBridgeConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  onStatusChange?: (status: WebSocketStatus) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error) => void;
}

export class WebSocketBridge {
  private ws: WebSocket | null = null;
  private config: WebSocketBridgeConfig;
  private reconnectCount = 0;
  private status: WebSocketStatus = 'disconnected';

  constructor(config: WebSocketBridgeConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      ...config,
    };
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.reconnectCount = 0;
        this.setStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          this.config.onMessage?.(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onerror = (event) => {
        this.setStatus('error');
        this.config.onError?.(new Error('WebSocket error'));
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      this.setStatus('error');
      this.config.onError?.(error as Error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  private attemptReconnect(): void {
    const { reconnectAttempts = 5, reconnectDelay = 1000 } = this.config;

    if (this.reconnectCount < reconnectAttempts) {
      this.reconnectCount++;
      setTimeout(() => this.connect(), reconnectDelay * this.reconnectCount);
    }
  }
}

// Default export for convenience
export default WebSocketBridge;
