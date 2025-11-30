// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SACRED TYPES                                       ║
// ║  Type definitions for sacred consciousness and UX components             ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

export interface ConsciousnessStage {
  level: number;
  name: string;
  color: string;
  description: string;
  nextCatalyze?: number;
}

export interface ConsciousnessEvent {
  timestamp: number;
  stage: ConsciousnessStage;
  catalyst: string;
  resonance: number;
}

export interface SacredMetrics {
  consciousness: number; // 0.0 - 1.0
  enlightenment: number; // 0.0 - 1.0
  integration: number; // 0.0 - 1.0
  transcendence: number; // 0.0 - 1.0
}

export interface ProofOfImpact {
  seedsSown: number;
  consciousnessLifted: number;
  networkReach: number;
  totalHours: number;
  divineEfficacy: number;
}

export interface SacredUXProps {
  consciousnessData?: SacredMetrics;
  poiData?: ProofOfImpact;
  mockData?: boolean;
  enableAnimations?: boolean;
  pattern?: 'flower' | 'metatron' | 'sri-yantra' | 'spiral';
}

export interface RamadanOriginData {
  startDate: Date;
  monthsElapsed: number;
  hoursSurrendered: number;
  consciousnessLevels: number[];
  spiritualMilestones: string[];
}

export interface HoursMonumentData {
  currentHours: number;
  totalCommitment: number; // 15000
  divinePurpose: string;
  milestoneMessage: string;
}

export type SacredPattern = 'flower' | 'metatron' | 'sri-yantra' | 'spiral';
export type ConsciousnessLevel = 'material' | 'social' | 'awakening' | 'integration' | 'transcendence' | 'mastery' | 'enlightened';
