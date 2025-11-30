"use client"

import { motion } from "framer-motion"
import { ShieldCheck, Activity, Scale, Lock } from 'lucide-react'

const metrics = [
  {
    label: "Ihsan Evolution (Δ)",
    value: "+9.4%",
    desc: "Consciousness evolution within bounds",
    icon: Activity,
    color: "text-accent-teal",
  },
  {
    label: "Causal Drag (Ω)",
    value: "0.066",
    desc: "Structural refactor threshold < 0.30",
    icon: Scale,
    color: "text-dawn-pink",
  },
  {
    label: "Safety Leverage (Λ)",
    value: "0.733",
    desc: "Minimum requirement > 0.25",
    icon: ShieldCheck,
    color: "text-primary-gold",
  },
  {
    label: "Crown Confidence",
    value: "100%",
    desc: "Safety Status: APPROVED",
    icon: Lock,
    color: "text-sacred-purple",
  },
]

export function MetricsGrid() {
  return (
    <section className="py-24 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-soft-white mb-4">System Integrity Verified</h2>
          <p className="text-primary-gold/80 tracking-widest uppercase text-sm">TMP v0.1 Demonstration Results</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-8 rounded-2xl hover:bg-white/5 transition-colors duration-500 group"
            >
              <div className={`mb-6 p-3 rounded-xl bg-white/5 w-fit ${metric.color} group-hover:scale-110 transition-transform duration-500`}>
                <metric.icon className="w-8 h-8" />
              </div>
              <div className={`text-4xl font-bold mb-2 ${metric.color} font-serif`}>
                {metric.value}
              </div>
              <div className="text-lg font-medium text-soft-white mb-2">{metric.label}</div>
              <div className="text-sm text-soft-white/50 leading-relaxed">{metric.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
