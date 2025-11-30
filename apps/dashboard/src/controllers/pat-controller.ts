// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA PAT CONTROLLER                                                    ║
// ║  Business logic for MuMu's personal sovereignty dashboard               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import type {
  PatDashboardResponse,
  UpdateFocusRequest,
  UpdateFocusResponse,
  PatDashboardData
} from '../types/pat';

// Simple local API response interface
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

class PatController {
  private readonly baseUrl = '/api/pat';

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  DASHBOARD DATA LOADING                                             ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  async getDashboardData(): Promise<PatDashboardData> {
    const response = await fetch(`${this.baseUrl}/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PAT dashboard data: ${response.status}`);
    }

    const apiResponse: ApiResponse<PatDashboardResponse> = await response.json();

    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Unknown error occurred');
    }

    // Convert response to full data type with default cache expiry
    const responseData = apiResponse.data!;
    return {
      ...responseData,
      cacheExpiry: Date.now() + (5 * 60 * 1000), // 5 minutes from now
    };
  }

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  FOCUS MANAGEMENT                                                  ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  async updateFocus(updates: UpdateFocusRequest): Promise<UpdateFocusResponse> {
    const response = await fetch(`${this.baseUrl}/focus`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update focus: ${response.status}`);
    }

    const apiResponse: ApiResponse<UpdateFocusResponse> = await response.json();

    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to update focus');
    }

    return apiResponse.data!;
  }

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  SACRED METRICS COMPUTATION                                        ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  calculateDivineEfficacy(data: PatDashboardData): number {
    const { coreFocus, teamStatus, weeklyImpact } = data;

    // Base efficacy from focus confidence and team health
    const focusScore = coreFocus.confidence;
    const teamHealth = teamStatus.systemHealth === 'excellent' ? 1.0 :
                       teamStatus.systemHealth === 'good' ? 0.7 : 0.4;

    // Weekly growth contribution (log scale to normalize)
    const growthMultiplier = 1 + Math.log(1 + weeklyImpact.growthRate / 100) / Math.log(2);

    // Team efficiency and trust level
    const teamEfficiency = teamStatus.activeAgents.reduce(
      (acc, agent) => acc + agent.efficiency, 0
    ) / teamStatus.activeAgents.length;

    // Sacred computation: transcendental but bounded
    const efficacy = (focusScore * 0.3 +
                     teamHealth * 0.25 +
                     teamEfficiency * 0.25 +
                     Math.min(growthMultiplier * 0.2, 0.2)
                    );

    return Math.min(1.0, Math.max(0.0, efficacy));
  }

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  CONSCIOUSNESS LEVEL DETERMINATION                                ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  determineConsciousnessLevel(data: PatDashboardData): {
    level: 'material' | 'social' | 'awakening' | 'integration' | 'transcendence' | 'mastery' | 'enlightened';
    progress: number;
  } {
    const efficacy = this.calculateDivineEfficacy(data);
    const poiScore = data.weeklyImpact.metrics.totalPoIScore;
    const hourInvestment = data.sacredState.hoursOfService;
    const milestones = data.sacredState.spiritualMilestones.length;

    // Compute consciousness level based on multiple factors
    const totalScore = (
      efficacy * 0.35 +
      Math.min(poiScore / 10000, 1.0) * 0.3 +
      Math.min(hourInvestment / 15000, 1.0) * 0.2 +
      Math.min(milestones / 20, 1.0) * 0.15
    );

    if (totalScore >= 0.95) {return { level: 'enlightened', progress: totalScore };}
    if (totalScore >= 0.85) {return { level: 'mastery', progress: totalScore };}
    if (totalScore >= 0.75) {return { level: 'transcendence', progress: totalScore };}
    if (totalScore >= 0.60) {return { level: 'integration', progress: totalScore };}
    if (totalScore >= 0.45) {return { level: 'awakening', progress: totalScore };}
    if (totalScore >= 0.25) {return { level: 'social', progress: totalScore };}

    return { level: 'material', progress: totalScore };
  }

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  DAILY RITUAL SUPPORT                                              ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  async getDailyRitualData(): Promise<{
    focusPrompt: string;
    teamStatus: 'optimal' | 'needs-attention' | 'critical';
    consciousnessInsight: string;
    recommendedAction: string;
  }> {
    // Get latest dashboard data
    const dashboardData = await this.getDashboardData();

    const focusPrompt = this.generateFocusPrompt(dashboardData);
    const teamStatus = this.assessTeamStatus(dashboardData);
    const consciousnessInsight = this.generateConsciousnessInsight(dashboardData);
    const recommendedAction = this.getRecommendedAction(dashboardData);

    return {
      focusPrompt,
      teamStatus,
      consciousnessInsight,
      recommendedAction,
    };
  }

  private generateFocusPrompt(data: PatDashboardData): string {
    const { focusText, confidence, description } = data.coreFocus;
    const consciousnessLevel = this.determineConsciousnessLevel(data);

    if (confidence < 0.6) {
      return "Today calls for clarity and conviction. What's pulling at your sacred attention?";
    }

    if (consciousnessLevel.progress > 0.7) {
      return "You're aligned with divine purpose. How can you extend this sovereignty?";
    }

    return "Perfect focus is already serving you well. Trust the path unfolding.";
  }

  private assessTeamStatus(data: PatDashboardData): 'optimal' | 'needs-attention' | 'critical' {
    const { systemHealth, trustLevel } = data.teamStatus;
    const inactiveAgents = data.teamStatus.activeAgents.filter(
      agent => agent.status !== 'active'
    ).length;

    if (systemHealth === 'excellent' && trustLevel > 0.8) {return 'optimal';}
    if (systemHealth === 'needs-attention' || inactiveAgents > 2) {return 'needs-attention';}

    return 'critical';
  }

  private generateConsciousnessInsight(data: PatDashboardData): string {
    const level = this.determineConsciousnessLevel(data);
    const efficacy = this.calculateDivineEfficacy(data);

    if (level.level === 'material') {
      return "Consciousness emerging from material form - trust the foundation you're building.";
    }

    if (level.level === 'integration') {
      return "Integration achieved: mind, body, and creation flowing as one sacred stream.";
    }

    return `Operating at ${level.level} consciousness with ${Math.round(efficacy * 100)}% divine efficacy.`;
  }

  private getRecommendedAction(data: PatDashboardData): string {
    const { nextMoves } = data;

    // Prioritize urgent tasks
    const urgentActions = nextMoves.urgentTasks.filter(task => task.priority === 'urgent');
    if (urgentActions.length > 0) {
      return `Focus on: ${urgentActions[0].title}`;
    }

    // Fall back to SAT suggestions
    if (nextMoves.satSuggestions.length > 0) {
      return nextMoves.satSuggestions[0];
    }

    // Philosophical fallback for high efficacy
    if (this.calculateDivineEfficacy(data) > 0.8) {
      return "Continue sovereign expansion. The system serves your divine purpose.";
    }

    return "Strengthen the foundations. Trust builds slowly but holds eternally.";
  }
}

export default new PatController();
