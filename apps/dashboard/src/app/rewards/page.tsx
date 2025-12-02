'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Coins,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Award,
  Calendar,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw
} from 'lucide-react';
import { api, PoiLedgerEntry } from '@/lib/api';
import { useGenesisSynapse } from '@/hooks/useGenesisSynapse';

type TimeFilter = '24h' | '7d' | '30d' | 'all';
type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected';

export default function RewardsPage() {
  const { synapse } = useGenesisSynapse();
  const [events, setEvents] = useState<PoiLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stats, setStats] = useState({
    total_rewards: 0,
    pending_rewards: 0,
    verified_count: 0,
    pending_count: 0,
    average_reward: 0,
    growth_rate: 0,
  });
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getPoiLedger({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 50,
      });
      setEvents(data);
      
      // Calculate stats
      const verified = data.filter(e => e.status === 'verified');
      const pending = data.filter(e => e.status === 'pending');
      
      setStats({
        total_rewards: verified.reduce((sum, e) => sum + e.reward_amount, 0),
        pending_rewards: pending.reduce((sum, e) => sum + e.reward_amount, 0),
        verified_count: verified.length,
        pending_count: pending.length,
        average_reward: verified.length > 0 
          ? verified.reduce((sum, e) => sum + e.reward_amount, 0) / verified.length 
          : 0,
        growth_rate: 12.5, // Placeholder - would calculate from historical data
      });
    } catch (err) {
      console.error('Failed to load PoI data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);
  
  useEffect(() => {
    loadData();
  }, [loadData, timeFilter]);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };
  
  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      compute: 'Compute Contribution',
      storage: 'Storage Provision',
      bandwidth: 'Bandwidth Sharing',
      inference: 'AI Inference',
      training: 'Model Training',
      validation: 'Validation Task',
    };
    return labels[type] || type;
  };
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-panel border-t-0 border-x-0 rounded-none sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bizra-gold/20 to-bizra-gold/5 flex items-center justify-center border border-bizra-gold/20">
                <Coins className="w-5 h-5 text-bizra-gold" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Proof of Impact Rewards</h1>
                <p className="text-xs text-white/40">Track your contributions and earnings</p>
              </div>
            </div>
            
            <button
              onClick={loadData}
              disabled={isLoading}
              className="btn-glass flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={Coins}
            label="Total Rewards"
            value={stats.total_rewards.toFixed(2)}
            suffix="PoI"
            color="text-bizra-gold"
            trend={stats.growth_rate}
          />
          <StatCard
            icon={Clock}
            label="Pending Rewards"
            value={stats.pending_rewards.toFixed(2)}
            suffix="PoI"
            color="text-yellow-400"
          />
          <StatCard
            icon={CheckCircle}
            label="Verified Events"
            value={stats.verified_count}
            color="text-green-400"
          />
          <StatCard
            icon={Award}
            label="Average Reward"
            value={stats.average_reward.toFixed(3)}
            suffix="PoI"
            color="text-purple-400"
          />
        </motion.div>
        
        {/* Live PoI from Genesis Synapse */}
        {synapse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel-gold p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-bizra-gold" />
                <h3 className="font-semibold">Live PoI Status</h3>
              </div>
              <span className="text-xs text-white/40">
                {new Date(synapse.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-white/5">
                <p className="text-3xl font-bold text-yellow-400">{synapse.poiEventsLastMinute}</p>
                <p className="text-xs text-white/50 mt-1">Events/Minute</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5">
                <p className="text-3xl font-bold text-green-400">{(synapse.ihsanScore * 100).toFixed(0)}%</p>
                <p className="text-xs text-white/50 mt-1">Ihsan Score</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5">
                <p className="text-3xl font-bold text-bizra-gold">{synapse.epoch}</p>
                <p className="text-xs text-white/50 mt-1">Current Epoch</p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/60">Filter:</span>
          </div>
          
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            {(['24h', '7d', '30d', 'all'] as TimeFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1 rounded-md text-sm transition-all ${
                  timeFilter === filter
                    ? 'bg-bizra-gold text-bizra-black'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {filter === 'all' ? 'All Time' : filter}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            {(['all', 'pending', 'verified', 'rejected'] as StatusFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-md text-sm capitalize transition-all ${
                  statusFilter === filter
                    ? 'bg-bizra-gold text-bizra-black'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        
        {/* Events List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel"
        >
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-bizra-gold" />
              PoI Event History
            </h3>
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center text-white/40">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-white/40">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No PoI events found</p>
              <p className="text-sm mt-1">Start contributing resources to earn rewards</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getStatusIcon(event.status)}
                      </div>
                      <div>
                        <p className="font-medium">{getEventTypeLabel(event.type)}</p>
                        <p className="text-sm text-white/50 mt-0.5">
                          {event.description || `${event.type} contribution`}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                          <span className={`capitalize px-2 py-0.5 rounded-full border ${
                            event.status === 'verified' ? 'badge-success' :
                            event.status === 'pending' ? 'badge-warning' :
                            'badge-error'
                          }`}>
                            {event.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        event.status === 'verified' ? 'text-bizra-gold' :
                        event.status === 'pending' ? 'text-yellow-400' :
                        'text-white/30 line-through'
                      }`}>
                        +{event.reward_amount.toFixed(3)}
                      </p>
                      <p className="text-xs text-white/40">PoI Tokens</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
        
        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 glass-panel p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-bizra-gold" />
            How Proof of Impact Works
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-bizra-gold/20 flex items-center justify-center text-bizra-gold font-bold">1</div>
              <h4 className="font-medium">Contribute Resources</h4>
              <p className="text-sm text-white/50">
                Share your compute, storage, or bandwidth with the BIZRA network.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-bizra-gold/20 flex items-center justify-center text-bizra-gold font-bold">2</div>
              <h4 className="font-medium">SAT Verification</h4>
              <p className="text-sm text-white/50">
                System Agent Team validates your contribution's authenticity and quality.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-bizra-gold/20 flex items-center justify-center text-bizra-gold font-bold">3</div>
              <h4 className="font-medium">Earn PoI Tokens</h4>
              <p className="text-sm text-white/50">
                Receive rewards proportional to your impact on the network.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  trend?: number;
}) {
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
        {trend !== undefined && (
          <span className={`text-xs flex items-center gap-0.5 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${color}`}>
        {value}
        {suffix && <span className="text-sm ml-1 text-white/50">{suffix}</span>}
      </p>
      <p className="text-xs text-white/50 mt-1">{label}</p>
    </div>
  );
}
