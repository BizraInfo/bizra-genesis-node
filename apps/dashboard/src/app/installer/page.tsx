'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, HardDrive, MemoryStick, Layers, Network, Shield,
  ChevronRight, ChevronLeft, Check, Loader2, Download,
  User, FolderOpen, Lock, Brain, Wrench, Database,
  Users, Monitor, Sparkles, Zap, Package
} from 'lucide-react';
import { BizraLogoAnimated, SacredGeometryBackground, GlassCard } from '@/components/brand';

// Types
interface SystemSpecs {
  cpu: { name: string; cores: number; speed: string };
  gpu: { name: string; vram: string; cuda: boolean };
  ram: { total: string; available: string };
  storage: { total: string; available: string };
  network: { type: string; speed: string };
  os: { name: string; version: string };
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

type Step = 'welcome' | 'scanning' | 'results' | 'profile' | 'installing' | 'complete';

export default function InstallerPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [systemSpecs, setSystemSpecs] = useState<SystemSpecs | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [installProgress, setInstallProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [completedPhases, setCompletedPhases] = useState<string[]>([]);
  const [profile, setProfile] = useState({
    name: '',
    installPath: 'C:\\Program Files\\BIZRA\\',
    privacyLevel: 'maximum'
  });

  // Simulated system scan
  const runSystemScan = useCallback(async () => {
    setStep('scanning');
    setScanProgress(0);
    
    const scanSteps = [
      { progress: 15, delay: 500 },
      { progress: 35, delay: 800 },
      { progress: 55, delay: 600 },
      { progress: 75, delay: 700 },
      { progress: 90, delay: 500 },
      { progress: 100, delay: 400 },
    ];
    
    for (const scanStep of scanSteps) {
      await new Promise(r => setTimeout(r, scanStep.delay));
      setScanProgress(scanStep.progress);
    }
    
    // Simulated specs (would be real system detection in production)
    setSystemSpecs({
      cpu: { name: 'Intel Core i9-14900K', cores: 24, speed: '6.0 GHz' },
      gpu: { name: 'NVIDIA RTX 4090', vram: '24GB', cuda: true },
      ram: { total: '64 GB', available: '48 GB' },
      storage: { total: '2 TB NVMe', available: '1.2 TB' },
      network: { type: 'Ethernet', speed: '1 Gbps' },
      os: { name: 'Windows 11', version: '23H2' }
    });
    
    await new Promise(r => setTimeout(r, 500));
    setStep('results');
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
    await new Promise(r => setTimeout(r, 1000));
    setStep('complete');
  }, []);

  return (
    <div className="min-h-screen bg-bizra-black text-white relative overflow-hidden">
      <SacredGeometryBackground intensity="subtle" />
      
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-panel border-t-0 border-x-0 rounded-none">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BizraLogoAnimated size="sm" />
            <div>
              <h1 className="font-serif text-xl text-gradient-gold tracking-widest">BIZRA</h1>
              <p className="text-[10px] text-white/40 font-mono">SOVEREIGN OS INSTALLER</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
              className="text-center py-12"
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
                Welcome to Sovereignty
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-lg text-white/60 max-w-2xl mx-auto mb-8"
              >
                Transform your machine into a sovereign AI node. Your data stays yours.
                Your AI serves you. Your impact earns value.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
              >
                {[
                  { icon: Shield, title: 'Zero Cloud', desc: 'Everything runs locally on your hardware' },
                  { icon: Brain, title: '7 AI Agents', desc: 'Your Personal Agentic Team (PAT)' },
                  { icon: Zap, title: 'Proof of Impact', desc: 'Earn SEED tokens for real work' },
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
                className="btn-sovereign px-12 py-4 text-lg flex items-center gap-3 mx-auto"
              >
                <Cpu className="w-5 h-5" />
                Scan My System
                <ChevronRight className="w-5 h-5" />
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
              className="text-center py-20"
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
              
              <h2 className="text-2xl font-serif mb-4">Analyzing Your System</h2>
              <p className="text-white/50 mb-8">Detecting hardware capabilities...</p>
              
              <div className="max-w-md mx-auto">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Progress</span>
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
              <div className="text-center mb-12">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-3xl font-serif mb-2">System Analysis Complete</h2>
                <p className="text-white/60">Your hardware exceeds requirements for BIZRA Node0</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: Cpu, label: 'CPU', value: systemSpecs.cpu.name, sub: `${systemSpecs.cpu.cores} cores @ ${systemSpecs.cpu.speed}` },
                  { icon: Layers, label: 'GPU', value: systemSpecs.gpu.name, sub: `${systemSpecs.gpu.vram} VRAM • CUDA ${systemSpecs.gpu.cuda ? '✓' : '✗'}` },
                  { icon: MemoryStick, label: 'RAM', value: systemSpecs.ram.total, sub: `${systemSpecs.ram.available} available` },
                  { icon: HardDrive, label: 'Storage', value: systemSpecs.storage.total, sub: `${systemSpecs.storage.available} free` },
                  { icon: Network, label: 'Network', value: systemSpecs.network.type, sub: systemSpecs.network.speed },
                  { icon: Monitor, label: 'OS', value: systemSpecs.os.name, sub: systemSpecs.os.version },
                ].map((spec, i) => (
                  <GlassCard key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      <spec.icon className="w-8 h-8 text-bizra-gold flex-shrink-0" />
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider">{spec.label}</p>
                        <p className="font-semibold text-sm">{spec.value}</p>
                        <p className="text-xs text-white/50">{spec.sub}</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
              
              <GlassCard variant="gold" className="p-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-bizra-gold/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-bizra-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Ready for Full Sovereignty</h3>
                    <p className="text-white/60 text-sm">
                      Your system can run all 7 PAT agents + DeepSeek R1 + Full HyperGraph RAG
                    </p>
                  </div>
                </div>
              </GlassCard>
              
              <div className="flex justify-between">
                <button
                  onClick={() => setStep('welcome')}
                  className="btn-glass flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep('profile')}
                  className="btn-sovereign flex items-center gap-2"
                >
                  Continue to Profile
                  <ChevronRight className="w-4 h-4" />
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
              <div className="text-center mb-12">
                <h2 className="text-3xl font-serif mb-2">Create Your Profile</h2>
                <p className="text-white/60">Customize your sovereign AI experience</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Profile Form */}
                <GlassCard className="p-6">
                  <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-bizra-gold" />
                    Identity
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Your Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                        placeholder="Enter your name"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-bizra-gold focus:outline-none focus:ring-1 focus:ring-bizra-gold/50 transition-all"
                      />
                      <p className="text-xs text-white/40 mt-2">Your PAT agents will use this to personalize interactions</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Installation Path
                      </label>
                      <input
                        type="text"
                        value={profile.installPath}
                        readOnly
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-mono text-sm"
                      />
                      <p className="text-xs text-white/40 mt-2">Requires ~50GB free space</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Privacy Level
                      </label>
                      <select
                        value={profile.privacyLevel}
                        onChange={(e) => setProfile(p => ({ ...p, privacyLevel: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-bizra-gold focus:outline-none text-white"
                      >
                        <option value="maximum">Maximum — All processing on-device</option>
                        <option value="high">High — Minimal cloud features</option>
                        <option value="balanced">Balanced — Some cloud enhancements</option>
                      </select>
                      <p className="text-xs text-white/40 mt-2">Data never leaves without your explicit consent</p>
                    </div>
                  </div>
                </GlassCard>
                
                {/* PAT Agents Preview */}
                <GlassCard className="p-6">
                  <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-bizra-gold" />
                    Your Personal Agentic Team
                  </h3>
                  
                  <div className="space-y-3">
                    {PAT_AGENTS.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-bizra-gold/30 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center ${agent.color}`}>
                          <agent.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-white/40">{agent.description}</p>
                        </div>
                        <span className="text-xs text-white/30 font-mono">{agent.role}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={() => setStep('results')}
                  className="btn-glass flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={runInstallation}
                  disabled={!profile.name}
                  className="btn-sovereign flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Installer
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
              <div className="text-center mb-12">
                <h2 className="text-3xl font-serif mb-2">Generating Unified Installer</h2>
                <p className="text-white/60">Creating your personalized BIZRA Sovereign OS package</p>
              </div>
              
              <GlassCard className="p-8 mb-8">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-white/60">{INSTALLATION_PHASES[currentPhase]?.name || 'Complete'}</span>
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
                        className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
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
                        <div className="flex-1">
                          <p className={`font-medium ${isActive ? 'text-bizra-gold' : ''}`}>{phase.name}</p>
                          <p className="text-sm text-white/40">{phase.desc}</p>
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
              <div className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center"
                >
                  <Check className="w-12 h-12 text-green-400" />
                </motion.div>
                
                <h2 className="text-4xl font-serif mb-4 text-gradient-gold">Installer Ready!</h2>
                <p className="text-white/60 text-lg">Your personalized BIZRA Sovereign OS package is complete</p>
              </div>
              
              <GlassCard variant="gold" className="p-8 mb-8">
                <h3 className="font-semibold text-xl mb-6 flex items-center gap-2">
                  <Package className="w-6 h-6" />
                  Installer Details
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Installer Name', value: `BIZRA-${profile.name || 'User'}-Genesis.exe` },
                    { label: 'File Size', value: '4.2 GB' },
                    { label: 'Version', value: 'v2.2.0-genesis' },
                    { label: 'Components', value: 'Qwen2.5-8B + 87 Tools + 7 Agents' },
                    { label: 'Est. Install Time', value: '~15 minutes' },
                    { label: 'Privacy Level', value: profile.privacyLevel === 'maximum' ? 'Maximum (100% Local)' : profile.privacyLevel },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between py-3 border-b border-white/10 last:border-0">
                      <span className="text-white/50">{item.label}</span>
                      <span className="font-mono text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
              
              <GlassCard className="p-6 mb-8">
                <h4 className="font-semibold mb-4">What&apos;s Included</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: Brain, label: 'Qwen2.5-8B Planner', desc: 'With BIZRA fine-tuning' },
                    { icon: Wrench, label: '87 MCP Tools', desc: 'Sovereign toolset' },
                    { icon: Database, label: 'HyperGraph RAG', desc: '500k file capacity' },
                    { icon: Shield, label: 'Causal Fabric', desc: 'Proof-of-Impact ledger' },
                    { icon: Users, label: '7 PAT Agents', desc: 'Your personal AI team' },
                    { icon: Monitor, label: 'Desktop Integration', desc: 'Node-Zero overlay' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                      <item.icon className="w-5 h-5 text-bizra-gold flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-white/40">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setStep('welcome')}
                  className="btn-glass flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Start Over
                </button>
                <button
                  onClick={() => router.push('/onboarding')}
                  className="btn-sovereign px-8 py-4 text-lg flex items-center gap-3"
                >
                  <Download className="w-5 h-5" />
                  Download & Install (4.2 GB)
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
