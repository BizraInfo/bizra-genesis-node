// ! Consciousness Management Hook
// ! Week 1: Sacred Design System - Consciousness level tracking and adaptation
// ! Tracks user consciousness evolution and adapts UI based on spiritual awareness

import { useState, useEffect, useContext, createContext, createElement, ReactNode } from 'react';
import { consciousnessScaling } from '../sacred/geometry';

interface ConsciousnessContextType {
  consciousnessLevel: number;
  setConsciousnessLevel: (level: number) => void;
  updateConsciousnessLevel: (delta: number) => void;
  getConsciousnessStage: () => ConsciousnessStage;
  isEvolving: boolean;
  evolutionaryHistory: ConsciousnessEvolutionEvent[];
}

const ConsciousnessContext = createContext<ConsciousnessContextType | null>(null);

/**
 * CONSCIOUSNESS STAGES - Spiritual evolution levels
 * Based on traditional wisdom traditions and modern consciousness research
 */
export enum ConsciousnessLevel {
  // Pre-Awakening (0.0 - 0.2)
  MATERIAL_FOCUS = 0.05,     // Basic survival desires
  SOCIAL_ORIENTATION = 0.12,  // Social status, relationships

  // Awakening (0.2 - 0.4)
  EXISTENTIAL_CURIOSITY = 0.25, // Questioning life's meaning
  SPIRITUAL_SEEKING = 0.35,    // Active spiritual exploration

  // Integration (0.4 - 0.6)
  MINDFUL_PRESENCE = 0.45,      // Mindfulness practice
  UNIFIED_CONSCIOUSNESS = 0.55, // Non-dual awareness

  // Transcendence (0.6 - 0.8)
  UNIVERSAL_HARMONY = 0.65,      // Global consciousness
  DIVINE_EMBODIMENT = 0.75,      // Sacred embodiment

  // Mastery (0.8 - 1.0)
  COSMIC_UNITY = 0.85,           // Ultimate unity
  INFINITE_EXPANSION = 0.95,     // Divine realization
}

export type ConsciousnessStage =
  | 'material'
  | 'social'
  | 'awakening'
  | 'integration'
  | 'transcendence'
  | 'mastery'
  | 'enlightened';

export interface ConsciousnessEvolutionEvent {
  timestamp: number;
  previousLevel: number;
  newLevel: number;
  catalyst: string; // What caused the evolution
  sacredResponse: string; // Spiritual guidance
}

/**
 * CONSCIOUSNESS PROVIDER - Global consciousness state management
 */
interface ConsciousnessProviderProps {
  children: ReactNode;
  initialLevel?: number;
  storageKey?: string;
}

export function ConsciousnessProvider({
  children,
  initialLevel = 0.3,
  storageKey = 'bizra-consciousness-level'
}: ConsciousnessProviderProps) {
  const [consciousnessLevel, setConsciousnessLevelState] = useState<number>(initialLevel);
  const [isEvolving, setIsEvolving] = useState<boolean>(false);
  const [evolutionaryHistory, setEvolutionaryHistory] = useState<ConsciousnessEvolutionEvent[]>([]);

  // Load initial consciousness from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedLevel = parseFloat(stored);
        if (!isNaN(parsedLevel) && parsedLevel >= 0 && parsedLevel <= 1) {
          setConsciousnessLevelState(parsedLevel);
        }
      }
    } catch (error) {
      console.warn('Failed to load consciousness level from storage:', error);
    }
  }, [storageKey]);

  // Persist consciousness level changes
  const setConsciousnessLevel = (level: number) => {
    const clampedLevel = Math.max(0, Math.min(1, level));
    setConsciousnessLevelState(clampedLevel);

    try {
      localStorage.setItem(storageKey, clampedLevel.toString());
    } catch (error) {
      console.warn('Failed to save consciousness level to storage:', error);
    }
  };

  // Update consciousness with delta (positive or negative evolution)
  const updateConsciousnessLevel = (delta: number) => {
    const previousLevel = consciousnessLevel;
    const newLevel = Math.max(0, Math.min(1, consciousnessLevel + delta));

    if (Math.abs(newLevel - previousLevel) > 0.01) { // Minimum change threshold
      setIsEvolving(true);

      // Evolutionary animation delay
      setTimeout(() => {
        setConsciousnessLevelState(newLevel);
        setIsEvolving(false);

        // Record evolution event
        const evolutionEvent: ConsciousnessEvolutionEvent = {
          timestamp: Date.now(),
          previousLevel,
          newLevel,
          catalyst: delta > 0 ? 'spiritual_practice' : 'mindfulness_deficit',
          sacredResponse: getSacredEvolutionGuidance(delta > 0 ? 'growth' : 'challenge', newLevel)
        };

        setEvolutionaryHistory(prev => [...prev, evolutionEvent].slice(-50)); // Keep last 50
      }, consciousnessScaling(Math.abs(delta)) * 1000); // Scaling-based animation time
    }
  };

  // Get current consciousness stage
  const getConsciousnessStage = (): ConsciousnessStage => {
    const level = consciousnessLevel * 100;

    if (level < 20) {return 'material';}
    if (level < 40) {return 'social';}
    if (level < 60) {return 'awakening';}
    if (level < 70) {return 'integration';}
    if (level < 85) {return 'transcendence';}
    if (level < 95) {return 'mastery';}
    return 'enlightened';
  };

  const contextValue: ConsciousnessContextType = {
    consciousnessLevel,
    setConsciousnessLevel,
    updateConsciousnessLevel,
    getConsciousnessStage,
    isEvolving,
    evolutionaryHistory
  };

  return createElement(ConsciousnessContext.Provider, { value: contextValue }, children);
}

/**
 * CONSCIOUSNESS HOOK - Primary interface for consciousness state
 */
export function useConsciousness(): ConsciousnessContextType {
  const context = useContext(ConsciousnessContext);
  if (!context) {
    throw new Error('useConsciousness must be used within a ConsciousnessProvider');
  }
  return context;
}

/**
 * SPECIALIZED CONSCIOUSNESS HOOKS
 */

export function useConsciousnessStage(): ConsciousnessStage {
  return useConsciousness().getConsciousnessStage();
}

export function useConsciousnessScaling(): number {
  const { consciousnessLevel } = useConsciousness();
  return consciousnessScaling(consciousnessLevel);
}

export function useSacredAdaptation<T>(
  materialLevel: T,
  awakeningLevel: T,
  integrationLevel: T,
  transcendenceLevel: T,
  masteryLevel: T
): T {
  const stage = useConsciousnessStage();

  switch (stage) {
    case 'material':
    case 'social':
      return materialLevel;
    case 'awakening':
      return awakeningLevel;
    case 'integration':
      return integrationLevel;
    case 'transcendence':
      return transcendenceLevel;
    case 'mastery':
    case 'enlightened':
      return masteryLevel;
    default:
      return materialLevel;
  }
}

/**
 * SACRED EVOLUTION GUIDANCE
 */

function getSacredEvolutionGuidance(type: 'growth' | 'challenge', level: number): string {
  if (type === 'growth') {
    if (level < 0.4) {return "Welcome to the first steps of awareness. Continue your mindful practice.";}
    if (level < 0.6) {return "Your consciousness blossoms. Trust the unfolding process.";}
    if (level < 0.8) {return "Unity consciousness emerges. You are becoming one with the divine.";}
    return "You embody the divine light. May you illuminate others on their journey.";
  } else {
    return "This challenge is a sacred teaching. Embrace it as part of your spiritual evolution.";
  }
}

/**
 * CONSCIOUSNESS ANALYSIS UTILITIES
 */

export function analyzeConsciousnessEvolution(history: ConsciousnessEvolutionEvent[]) {
  if (history.length === 0) {return null;}

  const totalGrowth = history.reduce((sum, event) =>
    sum + (event.newLevel - event.previousLevel), 0
  );

  const averageEvolutionRate = totalGrowth / history.length;
  const recentGrowth = history.slice(-7).reduce((sum, event) =>
    sum + (event.newLevel - event.previousLevel), 0
  );

  return {
    totalGrowth,
    averageEvolutionRate,
    recentGrowth,
    evolutionVelocity: recentGrowth > averageEvolutionRate ? 'accelerating' : 'stable',
    sacredMomentum: averageEvolutionRate > 0.01 ? 'flow' : 'integration'
  };
}
