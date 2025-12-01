// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  AGENTS CONTROLLER - Synapse-Driven Agent Management                     ║
// ║  Handles agent list fetching, status updates, WebSocket integration      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { createSynapse, executeJourney } from '@/lib/synapse/core';
import type { SynapseStore } from '@/lib/synapse/core';
import { API_BASE } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error' | 'offline';
  lastSeen: number;
  capabilities: string[];
  metrics?: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface AgentListData {
  agents: Agent[];
  totalCount: number;
  activeCount: number;
  lastUpdated: number;
}

interface AgentStatusUpdateMessage {
  type: 'AGENT_STATUS_UPDATE';
  agentId: string;
  status: Agent['status'];
}

interface AgentMetricsUpdateMessage {
  type: 'AGENT_METRICS_UPDATE';
  agentId: string;
  metrics: Partial<Agent['metrics']>;
}

interface AgentListRefreshMessage {
  type: 'AGENT_LIST_REFRESH';
}

type AgentWebSocketMessage = AgentStatusUpdateMessage | AgentMetricsUpdateMessage | AgentListRefreshMessage;

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = API_BASE;

// ─────────────────────────────────────────────────────────────────────────────
// Synapse Store
// ─────────────────────────────────────────────────────────────────────────────

export const useAgentsStore = createSynapse<AgentListData>('Agents', null, {
  clearOnReset: false, // Keep last data on reset
  clearOnFail: false,  // Keep-last-good pattern
  onSuccess: (data) => {
    console.log(`✅ Agents refreshed: ${data.activeCount}/${data.totalCount} active`);
  },
  onError: (message) => {
    console.error('❌ Agents fetch error:', message);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAgentsAPI(): Promise<AgentListData> {
  const token = localStorage.getItem('bizra_auth_token');

  const response = await fetch(`${API_URL}/api/agents`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ message: 'Failed to fetch agents' }))) as { message?: string };
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  const data = (await response.json()) as { agents?: Agent[] };

  return {
    agents: data.agents || [],
    totalCount: data.agents?.length || 0,
    activeCount: data.agents?.filter((a: Agent) => a.status === 'active').length || 0,
    lastUpdated: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshAgents() {
  return executeJourney(useAgentsStore.getState(), () => fetchAgentsAPI());
}

export function updateAgentStatus(agentId: string, status: Agent['status']) {
  const store = useAgentsStore.getState();
  const currentData = store.data;

  if (!currentData) {
    console.warn('Cannot update agent status: no data loaded');
    return;
  }

  const updatedAgents = currentData.agents.map((agent) =>
    agent.id === agentId
      ? { ...agent, status, lastSeen: Date.now() }
      : agent
  );

  const updatedData: AgentListData = {
    ...currentData,
    agents: updatedAgents,
    activeCount: updatedAgents.filter((a) => a.status === 'active').length,
    lastUpdated: Date.now(),
  };

  store.succeed(updatedData);
}

export function updateAgentMetrics(agentId: string, metrics: Partial<Agent['metrics']>) {
  const store = useAgentsStore.getState();
  const currentData = store.data;

  if (!currentData) {
    console.warn('Cannot update agent metrics: no data loaded');
    return;
  }

  const updatedAgents = currentData.agents.map((agent) =>
    agent.id === agentId
      ? { ...agent, metrics: { ...agent.metrics, ...metrics } as Agent['metrics'] }
      : agent
  );

  const updatedData: AgentListData = {
    ...currentData,
    agents: updatedAgents,
    lastUpdated: Date.now(),
  };

  store.succeed(updatedData);
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Integration
// ─────────────────────────────────────────────────────────────────────────────

export function handleAgentWebSocketMessage(message: unknown) {
  const msg = message as AgentWebSocketMessage;

  if (msg.type === 'AGENT_STATUS_UPDATE') {
    updateAgentStatus(msg.agentId, msg.status);
  } else if (msg.type === 'AGENT_METRICS_UPDATE') {
    updateAgentMetrics(msg.agentId, msg.metrics);
  } else if (msg.type === 'AGENT_LIST_REFRESH') {
    void refreshAgents();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type AgentsStore = SynapseStore<AgentListData>;
