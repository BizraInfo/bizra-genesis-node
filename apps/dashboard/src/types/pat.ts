// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA PAT (PERSONAL AGENTIC TEAM) TYPES                                ║
// ║  Type definitions for MuMu's personal sovereignty dashboard                ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import type { ConsciousnessLevel } from '../sacred/types';

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  TRUST RECEIPT TYPES                                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

export interface TrustReceipt {
  id: string;
  runId: string;
  verificationType: 'cryptographic' | 'consensus' | 'sapient';
  verdict: 'approved' | 'rejected' | 'conditional';
  confidence: number; // 0-1
  poiJson?: object;
  catalyst: string; // What triggered this trust receipt
  agents: string[]; // Which agents participated
  createdAt: Date;
  chain?: TrustReceipt[]; // Linked receipts in sequence
}

export interface CoreFocusData {
  focusText: string;
  description: string;
  confidence: number; // 0-1
  lastUpdated: Date;
  isEditable: boolean;
}

export interface SacredStateData {
  consciousnessLevel: ConsciousnessLevel;
  divineEfficacy: number; // 0-1
  spiritualMilestones: string[];
  hoursOfService: number;
  currentPhase: 'architect' | 'founder' | 'sovereign';
}

export interface TaskCard {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'important' | 'foundational';
  impact: 'high' | 'medium' | 'low';
  estimatedTime: string; // "30 min", "2 hours", "1 week"
}

export interface NextMovesData {
  urgentTasks: TaskCard[];
  recommendedActions: {
    action: string;
    reasoning: string;
    impact: 'high' | 'medium' | 'low';
    catalyst: string; // What triggers this action
  }[];
  satSuggestions: string[]; // SAT-generated next moves
}

export interface WeeklyImpactData {
  weekStart: Date;
  metrics: {
    commitsCount: number;
    testRuns: number;
    satCycles: number;
    trustReceiptsGenerated: number;
    totalPoIScore: number;
  };
  growthRate: number; // percentage growth vs last week
  bestAchievement: string;
  consciousnessGrowth: number; // measured growth
}

export interface AgentStatus {
  name: string;
  status: 'active' | 'learning' | 'contributing';
  contributionScore: number;
  lastActivity: Date;
  efficiency: number; // 0-1
}

export interface TeamStatusData {
  activeAgents: AgentStatus[];
  systemHealth: 'excellent' | 'good' | 'needs-attention';
  lastPatMeeting: Date;
  onboardingProgress: number; // 0-1
  trustLevel: number; // 0-1
}

export interface PatDashboardData {
  coreFocus: CoreFocusData;
  sacredState: SacredStateData;
  nextMoves: NextMovesData;
  weeklyImpact: WeeklyImpactData;
  teamStatus: TeamStatusData;
  recentTrustReceipts: TrustReceipt[];
  lastUpdated: Date;
  cacheExpiry: number; // timestamp for cache invalidation
}

// API Response types
export interface PatDashboardResponse extends Omit<PatDashboardData, 'cacheExpiry'> {
  success: boolean;
  message?: string;
}

export interface UpdateFocusRequest {
  focusText: string;
  confidence: number;
  description?: string;
}

export interface UpdateFocusResponse {
  success: boolean;
  updatedData: CoreFocusData;
  message?: string;
}

// Growth Tree visualization data
export interface GrowthTreeNode {
  id: string;
  type: 'genesis' | 'architectural' | 'poi' | 'agent' | 'sape' | 'project' | 'revenue' | 'recognition';
  name: string;
  description: string;
  progress: number; // 0-1
  children?: GrowthTreeNode[];
  achievements?: string[];
  milestone?: boolean;
}
