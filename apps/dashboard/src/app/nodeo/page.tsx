'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Activity, 
  Database, 
  Shield, 
  Zap, 
  Terminal, 
  Globe, 
  Brain,
  Share2,
} from 'lucide-react';
import { BizraLogoAnimated, GlassCard, SacredGeometryBackground } from '@/components/brand';

// Lazy load Three.js Neural Core (~330KB savings on initial load)
const NeuralCore3D = dynamic(() => import('./NeuralCore3D'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 z-0 flex items-center justify-center">
      <div className="w-24 h-24 border-2 border-[#C9A962]/30 rounded-full animate-pulse" />
    </div>
  ),
});

// --- IMPACT LEDGER COMPONENT ---
const ImpactLedger = () => {
  const blocks = [
    { id: 'GEN-001', hash: '0x7f...3a2', impact: 'Node Init', type: 'genesis' },
    { id: 'GEN-002', hash: '0x8b...9c1', impact: 'Spine Active', type: 'system' },
    { id: 'GEN-003', hash: '0x2a...1f4', impact: 'LLM Bridge', type: 'ai' },
  ];

  return (
    <div className="h-full flex flex-col font-mono">
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
        <h3 className="text-sm text-gray-400 flex items-center gap-2">
          <Shield size={14} className="text-[#2A9D8F]" />
          RUST_LEDGER :: PROOF_OF_IMPACT
        </h3>
        <span className="text-xs text-[#2A9D8F] animate-pulse">LIVE</span>
      </div>
      
      <div className="flex-1 space-y-3 overflow-hidden relative">
        {blocks.map((block, i) => (
          <div key={block.id} className="group relative bg-gray-900/50 border border-gray-800 hover:border-[#2A9D8F]/50 p-3 transition-all duration-300 hover:translate-x-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-[#2A9D8F] font-bold">{block.id}</span>
              <span className="text-[10px] text-gray-600">{block.hash}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-300">{block.impact}</span>
              <div className={`w-2 h-2 rounded-full ${
                block.type === 'genesis' ? 'bg-amber-500' : 
                block.type === 'system' ? 'bg-cyan-500' : 'bg-purple-500'
              }`}></div>
            </div>
            {i < blocks.length - 1 && (
              <div className="absolute left-1/2 bottom-0 w-px h-3 bg-gray-800 -mb-3 z-0"></div>
            )}
          </div>
        ))}
        
        <div className="mt-4 p-3 border border-dashed border-gray-800 rounded flex items-center gap-3 opacity-50">
          <div className="w-4 h-4 border-2 border-[#2A9D8F] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500">CRYSTALLIZING BLOCK GEN-004...</span>
        </div>
      </div>
    </div>
  );
};

// --- SYNAPSE BRIDGE (PAT Interface) ---
const SynapseBridge = () => {
  const chatHistory = [
    { type: 'system', text: 'Nodeo Spine initialized.' },
    { type: 'system', text: 'Ollama DeepSeek-R1 mounted.' },
    { type: 'agent', agent: 'MASTER REASONER', text: 'Welcome, Architect. The seed is planted.' },
    { type: 'quote', text: '"From Seed to Sovereign Forest."' },
    { type: 'agent', agent: 'MASTER REASONER', text: 'Your hardware profile (MSI Titan) suggests a "Builder" seed state. Shall we calibrate the 7-day plan?' },
  ];

  return (
    <div className="h-full flex flex-col font-mono">
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
        <h3 className="text-sm text-gray-400 flex items-center gap-2">
          <Activity size={14} className="text-purple-500" />
          SYNAPSE_BRIDGE :: INTELLIGENCE
        </h3>
        <span className="text-xs text-purple-600">OLLAMA: READY</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {['DeepSeek', 'Qwen', 'Mistral', 'Llama3'].map((model) => (
          <div key={model} className="bg-gray-900/80 border border-gray-800 p-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">{model}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${model === 'DeepSeek' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-gray-700'}`}></div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 text-xs" id="chat-log">
        {chatHistory.map((msg, i) => (
          <div key={i} className={msg.type === 'quote' ? 'pl-4 border-l border-[#C9A962]/20 text-white/70 italic' : ''}>
            {msg.type === 'system' && (
              <p className="opacity-60">
                <span className="text-[#2A9D8F]">[SYSTEM]</span> {msg.text}
              </p>
            )}
            {msg.type === 'agent' && (
              <p>
                <span className="text-[#C9A962]">[{msg.agent}]</span> {msg.text}
              </p>
            )}
            {msg.type === 'quote' && msg.text}
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-800 mt-4">
        <div className="flex items-center gap-2 bg-[#050B14] border border-[#C9A962]/20 rounded px-3 py-2">
          <span className="text-[#C9A962]/50" aria-hidden="true">{'>'}</span>
          <label htmlFor="nodeo-command" className="sr-only">Enter command for Nodeo</label>
          <input 
            id="nodeo-command"
            type="text" 
            className="bg-transparent border-none outline-none text-xs text-[#C9A962] w-full font-mono placeholder-[#C9A962]/20 focus:ring-1 focus:ring-[#C9A962]/50" 
            placeholder="Command Nodeo..." 
            defaultValue="Initiate Phase 1"
            aria-describedby="nodeo-command-hint"
          />
        </div>
        <span id="nodeo-command-hint" className="sr-only">Type a command to interact with the Nodeo console</span>
      </div>
    </div>
  );
};

// --- MAIN NODEO CONSOLE ---
export default function NodeoConsolePage() {
  const [bootComplete, setBootComplete] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Simulate boot sequence
    const bootTimer = setTimeout(() => setBootComplete(true), 2000);
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearTimeout(bootTimer);
      clearInterval(clockTimer);
    };
  }, []);

  if (!bootComplete) {
    return (
      <div className="min-h-screen bg-[#050B14] flex flex-col items-center justify-center relative">
        <SacredGeometryBackground intensity="subtle" animated />
        <BizraLogoAnimated size="xl" className="mb-8" />
        <h1 className="text-3xl font-serif text-[#C9A962] tracking-[0.5em] mb-2">NODEO</h1>
        <div className="text-xs font-mono text-[#C9A962]/50 tracking-widest animate-pulse">
          INITIALIZING GENESIS PROTOCOL...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 font-sans selection:bg-[#C9A962]/30 overflow-hidden flex flex-col">
      
      {/* TOP BAR */}
      <header 
        className="h-12 border-b border-gray-900 bg-black/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50"
        role="banner"
      >
        <div className="flex items-center gap-4">
          <Link href="/landing" className="flex items-center gap-3">
            <BizraLogoAnimated size="sm" />
            <span className="font-bold tracking-[0.2em] text-lg bg-gradient-to-r from-[#C9A962] to-purple-500 bg-clip-text text-transparent">
              BIZRA
            </span>
          </Link>
          <div className="h-4 w-px bg-gray-800 mx-2" aria-hidden="true"></div>
          <span className="text-xs text-gray-500 tracking-widest">NODEO-TITAN // GENESIS</span>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-gray-400">
            <Globe size={14} aria-hidden="true" />
            <span>DUBAI [DXB]</span>
          </div>
          <div className="flex items-center gap-2 text-[#2A9D8F]">
            <div className="w-2 h-2 bg-[#2A9D8F] rounded-full animate-pulse" aria-hidden="true"></div>
            <span>ONLINE</span>
            <span className="sr-only">System status: online</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span>V1.0.1</span>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 grid grid-cols-12 gap-1 p-1">
        
        {/* LEFT COLUMN: TELEMETRY & BRIDGE */}
        <div className="col-span-3 bg-[#0a0a0a] border border-gray-900 rounded-tl-lg rounded-bl-lg p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-900 to-transparent opacity-50"></div>
          <SynapseBridge />
          
          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] text-gray-500">MEMORY_HEAP</span>
              <span className="text-xs font-mono text-[#C9A962]">42%</span>
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full w-[42%] bg-[#C9A962]"></div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: THE CORE & VISUALIZATION */}
        <div className="col-span-6 bg-black border-y border-gray-900 relative flex flex-col">
          
          {/* Background Grid */}
          <div 
            className="absolute inset-0 opacity-10" 
            style={{ 
              backgroundImage: 'linear-gradient(rgba(201, 169, 98, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(201, 169, 98, 0.1) 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }}
          />

          {/* 3D Visualization */}
          <div className="flex-1 relative">
            <NeuralCore3D />
            
            {/* Floating HUD Elements */}
            <div className="absolute top-8 left-8 z-10">
              <GlassCard className="min-w-[200px]">
                <h3 className="text-[10px] font-mono text-[#C9A962] tracking-widest mb-2 border-b border-[#C9A962]/20 pb-1">ACTIVE LAYER</h3>
                <div className="text-xl font-serif text-white">Intelligence</div>
                <div className="text-xs text-white/50 mt-1">DeepSeek R1 • Qwen 2.5</div>
              </GlassCard>
            </div>

            <div className="absolute bottom-8 right-8 z-10 text-right">
              <GlassCard variant="teal">
                <h3 className="text-[10px] font-mono text-[#C9A962] tracking-widest mb-2 border-b border-[#C9A962]/20 pb-1">PROOF OF IMPACT</h3>
                <div className="text-2xl font-mono text-[#2A9D8F]">1,247.3</div>
                <div className="text-[10px] text-white/50 mt-1">VERIFIED BLOCKS: 28</div>
              </GlassCard>
            </div>

            <div className="absolute top-10 right-10 text-right z-10">
              <GlassCard variant="gold" className="text-right">
                <div className="text-[10px] text-gray-500 tracking-widest mb-1">CURRENT OBJECTIVE</div>
                <div className="text-sm text-[#C9A962] font-mono">DEPLOYMENT_PHASE_1</div>
                <div className="text-xs text-gray-400">Spine Architecture</div>
              </GlassCard>
            </div>

            <div className="absolute bottom-10 left-10 z-10">
              <div className="text-[10px] text-gray-500 tracking-widest mb-1">AUTHORIZATION</div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-700">MH</div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-300 font-bold">MoMo</span>
                  <span className="text-[10px] text-gray-500">First Architect</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interaction Deck */}
          <nav 
            className="h-24 bg-gray-900/30 border-t border-gray-800 backdrop-blur flex items-center justify-center gap-4 px-8"
            role="navigation"
            aria-label="Neural core actions"
          >
            <Link 
              href="/chat" 
              className="flex items-center gap-2 px-6 py-2 bg-[#C9A962]/10 border border-[#C9A962]/30 hover:bg-[#C9A962]/20 text-[#C9A962] text-xs tracking-widest transition-all rounded-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#C9A962] focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Open PAT Shell console"
            >
              <Terminal size={14} aria-hidden="true" />
              Invoke Shell
            </Link>
            <button 
              className="flex items-center gap-2 px-6 py-2 bg-purple-900/20 border border-purple-800 hover:bg-purple-900/40 text-purple-400 text-xs tracking-widest transition-all rounded-sm uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Connect to DeepSeek AI model"
            >
              <Brain size={14} aria-hidden="true" />
              Access DeepSeek
            </button>
            <button 
              className="flex items-center gap-2 px-6 py-2 bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 hover:bg-[#2A9D8F]/20 text-[#2A9D8F] text-xs tracking-widest transition-all rounded-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Broadcast this node to the network"
            >
              <Share2 size={14} aria-hidden="true" />
              Broadcast Node
            </button>
          </nav>
        </div>

        {/* RIGHT COLUMN: LEDGER & STORAGE */}
        <div className="col-span-3 bg-[#0a0a0a] border border-gray-900 rounded-tr-lg rounded-br-lg p-4 relative">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-[#2A9D8F]/50 to-transparent opacity-50"></div>
          <ImpactLedger />

          {/* Storage Metrics */}
          <div className="mt-6 space-y-3" role="list" aria-label="System services status">
            <div className="flex items-center gap-3 p-2 border border-gray-800 bg-gray-900/30" role="listitem">
              <Database size={16} className="text-gray-500" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400">POSTGRESQL</span>
                <span className="text-xs text-gray-200">Port 5432 <span className="text-[#2A9D8F]" aria-label="Status: active">●</span></span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 border border-gray-800 bg-gray-900/30" role="listitem">
              <Zap size={16} className="text-gray-500" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400">REDIS CACHE</span>
                <span className="text-xs text-gray-200">Port 6379 <span className="text-[#2A9D8F]" aria-label="Status: active">●</span></span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* FOOTER: TIMELINE */}
      <footer 
        className="h-8 bg-black border-t border-gray-900 flex items-center px-6 gap-4"
        role="contentinfo"
      >
        <span className="text-[10px] text-gray-600 font-mono" id="timeline-label">DEPLOYMENT TIMELINE:</span>
        <div 
          className="flex-1 flex items-center gap-1" 
          role="progressbar" 
          aria-labelledby="timeline-label" 
          aria-valuenow={3} 
          aria-valuemin={0} 
          aria-valuemax={14}
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded-full ${i < 3 ? 'bg-[#C9A962]' : 'bg-gray-800'}`}
              aria-hidden="true"
            ></div>
          ))}
        </div>
        <span className="text-[10px] text-[#C9A962] font-mono">DAY 03 / 14</span>
      </footer>

    </div>
  );
}
