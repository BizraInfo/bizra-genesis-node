// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - ONBOARDING TYPES                               ║
// ║  Enterprise-grade type definitions for user onboarding system        ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// Step identifier type - used throughout the onboarding flow
export type OnboardingStep = "welcome" | "profile" | "scan" | "generation" | "complete"

// Full step definition for step metadata
export interface OnboardingStepDefinition {
  id: string
  title: string
  description: string
  component: string
  isRequired: boolean
  estimatedTime: number // minutes
  prerequisites?: string[]
  data?: Record<string, unknown>
}

export interface OnboardingProgress {
  currentStep: number
  completedSteps: string[]
  skippedSteps: string[]
  totalSteps: number
  startTime: Date
  lastActivity: Date
  estimatedCompletionTime: Date
  isComplete: boolean
}

export interface UserPersona {
  type: 'beginner' | 'developer' | 'researcher' | 'enterprise' | 'custom'
  name: string
  description: string
  skills: string[]
  goals: string[]
  recommendedPath: string[]
}

// Agent type for onboarding agent grid
export interface Agent {
  name: string
  role: string
  icon: string
  color: string
  status: "pending" | "activating" | "active" | "error"
}

// System specs collected during scan
export interface SystemSpecs {
  cpu: string | { model: string; cores: number; suitable: boolean }
  memory: string
  gpu?: string | { model: string; vram: string; suitable: boolean }
  os: string
  storage: string | { total: number; available: number; type: string; suitable: boolean }
  ram?: { total: number; available: number; suitable: boolean }
}

// User profile collected during profile step
export interface UserProfile {
  name: string
  email?: string
  role?: string
  company?: string
  goals?: string[]
  installPath?: string
  privacyLevel?: "standard" | "enhanced" | "maximum"
}

// OnboardingState - matches the actual store implementation
export interface OnboardingState {
  // Direct state properties (flat structure for simplicity)
  currentStep: OnboardingStep
  currentPhase: number
  progress: number
  agents: Agent[]
  systemSpecs: SystemSpecs | null
  userProfile: UserProfile | null
}

// Extended state type for complex state management
export interface OnboardingStateExtended {
  user: {
    persona?: UserPersona
    preferences: {
      theme: 'light' | 'dark' | 'auto'
      notifications: boolean
      analytics: boolean
    }
    goals: string[]
  }
  progress: OnboardingProgress
  currentStepData: Record<string, unknown>
  isLoading: boolean
  error: string | null
}

export interface OnboardingContextType {
  // State
  state: OnboardingStateExtended
  currentStep: OnboardingStepDefinition | null
  isComplete: boolean
  progress: number

  // Actions
  startOnboarding: (persona?: UserPersona) => Promise<void>
  nextStep: (stepData?: Record<string, unknown>) => Promise<void>
  previousStep: () => Promise<void>
  skipStep: (stepId: string) => Promise<void>
  completeOnboarding: () => Promise<void>
  updateUserData: (data: Partial<OnboardingStateExtended['user']>) => void
  resetOnboarding: () => Promise<void>

  // Utilities
  getRemainingSteps: () => OnboardingStepDefinition[]
  getCompletedSteps: () => OnboardingStepDefinition[]
  getEstimatedTimeRemaining: () => number
  canProceed: () => boolean
}

export interface OnboardingProviderProps {
  children: React.ReactNode
  steps?: OnboardingStepDefinition[]
  onComplete?: (data: OnboardingStateExtended) => void
  onStepChange?: (step: OnboardingStepDefinition, data: OnboardingStateExtended) => void
}

export type OnboardingAction =
  | { type: 'START_ONBOARDING'; payload: { persona?: UserPersona } }
  | { type: 'NEXT_STEP'; payload: { stepData?: Record<string, unknown> } }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SKIP_STEP'; payload: { stepId: string } }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'UPDATE_USER_DATA'; payload: Partial<OnboardingStateExtended['user']> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_ONBOARDING' }
  | { type: 'LOAD_PROGRESS'; payload: OnboardingProgress }

export interface OnboardingAnalytics {
  sessionId: string
  startTime: Date
  endTime?: Date
  stepsViewed: string[]
  stepsCompleted: string[]
  stepsSkipped: string[]
  timePerStep: Record<string, number>
  userInteractions: Array<{
    stepId: string
    action: string
    timestamp: Date
    data?: Record<string, unknown>
  }>
  completionRate: number
  userPersona?: UserPersona
}
