/**
 * BIZRA Node0 - Proof-of-Impact Hook
 * Document ID: BIZRA-NODE0-v1.0.1-GENESIS
 * 
 * React hook for fetching PoI statistics and timeline.
 * Provides real-time impact data for the rewards dashboard.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { bizraApi, PoiStats, PoiEvent } from '@/lib/api';

export interface UsePoIOptions {
  /** Auto-refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;
  /** Enable auto-refresh (default: false) */
  autoRefresh?: boolean;
  /** Initial limit for timeline (default: 30) */
  timelineLimit?: number;
}

export interface UsePoIReturn {
  /** PoI statistics */
  stats: PoiStats | null;
  /** Recent PoI events */
  events: PoiEvent[];
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually trigger a refresh */
  reload: () => Promise<void>;
  /** Load more events */
  loadMore: () => Promise<void>;
  /** Whether more events can be loaded */
  hasMore: boolean;
  /** Last successful fetch timestamp */
  lastUpdated: Date | null;
}

/**
 * Hook for fetching BIZRA Node0 Proof-of-Impact data
 * 
 * @example
 * ```tsx
 * const { stats, events, loading, error, reload } = usePoI();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * 
 * return (
 *   <div>
 *     <h2>Total Impact: {stats?.total_impact.toFixed(2)}</h2>
 *     <p>Average Ihsan: {stats?.avg_ihsan.toFixed(2)}</p>
 *     <p>BZC Earned: {stats?.total_bzc.toFixed(2)}</p>
 *   </div>
 * );
 * ```
 */
export function usePoI(options: UsePoIOptions = {}): UsePoIReturn {
  const { 
    refreshInterval = 30000, 
    autoRefresh = false,
    timelineLimit = 30,
  } = options;

  const [stats, setStats] = useState<PoiStats | null>(null);
  const [events, setEvents] = useState<PoiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Use ref to avoid stale closure in fetchData
  const offsetRef = useRef(0);

  const fetchData = useCallback(async (reset: boolean = true) => {
    try {
      setError(null);
      if (reset) setLoading(true);

      const currentOffset = reset ? 0 : offsetRef.current;

      // Fetch stats and timeline in parallel
      const [statsResponse, timelineResponse] = await Promise.all([
        bizraApi.getPoiStats(),
        bizraApi.getPoiTimeline(timelineLimit, currentOffset),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        setError(statsResponse.error || 'Failed to fetch PoI statistics');
      }

      if (timelineResponse.success && timelineResponse.data) {
        if (reset) {
          setEvents(timelineResponse.data);
          offsetRef.current = timelineLimit;
        } else {
          setEvents(prev => [...prev, ...timelineResponse.data!]);
          offsetRef.current += timelineLimit;
        }
        setHasMore(timelineResponse.data.length === timelineLimit);
      } else if (!statsResponse.success) {
        // Only set error if stats also failed
        setError(timelineResponse.error || 'Failed to fetch PoI timeline');
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [timelineLimit]);

  // Initial fetch
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => fetchData(true), refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  const reload = useCallback(async () => {
    offsetRef.current = 0;
    await fetchData(true);
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchData(false);
  }, [fetchData, hasMore, loading]);

  return {
    stats,
    events,
    loading,
    error,
    reload,
    loadMore,
    hasMore,
    lastUpdated,
  };
}

export default usePoI;
