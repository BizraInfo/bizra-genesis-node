// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - Rewards API Service                                ║
// ║  Professional API client for reward distribution endpoints               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { API_BASE } from '../config';

// ════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════════════════════

export class RewardsApiError extends Error {
  public status?: number;
  public code?: string;
  public data?: unknown;

  constructor(
    message: string,
    status?: number,
    code?: string,
    data?: unknown
  ) {
    super(message);
    this.name = 'RewardsApiError';
    this.status = status;
    this.code = code;
    this.data = data;
    Object.setPrototypeOf(this, RewardsApiError.prototype);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ════════════════════════════════════════════════════════════════════════════

class RewardsApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include', // Include JWT cookies for auth
      });

      if (!response.ok) {
        let errorMessage = `Rewards API Error: ${response.statusText}`;
        let errorData: unknown;
        let errorCode: string | undefined;

        try {
          const errorBody = await response.json();
          if (errorBody.message) {errorMessage = errorBody.message;}
          if (errorBody.error) {errorCode = errorBody.error;}
          errorData = errorBody;
        } catch {
          // Ignore JSON parse error for error responses
        }

        throw new RewardsApiError(errorMessage, response.status, errorCode, errorData);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof RewardsApiError) {
        throw error;
      }
      throw new RewardsApiError(
        error instanceof Error ? error.message : 'Unknown Rewards API error'
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EPOCH MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * List all reward epochs (optionally filtered by status)
   */
  async listEpochs(status?: 'active' | 'closed' | 'distributed'): Promise<EpochSummary[]> {
    const params = new URLSearchParams();
    if (status) {params.append('status', status);}
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetch<EpochSummary[]>(`/api/poi/rewards/epochs${query}`);
  }

  /**
   * Trigger epoch distribution (admin only)
   */
  async distributeEpoch(epochId: string): Promise<EpochDistributionSummary> {
    return this.fetch<EpochDistributionSummary>(
      `/api/poi/rewards/epochs/${epochId}/distribute`,
      { method: 'POST' }
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SETTLEMENT OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Submit settlement batch for epoch (admin only)
   */
  async submitSettlement(epochId: string): Promise<SettlementBatch> {
    return this.fetch<SettlementBatch>(
      `/api/poi/rewards/epochs/${epochId}/settlement/submit`,
      { method: 'POST' }
    );
  }

  /**
   * Confirm settlement batch (admin only)
   */
  async confirmSettlement(epochId: string): Promise<void> {
    return this.fetch<void>(
      `/api/poi/rewards/epochs/${epochId}/settlement/confirm`,
      { method: 'POST' }
    );
  }

  /**
   * Get settlement status for epoch
   */
  async getSettlement(epochId: string): Promise<SettlementBatch | null> {
    return this.fetch<SettlementBatch | null>(
      `/api/poi/rewards/epochs/${epochId}/settlement`
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

export interface EpochSummary {
  id: string;
  startTimestamp: string;
  endTimestamp: string;
  totalPool: string;
  status: 'active' | 'closed' | 'distributed';
  createdAt: string;
  closedAt?: string;
  distributedAt?: string;
  settlementBatchId?: string;
}

export interface EpochDistributionSummary {
  epochId: string;
  status: string;
  totalPool: string;
  contributors: number;
  totalScore: string;
  totalDistributed: string;
  closedAt?: string;
  distributedAt?: string;
}

export interface SettlementBatch {
  batchId: string;
  epochId: string;
  settlementCount: number;
  totalAmount: string;
  submittedAt: string;
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ════════════════════════════════════════════════════════════════════════════

export const rewardsApi = new RewardsApiClient();
export default rewardsApi;
