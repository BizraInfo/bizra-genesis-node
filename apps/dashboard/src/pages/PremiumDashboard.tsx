/**
 * PremiumDashboard - World-Class Admin Experience
 * 
 * The dashboard that makes users "feel the difference":
 * - Glass morphism throughout
 * - Real-time metrics with animations
 * - Sacred geometry patterns
 * - Premium card designs
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Users, 
  Zap, 
  TrendingUp, 
  Clock, 
  Star,
  Shield,
  Cpu,
  HardDrive,
  Wifi,
  ChevronRight,
  Bell,
  Settings,
} from 'lucide-react';
import { BizraLogo } from '../components/brand';
import { GlassCard, MetricCard, GlassPanel, CosmicBackground2D } from '../components/premium';

// Animated Counter Hook
function useAnimatedCounter(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return count;
}

// Stats Data
const mainStats = [
  { label: 'Active Sessions', value: 12, icon: Activity, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  { label: 'AI Agents', value: 18, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { label: 'Syntheses Today', value: 47, icon: Zap, color: 'text-gold-500', bg: 'bg-gold-500/10' },
  { label: 'Success Rate', value: 98.5, suffix: '%', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
];

// System Health Data
const systemHealth = [
  { label: 'GPU', value: 78, detail: 'RTX 4090 • 24GB VRAM • 65°C', icon: Cpu },
  { label: 'CPU', value: 45, detail: 'Intel i9-14900 • 32 Cores • 58°C', icon: Cpu },
  { label: 'RAM', value: 52, detail: '67GB / 128GB Used', icon: HardDrive },
  { label: 'Network', value: 23, detail: '23 Peers Connected', icon: Wifi },
];

// Recent Activity
const recentActivity = [
  { action: 'Completed synthesis: "Market Analysis Report"', time: '2 minutes ago', icon: Clock },
  { action: 'Earned achievement: "First Synthesis"', time: '15 minutes ago', icon: Star },
  { action: 'Agent "Researcher" completed analysis', time: '1 hour ago', icon: Users },
  { action: 'Security scan completed: No threats', time: '2 hours ago', icon: Shield },
];

// Sidebar Navigation
const sidebarNav = [
  { id: 'dashboard', icon: Activity, label: 'Dashboard', active: true },
  { id: 'agents', icon: Users, label: 'Agents', badge: '18' },
  { id: 'synthesis', icon: Zap, label: 'Synthesis' },
  { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
  { id: 'monitoring', icon: Shield, label: 'Monitoring' },
];

export function PremiumDashboard() {
  const [blockHeight, setBlockHeight] = useState(1847392);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Simulate block height increase
  useEffect(() => {
    const interval = setInterval(() => {
      setBlockHeight((prev) => prev + 1);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Update time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-navy-900 text-white flex">
      {/* Cosmic Background */}
      <div className="fixed inset-0 z-0">
        <CosmicBackground2D />
      </div>

      {/* Sidebar */}
      <aside className="w-72 bg-navy-800/50 backdrop-blur-xl border-r border-white/5 flex flex-col z-10 relative">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <BizraLogo size={40} variant="minimal" animated={false} />
            <div>
              <div className="text-lg font-semibold text-gold-500">BIZRA</div>
              <div className="text-xs text-gray-500">Genesis Node</div>
            </div>
          </div>
          <div className="mt-3 text-xs font-mono text-gray-600">
            BIZRA-GENESIS-001
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarNav.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                item.active
                  ? 'bg-gold-500/10 text-gold-500 border border-gold-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-500 text-xs">
                  {item.badge}
                </span>
              )}
            </motion.button>
          ))}
        </nav>

        {/* Status */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-gray-400">Node Active</span>
          </div>
          <div className="text-xs text-gray-600 mt-2">v0.9.0-genesis</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-semibold text-white"
            >
              Genesis Node Dashboard
            </motion.h1>
            <p className="text-gray-500 text-sm mt-1">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Uptime: <strong className="text-white">99.97%</strong>
            </span>
            <span className="flex items-center gap-2 text-teal-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              LIVE
            </span>
            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <Bell className="w-5 h-5 text-gray-400" />
            </button>
            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-6 mb-8"
        >
          {mainStats.map((stat, index) => (
            <GlassCard key={stat.label} className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-400">{stat.label}</div>
                  <div className={`text-3xl font-bold ${stat.color} mt-1`}>
                    {stat.value}{stat.suffix || ''}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </motion.div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Blockchain Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Blockchain Status</h3>
                <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 text-xs">
                  Active
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current Block</span>
                  <span className="font-mono text-white">
                    {blockHeight.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Transactions/Sec</span>
                  <span className="text-white">127,439 TPS</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Consensus</span>
                  <span className="text-gold-500">Proof-of-Impact</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Network Peers</span>
                  <span className="text-white">23 Connected</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Finality Time</span>
                  <span className="text-white">0.8s</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* AgentFlow Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">AgentFlow 7B Status</h3>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                  Optimized
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Model</span>
                  <span className="text-white">Qwen2.5-7B-Instruct</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Inference Speed</span>
                  <span className="text-white">1,247 tokens/sec</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Search Tasks</span>
                  <span className="text-green-400">+14.9%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Agentic Reasoning</span>
                  <span className="text-green-400">+14.0%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Math Reasoning</span>
                  <span className="text-green-400">+14.5%</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Proof of Impact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="p-6 h-full">
              <h3 className="font-semibold mb-6">Proof-of-Impact Score</h3>
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-gold-500">8,947</div>
                <div className="text-sm text-gray-400">Total Impact</div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌱</span>
                  <div className="flex-1">
                    <div className="font-medium text-white">2,847.32 SEED</div>
                    <div className="text-xs text-gray-500">+127.45/day</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌸</span>
                  <div className="flex-1">
                    <div className="font-medium text-white">456.78 BLOOM</div>
                    <div className="text-xs text-gray-500">0.12% Governance</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* System Health & Activity */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          {/* System Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="p-6">
              <h3 className="font-semibold mb-6">System Health</h3>
              <div className="space-y-4">
                {systemHealth.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">{item.label}</span>
                      </div>
                      <span className="text-white font-medium">{item.value}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={`h-full rounded-full ${
                          item.value > 80 ? 'bg-red-500' : 
                          item.value > 60 ? 'bg-gold-500' : 'bg-teal-400'
                        }`}
                      />
                    </div>
                    <div className="text-xs text-gray-500">{item.detail}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="p-6">
              <h3 className="font-semibold mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-gold-500/10">
                      <item.icon className="w-4 h-4 text-gold-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{item.action}</p>
                      <span className="text-xs text-gray-500">{item.time}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default PremiumDashboard;
