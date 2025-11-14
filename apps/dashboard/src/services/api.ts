// BIZRA Genesis Node - API Service
// Professional-grade API client for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ModelProvider {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  models: string[];
  latency_ms?: number;
}

export interface ModelMetrics {
  model_id: string;
  provider: string;
  total_requests: number;
  success_rate: number;
  avg_latency_ms: number;
  avg_cost_usd: number;
  avg_quality: number;
  last_updated: number;
}

export interface ThompsonSamplingStats {
  model_id: string;
  alpha: number;
  beta: number;
  success_rate: number;
  confidence_interval: [number, number];
  last_sample?: number;
}

export interface ABTestResult {
  experiment_name: string;
  variant_a: string;
  variant_b: string;
  metric: string;
  is_significant: boolean;
  p_value: number;
  effect_size: number;
  winner?: string;
  improvement_pct: number;
}

export interface CostMetrics {
  total_cost_usd: number;
  cost_per_hour: number;
  cost_per_day: number;
  budget_remaining: number;
  top_models_by_cost: Array<{
    model: string;
    cost: number;
  }>;
}

export interface StreamingMetrics {
  total_chunks: number;
  total_bytes: number;
  avg_chunk_size: number;
  throughput_mbps: number;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Provider Management
  async getProviders(): Promise<ModelProvider[]> {
    return this.fetch<ModelProvider[]>('/api/providers');
  }

  async getProviderHealth(providerId: string): Promise<ModelProvider> {
    return this.fetch<ModelProvider>(`/api/providers/${providerId}/health`);
  }

  // Model Metrics
  async getModelMetrics(): Promise<ModelMetrics[]> {
    return this.fetch<ModelMetrics[]>('/api/models/metrics');
  }

  async getModelMetricsByProvider(provider: string): Promise<ModelMetrics[]> {
    return this.fetch<ModelMetrics[]>(`/api/models/metrics?provider=${provider}`);
  }

  // Thompson Sampling
  async getThompsonSamplingStats(): Promise<ThompsonSamplingStats[]> {
    return this.fetch<ThompsonSamplingStats[]>('/api/thompson-sampling/stats');
  }

  async getThompsonLeaderboard(): Promise<Array<{
    model_id: string;
    success_rate: number;
    total_requests: number;
  }>> {
    return this.fetch('/api/thompson-sampling/leaderboard');
  }

  // A/B Testing
  async getABTestResults(): Promise<ABTestResult[]> {
    return this.fetch<ABTestResult[]>('/api/ab-testing/results');
  }

  async getActiveExperiments(): Promise<Array<{
    name: string;
    variants: string[];
    status: string;
    observations: number;
  }>> {
    return this.fetch('/api/ab-testing/experiments');
  }

  // Cost Tracking
  async getCostMetrics(): Promise<CostMetrics> {
    return this.fetch<CostMetrics>('/api/costs/metrics');
  }

  async getCostHistory(hours: number = 24): Promise<Array<{
    timestamp: number;
    cost: number;
    model: string;
  }>> {
    return this.fetch(`/api/costs/history?hours=${hours}`);
  }

  // Streaming Metrics
  async getStreamingMetrics(): Promise<StreamingMetrics> {
    return this.fetch<StreamingMetrics>('/api/streaming/metrics');
  }

  // Rate Limiting
  async getRateLimitStats(): Promise<{
    requests_per_second: number;
    current_usage: number;
    quota_remaining: number;
  }> {
    return this.fetch('/api/rate-limits/stats');
  }

  // Model Completion (for testing)
  async complete(model: string, prompt: string, options?: {
    max_tokens?: number;
    temperature?: number;
  }): Promise<{
    content: string;
    model: string;
    latency_ms: number;
    cost: number;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
  }> {
    return this.fetch('/api/complete', {
      method: 'POST',
      body: JSON.stringify({
        model,
        prompt,
        options,
      }),
    });
  }
}

export const api = new ApiService();
export default api;
