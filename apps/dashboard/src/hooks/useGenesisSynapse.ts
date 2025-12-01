/**
 * BIZRA Node0 - Genesis Synapse Hook
 * Document ID: BIZRA-NODE0-v1.0.0-GENESIS
 * 
 * React hook for connecting to the telemetry WebSocket and
 * receiving real-time Genesis Synapse updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Genesis Synapse - Real-time telemetry message
 */
export interface GenesisSynapse {
  timestamp: string;
  nodeId: string;
  latencyUs: number;
  ihsanScore: number;
  consensusState: 'STABLE' | 'PENDING' | 'DIVERGENT';
  epoch: number;
  activeAgents: {
    PAT: number;
    SAT: number;
  };
  poiEventsLastMinute: number;
  errorRate: number;
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage: number | null;
  };
  services: {
    postgres: 'healthy' | 'unhealthy' | 'unknown';
    redis: 'healthy' | 'unhealthy' | 'unknown';
    ollama: 'healthy' | 'unhealthy' | 'unknown';
    neo4j: 'healthy' | 'unhealthy' | 'unknown';
  };
}

export interface UseGenesisSynapseOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseGenesisSynapseReturn {
  synapse: GenesisSynapse | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

const DEFAULT_WS_URL = 'ws://localhost:3002';
const DEFAULT_RECONNECT_INTERVAL = 3000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Hook for real-time Genesis Synapse telemetry
 */
export function useGenesisSynapse(
  options: UseGenesisSynapseOptions = {}
): UseGenesisSynapseReturn {
  const {
    url = DEFAULT_WS_URL,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
  } = options;

  const [synapse, setSynapse] = useState<GenesisSynapse | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        setConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log('[GenesisSynapse] Connected to telemetry stream');
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data) as GenesisSynapse;
          setSynapse(data);
        } catch (e) {
          console.warn('[GenesisSynapse] Failed to parse message:', e);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        setConnected(false);
        setConnecting(false);
        console.log('[GenesisSynapse] Disconnected:', event.code, event.reason);

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `[GenesisSynapse] Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          );
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        } else {
          setError('Max reconnection attempts reached');
        }
      };

      ws.onerror = (event) => {
        if (!mountedRef.current) return;
        console.error('[GenesisSynapse] WebSocket error:', event);
        setError('Connection error');
      };
    } catch (e) {
      setConnecting(false);
      setError(`Failed to connect: ${e}`);
    }
  }, [url, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, [maxReconnectAttempts]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Connect on mount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    synapse,
    connected,
    connecting,
    error,
    reconnect,
    disconnect,
  };
}

/**
 * Get status color based on service health
 */
export function getServiceStatusColor(
  status: 'healthy' | 'unhealthy' | 'unknown'
): string {
  switch (status) {
    case 'healthy':
      return 'text-green-500';
    case 'unhealthy':
      return 'text-red-500';
    case 'unknown':
    default:
      return 'text-yellow-500';
  }
}

/**
 * Get consensus state color
 */
export function getConsensusColor(
  state: 'STABLE' | 'PENDING' | 'DIVERGENT'
): string {
  switch (state) {
    case 'STABLE':
      return 'text-green-500';
    case 'PENDING':
      return 'text-yellow-500';
    case 'DIVERGENT':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Format latency for display
 */
export function formatLatency(latencyUs: number): string {
  if (latencyUs < 1000) {
    return `${latencyUs}μs`;
  }
  return `${(latencyUs / 1000).toFixed(2)}ms`;
}

/**
 * Format Ihsan score with color
 */
export function getIhsanColor(score: number): string {
  if (score >= 0.9) return 'text-green-400';
  if (score >= 0.85) return 'text-green-500';
  if (score >= 0.8) return 'text-yellow-500';
  if (score >= 0.7) return 'text-orange-500';
  return 'text-red-500';
}

export default useGenesisSynapse;
