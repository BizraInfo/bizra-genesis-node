'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Cpu, 
  Zap, 
  Shield, 
  BarChart3, 
  MessageSquare, 
  Calendar,
  Coins,
  Activity,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useGenesisSynapse } from '@/hooks/useGenesisSynapse';

const navigationItems = [
  { href: '/onboarding', label: 'Begin Journey', icon: Sparkles, description: 'Seed Test & PAT Selection' },
  { href: '/chat', label: 'PAT Console', icon: MessageSquare, description: 'AI Assistant Interface' },
  { href: '/plan', label: 'Daily Plan', icon: Calendar, description: '7-Day Resource Allocation' },
  { href: '/resources', label: 'Resources', icon: Cpu, description: 'Contribute & Allocate' },
  { href: '/rewards', label: 'PoI Rewards', icon: Coins, description: 'Proof of Impact Dashboard' },
  { href: '/ops', label: 'System Ops', icon: Activity, description: 'Health & Monitoring' },
];

export default function HomePage() {
  const { synapse, status, connectionStatus } = useGenesisSynapse();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-t-0 border-x-0 rounded-none">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bizra-gold to-bizra-gold-dark flex items-center justify-center glow-gold">
              <Shield className="w-7 h-7 text-bizra-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient-gold">BIZRA Node0</h1>
              <p className="text-xs text-white/50">Genesis Synapse Dashboard</p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              connectionStatus === 'connected' 
                ? 'badge-success' 
                : connectionStatus === 'connecting'
                ? 'badge-warning'
                : 'badge-error'
            }`}>
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                }`} />
                {connectionStatus === 'connected' ? 'Live' : connectionStatus}
              </span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to <span className="text-gradient-sovereign">Sovereign AI</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Your personal AI infrastructure, running locally on your hardware.
            Complete ownership. Zero external dependency. Infinite possibility.
          </p>
        </motion.section>
        
        {/* Genesis Synapse Status */}
        {synapse && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-12"
          >
            <div className="glass-panel-gold p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-bizra-gold" />
                  <h3 className="text-lg font-semibold">Genesis Synapse Status</h3>
                </div>
                <span className="text-xs text-white/40 font-mono">
                  {new Date(synapse.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                  label="CPU Usage" 
                  value={`${synapse.system.cpu_usage.toFixed(1)}%`}
                  status={synapse.system.cpu_usage > 80 ? 'warning' : 'success'}
                />
                <MetricCard 
                  label="Memory" 
                  value={`${((synapse.system.memory_used / synapse.system.memory_total) * 100).toFixed(1)}%`}
                  status={synapse.system.memory_used / synapse.system.memory_total > 0.9 ? 'warning' : 'success'}
                />
                <MetricCard 
                  label="GPU Usage" 
                  value={`${synapse.system.gpu_usage.toFixed(1)}%`}
                  status={synapse.system.gpu_usage > 90 ? 'warning' : 'success'}
                />
                <MetricCard 
                  label="Active Agents" 
                  value={synapse.agents.pat_active + synapse.agents.sat_active}
                  status="info"
                />
              </div>
              
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-2xl font-bold text-bizra-gold">{synapse.poi.pending}</p>
                  <p className="text-xs text-white/50">Pending PoI</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-2xl font-bold text-green-400">{synapse.poi.verified}</p>
                  <p className="text-xs text-white/50">Verified PoI</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-2xl font-bold text-purple-400">{synapse.poi.rewards_pending.toFixed(2)}</p>
                  <p className="text-xs text-white/50">Pending Rewards</p>
                </div>
              </div>
            </div>
          </motion.section>
        )}
        
        {/* Navigation Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-bizra-gold" />
            Dashboard Modules
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {navigationItems.map((item, index) => (
              <Link key={item.href} href={item.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  className="glass-panel p-6 card-hover group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-bizra-gold/10 flex items-center justify-center group-hover:bg-bizra-gold/20 transition-colors">
                      <item.icon className="w-6 h-6 text-bizra-gold" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-bizra-gold group-hover:translate-x-1 transition-all" />
                  </div>
                  <h4 className="font-semibold mb-1 group-hover:text-bizra-gold transition-colors">
                    {item.label}
                  </h4>
                  <p className="text-sm text-white/50">
                    {item.description}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      </div>
      
      {/* Footer */}
      <footer className="glass-panel border-b-0 border-x-0 rounded-none mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-sm text-white/40">
          <p>BIZRA Network © 2024 - Sovereign AI Infrastructure</p>
          <p className="font-mono text-xs">Node0 v1.0.0</p>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  status 
}: { 
  label: string; 
  value: string | number; 
  status: 'success' | 'warning' | 'error' | 'info';
}) {
  const statusColors = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-blue-400',
  };
  
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className={`text-xl font-bold ${statusColors[status]}`}>{value}</p>
    </div>
  );
}
