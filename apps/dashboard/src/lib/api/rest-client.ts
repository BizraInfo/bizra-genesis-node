// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ SAT-LAB v0.1 - REST CLIENT                                              ║
// ║ HTTP Client for SAT Backend Communication                               ║
// ║ Node Zero Served - Architect's Internal Marketing Team                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { SatOutboxItem, SatRecommendation, SatApiResponse } from '../../types/sat';
import { API_BASE } from '../../config';

const API_BASE_URL = API_BASE;

/**
 * REST Client for SAT-LAB API
 * Handles all HTTP communication with the SAT backend endpoints
 */
class RestClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<SatApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      // Parse JSON response
      const data = await response.json();

      // If response is not ok, return error wrapped in SatApiResponse
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Return successful response
      return data as SatApiResponse<T>;
    } catch (error) {
      // Network or parse error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * GET /api/sat/outbox
   * Fetch all SAT outbox items (drafts for approval)
   */
  async getSatOutbox(): Promise<SatApiResponse<SatOutboxItem[]>> {
    return this.fetch<SatOutboxItem[]>('/api/sat/outbox');
  }

  /**
   * POST /api/sat/outbox/:id/approve
   * Approve a SAT content item for future publishing
   */
  async approveSatOutboxItem(id: string): Promise<SatApiResponse<SatOutboxItem>> {
    return this.fetch<SatOutboxItem>(`/api/sat/outbox/${id}/approve`, {
      method: 'POST',
    });
  }

  /**
   * POST /api/sat/outbox/:id/reject
   * Reject a SAT content item
   */
  async rejectSatOutboxItem(id: string): Promise<SatApiResponse<SatOutboxItem>> {
    return this.fetch<SatOutboxItem>(`/api/sat/outbox/${id}/reject`, {
      method: 'POST',
    });
  }

  /**
   * POST /api/sat/outbox/:id/publish
   * Mark content as published (manual copy-paste complete)
   */
  async markSatOutboxPublished(id: string): Promise<SatApiResponse<SatOutboxItem>> {
    return this.fetch<SatOutboxItem>(`/api/sat/outbox/${id}/publish`, {
      method: 'POST',
    });
  }

  /**
   * GET /api/sat/recommendations
   * Fetch strategic growth recommendations from SAT
   */
  async getSatRecommendations(): Promise<SatApiResponse<SatRecommendation[]>> {
    return this.fetch<SatRecommendation[]>('/api/sat/recommendations');
  }

  /**
   * POST /api/sat/trigger-cycle
   * Manually trigger SAT weekly content generation cycle
   */
  async triggerSatCycle(): Promise<SatApiResponse<{ message: string }>> {
    return this.fetch<{ message: string }>('/api/sat/trigger-cycle', {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const apiClient = new RestClient();

// Export class for testing/custom instances
export default RestClient;
