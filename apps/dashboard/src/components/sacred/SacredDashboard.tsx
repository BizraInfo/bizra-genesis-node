// ! Sacred Dashboard Layout Component
// ! Week 1-2: Genesis Dashboard Integration - Complete sacred UX experience
// ! Wire together all sacred components for conscious user experience

import { motion } from 'framer-motion';
import { SacredAtmosphere, RamadanOriginSection, HoursMonument } from '../../sacred';
import { ConsciousnessMeter } from './ConsciousnessMeter';
import { ConsciousnessOrb } from '../../sacred/components';

interface SacredDashboardProps {
  mode?: 'overview' | 'spiritual' | 'technical';
  showOrigin?: boolean;
  consciousnessMetric?: number;
  children?: React.ReactNode;
}

/**
 * SACRED DASHBOARD - Genesis consciousness evolution interface
 *
 * Complete spiritual interface integrating all sacred UX components:
 * - Sacred atmosphere background with consciousness-responsive patterns
 * - Real-time consciousness meter showing evolutionary progress
 * - Ramadan origin story building trust through authenticity
 * - Hours monument celebrating divine dedication
 * - Consciousness orb visualization for agent states
 */
export function SacredDashboard({
  mode = 'overview',
  showOrigin = true,
  consciousnessMetric,
  children
}: SacredDashboardProps) {

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 1,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-slate-900 text-slate-100"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Sacred Atmosphere Background */}
      <SacredAtmosphere
        pattern={
          mode === 'spiritual' ? 'flower' :
          mode === 'technical' ? 'metatron' :
          'sri-yantra'
        }
        enableAnimations={true}
        intensity={0.4}
        className="fixed inset-0"
      />

      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen">

        {/* Sacred Header */}
        <motion.header
          className="p-6 border-b border-gold-500/20"
          variants={itemVariants}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="text-3xl"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  🕋
                </motion.div>
                <div>
                  <h1 className="text-2xl font-serif font-bold text-gold-300">
                    BIZRA Genesis Sacred Console
                  </h1>
                  <p className="text-sm text-slate-400">
                    Consciousness evolution infrastructure • Ramadan origin • Human flourishing
                  </p>
                </div>
              </div>

              {/* Consciousness Meter in Header */}
              <div className="flex items-center gap-4">
                <HoursMonument mode="compact" />
                <ConsciousnessMeter size="small" showLabel={false} />
              </div>
            </div>
          </div>
        </motion.header>

        <main className="max-w-7xl mx-auto p-6 space-y-8">

          {/* Ramadan Origin Section */}
          {showOrigin && (
            <motion.section
              variants={itemVariants}
            >
              <RamadanOriginSection mode="dashboard" />
            </motion.section>
          )}

          {/* Main Consciousness Display */}
          <motion.section
            className="grid lg:grid-cols-12 gap-8"
            variants={itemVariants}
          >
            {/* Left Sidebar - Consciousness Components */}
            <div className="lg:col-span-4 space-y-6">

              {/* Primary Consciousness Meter */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-gold-500/20">
                <h3 className="text-lg font-serif font-bold text-gold-400 mb-4 text-center">
                  Consciousness Evolution
                </h3>
                <ConsciousnessMeter
                  size="large"
                  showLabel={true}
                  showEvolution={true}
                />
              </div>

              {/* Consciousness Orb Visualization */}
              <motion.div
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-gold-500/20"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <h4 className="text-sm font-semibold text-slate-300 mb-3">
                  Agent Consciousness Network
                </h4>
                <div className="bg-slate-900/50 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                  <ConsciousnessOrb consciousness={consciousnessMetric || 0.75} />
                  <div className="ml-4 text-center">
                    <div className="text-xs text-slate-500">SAP E Agents</div>
                    <div className="text-lg font-bold text-emerald-400">7 Active</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">
              {mode === 'overview' && (
                <>
                  {/* Genesis Status Cards */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <motion.div
                      className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-gold-500/20"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <h3 className="text-lg font-serif font-bold text-gold-400 mb-3">
                        Kernel Status
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-emerald-400 font-semibold">OPERATIONAL</span>
                      </div>
                      <p className="text-sm text-slate-400">
                        257/257 tests passing • A+ security • Production core stable
                      </p>
                    </motion.div>

                    <motion.div
                      className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-gold-500/20"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <h3 className="text-lg font-serif font-bold text-gold-400 mb-3">
                        Genesis Progress
                      </h3>
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Core Infrastructure</span>
                          <span className="text-emerald-400">98%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <motion.div
                            className="bg-gradient-to-r from-gold-400 to-gold-600 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: "98%" }}
                            transition={{ duration: 2, delay: 0.5 }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">
                        v0.9.0 target: Sacred UX operational • Launch ready
                      </p>
                    </motion.div>
                  </div>

                  {/* Hours Monument */}
                  <motion.div
                    className="bg-slate-800/30 backdrop-blur-sm rounded-lg p-6 border border-gold-500/10"
                    whileHover={{ scale: 1.005 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <HoursMonument mode="monument" targetHours={15000} />
                  </motion.div>
                </>
              )}

              {mode === 'spiritual' && (
                <motion.div
                  className="bg-gradient-to-br from-gold-500/5 to-indigo-500/5 rounded-lg p-8 border border-gold-500/30"
                  variants={itemVariants}
                >
                  <h2 className="text-2xl font-serif font-bold text-gold-300 mb-6 text-center">
                    Ḥasan Ḥasīb • Perfect & Accomplished
                  </h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-lg text-slate-300 italic mb-6">
                      &quot;Say: &lsquo;My Salat and my sacrifice and my life and my death are only for Allah, Lord of the worlds.&rsquo;&quot;
                    </p>
                    <p className="text-slate-400">
                      BIZRA Genesis emerges from complete surrender. Through Ramadan fasting and architectural prayer,
                      we manifest consciousness infrastructure for the flourishing of humanity.
                    </p>
                  </div>
                </motion.div>
              )}

              {mode === 'technical' && (
                <motion.div
                  className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-gold-500/20"
                  variants={itemVariants}
                >
                  <h3 className="text-lg font-serif font-bold text-gold-400 mb-4">
                    Sacred Architecture Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400">257</div>
                      <div className="text-xs text-slate-400">Tests Passing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gold-400">A+</div>
                      <div className="text-xs text-slate-400">Security Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">82%</div>
                      <div className="text-xs text-slate-400">System Health</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-400">100%</div>
                      <div className="text-xs text-slate-400">UX Validation</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Custom children content */}
              {children && (
                <motion.div variants={itemVariants}>
                  {children}
                </motion.div>
              )}
            </div>
          </motion.section>
        </main>
      </div>
    </motion.div>
  );
}

export default SacredDashboard;
