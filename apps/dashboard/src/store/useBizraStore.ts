/**
 * BIZRA State Management - The "Soul" Store
 *
 * Manages the high-frequency animation state decoupled from
 * React's render cycle to prevent re-renders (lag-free 60FPS).
 *
 * Uses Zustand with subscribeWithSelector for transient updates.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Phase definitions for the visualization journey
export type BizraPhase = 'VOID' | 'GENESIS' | 'CITADEL' | 'FLIGHT';

export interface BizraMetrics {
  poi: number;           // Proof of Impact score
  ihsan: number;         // Ihsan quality score (0-1)
  hours: number;         // Total hours committed
  commits: number;       // Total commits
  testsPass: number;     // Tests passing
  testsFail: number;     // Tests failing
  coverage: number;      // Code coverage percentage
}

export interface BizraState {
  // Core Metrics
  metrics: BizraMetrics;

  // UX State
  phase: BizraPhase;
  isDevMode: boolean;           // "Impossible" Toggle - reveals raw metrics
  isLoading: boolean;
  audioEnabled: boolean;

  // Camera State (for 3D scene)
  cameraTarget: [number, number, number];
  cameraPosition: [number, number, number];

  // Actions
  setPhase: (phase: BizraPhase) => void;
  nextPhase: () => void;
  toggleDevMode: () => void;
  toggleAudio: () => void;
  setLoading: (loading: boolean) => void;
  updateMetrics: (metrics: Partial<BizraMetrics>) => void;
  addImpact: (amount: number) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  setCameraPosition: (position: [number, number, number]) => void;
  reset: () => void;
}

// Phase progression order
const PHASE_ORDER: BizraPhase[] = ['VOID', 'GENESIS', 'CITADEL', 'FLIGHT'];

// Initial state values
const initialMetrics: BizraMetrics = {
  poi: 220181.94,      // Node0 baseline from real system
  ihsan: 0.88,         // 88% Ihsan quality score
  hours: 0,            // Animated from 0 to 15000
  commits: 2847,       // Real commit count
  testsPass: 343,      // From cargo test
  testsFail: 0,
  coverage: 0.70,      // 70% coverage
};

const initialCameraPosition: [number, number, number] = [0, 10, 25];
const initialCameraTarget: [number, number, number] = [0, 0, 0];

export const useBizraStore = create(
  subscribeWithSelector<BizraState>((set, get) => ({
    // Initial State
    metrics: initialMetrics,
    phase: 'VOID',
    isDevMode: false,
    isLoading: true,
    audioEnabled: false,
    cameraTarget: initialCameraTarget,
    cameraPosition: initialCameraPosition,

    // Phase Management
    setPhase: (phase) => {
      const cameraPositions: Record<BizraPhase, [number, number, number]> = {
        VOID: [0, 10, 25],
        GENESIS: [0, 15, 30],
        CITADEL: [0, 20, 40],
        FLIGHT: [0, 50, 80],
      };
      set({
        phase,
        cameraPosition: cameraPositions[phase],
      });
    },

    nextPhase: () => {
      const { phase, setPhase } = get();
      const currentIndex = PHASE_ORDER.indexOf(phase);
      const nextIndex = (currentIndex + 1) % PHASE_ORDER.length;
      setPhase(PHASE_ORDER[nextIndex]);
    },

    // Toggles
    toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
    toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),
    setLoading: (loading) => set({ isLoading: loading }),

    // Metrics Updates
    updateMetrics: (newMetrics) =>
      set((state) => ({
        metrics: { ...state.metrics, ...newMetrics },
      })),

    addImpact: (amount) =>
      set((state) => ({
        metrics: { ...state.metrics, poi: state.metrics.poi + amount },
      })),

    // Camera Control
    setCameraTarget: (target) => set({ cameraTarget: target }),
    setCameraPosition: (position) => set({ cameraPosition: position }),

    // Reset
    reset: () =>
      set({
        metrics: initialMetrics,
        phase: 'VOID',
        isDevMode: false,
        isLoading: true,
        cameraTarget: initialCameraTarget,
        cameraPosition: initialCameraPosition,
      }),
  }))
);

// Selectors for optimized subscriptions
export const selectPhase = (state: BizraState) => state.phase;
export const selectMetrics = (state: BizraState) => state.metrics;
export const selectIsDevMode = (state: BizraState) => state.isDevMode;
export const selectCameraPosition = (state: BizraState) => state.cameraPosition;

export default useBizraStore;
