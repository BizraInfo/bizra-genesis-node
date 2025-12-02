'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  Settings,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  Activity,
  Gauge,
  Server,
  Database
} from 'lucide-react';
import { api, ResourceAllocation } from '@/lib/api';
import { useGenesisSynapse } from '@/hooks/useGenesisSynapse';

interface ResourceSliderProps {
  label: string;
  icon: React.ElementType;
  value: number;
  max: number;
  onChange: (value: number) => void;
  unit: string;
  color: string;
  warning?: string;
}

function ResourceSlider({ label, icon: Icon, value, max, onChange, unit, color, warning }: ResourceSliderProps) {
  const percentage = (value / max) * 100;
  const isHighUsage = percentage > 80;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="font-medium">{label}</span>
        </div>
        <span className={`text-sm ${isHighUsage ? 'text-yellow-400' : 'text-white/60'}`}>
          {value.toLocaleString()} / {max.toLocaleString()} {unit}
        </span>
      </div>
      
      <div className="relative">
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isHighUsage ? 'bg-yellow-500' : color.replace('text-', 'bg-')}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={`${label} allocation slider`}
          title={`Allocate ${label}: ${value} ${unit}`}
        />
      </div>
      
      <div className="flex justify-between text-xs text-white/40">
        <span>0 {unit}</span>
        <span>{(max / 2).toLocaleString()} {unit}</span>
        <span>{max.toLocaleString()} {unit}</span>
      </div>
      
      {warning && percentage > 80 && (
        <div className="flex items-center gap-2 text-xs text-yellow-400">
          <AlertTriangle className="w-3 h-3" />
          {warning}
        </div>
      )}
    </div>
  );
}

export default function ResourcesPage() {
  const { synapse } = useGenesisSynapse();
  const [allocation, setAllocation] = useState<ResourceAllocation>({
    compute_cores: 4,
    memory_gb: 8,
    storage_gb: 100,
    gpu_percentage: 25,
    bandwidth_mbps: 100,
  });
  const [maxResources, setMaxResources] = useState({
    compute_cores: 24,
    memory_gb: 64,
    storage_gb: 4000,
    gpu_percentage: 100,
    bandwidth_mbps: 1000,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentPool, setCurrentPool] = useState<ResourceAllocation | null>(null);
  
  useEffect(() => {
    loadResources();
  }, []);
  
  const loadResources = async () => {
    setIsLoading(true);
    try {
      const pool = await api.getResourcePool();
      if (pool) {
        setCurrentPool(pool);
        // Set current allocation based on pool
        setAllocation({
          compute_cores: pool.compute_cores || 4,
          memory_gb: pool.memory_gb || 8,
          storage_gb: pool.storage_gb || 100,
          gpu_percentage: pool.gpu_percentage || 25,
          bandwidth_mbps: pool.bandwidth_mbps || 100,
        });
      }
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.saveResourceAllocation(allocation);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save allocation:', err);
    } finally {
      setIsSaving(false);
    }
  };
  
  const calculateEstimatedRewards = () => {
    // Simple reward estimation based on resource contribution
    const computeReward = allocation.compute_cores * 0.5;
    const memoryReward = allocation.memory_gb * 0.1;
    const storageReward = allocation.storage_gb * 0.01;
    const gpuReward = allocation.gpu_percentage * 1.0;
    const bandwidthReward = allocation.bandwidth_mbps * 0.05;
    
    return computeReward + memoryReward + storageReward + gpuReward + bandwidthReward;
  };
  
  const presets = [
    { name: 'Minimal', compute: 2, memory: 4, storage: 50, gpu: 10, bandwidth: 50 },
    { name: 'Balanced', compute: 8, memory: 16, storage: 250, gpu: 30, bandwidth: 200 },
    { name: 'Performance', compute: 16, memory: 32, storage: 500, gpu: 50, bandwidth: 500 },
    { name: 'Maximum', compute: 20, memory: 48, storage: 1000, gpu: 80, bandwidth: 800 },
  ];
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-panel border-t-0 border-x-0 rounded-none sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center border border-green-500/20">
                <Server className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Resource Allocation</h1>
                <p className="text-xs text-white/40">Configure your contribution to the network</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={loadResources}
                disabled={isLoading}
                className="btn-glass text-sm flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-sovereign text-sm flex items-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saveSuccess ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Live System Status */}
        {synapse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel-gold p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-bizra-gold animate-pulse" />
                <h3 className="font-semibold">Live System Status</h3>
              </div>
              <span className="text-xs text-white/40">
                {new Date(synapse.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-white/50">CPU</span>
                </div>
                <p className="text-xl font-bold text-blue-400">{synapse.resources.cpuUsage.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-white/50">Memory</span>
                </div>
                <p className="text-xl font-bold text-purple-400">
                  {synapse.resources.memoryUsage.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-white/50">GPU</span>
                </div>
                <p className="text-xl font-bold text-green-400">{(synapse.resources.gpuUsage || 0).toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-white/50">Latency</span>
                </div>
                <p className="text-xl font-bold text-orange-400">{(synapse.latencyUs / 1000).toFixed(1)}ms</p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Presets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h3 className="text-sm font-medium text-white/60 mb-3">Quick Presets</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setAllocation({
                  compute_cores: preset.compute,
                  memory_gb: preset.memory,
                  storage_gb: preset.storage,
                  gpu_percentage: preset.gpu,
                  bandwidth_mbps: preset.bandwidth,
                })}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-bizra-gold/50 hover:text-bizra-gold transition-all text-sm"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </motion.div>
        
        {/* Resource Sliders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 mb-8"
        >
          <h3 className="font-semibold mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-bizra-gold" />
            Resource Allocation Settings
          </h3>
          
          <div className="space-y-8">
            <ResourceSlider
              label="CPU Cores"
              icon={Cpu}
              value={allocation.compute_cores}
              max={maxResources.compute_cores}
              onChange={(v) => setAllocation(prev => ({ ...prev, compute_cores: v }))}
              unit="cores"
              color="text-blue-400"
              warning="High CPU allocation may impact system performance"
            />
            
            <ResourceSlider
              label="Memory"
              icon={HardDrive}
              value={allocation.memory_gb}
              max={maxResources.memory_gb}
              onChange={(v) => setAllocation(prev => ({ ...prev, memory_gb: v }))}
              unit="GB"
              color="text-purple-400"
              warning="Leave at least 8GB for system operations"
            />
            
            <ResourceSlider
              label="Storage"
              icon={Database}
              value={allocation.storage_gb}
              max={maxResources.storage_gb}
              onChange={(v) => setAllocation(prev => ({ ...prev, storage_gb: v }))}
              unit="GB"
              color="text-orange-400"
            />
            
            <ResourceSlider
              label="GPU Compute"
              icon={Gauge}
              value={allocation.gpu_percentage}
              max={maxResources.gpu_percentage}
              onChange={(v) => setAllocation(prev => ({ ...prev, gpu_percentage: v }))}
              unit="%"
              color="text-green-400"
              warning="High GPU usage impacts local AI inference speed"
            />
            
            <ResourceSlider
              label="Network Bandwidth"
              icon={Wifi}
              value={allocation.bandwidth_mbps}
              max={maxResources.bandwidth_mbps}
              onChange={(v) => setAllocation(prev => ({ ...prev, bandwidth_mbps: v }))}
              unit="Mbps"
              color="text-cyan-400"
            />
          </div>
        </motion.div>
        
        {/* Estimated Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel-gold p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-bizra-gold" />
                Estimated Daily Rewards
              </h3>
              <p className="text-sm text-white/50 mt-1">
                Based on current allocation settings
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-bizra-gold">
                ~{calculateEstimatedRewards().toFixed(2)}
              </p>
              <p className="text-sm text-white/50">PoI Tokens / day</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-white/5 text-sm text-white/60">
            <p>
              <strong className="text-white">Note:</strong> Actual rewards depend on network demand, 
              contribution quality, and verification rates. Higher GPU contributions typically yield 
              better rewards due to AI inference demand.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
