// BIZRA Genesis Node - Onboarding Context
// Elite-grade onboarding flow state management

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Onboarding Step Types
export type OnboardingStep =
  | 'welcome'
  | 'assessment'
  | 'account'
  | 'education'
  | 'activation';

// User Persona Types
export type UserPersona =
  | 'developer'
  | 'researcher'
  | 'business'
  | 'explorer';

// Onboarding State
interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  persona: UserPersona | null;
  goals: string[];
  experience: 'beginner' | 'intermediate' | 'advanced' | null;
  isComplete: boolean;
  startedAt: number | null;
  completedAt: number | null;
}

// Context Type
interface OnboardingContextType extends OnboardingState {
  startOnboarding: () => void;
  setStep: (step: OnboardingStep) => void;
  completeStep: (step: OnboardingStep) => void;
  setPersona: (persona: UserPersona) => void;
  setGoals: (goals: string[]) => void;
  setExperience: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  finishOnboarding: () => void;
  resetOnboarding: () => void;
  isStepCompleted: (step: OnboardingStep) => boolean;
  canAccessStep: (step: OnboardingStep) => boolean;
}

// Step Order
const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'assessment',
  'account',
  'education',
  'activation',
];

// Initial State
const initialState: OnboardingState = {
  currentStep: 'welcome',
  completedSteps: [],
  persona: null,
  goals: [],
  experience: null,
  isComplete: false,
  startedAt: null,
  completedAt: null,
};

// Storage Key
const STORAGE_KEY = 'bizra_onboarding_state';

// Create Context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provider Component
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    // Load state from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialState;
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Start onboarding
  const startOnboarding = () => {
    setState({
      ...initialState,
      startedAt: Date.now(),
    });
  };

  // Set current step
  const setStep = (step: OnboardingStep) => {
    setState(prev => ({
      ...prev,
      currentStep: step,
    }));
  };

  // Mark step as completed
  const completeStep = (step: OnboardingStep) => {
    setState(prev => {
      const completedSteps = prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step];

      // Auto-advance to next step
      const currentIndex = STEP_ORDER.indexOf(step);
      const nextStep = STEP_ORDER[currentIndex + 1];

      return {
        ...prev,
        completedSteps,
        currentStep: nextStep || prev.currentStep,
      };
    });
  };

  // Set user persona
  const setPersona = (persona: UserPersona) => {
    setState(prev => ({
      ...prev,
      persona,
    }));
  };

  // Set goals
  const setGoals = (goals: string[]) => {
    setState(prev => ({
      ...prev,
      goals,
    }));
  };

  // Set experience level
  const setExperience = (level: 'beginner' | 'intermediate' | 'advanced') => {
    setState(prev => ({
      ...prev,
      experience: level,
    }));
  };

  // Finish onboarding
  const finishOnboarding = () => {
    setState(prev => ({
      ...prev,
      isComplete: true,
      completedAt: Date.now(),
    }));
  };

  // Reset onboarding
  const resetOnboarding = () => {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Check if step is completed
  const isStepCompleted = (step: OnboardingStep): boolean => {
    return state.completedSteps.includes(step);
  };

  // Check if user can access a step
  const canAccessStep = (step: OnboardingStep): boolean => {
    const stepIndex = STEP_ORDER.indexOf(step);
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);

    // Can access current step and all completed steps
    return stepIndex <= currentIndex || isStepCompleted(step);
  };

  const value: OnboardingContextType = {
    ...state,
    startOnboarding,
    setStep,
    completeStep,
    setPersona,
    setGoals,
    setExperience,
    finishOnboarding,
    resetOnboarding,
    isStepCompleted,
    canAccessStep,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// Custom Hook
export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }

  return context;
}

export default OnboardingContext;
