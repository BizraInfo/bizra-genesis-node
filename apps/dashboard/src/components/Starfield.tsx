'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface StarfieldProps {
  /** Number of stars/nodes in the network */
  nodeCount?: number;
  /** Connection distance threshold */
  connectionDistance?: number;
  /** Primary color for nodes */
  nodeColor?: string;
  /** Color for connections */
  lineColor?: string;
  /** Animation speed multiplier */
  speed?: number;
  /** Enable mouse interaction */
  interactive?: boolean;
}

/**
 * BIZRA Starfield - 3D Neural Network Visualization
 * 
 * A WebGL-powered visualization of interconnected nodes
 * representing the sovereign AI network. Each node is a
 * potential participant in the BIZRA ecosystem.
 */
export default function Starfield({
  nodeCount = 200,
  connectionDistance = 150,
  nodeColor = '#D4AF37',
  lineColor = '#D4AF37',
  speed = 0.5,
  interactive = true
}: StarfieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    nodes: THREE.Points;
    lines: THREE.LineSegments;
    positions: Float32Array;
    velocities: Float32Array;
    animationId: number;
  } | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Create nodes (stars)
    const positions = new Float32Array(nodeCount * 3);
    const velocities = new Float32Array(nodeCount * 3);
    const colors = new Float32Array(nodeCount * 3);

    const goldColor = new THREE.Color(nodeColor);
    const spread = 800;

    for (let i = 0; i < nodeCount; i++) {
      const i3 = i * 3;
      
      // Random position in 3D space
      positions[i3] = (Math.random() - 0.5) * spread;
      positions[i3 + 1] = (Math.random() - 0.5) * spread;
      positions[i3 + 2] = (Math.random() - 0.5) * spread;

      // Random velocity
      velocities[i3] = (Math.random() - 0.5) * speed;
      velocities[i3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i3 + 2] = (Math.random() - 0.5) * speed;

      // Gold color with slight variation
      const variation = 0.8 + Math.random() * 0.4;
      colors[i3] = goldColor.r * variation;
      colors[i3 + 1] = goldColor.g * variation;
      colors[i3 + 2] = goldColor.b * variation;
    }

    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    nodeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const nodeMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
    scene.add(nodes);

    // Create connection lines
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(lineColor),
      transparent: true,
      opacity: 0.15
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Store refs
    sceneRef.current = {
      scene,
      camera,
      renderer,
      nodes,
      lines,
      positions,
      velocities,
      animationId: 0
    };

    // Update connections between nearby nodes
    const updateConnections = () => {
      const linePositions: number[] = [];
      const pos = sceneRef.current!.positions;

      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const i3 = i * 3;
          const j3 = j * 3;

          const dx = pos[i3] - pos[j3];
          const dy = pos[i3 + 1] - pos[j3 + 1];
          const dz = pos[i3 + 2] - pos[j3 + 2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (distance < connectionDistance) {
            linePositions.push(
              pos[i3], pos[i3 + 1], pos[i3 + 2],
              pos[j3], pos[j3 + 1], pos[j3 + 2]
            );
          }
        }
      }

      lineGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(linePositions, 3)
      );
    };

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;

      const { positions: pos, velocities: vel } = sceneRef.current;

      // Update node positions
      for (let i = 0; i < nodeCount; i++) {
        const i3 = i * 3;

        pos[i3] += vel[i3];
        pos[i3 + 1] += vel[i3 + 1];
        pos[i3 + 2] += vel[i3 + 2];

        // Wrap around boundaries
        const halfSpread = spread / 2;
        if (pos[i3] > halfSpread) pos[i3] = -halfSpread;
        if (pos[i3] < -halfSpread) pos[i3] = halfSpread;
        if (pos[i3 + 1] > halfSpread) pos[i3 + 1] = -halfSpread;
        if (pos[i3 + 1] < -halfSpread) pos[i3 + 1] = halfSpread;
        if (pos[i3 + 2] > halfSpread) pos[i3 + 2] = -halfSpread;
        if (pos[i3 + 2] < -halfSpread) pos[i3 + 2] = halfSpread;
      }

      nodeGeometry.attributes.position.needsUpdate = true;

      // Update connections every few frames for performance
      if (Math.random() < 0.1) {
        updateConnections();
      }

      // Mouse interaction - subtle camera movement
      if (interactive) {
        camera.position.x += (mouseRef.current.x * 50 - camera.position.x) * 0.02;
        camera.position.y += (-mouseRef.current.y * 50 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);
      }

      // Gentle rotation
      nodes.rotation.y += 0.0003;
      lines.rotation.y += 0.0003;

      renderer.render(scene, camera);
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };

    // Initial connections
    updateConnections();
    animate();

    // Mouse move handler
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current = {
        x: (event.clientX / width) * 2 - 1,
        y: (event.clientY / height) * 2 - 1
      };
    };

    // Resize handler
    const handleResize = () => {
      if (!sceneRef.current || !containerRef.current) return;

      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        renderer.dispose();
        nodeGeometry.dispose();
        nodeMaterial.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [nodeCount, connectionDistance, nodeColor, lineColor, speed, interactive]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      style={{ background: 'radial-gradient(ellipse at center, #0a0a0f 0%, #000000 100%)' }}
    />
  );
}
