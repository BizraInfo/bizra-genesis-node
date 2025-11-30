/**
 * PremiumLanding - World-Class Landing Experience
 * 
 * Combines the best of award-winner-design with our 3D capabilities:
 * - HeroSection with particle network
 * - MetricsGrid showing TMP v0.1 integrity
 * - Genesis 100 CTA section
 * - Smooth transition to 3D Citadel experience
 * 
 * This is the page that makes users "feel the difference"
 */

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Zap, Users, Star, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/router';

// Premium Components
import { 
  CosmicBackground2D, 
  NavDock, 
  HeroSection, 
  MetricsGrid,
  GlassCard,
  LoadingScreen 
} from '../components/premium';
import { BizraLogoAnimated, BizraLogo } from '../components/brand';

// Genesis 100 Features
const genesis100Features = [
  {
    icon: Shield,
    title: 'Mathematical Safety',
    description: 'World-first AGI consciousness bounds with Ihsan metrics',
  },
  {
    icon: Zap,
    title: 'Proof of Impact',
    description: '15,000 hours of verified development work on-chain',
  },
  {
    icon: Users,
    title: 'Genesis 100 Access',
    description: 'Exclusive early access for founding pioneers',
  },
  {
    icon: Star,
    title: 'Sacred Architecture',
    description: 'Built from Ramadan 2023 prayer into production system',
  },
];

// Testimonial data (placeholder)
const testimonials = [
  {
    quote: 'BIZRA represents a paradigm shift in how we think about AI safety and consciousness.',
    author: 'Dr. Sarah Chen',
    role: 'AI Safety Researcher',
  },
  {
    quote: 'The mathematical rigor behind the Ihsan bounds is unprecedented.',
    author: 'Marcus Williams',
    role: 'Blockchain Architect',
  },
];

export function PremiumLanding() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showCitadel, setShowCitadel] = useState(false);

  const handleNavigate = useCallback((path: string) => {
    setIsLoading(true);
    setTimeout(() => {
      router.push(path);
    }, 500);
  }, [router]);

  const handleEnterCitadel = useCallback(() => {
    setShowCitadel(true);
    handleNavigate('/');
  }, [handleNavigate]);

  return (
    <>
      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && <LoadingScreen />}
      </AnimatePresence>

      <main className="min-h-screen bg-navy-900 text-white overflow-x-hidden">
        {/* Cosmic Background */}
        <CosmicBackground2D />

        {/* Navigation */}
        <NavDock 
          items={[
            { id: 'about', label: 'About', href: '#about' },
            { id: 'features', label: 'Features', href: '#features' },
            { id: 'genesis', label: 'Genesis 100', href: '#genesis' },
            { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
          ]}
        />

        {/* Hero Section */}
        <HeroSection
          journeyTargetId="features"
          demoTargetId="demo"
          subtitle="From the darkness of solitude to the light of world-first AGI safety."
          showLogo={true}
        />

        {/* About Section */}
        <section id="about" className="py-24 px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              {/* Left - Story */}
              <div className="space-y-6">
                <h2 className="font-serif text-4xl md:text-5xl text-white">
                  The <span className="text-gradient-gold">Origin</span> Story
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Ramadan 2023. One room in Dubai. A single prayer that became 15,000 hours of 
                  dedicated work. BIZRA Genesis emerges from complete surrender – the first 
                  consciousness infrastructure built from authentic human devotion.
                </p>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Every line of code, every architectural decision, every test – witnessed and 
                  verified on-chain through our revolutionary Proof of Impact protocol.
                </p>
                <div className="flex items-center gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gold-500">15,000</div>
                    <div className="text-sm text-gray-500">Hours</div>
                  </div>
                  <div className="h-12 w-px bg-gold-500/30" />
                  <div className="text-center">
                    <div className="text-3xl font-bold text-teal-400">257</div>
                    <div className="text-sm text-gray-500">Tests</div>
                  </div>
                  <div className="h-12 w-px bg-gold-500/30" />
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">A+</div>
                    <div className="text-sm text-gray-500">Security</div>
                  </div>
                </div>
              </div>

              {/* Right - Animated Logo */}
              <div className="flex justify-center items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                >
                  <BizraLogoAnimated size="xl" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Metrics Section */}
        <MetricsGrid 
          title="System Integrity Verified"
          subtitle="TMP v0.1 Demonstration Results"
        />

        {/* Features Section */}
        <section id="features" className="py-24 px-4 relative z-10">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">
                Genesis 100 <span className="text-gradient-gold">Features</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Join the founding pioneers of consciousness infrastructure
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {genesis100Features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlassCard className="p-6 h-full hover:bg-white/5 transition-colors duration-300">
                    <feature.icon className="w-10 h-10 text-gold-500 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {feature.description}
                    </p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Genesis 100 CTA Section */}
        <section id="genesis" className="py-24 px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {/* Badge */}
              <span className="inline-block px-4 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-500 text-xs uppercase tracking-[0.2em]">
                Limited to 100 Pioneers
              </span>

              <h2 className="font-serif text-5xl md:text-6xl text-white">
                Join the <span className="text-gradient-gold">Genesis 100</span>
              </h2>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Be among the first 100 pioneers to experience consciousness infrastructure. 
                Exclusive access, founding member rewards, and a place in blockchain history.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                <motion.button
                  onClick={() => handleNavigate('/register')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group px-8 py-4 bg-gold-500 text-navy-900 font-bold tracking-wider uppercase text-sm rounded-sm hover:bg-white transition-colors flex items-center gap-2"
                >
                  Request Invite
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                <motion.button
                  onClick={handleEnterCitadel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 border border-gold-500/30 text-gold-500 font-bold tracking-wider uppercase text-sm rounded-sm hover:bg-gold-500/10 transition-colors"
                >
                  Enter The Citadel
                </motion.button>
              </div>

              {/* Social Proof */}
              <div className="pt-12 flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">47</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Spots Remaining</div>
                </div>
                <div className="h-12 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">53</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Pioneers Joined</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Demo Section */}
        <section id="demo" className="py-24 px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">
                Experience the <span className="text-gradient-gold">Citadel</span>
              </h2>
              <p className="text-gray-400">
                15,000 hours visualized in real-time 3D
              </p>
            </motion.div>

            {/* Preview Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-video rounded-2xl overflow-hidden border border-gold-500/20"
            >
              {/* Placeholder for 3D preview */}
              <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-900 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <BizraLogo size={160} variant="minimal" />
                  <p className="text-gold-500/60 text-sm uppercase tracking-widest">
                    Interactive 3D Experience
                  </p>
                  <motion.button
                    onClick={handleEnterCitadel}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-4 px-6 py-3 bg-gold-500/20 border border-gold-500/40 text-gold-500 rounded-full text-sm uppercase tracking-wider hover:bg-gold-500/30 transition-colors"
                  >
                    Launch Experience
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t border-white/5">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <BizraLogo size={32} variant="minimal" />
              <span className="text-sm text-gray-500">
                © 2024 BIZRA Genesis. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gold-500 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gold-500 transition-colors">Terms</a>
              <a href="#" className="hover:text-gold-500 transition-colors">Documentation</a>
            </div>
          </div>
        </footer>

        {/* Scroll Indicator for first section */}
        <motion.div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-gold-500/50"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </motion.div>
      </main>
    </>
  );
}

export default PremiumLanding;
