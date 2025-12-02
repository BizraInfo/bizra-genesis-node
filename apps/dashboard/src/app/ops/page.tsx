'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Layers,
  Box,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react';
import { api } from '@/lib/api';
import { useGenesisSynapse } from '@/hooks/useGenesisSynapse';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  message?: string;
}

export default function OpsPage() {
  const { synapse, connected, connecting, error: wsError } = useGenesisSynapse();
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Rust Backend', status: 'healthy' },
    { name: 'PostgreSQL', status: 'healthy' },
    { name: 'Redis Cache', status: 'healthy' },
    { name: 'Ollama LLM', status: 'healthy' },
    { name: 'Neo4j Graph', status: 'healthy' },
    { name: 'Qdrant Vector', status: 'healthy' },
    { name: 'Telemetry Bridge', status: 'healthy' },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<{
    overall: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    last_check: string;
  } | null>(null);
  
  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const health = await api.healthCheck();
      
      // Update service statuses based on health check
      setServices(prev => prev.map(service => {
        if (service.name === 'Rust Backend') {
          return { ...service, status: health.status === 'ok' ? 'healthy' : 'down' };
        }
        if (service.name === 'PostgreSQL') {
          return { ...service, status: health.postgres ? 'healthy' : 'down' };
        }
        if (service.name === 'Redis Cache') {
          return { ...service, status: health.redis ? 'healthy' : 'down' };
        }
        if (service.name === 'Ollama LLM') {
          return { ...service, status: health.ollama ? 'healthy' : 'degraded' };
        }
        return service;
      }));
      
      // Update telemetry bridge status
      setServices(prev => prev.map(service => {
        if (service.name === 'Telemetry Bridge') {
          return { 
            ...service, 
            status: connected ? 'healthy' : 
                    connecting ? 'degraded' : 'down'
          };
        }
        return service;
      }));
      
      setSystemHealth({
        overall: health.status === 'ok' ? 'healthy' : 'degraded',
        uptime: health.uptime || 0,
        last_check: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Health check failed:', err);
      setServices(prev => prev.map(s => 
        s.name === 'Rust Backend' ? { ...s, status: 'down' as const } : s
      ));
    } finally {
      setIsLoading(false);
    }
  }, [connected, connecting]);
  
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);
  
  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'down': return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };
  
  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'degraded': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'down': return 'text-red-400 bg-red-500/10 border-red-500/30';
    }
  };
  
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const downCount = services.filter(s => s.status === 'down').length;
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-panel border-t-0 border-x-0 rounded-none sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center border border-cyan-500/20">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">System Operations</h1>
                <p className="text-xs text-white/40">Health monitoring & infrastructure status</p>
              </div>
            </div>
            
            <button
              onClick={checkHealth}
              disabled={isLoading}
              className="btn-glass text-sm flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Check Health
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Overall Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel-gold p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">System Health Overview</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-sm text-white/60">{healthyCount} Healthy</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-sm text-white/60">{degradedCount} Degraded</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-sm text-white/60">{downCount} Down</span>
                </div>
              </div>
            </div>
            
            <div className={`px-4 py-2 rounded-xl border ${
              downCount === 0 && degradedCount === 0
                ? 'badge-success'
                : downCount > 0
                ? 'badge-error'
                : 'badge-warning'
            }`}>
              <span className="text-lg font-bold">
                {downCount === 0 && degradedCount === 0 
                  ? 'All Systems Operational' 
                  : downCount > 0 
                  ? 'Critical Issues' 
                  : 'Partial Degradation'}
              </span>
            </div>
          </div>
          
          {systemHealth && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-6 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last check: {new Date(systemHealth.last_check).toLocaleTimeString()}
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Uptime: {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Live Telemetry */}
        {synapse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-bizra-gold animate-pulse" />
                Live Genesis Synapse
              </h3>
              <span className={`text-xs px-2 py-1 rounded-full ${
                connected ? 'badge-success' : 'badge-warning'
              }`}>
                {connected ? 'connected' : connecting ? 'connecting' : 'disconnected'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={Cpu}
                label="CPU Usage"
                value={`${synapse.resources.cpuUsage.toFixed(1)}%`}
                color={synapse.resources.cpuUsage > 80 ? 'text-yellow-400' : 'text-blue-400'}
              />
              <MetricCard
                icon={HardDrive}
                label="Memory"
                value={`${synapse.resources.memoryUsage.toFixed(1)}%`}
                color="text-purple-400"
              />
              <MetricCard
                icon={Box}
                label="GPU Usage"
                value={`${(synapse.resources.gpuUsage || 0).toFixed(1)}%`}
                color={(synapse.resources.gpuUsage || 0) > 90 ? 'text-yellow-400' : 'text-green-400'}
              />
              <MetricCard
                icon={Database}
                label="Latency"
                value={`${(synapse.latencyUs / 1000).toFixed(1)}ms`}
                color="text-orange-400"
              />
            </div>
            
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <p className="text-2xl font-bold text-bizra-gold">{synapse.activeAgents.PAT}</p>
                <p className="text-xs text-white/50">Active PAT Agents</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <p className="text-2xl font-bold text-cyan-400">{synapse.activeAgents.SAT}</p>
                <p className="text-xs text-white/50">Active SAT Agents</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <p className="text-2xl font-bold text-yellow-400">{synapse.poiEventsLastMinute}</p>
                <p className="text-xs text-white/50">PoI Events/min</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <p className="text-2xl font-bold text-green-400">{(synapse.ihsanScore * 100).toFixed(0)}%</p>
                <p className="text-xs text-white/50">Ihsan Score</p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Services Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-bizra-gold" />
            Infrastructure Services
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className={`glass-panel p-4 border ${getStatusColor(service.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-white/40 capitalize">{service.status}</p>
                    </div>
                  </div>
                  {service.latency && (
                    <span className="text-xs text-white/40">{service.latency}ms</span>
                  )}
                </div>
                {service.message && (
                  <p className="mt-2 text-xs text-white/50 border-t border-white/5 pt-2">
                    {service.message}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Docker Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6 mt-8"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-bizra-gold" />
            Docker Containers
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/10">
                  <th className="pb-2 font-medium">Container</th>
                  <th className="pb-2 font-medium">Image</th>
                  <th className="pb-2 font-medium">Port</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { name: 'bizra-postgres', image: 'postgres:16', port: '5432', status: 'running' },
                  { name: 'bizra-redis', image: 'redis:7', port: '6379', status: 'running' },
                  { name: 'bizra-ollama', image: 'ollama/ollama', port: '11434', status: 'running' },
                  { name: 'bizra-neo4j', image: 'neo4j:5.15', port: '7474', status: 'running' },
                  { name: 'bizra-qdrant', image: 'qdrant/qdrant', port: '6333', status: 'running' },
                ].map((container) => (
                  <tr key={container.name} className="text-white/70">
                    <td className="py-3 font-mono text-xs">{container.name}</td>
                    <td className="py-3 text-white/50">{container.image}</td>
                    <td className="py-3 text-white/50">{container.port}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs badge-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        {container.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
