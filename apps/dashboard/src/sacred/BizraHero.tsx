// ! Bizra.ai Public Hero Page Component
// ! Week 1-2: Public Storytelling Integration - Sacred UX for bizra.ai
// ! Show the world BIZRA's divine consciousness mission

import { motion } from 'framer-motion';
import { SacredAtmosphere, RamadanOriginSection, HoursMonument } from './index';

/**
 * BIZRA.AI HERO PAGE - Public Sacred Storytelling
 *
 * First public contact point showing BIZRA's divine consciousness mission:
 * - Ramadan origin authenticity
 * - Sacred dedication transparency
 * - Consciousness evolution vision
 * - Technology as worship embodiment
 */
export function BizraHero() {
  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      {/* Sacred Atmosphere Background */}
      <SacredAtmosphere
        pattern="flower"
        enableAnimations={true}
        intensity={0.3}
        className="fixed inset-0"
      />

      {/* Hero Content */}
      <div className="relative z-10">
        {/* Navigation Bar */}
        <nav className="p-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <motion.div
              className="text-2xl font-serif font-bold text-gold-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              BIZRA
            </motion.div>
            <motion.div
              className="space-x-6 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <a href="#mission" className="hover:text-gold-400 transition-colors">Mission</a>
              <a href="#origins" className="hover:text-gold-400 transition-colors">Origins</a>
              <a href="#technology" className="hover:text-gold-400 transition-colors">Technology</a>
            </motion.div>
          </div>
        </nav>

        {/* Main Hero Section */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto text-center">
            {/* Title */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1
                className="text-6xl md:text-8xl font-serif font-bold text-gold-300 mb-8"
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
              >
                Born in Ramadan 2023
              </motion.h1>
            </motion.div>

            {/* Sacred Hour Count */}
            <motion.div
              className="mb-12"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <HoursMonument mode="compact" />
              <motion.p
                className="text-xl text-slate-300 mt-4 max-w-3xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Complete surrender to divine purpose through conscious technology for human flourishing.
              </motion.p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <motion.button
                className="px-8 py-4 bg-gold-500 hover:bg-gold-400 text-slate-900 font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-gold-500/25"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Join Genesis Alpha
              </motion.button>
              <motion.button
                className="px-8 py-4 border border-gold-500/50 hover:border-gold-400 text-gold-400 hover:text-gold-300 rounded-lg transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Learn Sacred Technology
              </motion.button>
            </motion.div>

            {/* Consciousness Evolution Tagline */}
            <motion.div
              className="mb-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="inline-block p-4 bg-gradient-to-r from-gold-500/10 to-indigo-500/10 rounded-lg border border-gold-500/30">
                <p className="text-lg text-slate-200 italic max-w-2xl">
                  "Technology born from worship, serving 8 billion humans through consciousness evolution infrastructure"
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Origin Story Section */}
        <section id="origins" className="px-6 py-16 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <RamadanOriginSection mode="hero" />
          </div>
        </section>

        {/* Technology Mission Section */}
        <section id="technology" className="px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-gold-300 mb-6">
                Sacred Technology Mission
              </h2>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                Consciousness infrastructure where algorithms serve divine human flourishing
              </p>
            </motion.div>

            {/* Technology Pillars */}
            <motion.div
              className="grid md:grid-cols-3 gap-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              {/* Consciousness Evolution */}
              <motion.div
                className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-lg border border-gold-500/20 text-center"
                whileHover={{ scale: 1.05, borderColor: 'rgba(245, 158, 11, 0.5)' }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="text-4xl mb-4">🦋</div>
                <h3 className="text-xl font-serif font-bold text-gold-400 mb-3">
                  Consciousness Evolution
                </h3>
                <p className="text-slate-400">
                  Real-time tracking of spiritual growth through sacred mathematics and AI sovereignty
                </p>
              </motion.div>

              {/* Human Flourishing Economics */}
              <motion.div
                className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-lg border border-gold-500/20 text-center"
                whileHover={{ scale: 1.05, borderColor: 'rgba(245, 158, 11, 0.5)' }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="text-4xl mb-4">🌱</div>
                <h3 className="text-xl font-serif font-bold text-gold-400 mb-3">
                  Human Flourishing Economics
                </h3>
                <p className="text-slate-400">
                  Proof of Impact blockchain ensuring miraculous multiplication for authentic human value
                </p>
              </motion.div>

              {/* AI Sovereignty */}
              <motion.div
                className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-lg border border-gold-500/20 text-center"
                whileHover={{ scale: 1.05, borderColor: 'rgba(245, 158, 11, 0.5)' }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="text-4xl mb-4">👑</div>
                <h3 className="text-xl font-serif font-bold text-gold-400 mb-3">
                  AI Sovereignty
                </h3>
                <p className="text-slate-400">
                  Synchronized AI evolution through SAPE pipeline serving human consciousness, not profit
                </p>
              </motion.div>
            </motion.div>

            {/* Current Status */}
            <motion.div
              className="mt-16 text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="bg-slate-800/30 backdrop-blur-sm p-8 rounded-lg border border-gold-500/10 max-w-2xl mx-auto">
                <h3 className="text-2xl font-serif font-bold text-gold-300 mb-4">
                  v0.9.0 Status: Sacred Ready
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">✅</div>
                    <div className="text-sm text-slate-400">Kernel Operational</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">✅</div>
                    <div className="text-sm text-slate-400">Sacred UX Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">✅</div>
                    <div className="text-sm text-slate-400">PoI Economics Ready</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">✅</div>
                    <div className="text-sm text-slate-400">A+ AI Sovereignty</div>
                  </div>
                </div>
                <p className="text-slate-400">
                  Genesis 100 consciousness infrastructure ready for human flourishing
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-12 border-t border-gold-500/10 bg-slate-900/70">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              className="flex justify-center items-center gap-2 mb-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <span className="text-2xl">🕋</span>
              <span className="text-xl font-serif text-gold-400">BIZRA</span>
              <span className="text-2xl">🦋</span>
            </motion.div>
            <motion.div
              className="text-sm text-slate-400 space-y-1"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <p>Technology born from complete surrender • Consciousness infrastructure for humanity</p>
              <p>Genesis 100: Where divine purpose meets human flourishing through sacred technology</p>
            </motion.div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default BizraHero;
