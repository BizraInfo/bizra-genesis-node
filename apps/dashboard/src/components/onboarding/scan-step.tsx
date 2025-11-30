"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { CheckCircle2, Cpu, HardDrive, MemoryStick, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function ScanStep() {
  const { setStep, setSystemSpecs } = useOnboardingStore()
  const [scanning, setScanning] = useState(true)
  const [scanProgress, setScanProgress] = useState(0)

  useEffect(() => {
    if (scanProgress >= 100 && scanning) {
      setScanning(false)
      setSystemSpecs({
        gpu: { model: "NVIDIA RTX 4090", vram: "24 GB", suitable: true },
        cpu: { model: "Intel Core i9-14900K", cores: 24, suitable: true },
        memory: "64 GB DDR5",
        ram: { total: 64, available: 58, suitable: true },
        storage: { total: 2000, available: 847, type: "NVMe SSD", suitable: true },
        os: "Windows 11 Pro",
      })
    }
  }, [scanProgress, scanning, setSystemSpecs])

  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          return 100
        }
        return prev + 2
      })
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif font-bold mb-2">System Analysis</h2>
        <p className="text-muted-foreground">Scanning hardware capabilities for optimal node configuration</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ScanCard
          icon={<Cpu />}
          label="GPU Processor"
          value="NVIDIA RTX 4090"
          detail="24 GB VRAM"
          progress={scanProgress}
          threshold={25}
        />
        <ScanCard
          icon={<Cpu />}
          label="CPU Core"
          value="Intel Core i9-14900K"
          detail="24 Cores / 32 Threads"
          progress={scanProgress}
          threshold={50}
        />
        <ScanCard
          icon={<MemoryStick />}
          label="Memory"
          value="64 GB DDR5"
          detail="58 GB Available"
          progress={scanProgress}
          threshold={75}
        />
        <ScanCard
          icon={<HardDrive />}
          label="Storage"
          value="2TB NVMe SSD"
          detail="847 GB Free"
          progress={scanProgress}
          threshold={90}
        />
      </div>

      <div className="flex justify-center">
        {scanning ? (
          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Scanning system resources...</span>
              <span className="font-mono text-primary">{scanProgress}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary" style={{ width: `${scanProgress}%` }} />
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button size="lg" onClick={() => setStep("profile")} className="px-8 rounded-full">
              Continue to Profile Setup
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

interface ScanCardProps {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  progress: number
  threshold: number
}

function ScanCard({ icon, label, value, detail, progress, threshold }: ScanCardProps) {
  const show = progress > threshold

  return (
    <div
      className={cn(
        "p-6 rounded-xl border transition-all duration-500",
        show ? "bg-card border-primary/20 shadow-lg shadow-primary/5" : "bg-muted/20 border-transparent opacity-50",
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "p-3 rounded-lg transition-colors",
            show ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </div>
        {show && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500">
            <CheckCircle2 className="w-6 h-6" />
          </motion.div>
        )}
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <h3 className="font-medium text-lg text-foreground">{show ? value : "Scanning..."}</h3>
        <p className="text-sm text-muted-foreground">{show ? detail : "Waiting for analysis"}</p>
      </div>
    </div>
  )
}
