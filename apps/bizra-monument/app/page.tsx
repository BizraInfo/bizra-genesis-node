'use client';

import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { Citadel } from '../components/Citadel';
import { GlassInterface } from '../components/GlassInterface';
import { Suspense } from 'react';
import { AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';

export default function Page() {
  return (
    <main className="w-full h-screen bg-[#050B14] overflow-hidden">
      {/* 3D Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 10, 20], fov: 45 }}>
          <color attach="background" args={['#050B14']} />
          <fog attach="fog" args={['#050B14', 10, 50]} />

          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#C9A962" />

          <AdaptiveDpr pixelated />
          <AdaptiveEvents />

          <Suspense fallback={null}>
            <group position={[0, -5, 0]}>
              <Citadel />
            </group>
          </Suspense>

          {/* Cinematic Post-Processing */}
          <EffectComposer>
            <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.4} />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* UI Layer */}
      <GlassInterface />
    </main>
  );
}
