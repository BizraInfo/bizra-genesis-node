/**
 * BIZRA Node0 - Environment Snapshot Hook
 * Document ID: BIZRA-NODE0-v1.0.0-GENESIS
 * 
 * React hook for fetching environment snapshot from /api/env/snapshot.
 * Provides hardware info, service status, and system metrics.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { bizraApi, EnvSnapshot } from '@/lib/api';

export interface UseEnvSnapshotOptions {
  /** Auto-refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
}

export interface UseEnvSnapshotReturn {
  /** Current environment snapshot */
  snapshot: EnvSnapshot | null;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Last successful fetch timestamp */
  lastUpdated: Date | null;
}

/**
 * Hook for fetching BIZRA Node0 environment snapshot
 * 
 * @example
 * ```tsx
 * const { snapshot, loading, error, refresh } = useEnvSnapshot();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * 
 * return (
 *   <div>
 *     <h2>Node: {snapshot?.node_id}</h2>
 *     <p>CPU: {snapshot?.hardware.cpu.name}</p>
 *     <p>Memory: {snapshot?.hardware.memory.total_gb}GB</p>
 *   </div>
 * );
 * ```
 */
export function useEnvSnapshot(
  options: UseEnvSnapshotOptions = {}
): UseEnvSnapshotReturn {
  const { refreshInterval = 30000, autoRefresh = true } = options;

  const [snapshot, setSnapshot] = useState<EnvSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      setError(null);
      const response = await bizraApi.getEnvSnapshot();
      
      if (response.success && response.data) {
        setSnapshot(response.data);
        setLastUpdated(new Date());
      } else {
        setError(response.error || 'Failed to fetch environment snapshot');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(fetchSnapshot, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchSnapshot]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchSnapshot();
  }, [fetchSnapshot]);

  return {
    snapshot,
    loading,
    error,
    refresh,
    lastUpdated,
  };
}

export default useEnvSnapshot;
