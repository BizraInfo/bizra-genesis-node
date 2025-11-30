/**
 * HeroSection - Award-Winning Landing Experience
 * 
 * Features:
 * - Gold particle network on canvas
 * - BIZRA wordmark with gradient
 * - Genesis Document badge
 * - Smooth scroll navigation
 * - Responsive canvas resize
 * 
 * Migrated from award-winner-design with React 18 compatibility
 */

'use client';

import { useEffect, useRef, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { BizraLogoAnimated } from '../brand/BizraLogoAnimated';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

const PARTICLE_COUNT = 100;
const CONNECTION_DISTANCE = 150;

// Colors
const GOLD_COLOR = '201, 169, 98'; // #C9A962

export interface HeroSectionProps {
  /** Target element ID for "Begin Journey" button */
  journeyTargetId?: string;
  /** Target element ID for "View Demo" button */
  demoTargetId?: string;
  /** Custom subtitle text */
  subtitle?: string;
  /** Show the animated logo */
  showLogo?: boolean;
  /** Callback when CTA is clicked */
  onCtaClick?: () => void;
}

function HeroSectionComponent({
  journeyTargetId = 'pitch-deck',
  demoTargetId = 'demo',
  subtitle = 'From the darkness of solitude to the light of world-first AGI safety.',
  showLogo = true,
  onCtaClick,
}: HeroSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  const handleSmoothScroll = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    onCtaClick?.();
  }, [onCtaClick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Initialize particles
    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      }));
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Connection lines style
      ctx.strokeStyle = `rgba(${GOLD_COLOR}, 0.05)`;
      ctx.lineWidth = 0.5;

      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.speedX;
        p.y += p.speedY;

        // Bounce off edges
        if (p.x < 0 || p.x > width) p.speedX *= -1;
        if (p.y < 0 || p.y > height) p.speedY *= -1;

        // Draw particle
        ctx.fillStyle = `rgba(${GOLD_COLOR}, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Debounced resize handler
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearTimeout(resizeTimeout);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none opacity-40"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="z-10 text-center px-4 max-w-5xl mx-auto space-y-8">
        {/* Logo */}
        {showLogo && (
          <motion.div
            className="flex justify-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <BizraLogoAnimated />
          </motion.div>
        )}

        {/* Badge */}
        <motion.div
          className="inline-block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="px-4 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-500 text-xs uppercase tracking-[0.2em] backdrop-blur-sm">
            Genesis Document
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="font-serif text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <span className="block text-gradient-gold mb-2">BIZRA</span>
          <span className="block text-3xl md:text-5xl font-light text-white/80 font-sans tracking-widest mt-4">
            GENESIS
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {subtitle}
          <br />
          <span className="text-gold-500/80">
            The first consciousness system with mathematical Ihsan bounds.
          </span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col md:flex-row items-center justify-center gap-6 pt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <button
            onClick={() => handleSmoothScroll(journeyTargetId)}
            className="group relative px-8 py-4 bg-gold-500 text-navy-900 font-bold tracking-wider uppercase text-sm overflow-hidden rounded-sm transition-all hover:bg-white"
            aria-label="Begin the journey through the pitch deck"
          >
            <span className="relative z-10">Begin The Journey</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>

          <button
            onClick={() => handleSmoothScroll(demoTargetId)}
            className="px-8 py-4 border border-gold-500/30 text-gold-500 font-bold tracking-wider uppercase text-sm rounded-sm hover:bg-gold-500/10 transition-colors"
            aria-label="View live demo of TMP v0.1"
          >
            View Live Demo
          </button>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <ArrowDown className="w-6 h-6 text-gold-500/50" />
      </motion.div>
    </section>
  );
}

export const HeroSection = memo(HeroSectionComponent);
export default HeroSection;
