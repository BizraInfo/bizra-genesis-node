"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { ArrowRight, ShieldCheck, Cpu, Globe } from "lucide-react"

export function WelcomeStep() {
  const { setStep } = useOnboardingStore()

  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 border border-primary/20">
          <Globe className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">
          Initialize Genesis Node
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Begin the deployment of your sovereign AI ecosystem. This process will verify your hardware, configure your
          secure environment, and awaken your personal agent swarm.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
        <FeatureCard icon={<Cpu className="w-6 h-6" />} title="Hardware Scan" desc="Verifying compute capabilities" />
        <FeatureCard
          icon={<ShieldCheck className="w-6 h-6" />}
          title="Secure Setup"
          desc="Zero-trust environment config"
        />
        <FeatureCard icon={<Globe className="w-6 h-6" />} title="Agent Swarm" desc="Deploying 7 specialized agents" />
      </div>

      <Button
        size="lg"
        onClick={() => setStep("scan")}
        className="group text-lg px-8 py-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105"
      >
        Start Initialization
        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
        {icon}
      </div>
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
