/**
 * BIZRA Node0 - API Client
 * Document ID: BIZRA-NODE0-v1.0.0-GENESIS
 * 
 * TypeScript client for interacting with the BIZRA Node0 Rust API.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * User Profile
 */
export interface UserProfile {
  id: string;
  user_id: string;
  seed_state: 'dreamer' | 'builder' | 'learner' | 'healer' | 'provider';
  primary_pat_role: string;
  goals: string[];
  time_available_weekly: number | null;
  created_at: string;
}

/**
 * PAT Agent
 */
export interface PatAgent {
  role: string;
  model: string;
  description: string;
  available: boolean;
  backend: 'ollama' | 'lmstudio';  // Which inference backend this agent uses
}

/**
 * PAT Chat Response
 */
export interface PatChatResponse {
  response: string;
  agent: string;
  model: string;
  latency_ms: number;
  ihsan_score: number;
  backend_used: 'ollama' | 'lmstudio';
}

/**
 * PoI Event
 */
export interface PoiEvent {
  id: string;
  event_type: string;
  impact_score: number;
  ihsan_score: number;
  reward_bzc: number;
  reward_imp: number;
  verified: boolean;
  timestamp: string;
}

/**
 * PoI Statistics
 */
export interface PoiStats {
  total_events: number;
  verified_events: number;
  total_impact: number;
  avg_ihsan: number;
  total_minutes: number;
  total_bzc: number;
  total_imp: number;
}

/**
 * Resource Pool Status
 */
export interface ResourceStatus {
  node_id: string;
  cpu_cores_total: number;
  cpu_cores_allocated: number;
  gpu_enabled: boolean;
  storage_total_gb: number;
  storage_allocated_gb: number;
  status: string;
  total_tasks_processed: number;
  total_compute_hours: number;
}

/**
 * Environment Snapshot
 */
export interface EnvSnapshot {
  node_id: string;
  timestamp: string;
  hardware: {
    cpu: {
      name: string;
      cores: number;
      threads: number;
      usage_percent: number;
    };
    memory: {
      total_gb: number;
      used_gb: number;
      available_gb: number;
      usage_percent: number;
    };
    gpu?: {
      name: string;
      vram_gb: number;
    };
    storage: {
      total_gb: number;
      available_gb: number;
      usage_percent: number;
    };
    os: {
      name: string;
      version: string;
      hostname: string;
    };
  };
  services: Record<string, { status: string }>;
}

/**
 * API Client class
 */
class BizraApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: `Request failed: ${error}`,
      };
    }
  }

  // Health Check
  async getHealth(): Promise<{ status: string; node_id: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  // User Profile
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/api/user/profile');
  }

  async createProfile(data: {
    seed_state: string;
    primary_pat_role: string;
    goals?: string[];
    time_available_weekly?: number;
  }): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/api/user/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PAT (Personal Agent Team)
  async getPatAgents(): Promise<ApiResponse<PatAgent[]>> {
    return this.request<PatAgent[]>('/api/pat/agents');
  }

  async patChat(
    message: string,
    agentRole?: string
  ): Promise<ApiResponse<PatChatResponse>> {
    return this.request<PatChatResponse>('/api/pat/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        agent_role: agentRole,
      }),
    });
  }

  async configurePatAgent(primaryRole: string): Promise<ApiResponse<string>> {
    return this.request<string>('/api/pat/configure', {
      method: 'POST',
      body: JSON.stringify({ primary_role: primaryRole }),
    });
  }

  // PoI (Proof-of-Impact)
  async logPoiEvent(event: {
    event_type: string;
    impact_score: number;
    ihsan_score: number;
    duration_minutes?: number;
    description?: string;
    assets_produced?: string[];
  }): Promise<ApiResponse<PoiEvent>> {
    return this.request<PoiEvent>('/api/poi/log', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async getPoiStats(): Promise<ApiResponse<PoiStats>> {
    return this.request<PoiStats>('/api/poi/stats');
  }

  async getPoiTimeline(
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<PoiEvent[]>> {
    return this.request<PoiEvent[]>(
      `/api/poi/timeline?limit=${limit}&offset=${offset}`
    );
  }

  // Resource Pool
  async getResourceStatus(): Promise<ApiResponse<ResourceStatus>> {
    return this.request<ResourceStatus>('/api/resources/status');
  }

  async configureResources(config: {
    cpu_cores_allocated?: number;
    gpu_enabled?: boolean;
    storage_gb_allocated?: number;
    availability_hours?: string[];
  }): Promise<ApiResponse<string>> {
    return this.request<string>('/api/resources/configure', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // Environment Snapshot
  async getEnvSnapshot(): Promise<ApiResponse<EnvSnapshot>> {
    return this.request<EnvSnapshot>('/api/env/snapshot');
  }

  // Services Status
  async getServicesStatus(): Promise<ApiResponse<Record<string, string>>> {
    return this.request<Record<string, string>>('/api/services/status');
  }

  // Asset Registry
  async indexAssets(
    paths: string[],
    domain?: string
  ): Promise<ApiResponse<string>> {
    return this.request<string>('/api/assets/index', {
      method: 'POST',
      body: JSON.stringify({ paths, domain }),
    });
  }

  async searchAssets(
    query: string,
    limit: number = 10
  ): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(
      `/api/assets/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  async getAssetStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/api/assets/stats');
  }
}

// Export singleton instance
export const bizraApi = new BizraApiClient();

// Alias for backward compatibility
export const api = {
  ...bizraApi,
  // Health check alias for ops page
  healthCheck: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const health = await response.json();
      
      // Also check individual services
      let postgresOk = false;
      let redisOk = false;
      let ollamaOk = false;
      
      try {
        // The backend /health endpoint returns service status
        postgresOk = health.postgres !== false;
        redisOk = health.redis !== false;
        ollamaOk = health.ollama !== false;
      } catch {
        // Ignore individual service check failures
      }
      
      return {
        status: health.status === 'ok' || health.status === 'healthy' ? 'ok' : 'error',
        node_id: health.node_id || 'NODE0-TITAN',
        postgres: postgresOk,
        redis: redisOk,
        ollama: ollamaOk,
        uptime: health.uptime || 0,
      };
    } catch (error) {
      return {
        status: 'error',
        node_id: 'NODE0-TITAN',
        postgres: false,
        redis: false,
        ollama: false,
        uptime: 0,
      };
    }
  },
};

// Export class for custom instances
export default BizraApiClient;
