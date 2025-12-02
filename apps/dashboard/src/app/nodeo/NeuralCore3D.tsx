'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * NeuralCore3D - 3D visualization of the BIZRA neural core
 * Lazy-loaded to avoid ~330KB Three.js bundle on initial page load
 */
export default function NeuralCore3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = 1;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for performance
    container.appendChild(renderer.domElement);

    // The "Core" (Icosahedron)
    const geometry = new THREE.IcosahedronGeometry(1.5, 1);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xC9A962, 
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const core = new THREE.Mesh(geometry, material);
    scene.add(core);

    // Inner Core
    const innerGeo = new THREE.OctahedronGeometry(0.8, 0);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x2A9D8F, wireframe: true });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerCore);

    // Particle Field (The "Forest")
    const particlesGeo = new THREE.BufferGeometry();
    const particlesCount = 500;
    const posArray = new Float32Array(particlesCount * 3);
    
    for(let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 15;
    }
    
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.02,
      color: 0xC9A962,
      transparent: true,
      opacity: 0.6
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      core.rotation.x += 0.002;
      core.rotation.y += 0.002;
      innerCore.rotation.x -= 0.004;
      innerCore.rotation.y -= 0.004;

      // Pulse Effect (Heartbeat)
      const time = Date.now() * 0.001;
      const scale = 1 + Math.sin(time * 2) * 0.05;
      core.scale.set(scale, scale, scale);

      particles.rotation.y += 0.0005;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
}
