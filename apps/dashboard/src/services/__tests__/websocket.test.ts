import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocketClient, MessageType, getWebSocketClient, resetWebSocketClient } from '../websocket';

interface MockWebSocketInstance {
    onopen: (() => void) | null;
    onmessage: ((event: { data: string }) => void) | null;
    onclose: (() => void) | null;
    onerror: ((event: unknown) => void) | null;
    send: jest.Mock;
    close: jest.Mock;
    readyState: number;
}

describe('WebSocketClient', () => {
    let client: WebSocketClient;
    let mockWsInstance: MockWebSocketInstance;
    let mockWebSocketConstructor: jest.Mock<MockWebSocketInstance, [string]>;

    beforeEach(() => {
        resetWebSocketClient();
        jest.useFakeTimers();

        mockWsInstance = {
            onopen: null,
            onmessage: null,
            onclose: null,
            onerror: null,
            send: jest.fn(),
            close: jest.fn(),
            readyState: 1, // OPEN
        };

        mockWebSocketConstructor = jest.fn((_url: string) => mockWsInstance);
        Object.assign(mockWebSocketConstructor, {
            CONNECTING: 0,
            OPEN: 1,
            CLOSING: 2,
            CLOSED: 3,
        });
        global.WebSocket = mockWebSocketConstructor as unknown as typeof WebSocket;

        client = getWebSocketClient('ws://test.com');
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    it('should connect successfully', async () => {
        const connectPromise = client.connect();

        // Simulate connection open
        expect(mockWebSocketConstructor).toHaveBeenCalledWith('ws://test.com');
        expect(mockWsInstance.onopen).toBeDefined();
        if (mockWsInstance.onopen) {
            mockWsInstance.onopen();
        }

        await connectPromise;
        expect(client.connected).toBe(true);
    });

    it('should handle incoming messages', async () => {
        const connectPromise = client.connect();
        if (mockWsInstance.onopen) {
            mockWsInstance.onopen();
        }
        await connectPromise;

        const handler = jest.fn();
        client.on(MessageType.AgentMessage, handler);

        const message = {
            message_type: MessageType.AgentMessage,
            payload: { text: 'hello' },
            timestamp: Date.now(),
            message_id: '123'
        };

        expect(mockWsInstance.onmessage).toBeDefined();
        if (mockWsInstance.onmessage) {
            mockWsInstance.onmessage({ data: JSON.stringify(message) });
        }

        expect(handler).toHaveBeenCalledWith(message);
    });

    it('should send messages', async () => {
        const connectPromise = client.connect();
        if (mockWsInstance.onopen) {
            mockWsInstance.onopen();
        }
        await connectPromise;

        client.send(MessageType.Ping, {});

        expect(mockWsInstance.send).toHaveBeenCalledWith(expect.stringContaining('"message_type":"ping"'));
    });
});
