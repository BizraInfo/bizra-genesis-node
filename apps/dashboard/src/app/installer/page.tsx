'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, HardDrive, MemoryStick, Layers, Network, Shield,
  ChevronRight, ChevronLeft, Check, Loader2, Download,
  User, FolderOpen, Lock, Brain, Wrench, Database,
  Users, Monitor, Sparkles, Zap, Package, Globe,
  Play, Terminal, AlertCircle
} from 'lucide-react';
import { BizraLogoAnimated, SacredGeometryBackground, GlassCard } from '@/components/brand';
import { LanguageSelector } from '@/components/ui/language-selector';
import { SmartModelSelector } from '@/components/installer/smart-model-selector';
import { useI18n } from '@/lib/i18n';
import { type HardwareProfile, type AIModel, generateModelConfig } from '@/lib/model-registry';
import { 
  downloadInstaller, 
  generateInstallerPackage,
  markInstalled,
  isInstalled,
  type InstallerPackage,
  type InstallConfig
} from '@/lib/installer-service';

// Types
interface SystemSpecs {
  cpu: { name: string; cores: number; speed: string };
  gpu: { name: string; vram: string; cuda: boolean };
  ram: { total: string; available: string };
  storage: { total: string; available: string };
  network: { type: string; speed: string };
  os: { name: string; version: string };
}

// Extended Navigator interface for non-standard APIs
interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  connection?: {
    effectiveType: string;
    downlink: number;
    saveData: boolean;
  };
}

interface PatAgent {
  id: string;
  name: string;
  role: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const PAT_AGENTS: PatAgent[] = [
  { id: 'master-reasoner', name: 'Master Reasoner', role: 'Strategic Thinking', icon: Brain, color: 'text-purple-400', description: 'Deep analysis & decision making' },
  { id: 'memory-architect', name: 'Memory Architect', role: 'Knowledge Base', icon: Database, color: 'text-cyan-400', description: 'Personal context & learning' },
  { id: 'creative-synthesizer', name: 'Creative Synthesizer', role: 'Innovation', icon: Sparkles, color: 'text-pink-400', description: 'Creative ideation & content' },
  { id: 'data-analyzer', name: 'Data Analyzer', role: 'Analytics', icon: Zap, color: 'text-green-400', description: 'Data processing & insights' },
  { id: 'communicator', name: 'Communicator', role: 'Expression', icon: Users, color: 'text-blue-400', description: 'Writing & conversation' },
  { id: 'execution-planner', name: 'Execution Planner', role: 'Task Management', icon: Wrench, color: 'text-orange-400', description: 'Planning & orchestration' },
  { id: 'ethics-guardian', name: 'Ethics Guardian', role: 'Integrity', icon: Shield, color: 'text-yellow-400', description: 'Values & bias detection' },
];

const INSTALLATION_PHASES = [
  { id: 'scan', name: 'System Analysis', desc: 'Analyzing hardware capabilities', duration: '~10s' },
  { id: 'core', name: 'Core Runtime', desc: 'Installing BIZRA kernel & Node0', duration: '~2min' },
  { id: 'models', name: 'AI Models', desc: 'Downloading Qwen2.5-8B & adapters', duration: '~5min' },
  { id: 'tools', name: 'MCP Tools', desc: 'Installing 87 sovereign tools', duration: '~1min' },
  { id: 'agents', name: 'PAT Agents', desc: 'Configuring personal AI team', duration: '~2min' },
  { id: 'rag', name: 'Knowledge Base', desc: 'Initializing HyperGraph RAG', duration: '~1min' },
  { id: 'finalize', name: 'Finalization', desc: 'Securing & optimizing', duration: '~30s' },
];

type Step = 'welcome' | 'scanning' | 'results' | 'models' | 'profile' | 'installing' | 'complete';

export default function InstallerPage() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const [step, setStep] = useState<Step>('welcome');
  const [systemSpecs, setSystemSpecs] = useState<SystemSpecs | null>(null);
  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [installProgress, setInstallProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [completedPhases, setCompletedPhases] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [modelConfig, setModelConfig] = useState<ReturnType<typeof generateModelConfig> | null>(null);
  const [installerPackage, setInstallerPackage] = useState<InstallerPackage | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [profile, setProfile] = useState<{
    name: string;
    installPath: string;
    privacyLevel: 'maximum' | 'high' | 'balanced';
  }>({
    name: '',
    installPath: 'C:\\Program Files\\BIZRA\\',
    privacyLevel: 'maximum'
  });

  // Check if already installed on mount
  useEffect(() => {
    if (isInstalled()) {
      // Could redirect to dashboard or show "already installed" message
    }
  }, []);

  // Real system scan
  const runSystemScan = useCallback(async () => {
    setStep('scanning');
    setScanProgress(0);
    
    // Helper to update progress
    const updateProgress = async (start: number, end: number, duration: number) => {
      const steps = 10;
      const stepDuration = duration / steps;
      const increment = (end - start) / steps;
      
      for (let i = 0; i <= steps; i++) {
        setScanProgress(Math.min(Math.round(start + (increment * i)), 100));
        await new Promise(r => setTimeout(r, stepDuration));
      }
    };

    // Phase 1: Environment Detection (0-30%)
    await updateProgress(0, 30, 600);
    
    const nav = navigator as ExtendedNavigator;
    const ua = navigator.userAgent;
    
    // Detect OS
    let osName = 'Unknown OS';
    if (ua.indexOf('Win') !== -1) osName = 'Windows';
    else if (ua.indexOf('Mac') !== -1) osName = 'macOS';
    else if (ua.indexOf('Linux') !== -1) osName = 'Linux';
    else if (ua.indexOf('Android') !== -1) osName = 'Android';
    else if (ua.indexOf('like Mac') !== -1) osName = 'iOS';
    
    // Detect CPU Cores
    const cores = navigator.hardwareConcurrency || 4; // Fallback
    
    // Phase 2: Memory & Storage (30-60%)
    await updateProgress(30, 60, 800);
    
    // Detect RAM (approximate)
    const ramGb = nav.deviceMemory || 8; // Fallback
    
    // Detect Storage (Quota)
    let storageTotal = 'Unknown';
    let storageAvail = 'Unknown';
    let storageAvailGb = 50; // Default assumption
    
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota) storageTotal = `${Math.round(estimate.quota / (1024**3))} GB`;
        if (estimate.usage && estimate.quota) {
          const avail = estimate.quota - estimate.usage;
          storageAvailGb = avail / (1024**3);
          storageAvail = `${Math.round(storageAvailGb)} GB`;
        }
      } catch (e) {
        console.warn('Storage estimate failed', e);
      }
    }

    // Phase 3: GPU & Network (60-90%)
    await updateProgress(60, 90, 800);
    
    // Detect GPU via WebGL
    let gpuName = 'Integrated Graphics';
    let gpuVendor = 'Unknown';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuName = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          gpuVendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        }
      }
    } catch (e) {
      console.warn('WebGL detection failed', e);
    }
    
    // Detect Network
    let netType = 'Unknown';
    let netSpeed = 'Unknown';
    if (nav.connection) {
      netType = nav.connection.effectiveType; // '4g', '3g', etc.
      netSpeed = `${nav.connection.downlink} Mbps`;
    }

    // Phase 4: Analysis & Finalize (90-100%)
    await updateProgress(90, 100, 400);
    
    // Construct Real Specs
    const specs: SystemSpecs = {
      cpu: { 
        name: `Detected ${cores}-Core Processor`, 
        cores: cores, 
        speed: 'Variable' 
      },
      gpu: { 
        name: gpuName, 
        vram: 'Shared', // Browser can't see VRAM
        cuda: gpuVendor.toLowerCase().includes('nvidia') 
      },
      ram: { 
        total: `~${ramGb} GB`, 
        available: 'Unknown' // Browser can't see free RAM
      },
      storage: { 
        total: storageTotal !== 'Unknown' ? `${storageTotal} (Quota)` : 'Unknown', 
        available: storageAvail 
      },
      network: { 
        type: netType.toUpperCase(), 
        speed: netSpeed 
      },
      os: { 
        name: osName, 
        version: 'Latest' 
      }
    };
    
    setSystemSpecs(specs);
    
    // Create hardware profile for model selection based on REAL data
    const profile: HardwareProfile = {
      tier: 'standard', // Default, will be recalculated
      ram: ramGb,
      vram: gpuVendor.toLowerCase().includes('nvidia') ? 8 : 0, // Assume 8GB if NVIDIA detected, else 0
      cpuCores: cores,
      hasGpu: gpuVendor.toLowerCase().includes('nvidia'),
      gpuName: gpuName,
      availableStorage: storageAvailGb
    };
    
    // Determine Tier
    if (profile.ram >= 32 && profile.hasGpu) profile.tier = 'ultra';
    else if (profile.ram >= 16) profile.tier = 'powerful';
    else profile.tier = 'standard';
    
    setHardwareProfile(profile);
    
    await new Promise(r => setTimeout(r, 500));
    setStep('results');
  }, []);

  // Handle model selection
  const handleModelsSelected = useCallback((modelIds: string[], config: ReturnType<typeof generateModelConfig>) => {
    setSelectedModels(modelIds);
    setModelConfig(config);
    setStep('profile');
  }, []);

  // Simulated installation
  const runInstallation = useCallback(async () => {
    setStep('installing');
    setInstallProgress(0);
    setCurrentPhase(0);
    setCompletedPhases([]);
    
    for (let i = 0; i < INSTALLATION_PHASES.length; i++) {
      setCurrentPhase(i);
      const phaseProgress = ((i) / INSTALLATION_PHASES.length) * 100;
      
      // Simulate phase progress
      for (let p = 0; p <= 100; p += 10) {
        await new Promise(r => setTimeout(r, 150));
        const totalProgress = phaseProgress + (p / INSTALLATION_PHASES.length);
        setInstallProgress(Math.min(totalProgress, 100));
      }
      
      setCompletedPhases(prev => [...prev, INSTALLATION_PHASES[i].id]);
    }
    
    setInstallProgress(100);
    
    // Generate installer package
    if (hardwareProfile && modelConfig) {
      const config: InstallConfig = {
        userName: profile.name,
        installPath: profile.installPath,
        privacyLevel: profile.privacyLevel as 'maximum' | 'high' | 'balanced',
        selectedModels: selectedModels,
        hardwareProfile: hardwareProfile,
      };
      
      const pkg = generateInstallerPackage(config, modelConfig.models);
      setInstallerPackage(pkg);
    }
    
    await new Promise(r => setTimeout(r, 1000));
    setStep('complete');
  }, [hardwareProfile, modelConfig, profile, selectedModels]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!installerPackage) return;
    
    setIsDownloading(true);
    
    // Trigger real download
    const config: InstallConfig = {
      userName: profile.name,
      installPath: profile.installPath,
      privacyLevel: profile.privacyLevel as 'maximum' | 'high' | 'balanced',
      selectedModels: selectedModels,
      hardwareProfile: hardwareProfile!,
    };
    
    downloadInstaller(config);
    
    // Mark installation as started
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadComplete(true);
      markInstalled(config);
    }, 1500);
  }, [installerPackage, profile, selectedModels, hardwareProfile]);

  return (
    <div className="min-h-screen bg-bizra-black text-white relative overflow-hidden">
      <SacredGeometryBackground intensity="subtle" />
      
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-panel border-t-0 border-x-0 rounded-none">
        <div className={`max-w-6xl mx-auto px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <BizraLogoAnimated size="sm" />
            <div className={isRTL ? 'text-right' : ''}>
              <h1 className="font-serif text-xl text-gradient-gold tracking-widest">BIZRA</h1>
              <p className="text-[10px] text-white/40 font-mono">{t('installer.header')}</p>
            </div>
          </div>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <LanguageSelector variant="compact" />
            <span className="text-xs font-mono text-white/30">v2.2.0-genesis</span>
            <div className="px-3 py-1 rounded-full bg-bizra-gold/10 border border-bizra-gold/30 text-bizra-gold text-xs">
              Node0
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6 max-w-5xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          
          {/* Step 1: Welcome */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`text-center py-12 ${isRTL ? 'text-right' : ''}`}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <BizraLogoAnimated size="xl" className="mx-auto" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-4xl md:text-5xl font-serif mb-4 text-gradient-gold"
              >
                {t('installer.welcome.title')}
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-lg text-white/60 max-w-2xl mx-auto mb-8"
              >
                {t('installer.welcome.description')}
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
              >
                {[
                  { icon: Shield, title: t('installer.welcome.features.zeroCloud'), desc: t('installer.welcome.features.zeroCloudDesc') },
                  { icon: Brain, title: t('installer.welcome.features.agents'), desc: t('installer.welcome.features.agentsDesc') },
                  { icon: Zap, title: t('installer.welcome.features.impact'), desc: t('installer.welcome.features.impactDesc') },
                ].map((feature, i) => (
                  <GlassCard key={i} className="p-6 text-center">
                    <feature.icon className="w-10 h-10 text-bizra-gold mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-white/50">{feature.desc}</p>
                  </GlassCard>
                ))}
              </motion.div>
              
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.1 }}
                onClick={runSystemScan}
                className={`btn-sovereign px-12 py-4 text-lg flex items-center gap-3 mx-auto ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Cpu className="w-5 h-5" />
                {t('installer.welcome.scanButton')}
                <ChevronRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Scanning */}
          {step === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-center py-20 ${isRTL ? 'text-right' : ''}`}
            >
              <div className="relative w-48 h-48 mx-auto mb-12">
                {/* Animated rings */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-bizra-gold/30"
                    style={{
                      width: `${100 - i * 20}%`,
                      height: `${100 - i * 20}%`,
                      top: `${i * 10}%`,
                      left: `${i * 10}%`,
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.3,
                      repeat: Infinity,
                    }}
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Cpu className="w-16 h-16 text-bizra-gold animate-pulse" />
                </div>
              </div>
              
              <h2 className="text-2xl font-serif mb-4">{t('installer.scanning.title')}</h2>
              <p className="text-white/50 mb-8">{t('installer.scanning.description')}</p>
              
              <div className="max-w-md mx-auto">
                <div className={`flex justify-between text-sm mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-white/60">{t('installer.scanning.progress')}</span>
                  <span className="text-bizra-gold font-mono">{scanProgress}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-bizra-gold to-bizra-teal"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Results */}
          {step === 'results' && systemSpecs && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={`text-center mb-12 ${isRTL ? 'text-right' : ''}`}>
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-3xl font-serif mb-2">{t('installer.results.title')}</h2>
                <p className="text-white/60">{t('installer.results.description')}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: Cpu, label: t('installer.hardware.cpu'), value: systemSpecs.cpu.name, sub: `${systemSpecs.cpu.cores} ${t('installer.hardware.cores')}` },
                  { icon: Layers, label: t('installer.hardware.gpu'), value: systemSpecs.gpu.name, sub: `${systemSpecs.gpu.vram} VRAM • CUDA ${systemSpecs.gpu.cuda ? '✓' : '✗'}` },
                  { icon: MemoryStick, label: t('installer.hardware.ram'), value: systemSpecs.ram.total, sub: `${systemSpecs.ram.available} ${t('installer.hardware.available')}` },
                  { icon: HardDrive, label: t('installer.hardware.storage'), value: systemSpecs.storage.total, sub: `${systemSpecs.storage.available} ${t('installer.hardware.free')}` },
                  { icon: Network, label: t('installer.hardware.network'), value: systemSpecs.network.type, sub: systemSpecs.network.speed },
                  { icon: Monitor, label: t('installer.hardware.os'), value: systemSpecs.os.name, sub: systemSpecs.os.version },
                ].map((spec, i) => (
                  <GlassCard key={i} className="p-4">
                    <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <spec.icon className="w-8 h-8 text-bizra-gold flex-shrink-0" />
                      <div className={isRTL ? 'text-right' : ''}>
                        <p className="text-xs text-white/40 uppercase tracking-wider">{spec.label}</p>
                        <p className="font-semibold text-sm line-clamp-2" title={spec.value}>{spec.value}</p>
                        <p className="text-xs text-white/50">{spec.sub}</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
              
              <GlassCard variant="gold" className="p-6 mb-8">
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 rounded-full bg-bizra-gold/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-bizra-gold" />
                  </div>
                  <div className={isRTL ? 'text-right' : ''}>
                    <h3 className="font-semibold text-lg">{t('installer.results.ready')}</h3>
                    <p className="text-white/60 text-sm">
                      {t('installer.results.readyDesc')}
                    </p>
                  </div>
                </div>
              </GlassCard>
              
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setStep('welcome')}
                  className={`btn-glass flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {t('common.back')}
                </button>
                <button
                  onClick={() => setStep('models')}
                  className={`btn-sovereign flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {t('installer.results.selectModels')}
                  <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3.5: Model Selection */}
          {step === 'models' && hardwareProfile && (
            <motion.div
              key="models"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={`text-center mb-12 ${isRTL ? 'text-right' : ''}`}>
                <h2 className="text-3xl font-serif mb-2">
                  {t('installer.models.title')}
                </h2>
                <p className="text-white/60">
                  {t('installer.models.description')}
                </p>
              </div>
              
              <SmartModelSelector 
                hardware={hardwareProfile}
                onModelsSelected={handleModelsSelected}
              />
              
              <div className={`flex justify-start mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setStep('results')}
                  className={`btn-glass flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {t('common.back')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Profile Setup */}
          {step === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={`text-center mb-12 ${isRTL ? 'text-right' : ''}`}>
                <h2 className="text-3xl font-serif mb-2">
                  {t('installer.profile.title')}
                </h2>
                <p className="text-white/60">
                  {t('installer.profile.description')}
                </p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Profile Form */}
                <GlassCard className="p-6">
                  <h3 className={`font-semibold text-lg mb-6 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <User className="w-5 h-5 text-bizra-gold" />
                    {t('installer.profile.identity')}
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : ''}`}>
                        {t('installer.profile.yourName')}
                      </label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                        placeholder={t('installer.profile.namePlaceholder')}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-bizra-gold focus:outline-none focus:ring-1 focus:ring-bizra-gold/50 transition-all"
                      />
                      <p className={`text-xs text-white/40 mt-2 ${isRTL ? 'text-right' : ''}`}>
                        {t('installer.profile.nameHint')}
                      </p>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <FolderOpen className="w-4 h-4" />
                        {t('installer.profile.installPath')}
                      </label>
                      <input
                        type="text"
                        value={profile.installPath}
                        readOnly
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-mono text-sm"
                      />
                      <p className={`text-xs text-white/40 mt-2 ${isRTL ? 'text-right' : ''}`}>
                        {t('installer.profile.requiresSpace', { size: modelConfig?.totalSize || '~50GB' })}
                      </p>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Lock className="w-4 h-4" />
                        {t('installer.profile.privacyLevel')}
                      </label>
                      <select
                        value={profile.privacyLevel}
                        onChange={(e) => setProfile(p => ({ ...p, privacyLevel: e.target.value as 'maximum' | 'high' | 'balanced' }))}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-bizra-gold focus:outline-none text-white"
                        aria-label={t('installer.profile.privacyLevel')}
                      >
                        <option value="maximum">{t('installer.profile.privacyMaximum')}</option>
                        <option value="high">{t('installer.profile.privacyHigh')}</option>
                        <option value="balanced">{t('installer.profile.privacyBalanced')}</option>
                      </select>
                      <p className={`text-xs text-white/40 mt-2 ${isRTL ? 'text-right' : ''}`}>
                        {t('installer.profile.privacyHint')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Selected Models Summary */}
                  {modelConfig && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Brain className="w-4 h-4 text-bizra-gold" />
                        {t('installer.models.selectedModels')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {modelConfig.models.map(model => (
                          <span key={model.id} className="px-3 py-1 bg-bizra-gold/10 border border-bizra-gold/30 rounded-full text-sm text-bizra-gold">
                            {model.name}
                          </span>
                        ))}
                      </div>
                      <p className={`text-xs text-white/40 mt-2 ${isRTL ? 'text-right' : ''}`}>
                        {t('installer.models.totalSize')}: {modelConfig.totalSize}
                      </p>
                    </div>
                  )}
                </GlassCard>
                
                {/* PAT Agents Preview */}
                <GlassCard className="p-6">
                  <h3 className={`font-semibold text-lg mb-6 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Users className="w-5 h-5 text-bizra-gold" />
                    {t('installer.profile.patTeam')}
                  </h3>
                  
                  <div className="space-y-3">
                    {PAT_AGENTS.map((agent) => (
                      <div
                        key={agent.id}
                        className={`flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-bizra-gold/30 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center ${agent.color}`}>
                          <agent.icon className="w-5 h-5" />
                        </div>
                        <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-white/40">{agent.description}</p>
                        </div>
                        {modelConfig?.agentAssignments[agent.name.replace(' ', '')] && (
                          <span className="text-xs text-bizra-gold/60 font-mono">
                            {modelConfig.agentAssignments[agent.name.replace(' ', '')]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
              
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setStep('models')}
                  className={`btn-glass flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {t('common.back')}
                </button>
                <button
                  onClick={runInstallation}
                  disabled={!profile.name}
                  className={`btn-sovereign flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {t('installer.profile.generateInstaller')}
                  <Package className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Installing */}
          {step === 'installing' && (
            <motion.div
              key="installing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={`text-center mb-12 ${isRTL ? 'text-right' : ''}`}>
                <h2 className="text-3xl font-serif mb-2">{t('installer.installing.title')}</h2>
                <p className="text-white/60">{t('installer.installing.description')}</p>
              </div>
              
              <GlassCard className="p-8 mb-8">
                <div className={`flex justify-between text-sm mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-white/60">
                    {currentPhase < INSTALLATION_PHASES.length 
                      ? t(`installer.installing.phases.${INSTALLATION_PHASES[currentPhase]?.id}`) 
                      : t('installer.complete.title')}
                  </span>
                  <span className="text-bizra-gold font-mono">{Math.round(installProgress)}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-8">
                  <motion.div
                    className="h-full bg-gradient-to-r from-bizra-gold via-bizra-teal to-bizra-gold"
                    style={{ width: `${installProgress}%` }}
                  />
                </div>
                
                <div className="space-y-3">
                  {INSTALLATION_PHASES.map((phase, i) => {
                    const isComplete = completedPhases.includes(phase.id);
                    const isActive = currentPhase === i && !isComplete;
                    
                    return (
                      <div
                        key={phase.id}
                        className={`flex items-center gap-4 p-4 rounded-lg transition-all ${isRTL ? 'flex-row-reverse' : ''} ${
                          isActive ? 'bg-bizra-gold/10 border border-bizra-gold/30' :
                          isComplete ? 'bg-white/5 opacity-60' : 'bg-white/5'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isComplete ? 'bg-green-500 text-white' :
                          isActive ? 'bg-bizra-gold text-bizra-black' : 'bg-white/20 text-white/50'
                        }`}>
                          {isComplete ? (
                            <Check className="w-4 h-4" />
                          ) : isActive ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className="text-xs font-bold">{i + 1}</span>
                          )}
                        </div>
                        <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                          <p className={`font-medium ${isActive ? 'text-bizra-gold' : ''}`}>
                            {t(`installer.installing.phases.${phase.id}`)}
                          </p>
                          <p className="text-sm text-white/40">
                            {t(`installer.installing.phases.${phase.id}Desc`)}
                          </p>
                        </div>
                        <span className="text-xs text-white/30 font-mono">{phase.duration}</span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 6: Complete */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={`text-center mb-12 ${isRTL ? 'text-right' : ''}`}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center"
                >
                  <Check className="w-12 h-12 text-green-400" />
                </motion.div>
                
                <h2 className="text-4xl font-serif mb-4 text-gradient-gold">{t('installer.complete.title')}</h2>
                <p className="text-white/60 text-lg">{t('installer.complete.description')}</p>
              </div>
              
              <GlassCard variant="gold" className="p-8 mb-8">
                <h3 className={`font-semibold text-xl mb-6 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Package className="w-6 h-6" />
                  {t('installer.complete.details')}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: t('installer.complete.installerName'), value: `BIZRA-${profile.name || 'User'}-Genesis.exe` },
                    { label: t('installer.complete.fileSize'), value: modelConfig?.totalSize || '4.2 GB' },
                    { label: t('installer.complete.version'), value: 'v2.2.0-genesis' },
                    { label: t('installer.complete.aiModels'), value: modelConfig ? `${modelConfig.models.length} model(s)` : '1 model' },
                    { label: t('installer.complete.downloadTime'), value: modelConfig?.estimatedDownloadTime || '~15 minutes' },
                    { label: t('installer.complete.privacyLevel'), value: profile.privacyLevel === 'maximum' ? t('installer.profile.privacyMaximum') : profile.privacyLevel },
                  ].map((item, i) => (
                    <div key={i} className={`flex justify-between py-3 border-b border-white/10 last:border-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-white/50">{item.label}</span>
                      <span className="font-mono text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
                
                {/* Model List */}
                {modelConfig && modelConfig.models.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <p className={`text-xs text-white/40 mb-2 ${isRTL ? 'text-right' : ''}`}>
                      {t('installer.complete.modelsIncluded')}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {modelConfig.models.map(model => (
                        <span key={model.id} className="px-3 py-1 bg-bizra-gold/10 border border-bizra-gold/30 rounded-full text-xs text-bizra-gold">
                          {model.name} ({model.size})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
              
              <GlassCard className="p-6 mb-8">
                <h4 className={`font-semibold mb-4 ${isRTL ? 'text-right' : ''}`}>{t('installer.complete.whatsIncluded')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: Brain, label: 'Qwen2.5-8B Planner', desc: 'With BIZRA fine-tuning' },
                    { icon: Wrench, label: '87 MCP Tools', desc: 'Sovereign toolset' },
                    { icon: Database, label: 'HyperGraph RAG', desc: '500k file capacity' },
                    { icon: Shield, label: 'Causal Fabric', desc: 'Proof-of-Impact ledger' },
                    { icon: Users, label: '7 PAT Agents', desc: 'Your personal AI team' },
                    { icon: Monitor, label: 'Desktop Integration', desc: 'Node-Zero overlay' },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg bg-white/5 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <item.icon className="w-5 h-5 text-bizra-gold flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-white/40">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              
              <div className={`flex justify-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setStep('welcome')}
                  className={`btn-glass flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {t('installer.complete.startOver')}
                </button>
                
                {downloadComplete ? (
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center"
                    >
                      <div className={`flex items-center gap-2 text-green-400 mb-2 justify-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Check className="w-5 h-5" />
                        <span className="font-semibold">{t('installer.complete.downloadStarted') || 'Download Started!'}</span>
                      </div>
                      <p className="text-sm text-white/60">
                        {t('installer.complete.runScript') || 'Run the downloaded PowerShell script to complete installation'}
                      </p>
                    </motion.div>
                    <button
                      onClick={() => router.push('/home')}
                      className={`btn-sovereign px-8 py-4 text-lg flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Play className="w-5 h-5" />
                      {t('installer.complete.goToDashboard') || 'Go to Dashboard'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className={`btn-sovereign px-8 py-4 text-lg flex items-center gap-3 disabled:opacity-70 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('installer.complete.preparing') || 'Preparing...'}
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        {t('installer.complete.downloadInstall')} ({installerPackage?.fileSize || modelConfig?.totalSize || '4.2 GB'})
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {/* Installation Instructions */}
              <GlassCard className="p-6 mt-8">
                <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <Terminal className="w-5 h-5 text-bizra-gold" />
                  {t('installer.complete.howToInstall') || 'How to Install'}
                </h4>
                <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-6 h-6 rounded-full bg-bizra-gold/20 flex items-center justify-center text-bizra-gold text-sm font-bold flex-shrink-0">1</div>
                    <p className="text-white/70">{t('installer.complete.step1') || 'Click "Download & Install" to get the Unified Installer script'}</p>
                  </div>
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-6 h-6 rounded-full bg-bizra-gold/20 flex items-center justify-center text-bizra-gold text-sm font-bold flex-shrink-0">2</div>
                    <p className="text-white/70">{t('installer.complete.step2') || 'Right-click the downloaded .ps1 file and select "Run with PowerShell"'}</p>
                  </div>
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-6 h-6 rounded-full bg-bizra-gold/20 flex items-center justify-center text-bizra-gold text-sm font-bold flex-shrink-0">3</div>
                    <p className="text-white/70">{t('installer.complete.step3') || 'The installer will set up your Node0, create desktop shortcuts, and connect you to the network'}</p>
                  </div>
                </div>
                <div className={`mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 ${isRTL ? 'text-right' : ''}`}>
                  <p className={`text-sm text-yellow-400/80 flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{t('installer.complete.adminNote') || 'Note: The installer will request Administrator privileges to set up system services'}</span>
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
