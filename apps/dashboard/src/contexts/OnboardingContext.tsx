// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - ONBOARDING CONTEXT                             ║
// ║  Enterprise-grade React context for multi-step user onboarding       ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import {
  OnboardingStep,
  OnboardingProgress,
  UserPersona,
  OnboardingState,
  OnboardingContextType,
  OnboardingProviderProps,
  OnboardingAction,
  OnboardingAnalytics
} from '../types/onboarding'

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT ONBOARDING STEPS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BIZRA',
    description: 'Discover the power of AI-driven synthesis',
    component: 'WelcomeStep',
    isRequired: true,
    estimatedTime: 2
  },
  {
    id: 'persona',
    title: 'Tell us about yourself',
    description: 'Help us personalize your experience',
    component: 'PersonaStep',
    isRequired: true,
    estimatedTime: 3
  },
  {
    id: 'goals',
    title: 'What are your goals?',
    description: 'Define what you want to achieve',
    component: 'GoalsStep',
    isRequired: true,
    estimatedTime: 2
  },
  {
    id: 'preferences',
    title: 'Customize your experience',
    description: 'Set your preferences for the best experience',
    component: 'PreferencesStep',
    isRequired: false,
    estimatedTime: 2
  },
  {
    id: 'tutorial',
    title: 'Quick tutorial',
    description: 'Learn the basics of AI synthesis',
    component: 'TutorialStep',
    isRequired: false,
    estimatedTime: 5
  },
  {
    id: 'first-synthesis',
    title: 'Your first synthesis',
    description: 'Create your first AI-powered synthesis',
    component: 'FirstSynthesisStep',
    isRequired: true,
    estimatedTime: 10
  }
]

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT PERSONAS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_PERSONAS: UserPersona[] = [
  {
    type: 'beginner',
    name: 'AI Explorer',
    description: 'New to AI and looking to learn the basics',
    skills: ['basic'],
    goals: ['learn', 'experiment'],
    recommendedPath: ['welcome', 'tutorial', 'first-synthesis']
  },
  {
    type: 'developer',
    name: 'Developer',
    description: 'Software developer integrating AI capabilities',
    skills: ['programming', 'api'],
    goals: ['integrate', 'build'],
    recommendedPath: ['welcome', 'persona', 'goals', 'first-synthesis']
  },
  {
    type: 'researcher',
    name: 'Researcher',
    description: 'Academic or industry researcher using AI for analysis',
    skills: ['research', 'analysis'],
    goals: ['research', 'analyze'],
    recommendedPath: ['welcome', 'persona', 'goals', 'preferences', 'tutorial', 'first-synthesis']
  },
  {
    type: 'enterprise',
    name: 'Enterprise User',
    description: 'Business professional using AI for productivity',
    skills: ['business', 'productivity'],
    goals: ['automate', 'scale'],
    recommendedPath: ['welcome', 'persona', 'goals', 'preferences', 'first-synthesis']
  }
]

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING REDUCER
// ═══════════════════════════════════════════════════════════════════════════

const createInitialState = (steps: OnboardingStep[]): OnboardingState => ({
  user: {
    preferences: {
      theme: 'auto',
      notifications: true,
      analytics: true
    },
    goals: []
  },
  progress: {
    currentStep: 0,
    completedSteps: [],
    skippedSteps: [],
    totalSteps: steps.length,
    startTime: new Date(),
    lastActivity: new Date(),
    estimatedCompletionTime: new Date(Date.now() + (steps.reduce((acc, step) => acc + step.estimatedTime, 0) * 60 * 1000)),
    isComplete: false
  },
  currentStepData: {},
  isLoading: false,
  error: null
})

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'START_ONBOARDING':
      return {
        ...state,
        user: {
          ...state.user,
          persona: action.payload.persona
        },
        progress: {
          ...state.progress,
          startTime: new Date(),
          lastActivity: new Date(),
          currentStep: 0,
          completedSteps: [],
          skippedSteps: [],
          isComplete: false
        },
        isLoading: false,
        error: null
      }

    case 'NEXT_STEP':
      const nextStepIndex = state.progress.currentStep + 1
      const newCompletedSteps = [...state.progress.completedSteps, DEFAULT_STEPS[state.progress.currentStep]?.id]

      return {
        ...state,
        progress: {
          ...state.progress,
          currentStep: nextStepIndex,
          completedSteps: newCompletedSteps,
          lastActivity: new Date(),
          isComplete: nextStepIndex >= state.progress.totalSteps
        },
        currentStepData: action.payload.stepData || {}
      }

    case 'PREVIOUS_STEP':
      return {
        ...state,
        progress: {
          ...state.progress,
          currentStep: Math.max(0, state.progress.currentStep - 1),
          lastActivity: new Date()
        }
      }

    case 'SKIP_STEP':
      return {
        ...state,
        progress: {
          ...state.progress,
          skippedSteps: [...state.progress.skippedSteps, action.payload.stepId],
          lastActivity: new Date()
        }
      }

    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        progress: {
          ...state.progress,
          isComplete: true,
          lastActivity: new Date()
        }
      }

    case 'UPDATE_USER_DATA':
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload
        }
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      }

    case 'RESET_ONBOARDING':
      return createInitialState(DEFAULT_STEPS)

    case 'LOAD_PROGRESS':
      return {
        ...state,
        progress: action.payload
      }

    default:
      return state
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  steps = DEFAULT_STEPS,
  onComplete,
  onStepChange
}) => {
  const [state, dispatch] = useReducer(onboardingReducer, createInitialState(steps))

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  const [analytics, setAnalytics] = React.useState<OnboardingAnalytics>({
    sessionId: `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: new Date(),
    stepsViewed: [],
    stepsCompleted: [],
    stepsSkipped: [],
    timePerStep: {},
    userInteractions: [],
    completionRate: 0
  })

  const trackInteraction = useCallback((stepId: string, action: string, data?: Record<string, any>) => {
    setAnalytics(prev => ({
      ...prev,
      userInteractions: [
        ...prev.userInteractions,
        {
          stepId,
          action,
          timestamp: new Date(),
          data
        }
      ]
    }))
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const saved = localStorage.getItem('bizra_onboarding_progress')
    if (saved) {
      try {
        const progress: OnboardingProgress = JSON.parse(saved)
        dispatch({ type: 'LOAD_PROGRESS', payload: progress })
      } catch (error) {
        console.warn('Failed to load onboarding progress:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (!state.progress.isComplete) {
      localStorage.setItem('bizra_onboarding_progress', JSON.stringify(state.progress))
    } else {
      localStorage.removeItem('bizra_onboarding_progress')
    }
  }, [state.progress])

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const currentStep = steps[state.progress.currentStep] || null
  const isComplete = state.progress.isComplete
  const progress = (state.progress.completedSteps.length / state.progress.totalSteps) * 100

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  const startOnboarding = useCallback(async (persona?: UserPersona): Promise<void> => {
    dispatch({ type: 'START_ONBOARDING', payload: { persona } })

    setAnalytics(prev => ({
      ...prev,
      startTime: new Date(),
      userPersona: persona
    }))

    trackInteraction('system', 'onboarding_started', { persona: persona?.type })

    if (onStepChange && currentStep) {
      onStepChange(currentStep, state)
    }
  }, [currentStep, state, onStepChange, trackInteraction])

  const nextStep = useCallback(async (stepData?: Record<string, any>): Promise<void> => {
    if (!currentStep) return

    const stepStartTime = analytics.timePerStep[currentStep.id] || Date.now()

    dispatch({ type: 'NEXT_STEP', payload: { stepData } })

    // Update analytics
    setAnalytics(prev => ({
      ...prev,
      stepsCompleted: [...prev.stepsCompleted, currentStep.id],
      timePerStep: {
        ...prev.timePerStep,
        [currentStep.id]: Date.now() - stepStartTime
      }
    }))

    trackInteraction(currentStep.id, 'step_completed', stepData)

    const nextStepIndex = state.progress.currentStep + 1
    const nextStep = steps[nextStepIndex]

    if (nextStep) {
      setAnalytics(prev => ({
        ...prev,
        stepsViewed: [...prev.stepsViewed, nextStep.id],
        timePerStep: {
          ...prev.timePerStep,
          [nextStep.id]: Date.now()
        }
      }))

      if (onStepChange) {
        onStepChange(nextStep, state)
      }
    } else if (onComplete) {
      // Onboarding complete
      setAnalytics(prev => ({
        ...prev,
        endTime: new Date(),
        completionRate: (state.progress.completedSteps.length / state.progress.totalSteps) * 100
      }))

      dispatch({ type: 'COMPLETE_ONBOARDING' })
      onComplete(state)
    }
  }, [currentStep, state, steps, analytics.timePerStep, onStepChange, onComplete, trackInteraction])

  const previousStep = useCallback(async (): Promise<void> => {
    dispatch({ type: 'PREVIOUS_STEP' })

    if (currentStep) {
      trackInteraction(currentStep.id, 'step_back')
    }

    const prevStepIndex = state.progress.currentStep - 1
    const prevStep = steps[prevStepIndex]

    if (prevStep && onStepChange) {
      onStepChange(prevStep, state)
    }
  }, [currentStep, state, steps, onStepChange, trackInteraction])

  const skipStep = useCallback(async (stepId: string): Promise<void> => {
    dispatch({ type: 'SKIP_STEP', payload: { stepId } })

    setAnalytics(prev => ({
      ...prev,
      stepsSkipped: [...prev.stepsSkipped, stepId]
    }))

    trackInteraction(stepId, 'step_skipped')
  }, [trackInteraction])

  const completeOnboarding = useCallback(async (): Promise<void> => {
    dispatch({ type: 'COMPLETE_ONBOARDING' })

    setAnalytics(prev => ({
      ...prev,
      endTime: new Date(),
      completionRate: 100
    }))

    trackInteraction('system', 'onboarding_completed')

    if (onComplete) {
      onComplete(state)
    }
  }, [state, onComplete, trackInteraction])

  const updateUserData = useCallback((data: Partial<OnboardingState['user']>) => {
    dispatch({ type: 'UPDATE_USER_DATA', payload: data })
  }, [])

  const resetOnboarding = useCallback(async (): Promise<void> => {
    dispatch({ type: 'RESET_ONBOARDING' })
    localStorage.removeItem('bizra_onboarding_progress')

    setAnalytics({
      sessionId: `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      stepsViewed: [],
      stepsCompleted: [],
      stepsSkipped: [],
      timePerStep: {},
      userInteractions: [],
      completionRate: 0
    })

    trackInteraction('system', 'onboarding_reset')
  }, [trackInteraction])

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  const getRemainingSteps = useCallback((): OnboardingStep[] => {
    return steps.slice(state.progress.currentStep)
  }, [steps, state.progress.currentStep])

  const getCompletedSteps = useCallback((): OnboardingStep[] => {
    return steps.filter(step => state.progress.completedSteps.includes(step.id))
  }, [steps, state.progress.completedSteps])

  const getEstimatedTimeRemaining = useCallback((): number => {
    const remainingSteps = getRemainingSteps()
    return remainingSteps.reduce((acc, step) => acc + step.estimatedTime, 0)
  }, [getRemainingSteps])

  const canProceed = useCallback((): boolean => {
    if (!currentStep) return false
    if (!currentStep.isRequired) return true

    // Check prerequisites
    if (currentStep.prerequisites) {
      return currentStep.prerequisites.every(prereq =>
        state.progress.completedSteps.includes(prereq)
      )
    }

    return true
  }, [currentStep, state.progress.completedSteps])

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════════

  const contextValue: OnboardingContextType = {
    // State
    state,
    currentStep,
    isComplete,
    progress,

    // Actions
    startOnboarding,
    nextStep,
    previousStep,
    skipStep,
    completeOnboarding,
    updateUserData,
    resetOnboarding,

    // Utilities
    getRemainingSteps,
    getCompletedSteps,
    getEstimatedTimeRemaining,
    canProceed
  }

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING HOOK
// ═══════════════════════════════════════════════════════════════════════════

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { DEFAULT_STEPS, DEFAULT_PERSONAS }
export default OnboardingContext
