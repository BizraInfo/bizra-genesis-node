import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"

type Phase = "VOID" | "GENESIS" | "CITADEL"

interface BizraState {
  // The Core Metrics
  poi: number
  ihsan: number
  hours: number

  // UX State
  phase: Phase
  isDevMode: boolean // The "Impossible" Toggle

  // Actions
  addImpact: (amount: number) => void
  setPhase: (phase: Phase) => void
  setHours: (hours: number) => void
  toggleDevMode: () => void
}

export const useBizraStore = create<BizraState>()(
  subscribeWithSelector((set) => ({
    poi: 220181.94, // Current Node0 Baseline
    ihsan: 0.88,
    hours: 0, // Starts at 0 for the animation
    phase: "VOID",
    isDevMode: false,

    addImpact: (amount) => set((state) => ({ poi: state.poi + amount })),
    setPhase: (phase) => set({ phase }),
    setHours: (hours) => set({ hours }),
    toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
  })),
)

// Convenience selectors (to avoid over-rendering)
export const usePhase = () => useBizraStore((s) => s.phase)
export const usePoi = () => useBizraStore((s) => s.poi)
export const useHours = () => useBizraStore((s) => s.hours)
