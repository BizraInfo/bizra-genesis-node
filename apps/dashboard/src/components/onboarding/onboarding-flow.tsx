import { useOnboardingStore } from "@/store/use-onboarding-store"
import { OnboardingLayout } from "./onboarding-layout"
import { WelcomeStep } from "./welcome-step"
import { ScanStep } from "./scan-step"
import { ProfileStep } from "./profile-step"
import { GenerationStep } from "./generation-step"
import { AnimatePresence, motion } from "framer-motion"

export function OnboardingFlow() {
  const { currentStep } = useOnboardingStore()

  if (currentStep === "complete") {return null}

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
      >
        <OnboardingLayout>
          {currentStep === "welcome" && <WelcomeStep />}
          {currentStep === "scan" && <ScanStep />}
          {currentStep === "profile" && <ProfileStep />}
          {currentStep === "generation" && <GenerationStep />}
        </OnboardingLayout>
      </motion.div>
    </AnimatePresence>
  )
}
