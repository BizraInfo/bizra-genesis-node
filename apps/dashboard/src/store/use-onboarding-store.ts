import { create } from "zustand"
import type { OnboardingState, SystemSpecs, UserProfile, Agent, OnboardingStep } from "@/types/onboarding"

interface OnboardingStore extends OnboardingState {
  setStep: (step: OnboardingStep) => void
  setSystemSpecs: (specs: SystemSpecs) => void
  setUserProfile: (profile: UserProfile) => void
  updateAgentStatus: (agentName: string, status: Agent["status"]) => void
  setProgress: (progress: number) => void
  setPhase: (phase: number) => void
  reset: () => void
}

const initialAgents: Agent[] = [
  {
    name: "Strategic Planner",
    role: "High-level planning and goal decomposition",
    icon: "🎯",
    color: "#FFD700",
    status: "pending",
  },
  {
    name: "Research Assistant",
    role: "Information gathering and analysis",
    icon: "🔍",
    color: "#4169E1",
    status: "pending",
  },
  {
    name: "Creative Designer",
    role: "Visual and creative problem solving",
    icon: "🎨",
    color: "#FF6347",
    status: "pending",
  },
  { name: "Data Analyst", role: "Quantitative analysis and insights", icon: "📊", color: "#32CD32", status: "pending" },
  {
    name: "Security Guardian",
    role: "Privacy and security enforcement",
    icon: "🛡️",
    color: "#8A2BE2",
    status: "pending",
  },
  {
    name: "Learning Optimizer",
    role: "Continuous improvement and adaptation",
    icon: "📈",
    color: "#FF1493",
    status: "pending",
  },
  { name: "Task Coordinator", role: "Multi-agent orchestration", icon: "🔄", color: "#00CED1", status: "pending" },
]

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  currentStep: "welcome",
  systemSpecs: null,
  userProfile: null,
  agents: initialAgents,
  progress: 0,
  currentPhase: 0,

  setStep: (step) => set({ currentStep: step }),
  setSystemSpecs: (specs) => set({ systemSpecs: specs }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  updateAgentStatus: (name, status) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.name === name ? { ...a, status } : a)),
    })),
  setProgress: (progress) => set({ progress }),
  setPhase: (phase) => set({ currentPhase: phase }),
  reset: () =>
    set({
      currentStep: "welcome",
      systemSpecs: null,
      userProfile: null,
      agents: initialAgents,
      progress: 0,
      currentPhase: 0,
    }),
}))
