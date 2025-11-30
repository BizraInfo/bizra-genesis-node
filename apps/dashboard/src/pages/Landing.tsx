/**
 * BIZRA Genesis Node - Optimized Landing Page
 *
 * High-performance marketing landing page with advanced data visualizations
 * and smooth animations. Matches backend quality with modern React patterns.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { BRAND } from '../constants/brand';
import { LandingOnboarding } from '../components/onboarding/LandingOnboarding';
import { ScrollProgress } from '../components/ui/ScrollProgress';
import { InteractiveTooltip, InfoTooltip, PerformanceTooltip } from '../components/ui/InteractiveTooltip';
import { Info, Users, Zap, Shield, TrendingUp, Star } from 'lucide-react';

// Dynamically import chart components for better performance
const InflationChart = dynamic(() => import('../components/charts/InflationChart'), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-navy-900/50 rounded-2xl animate-pulse" />
});

const TokenomicsChart = dynamic(() => import('../components/charts/TokenomicsChart'), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-navy-900/50 rounded-2xl animate-pulse" />
});

const AdoptionChart = dynamic(() => import('../components/charts/AdoptionChart'), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-navy-900/50 rounded-2xl animate-pulse" />
});

// Network animation component
function NetworkAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let animationId: number;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles.length = 0;
      for (let i = 0; i < 60; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2,
          color: Math.random() > 0.5 ? BRAND.colors.gold[500] : BRAND.colors.teal[500],
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) {
          p.vx *= -1;
        }
        if (p.y < 0 || p.y > canvas.height) {
          p.vy *= -1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Draw connections
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `${p.color}20`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
    />
  );
}

// Hero section component
function HeroSection({ onTakeTour }: { onTakeTour: () => void }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, -200]);

  return (
    <motion.header
      className="min-h-screen flex flex-col justify-center items-center relative px-6 overflow-hidden"
      style={{ y }}
    >
      <NetworkAnimation />

      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-radial from-gold-500/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-radial from-teal-500/5 via-transparent to-transparent" />

      <motion.div
        className="relative z-10 text-center max-w-5xl"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        {/* Status badge */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="px-3 py-1 border border-gold-500/30 rounded-full text-xs uppercase tracking-[0.3em] text-gold-400 bg-navy-900/80 backdrop-blur-sm">
            System v2.0 Live
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          className="text-5xl md:text-8xl font-serif text-white mb-6 leading-[1.1]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          The{' '}
          <span className="bg-gradient-to-b from-gold-300 to-gold-600 bg-clip-text text-transparent italic">
            Golden Age
          </span>
          <br />
          of Digital Finance
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-white/60 max-w-xl mx-auto font-light leading-relaxed mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          We are visualizing the transition from debt-based fiat currency to the BIZRA equity-based ecosystem. Observe the data.
        </motion.p>

        {/* Key metrics */}
        <motion.div
          className="flex justify-center gap-12 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <InteractiveTooltip
            content={{
              title: 'Lightning Settlement',
              description: 'Atomic finality in milliseconds, faster than traditional banking rails',
              icon: <Zap className="text-teal-400" size={16} />,
              stats: [
                { label: 'Traditional Banking', value: 'T+2 Days' },
                { label: 'BIZRA Network', value: '0.05s' },
                { label: 'Improvement', value: '4.32M x faster', trend: 'up' }
              ]
            }}
            position="bottom"
          >
            <div className="text-center cursor-pointer group">
              <motion.div
                className="text-3xl text-gold-500 font-serif group-hover:text-gold-400 transition-colors"
                whileHover={{ scale: 1.05 }}
              >
                0.05s
              </motion.div>
              <div className="text-xs uppercase tracking-widest text-white/40 mt-1 group-hover:text-white/60 transition-colors">
                Settlement
              </div>
            </div>
          </InteractiveTooltip>

          <div className="w-px h-12 bg-white/10" />

          <InteractiveTooltip
            content={{
              title: 'Algorithmic Stability',
              description: 'Zero inflation through mathematical scarcity and algorithmic monetary policy',
              icon: <Shield className="text-green-400" size={16} />,
              stats: [
                { label: 'Fiat Inflation', value: '2-10% annually' },
                { label: 'BIZRA Inflation', value: '0%' },
                { label: 'Stability', value: '∞', trend: 'up' }
              ]
            }}
            position="bottom"
          >
            <div className="text-center cursor-pointer group">
              <motion.div
                className="text-3xl text-gold-500 font-serif group-hover:text-gold-400 transition-colors"
                whileHover={{ scale: 1.05 }}
              >
                Zero
              </motion.div>
              <div className="text-xs uppercase tracking-widest text-white/40 mt-1 group-hover:text-white/60 transition-colors">
                Inflation
              </div>
            </div>
          </InteractiveTooltip>

          <div className="w-px h-12 bg-white/10" />

          <InteractiveTooltip
            content={{
              title: 'Infinite Scalability',
              description: 'Sharded architecture enables unlimited transaction capacity',
              icon: <TrendingUp className="text-gold-400" size={16} />,
              stats: [
                { label: 'Current TPS', value: '50k+' },
                { label: 'Target TPS', value: '∞' },
                { label: 'Architecture', value: 'Sharded', trend: 'up' }
              ]
            }}
            position="bottom"
          >
            <div className="text-center cursor-pointer group">
              <motion.div
                className="text-3xl text-gold-500 font-serif group-hover:text-gold-400 transition-colors"
                whileHover={{ scale: 1.05 }}
              >
                ∞
              </motion.div>
              <div className="text-xs uppercase tracking-widest text-white/40 mt-1 group-hover:text-white/60 transition-colors">
                Scalability
              </div>
            </div>
          </InteractiveTooltip>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <motion.button
            onClick={onTakeTour}
            className="px-6 py-3 rounded-full text-sm tracking-[0.2em] uppercase font-medium transition-all duration-300 border border-teal-500/50 text-teal-400 hover:border-teal-400 hover:bg-teal-500/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Star className="inline w-4 h-4 mr-2" />
            Take Tour
          </motion.button>

          <motion.button
            className="px-8 py-4 rounded-full text-sm tracking-[0.3em] uppercase font-medium transition-all duration-300 bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 hover:shadow-gold-glow relative overflow-hidden group"
            whileHover={{ scale: 1.05, boxShadow: `0 0 30px ${BRAND.colors.gold[500]}50` }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10">Enter Genesis</span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-gold-400 to-gold-500 opacity-0 group-hover:opacity-100 transition-opacity"
              initial={false}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.button>

          <motion.a
            href="/Dashboard"
            className="px-8 py-4 rounded-full text-sm tracking-[0.3em] uppercase font-medium transition-all duration-300 border border-gold-500/50 text-gold-500 hover:border-gold-500 hover:bg-gold-500/10 relative group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10">Dashboard</span>
            <motion.div
              className="absolute inset-0 border border-gold-400/30 rounded-full scale-0 group-hover:scale-110 transition-transform"
              transition={{ duration: 0.3 }}
            />
          </motion.a>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          className="flex justify-center items-center gap-6 mt-8 text-xs text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-green-400" />
            <span>Audited & Verified</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <Users size={14} className="text-teal-400" />
            <span>15,000+ Hours Built</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-gold-400" />
            <span>88% Ihsan Score</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.header>
  );
}

// Section component with scroll animations
function Section({
  children,
  className = "",
  number,
  id
}: {
  children: React.ReactNode;
  className?: string;
  number?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [100, 0, 0, -100]);

  return (
    <motion.section
      ref={ref}
      id={id}
      className={`py-32 px-6 md:px-24 border-t border-white/5 relative ${className}`}
      style={{ opacity, y }}
    >
      {number && (
        <div className="absolute top-10 left-10 text-9xl font-serif text-gold-500/10 pointer-events-none">
          {number}
        </div>
      )}
      {children}
    </motion.section>
  );
}

// Main landing page component
export function Landing() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sections, setSections] = useState<Array<{ id: string; title: string; element: HTMLElement }>>([]);

  useEffect(() => {
    setIsLoaded(true);

    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('bizra-onboarding-seen');
    if (!hasSeenOnboarding) {
      // Delay onboarding to let initial animations complete
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Initialize sections for scroll progress
  useEffect(() => {
    const sectionElements = [
      { id: 'macro', title: 'Macro' },
      { id: 'allocation', title: 'Allocation' },
      { id: 'velocity', title: 'Velocity' },
      { id: 'consensus', title: 'Consensus' },
    ].map(({ id, title }) => {
      const element = document.getElementById(id);
      return element ? { id, title, element } : null;
    }).filter(Boolean) as Array<{ id: string; title: string; element: HTMLElement }>;

    setSections(sectionElements);
  }, [isLoaded]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('bizra-onboarding-seen', 'true');
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    localStorage.setItem('bizra-onboarding-seen', 'true');
  };

  return (
    <main className="w-full min-h-screen bg-navy-900 text-white overflow-x-hidden">
      <AnimatePresence>
        {isLoaded && (
          <>
            {/* Onboarding Tour */}
            <LandingOnboarding
              isActive={showOnboarding}
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingSkip}
            />

            {/* Scroll Progress & Navigation */}
            <ScrollProgress sections={sections} />
            {/* Background effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(201, 169, 98, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(201, 169, 98, 0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                  maskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 100%)',
                }}
              />

              {/* Noise overlay */}
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='5' height='5'%3E%3Crect width='5' height='5' fill='%23fff' fill-opacity='0.05'/%3E%3C/svg%3E")`,
                }}
              />
            </div>

            {/* Navigation */}
            <nav
              className="fixed top-0 w-full z-40 px-8 py-6 flex justify-between items-center mix-blend-difference border-b border-white/5 bg-navy-900/50 backdrop-blur-md"
              role="navigation"
              aria-label="Main navigation"
            >
              <div className="flex items-center gap-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 100 100"
                  className="opacity-80"
                  aria-hidden="true"
                  role="img"
                  aria-label="BIZRA logo"
                >
                  <g stroke={BRAND.colors.gold[500]} strokeWidth="2" fill="none">
                    <circle cx="50" cy="50" r="20" />
                    <circle cx="50" cy="30" r="20" />
                    <circle cx="67.3" cy="40" r="20" />
                    <circle cx="50" cy="70" r="20" />
                    <circle cx="32.7" cy="40" r="20" />
                  </g>
                </svg>
                <div className="text-xs uppercase tracking-[0.3em] text-gold-500">
                  BIZRA Sovereign Dashboard
                </div>
              </div>
              <div className="hidden md:flex gap-8 text-xs uppercase tracking-[0.2em] text-white/50">
                <a
                  href="#macro"
                  className="hover:text-gold-400 transition-colors focus:outline-none focus:text-gold-400"
                  aria-label="Navigate to Macro Analysis section"
                >
                  Macro
                </a>
                <a
                  href="#allocation"
                  className="hover:text-gold-400 transition-colors focus:outline-none focus:text-gold-400"
                  aria-label="Navigate to Token Allocation section"
                >
                  Allocation
                </a>
                <a
                  href="#velocity"
                  className="hover:text-gold-400 transition-colors focus:outline-none focus:text-gold-400"
                  aria-label="Navigate to Transaction Velocity section"
                >
                  Velocity
                </a>
                <a
                  href="#consensus"
                  className="hover:text-gold-400 transition-colors focus:outline-none focus:text-gold-400"
                  aria-label="Navigate to Consensus section"
                >
                  Consensus
                </a>
              </div>
            </nav>

            {/* Hero Section */}
            <HeroSection onTakeTour={() => setShowOnboarding(true)} />

            {/* Macro Economics Section */}
            <Section number="01" id="macro">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center max-w-7xl mx-auto">
                <motion.div
                  className="lg:col-span-4"
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <header>
                    <h2 className="text-gold-500 text-xs tracking-[0.4em] uppercase mb-4">Macro Analysis</h2>
                    <h3 className="text-4xl md:text-5xl font-serif text-white mb-6">
                      The Erosion of{' '}
                      <span className="italic text-gold-400">Value</span>
                    </h3>
                  </header>
                  <p className="text-white/50 leading-relaxed mb-8">
                    Since the decoupling from gold in 1971, fiat currencies have lost over 96% of their purchasing power. BIZRA restores the "Gold Standard" through algorithmic scarcity.
                  </p>
                  <div className="flex items-center gap-4 text-sm mb-2">
                    <div className="w-3 h-3 bg-gold-500 rounded-full" aria-hidden="true"></div>
                    <span className="text-white">BIZRA (Stable)</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-3 h-3 bg-navy-800 border border-white/20 rounded-full" aria-hidden="true"></div>
                    <span className="text-white/60">Fiat USD (Decaying)</span>
                  </div>
                </motion.div>

                <motion.div
                  className="lg:col-span-8"
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <figure className="glass-panel p-8 rounded-2xl" role="img" aria-label="Inflation comparison chart showing BIZRA stability vs fiat currency decay">
                    <InflationChart />
                    <figcaption className="sr-only">
                      Chart comparing BIZRA's stable value against fiat currency purchasing power decline from 1971 to 2025
                    </figcaption>
                  </figure>
                </motion.div>
              </div>
            </Section>

            {/* Tokenomics Section */}
            <Section className="bg-navy-950" number="02" id="allocation">
              <motion.div
                className="text-center mb-20"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h2 className="text-gold-500 text-xs tracking-[0.4em] uppercase mb-4">Ecosystem Distribution</h2>
                <h3 className="text-4xl md:text-5xl font-serif text-white">
                  The <span className="italic text-teal-400">Flower</span> of Allocation
                </h3>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1 }}
                  viewport={{ once: true }}
                >
                  <div className="glass-panel p-8 rounded-full aspect-square flex items-center justify-center relative shadow-[0_0_100px_rgba(201,169,98,0.1)]">
                    <TokenomicsChart />
                    <div className="absolute inset-0 border border-gold-500/10 rounded-full scale-90"></div>
                    <div className="absolute inset-0 border border-gold-500/5 rounded-full scale-75"></div>
                  </div>
                </motion.div>

                <motion.div
                  className="space-y-8 pl-0 lg:pl-12"
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  {[
                    { percentage: '40%', title: 'Treasury', desc: 'Locked in the algorithmic reserve to back value stability. The "Root" of the system.' },
                    { percentage: '35%', title: 'Community', desc: 'Distributed to validators, users, and developers. The "Petals" of the system.' },
                    { percentage: '25%', title: 'Liquidity', desc: 'Always available for instant settlement. The "Nectar" of the system.' },
                  ].map((item, index) => (
                    <motion.div
                      key={item.title}
                      className="group cursor-pointer"
                      whileHover={{ x: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="text-gold-400 text-3xl font-serif mb-1 group-hover:text-gold-300 transition-colors">
                        {item.percentage} {item.title}
                      </div>
                      <p className="text-white/40 text-sm">{item.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </Section>

            {/* Velocity Section */}
            <Section number="03" id="velocity">
              <div className="max-w-6xl mx-auto">
                <motion.div
                  className="grid grid-cols-1 lg:grid-cols-2 gap-16"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <div className="glass-panel p-8 rounded-2xl">
                    <h4 className="text-white font-serif text-xl mb-6">Transaction Velocity (TPS)</h4>
                    <div className="chart-container h-[300px]">
                      {/* Velocity chart will be implemented */}
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        Velocity Chart Coming Soon
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <h3 className="text-4xl font-serif text-white mb-6">
                      Speed of <span className="italic text-gold-400">Light</span>
                    </h3>
                    <p className="text-white/50 mb-8 leading-relaxed">
                      Legacy systems rely on batch processing and clearing houses (T+2 days). BIZRA utilizes atomic settlement on a sharded ledger, achieving finality in milliseconds.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { value: '50k+', label: 'TPS Capacity' },
                        { value: '$0.001', label: 'Avg Cost' },
                      ].map((stat) => (
                        <div key={stat.label} className="p-4 border border-white/10 rounded bg-white/5">
                          <div className="text-gold-500 text-2xl font-serif">{stat.value}</div>
                          <div className="text-xs uppercase text-white/40 mt-1">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </Section>

            {/* Adoption Section */}
            <Section id="consensus">
              <motion.div
                className="max-w-7xl mx-auto text-center"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h3 className="text-4xl md:text-5xl font-serif text-white mb-4">
                  Global <span className="italic text-gold-400">Adoption</span> Curve
                </h3>
                <p className="text-white/40 mt-4 mb-12">
                  Projecting growth using Fibonacci sequence modeling.
                </p>

                <div className="glass-panel p-4 md:p-8 rounded-2xl border-gold-500/20 shadow-[0_0_50px_rgba(42,157,143,0.1)]">
                  <AdoptionChart />
                </div>
              </motion.div>
            </Section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 bg-navy-950 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <svg width="40" height="40" viewBox="0 0 100 100" className="mx-auto mb-6 opacity-50">
                  <g stroke={BRAND.colors.gold[500]} strokeWidth="1.5" fill="none">
                    <circle cx="50" cy="50" r="20" />
                    <circle cx="50" cy="30" r="20" />
                    <circle cx="67.3" cy="40" r="20" />
                    <circle cx="67.3" cy="60" r="20" />
                    <circle cx="50" cy="70" r="20" />
                    <circle cx="32.7" cy="60" r="20" />
                    <circle cx="32.7" cy="40" r="20" />
                  </g>
                </svg>
                <div className="text-gold-500 font-serif text-2xl mb-2">BIZRA</div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/30">
                  The Sovereign Standard
                </div>
              </motion.div>
            </footer>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

export default Landing;
