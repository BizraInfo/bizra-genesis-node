// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - ONBOARDING TYPES                               ║
// ║  Enterprise-grade type definitions for user onboarding system        ║
// ╚═══════════════════════════════════════════════════════════════════════╝

export interface OnboardingStep {
  id: string
  title: string
  description: string
  component: string
  isRequired: boolean
  estimatedTime: number // minutes
  prerequisites?: string[]
  data?: Record<string, any>
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

export interface OnboardingState {
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
  currentStepData: Record<string, any>
  isLoading: boolean
  error: string | null
}

export interface OnboardingContextType {
  // State
  state: OnboardingState
  currentStep: OnboardingStep | null
  isComplete: boolean
  progress: number

  // Actions
  startOnboarding: (persona?: UserPersona) => Promise<void>
  nextStep: (stepData?: Record<string, any>) => Promise<void>
  previousStep: () => Promise<void>
  skipStep: (stepId: string) => Promise<void>
  completeOnboarding: () => Promise<void>
  updateUserData: (data: Partial<OnboardingState['user']>) => void
  resetOnboarding: () => Promise<void>

  // Utilities
  getRemainingSteps: () => OnboardingStep[]
  getCompletedSteps: () => OnboardingStep[]
  getEstimatedTimeRemaining: () => number
  canProceed: () => boolean
}

export interface OnboardingProviderProps {
  children: React.ReactNode
  steps?: OnboardingStep[]
  onComplete?: (data: OnboardingState) => void
  onStepChange?: (step: OnboardingStep, data: OnboardingState) => void
}

export type OnboardingAction =
  | { type: 'START_ONBOARDING'; payload: { persona?: UserPersona } }
  | { type: 'NEXT_STEP'; payload: { stepData?: Record<string, any> } }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SKIP_STEP'; payload: { stepId: string } }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'UPDATE_USER_DATA'; payload: Partial<OnboardingState['user']> }
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
    data?: Record<string, any>
  }>
  completionRate: number
  userPersona?: UserPersona
}
