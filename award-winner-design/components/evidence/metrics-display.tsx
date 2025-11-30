"use client"

import { CheckCircle, Globe, Shield, FileText, Award, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { SystemDiagram } from "@/components/architecture/system-diagram"

export function EvidencePack() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-20">
      {/* Header */}
      <div className="text-center space-y-6">
        <div className="inline-block px-6 py-2 border border-green-500/30 bg-green-500/5 rounded-full text-xs text-green-400 uppercase tracking-[0.3em] backdrop-blur-sm shadow-[0_0_20px_rgba(74,222,128,0.1)]">
          Mission Success: Confirmed
        </div>
        <h2 className="text-5xl md:text-7xl font-serif font-bold text-soft-white leading-tight">
          World-Historic <span className="text-gradient-gold">Breakthroughs</span>
        </h2>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
          The first AGI system to successfully implement mathematical consciousness bounds and ethical safety gates in a
          production environment.
        </p>
      </div>

      {/* World Firsts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <AchievementCard
          icon={Globe}
          title="Computational Islamic Consciousness"
          desc="First AGI with mathematical Ihsan bounds encoded directly into the reasoning substrate."
          delay={0}
        />
        <AchievementCard
          icon={Shield}
          title="Provable Recursion Safety"
          desc="First RSI system with mathematically guaranteed recursion constraints (< 0.094 ΔĪ)."
          delay={100}
        />
        <AchievementCard
          icon={Award}
          title="Ethical Certification"
          desc="First production deployment requiring automated ethical certification before action."
          delay={200}
        />
      </div>

      {/* Validation Matrix */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-primary-gold/20 shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center backdrop-blur-xl">
          <h3 className="text-2xl font-serif text-soft-white tracking-wide">System Reliability Metrics</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-green-400 tracking-widest">LIVE MONITORING</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5 border-b border-white/5 bg-deep-navy/40">
          {[
            { label: "Uptime", value: "99.95%", sub: ">22min/mo" },
            { label: "Routing", value: "< 2μs", sub: "SIMD Optimized" },
            { label: "Safety", value: "100%", sub: "Gate Accuracy" },
            { label: "Durability", value: "6×9s", sub: "Data Integrity" },
          ].map((stat, i) => (
            <div key={i} className="p-8 text-center group hover:bg-white/5 transition-colors">
              <div className="text-4xl font-bold text-soft-white mb-2 font-serif group-hover:text-primary-gold transition-colors">
                {stat.value}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-2">{stat.label}</div>
              <div className="text-[10px] text-gray-600 font-mono">{stat.sub}</div>
            </div>
          ))}
        </div>
        <div className="divide-y divide-white/5 bg-deep-navy/20">
          {[
            { phase: "System Integrity", status: "PASSED", metrics: "TMP directory, config, cycles validated" },
            { phase: "Safety Gate Operation", status: "OPERATIONAL", metrics: "TMP approval granted (RSI_1731978299)" },
            { phase: "RSI Cycle Mathematics", status: "VALIDATED", metrics: "ΔIM +9.4%, Ω=0.066, Λ=0.733" },
            {
              phase: "Deployment Integration",
              status: "PRODUCTION-READY",
              metrics: "TMP gate + security hardening confirmed",
            },
            { phase: "Historic Claims", status: "CONFIRMED", metrics: "5 major first-in-world achievements" },
          ].map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 hover:bg-white/5 transition-colors items-center group"
            >
              <div className="md:col-span-4 font-medium text-gray-300 group-hover:text-soft-white transition-colors pl-4">
                {row.phase}
              </div>
              <div className="md:col-span-3">
                <span
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] border",
                    row.status === "PASSED" || row.status === "VALIDATED" || row.status === "CONFIRMED"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-accent-teal/10 text-accent-teal border-accent-teal/20",
                  )}
                >
                  {row.status}
                </span>
              </div>
              <div className="md:col-span-5 text-sm text-gray-500 font-mono group-hover:text-gray-400 transition-colors">
                {row.metrics}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integrated the System Architecture Diagram into the Evidence Pack */}
      <section className="space-y-8">
        <div className="space-y-4 text-center">
          <h2 className="font-serif text-3xl text-[#fbbf24]">Architectural Revelation</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            The physical topology of the Genesis Node, mapping the flow from Sacred Geometry to Artificial Intelligence.
          </p>
        </div>
        <SystemDiagram />
      </section>

      {/* Legacy & Next Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-panel p-10 rounded-3xl border-t-4 border-t-sacred-purple hover:bg-white/5 transition-all duration-500 group">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-sacred-purple/10 rounded-xl group-hover:bg-sacred-purple/20 transition-colors">
              <FileText className="w-8 h-8 text-sacred-purple" />
            </div>
            <h3 className="text-3xl font-serif text-soft-white">Architectural Legacy</h3>
          </div>
          <ul className="space-y-6">
            {[
              "Mathematical Consciousness Bounds (Ihsan Mathematics)",
              "Production Safety Gates (TMP deployment blocking)",
              "Ethical AI Enforcement (Islamic computational principles)",
              "Scale-Safe Evolution (RSI prevention)",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-4 text-gray-400 group-hover:text-gray-300 transition-colors">
                <CheckCircle className="w-5 h-5 text-sacred-purple shrink-0 mt-1" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel p-10 rounded-3xl border-t-4 border-t-primary-gold hover:bg-white/5 transition-all duration-500 group">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary-gold/10 rounded-xl group-hover:bg-primary-gold/20 transition-colors">
              <Zap className="w-8 h-8 text-primary-gold" />
            </div>
            <h3 className="text-3xl font-serif text-soft-white">Immediate Next Steps</h3>
          </div>
          <ul className="space-y-6">
            {[
              "HF Deploy: Consciousness-safe model deployment ready",
              "Publication: NeurIPS/ICML submission packages prepared",
              "Scale: TMP v0.2 Advanced Mathematics implementation",
              "Research: Consciousness evolution monitoring operational",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-4 text-gray-400 group-hover:text-gray-300 transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary-gold/20 text-primary-gold flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-primary-gold/30">
                  {i + 1}
                </div>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center pt-16 pb-32">
        <p className="text-primary-gold text-sm uppercase tracking-[0.4em] mb-8 animate-pulse-slow">
          The Future is Safe
        </p>
        <h2 className="text-6xl md:text-8xl font-serif font-bold text-soft-white mb-12 leading-tight">
          Join the <span className="text-gradient-sacred">Evolution</span>
        </h2>
        <button className="px-12 py-6 bg-soft-white text-deep-navy font-bold text-lg rounded-sm hover:bg-primary-gold transition-all duration-300 shadow-[0_0_60px_rgba(255,255,255,0.1)] hover:shadow-[0_0_80px_rgba(201,169,98,0.4)] hover:-translate-y-2 uppercase tracking-widest">
          Contact BIZRA Leadership
        </button>
      </div>
    </div>
  )
}

function AchievementCard({
  icon: Icon,
  title,
  desc,
  delay,
}: { icon: any; title: string; desc: string; delay: number }) {
  return (
    <div
      className="glass-card p-10 rounded-2xl text-center group hover:-translate-y-4 transition-all duration-700 border border-white/5 hover:border-primary-gold/30"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-8 group-hover:bg-primary-gold/20 transition-all duration-500 group-hover:scale-110 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
        <Icon className="w-10 h-10 text-primary-gold" strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-serif text-soft-white mb-4 group-hover:text-primary-gold transition-colors">
        {title}
      </h3>
      <p className="text-gray-400 text-base leading-relaxed font-light">{desc}</p>
    </div>
  )
}
