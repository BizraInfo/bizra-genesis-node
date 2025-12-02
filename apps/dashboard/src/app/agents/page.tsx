'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Database, Sparkles, Zap, Users, Wrench, Shield,
  Activity, TrendingUp, Clock, Target, MessageCircle,
  CheckCircle2, XCircle, Pause, Play, Settings,
  ChevronRight, MoreVertical, RefreshCw, Power
} from 'lucide-react';
import { BizraLogoAnimated, GlassCard, GridBackground, BizraNavbar, BizraMobileNav } from '@/components/brand';

// Types
interface AgentStatus {
  id: string;
  name: string;
  role: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  tasksCompleted: number;
  currentTask: string | null;
  poiGenerated: number;
  uptime: string;
  lastActive: string;
}

interface SystemMetrics {
  cpuUsage: number;
  gpuUsage: number;
  ramUsage: number;
  modelLoaded: string;
  tokensProcessed: number;
  poiTotal: number;
  ihsanScore: number;
}

interface RecentActivity {
  id: string;
  agent: string;
  action: string;
  timestamp: string;
  poi: number;
}

const INITIAL_AGENTS: AgentStatus[] = [
  { 
    id: 'master-reasoner', 
    name: 'Master Reasoner', 
    role: 'Strategic Analysis',
    icon: Brain, 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/20',
    status: 'active',
    tasksCompleted: 147,
    currentTask: 'Analyzing quarterly strategy...',
    poiGenerated: 234.5,
    uptime: '14h 23m',
    lastActive: 'now'
  },
  { 
    id: 'memory-architect', 
    name: 'Memory Architect', 
    role: 'Knowledge Management',
    icon: Database, 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/20',
    status: 'busy',
    tasksCompleted: 892,
    currentTask: 'Indexing new documents...',
    poiGenerated: 456.2,
    uptime: '14h 23m',
    lastActive: 'now'
  },
  { 
    id: 'creative-synthesizer', 
    name: 'Creative Synthesizer', 
    role: 'Content Creation',
    icon: Sparkles, 
    color: 'text-pink-400', 
    bgColor: 'bg-pink-500/20',
    status: 'idle',
    tasksCompleted: 67,
    currentTask: null,
    poiGenerated: 123.8,
    uptime: '14h 23m',
    lastActive: '5m ago'
  },
  { 
    id: 'data-analyzer', 
    name: 'Data Analyzer', 
    role: 'Analytics & Insights',
    icon: Zap, 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/20',
    status: 'active',
    tasksCompleted: 234,
    currentTask: 'Processing usage patterns...',
    poiGenerated: 567.3,
    uptime: '14h 23m',
    lastActive: 'now'
  },
  { 
    id: 'communicator', 
    name: 'Communicator', 
    role: 'Expression & Writing',
    icon: MessageCircle, 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20',
    status: 'idle',
    tasksCompleted: 312,
    currentTask: null,
    poiGenerated: 189.4,
    uptime: '14h 23m',
    lastActive: '12m ago'
  },
  { 
    id: 'execution-planner', 
    name: 'Execution Planner', 
    role: 'Task Orchestration',
    icon: Wrench, 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/20',
    status: 'active',
    tasksCompleted: 456,
    currentTask: 'Scheduling tomorrow\'s tasks...',
    poiGenerated: 345.6,
    uptime: '14h 23m',
    lastActive: 'now'
  },
  { 
    id: 'ethics-guardian', 
    name: 'Ethics Guardian', 
    role: 'Value Alignment',
    icon: Shield, 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/20',
    status: 'active',
    tasksCompleted: 1203,
    currentTask: 'Monitoring agent behaviors...',
    poiGenerated: 89.2,
    uptime: '14h 23m',
    lastActive: 'now'
  },
];

const RECENT_ACTIVITIES: RecentActivity[] = [
  { id: '1', agent: 'Master Reasoner', action: 'Completed strategic analysis for Q1 planning', timestamp: '2m ago', poi: 12.5 },
  { id: '2', agent: 'Memory Architect', action: 'Indexed 147 new documents to knowledge base', timestamp: '5m ago', poi: 8.3 },
  { id: '3', agent: 'Data Analyzer', action: 'Generated usage insights report', timestamp: '8m ago', poi: 15.2 },
  { id: '4', agent: 'Execution Planner', action: 'Optimized task schedule for tomorrow', timestamp: '12m ago', poi: 6.7 },
  { id: '5', agent: 'Ethics Guardian', action: 'Validated 23 agent decisions for alignment', timestamp: '15m ago', poi: 4.1 },
];

export default function AgentDashboardPage() {
  const [agents, setAgents] = useState<AgentStatus[]>(INITIAL_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpuUsage: 34,
    gpuUsage: 67,
    ramUsage: 52,
    modelLoaded: 'Qwen2.5-8B-Instruct',
    tokensProcessed: 1247832,
    poiTotal: 2006.0,
    ihsanScore: 87.5,
  });
  const [activities] = useState<RecentActivity[]>(RECENT_ACTIVITIES);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        cpuUsage: Math.max(20, Math.min(80, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        gpuUsage: Math.max(40, Math.min(95, prev.gpuUsage + (Math.random() - 0.5) * 8)),
        ramUsage: Math.max(30, Math.min(70, prev.ramUsage + (Math.random() - 0.5) * 5)),
        tokensProcessed: prev.tokensProcessed + Math.floor(Math.random() * 100),
        poiTotal: prev.poiTotal + Math.random() * 0.5,
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: AgentStatus['status']) => {
    switch (status) {
      case 'active': return <Activity className="w-3 h-3 text-green-400" />;
      case 'busy': return <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />;
      case 'idle': return <Pause className="w-3 h-3 text-gray-400" />;
      case 'offline': return <XCircle className="w-3 h-3 text-red-400" />;
    }
  };

  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'busy': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'idle': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'offline': return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-bizra-black text-white pb-24 md:pb-0">
      <GridBackground />
      <BizraNavbar />
      
      <main className="pt-20 px-4 md:px-6 max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif text-gradient-gold">Agent Command Center</h1>
              <p className="text-white/50 text-sm">Personal Agentic Team • All 7 agents operational</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-sm font-mono">LIVE</span>
              </div>
              <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* System Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 uppercase tracking-wider">CPU</span>
              <span className="text-sm font-mono text-bizra-gold">{metrics.cpuUsage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                animate={{ width: `${metrics.cpuUsage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </GlassCard>
          
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 uppercase tracking-wider">GPU</span>
              <span className="text-sm font-mono text-bizra-gold">{metrics.gpuUsage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400"
                animate={{ width: `${metrics.gpuUsage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </GlassCard>
          
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 uppercase tracking-wider">RAM</span>
              <span className="text-sm font-mono text-bizra-gold">{metrics.ramUsage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-green-500 to-green-400"
                animate={{ width: `${metrics.ramUsage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </GlassCard>
          
          <GlassCard variant="gold" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 uppercase tracking-wider">Total PoI</span>
              <TrendingUp className="w-4 h-4 text-bizra-gold" />
            </div>
            <div className="text-2xl font-mono text-bizra-gold">{metrics.poiTotal.toFixed(1)}</div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-bizra-gold" />
              PAT Agents
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <motion.div
                  key={agent.id}
                  layoutId={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className="cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <GlassCard className="p-4 hover:border-bizra-gold/30 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${agent.bgColor} flex items-center justify-center`}>
                          <agent.icon className={`w-6 h-6 ${agent.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{agent.name}</h3>
                          <p className="text-xs text-white/40">{agent.role}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${getStatusColor(agent.status)}`}>
                        {getStatusIcon(agent.status)}
                        <span className="capitalize">{agent.status}</span>
                      </div>
                    </div>
                    
                    {agent.currentTask && (
                      <div className="mb-3 p-2 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-xs text-white/60 truncate">{agent.currentTask}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-white/40">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          {agent.tasksCompleted}
                        </span>
                        <span className="text-bizra-gold font-mono">
                          +{agent.poiGenerated.toFixed(1)} PoI
                        </span>
                      </div>
                      <span className="text-white/30">{agent.lastActive}</span>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Model Status */}
            <GlassCard className="p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-bizra-gold" />
                Active Model
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-mono text-sm">{metrics.modelLoaded}</p>
                  <p className="text-xs text-white/40">8B parameters • 4-bit quantized</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded-lg bg-white/5">
                  <p className="text-white/40">Tokens/sec</p>
                  <p className="font-mono text-lg">42.3</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <p className="text-white/40">Total Tokens</p>
                  <p className="font-mono text-lg">{(metrics.tokensProcessed / 1000).toFixed(0)}k</p>
                </div>
              </div>
            </GlassCard>

            {/* Ihsan Score */}
            <GlassCard variant="gold" className="p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Ihsan Score
              </h3>
              <div className="relative w-full aspect-square max-w-[160px] mx-auto mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke="url(#ihsan-gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${metrics.ihsanScore * 2.83} 283`}
                    initial={{ strokeDasharray: '0 283' }}
                    animate={{ strokeDasharray: `${metrics.ihsanScore * 2.83} 283` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                  <defs>
                    <linearGradient id="ihsan-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#C9A962" />
                      <stop offset="100%" stopColor="#2A9D8F" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-bizra-gold">{metrics.ihsanScore}</span>
                  <span className="text-xs text-white/40">Excellence</span>
                </div>
              </div>
              <p className="text-xs text-white/50 text-center">
                Ethical alignment & value consistency
              </p>
            </GlassCard>

            {/* Recent Activity */}
            <GlassCard className="p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-bizra-gold" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {activities.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-bizra-gold mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 truncate">{activity.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white/40">{activity.agent}</span>
                        <span className="text-bizra-gold font-mono">+{activity.poi} PoI</span>
                      </div>
                    </div>
                    <span className="text-white/30 flex-shrink-0">{activity.timestamp}</span>
                  </div>
                ))}
              </div>
              <Link 
                href="/rewards" 
                className="mt-4 flex items-center justify-center gap-2 text-xs text-bizra-gold hover:text-bizra-gold-light transition-colors"
              >
                View All Activity
                <ChevronRight className="w-3 h-3" />
              </Link>
            </GlassCard>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/chat">
            <GlassCard className="p-4 hover:border-bizra-gold/30 transition-all cursor-pointer">
              <MessageCircle className="w-8 h-8 text-bizra-gold mb-3" />
              <h4 className="font-semibold">Chat with PAT</h4>
              <p className="text-xs text-white/40">Open AI console</p>
            </GlassCard>
          </Link>
          <Link href="/plan">
            <GlassCard className="p-4 hover:border-bizra-gold/30 transition-all cursor-pointer">
              <Target className="w-8 h-8 text-bizra-teal mb-3" />
              <h4 className="font-semibold">Daily Plan</h4>
              <p className="text-xs text-white/40">View today's tasks</p>
            </GlassCard>
          </Link>
          <Link href="/knowledge">
            <GlassCard className="p-4 hover:border-bizra-gold/30 transition-all cursor-pointer">
              <Database className="w-8 h-8 text-cyan-400 mb-3" />
              <h4 className="font-semibold">Knowledge Base</h4>
              <p className="text-xs text-white/40">Explore your data</p>
            </GlassCard>
          </Link>
          <Link href="/rewards">
            <GlassCard className="p-4 hover:border-bizra-gold/30 transition-all cursor-pointer">
              <Zap className="w-8 h-8 text-yellow-400 mb-3" />
              <h4 className="font-semibold">PoI Rewards</h4>
              <p className="text-xs text-white/40">Track your impact</p>
            </GlassCard>
          </Link>
        </div>
      </main>

      <BizraMobileNav />

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedAgent(null)}
          >
            <motion.div
              layoutId={selectedAgent.id}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <GlassCard className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl ${selectedAgent.bgColor} flex items-center justify-center`}>
                      <selectedAgent.icon className={`w-8 h-8 ${selectedAgent.color}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedAgent.name}</h2>
                      <p className="text-sm text-white/50">{selectedAgent.role}</p>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border mt-2 ${getStatusColor(selectedAgent.status)}`}>
                        {getStatusIcon(selectedAgent.status)}
                        <span className="capitalize">{selectedAgent.status}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {selectedAgent.currentTask && (
                  <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-white/40 mb-1">Current Task</p>
                    <p className="text-sm">{selectedAgent.currentTask}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-white/40 mb-1">Tasks Completed</p>
                    <p className="text-2xl font-mono">{selectedAgent.tasksCompleted}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-bizra-gold/10 border border-bizra-gold/20">
                    <p className="text-xs text-white/40 mb-1">PoI Generated</p>
                    <p className="text-2xl font-mono text-bizra-gold">+{selectedAgent.poiGenerated.toFixed(1)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-white/40 mb-1">Uptime</p>
                    <p className="text-lg font-mono">{selectedAgent.uptime}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-white/40 mb-1">Last Active</p>
                    <p className="text-lg font-mono">{selectedAgent.lastActive}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 btn-glass flex items-center justify-center gap-2">
                    <Pause className="w-4 h-4" />
                    Pause Agent
                  </button>
                  <button className="flex-1 btn-sovereign flex items-center justify-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Chat Now
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
