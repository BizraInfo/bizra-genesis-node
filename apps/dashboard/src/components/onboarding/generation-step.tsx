"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { useBizraStore } from "@/store/use-bizra-store" // Added import
import { CheckCircle2, Loader2, Download, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PHASES = [
  { name: "Environment Scan", desc: "Analyzing system capabilities", duration: 1000 },
  { name: "Profile Setup", desc: "Creating personal configuration", duration: 1500 },
  { name: "Component Download", desc: "Retrieving BIZRA Sovereign OS", duration: 3000 },
  { name: "Agent Deployment", desc: "Initializing 7 personal agents", duration: 2500 },
  { name: "System Integration", desc: "Connecting to desktop environment", duration: 2000 },
  { name: "Validation", desc: "Verifying installation success", duration: 1000 },
]

export function GenerationStep() {
  const { progress, currentPhase, agents, setProgress, setPhase, updateAgentStatus, setStep } = useOnboardingStore()
  const setBizraPhase = useBizraStore((state) => state.setPhase) // Get main store action

  useEffect(() => {
    let currentProgress = 0
    let phaseIndex = 0

    const interval = setInterval(() => {
      currentProgress += 0.5

      // Update phase based on progress
      const newPhaseIndex = Math.floor((currentProgress / 100) * PHASES.length)
      if (newPhaseIndex !== phaseIndex && newPhaseIndex < PHASES.length) {
        phaseIndex = newPhaseIndex
        setPhase(phaseIndex)

        // Trigger agent deployment animation during that phase
        if (PHASES[phaseIndex].name === "Agent Deployment") {
          agents.forEach((agent, i) => {
            setTimeout(() => {
              updateAgentStatus(agent.name, "active")
            }, i * 300)
          })
        }
      }

      if (currentProgress >= 100) {
        currentProgress = 100
        clearInterval(interval)
      }

      setProgress(currentProgress)
    }, 50)

    return () => clearInterval(interval)
  }, [setProgress, setPhase, updateAgentStatus, agents])

  const isComplete = progress >= 100

  const handleComplete = () => {
    setStep("complete")
    setBizraPhase("GENESIS") // Trigger the Citadel reveal
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif font-bold mb-2">
          {isComplete ? "Genesis Node Ready" : "System Generation"}
        </h2>
        <p className="text-muted-foreground">
          {isComplete
            ? "Your sovereign AI ecosystem has been successfully initialized"
            : "Constructing your personalized BIZRA environment"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column: Progress & Phases */}
        <div className="space-y-6">
          <div className="bg-card/50 border border-border/50 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Progress</span>
              <span className="text-2xl font-mono font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="space-y-3">
            {PHASES.map((phase, index) => (
              <PhaseItem
                key={phase.name}
                phase={phase}
                index={index}
                currentIndex={currentPhase}
                isComplete={isComplete}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Agent Swarm Visualization */}
        <div className="bg-card/30 border border-border/50 rounded-xl p-6 backdrop-blur-sm flex flex-col">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Agent Swarm Status
          </h3>

          <div className="flex-1 grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar">
            {agents.map((agent, index) => (
              <AgentCard key={agent.name} agent={agent} index={index} />
            ))}
          </div>
        </div>
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center gap-4"
        >
          <Button variant="outline" size="lg" className="rounded-full bg-transparent">
            <Download className="mr-2 w-4 h-4" />
            Download Installer
          </Button>
          <Button size="lg" onClick={handleComplete} className="rounded-full px-8">
            {" "}
            {/* Updated onClick */}
            Enter Genesis Node
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  )
}

interface Phase {
  name: string
  desc: string
  duration: number
}

interface Agent {
  name: string
  role: string
  status: string
  color: string
  icon: React.ReactNode
}

interface PhaseItemProps {
  phase: Phase
  index: number
  currentIndex: number
  isComplete: boolean
}

function PhaseItem({ phase, index, currentIndex, isComplete }: PhaseItemProps) {
  const status = isComplete || index < currentIndex ? "complete" : index === currentIndex ? "active" : "pending"

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg transition-colors",
        status === "active" ? "bg-primary/10 border border-primary/20" : "border border-transparent",
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
          status === "complete"
            ? "bg-primary text-primary-foreground"
            : status === "active"
              ? "bg-primary/20 text-primary animate-pulse"
              : "bg-secondary text-muted-foreground",
        )}
      >
        {status === "complete" ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
      </div>
      <div className="flex-1">
        <div
          className={cn(
            "font-medium text-sm transition-colors",
            status === "pending" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {phase.name}
        </div>
        {status === "active" && <div className="text-xs text-primary/80 mt-0.5">{phase.desc}</div>}
      </div>
      {status === "active" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
    </div>
  )
}

interface AgentCardProps {
  agent: Agent
  index: number
}

function AgentCard({ agent, index }: AgentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        agent.status === "active" ? "bg-card border-primary/20 shadow-sm" : "bg-muted/20 border-transparent opacity-50",
      )}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
         
        style={{ backgroundColor: `${agent.color}20` }}
      >
        {agent.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{agent.name}</div>
        <div className="text-xs text-muted-foreground truncate">{agent.role}</div>
      </div>
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          agent.status === "active" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-yellow-500/50",
        )}
      />
    </motion.div>
  )
}
