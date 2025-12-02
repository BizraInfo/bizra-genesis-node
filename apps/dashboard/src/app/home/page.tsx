'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Brain, MessageCircle, Target, Database, Zap, Settings,
  TrendingUp, Activity, ChevronRight, Sparkles, Shield,
  Clock, CheckCircle2, ArrowUpRight, Cpu, Users
} from 'lucide-react';
import { BizraLogoAnimated, GlassCard, GridBackground, BizraNavbar, BizraMobileNav } from '@/components/brand';

interface QuickStat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
}

interface TaskItem {
  id: string;
  title: string;
  agent: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface AgentSummary {
  name: string;
  status: 'active' | 'idle' | 'busy';
  icon: React.ElementType;
  color: string;
}

const QUICK_STATS: QuickStat[] = [
  { label: 'Proof of Impact', value: '2,847.3', change: '+12.4%', trend: 'up', icon: Zap },
  { label: 'Tasks Today', value: '12/18', change: '67% done', trend: 'up', icon: Target },
  { label: 'Ihsan Score', value: '87.5', change: '+2.1', trend: 'up', icon: Shield },
  { label: 'Active Agents', value: '5/7', change: 'Online', trend: 'neutral', icon: Users },
];

const TODAY_TASKS: TaskItem[] = [
  { id: '1', title: 'Review quarterly strategy document', agent: 'Master Reasoner', status: 'completed', priority: 'high' },
  { id: '2', title: 'Analyze user engagement metrics', agent: 'Data Analyzer', status: 'in-progress', priority: 'high' },
  { id: '3', title: 'Draft investor update email', agent: 'Communicator', status: 'pending', priority: 'medium' },
  { id: '4', title: 'Organize research papers', agent: 'Memory Architect', status: 'pending', priority: 'low' },
];

const AGENT_SUMMARY: AgentSummary[] = [
  { name: 'Master Reasoner', status: 'active', icon: Brain, color: 'text-purple-400' },
  { name: 'Data Analyzer', status: 'busy', icon: Zap, color: 'text-green-400' },
  { name: 'Memory Architect', status: 'active', icon: Database, color: 'text-cyan-400' },
  { name: 'Execution Planner', status: 'active', icon: Target, color: 'text-orange-400' },
  { name: 'Ethics Guardian', status: 'active', icon: Shield, color: 'text-yellow-400' },
  { name: 'Communicator', status: 'idle', icon: MessageCircle, color: 'text-blue-400' },
  { name: 'Creative Synth', status: 'idle', icon: Sparkles, color: 'text-pink-400' },
];

export default function HomePage() {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      
      if (hours < 12) setGreeting('Good morning');
      else if (hours < 17) setGreeting('Good afternoon');
      else setGreeting('Good evening');
      
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusDot = (status: AgentSummary['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500 animate-pulse';
      case 'idle': return 'bg-gray-500';
    }
  };

  const getTaskStatusIcon = (status: TaskItem['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'in-progress': return <Activity className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case 'pending': return <Clock className="w-4 h-4 text-white/30" />;
    }
  };

  return (
    <div className="min-h-screen bg-bizra-black text-white pb-24 md:pb-8">
      <GridBackground />
      <BizraNavbar />
      
      <main className="pt-20 px-4 md:px-6 max-w-7xl mx-auto relative z-10">
        {/* Welcome Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-white/50 text-sm mb-1">{greeting}, Architect</p>
              <h1 className="text-2xl md:text-3xl font-serif text-gradient-gold">Node0 Command</h1>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono text-white">{currentTime}</p>
              <p className="text-xs text-white/40">Local Time</p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className="w-5 h-5 text-bizra-gold" />
                    <span className={`text-xs font-mono ${
                      stat.trend === 'up' ? 'text-green-400' : 
                      stat.trend === 'down' ? 'text-red-400' : 'text-white/50'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-xl md:text-2xl font-mono font-bold">{stat.value}</p>
                  <p className="text-xs text-white/40">{stat.label}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tasks & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div>
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { href: '/chat', icon: MessageCircle, label: 'Chat', color: 'text-bizra-gold' },
                  { href: '/plan', icon: Target, label: 'Plan', color: 'text-bizra-teal' },
                  { href: '/agents', icon: Users, label: 'Agents', color: 'text-purple-400' },
                  { href: '/knowledge', icon: Database, label: 'Knowledge', color: 'text-cyan-400' },
                ].map((action) => (
                  <Link key={action.href} href={action.href}>
                    <GlassCard className="p-4 hover:border-bizra-gold/30 transition-all cursor-pointer text-center group">
                      <action.icon className={`w-8 h-8 ${action.color} mx-auto mb-2 group-hover:scale-110 transition-transform`} />
                      <p className="text-sm font-medium">{action.label}</p>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </div>

            {/* Today's Tasks */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Today&apos;s Focus</h2>
                <Link href="/plan" className="text-xs text-bizra-gold hover:text-bizra-gold-light flex items-center gap-1">
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              
              <GlassCard className="divide-y divide-white/5">
                {TODAY_TASKS.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-4 flex items-center gap-4 ${task.status === 'completed' ? 'opacity-50' : ''}`}
                  >
                    {getTaskStatusIcon(task.status)}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through' : ''}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-white/40">{task.agent}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {task.priority}
                    </span>
                  </motion.div>
                ))}
              </GlassCard>
            </div>

            {/* AI Insight Card */}
            <GlassCard variant="gold" className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-bizra-gold/20 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-6 h-6 text-bizra-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">AI Insight</h3>
                  <p className="text-sm text-white/70 mb-4">
                    Based on your patterns, I notice you&apos;re most productive between 9-11 AM. 
                    I&apos;ve scheduled your high-priority tasks for that window tomorrow.
                  </p>
                  <div className="flex gap-3">
                    <button className="text-xs px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                      Adjust Schedule
                    </button>
                    <button className="text-xs px-4 py-2 rounded-full bg-bizra-gold text-bizra-black font-medium hover:bg-bizra-gold-light transition-colors">
                      Accept Recommendation
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right Column - Agent Status & System */}
          <div className="space-y-6">
            {/* Agent Status */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">PAT Status</h2>
                <Link href="/agents" className="text-xs text-bizra-gold hover:text-bizra-gold-light flex items-center gap-1">
                  Manage <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              
              <GlassCard className="p-4">
                <div className="space-y-3">
                  {AGENT_SUMMARY.map((agent) => (
                    <div key={agent.name} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${getStatusDot(agent.status)}`} />
                      <agent.icon className={`w-4 h-4 ${agent.color}`} />
                      <span className="text-sm flex-1">{agent.name}</span>
                      <span className="text-xs text-white/40 capitalize">{agent.status}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* System Health */}
            <div>
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">System Health</h2>
              <GlassCard className="p-4 space-y-4">
                {[
                  { label: 'CPU Usage', value: 34, color: 'from-cyan-500 to-cyan-400' },
                  { label: 'GPU Usage', value: 67, color: 'from-purple-500 to-purple-400' },
                  { label: 'Memory', value: 52, color: 'from-green-500 to-green-400' },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">{metric.label}</span>
                      <span className="font-mono">{metric.value}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${metric.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${metric.value}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
                
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-bizra-gold" />
                      <span className="text-xs">Qwen2.5-8B</span>
                    </div>
                    <span className="text-xs text-green-400">Loaded</span>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/rewards">
                <GlassCard className="p-4 hover:border-bizra-gold/30 transition-all cursor-pointer">
                  <Zap className="w-6 h-6 text-yellow-400 mb-2" />
                  <p className="text-sm font-medium">Rewards</p>
                  <p className="text-xs text-white/40">View PoI</p>
                </GlassCard>
              </Link>
              <Link href="/settings">
                <GlassCard className="p-4 hover:border-bizra-gold/30 transition-all cursor-pointer">
                  <Settings className="w-6 h-6 text-white/50 mb-2" />
                  <p className="text-sm font-medium">Settings</p>
                  <p className="text-xs text-white/40">Configure</p>
                </GlassCard>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <BizraMobileNav />
    </div>
  );
}
