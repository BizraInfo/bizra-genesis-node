import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
// TODO: Add zustand/middleware/immer for immutable updates
// import { immer } from 'zustand/middleware/immer';

interface BizraState {
  // The Core Metrics
  poi: number;
  ihsan: number;
  hours: number;
  commits: Array<{ id: string; timestamp: number; impact: number }>; // Live commit data from backend

  // UX State
  phase: 'VOID' | 'GENESIS' | 'CITADEL' | 'ASCENSION';
  isDevMode: boolean; // The "Impossible" Toggle
  lodLevel: number; // Dynamic LOD for performance

  // Actions
  addImpact: (amount: number) => void;
  setPhase: (phase: 'VOID' | 'GENESIS' | 'CITADEL' | 'ASCENSION') => void;
  toggleDevMode: () => void;
  updateCommits: (commits: BizraState['commits']) => void;
  setLodLevel: (level: number) => void;
}

export const useBizraStore = create(
  subscribeWithSelector<BizraState>((set) => ({
    poi: 220181.94, // Current Node0 Baseline
    ihsan: 0.88,
    hours: 0, // Starts at 0 for the animation
    commits: [], // Initialized from backend
    phase: 'VOID',
    isDevMode: false,
    lodLevel: 1,

    addImpact: (amount) => set((state) => ({ poi: state.poi + amount })),
    setPhase: (phase) => set({ phase }),
    toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
    updateCommits: (commits) => set({ commits }),
    setLodLevel: (level) => set({ lodLevel: level }),
  }))
);
