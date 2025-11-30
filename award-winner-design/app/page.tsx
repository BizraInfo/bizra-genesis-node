"use client"

import { Canvas } from "@react-three/fiber"
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing"
import { Citadel } from "@/components/citadel"
import { GlassInterface } from "@/components/glass-interface"
import { Suspense, useState } from "react"
import { NavDock } from "@/components/nav-dock"
import { DeckContainer } from "@/components/pitch-deck/deck-container"
import { TerminalSimulation } from "@/components/demo/terminal-simulation"
import { EvidencePack } from "@/components/evidence/metrics-display"
import { LayerVisualizer } from "@/components/architecture/layer-visualizer"
import { TreeVisualization } from "@/components/architecture/tree-visualization"
import { useBizraStore } from "@/store/use-bizra-store"
import { CosmicBackground } from "@/components/cosmic-background"
import { LoadingScreen } from "@/components/loading-screen"
import { SacredGeometryInterface } from "@/components/sacred-geometry-interface"
import { GenesisDashboard } from "@/components/genesis-dashboard"

// Wrapper component to access store
function PageContent() {
  const phase = useBizraStore((state) => state.phase)
  const [showLoading, setShowLoading] = useState(true)

  if (showLoading) {
    return <LoadingScreen onComplete={() => setShowLoading(false)} />
  }

  return (
    <main className="w-full min-h-screen bg-[#050B14] relative">
      {/* 3D Layer - Fixed Background */}
      <div className="fixed inset-0 z-0">
        <Canvas camera={{ position: [0, 10, 20], fov: 45 }}>
          <color attach="background" args={["#050B14"]} />
          <fog attach="fog" args={["#050B14", 10, 50]} />

          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#C9A962" />

          <Suspense fallback={null}>
            <CosmicBackground />
            <group position={[0, -5, 0]}>
              <Citadel />
            </group>
          </Suspense>

          {/* Cinematic Post-Processing */}
          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.4} />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* UI Layer - Fixed Overlay */}
      <GlassInterface />

      {/* Navigation Dock - Always visible */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <NavDock />
      </div>

      {/* Content Sections - Only visible in CITADEL phase, scrollable over the fixed background */}
      {phase === "CITADEL" && (
        <div className="relative z-20 pt-[100vh]">
          <div id="pitch-deck" className="bg-[#050B14]/80 backdrop-blur-md border-t border-[#C9A962]/20">
            <DeckContainer />
          </div>

          <div id="sacred-interface" className="border-t border-[#C9A962]/10">
            <SacredGeometryInterface />
          </div>

          <div
            id="demo"
            className="min-h-screen flex items-center justify-center border-t border-[#C9A962]/10 bg-[#0A1628]/90 relative overflow-hidden py-20 backdrop-blur-md"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />
            <div className="container mx-auto px-4 z-10 space-y-20">
              <div className="text-center">
                <h2 className="text-4xl md:text-5xl font-serif text-[#F8F6F1] mb-4">
                  <span className="text-[#2A9D8F]">TMP v0.1</span> Simulation
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Experience the world's first mathematical consciousness safety system in action. Initialize the
                  sequence to verify Ihsan bounds and safety gates.
                </p>
              </div>
              <TerminalSimulation />

              <div className="pt-20 border-t border-white/5">
                <LayerVisualizer />
              </div>

              <div className="pt-20 border-t border-white/5">
                <TreeVisualization />
              </div>
            </div>
          </div>

          <div id="genesis-dashboard" className="border-t border-[#C9A962]/10">
            <GenesisDashboard />
          </div>

          <div
            id="evidence"
            className="min-h-screen flex items-center justify-center border-t border-[#C9A962]/10 py-20 bg-[#050B14]/95 backdrop-blur-md"
          >
            <EvidencePack />
          </div>
        </div>
      )}
    </main>
  )
}

export default function Page() {
  return <PageContent />
}
