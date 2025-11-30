"use client"

import type React from "react"

import { motion, AnimatePresence } from "framer-motion"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { cn } from "@/lib/utils"

interface OnboardingLayoutProps {
  children: React.ReactNode
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const { currentStep } = useOnboardingStore()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px]"
        />
        {/* </CHANGE> */}
      </div>

      <div className="relative w-full max-w-5xl h-[80vh] bg-card/50 border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-8 py-6 border-b border-border/50 bg-card/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
            </div>
            <span className="font-serif text-lg font-medium tracking-wide text-foreground">
              BIZRA <span className="text-muted-foreground">Genesis</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <StepIndicator step="welcome" current={currentStep} label="Start" />
            <StepLine active={currentStep !== "welcome"} />
            <StepIndicator step="scan" current={currentStep} label="Scan" />
            <StepLine active={currentStep !== "welcome" && currentStep !== "scan"} />
            <StepIndicator step="profile" current={currentStep} label="Profile" />
            <StepLine active={currentStep === "generation" || currentStep === "complete"} />
            <StepIndicator step="generation" current={currentStep} label="Deploy" />
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0 p-8 overflow-y-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function StepIndicator({ step, current, label }: { step: string; current: string; label: string }) {
  const steps = ["welcome", "scan", "profile", "generation", "complete"]
  const currentIndex = steps.indexOf(current)
  const stepIndex = steps.indexOf(step)
  const isActive = step === current
  const isCompleted = stepIndex < currentIndex

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "w-3 h-3 rounded-full transition-all duration-300",
          isActive ? "bg-primary scale-125 ring-4 ring-primary/20" : isCompleted ? "bg-primary" : "bg-muted",
        )}
      />
      <span
        className={cn(
          "text-[10px] uppercase tracking-wider font-medium transition-colors duration-300",
          isActive || isCompleted ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  )
}

function StepLine({ active }: { active: boolean }) {
  return <div className={cn("w-12 h-[1px] transition-colors duration-500", active ? "bg-primary" : "bg-muted")} />
}
