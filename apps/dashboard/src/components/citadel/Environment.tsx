/**
 * 3D Environment Setup
 *
 * Configures lighting, fog, and camera controls for the Citadel scene.
 * Uses post-processing for cinematic effects (bloom, vignette, noise).
 */

import { OrbitControls, Stars, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { BRAND } from '../../constants/brand';
import { useBizraStore } from '../../store/useBizraStore';

interface EnvironmentProps {
  enableControls?: boolean;
  enablePostProcessing?: boolean;
}

export function Environment({
  enableControls = true,
  enablePostProcessing = true,
}: EnvironmentProps) {
  const phase = useBizraStore((state) => state.phase);

  return (
    <>
      {/* Background Color */}
      <color attach="background" args={[BRAND.three.navyDeep]} />

      {/* Fog for depth */}
      <fog attach="fog" args={[BRAND.three.navyDeep, 15, 80]} />

      {/* Ambient Light */}
      <ambientLight intensity={0.3} />

      {/* Key Light - Gold */}
      <pointLight
        position={[10, 15, 10]}
        intensity={1.2}
        color={BRAND.three.gold}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Fill Light - Teal */}
      <pointLight
        position={[-10, 10, -10]}
        intensity={0.5}
        color={BRAND.three.teal}
      />

      {/* Rim Light */}
      <pointLight
        position={[0, -10, 15]}
        intensity={0.3}
        color={BRAND.three.goldLight}
      />

      {/* Directional Light for Shadows */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Stars Background (visible in later phases) */}
      {(phase === 'CITADEL' || phase === 'FLIGHT') && (
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />
      )}

      {/* Ground Plane (subtle reflection) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -5, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color={BRAND.three.navy}
          roughness={0.8}
          metalness={0.2}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Orbit Controls */}
      {enableControls && (
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={10}
          maxDistance={100}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
          autoRotate={phase === 'CITADEL'}
          autoRotateSpeed={0.3}
        />
      )}

      {/* Post-Processing Effects */}
      {enablePostProcessing && (
        <EffectComposer>
          {/* Bloom for glow effect */}
          <Bloom
            luminanceThreshold={0.8}
            luminanceSmoothing={0.9}
            intensity={1.2}
          />
          {/* Film grain for cinematic feel */}
          <Noise blendFunction={1} />
          {/* Vignette for focus */}
          <Vignette eskil={false} offset={0.1} darkness={0.8} />
        </EffectComposer>
      )}
    </>
  );
}

/**
 * Floating Particles - Ambient decoration
 */
export function FloatingParticles({ count = 50 }: { count?: number }) {
  const particles = Array.from({ length: count }, () => ({
    position: [
      (Math.random() - 0.5) * 40,
      Math.random() * 30,
      (Math.random() - 0.5) * 40,
    ] as [number, number, number],
    scale: Math.random() * 0.1 + 0.02,
    speed: Math.random() * 0.5 + 0.1,
  }));

  return (
    <>
      {particles.map((particle, i) => (
        <Float
          key={i}
          position={particle.position}
          speed={particle.speed}
          rotationIntensity={0.2}
          floatIntensity={1}
        >
          <mesh>
            <sphereGeometry args={[particle.scale, 8, 8]} />
            <meshBasicMaterial
              color={BRAND.three.gold}
              transparent
              opacity={0.3}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

export default Environment;
