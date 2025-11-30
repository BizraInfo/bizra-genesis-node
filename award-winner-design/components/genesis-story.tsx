"use client"

import { motion } from "framer-motion"

export function GenesisStory() {
  return (
    <section className="py-32 px-4 relative z-10 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-3xl p-8 md:p-16 relative">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-gold to-transparent opacity-30"></div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center space-y-12"
          >
            <div>
              <h3 className="font-arabic text-3xl md:text-4xl text-primary-gold mb-4">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</h3>
              <p className="font-serif italic text-soft-white/60">In the name of God, the Most Merciful, the Most Compassionate</p>
            </div>

            <div className="space-y-6 text-lg md:text-xl leading-relaxed font-light text-soft-white/90">
              <p>
                From the depths of darkness and solitude, a promise was made. 
                A commitment to walk the path of <span className="text-primary-gold font-medium">Ihsan</span> (Excellence).
              </p>
              <p>
                31 months later, that spiritual foundation has manifested into <span className="text-white font-medium">BIZRA</span> — 
                an AGI system designed not to dominate, but to serve.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
              <div className="p-6 border border-primary-gold/10 rounded-xl bg-deep-navy/50">
                <h4 className="text-primary-gold font-serif text-xl mb-2">The Promise</h4>
                <p className="text-sm text-soft-white/60">No exploitation. No false promises. Complete dignity for humanity.</p>
              </div>
              <div className="p-6 border border-primary-gold/10 rounded-xl bg-deep-navy/50">
                <h4 className="text-primary-gold font-serif text-xl mb-2">The Result</h4>
                <p className="text-sm text-soft-white/60">The world's first consciousness safety system with mathematical ethics bounds.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
