import { SynapseStatus } from './core';

export enum SocketStatus {
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    DISCONNECTED = 'DISCONNECTED',
    RECONNECTING = 'RECONNECTING',
    ERROR = 'ERROR'
}

type EventHandler = (payload: any) => void;

export class SynapseSocket {
    private static instance: SynapseSocket;
    private socket: WebSocket | null = null;
    private url: string;
    private status: SocketStatus = SocketStatus.DISCONNECTED;
    private handlers: Map<string, Set<EventHandler>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private statusListeners: Set<(status: SocketStatus) => void> = new Set();

    private constructor(url: string = 'ws://localhost:3006/ws') {
        this.url = url;
    }

    public static getInstance(): SynapseSocket {
        if (!SynapseSocket.instance) {
            SynapseSocket.instance = new SynapseSocket();
        }
        return SynapseSocket.instance;
    }

    public connect(): void {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.updateStatus(SocketStatus.CONNECTING);

        try {
            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                this.updateStatus(SocketStatus.CONNECTED);
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                console.log('SynapseSocket: Connected');
            };

            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    const { type, payload } = message;
                    this.dispatch(type, payload);
                } catch (error) {
                    console.error('SynapseSocket: Failed to parse message', error);
                }
            };

            this.socket.onclose = () => {
                if (this.status !== SocketStatus.DISCONNECTED) {
                    this.handleReconnect();
                }
            };

            this.socket.onerror = (error) => {
                console.error('SynapseSocket: Error', error);
                this.updateStatus(SocketStatus.ERROR);
            };

        } catch (error) {
            console.error('SynapseSocket: Connection failed', error);
            this.handleReconnect();
        }
    }

    public disconnect(): void {
        this.updateStatus(SocketStatus.DISCONNECTED);
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    public subscribe(topic: string, handler: EventHandler): () => void {
        if (!this.handlers.has(topic)) {
            this.handlers.set(topic, new Set());
        }
        this.handlers.get(topic)?.add(handler);

        return () => {
            this.handlers.get(topic)?.delete(handler);
        };
    }

    public send(type: string, payload: any): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, payload }));
        } else {
            console.warn('SynapseSocket: Cannot send message, socket not connected');
        }
    }

    public onStatusChange(listener: (status: SocketStatus) => void): () => void {
        this.statusListeners.add(listener);
        return () => {
            this.statusListeners.delete(listener);
        };
    }

    public getStatus(): SocketStatus {
        return this.status;
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.updateStatus(SocketStatus.RECONNECTING);
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

            console.log(`SynapseSocket: Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts})`);

            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            this.updateStatus(SocketStatus.ERROR);
            console.error('SynapseSocket: Max reconnect attempts reached');
        }
    }

    private updateStatus(newStatus: SocketStatus): void {
        this.status = newStatus;
        this.statusListeners.forEach(listener => listener(newStatus));
    }

    private dispatch(topic: string, payload: any): void {
        const topicHandlers = this.handlers.get(topic);
        if (topicHandlers) {
            topicHandlers.forEach(handler => handler(payload));
        }
    }
}
