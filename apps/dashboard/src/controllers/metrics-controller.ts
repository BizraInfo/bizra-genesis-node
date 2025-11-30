// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  METRICS CONTROLLER - Synapse-Driven System Health & PoI Metrics         ║
// ║  Handles metrics polling, PoI stats, performance monitoring              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { createSynapse, executeJourney } from '@/lib/synapse/core';
import type { SynapseStore } from '@/lib/synapse/core';
import { API_BASE } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemMetrics {
  health: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  requestsPerSecond: number;
  avgResponseTime: number;
  errorRate: number;
}

export interface PoIMetrics {
  totalProofs: number;
  verifiedProofs: number;
  pendingProofs: number;
  avgVerificationTime: number;
  currentEpoch: number;
  epochProgress: number; // 0-100
}

export interface RewardMetrics {
  totalDistributed: number;
  pendingDistribution: number;
  topContributors: Array<{
    userId: string;
    userName: string;
    amount: number;
  }>;
}

export interface MetricsData {
  system: SystemMetrics;
  poi: PoIMetrics;
  rewards: RewardMetrics;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = API_BASE;
const POLLING_INTERVAL = 5000; // 5 seconds

// ─────────────────────────────────────────────────────────────────────────────
// Synapse Store
// ─────────────────────────────────────────────────────────────────────────────

export const useMetricsStore = createSynapse<MetricsData>('Metrics', null, {
  clearOnReset: false, // Keep last metrics on reset
  clearOnFail: false,  // Keep-last-good pattern for resilience
  onSuccess: (data) => {
    console.log(`✅ Metrics updated: ${data.system.health} | ${data.poi.totalProofs} PoI proofs`);
  },
  onError: (message) => {
    console.error('❌ Metrics fetch error:', message);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

async function fetchMetricsAPI(): Promise<MetricsData> {
  const token = localStorage.getItem('bizra_auth_token');

  const response = await fetch(`${API_URL}/api/metrics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch metrics' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  const data = await response.json();

  return {
    system: data.system || {
      health: 'healthy',
      uptime: 0,
      requestsPerSecond: 0,
      avgResponseTime: 0,
      errorRate: 0,
    },
    poi: data.poi || {
      totalProofs: 0,
      verifiedProofs: 0,
      pendingProofs: 0,
      avgVerificationTime: 0,
      currentEpoch: 0,
      epochProgress: 0,
    },
    rewards: data.rewards || {
      totalDistributed: 0,
      pendingDistribution: 0,
      topContributors: [],
    },
    timestamp: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshMetrics() {
  return executeJourney(useMetricsStore.getState(), () => fetchMetricsAPI());
}

// ─────────────────────────────────────────────────────────────────────────────
// Polling Management
// ─────────────────────────────────────────────────────────────────────────────

let pollingInterval: NodeJS.Timeout | null = null;

export function startMetricsPolling() {
  if (pollingInterval) {
    console.warn('Metrics polling already started');
    return;
  }

  // Initial fetch
  refreshMetrics();

  // Start polling
  pollingInterval = setInterval(() => {
    refreshMetrics();
  }, POLLING_INTERVAL);

  console.log(`📊 Metrics polling started (interval: ${POLLING_INTERVAL}ms)`);
}

export function stopMetricsPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('📊 Metrics polling stopped');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Integration
// ─────────────────────────────────────────────────────────────────────────────

export function handleMetricsWebSocketMessage(message: any) {
  if (message.type === 'METRICS_UPDATE') {
    // Update specific metrics without full refresh
    const store = useMetricsStore.getState();
    const currentData = store.data;

    if (!currentData) {
      refreshMetrics();
      return;
    }

    const updatedData: MetricsData = {
      ...currentData,
      ...(message.system && { system: { ...currentData.system, ...message.system } }),
      ...(message.poi && { poi: { ...currentData.poi, ...message.poi } }),
      ...(message.rewards && { rewards: { ...currentData.rewards, ...message.rewards } }),
      timestamp: Date.now(),
    };

    store.succeed(updatedData);
  } else if (message.type === 'METRICS_REFRESH') {
    refreshMetrics();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getHealthColor(health: SystemMetrics['health']): string {
  switch (health) {
    case 'healthy':
      return 'green';
    case 'degraded':
      return 'yellow';
    case 'critical':
      return 'red';
    default:
      return 'gray';
  }
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type MetricsStore = SynapseStore<MetricsData>;
