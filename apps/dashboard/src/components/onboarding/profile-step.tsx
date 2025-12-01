"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { ArrowRight, Shield, ShieldAlert, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type PrivacyLevel = "standard" | "enhanced" | "maximum"

export function ProfileStep() {
  const { setStep, setUserProfile } = useOnboardingStore()
  const [name, setName] = useState("")
  const [privacy, setPrivacy] = useState<PrivacyLevel>("enhanced")

  const handleContinue = () => {
    if (!name) {return}
    setUserProfile({
      name,
      installPath: "/opt/bizra/genesis",
      privacyLevel: privacy,
    })
    setStep("generation")
  }

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif font-bold mb-2">Node Identity</h2>
        <p className="text-muted-foreground">Configure your sovereign node profile and security preferences</p>
      </div>

      <div className="space-y-8 flex-1">
        <div className="space-y-4">
          <Label htmlFor="name" className="text-lg">
            Operator Name
          </Label>
          <Input
            id="name"
            placeholder="Enter your name or alias"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-14 text-lg bg-secondary/20 border-border/50 focus:border-primary/50"
          />
        </div>

        <div className="space-y-4">
          <Label className="text-lg">Privacy Level</Label>
          <RadioGroup
            value={privacy}
            onValueChange={(value) => setPrivacy(value as PrivacyLevel)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <PrivacyOption
              value="standard"
              icon={<Shield className="w-6 h-6" />}
              title="Standard"
              desc="Balanced performance & privacy"
              selected={privacy === "standard"}
            />
            <PrivacyOption
              value="enhanced"
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Enhanced"
              desc="Strict data isolation (Recommended)"
              selected={privacy === "enhanced"}
            />
            <PrivacyOption
              value="maximum"
              icon={<ShieldAlert className="w-6 h-6" />}
              title="Maximum"
              desc="Air-gapped simulation mode"
              selected={privacy === "maximum"}
            />
          </RadioGroup>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <Button size="lg" onClick={handleContinue} disabled={!name} className="px-8 rounded-full w-full md:w-auto">
          Initialize Genesis Generation
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

interface PrivacyOptionProps {
  value: PrivacyLevel
  icon: React.ReactNode
  title: string
  desc: string
  selected: boolean
}

function PrivacyOption({ value, icon, title, desc, selected }: PrivacyOptionProps) {
  return (
    <div className="relative">
      <RadioGroupItem value={value} id={value} className="peer sr-only" />
      <Label
        htmlFor={value}
        className={cn(
          "flex flex-col items-center text-center p-6 rounded-xl border-2 cursor-pointer transition-all hover:bg-secondary/20",
          selected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border/50 bg-card/50",
        )}
      >
        <div
          className={cn(
            "mb-3 p-3 rounded-full transition-colors",
            selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
          )}
        >
          {icon}
        </div>
        <span className="font-bold text-lg mb-1">{title}</span>
        <span className="text-xs text-muted-foreground leading-tight">{desc}</span>
      </Label>
    </div>
  )
}
