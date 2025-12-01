// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - ONBOARDING WIZARD                              ║
// ║  Multi-step user onboarding experience with persona detection        ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, User, Target, Palette, Play } from 'lucide-react'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { DEFAULT_PERSONAS } from '../../contexts/OnboardingContext'

const OnboardingWizard: React.FC = () => {
  const { updateUserData: _updateUserData } = useOnboarding()
  const navigate = useNavigate()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const steps = [
    { id: 'welcome', title: 'Welcome', component: WelcomeStep },
    { id: 'persona', title: 'About You', component: PersonaStep },
    { id: 'goals', title: 'Your Goals', component: GoalsStep },
    { id: 'preferences', title: 'Preferences', component: PreferencesStep },
    { id: 'tutorial', title: 'Quick Start', component: TutorialStep },
    { id: 'complete', title: 'Ready!', component: CompleteStep }
  ]

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      // Complete onboarding
      void navigate('/dashboard')
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const CurrentStepComponent = steps[currentStepIndex]?.component || WelcomeStep

  return (
    <div className="onboarding-wizard">
      {/* Progress Indicator */}
      <div className="onboarding-progress">
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`progress-step ${index <= currentStepIndex ? 'completed' : ''} ${index === currentStepIndex ? 'active' : ''}`}
            >
              <div className="step-number">
                {index < currentStepIndex ? <Check size={16} /> : index + 1}
              </div>
              <span className="step-title">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="step-content"
        >
          <CurrentStepComponent
            onNext={handleNext}
            onPrevious={handlePrevious}
            canGoBack={currentStepIndex > 0}
            isLastStep={currentStepIndex === steps.length - 1}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="onboarding-navigation">
        {currentStepIndex > 0 && (
          <button
            className="btn btn-secondary"
            onClick={handlePrevious}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
        )}

        <button
          className="btn btn-primary"
          onClick={() => void handleNext()}
        >
          {currentStepIndex === steps.length - 1 ? (
            <>
              Get Started
              <Play size={16} />
            </>
          ) : (
            <>
              Next
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// WELCOME STEP
// ═══════════════════════════════════════════════════════════════════════════

interface StepProps {
  onNext: () => void | Promise<void>
  onPrevious: () => void
  canGoBack: boolean
  isLastStep: boolean
}

const WelcomeStep: React.FC<StepProps> = () => {
  return (
    <div className="onboarding-step welcome-step">
      <div className="step-header">
        <motion.div
          className="welcome-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          ⚡
        </motion.div>
        <h1>Welcome to BIZRA</h1>
        <p>Your journey into AI-powered synthesis begins here</p>
      </div>

      <div className="welcome-features">
        <motion.div
          className="feature-item"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="feature-icon">🤖</div>
          <div className="feature-content">
            <h3>18 AI Agents</h3>
            <p>Work with specialized AI agents for different tasks</p>
          </div>
        </motion.div>

        <motion.div
          className="feature-item"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="feature-icon">🎯</div>
          <div className="feature-content">
            <h3>Smart Synthesis</h3>
            <p>Create comprehensive content with AI assistance</p>
          </div>
        </motion.div>

        <motion.div
          className="feature-item"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="feature-icon">🏆</div>
          <div className="feature-content">
            <h3>Achievement System</h3>
            <p>Earn rewards as you master AI synthesis</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSONA STEP
// ═══════════════════════════════════════════════════════════════════════════

const PersonaStep: React.FC<StepProps> = ({ onNext: _onNext }) => {
  const { updateUserData } = useOnboarding()
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null)

  const handlePersonaSelect = (personaType: string) => {
    setSelectedPersona(personaType)
    const persona = DEFAULT_PERSONAS.find(p => p.type === personaType)
    if (persona) {
      updateUserData({ persona })
    }
  }

  return (
    <div className="onboarding-step persona-step">
      <div className="step-header">
        <User className="step-icon" />
        <h1>Tell us about yourself</h1>
        <p>Help us personalize your BIZRA experience</p>
      </div>

      <div className="persona-grid">
        {DEFAULT_PERSONAS.map((persona) => (
          <motion.div
            key={persona.type}
            className={`persona-card ${selectedPersona === persona.type ? 'selected' : ''}`}
            onClick={() => handlePersonaSelect(persona.type)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="persona-header">
              <div className="persona-icon">
                {persona.type === 'beginner' && '🌱'}
                {persona.type === 'developer' && '💻'}
                {persona.type === 'researcher' && '🔬'}
                {persona.type === 'enterprise' && '🏢'}
              </div>
              <h3>{persona.name}</h3>
            </div>
            <p>{persona.description}</p>
            <div className="persona-skills">
              {persona.skills.slice(0, 2).map((skill) => (
                <span key={skill} className="skill-tag">{skill}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// GOALS STEP
// ═══════════════════════════════════════════════════════════════════════════

const GoalsStep: React.FC<StepProps> = () => {
  const { updateUserData } = useOnboarding()
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])

  const goals = [
    'Learn AI synthesis basics',
    'Automate content creation',
    'Research and analysis',
    'Business productivity',
    'Creative writing',
    'Technical documentation'
  ]

  const handleGoalToggle = (goal: string) => {
    const newGoals = selectedGoals.includes(goal)
      ? selectedGoals.filter(g => g !== goal)
      : [...selectedGoals, goal]

    setSelectedGoals(newGoals)
    updateUserData({ goals: newGoals })
  }

  return (
    <div className="onboarding-step goals-step">
      <div className="step-header">
        <Target className="step-icon" />
        <h1>What are your goals?</h1>
        <p>Select what you want to achieve with BIZRA</p>
      </div>

      <div className="goals-grid">
        {goals.map((goal) => (
          <motion.button
            key={goal}
            className={`goal-item ${selectedGoals.includes(goal) ? 'selected' : ''}`}
            onClick={() => handleGoalToggle(goal)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>{goal}</span>
            {selectedGoals.includes(goal) && <Check size={16} />}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCES STEP
// ═══════════════════════════════════════════════════════════════════════════

const PreferencesStep: React.FC<StepProps> = () => {
  const { updateUserData } = useOnboarding()
  const [preferences, setPreferences] = useState({
    theme: 'auto' as 'light' | 'dark' | 'auto',
    notifications: true,
    analytics: true
  })

  const handlePreferenceChange = (key: string, value: boolean | 'light' | 'dark' | 'auto') => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    updateUserData({ preferences: newPreferences })
  }

  return (
    <div className="onboarding-step preferences-step">
      <div className="step-header">
        <Palette className="step-icon" />
        <h1>Customize your experience</h1>
        <p>Set your preferences for the best experience</p>
      </div>

      <div className="preferences-form">
        <div className="preference-group">
          <label>Theme</label>
          <div className="theme-options">
            {[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto' }
            ].map((option) => (
              <button
                key={option.value}
                className={`theme-option ${preferences.theme === option.value ? 'selected' : ''}`}
                onClick={() => handlePreferenceChange('theme', option.value as 'light' | 'dark' | 'auto')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="preference-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.notifications}
              onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
            />
            <span className="checkbox-mark"></span>
            Enable notifications
          </label>
        </div>

        <div className="preference-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.analytics}
              onChange={(e) => handlePreferenceChange('analytics', e.target.checked)}
            />
            <span className="checkbox-mark"></span>
            Help improve BIZRA with analytics
          </label>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TUTORIAL STEP
// ═══════════════════════════════════════════════════════════════════════════

const TutorialStep: React.FC<StepProps> = () => {
  return (
    <div className="onboarding-step tutorial-step">
      <div className="step-header">
        <Play className="step-icon" />
        <h1>Quick Start Guide</h1>
        <p>Learn the basics of AI synthesis</p>
      </div>

      <div className="tutorial-content">
        <div className="tutorial-step">
          <div className="tutorial-number">1</div>
          <div className="tutorial-text">
            <h3>Choose an Agent</h3>
            <p>Select from 18 specialized AI agents for your task</p>
          </div>
        </div>

        <div className="tutorial-step">
          <div className="tutorial-number">2</div>
          <div className="tutorial-text">
            <h3>Start Synthesis</h3>
            <p>Provide your requirements and let AI work</p>
          </div>
        </div>

        <div className="tutorial-step">
          <div className="tutorial-number">3</div>
          <div className="tutorial-text">
            <h3>Review & Refine</h3>
            <p>Iterate and improve your results</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE STEP
// ═══════════════════════════════════════════════════════════════════════════

const CompleteStep: React.FC<StepProps> = () => {
  return (
    <div className="onboarding-step complete-step">
      <div className="step-header">
        <motion.div
          className="complete-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          🎉
        </motion.div>
        <h1>You&apos;re all set!</h1>
        <p>Welcome to the future of AI synthesis</p>
      </div>

      <div className="complete-summary">
        <motion.div
          className="summary-item"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Check className="summary-check" />
          <span>Profile configured</span>
        </motion.div>

        <motion.div
          className="summary-item"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Check className="summary-check" />
          <span>Preferences set</span>
        </motion.div>

        <motion.div
          className="summary-item"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Check className="summary-check" />
          <span>Ready to synthesize</span>
        </motion.div>
      </div>
    </div>
  )
}

export default OnboardingWizard
