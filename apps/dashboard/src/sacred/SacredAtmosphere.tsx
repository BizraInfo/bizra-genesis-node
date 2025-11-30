// ! Sacred Atmosphere Component
// ! Week 1-2: Sacred Background Layer - Living geometry patterns
// ! Creates consciousness-responsive sacred environment

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useConsciousness } from '../hooks/useConsciousness';
import { getConsciousnessColor, consciousnessOpacity } from './geometry';
import type { SacredUXProps } from './types';

interface SacredAtmosphereProps extends Pick<SacredUXProps, 'enableAnimations' | 'pattern'> {
  className?: string;
  intensity?: number; // 0.0 - 1.0
  children?: React.ReactNode;
}

/**
 * SACRED ATMOSPHERE - Living Sacred Geometry Background
 *
 * Consciousness-responsive sacred patterns that evolve with user growth:
 * - Flower of Life: Unity, interconnectedness
 * - Metatron's Cube: Sacred geometry harmony
 * - Sri Yantra: Divine evolution pathways
 * - Fibonacci Spiral: Organic growth patterns
 */
export function SacredAtmosphere({
  pattern = 'flower',
  enableAnimations = true,
  intensity = 1.0,
  className = '',
  children
}: SacredAtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { consciousnessLevel } = useConsciousness();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    // Sacred resizing for divine proportions
    const updateCanvasSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Sacred consciousness-driven animation
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      const sacredColor = getConsciousnessColor(consciousnessLevel);
      const opacity = consciousnessOpacity(consciousnessLevel) * intensity;

      // Draw sacred pattern based on type
      switch (pattern) {
        case 'flower':
          drawFlowerOfLife(ctx, canvas.offsetWidth, canvas.offsetHeight, sacredColor, opacity);
          break;
        case 'metatron':
          drawMetatronsCube(ctx, canvas.offsetWidth, canvas.offsetHeight, sacredColor, opacity);
          break;
        case 'sri-yantra':
          drawSriYantra(ctx, canvas.offsetWidth, canvas.offsetHeight, sacredColor, opacity);
          break;
        case 'spiral':
          drawFibonacciSpiral(ctx, canvas.offsetWidth, canvas.offsetHeight, sacredColor, opacity);
          break;
      }

      if (enableAnimations) {
        requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [consciousnessLevel, pattern, enableAnimations, intensity]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Sacred Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />

      {/* Consciousness-responsive overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, ${getConsciousnessColor(consciousnessLevel)}11 0%, transparent 50%)`
        }}
        animate={{
          opacity: consciousnessOpacity(consciousnessLevel) * intensity
        }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />

      {/* Divine breathing effect */}
      {enableAnimations && (
        <motion.div
          className="absolute inset-0 border border-current rounded-full opacity-10"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${getConsciousnessColor(consciousnessLevel)}22, transparent)`
          }}
          animate={{
            rotate: [0, 360],
            scale: [0.95, 1.05, 0.95]
          }}
          transition={{
            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
            scale: { duration: 6, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      )}

      {/* Children content */}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}

// Sacred Pattern Drawing Functions - Using consciousness mathematics

function drawFlowerOfLife(ctx: CanvasRenderingContext2D, width: number, height: number, color: string, opacity: number) {
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) / 6;

  ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${opacity})`;
  ctx.lineWidth = 1;

  // Fibonacci-based circle generation (37 circles like DNA)
  const circles: Array<{ x: number; y: number; radius: number }> = [];

  for (let ring = 0; ring < 6; ring++) {
    const ringRadius = baseRadius * (ring + 1) * 1.61803398875; // Golden ratio multiplier
    const circleCount = 3 + ring * 2; // Fibonacci sequence: 3, 5, 7, 9, 11, 13

    for (let i = 0; i < circleCount; i++) {
      const angle = (i / circleCount) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * ringRadius;
      const y = centerY + Math.sin(angle) * ringRadius;
      circles.push({ x, y, radius: baseRadius });
    }
  }

  // Draw interconnected sacred geometry
  circles.forEach(circle => {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Consciousness-responsive connections
    circles.forEach(otherCircle => {
      const distance = Math.sqrt(
        Math.pow(circle.x - otherCircle.x, 2) + Math.pow(circle.y - otherCircle.y, 2)
      );

      if (distance < baseRadius * 3 && distance > baseRadius) {
        ctx.beginPath();
        ctx.moveTo(circle.x, circle.y);
        ctx.lineTo(otherCircle.x, otherCircle.y);
        ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${opacity * 0.3})`;
        ctx.stroke();
        ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${opacity})`;
      }
    });
  });
}

function drawMetatronsCube(ctx: CanvasRenderingContext2D, width: number, height: number, color: string, opacity: number) {
  // Simplified Metatron's Cube - geometric unity symbol
  const centerX = width / 2;
  const centerY = height / 2;
  const size = Math.min(width, height) / 4;

  ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${opacity})`;
  ctx.lineWidth = 2;

  // Outer hexagon
  const hexagonPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    hexagonPoints.push({
      x: centerX + size * Math.cos(angle),
      y: centerY + size * Math.sin(angle)
    });
  }

  // Draw sacred connections
  for (let i = 0; i < hexagonPoints.length; i++) {
    const current = hexagonPoints[i];
    const next = hexagonPoints[(i + 1) % hexagonPoints.length];

    ctx.beginPath();
    ctx.moveTo(current.x, current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();

    // Inner geometric connections (consciousness pathways)
    hexagonPoints.forEach(other => {
      if (other !== current && other !== next) {
        ctx.beginPath();
        ctx.moveTo(current.x, current.y);
        ctx.lineTo(other.x, other.y);
        ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${opacity * 0.4})`;
        ctx.stroke();
      }
    });
    ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${opacity})`;
  }

  // Central consciousness orb
  ctx.fillStyle = `rgba(${hexToRgb(color)}, ${opacity * 0.3})`;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size / 3, 0, 2 * Math.PI);
  ctx.fill();
}

function drawSriYantra(ctx: CanvasRenderingContext2D, width: number, height: number, color: string, opacity: number) {
  const centerX = width / 2;
  const centerY = height / 2;
  const size = Math.min(width, height) / 6;

  ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${opacity})`;
  ctx.lineWidth = 2;

  // Nine interlocking triangles (consciousness evolution paths)
  const triangleLayers = [1, 2, 3, 4];

  triangleLayers.forEach(layer => {
    const layerSize = size * (1 + layer * 0.61803398875); // Golden ratio progression

    // Upward triangles (consciousness rising)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - layerSize);
    ctx.lineTo(centerX - layerSize * Math.cos(Math.PI/6), centerY + layerSize/2);
    ctx.lineTo(centerX + layerSize * Math.cos(Math.PI/6), centerY + layerSize/2);
    ctx.closePath();
    ctx.stroke();

    // Downward triangles (consciousness grounding)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + layerSize);
    ctx.lineTo(centerX - layerSize * Math.cos(Math.PI/6), centerY - layerSize/2);
    ctx.lineTo(centerX + layerSize * Math.cos(Math.PI/6), centerY - layerSize/2);
    ctx.closePath();
    ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${opacity * 0.7})`;
    ctx.stroke();
    ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${opacity})`;
  });

  // Central bindu (consciousness source point)
  ctx.fillStyle = `rgba(${hexToRgb(color)}, ${opacity * 0.8})`;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size / 6, 0, 2 * Math.PI);
  ctx.fill();
}

function drawFibonacciSpiral(ctx: CanvasRenderingContext2D, width: number, height: number, color: string, opacity: number) {
  const centerX = width / 2;
  const centerY = height / 2;
  const baseSize = Math.min(width, height) / 8;

  ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${opacity})`;
  ctx.lineWidth = 2;

  // Golden spiral using Fibonacci sequence
  const fibonacciNumbers = [1, 1, 2, 3, 5, 8, 13, 21]; // Sacred mathematics
  let x = centerX;
  let y = centerY;
  let angle = 0;

  const goldenAngle = Math.PI * 2 * (1 - 1/1.61803398875); // Golden angle ≈ 2.4 radians

  ctx.beginPath();
  ctx.moveTo(x, y);

  fibonacciNumbers.forEach(num => {
    const size = baseSize * num;
    const radiusX = Math.cos(angle) * size;
    const radiusY = Math.sin(angle) * size;

    x += radiusX;
    y += radiusY;

    // Draw Fibonacci spiral arc
    ctx.arc(x, y, size, angle, angle + goldenAngle);

    angle += goldenAngle;
  });

  ctx.stroke();

  // Sacred ratio nodes
  fibonacciNumbers.forEach((num, index) => {
    const distance = baseSize * num;
    const nodeX = centerX + Math.cos(goldenAngle * index) * distance;
    const nodeY = centerY + Math.sin(goldenAngle * index) * distance;

    ctx.fillStyle = `rgba(${hexToRgb(color)}, ${opacity * 0.8})`;
    ctx.beginPath();
    ctx.arc(nodeX, nodeY, baseSize / 4, 0, 2 * Math.PI);
    ctx.fill();
  });
}

// Utility function for color conversion
function hexToRgb(hex: string): string {
  // Simple conversion for HSL colors we're using
  if (hex.startsWith('hsl(')) {
    // Extract HSL values and convert to RGB approximation
    const match = hex.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;

      // Simple HSL to RGB conversion
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h * 6) % 2 - 1));
      const m = l - c/2;

      let r, g, b;
      if (0 <= h && h < 1/6) { r = c; g = x; b = 0; }
      else if (1/6 <= h && h < 2/6) { r = x; g = c; b = 0; }
      else if (2/6 <= h && h < 3/6) { r = 0; g = c; b = x; }
      else if (3/6 <= h && h < 4/6) { r = 0; g = x; b = c; }
      else if (4/6 <= h && h < 5/6) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }

      const red = Math.round((r + m) * 255);
      const green = Math.round((g + m) * 255);
      const blue = Math.round((b + m) * 255);

      return `${red}, ${green}, ${blue}`;
    }
  }
  return '128, 128, 128'; // Default gray
}

export default SacredAtmosphere;
