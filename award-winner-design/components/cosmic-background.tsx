"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export function CosmicBackground() {
  const pointsRef = useRef<THREE.Points>(null)

  // Generate 5000 particles with random positions and colors
  const particles = useMemo(() => {
    const count = 5000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const colorPalette = [
      new THREE.Color("#C9A962"), // Gold
      new THREE.Color("#2A9D8F"), // Teal
      new THREE.Color("#6B4C9A"), // Purple
      new THREE.Color("#F8F6F1"), // White
    ]

    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const r = 50 + Math.random() * 100
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] = Math.random() * 0.5
    }

    return { positions, colors, sizes }
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) return

    // Slow rotation
    pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.02
    pointsRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.01) * 0.05
  })

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
        <bufferAttribute attach="attributes-size" count={particles.sizes.length} array={particles.sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
