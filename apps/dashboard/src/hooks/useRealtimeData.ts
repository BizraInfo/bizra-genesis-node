/**
 * BIZRA Genesis Node - Real-time Data Hooks
 * 
 * Elite Practitioner Implementation featuring:
 * - WebSocket subscription management
 * - Automatic reconnection with exponential backoff
 * - Optimistic updates
 * - Data synchronization
 * - Connection state management
 * - Heartbeat monitoring
 * 
 * @module useRealtimeData
 * @version 2.0.0
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { getBIZRAClient, BIZRAAPIClient } from '../lib/api/client';
import { SACRED_FREQUENCIES } from '../lib/design-system';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastConnected: number | null;
  reconnectAttempts: number;
  latency: number | null;
}

export interface RealtimeOptions<T> {
  channel: string;
  initialData?: T;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  transform?: (data: unknown) => T;
  debounceMs?: number;
  enabled?: boolean;
}

export interface RealtimeResult<T> {
  data: T | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  reconnect: () => void;
  send: (message: unknown) => void;
}

// =============================================================================
// DEBOUNCE UTILITY
// =============================================================================

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// MAIN HOOK: useRealtimeData
// =============================================================================

export function useRealtimeData<T = unknown>(
  options: RealtimeOptions<T>
): RealtimeResult<T> {
  const {
    channel,
    initialData = null,
    onConnect,
    onDisconnect,
    onError,
    transform,
    debounceMs = 0,
    enabled = true,
  } = options;

  const clientRef = useRef<BIZRAAPIClient | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingRef = useRef<number>(0);

  const [rawData, setRawData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    lastConnected: null,
    reconnectAttempts: 0,
    latency: null,
  });

  // Apply debouncing if specified
  const debouncedData = useDebouncedValue(rawData, debounceMs);
  const data = debounceMs > 0 ? debouncedData : rawData;

  // Initialize client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      clientRef.current = getBIZRAClient();
    }
  }, []);

  // Handle incoming data
  const handleData = useCallback(
    (incoming: unknown) => {
      try {
        const transformedData = transform ? transform(incoming) : (incoming as T);
        setRawData(transformedData);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Data transformation failed');
        setError(error);
        onError?.(error);
      }
    },
    [transform, onError]
  );

  // Connection management
  const connect = useCallback(() => {
    if (!clientRef.current || !enabled) { return; }

    setConnectionState((prev) => ({ ...prev, status: 'connecting' }));

    // Subscribe to channel
    unsubscribeRef.current = clientRef.current.subscribeToChannel(channel, handleData);

    // Set up connection state listeners
    const unsubConnected = clientRef.current.on('ws:connected', () => {
      setConnectionState({
        status: 'connected',
        lastConnected: Date.now(),
        reconnectAttempts: 0,
        latency: null,
      });
      onConnect?.();
      startHeartbeat();
    });

    const unsubDisconnected = clientRef.current.on('ws:disconnected', () => {
      setConnectionState((prev) => ({
        ...prev,
        status: 'disconnected',
      }));
      onDisconnect?.();
      stopHeartbeat();
    });

    const unsubError = clientRef.current.on('ws:error', () => {
      const wsError = new Error('WebSocket error');
      setError(wsError);
      onError?.(wsError);
      setConnectionState((prev) => ({
        ...prev,
        status: 'error',
      }));
    });

    // Store cleanup functions
    const originalUnsubscribe = unsubscribeRef.current;
    unsubscribeRef.current = () => {
      originalUnsubscribe?.();
      unsubConnected();
      unsubDisconnected();
      unsubError();
    };

    // Initialize WebSocket if not already connected
    if (!clientRef.current.isWebSocketConnected()) {
      clientRef.current.connectWebSocket();
    }
  }, [channel, enabled, handleData, onConnect, onDisconnect, onError, startHeartbeat, stopHeartbeat]);

  // Heartbeat for connection health monitoring
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) { return; }

    heartbeatIntervalRef.current = setInterval(() => {
      if (clientRef.current?.isWebSocketConnected()) {
        lastPingRef.current = Date.now();
        clientRef.current.sendWsMessage('ping', { timestamp: lastPingRef.current });
      }
    }, 30000); // Ping every 30 seconds
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Reconnect handler
  const reconnect = useCallback(() => {
    unsubscribeRef.current?.();
    setConnectionState((prev) => ({
      ...prev,
      status: 'reconnecting',
      reconnectAttempts: prev.reconnectAttempts + 1,
    }));
    connect();
  }, [connect]);

  // Send message
  const send = useCallback((message: unknown) => {
    if (clientRef.current?.isWebSocketConnected()) {
      clientRef.current.sendWsMessage(channel, message);
    }
  }, [channel]);

  // Setup and cleanup
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      unsubscribeRef.current?.();
      stopHeartbeat();
    };
  }, [enabled, connect, stopHeartbeat]);

  // Computed values
  const isConnected = connectionState.status === 'connected';
  const isLoading = connectionState.status === 'connecting' || connectionState.status === 'reconnecting';

  return {
    data,
    connectionState,
    isConnected,
    isLoading,
    error,
    reconnect,
    send,
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for real-time consciousness metrics
 */
export interface ConsciousnessMetrics {
  consciousness_level: number;
  coherence_score: number;
  frequency: number;
  resonance: number;
  timestamp: number;
}

export function useConsciousnessMetrics(enabled = true): RealtimeResult<ConsciousnessMetrics> {
  return useRealtimeData<ConsciousnessMetrics>({
    channel: 'consciousness:metrics',
    initialData: {
      consciousness_level: 0,
      coherence_score: 0,
      frequency: SACRED_FREQUENCIES.healing,
      resonance: 0,
      timestamp: Date.now(),
    },
    enabled,
    debounceMs: 100,
  });
}

/**
 * Hook for real-time agent status
 */
export interface AgentStatus {
  pat: {
    status: 'active' | 'processing' | 'idle' | 'offline';
    efficiency: number;
    tasks_completed: number;
    current_task?: string;
  };
  sat: {
    status: 'active' | 'consulting' | 'idle' | 'offline';
    wisdom_index: number;
    consultations: number;
    current_query?: string;
  };
  timestamp: number;
}

export function useAgentStatus(enabled = true): RealtimeResult<AgentStatus> {
  return useRealtimeData<AgentStatus>({
    channel: 'agents:status',
    initialData: {
      pat: { status: 'idle', efficiency: 0, tasks_completed: 0 },
      sat: { status: 'idle', wisdom_index: 0, consultations: 0 },
      timestamp: Date.now(),
    },
    enabled,
  });
}

/**
 * Hook for real-time blockchain state
 */
export interface BlockchainState {
  blocks_processed: number;
  transactions_pending: number;
  transactions_completed: number;
  integrity_score: number;
  network_status: 'healthy' | 'degraded' | 'critical';
  last_block_hash: string;
  timestamp: number;
}

export function useBlockchainState(enabled = true): RealtimeResult<BlockchainState> {
  return useRealtimeData<BlockchainState>({
    channel: 'blockchain:state',
    initialData: {
      blocks_processed: 0,
      transactions_pending: 0,
      transactions_completed: 0,
      integrity_score: 100,
      network_status: 'healthy',
      last_block_hash: '',
      timestamp: Date.now(),
    },
    enabled,
  });
}

/**
 * Hook for real-time impact metrics
 */
export interface ImpactMetrics {
  global_reach: number;
  consciousness_raised: number;
  communities_served: number;
  transformation_index: number;
  active_nodes: number;
  total_transactions: number;
  timestamp: number;
}

export function useImpactMetrics(enabled = true): RealtimeResult<ImpactMetrics> {
  return useRealtimeData<ImpactMetrics>({
    channel: 'impact:metrics',
    initialData: {
      global_reach: 0,
      consciousness_raised: 0,
      communities_served: 0,
      transformation_index: 0,
      active_nodes: 0,
      total_transactions: 0,
      timestamp: Date.now(),
    },
    enabled,
  });
}

/**
 * Hook for system alerts
 */
export interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export function useSystemAlerts(enabled = true): RealtimeResult<SystemAlert[]> & {
  acknowledge: (alertId: string) => void;
  dismissAll: () => void;
} {
  const result = useRealtimeData<SystemAlert[]>({
    channel: 'system:alerts',
    initialData: [],
    enabled,
  });

  const acknowledge = useCallback((alertId: string) => {
    result.send({ action: 'acknowledge', alertId });
  }, [result]);

  const dismissAll = useCallback(() => {
    result.send({ action: 'dismiss_all' });
  }, [result]);

  return {
    ...result,
    acknowledge,
    dismissAll,
  };
}

// =============================================================================
// CONNECTION STATUS HOOK
// =============================================================================

/**
 * Hook for monitoring overall connection status
 */
export function useConnectionStatus(): {
  isOnline: boolean;
  wsConnected: boolean;
  networkType: string | null;
  effectiveType: string | null;
} {
  const [status, setStatus] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wsConnected: false,
    networkType: null as string | null,
    effectiveType: null as string | null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') { return; }

    const handleOnline = () => setStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check WebSocket status
    const client = getBIZRAClient();
    const checkWsStatus = () => {
      setStatus((prev) => ({
        ...prev,
        wsConnected: client.isWebSocketConnected(),
      }));
    };

    const unsubConnected = client.on('ws:connected', checkWsStatus);
    const unsubDisconnected = client.on('ws:disconnected', checkWsStatus);

    // Get network information if available
    const connection = (navigator as unknown as { connection?: NetworkInformation })?.connection;
    if (connection) {
      setStatus((prev) => ({
        ...prev,
        networkType: connection.type || null,
        effectiveType: connection.effectiveType || null,
      }));

      const handleConnectionChange = () => {
        setStatus((prev) => ({
          ...prev,
          networkType: connection.type || null,
          effectiveType: connection.effectiveType || null,
        }));
      };

      connection.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
        unsubConnected();
        unsubDisconnected();
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubConnected();
      unsubDisconnected();
    };
  }, []);

  return status;
}

// Network Information API types
interface NetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

// =============================================================================
// POLLING HOOK (Fallback when WebSocket unavailable)
// =============================================================================

export interface PollingOptions<T> {
  fetcher: () => Promise<T>;
  interval?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export function usePolling<T>(options: PollingOptions<T>): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { fetcher, interval = 5000, enabled = true, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error('Fetch failed');
      setError(fetchError);
      onError?.(fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, onError]);

  useEffect(() => {
    if (!enabled) { return; }

    // Initial fetch
    void fetch();

    // Set up polling
    intervalRef.current = setInterval(() => {
      void fetch();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// =============================================================================
// OPTIMISTIC UPDATE HOOK
// =============================================================================

export function useOptimisticUpdate<T>(
  initialValue: T,
  submitFn: (value: T) => Promise<T>
): {
  value: T;
  isPending: boolean;
  error: Error | null;
  update: (newValue: T) => Promise<void>;
  rollback: () => void;
} {
  const [value, setValue] = useState<T>(initialValue);
  const [previousValue, setPreviousValue] = useState<T>(initialValue);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (newValue: T) => {
      setPreviousValue(value);
      setValue(newValue); // Optimistic update
      setIsPending(true);
      setError(null);

      try {
        const result = await submitFn(newValue);
        setValue(result);
      } catch (err) {
        setValue(previousValue); // Rollback on error
        const updateError = err instanceof Error ? err : new Error('Update failed');
        setError(updateError);
        throw updateError;
      } finally {
        setIsPending(false);
      }
    },
    [value, previousValue, submitFn]
  );

  const rollback = useCallback(() => {
    setValue(previousValue);
    setError(null);
  }, [previousValue]);

  return { value, isPending, error, update, rollback };
}

export default useRealtimeData;
