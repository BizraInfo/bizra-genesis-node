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
 * PAT Agent Types
 */
export type PatAgent = 
  | 'MasterReasoner'
  | 'MemoryArchitect' 
  | 'CreativeSynthesizer'
  | 'DataAnalyzer'
  | 'Communicator'
  | 'ExecutionPlanner'
  | 'EthicsGuardian';

/**
 * PAT Message for chat
 */
export interface PatMessage {
  role: 'user' | 'assistant';
  content: string;
  agent?: PatAgent;
}

/**
 * PAT Chat Response
 */
export interface PatResponse {
  response: string;
  primary_agent: PatAgent;
  contributing_agents?: PatAgent[];
  session_id?: string;
  poi_generated?: number;
  latency_ms: number;
  ihsan_score: number;
  backend_used: 'ollama' | 'lmstudio';
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
 * PAT Agent Info
 */
export interface PatAgentInfo {
  role: string;
  model: string;
  description: string;
  available: boolean;
  backend: 'ollama' | 'lmstudio';
}

/**
 * PAT Chat Response (legacy format)
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
 * Plan Types
 */
export interface PlanTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
  time_estimate_minutes?: number;
  estimated_minutes?: number;
  poi_points: number;
  agent?: string;
}

export interface Plan {
  id: string;
  date: string;
  tasks: PlanTask[];
  focus_theme?: string;
  created_at: string;
  updated_at: string;
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
  description?: string | null;
  duration_minutes?: number | null;
  task_id?: string | null;
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
 * PoI Ledger Entry (for rewards page)
 */
export interface PoiLedgerEntry {
  id: string;
  type: string;
  status: 'verified' | 'pending' | 'rejected';
  reward_amount: number;
  reward_type: string;
  description: string;
  timestamp: string;
  verification_hash?: string;
}

/**
 * Resource Allocation
 */
export interface ResourceAllocation {
  compute_cores: number;
  memory_gb: number;
  storage_gb: number;
  gpu_percentage: number;
  bandwidth_mbps: number;
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
 * Asset Search Result
 */
export interface AssetSearchResult {
  id: string;
  path: string;
  domain?: string;
  name: string;
  type: string;
  size_bytes?: number;
  created_at?: string;
  relevance_score?: number;
}

/**
 * Asset Statistics
 */
export interface AssetStats {
  total_assets: number;
  total_size_bytes: number;
  by_domain: Record<string, number>;
  by_type: Record<string, number>;
  last_indexed_at?: string;
}

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error' | 'healthy';
  node_id?: string;
  postgres?: boolean;
  redis?: boolean;
  ollama?: boolean;
  uptime?: number;
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

      // Check if response is ok before parsing
      if (!response.ok) {
        // Sanitize error message to avoid leaking internal server details
        const sanitizedStatus = response.status >= 500 
          ? 'Server error. Please try again later.'
          : `Request failed (${response.status})`;
        return {
          success: false,
          error: sanitizedStatus,
        };
      }

      const data: ApiResponse<T> = await response.json();
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Request failed: ${errorMessage}`,
      };
    }
  }

  // Health Check
  async getHealth(): Promise<{ status: string; node_id: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: HTTP ${response.status}`);
    }
    const data: { status: string; node_id: string } = await response.json();
    return data;
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
  async getPatAgents(): Promise<ApiResponse<PatAgentInfo[]>> {
    return this.request<PatAgentInfo[]>('/api/pat/agents');
  }

  async patChat(
    messageOrOptions: string | {
      message: string;
      agent?: PatAgent;
      session_id?: string;
      context?: {
        recent_messages?: { role: string; content: string }[];
      };
    },
    agentRole?: string
  ): Promise<PatResponse> {
    // Handle both function signatures
    let message: string;
    let agent: string | undefined;
    let session_id: string | undefined;
    let context: Record<string, unknown> | undefined;

    if (typeof messageOrOptions === 'string') {
      message = messageOrOptions;
      agent = agentRole;
    } else {
      message = messageOrOptions.message;
      agent = messageOrOptions.agent;
      session_id = messageOrOptions.session_id;
      context = messageOrOptions.context;
    }

    const response = await this.request<PatResponse>('/api/pat/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        agent_role: agent,
        session_id,
        context,
      }),
    });

    // Return the data or throw if failed
    if (response.success && response.data) {
      return response.data;
    }
    
    // Return a mock response for graceful fallback
    return {
      response: response.error || 'Connection to PAT failed. Please check if backend is running.',
      primary_agent: (agent as PatAgent) || 'MasterReasoner',
      latency_ms: 0,
      ihsan_score: 0,
      backend_used: 'ollama',
    };
  }

  async configurePatAgent(primaryRole: string): Promise<ApiResponse<string>> {
    return this.request<string>('/api/pat/configure', {
      method: 'POST',
      body: JSON.stringify({ primary_role: primaryRole }),
    });
  }

  // Plan (Daily Planning)
  async getDailyPlan(date: string): Promise<Plan | null> {
    const response = await this.request<Plan>(`/api/plan/daily?date=${date}`);
    return response.data || null;
  }

  async generateDailyPlan(options: {
    date: string;
    context?: Record<string, unknown>;
  }): Promise<Plan | null> {
    const response = await this.request<Plan>('/api/plan/generate', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return response.data || null;
  }

  async addTask(date: string, task: Partial<PlanTask>): Promise<Plan | null> {
    const response = await this.request<Plan>('/api/plan/task', {
      method: 'POST',
      body: JSON.stringify({ date, task }),
    });
    return response.data || null;
  }

  async updateTask(taskId: string, updates: Partial<PlanTask>): Promise<Plan | null> {
    const response = await this.request<Plan>(`/api/plan/task/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.data || null;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const response = await this.request<void>(`/api/plan/task/${taskId}`, {
      method: 'DELETE',
    });
    return response.success;
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

  async getPoiLedger(options: {
    status?: string;
    limit?: number;
  }): Promise<PoiLedgerEntry[]> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());
    
    const response = await this.request<PoiLedgerEntry[]>(`/api/poi/ledger?${params.toString()}`);
    return response.data || [];
  }

  // Resource Pool
  async getResourceStatus(): Promise<ApiResponse<ResourceStatus>> {
    return this.request<ResourceStatus>('/api/resources/status');
  }

  async getResourcePool(): Promise<ResourceAllocation | null> {
    const response = await this.request<ResourceAllocation>('/api/resources/pool');
    return response.data || null;
  }

  async saveResourceAllocation(allocation: ResourceAllocation): Promise<boolean> {
    const response = await this.request<void>('/api/resources/allocate', {
      method: 'POST',
      body: JSON.stringify(allocation),
    });
    return response.success;
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
  ): Promise<ApiResponse<AssetSearchResult[]>> {
    return this.request<AssetSearchResult[]>(
      `/api/assets/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  async getAssetStats(): Promise<ApiResponse<AssetStats>> {
    return this.request<AssetStats>('/api/assets/stats');
  }
}

// Export singleton instance
export const bizraApi = new BizraApiClient();

/** Health check result type */
export interface HealthCheckResult {
  status: 'ok' | 'error';
  node_id: string;
  postgres: boolean;
  redis: boolean;
  ollama: boolean;
  uptime: number;
}

// Extended API with additional helpers
export const api = Object.assign(bizraApi, {
  // Health check alias for ops page
  healthCheck: async (): Promise<HealthCheckResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const health: HealthCheckResponse = await response.json();
      
      // Safely check individual services with proper null handling
      const postgresOk = health.postgres ?? false;
      const redisOk = health.redis ?? false;
      const ollamaOk = health.ollama ?? false;
      
      return {
        status: health.status === 'ok' || health.status === 'healthy' ? 'ok' : 'error',
        node_id: health.node_id ?? 'NODE0-TITAN',
        postgres: postgresOk,
        redis: redisOk,
        ollama: ollamaOk,
        uptime: health.uptime ?? 0,
      };
    } catch (_error: unknown) {
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
});

// Export class for custom instances
export default BizraApiClient;
