import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  useConsciousness,
  ConsciousnessProvider,
  ConsciousnessStage,
  useConsciousnessStage,
  useConsciousnessScaling,
  useSacredAdaptation,
  analyzeConsciousnessEvolution,
} from '../useConsciousness';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string): string | null => store[key] || null),
    setItem: jest.fn((key: string, value: string): void => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string): void => {
      delete store[key];
    }),
    clear: jest.fn((): void => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock consciousnessScaling - correct path is ../../sacred/geometry
jest.mock('../../sacred/geometry', () => ({
  consciousnessScaling: jest.fn((level: number) => Math.max(0.5, Math.min(2.0, level * 2))),
}));

describe('useConsciousness', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('ConsciousnessContext', () => {
    it('should throw error when used outside provider', () => {
      expect(() => renderHook(() => useConsciousness())).toThrow(
        'useConsciousness must be used within a ConsciousnessProvider'
      );
    });

    it('should provide consciousness context when used with provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ConsciousnessProvider>{children}</ConsciousnessProvider>
      );

      const { result } = renderHook(() => useConsciousness(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.consciousnessLevel).toBe(0.3);
      expect(result.current.isEvolving).toBe(false);
    });
  });

  describe('ConsciousnessProvider', () => {
    it('should initialize with custom initial level', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ConsciousnessProvider initialLevel={0.75}>{children}</ConsciousnessProvider>
      );

      const { result } = renderHook(() => useConsciousness(), { wrapper });

      expect(result.current.consciousnessLevel).toBe(0.75);
    });

    it('should use custom storage key', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ConsciousnessProvider storageKey="custom-key">{children}</ConsciousnessProvider>
      );

      const { result } = renderHook(() => useConsciousness(), { wrapper });

      act(() => {
        result.current.setConsciousnessLevel(0.8);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('custom-key', '0.8');
    });

    it('should ignore invalid values in localStorage', () => {
      localStorageMock.setItem('bizra-consciousness-level', 'invalid');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ConsciousnessProvider>{children}</ConsciousnessProvider>
      );

      const { result } = renderHook(() => useConsciousness(), { wrapper });

      expect(result.current.consciousnessLevel).toBe(0.3); // default
    });

    it('should clamp consciousness levels', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ConsciousnessProvider>{children}</ConsciousnessProvider>
      );

      const { result } = renderHook(() => useConsciousness(), { wrapper });

      act(() => result.current.setConsciousnessLevel(1.5)); // Above 1.0
      expect(result.current.consciousnessLevel).toBe(1.0);

      act(() => result.current.setConsciousnessLevel(-0.5)); // Below 0.0
      expect(result.current.consciousnessLevel).toBe(0.0);
    });
  });

  describe('Consciousness Methods', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConsciousnessProvider initialLevel={0.3}>{children}</ConsciousnessProvider>
    );

    it('should set consciousness level directly', () => {
      const { result } = renderHook(() => useConsciousness(), { wrapper });

      act(() => result.current.setConsciousnessLevel(0.8));

      expect(result.current.consciousnessLevel).toBe(0.8);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bizra-consciousness-level',
        '0.8'
      );
    });

    it('should update consciousness level with delta', () => {
      const { result } = renderHook(() => useConsciousness(), { wrapper });

      act(() => result.current.updateConsciousnessLevel(0.2));

      expect(result.current.isEvolving).toBe(true);

      // Fast-forward through animation
      act(() => jest.advanceTimersByTime(2000));

      expect(result.current.consciousnessLevel).toBe(0.5);
      expect(result.current.isEvolving).toBe(false);
    });

    it('should not evolve for small changes', () => {
      const { result } = renderHook(() => useConsciousness(), { wrapper });

      act(() => result.current.updateConsciousnessLevel(0.005)); // Below 0.01 threshold

      // Should not trigger evolution
      expect(result.current.isEvolving).toBe(false);
      expect(result.current.consciousnessLevel).toBe(0.3);
    });

    it('should handle negative evolution', () => {
      const { result } = renderHook(() => useConsciousness(), { wrapper });

      act(() => result.current.updateConsciousnessLevel(-0.15));

      act(() => jest.advanceTimersByTime(2000));

      expect(result.current.consciousnessLevel).toBe(0.15);
    });
  });

  describe('Consciousness Stages', () => {
    it('should return correct stages for different levels', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ConsciousnessProvider initialLevel={0.0}>{children}</ConsciousnessProvider>
      );

      const { result } = renderHook(() => useConsciousness(), { wrapper });

      // Test stage mapping based on actual implementation:
      // < 20% = material, < 40% = social, < 60% = awakening,
      // < 70% = integration, < 85% = transcendence, < 95% = mastery, >= 95% = enlightened
      const testCases: [number, ConsciousnessStage][] = [
        [0.05, 'material'],       // 5% -> material
        [0.25, 'social'],         // 25% -> social
        [0.45, 'awakening'],      // 45% -> awakening
        [0.65, 'integration'],    // 65% -> integration
        [0.80, 'transcendence'],  // 80% -> transcendence
        [0.90, 'mastery'],        // 90% -> mastery
        [0.98, 'enlightened'],    // 98% -> enlightened
      ];

      testCases.forEach(([level, expectedStage]) => {
        act(() => result.current.setConsciousnessLevel(level));
        expect(result.current.getConsciousnessStage()).toBe(expectedStage);
      });
    });
  });

  describe('Specialized Hooks', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConsciousnessProvider initialLevel={0.3}>{children}</ConsciousnessProvider>
    );

    it('should return correct consciousness stage with specialized hook', () => {
      const { result } = renderHook(() => useConsciousnessStage(), { wrapper });

      // 0.3 = 30% which is < 40%, so 'social'
      expect(result.current).toBe('social');
    });

    it('should calculate consciousness scaling correctly', () => {
      const { result } = renderHook(() => useConsciousnessScaling(), { wrapper });

      expect(result.current).toBeGreaterThanOrEqual(0.5);
      expect(result.current).toBeLessThanOrEqual(2.0);
    });

    it('should provide sacred adaptation based on consciousness stage', () => {
      const { result } = renderHook(
        () =>
          useSacredAdaptation(
            'material-value',
            'awakening-value',
            'integration-value',
            'transcendence-value',
            'mastery-value'
          ),
        { wrapper }
      );

      // 0.3 = 30% is 'social' stage, which maps to materialLevel
      expect(result.current).toBe('material-value');
    });
  });

  describe('Consciousness Analysis', () => {
    it('should analyze evolution with no history', () => {
      const analysis = analyzeConsciousnessEvolution([]);
      expect(analysis).toBeNull();
    });

    it('should analyze basic evolution history', () => {
      const history = [
        {
          timestamp: Date.now(),
          previousLevel: 0.1,
          newLevel: 0.15,
          catalyst: 'meditation',
          sacredResponse: 'Good work',
        },
        {
          timestamp: Date.now() + 1000,
          previousLevel: 0.15,
          newLevel: 0.2,
          catalyst: 'reading',
          sacredResponse: 'Continue',
        },
      ];

      const analysis = analyzeConsciousnessEvolution(history);

      expect(analysis).toBeDefined();
      expect(analysis?.totalGrowth).toBe(0.1);
    });

    it('should detect integration phases', () => {
      const history = [
        {
          timestamp: Date.now(),
          previousLevel: 0.1,
          newLevel: 0.1001,
          catalyst: 'meditation',
          sacredResponse: 'Good work',
        },
      ];

      const analysis = analyzeConsciousnessEvolution(history);

      expect(analysis?.sacredMomentum).toBe('integration');
    });
  });
});
