/**
 * BIZRA Genesis Node - Feature Flags System
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Zero-dependency feature flag system for progressive rollout:
 * - Local-first (no external service dependency)
 * - Environment-aware
 * - User segment targeting
 * - A/B testing support
 * 
 * @module feature-flags
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type FeatureEnvironment = 'development' | 'staging' | 'production';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  environments: FeatureEnvironment[];
  rolloutPercentage: number; // 0-100
  userSegments?: string[];
  startDate?: string;
  endDate?: string;
  metadata?: Record<string, unknown>;
}

export interface FeatureFlagContext {
  userId?: string;
  userSegment?: string;
  environment: FeatureEnvironment;
  locale?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAG DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // CORE FEATURES
  // ─────────────────────────────────────────────────────────────────────────────
  
  'i18n-rtl-support': {
    id: 'i18n-rtl-support',
    name: 'RTL Language Support',
    description: 'Enable right-to-left language support for Arabic and Hebrew',
    enabled: true,
    environments: ['development', 'staging', 'production'],
    rolloutPercentage: 100,
  },

  'smart-model-selection': {
    id: 'smart-model-selection',
    name: 'Smart Model Selection',
    description: 'AI-powered model selection based on hardware capabilities',
    enabled: true,
    environments: ['development', 'staging', 'production'],
    rolloutPercentage: 100,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPERIMENTAL FEATURES
  // ─────────────────────────────────────────────────────────────────────────────

  'voice-interaction': {
    id: 'voice-interaction',
    name: 'Voice Interaction',
    description: 'Enable voice commands and text-to-speech for PAT agents',
    enabled: false,
    environments: ['development'],
    rolloutPercentage: 0,
    metadata: {
      requiresPermission: 'microphone',
      minBrowserVersion: { chrome: 90, firefox: 88, safari: 14 },
    },
  },

  'offline-mode': {
    id: 'offline-mode',
    name: 'Offline Mode',
    description: 'Full offline functionality with service worker caching',
    enabled: true,
    environments: ['development', 'staging'],
    rolloutPercentage: 50,
  },

  'advanced-analytics': {
    id: 'advanced-analytics',
    name: 'Advanced Analytics Dashboard',
    description: 'Detailed analytics and insights for power users',
    enabled: true,
    environments: ['development', 'staging', 'production'],
    rolloutPercentage: 100,
    userSegments: ['power-user', 'admin'],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BETA FEATURES
  // ─────────────────────────────────────────────────────────────────────────────

  'multi-agent-orchestration': {
    id: 'multi-agent-orchestration',
    name: 'Multi-Agent Orchestration',
    description: 'Enable multiple PAT agents to collaborate on complex tasks',
    enabled: false,
    environments: ['development'],
    rolloutPercentage: 10,
    metadata: {
      beta: true,
      minModels: 2,
    },
  },

  'knowledge-graph-visualization': {
    id: 'knowledge-graph-visualization',
    name: 'Knowledge Graph Visualization',
    description: '3D visualization of the hypergraph knowledge structure',
    enabled: true,
    environments: ['development', 'staging'],
    rolloutPercentage: 75,
    metadata: {
      requiresWebGL: true,
    },
  },

  'poi-staking': {
    id: 'poi-staking',
    name: 'PoI Staking',
    description: 'Stake PoI tokens for enhanced network participation',
    enabled: false,
    environments: [],
    rolloutPercentage: 0,
    startDate: '2025-Q2',
    metadata: {
      comingSoon: true,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // UI/UX FEATURES
  // ─────────────────────────────────────────────────────────────────────────────

  'dark-mode-auto': {
    id: 'dark-mode-auto',
    name: 'Auto Dark Mode',
    description: 'Automatically switch theme based on system preferences',
    enabled: true,
    environments: ['development', 'staging', 'production'],
    rolloutPercentage: 100,
  },

  'reduced-motion': {
    id: 'reduced-motion',
    name: 'Reduced Motion',
    description: 'Respect user preferences for reduced motion',
    enabled: true,
    environments: ['development', 'staging', 'production'],
    rolloutPercentage: 100,
  },

  'compact-navigation': {
    id: 'compact-navigation',
    name: 'Compact Navigation',
    description: 'Minimized navigation for more screen real estate',
    enabled: true,
    environments: ['development', 'staging', 'production'],
    rolloutPercentage: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAG ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class FeatureFlagEngine {
  private static instance: FeatureFlagEngine;
  private context: FeatureFlagContext;
  private overrides: Map<string, boolean> = new Map();
  private evaluationCache: Map<string, boolean> = new Map();

  private constructor() {
    this.context = this.detectContext();
    this.loadOverrides();
  }

  static getInstance(): FeatureFlagEngine {
    if (!FeatureFlagEngine.instance) {
      FeatureFlagEngine.instance = new FeatureFlagEngine();
    }
    return FeatureFlagEngine.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTEXT DETECTION
  // ─────────────────────────────────────────────────────────────────────────────

  private detectContext(): FeatureFlagContext {
    const environment = this.detectEnvironment();
    const deviceType = this.detectDeviceType();
    
    return {
      environment,
      deviceType,
      locale: typeof window !== 'undefined' 
        ? localStorage.getItem('bizra-language') || navigator.language 
        : 'en',
      userId: typeof window !== 'undefined'
        ? localStorage.getItem('bizra_node_id') || undefined
        : undefined,
    };
  }

  private detectEnvironment(): FeatureEnvironment {
    if (typeof window === 'undefined') return 'production';
    
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    if (hostname.includes('staging') || hostname.includes('preview')) {
      return 'staging';
    }
    return 'production';
  }

  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OVERRIDE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  private loadOverrides(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('bizra_feature_overrides');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          this.overrides.set(key, Boolean(value));
        });
      }
    } catch {
      // Ignore parse errors
    }
  }

  private saveOverrides(): void {
    if (typeof window === 'undefined') return;

    const obj: Record<string, boolean> = {};
    this.overrides.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem('bizra_feature_overrides', JSON.stringify(obj));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVALUATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a feature is enabled
   */
  isEnabled(featureId: string): boolean {
    // Check cache first
    if (this.evaluationCache.has(featureId)) {
      return this.evaluationCache.get(featureId)!;
    }

    const result = this.evaluate(featureId);
    this.evaluationCache.set(featureId, result);
    return result;
  }

  private evaluate(featureId: string): boolean {
    // Check for override
    if (this.overrides.has(featureId)) {
      return this.overrides.get(featureId)!;
    }

    const flag = FEATURE_FLAGS[featureId];
    if (!flag) {
      console.warn(`[FeatureFlags] Unknown feature: ${featureId}`);
      return false;
    }

    // Check if enabled at all
    if (!flag.enabled) return false;

    // Check environment
    if (!flag.environments.includes(this.context.environment)) {
      return false;
    }

    // Check user segment
    if (flag.userSegments && flag.userSegments.length > 0) {
      if (!this.context.userSegment || !flag.userSegments.includes(this.context.userSegment)) {
        return false;
      }
    }

    // Check date range
    if (flag.startDate) {
      const start = new Date(flag.startDate);
      if (Date.now() < start.getTime()) return false;
    }
    if (flag.endDate) {
      const end = new Date(flag.endDate);
      if (Date.now() > end.getTime()) return false;
    }

    // Rollout percentage (deterministic based on userId)
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashUserId(featureId);
      if (hash > flag.rolloutPercentage) return false;
    }

    return true;
  }

  private hashUserId(featureId: string): number {
    const userId = this.context.userId || 'anonymous';
    const combined = `${featureId}:${userId}`;
    
    // Simple hash to get consistent 0-100 value
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set a feature override
   */
  setOverride(featureId: string, enabled: boolean): void {
    this.overrides.set(featureId, enabled);
    this.evaluationCache.delete(featureId);
    this.saveOverrides();
  }

  /**
   * Clear a feature override
   */
  clearOverride(featureId: string): void {
    this.overrides.delete(featureId);
    this.evaluationCache.delete(featureId);
    this.saveOverrides();
  }

  /**
   * Clear all overrides
   */
  clearAllOverrides(): void {
    this.overrides.clear();
    this.evaluationCache.clear();
    this.saveOverrides();
  }

  /**
   * Get all feature flags with their current state
   */
  getAllFlags(): Array<FeatureFlag & { currentlyEnabled: boolean }> {
    return Object.values(FEATURE_FLAGS).map(flag => ({
      ...flag,
      currentlyEnabled: this.isEnabled(flag.id),
    }));
  }

  /**
   * Get a specific flag definition
   */
  getFlag(featureId: string): FeatureFlag | undefined {
    return FEATURE_FLAGS[featureId];
  }

  /**
   * Update context
   */
  updateContext(updates: Partial<FeatureFlagContext>): void {
    this.context = { ...this.context, ...updates };
    this.evaluationCache.clear();
  }

  /**
   * Get current context
   */
  getContext(): FeatureFlagContext {
    return { ...this.context };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const featureFlags = FeatureFlagEngine.getInstance();

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to check if a feature is enabled
 */
export function useFeatureFlag(featureId: string): boolean {
  const [enabled, setEnabled] = useState(() => featureFlags.isEnabled(featureId));

  useEffect(() => {
    setEnabled(featureFlags.isEnabled(featureId));
  }, [featureId]);

  return enabled;
}

/**
 * Hook to get all feature flags
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState(() => featureFlags.getAllFlags());

  const refresh = useCallback(() => {
    setFlags(featureFlags.getAllFlags());
  }, []);

  const setOverride = useCallback((featureId: string, enabled: boolean) => {
    featureFlags.setOverride(featureId, enabled);
    refresh();
  }, [refresh]);

  const clearOverride = useCallback((featureId: string) => {
    featureFlags.clearOverride(featureId);
    refresh();
  }, [refresh]);

  return { flags, setOverride, clearOverride, refresh };
}

/**
 * Component wrapper for feature flags
 */
export function Feature({ 
  flag, 
  children, 
  fallback = null 
}: { 
  flag: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}): React.ReactNode {
  const enabled = useFeatureFlag(flag);
  return enabled ? children : fallback;
}
