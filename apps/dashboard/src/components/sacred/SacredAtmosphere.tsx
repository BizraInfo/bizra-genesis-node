// ! Sacred Atmosphere Component
// ! Week 1: Sacred Design System - Flower of Life background patterns and consciousness adaptation
// ! Creates divine geometry backgrounds that respond to user consciousness levels

import { useEffect, useRef, useState } from 'react';
import { generateFlowerOfLife, generateMetatronsCube, getConsciousnessColor } from '../../sacred/geometry';
import { useConsciousness } from '../../hooks/useConsciousness';

interface SacredAtmosphereProps {
  consciousnessLevel?: number;
  pattern?: 'flower' | 'metatron' | 'sri-yantra' | 'spiral';
  intensity?: 'subtle' | 'moderate' | 'intense';
  className?: string;
}

/**
 * SACRED ATMOSPHERE - Divine Geometry Background System
 *
 * Implements consciousness-responsive sacred geometry backgrounds:
 * - Flower of Life: 19 interlocking circles (unity, oneness)
 * - Metatron's Cube: 13 circles with connecting lines (creation, origin)
 * - Sri Yantra: Multi-level triangles (spiritual evolution)
 * - Fibonacci Spiral: Natural growth patterns (consciousness)
 *
 * Colors adapt based on consciousness level:
 * 0.0-0.33: Awakening (Purple)
 * 0.34-0.66: Intelligence (Blue)
 * 0.67-0.84: Wisdom (Gold)
 * 0.85-1.0: Transcendence (Magenta)
 */
export function SacredAtmosphere({
  consciousnessLevel: externalLevel,
  pattern = 'flower',
  intensity = 'moderate',
  className = ''
}: SacredAtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { consciousnessLevel: contextLevel } = useConsciousness();
  const consciousnessLevel = externalLevel ?? contextLevel ?? 0.5;

  // Consciousness-responsive opacity and color intensity
  const opacity = intensity === 'subtle' ? 0.08 :
                  intensity === 'moderate' ? 0.15 : 0.25;

  const consciousnessColor = getConsciousnessColor(consciousnessLevel);
  const [animationOffset, setAnimationOffset] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    // Set canvas size to fullscreen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop for gentle pulsing
    const animate = () => {
      setAnimationOffset(prev => prev + 0.005);
      requestAnimationFrame(animate);
    };

    const drawSacredGeometry = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set blend mode for ethereal effect
      ctx.globalCompositeOperation = 'screen';

      // Calculate center and sacred scaling
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 1000;

      if (pattern === 'flower') {
        drawFlowerOfLife(ctx, centerX, centerY, scale, consciousnessLevel, animationOffset);
      } else if (pattern === 'metatron') {
        drawMetatronsCube(ctx, centerX, centerY, scale, consciousnessLevel, animationOffset);
      } else if (pattern === 'sri-yantra') {
        drawSriYantra(ctx, centerX, centerY, scale, consciousnessLevel, animationOffset);
      } else if (pattern === 'spiral') {
        drawFibonacciSpiral(ctx, centerX, centerY, scale, consciousnessLevel, animationOffset);
      }
    };

    drawSacredGeometry();
    animate();

    // Redraw on consciousness level changes
    const intervalId = setInterval(drawSacredGeometry, 100);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [pattern, consciousnessLevel, animationOffset]);

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
      {/* Canvas for sacred geometry */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: opacity + (Math.sin(animationOffset) * 0.03), // Gentle pulsing
        }}
      />

      {/* Consciousness-responsive overlay gradients */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle at 25% 25%, ${consciousnessColor}08 0%, transparent 50%),
                       radial-gradient(circle at 75% 75%, ${adjustColorLightness(consciousnessColor, -10)}06 0%, transparent 50%),
                       radial-gradient(circle at 50% 50%, ${adjustColorLightness(consciousnessColor, -20)}04 0%, transparent 50%)`,
        }}
      />

      {/* Sacred border/frame effect */}
      <div
        className="absolute inset-4 border rounded-lg"
        style={{
          borderColor: `${consciousnessColor}10`,
          boxShadow: `inset 0 0 60px ${consciousnessColor}05`,
        }}
      />
    </div>
  );
}

// Sacred Geometry Drawing Functions

function drawFlowerOfLife(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scale: number,
  consciousnessLevel: number,
  animationOffset: number
) {
  const circles = generateFlowerOfLife(centerX, centerY, scale * 60);

  circles.forEach((circle, index) => {
    const opacity = 0.1 + (consciousnessLevel * 0.3) + (Math.sin(animationOffset + index * 0.5) * 0.05);
    const color = getConsciousnessColor(consciousnessLevel + (index * 0.1));

    ctx.strokeStyle = `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius * (1 + Math.sin(animationOffset + index * 0.3) * 0.1), 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawMetatronsCube(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scale: number,
  consciousnessLevel: number,
  animationOffset: number
) {
  const vertices = generateMetatronsCube(centerX, centerY, scale * 80);

  // Draw connecting lines
  ctx.strokeStyle = `${getConsciousnessColor(consciousnessLevel)}15`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();

  // Connect vertices to form the cube's geometric pattern
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      ctx.moveTo(vertices[i].x, vertices[i].y);
      ctx.lineTo(vertices[j].x, vertices[j].y);
    }
  }
  ctx.stroke();

  // Draw circles at vertices
  vertices.forEach((vertex: { x: number; y: number }, index: number) => {
    const opacity = 0.12 + (consciousnessLevel * 0.25) + (Math.cos(animationOffset + index * 0.7) * 0.04);
    const color = getConsciousnessColor(consciousnessLevel);

    ctx.strokeStyle = `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, scale * 2, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawSriYantra(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scale: number,
  consciousnessLevel: number,
  animationOffset: number
) {
  const size = scale * 120;
  const color = getConsciousnessColor(consciousnessLevel);

  // Draw interlocking triangles representing spiritual evolution
  const layers = 4;
  for (let layer = 0; layer < layers; layer++) {
    const layerSize = size * (1 - layer * 0.15);
    const opacity = 0.08 + (consciousnessLevel * 0.25) + (Math.sin(animationOffset + layer * 0.5) * 0.03);

    // Upward triangle (Shakti/divine feminine)
    drawTriangle(ctx, centerX, centerY - layerSize * 0.5, layerSize, 'up',
                 `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);

    // Downward triangle (Shiva/conscious awareness)
    drawTriangle(ctx, centerX, centerY - layerSize * 0.5, layerSize, 'down',
                 `${adjustColorLightness(color, 20)}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
  }
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  direction: 'up' | 'down',
  color: string
) {
  const height = size * Math.sqrt(3) / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.beginPath();

  if (direction === 'up') {
    ctx.moveTo(x, y);
    ctx.lineTo(x - size / 2, y + height);
    ctx.lineTo(x + size / 2, y + height);
  } else {
    ctx.moveTo(x, y + height);
    ctx.lineTo(x - size / 2, y);
    ctx.lineTo(x + size / 2, y);
  }

  ctx.closePath();
  ctx.stroke();
}

function drawFibonacciSpiral(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scale: number,
  consciousnessLevel: number,
  animationOffset: number
) {
  const color = getConsciousnessColor(consciousnessLevel);
  const numPoints = Math.floor(15 + consciousnessLevel * 10);

  ctx.strokeStyle = `${color}12`;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const currentX = centerX;
  const currentY = centerY;
  let angle = 0;
  let radius = scale * 5;

  ctx.moveTo(currentX, currentY);

  for (let i = 1; i < numPoints; i++) {
    angle += Math.PI / 2; // 90 degrees per step
    radius *= 1.618; // Golden ratio

    const newX = centerX + Math.cos(angle + animationOffset * 2) * radius * scale;
    const newY = centerY + Math.sin(angle + animationOffset * 2) * radius * scale;

    ctx.lineTo(newX, newY);
  }

  ctx.stroke();

  // Draw spiral curve
  ctx.strokeStyle = `${color}08`;
  ctx.lineWidth = 2;
  ctx.beginPath();

  let spiralAngle = 0;
  let spiralRadius = scale * 2;
  ctx.moveTo(centerX + spiralRadius, centerY);

  for (let i = 0; i < 200; i++) {
    spiralAngle += 0.1;
    spiralRadius += 0.3;

    const x = centerX + Math.cos(spiralAngle + animationOffset) * spiralRadius;
    const y = centerY + Math.sin(spiralAngle + animationOffset) * spiralRadius;

    if (i === 0) {ctx.moveTo(x, y);}
    else {ctx.lineTo(x, y);}
  }

  ctx.stroke();
}

// Utility function to adjust color lightness
function adjustColorLightness(color: string, percent: number): string {
  // Simple HSL lightness adjustment
  const hslMatch = color.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
  if (!hslMatch) {return color;} // Return original if not HSL format

  const [, h, s, l] = hslMatch;
  const newL = Math.max(0, Math.min(100, parseInt(l) + percent));
  return `hsl(${h}, ${s}%, ${newL}%)`;
}

export default SacredAtmosphere;
