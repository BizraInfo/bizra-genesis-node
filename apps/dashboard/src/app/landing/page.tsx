'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BizraLogoAnimated, BizraLogoStatic } from '@/components/brand';

// Lazy load Three.js to reduce initial bundle (~330KB savings)
const GenesisStarfield = dynamic(() => import('./GenesisStarfield'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#050B14] to-[#0A1628]" />
  ),
});

// --- MAIN PAGE ---
export default function LandingPage() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="min-h-screen bg-bizra-black text-white selection:bg-bizra-gold selection:text-bizra-black overflow-x-hidden">
      <GenesisStarfield />

      {/* NAVIGATION */}
      <nav 
        className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-xl bg-bizra-black/60 border-b border-white/5"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3">
          <BizraLogoStatic className="w-10 h-10" />
          <div className="flex flex-col">
            <span className="font-serif tracking-widest text-lg text-gradient-gold">BIZRA</span>
            <span className="text-[10px] text-white/40 font-mono -mt-1">GENESIS NODE</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden md:inline text-xs font-mono text-white/30 tracking-widest">v1.0.1</span>
          <Link href="/onboarding">
            <motion.button 
              className="px-6 py-2.5 border border-bizra-gold/50 text-bizra-gold hover:bg-bizra-gold hover:text-bizra-black transition-all rounded-full uppercase text-xs font-semibold tracking-widest glow-gold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Initialize Node
            </motion.button>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION WITH ANIMATED LOGO */}
      <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 z-10 pt-20">
        <motion.div style={{ y: y1, opacity }} className="max-w-4xl flex flex-col items-center">
          
          {/* BIZRA ANIMATED SEED OF LIFE LOGO */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="mb-8"
          >
            <BizraLogoAnimated size="xl" />
          </motion.div>

          {/* Wordmark */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1, delay: 2.5 }}
            className="text-5xl md:text-7xl font-serif tracking-[0.3em] text-gradient-gold mb-2"
          >
            BIZRA
          </motion.h1>
          
          {/* Arabic Tagline */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 1, delay: 3 }}
            className="text-bizra-gold/60 text-2xl mb-8 font-serif"
          >
            البذرة
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.8, delay: 3.2 }}
            className="text-bizra-gold font-mono text-sm tracking-[0.4em] mb-6 uppercase"
          >
            The Operating System for Dignity
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 1, delay: 3.5 }}
            className="text-4xl md:text-6xl lg:text-7xl font-serif font-medium leading-tight mb-8 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent"
          >
            Reclaim Your Mind.
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 1, delay: 3.8 }}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-12"
          >
            One human. One machine. Zero exploitation.<br/>
            Transform your hardware into a sovereign node that serves 
            <span className="text-white border-b border-bizra-gold/50 mx-2">you</span> 
            and the world.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1, delay: 4.2 }}
            className="flex flex-col md:flex-row gap-6 justify-center items-center"
          >
            <Link href="/onboarding">
              <motion.button 
                className="px-12 py-4 bg-gradient-to-r from-bizra-gold-dark via-bizra-gold to-bizra-gold-dark text-bizra-black font-bold text-sm tracking-widest uppercase rounded-full glow-gold-intense"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Genesis
              </motion.button>
            </Link>
            <span className="text-xs text-white/30 font-mono">
              REQUIRES: GPU / 16GB RAM / INTEGRITY
            </span>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }} 
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 opacity-30"
        >
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-bizra-gold to-transparent"></div>
        </motion.div>
      </section>

      {/* SEMIOTICS SECTION - Brand Meaning */}
      <section className="relative py-32 px-6 z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Sacred Geometry Diagram */}
          <div className="relative aspect-square glass-panel p-12 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-bizra-gold/5 to-transparent rounded-2xl" />
            <svg viewBox="0 0 200 200" className="w-full h-full max-w-sm">
              {/* The Center */}
              <g className="opacity-80">
                <circle cx="100" cy="100" r="30" fill="rgba(201, 169, 98, 0.15)" stroke="#C9A962" strokeWidth="1"/>
                <circle cx="100" cy="100" r="2" fill="#C9A962"/>
                <line x1="100" y1="100" x2="160" y2="100" stroke="#C9A962" strokeWidth="0.5" opacity="0.5" />
                <text x="165" y="103" fill="#C9A962" fontSize="7" fontFamily="monospace" className="uppercase">The Seed (1)</text>
              </g>
              
              {/* The 6 Circles */}
              <g className="opacity-60">
                <circle cx="100" cy="70" r="30" fill="none" stroke="#C9A962" strokeWidth="0.5" strokeDasharray="2 2"/>
                <circle cx="126" cy="85" r="30" fill="none" stroke="#C9A962" strokeWidth="0.5" strokeDasharray="2 2"/>
                <circle cx="126" cy="115" r="30" fill="none" stroke="#C9A962" strokeWidth="0.5" strokeDasharray="2 2"/>
                <circle cx="100" cy="130" r="30" fill="none" stroke="#C9A962" strokeWidth="0.5" strokeDasharray="2 2"/>
                <circle cx="74" cy="115" r="30" fill="none" stroke="#C9A962" strokeWidth="0.5" strokeDasharray="2 2"/>
                <circle cx="74" cy="85" r="30" fill="none" stroke="#C9A962" strokeWidth="0.5" strokeDasharray="2 2"/>
                <line x1="100" y1="70" x2="160" y2="40" stroke="#C9A962" strokeWidth="0.5" opacity="0.5" />
                <text x="165" y="43" fill="#C9A962" fontSize="7" fontFamily="monospace" className="uppercase">The Creation (6)</text>
              </g>
              
              {/* The Flower Result */}
              <g>
                <path d="M100 70 Q115 85 100 100 Q85 85 100 70" fill="#C9A962" opacity="0.6"/>
                <path d="M126 85 Q115 100 100 100 Q115 100 126 85" fill="#C9A962" opacity="0.4"/>
                <line x1="100" y1="100" x2="160" y2="160" stroke="#C9A962" strokeWidth="0.5" opacity="0.5" />
                <text x="165" y="163" fill="#C9A962" fontSize="7" fontFamily="monospace" className="uppercase">The Flower (Unity)</text>
              </g>
            </svg>
          </div>

          {/* Text Content */}
          <div>
            <div className="text-bizra-teal font-mono text-xs tracking-[0.4em] uppercase mb-6">SEMIOTICS</div>
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-8">Sacred Geometry</h2>
            
            <div className="space-y-8">
              <div className="flex gap-6 group cursor-pointer">
                <div className="w-12 h-12 rounded-full border border-bizra-gold/30 flex items-center justify-center text-bizra-gold group-hover:bg-bizra-gold group-hover:text-bizra-black transition-all font-serif">01</div>
                <div>
                  <h4 className="text-xl text-white mb-2 group-hover:text-bizra-gold transition-colors font-serif">The Seed (Nuqta)</h4>
                  <p className="text-white/50 text-sm leading-relaxed">The single central circle represents the Divine Origin (Tawhid). It is the dot under the Bā&apos; (ب), the beginning of all knowledge.</p>
                </div>
              </div>

              <div className="flex gap-6 group cursor-pointer">
                <div className="w-12 h-12 rounded-full border border-bizra-gold/30 flex items-center justify-center text-bizra-gold group-hover:bg-bizra-gold group-hover:text-bizra-black transition-all font-serif">02</div>
                <div>
                  <h4 className="text-xl text-white mb-2 group-hover:text-bizra-gold transition-colors font-serif">The Seed of Life</h4>
                  <p className="text-white/50 text-sm leading-relaxed">The six circles surrounding the one represent the 6 days of creation. It is the perfect balance found in nature, from cells to galaxies.</p>
                </div>
              </div>

              <div className="flex gap-6 group cursor-pointer">
                <div className="w-12 h-12 rounded-full border border-bizra-gold/30 flex items-center justify-center text-bizra-gold group-hover:bg-bizra-gold group-hover:text-bizra-black transition-all font-serif">03</div>
                <div>
                  <h4 className="text-xl text-white mb-2 group-hover:text-bizra-gold transition-colors font-serif">The Bloom (Ihsan)</h4>
                  <p className="text-white/50 text-sm leading-relaxed">Where the circles overlap, they form the flower. This represents the community (Ummah) and the result of the system: Beauty and Excellence.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MANIFESTO SECTION */}
      <section className="relative py-32 px-6 z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div>
            <div className="text-bizra-teal font-mono text-xs tracking-widest mb-4">THE PROBLEM</div>
            <h2 className="text-4xl md:text-5xl font-serif mb-8">The Extraction<br/>Economy.</h2>
            <div className="space-y-6 text-white/50 text-lg leading-relaxed">
              <p>
                Your data is mined. Your attention is sold. Your creativity is owned by platforms that do not know your name.
              </p>
              <p>
                We built the internet, but we became its tenants.
              </p>
              <div className="h-px w-20 bg-white/10 my-8"></div>
              <p className="text-white">
                It is time to become <span className="text-bizra-gold">Landlords</span> of our own digital existence.
              </p>
            </div>
          </div>
          
          <div className="relative h-[500px] glass-panel p-8 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-bizra-teal/20 blur-[80px]"></div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-mono text-white/40">
                <span>OLD WEB</span>
                <span>CENTRALIZED</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[10%] bg-red-900/80"></div>
              </div>
              
              <div className="mt-12 flex justify-between items-center text-sm font-mono text-bizra-gold">
                <span>BIZRA NODE</span>
                <span>SOVEREIGN</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-bizra-gold glow-gold"
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                />
              </div>
            </div>

            <div className="font-mono text-xs text-white/30 text-right">
              {'>'} SYSTEM_ARCHITECTURE: DISTRIBUTED<br/>
              {'>'} CONSENSUS: PROOF_OF_IMPACT<br/>
              {'>'} EXPLOITATION: 0%
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE TRIFECTA */}
      <section className="py-32 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {[
            { icon: '✦', color: 'bizra-gold', title: 'Sovereign AI', desc: 'Your own Personal Agent Team (PAT). They live on your machine. They optimize your life. They never leak your secrets.' },
            { icon: '❖', color: 'bizra-teal', title: 'Proof of Impact', desc: "Don't just burn electricity. Earn value by contributing real work—computation, storage, and knowledge—to the network." },
            { icon: '∞', color: 'purple-500', title: 'Fractal Scale', desc: 'Start as one seed. Connect to the forest. A network built on the laws of nature and the standard of Ihsan.' },
          ].map((feature, i) => (
            <motion.article 
              key={i}
              className="glass-panel p-8 hover:border-bizra-gold/30 transition-colors group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              viewport={{ once: true }}
            >
              <div className={`text-3xl mb-6 text-${feature.color} group-hover:scale-110 transition-transform origin-left`}>{feature.icon}</div>
              <h3 className="text-2xl font-serif mb-4">{feature.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
            </motion.article>
          ))}

        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-32 text-center z-10 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-bizra-gold/10 to-transparent pointer-events-none" />
        <h2 className="text-4xl md:text-6xl font-serif mb-8">Ready to Plant the Seed?</h2>
        <Link href="/onboarding">
          <motion.button 
            className="px-16 py-5 bg-white text-bizra-black font-bold text-lg tracking-widest uppercase rounded-full hover:bg-bizra-gold transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Enter Node0
          </motion.button>
        </Link>
        <div className="mt-8 text-xs font-mono text-white/30">
          BIZRA GENESIS PROTOCOL // EST. 2025
        </div>
      </section>

    </div>
  );
}
