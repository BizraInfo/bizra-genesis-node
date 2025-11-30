export interface RiskSignal {
  category: string;
  name: string;
  value: number;
  weight: number;
  trend: 'improving' | 'stable' | 'deteriorating' | 'positive' | 'negative';
}

export interface RiskAssessment {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceInterval: [number, number];
  mitigationStrategies: string[];
  signalMetadata: RiskSignalMetadata;
  recommendation: string;
  timestamp: string;
  algorithmVersion: string;
}

export interface RiskSignalMetadata {
  totalSignals: number;
  signalCategories: string[][];
  dominantFactors: string[];
  trendAnalysis: string;
}

export interface DeploymentContext {
  codeChangeSize?: number;
  testCoverage?: number;
  lintResults?: { warnings?: number; errors?: number };
  buildHistory?: { successRate?: number };
  incidents24h?: number;
  deployments24h?: number;
  systemLoad?: { avg15m?: number };
  kubernetesHealth?: number;
  lastBackupAge?: number;
  monitoringCoverage?: number;
  businessImpact?: number;
  rollbackComplexity?: number;
  userStatsChange?: number;
  commitAgeHours?: number;
  deployUrgency?: number;
  deadlinePressure?: number;
  marketWindow?: number;
  commitHistory?: any[];
}
