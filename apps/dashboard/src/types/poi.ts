// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - Proof of Impact (PoI) Types                       ║
// ║  TypeScript type definitions for PoI dashboard and API contracts        ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// Proof of Impact status enum - matches backend
export type PoiStatus = 'pending' | 'verified' | 'rejected' | 'revoked';

// Domain aggregate data for visualization
export interface PoiDomainAggregate {
  impactDomain: string;
  count: number;
  avgScore: number;
}

// Recent activity entries for the activity feed
export interface PoiRecentActivity {
  contributorId: string;
  impactDomain: string;
  normalizedScore: number;
  status: PoiStatus;
  timestamp: string; // ISO date string
}

// Complete PoI summary response from /api/poi/summary
export interface PoiSummaryResponse {
  totalAttestations: number;
  verifiedAttestations: number;
  avgScore: number;
  byDomain: PoiDomainAggregate[];
  recentActivity: PoiRecentActivity[];
}

// Individual PoI record from attestations endpoint
export interface PoiRecord {
  id: string;
  contributorId: string;
  impactDomain: string;
  rawScore: number;
  weight: number;
  normalizedScore: number;
  payloadHash: string;
  status: PoiStatus;
  createdAt: string; // ISO date string
  verifiedAt?: string; // ISO date string, optional
}

// API request parameters for listing attestations
export interface ListPoiParams {
  contributorId?: string;
  limit?: number;
  domain?: string;
  status?: PoiStatus;
}

// API error response structure
export interface PoiApiError {
  error: string;
  message?: string;
  status?: number;
}

// Dashboard filter state
export interface PoiFilters {
  domainFilter: string;
  statusFilter: PoiStatus | 'all';
}

// Dashboard loading states
export interface PoiDashboardState {
  loading: boolean;
  error: string | null;
  summary: PoiSummaryResponse | null;
  attestations: PoiRecord[];
  filters: PoiFilters;
}
