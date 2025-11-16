import { render, screen, waitFor, act } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '../WebSocketContext';
import { AuthContext } from '../AuthContext';
import * as websocketService from '../../services/websocket';

// Mock the websocket service
jest.mock('../../services/websocket');

// Test component that uses WebSocket context
const TestComponent = () => {
  const {
    connected,
    authenticated,
    connect,
    disconnect,
    sendAgentMessage,
    onAgentResponse,
  } = useWebSocket();

  const [lastResponse, setLastResponse] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAgentResponse(response => {
      setLastResponse(response.content);
    });
    return unsubscribe;
  }, [onAgentResponse]);

  return (
    <div>
      <div data-testid="connected">{connected.toString()}</div>
      <div data-testid="authenticated">{authenticated.toString()}</div>
      <div data-testid="last-response">{lastResponse || 'none'}</div>
      <button onClick={() => connect()}>Connect</button>
      <button onClick={() => disconnect()}>Disconnect</button>
      <button onClick={() => sendAgentMessage('agent-1', 'Hello')}>Send Message</button>
    </div>
  );
};

describe('WebSocketContext', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      authenticate: jest.fn().mockResolvedValue(undefined),
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      onError: jest.fn(),
      onMessage: jest.fn(),
      sendMessage: jest.fn(),
      isConnected: jest.fn().mockReturnValue(false),
    };

    (websocketService.getWebSocketClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockAuthContext = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    token: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  };

  const renderWithAuth = (isAuthenticated: boolean, token: string | null = null) => {
    const contextValue = {
      ...mockAuthContext,
      isAuthenticated,
      token,
      user: isAuthenticated ? { id: '1', email: 'test@example.com', name: 'Test' } : null,
    };

    return render(
      <AuthContext.Provider value={contextValue}>
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      </AuthContext.Provider>
    );
  };

  it('should provide initial disconnected state', () => {
    renderWithAuth(false);

    expect(screen.getByTestId('connected')).toHaveTextContent('false');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('should create WebSocket client on mount', () => {
    renderWithAuth(false);

    expect(websocketService.getWebSocketClient).toHaveBeenCalledWith(
      expect.stringContaining('ws://')
    );
  });

  it('should set up connection handlers', () => {
    renderWithAuth(false);

    expect(mockClient.onConnect).toHaveBeenCalled();
    expect(mockClient.onDisconnect).toHaveBeenCalled();
    expect(mockClient.onError).toHaveBeenCalled();
  });

  it('should auto-connect when authenticated', async () => {
    renderWithAuth(true, 'test-token');

    await waitFor(() => {
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  it('should handle manual connect', async () => {
    renderWithAuth(false);

    await act(async () => {
      screen.getByText('Connect').click();
    });

    await waitFor(() => {
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  it('should handle disconnect', async () => {
    renderWithAuth(true, 'test-token');

    await act(async () => {
      screen.getByText('Disconnect').click();
    });

    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it('should send agent messages', async () => {
    renderWithAuth(true, 'test-token');

    await act(async () => {
      screen.getByText('Send Message').click();
    });

    expect(mockClient.sendMessage).toHaveBeenCalledWith({
      type: expect.any(String),
      agentId: 'agent-1',
      content: 'Hello',
    });
  });

  it('should handle connection state changes', async () => {
    let connectHandler: () => void;

    mockClient.onConnect.mockImplementation((handler: () => void) => {
      connectHandler = handler;
    });

    renderWithAuth(false);

    expect(screen.getByTestId('connected')).toHaveTextContent('false');

    // Simulate connection
    await act(async () => {
      connectHandler!();
    });

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    });
  });

  it('should handle disconnection state changes', async () => {
    let disconnectHandler: () => void;

    mockClient.onDisconnect.mockImplementation((handler: () => void) => {
      disconnectHandler = handler;
    });

    renderWithAuth(true, 'test-token');

    // Simulate disconnection
    await act(async () => {
      disconnectHandler!();
    });

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    let errorHandler: (error: Error) => void;

    mockClient.onError.mockImplementation((handler: (error: Error) => void) => {
      errorHandler = handler;
    });

    renderWithAuth(false);

    // Simulate error
    await act(async () => {
      errorHandler!(new Error('Connection failed'));
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WebSocket error'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should disconnect on unmount', () => {
    const { unmount } = renderWithAuth(true, 'test-token');

    unmount();

    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it('should throw error when useWebSocket is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useWebSocket must be used within a WebSocketProvider');

    consoleSpy.mockRestore();
  });

  it('should handle agent responses through subscription', async () => {
    let messageHandler: (msg: any) => void;

    mockClient.onMessage.mockImplementation((handler: (msg: any) => void) => {
      messageHandler = handler;
      return () => {}; // unsubscribe function
    });

    renderWithAuth(true, 'test-token');

    // Simulate receiving an agent response
    await act(async () => {
      messageHandler!({
        type: 'agent_response',
        agentId: 'agent-1',
        content: 'Hello from agent',
        metadata: {},
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('last-response')).toHaveTextContent('Hello from agent');
    });
  });
});
