'use client';

/**
 * BIZRA Premium Experience Demo Page
 * Showcases the integrated award-winner-design components
 */

import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  LoadingScreen, 
  CosmicBackground, 
  BizraNavDock,
  GlassCard,
  GlassCardWithHeader,
  MetricCard,
  GlassPanel 
} from '@/components/premium';

export default function PremiumExperience() {
  const [showLoading, setShowLoading] = useState(true);

  if (showLoading) {
    return <LoadingScreen onComplete={() => setShowLoading(false)} />;
  }

  return (
    <main className="w-full min-h-screen bg-deep-space relative overflow-x-hidden">
      {/* 3D Background Layer */}
      <div className="fixed inset-0 z-0">
        <Canvas camera={{ position: [0, 10, 20], fov: 45 }}>
          <color attach="background" args={['#050B14']} />
          <fog attach="fog" args={['#050B14', 10, 50]} />

          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#C9A962" />

          <Suspense fallback={null}>
            <CosmicBackground />
          </Suspense>
        </Canvas>
      </div>

      {/* Navigation Dock */}
      <BizraNavDock />

      {/* Content Layer */}
      <div className="relative z-10 pt-20 pb-32 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Hero Section */}
        <section id="citadel" className="min-h-screen flex flex-col items-center justify-center text-center">
          <h1 className="text-5xl md:text-7xl font-light tracking-[0.2em] text-gradient-gold mb-6">
            BIZRA
          </h1>
          <p className="text-xl md:text-2xl text-white/70 font-light max-w-2xl mb-12">
            Where Spirituality Meets Technology
          </p>
          <div className="glass-button">
            Enter the Citadel
          </div>
        </section>

        {/* POI Metrics Section */}
        <section id="poi" className="py-24">
          <GlassPanel>
            <h2 className="text-3xl font-serif text-gold mb-8">
              Proof of Impact Metrics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                label="Total POI"
                value={220181.94}
                unit="POI"
                trend="up"
                trendValue={12.5}
              />
              <MetricCard
                label="Ihsan Score"
                value="0.88"
                trend="up"
                trendValue={2.3}
              />
              <MetricCard
                label="Hours Logged"
                value={1547}
                unit="hrs"
                trend="neutral"
                trendValue={0}
              />
              <MetricCard
                label="Agents Active"
                value={72}
                unit="/ 72"
                trend="up"
                trendValue={100}
              />
            </div>
          </GlassPanel>
        </section>

        {/* Agents Section */}
        <section id="agents" className="py-24">
          <h2 className="text-3xl font-serif text-gold mb-8 text-center">
            Agent Teams
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCardWithHeader
              title="Development Team"
              subtitle="Core system builders"
            >
              <div className="space-y-3">
                <AgentRow name="Claude-Prime" role="Architecture" status="active" />
                <AgentRow name="GPT-Sentinel" role="Security" status="active" />
                <AgentRow name="Gemini-Sage" role="Research" status="idle" />
              </div>
            </GlassCardWithHeader>

            <GlassCardWithHeader
              title="Operations Team"
              subtitle="System maintenance"
            >
              <div className="space-y-3">
                <AgentRow name="Node-Guardian" role="Infrastructure" status="active" />
                <AgentRow name="Data-Weaver" role="Analytics" status="active" />
                <AgentRow name="Log-Observer" role="Monitoring" status="active" />
              </div>
            </GlassCardWithHeader>

            <GlassCardWithHeader
              title="Research Team"
              subtitle="Innovation & exploration"
            >
              <div className="space-y-3">
                <AgentRow name="Theory-Forge" role="Mathematics" status="processing" />
                <AgentRow name="Pattern-Seeker" role="ML/AI" status="active" />
                <AgentRow name="Quantum-Mind" role="Experimental" status="idle" />
              </div>
            </GlassCardWithHeader>
          </div>
        </section>

        {/* Genesis Section */}
        <section id="genesis" className="py-24">
          <GlassPanel className="text-center">
            <h2 className="text-3xl font-serif text-gold mb-4">
              Genesis 100 Program
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto mb-8">
              Join the founding cohort of BIZRA node operators. Be among the first 100 to participate in the 
              proof-of-impact revolution.
            </p>
            <div className="flex justify-center gap-4">
              <div className="glass-button">
                Apply Now
              </div>
              <div className="glass-button bg-transparent">
                Learn More
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* Evidence Section */}
        <section id="evidence" className="py-24">
          <h2 className="text-3xl font-serif text-gold mb-8 text-center">
            Evidence Pack
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-lg font-semibold text-soft-white mb-4">
                Mathematical Verification
              </h3>
              <div className="font-mono text-sm text-accent-teal">
                <p>✓ Ihsan bounds verified: [0.0, 1.0]</p>
                <p>✓ TMP consciousness gates: PASSED</p>
                <p>✓ Byzantine fault tolerance: 3f+1</p>
                <p>✓ Consensus rounds: &lt; 100ms</p>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-semibold text-soft-white mb-4">
                System Validation
              </h3>
              <div className="font-mono text-sm text-accent-teal">
                <p>✓ Unit tests: 505+ passing</p>
                <p>✓ Integration tests: 100% coverage</p>
                <p>✓ E2E validation: Complete</p>
                <p>✓ Security audit: Verified</p>
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </main>
  );
}

// Helper component for agent rows
function AgentRow({ 
  name, 
  role, 
  status 
}: { 
  name: string; 
  role: string; 
  status: 'active' | 'idle' | 'processing' 
}) {
  const statusColors = {
    active: 'bg-accent-teal',
    idle: 'bg-gray-500',
    processing: 'bg-gold animate-pulse',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm text-soft-white font-medium">{name}</p>
        <p className="text-xs text-white/40">{role}</p>
      </div>
      <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
    </div>
  );
}
