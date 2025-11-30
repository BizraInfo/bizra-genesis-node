"use client"

import * as THREE from "three"
import { useRef, useMemo, useLayoutEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { useBizraStore } from "@/store/use-bizra-store"

const COUNT = 15000 // The 15,000 Hours
const TEMP_OBJECT = new THREE.Object3D()
const GOLD_COLOR = new THREE.Color("#C9A962")
const NAVY_COLOR = new THREE.Color("#0A1628")

type InstanceDatum = {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}

export function Citadel() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const isDevMode = useBizraStore((state) => state.isDevMode)

  // Algorithm: Procedural City Generation
  // We map the "pain" (hours) into a spiral tower structure (The Citadel).
  const data: InstanceDatum[] = useMemo(() => {
    return new Array(COUNT).fill(0).map((_, i) => {
      const angle = i * 0.1 // Golden Angle approximation
      const radius = Math.sqrt(i) * 0.5
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      // Height represents intensity of work during that hour
      // We use a noise-like function to simulate "bursts" of coding
      const y = Math.sin(i * 0.05) * Math.cos(i * 0.01) * 2 + (i / COUNT) * 20

      return {
        position: [x, y, z],
        rotation: [0, angle, 0],
        scale: 0.5 + Math.random() * 0.8, // avoid near-zero scale
      }
    })
  }, [])

  // GPU Upload: Update matrices only once
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    data.forEach((d, i) => {
      TEMP_OBJECT.position.set(d.position[0], d.position[1], d.position[2])
      TEMP_OBJECT.rotation.set(d.rotation[0], d.rotation[1], d.rotation[2])
      TEMP_OBJECT.scale.setScalar(d.scale)
      TEMP_OBJECT.updateMatrix()
      mesh.setMatrixAt(i, TEMP_OBJECT.matrix)

      // Color Logic: Older commits are darker (Foundation), Newer are Gold (Release)
      // If DevMode is on, we highlight the "Ramadan 2023" block in Red.
      const progress = i / COUNT
      const color = new THREE.Color().lerpColors(NAVY_COLOR, GOLD_COLOR, progress)

      // Optionally: mark "origin" hour in dev mode
      if (isDevMode && i === 0) {
        color.set("#FF0044") // debugging "Ramadan 2023" spike
      }

      mesh.setColorAt(i, color)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [data, isDevMode])

  // The Heartbeat Loop (60 FPS)
  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return

    // Rotate the entire history slowly
    mesh.rotation.y += 0.0012

    // Breathing effect based on Ihsan score
    const breath = Math.sin(state.clock.elapsedTime * 0.7) * 0.03 + 1
    mesh.scale.setScalar(breath)
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} castShadow receiveShadow>
      <boxGeometry args={[0.2, 1, 0.2]} /> {/* The "Commit" Block */}
      <meshStandardMaterial roughness={0.2} metalness={0.8} emissive={GOLD_COLOR} emissiveIntensity={0.25} />
    </instancedMesh>
  )
}
