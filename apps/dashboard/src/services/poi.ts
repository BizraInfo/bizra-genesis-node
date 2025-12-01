// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - Proof of Impact (PoI) API Service                 ║
// ║  Professional API client for PoI verification endpoints                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// ════════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - Proof of Impact (PoI) API Service                 ║
// ║  Professional API client for PoI verification endpoints                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { API_BASE } from '../config';

// Base API error class for PoI endpoints
export class PoiApiError extends Error {
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
    this.name = 'PoiApiError';
    this.status = status;
    this.code = code;
    this.data = data;
    Object.setPrototypeOf(this, PoiApiError.prototype);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Generic API client with error handling
class PoiApiClient {
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
        let errorMessage = `PoI API Error: ${response.statusText}`;
        let errorData: unknown;
        let errorCode: string | undefined;

        try {
          const errorBody = (await response.json()) as unknown;
          if (isRecord(errorBody)) {
            if (typeof errorBody.message === 'string') {errorMessage = errorBody.message;}
            if (typeof errorBody.error === 'string') {errorCode = errorBody.error;}
          }
          errorData = errorBody;
        } catch {
          // Ignore JSON parse error for error responses
        }

        throw new PoiApiError(errorMessage, response.status, errorCode, errorData);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof PoiApiError) {
        throw error;
      }
      throw new PoiApiError(
        error instanceof Error ? error.message : 'Unknown PoI API error'
      );
    }
  }

  // PoI Summary endpoint - global metrics and aggregates
  async getPoiSummary() {
    return this.fetch('/api/poi/summary');
  }

  // PoI Attestations list with optional filtering
  async getPoiAttestations(params: {
    contributor_id?: string;
    limit?: number;
    domain?: string;
    status?: string;
  } = {}) {
    const search = new URLSearchParams();

    if (params.contributor_id) {
      search.set('contributor_id', params.contributor_id);
    }
    if (params.limit) {
      search.set('limit', String(params.limit));
    }
    if (params.domain) {
      search.set('domain', params.domain);
    }
    if (params.status) {
      search.set('status', params.status);
    }

    const query = search.toString();
    const endpoint = `/api/poi/attestations${query ? `?${query}` : ''}`;

    return this.fetch(endpoint);
  }

  // Get single attestation by ID
  async getPoiAttestation(id: string) {
    if (!id?.trim()) {
      throw new PoiApiError('Attestation ID is required');
    }
    return this.fetch(`/api/poi/attestations/${id}`);
  }

  // Search attestations (future enhancement)
  async searchPoiAttestations(params: {
    domain?: string;
    status?: string;
    contributor_id?: string;
    score_min?: number;
    score_max?: number;
    limit?: number;
  } = {}) {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });

    const query = search.toString();
    const endpoint = `/api/poi/search${query ? `?${query}` : ''}`;

    return this.fetch(endpoint);
  }
}

// Export singleton instance
export const poiApi = new PoiApiClient();
export default poiApi;
