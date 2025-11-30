// Simple OnboardingProvider wrapper using Zustand store
// This replaces the legacy context-based onboarding with the simpler store-based approach

import React, { createContext, useContext, useCallback } from 'react'
import { useOnboardingStore } from '../store/use-onboarding-store'
import type { OnboardingStep, UserPersona } from '../types/onboarding'

// Default personas for onboarding
export const DEFAULT_PERSONAS: UserPersona[] = [
  {
    type: 'beginner',
    name: 'Beginner',
    description: 'New to AI and automation',
    skills: ['basic computer usage'],
    goals: ['learn AI basics', 'automate simple tasks'],
    recommendedPath: ['welcome', 'profile', 'scan', 'generation', 'complete'],
  },
  {
    type: 'developer',
    name: 'Developer',
    description: 'Software developer looking to integrate AI',
    skills: ['programming', 'api integration'],
    goals: ['build AI-powered apps', 'automate development workflows'],
    recommendedPath: ['welcome', 'profile', 'scan', 'generation', 'complete'],
  },
  {
    type: 'researcher',
    name: 'Researcher',
    description: 'Academic or industry researcher',
    skills: ['data analysis', 'research methodologies'],
    goals: ['analyze data', 'generate insights'],
    recommendedPath: ['welcome', 'profile', 'scan', 'generation', 'complete'],
  },
  {
    type: 'enterprise',
    name: 'Enterprise',
    description: 'Business professional or team lead',
    skills: ['business processes', 'team management'],
    goals: ['scale operations', 'improve efficiency'],
    recommendedPath: ['welcome', 'profile', 'scan', 'generation', 'complete'],
  },
]

// Simple context type that matches the store interface
interface OnboardingContextValue {
  currentStep: OnboardingStep
  setStep: (step: OnboardingStep) => void
  progress: number
  setProgress: (progress: number) => void
  isComplete: boolean
  updateUserData: (data: { persona?: UserPersona; goals?: string[]; preferences?: Record<string, unknown> }) => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const store = useOnboardingStore()

  const updateUserData = useCallback((data: { persona?: UserPersona; goals?: string[]; preferences?: Record<string, unknown> }) => {
    if (data.persona) {
      store.setUserProfile({
        name: data.persona.name,
        role: data.persona.type,
        goals: data.persona.goals,
      })
    }
    if (data.goals) {
      const currentProfile = store.userProfile
      store.setUserProfile({
        ...currentProfile,
        name: currentProfile?.name || '',
        goals: data.goals,
      })
    }
    // preferences are stored separately in the store if needed
  }, [store])

  const value: OnboardingContextValue = {
    currentStep: store.currentStep,
    setStep: store.setStep,
    progress: store.progress,
    setProgress: store.setProgress,
    isComplete: store.currentStep === 'complete',
    updateUserData,
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    // Fallback to store directly if not wrapped in provider
    const store = useOnboardingStore.getState()
    return {
      currentStep: store.currentStep,
      setStep: store.setStep,
      progress: store.progress,
      setProgress: store.setProgress,
      isComplete: store.currentStep === 'complete',
      updateUserData: () => {},
    }
  }
  return context
}

// Default steps configuration export
export const DEFAULT_STEPS: Array<{ id: OnboardingStep; title: string; description: string }> = [
  { id: 'welcome', title: 'Welcome', description: 'Get started with BIZRA Genesis' },
  { id: 'profile', title: 'Profile', description: 'Set up your profile' },
  { id: 'scan', title: 'System Scan', description: 'Analyze your system' },
  { id: 'generation', title: 'Generation', description: 'Generate your agents' },
  { id: 'complete', title: 'Complete', description: 'All done!' },
]
