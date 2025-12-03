'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Cpu, 
  MessageSquare, 
  Calendar,
  Coins,
  Activity,
  ChevronRight,
  Globe,
  Database,
  BarChart3
} from 'lucide-react';
import { useGenesisSynapse } from '@/hooks/useGenesisSynapse';
import { useNodeHealth } from '@/hooks/useNodeHealth';

// Hexagon Icon matching brand identity
const HexagonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
  </svg>
);

const navigationItems = [
  { href: '/chat', label: 'PAT Console', icon: MessageSquare, description: 'AI Assistant Interface' },
  { href: '/plan', label: 'Daily Plan', icon: Calendar, description: '7-Day Resource Allocation' },
  { href: '/resources', label: 'Resources', icon: Cpu, description: 'Contribute & Allocate' },
  { href: '/rewards', label: 'PoI Rewards', icon: Coins, description: 'Proof of Impact Dashboard' },
  { href: '/ops', label: 'System Ops', icon: Activity, description: 'Health & Monitoring' },
  { href: '/knowledge', label: 'Knowledge Base', icon: Database, description: 'Asset Registry & Search' },
  { href: '/bizraverse', label: 'Bizraverse', icon: Globe, description: 'Network Explorer' },
  { href: '/nodeo', label: 'NODEO Console', icon: BarChart3, description: 'Neural Command Center' },
];

interface DashboardProps {
  userName?: string;
}

/**
 * BIZRA Titan Dashboard
 * Mobile Nexus Design - MoMo's Vision
 */
export default function Dashboard({ userName = 'MoMo' }: DashboardProps) {
  const { synapse, connected } = useGenesisSynapse();
  const { health, isConnected } = useNodeHealth();
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  if (!mounted) return null;

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const ihsanScore = synapse?.ihsanScore ? (synapse.ihsanScore * 100).toFixed(0) : '94';
  
  return (
    <div className="min-h-screen bg-[#050B14] text-white flex flex-col relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-[#C9A962]/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* === HEADER === */}
      <header className="px-6 py-6 flex justify-between items-end relative z-20" role="banner">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#2A9D8F] animate-pulse' : 'bg-red-500'}`} />
            <div className="text-[10px] font-mono text-[#C9A962]/60 tracking-[0.2em]">
              NODE: {isConnected ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <h1 className="text-2xl font-serif text-white tracking-wide">
            {getGreeting()},<br/>
            <span className="text-[#C9A962]">{userName}</span>
          </h1>
        </div>
        <div className="flex flex-col items-end">
          {/* Ihsan Badge */}
          <div 
            className="flex items-center gap-2 bg-[#0A1628]/50 border border-[#C9A962]/10 px-2 py-1 rounded-full mb-1"
            role="status"
            aria-label={`Ihsan Score: ${ihsanScore} percent`}
          >
            <div className="w-1.5 h-1.5 bg-[#2A9D8F] rounded-full animate-pulse shadow-[0_0_8px_#2A9D8F]" aria-hidden="true"></div>
            <span className="text-xs font-mono font-bold text-[#2A9D8F]">{ihsanScore}%</span>
          </div>
          <div className="text-[10px] text-white/30 font-mono tracking-widest">IHSAN SCORE</div>
        </div>
      </header>

      {/* === MAIN FEED (Scrollable) === */}
      <main className="flex-1 overflow-y-auto px-6 py-2 space-y-4 pb-32 relative z-10 scrollbar-sovereign">
        
        {/* 1. The Seed State Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#111F33]/60 to-[#050B14]/80 border border-white/5 p-5 rounded-2xl relative overflow-hidden group"
        >
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <svg width="80" height="80" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#fff" fill="none" />
              <circle cx="50" cy="50" r="2" fill="#fff" />
            </svg>
          </div>
          <div className="text-[10px] font-mono text-[#C9A962] tracking-widest mb-2">CURRENT FOCUS</div>
          <div className="text-lg font-medium text-white mb-1">Phase 1: Spine Architecture</div>
          <div className="text-xs text-white/50 leading-relaxed mb-4">Complete the Rust/Axum backend integration.</div>
          
          <div className="h-1 w-full bg-[#050B14] rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A962] w-[75%] shadow-[0_0_10px_#C9A962]"></div>
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-mono text-[#C9A962]/60">
            <span>PROGRESS</span>
            <span>75%</span>
          </div>
        </motion.div>

        {/* Cortex Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#0A1628]/40 border border-white/5 p-4 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              health?.cortex?.status === 'ready' ? 'bg-[#2A9D8F]/20 text-[#2A9D8F]' : 'bg-yellow-500/20 text-yellow-500'
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-white/40 font-mono uppercase tracking-wider">Cortex Core</div>
              <div className="text-sm font-medium text-white">
                {health?.cortex?.model || "Initializing..."}
              </div>
            </div>
          </div>
          <div className={`text-xs px-2 py-1 rounded-full border ${
            health?.cortex?.status === 'ready' 
              ? 'border-[#2A9D8F]/30 text-[#2A9D8F] bg-[#2A9D8F]/10' 
              : 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10'
          }`}>
            {health?.cortex?.status?.toUpperCase() || "WAITING"}
          </div>
        </motion.div>

        {/* 2. PAT Insight */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-4"
        >
          {/* Agent Avatar */}
          <div className="w-10 h-10 rounded-full border border-[#C9A962]/30 flex items-center justify-center bg-[#0A1628] shrink-0">
            <span className="text-xs text-[#C9A962] font-serif">M</span>
          </div>
          {/* Bubble */}
          <div className="bg-[#0A1628]/40 border border-white/5 p-4 rounded-2xl rounded-tl-none text-sm text-white/80 leading-relaxed">
            <span className="text-[#C9A962] font-mono text-[10px] block mb-2 uppercase tracking-widest">Master Reasoner</span>
            I&apos;ve analyzed the <span className="text-[#2A9D8F] border-b border-[#2A9D8F]/20">PoI Ledger</span> patterns. Efficiency is peaking, but we need more documentation to maintain the Ihsan score above 0.90.
          </div>
        </motion.div>

        {/* 3. Proof of Impact Ticker */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="bg-gradient-to-br from-[#111F33]/60 to-[#050B14]/80 border border-white/5 p-4 rounded-xl text-center">
            <div className="text-[10px] text-white/40 font-mono mb-1">BZC EARNED</div>
            <div className="text-xl font-mono text-white">850.0</div>
          </div>
          <div className="bg-gradient-to-br from-[#111F33]/60 to-[#050B14]/80 border border-[#2A9D8F]/20 p-4 rounded-xl text-center">
            <div className="text-[10px] text-[#2A9D8F]/60 font-mono mb-1">IMPACT</div>
            <div className="text-xl font-mono text-[#2A9D8F]">High</div>
          </div>
        </motion.div>

        {/* Navigation Grid */}
        <motion.nav
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-4"
          aria-label="Dashboard modules"
        >
          <h3 className="text-[10px] font-mono text-white/40 tracking-widest mb-4">MODULES</h3>
          <div className="grid grid-cols-2 gap-3">
            {navigationItems.map((item, index) => (
              <Link key={item.href} href={item.href}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-gradient-to-br from-[#111F33]/40 to-[#050B14]/60 border border-white/5 p-4 rounded-xl hover:border-[#C9A962]/30 transition-all group cursor-pointer focus-within:ring-2 focus-within:ring-[#C9A962] focus-within:ring-offset-2 focus-within:ring-offset-[#050B14]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <item.icon className="w-5 h-5 text-[#C9A962] group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#C9A962] transition-colors" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-medium text-white group-hover:text-[#C9A962] transition-colors">{item.label}</div>
                  <div className="text-[10px] text-white/40 mt-1">{item.description}</div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.nav>

      </main>

      {/* === THE NEXUS (Bottom Action Bar) === */}
      <nav 
        className="fixed bottom-0 w-full bg-[#0A1628]/70 backdrop-blur-xl border-t border-[#C9A962]/10 pb-8 pt-4 px-6 z-30 rounded-t-3xl"
        role="navigation"
        aria-label="Quick actions"
      >
        
        {/* Central Button */}
        <Link 
          href="/nodeo" 
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#050B14] rounded-full border border-[#C9A962]/30 flex items-center justify-center shadow-[0_0_20px_rgba(201,169,98,0.15)] group cursor-pointer hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C9A962] focus:ring-offset-2 focus:ring-offset-[#0A1628]"
          aria-label="Open NODEO Console - Neural Command Center"
        >
          <span className="text-[#C9A962] group-hover:scale-110 transition-transform" aria-hidden="true">
            <HexagonIcon />
          </span>
          {/* Pulse Rings */}
          <div className="absolute inset-0 border border-[#C9A962]/20 rounded-full animate-ping opacity-20" aria-hidden="true"></div>
        </Link>

        <div className="flex justify-between items-end mt-2">
          <Link 
            href="/resources" 
            className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
            aria-label="Resources - Contribute and Allocate"
          >
            <Cpu className="w-6 h-6 text-white" aria-hidden="true" />
            <span className="text-[10px] font-mono tracking-widest">APPS</span>
          </Link>

          <div className="text-center mt-8" aria-hidden="true">
            <div className="text-[10px] text-[#C9A962]/40 font-mono tracking-[0.3em] uppercase">Open Console</div>
          </div>

          <Link 
            href="/rewards" 
            className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
            aria-label="Proof of Impact Rewards Dashboard"
          >
            <BarChart3 className="w-6 h-6 text-white" aria-hidden="true" />
            <span className="text-[10px] font-mono tracking-widest">IMPACT</span>
          </Link>
        </div>
      </nav>

    </div>
  );
}
