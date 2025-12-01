'use client';

/**
 * BIZRA Cosmic Background
 * Three.js particle system for immersive 3D backgrounds
 * Adapted from award-winner-design
 * 
 * Features:
 * - 5,000 particles with color variety
 * - Spherical distribution
 * - Smooth rotation animation
 * - Additive blending for glow effect
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CosmicBackgroundProps {
  /** Number of particles (default: 5000) */
  particleCount?: number;
  /** Minimum radius for particle distribution (default: 50) */
  minRadius?: number;
  /** Maximum radius for particle distribution (default: 150) */
  maxRadius?: number;
  /** Particle size (default: 0.2) */
  particleSize?: number;
  /** Rotation speed multiplier (default: 1) */
  rotationSpeed?: number;
}

// BIZRA color palette for particles
const BIZRA_COLORS = [
  '#C9A962', // Gold
  '#2A9D8F', // Teal
  '#6B4C9A', // Sacred Purple
  '#F8F6F1', // Soft White
  '#D4AF37', // Primary Gold
] as const;

/**
 * 3D particle starfield background
 * Uses instanced geometry for performance
 */
export function CosmicBackground({
  particleCount = 5000,
  minRadius = 50,
  maxRadius = 150,
  particleSize = 0.2,
  rotationSpeed = 1,
}: CosmicBackgroundProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate particles with spherical distribution
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const colorPalette = BIZRA_COLORS.map(hex => new THREE.Color(hex));

    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution using random spherical coordinates
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      // Convert spherical to Cartesian coordinates
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Random color from palette
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Random size variation
      sizes[i] = Math.random() * 0.5;
    }

    return { positions, colors, sizes };
  }, [particleCount, minRadius, maxRadius]);

  // Animation loop
  useFrame((state) => {
    if (!pointsRef.current) {return;}

    const elapsed = state.clock.getElapsedTime();

    // Slow rotation
    pointsRef.current.rotation.y = elapsed * 0.02 * rotationSpeed;
    pointsRef.current.rotation.x = Math.sin(elapsed * 0.01) * 0.05 * rotationSpeed;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particles.sizes.length}
          array={particles.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={particleSize}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * Simpler 2D canvas fallback for non-WebGL environments
 * Can be used as a lightweight alternative
 */
export function CosmicBackground2D({ 
  className = '' 
}: { 
  className?: string 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
    }> = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        color: BIZRA_COLORS[Math.floor(Math.random() * BIZRA_COLORS.length)],
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.fillStyle = 'rgba(5, 11, 20, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x < 0) {particle.x = canvas.width;}
        if (particle.x > canvas.width) {particle.x = 0;}
        if (particle.y < 0) {particle.y = canvas.height;}
        if (particle.y > canvas.height) {particle.y = 0;}

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ background: '#050B14' }}
    />
  );
}

export default CosmicBackground;
