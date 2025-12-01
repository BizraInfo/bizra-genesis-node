/**
 * Premium Invite Index - Entry Point
 * 
 * Premium invite code entry page with:
 * - BIZRA logo animation
 * - Glass morphism form
 * - Particle background
 * - Sacred geometry hints
 * 
 * Uses unified constants from genesis.ts
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  ArrowRight,
  Mail,
  AlertCircle,
  Sparkles,
  Lock,
} from 'lucide-react';
import { BizraLogoAnimated } from '../../../components/brand';
import { SYSTEM, DESIGN } from '../../../constants/genesis';

// Particle system for background
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    particlesRef.current = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.1,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        // Update
        particle.y -= particle.speed;
        if (particle.y < -10) {
          particle.y = canvas.height + 10;
          particle.x = Math.random() * canvas.width;
        }

        // Draw
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 169, 98, ${particle.opacity})`;
        ctx.fill();
      });

      // Draw connections
      ctx.strokeStyle = 'rgba(201, 169, 98, 0.1)';
      ctx.lineWidth = 0.5;
      particlesRef.current.forEach((p1, i) => {
        particlesRef.current.slice(i + 1).forEach((p2) => {
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
};

// Feature card component - unified typography and colors
const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <motion.div
    className="glass-card p-5 rounded-xl"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02, borderColor: 'rgba(201, 169, 98, 0.4)' }}
  >
    <div className="flex items-start gap-4">
      <div className="p-2 rounded-lg bg-gold-500/20">
        <Icon className="w-5 h-5 text-gold-500" />
      </div>
      <div>
        <h3 className="text-white font-medium mb-1 font-sans">{title}</h3>
        <p className="text-white/60 text-sm font-sans">{description}</p>
      </div>
    </div>
  </motion.div>
);

export default function PremiumInviteIndex() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const code = inviteCode.trim().toUpperCase();

      if (!code) {
        setError('Please enter an invite code');
        return;
      }

      if (code.length < 8) {
        setError('Invite codes are at least 8 characters');
        return;
      }

      setIsValidating(true);
      
      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Navigate to premium flow
      router.push(`/invite/premium/${code}`);
    },
    [inviteCode, router]
  );

  return (
    <>
      <Head>
        <title>Enter Invite Code | BIZRA Genesis</title>
        <meta
          name="description"
          content="Enter your Genesis 100 invite code to join BIZRA"
        />
      </Head>

      <div className="min-h-screen bg-navy-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
        <ParticleBackground />

        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 12, repeat: Infinity }}
        />

        {/* Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Side - Form */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Logo */}
                <div className="flex justify-center lg:justify-start mb-8">
                  <BizraLogoAnimated size="md" />
                </div>

                {/* Badge */}
                <motion.div
                  className="flex justify-center lg:justify-start mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gold-500 to-amber-600 text-navy-900 text-sm font-semibold">
                    <Sparkles className="w-4 h-4" />
                    <span>Genesis 100 Program</span>
                  </div>
                </motion.div>

                {/* Heading - unified typography */}
                <h1 className="text-3xl md:text-4xl font-display text-gold-500 text-center lg:text-left mb-4">
                  Enter Your Invite Code
                </h1>
                <p className="text-white/60 text-center lg:text-left mb-8 font-sans">
                  BIZRA is currently in private alpha. Enter your Genesis {SYSTEM.GENESIS_SEATS}{' '}
                  invite code to begin your consciousness journey.
                </p>

                {/* Form */}
                <motion.div
                  className="glass-card p-6 md:p-8 rounded-2xl border-2 border-gold-500/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                        >
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <span className="text-red-400 text-sm">{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Input */}
                    <div className="space-y-2">
                      <label className="text-white/80 text-sm font-medium">
                        Invite Code
                      </label>
                      <div className="relative">
                        <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-500/60" />
                        <input
                          type="text"
                          value={inviteCode}
                          onChange={(e) => {
                            setInviteCode(e.target.value.toUpperCase());
                            setError('');
                          }}
                          placeholder="GENESIS-XXXX-XXXX"
                          autoComplete="off"
                          autoFocus
                          className="w-full bg-white/5 border border-gold-500/30 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-gold-500 transition-colors font-mono tracking-wider uppercase"
                        />
                      </div>
                    </div>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={isValidating}
                      className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-600 rounded-xl text-navy-900 font-semibold text-lg flex items-center justify-center gap-2 hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isValidating ? (
                        <>
                          <motion.div
                            className="w-5 h-5 border-2 border-navy-900/30 border-t-navy-900 rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                          />
                          <span>Validating...</span>
                        </>
                      ) : (
                        <>
                          <span>Validate & Continue</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </motion.button>
                  </form>

                  {/* Divider */}
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/40 text-sm">
                      Don't have a code?
                    </span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Request Access */}
                  <a
                    href="mailto:genesis@bizra.io?subject=Genesis%20100%20Access%20Request"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 border border-gold-500/30 rounded-xl text-gold-500 font-medium hover:bg-white/10 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Request Genesis Access</span>
                  </a>
                </motion.div>

                {/* Footer */}
                <p className="text-center text-white/40 text-sm mt-6">
                  Already have an account?{' '}
                  <Link href="/login" className="text-gold-500 hover:underline">
                    Sign in
                  </Link>
                </p>
              </motion.div>

              {/* Right Side - Features */}
              <motion.div
                className="hidden lg:block"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="space-y-4">
                  <FeatureCard
                    icon={Sparkles}
                    title={`${SYSTEM.TOTAL_AGENTS} Neural Agents`}
                    description="Access our network of specialized AI agents, each trained in unique domains of knowledge and wisdom."
                  />
                  <FeatureCard
                    icon={Lock}
                    title="Blockchain Security"
                    description="Your interactions are secured on-chain with our proof-of-impact verification system."
                  />
                  <FeatureCard
                    icon={Gift}
                    title="Genesis Rewards"
                    description="Early members earn exclusive rewards and permanent benefits as founding participants."
                  />
                </div>

                {/* Stats - unified from SYSTEM */}
                <motion.div
                  className="mt-8 grid grid-cols-3 gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {[
                    { value: String(SYSTEM.TOTAL_AGENTS), label: 'Agents' },
                    { value: String(SYSTEM.GENESIS_SEATS), label: 'Genesis Seats' },
                    { value: '∞', label: 'Possibilities' },
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className="text-2xl font-bold text-gold-500 font-display">
                        {stat.value}
                      </div>
                      <div className="text-white/40 text-sm font-sans">{stat.label}</div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
