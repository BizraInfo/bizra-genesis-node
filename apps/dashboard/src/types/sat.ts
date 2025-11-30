// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  SAT-LAB v0.1 - TYPE DEFINITIONS                                        ║
// ║  BIZRA LAB's Internal Marketing & Growth Team Types                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

export type SatOutboxStatus = 'draft' | 'approved' | 'published' | 'rejected';

export interface SatOutboxItem {
  id: string;
  agent_type: string;
  channel_type: string;
  content_title?: string | null;
  content_body: string;
  schedule_date?: string | null;
  status: SatOutboxStatus;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  engagement_metrics?: Record<string, any> | null;
}

export interface SatRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category?: string | null;
  recommendation: string;
  rationale?: string | null;
  actionable_by?: string | null;
  created_at: string;
}

export interface SatActivity {
  id: string;
  agent_type: string;
  action_type: string;
  action_details?: Record<string, any> | null;
  impact_score?: number | null;
  created_at: string;
}

// API Response wrappers
export interface SatApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Content generation result
export interface SatContentGenerationResult {
  outboxItems: SatOutboxItem[];
  recommendations: SatRecommendation[];
  generatedAt: string;
}
