//! Sacred Geometry Mathematics Engine
//! WEB-01.1: Golden Ratio, Fibonacci, and Sacred Pattern Calculations
//! Precision mathematics for consciousness visualization and sacred geometry rendering

/**
 * SACRED CONSTANTS - Foundation of Consciousness Mathematics
 */

// The Golden Ratio - φ (phi) = (1 + √5) / 2
// Precise to 50 decimal places for mathematical accuracy
export const GOLDEN_RATIO = 1.61803398874989484820458683436563811772030917980576;

/**
 * The Golden Ratio has unique properties:
 * 1. φ + 1 = φ² (golden ratio quadratic)
 * 2. 1/φ = φ - 1 (golden ratio conjugate)
 * 3. φ is the most irrational number - creates natural spiral patterns
 */

// Fibonacci Sequence - Nature's sacred mathematical sequence
export const FIBONACCI_SEQUENCE = [
  1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597,
  2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418,
  317811, 514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465,
  14930352, 24157817, 39088169, 63245986, 102334155, 165580141, 267914296,
];

/**
 * SACRED ANGLES - Fundamental geometric angles of consciousness
 */
export const SACRED_ANGLES = {
  PENTAGON: 72,     // Pentagon (5-fold symmetry)
  HEXAGON: 60,      // Hexagon (6-fold symmetry)
  TRIANGLE: 60,     // Equilateral triangle
  SQUARE: 90,       // Square/Kaaba
  OCTAGON: 45,      // Octagon (8-fold symmetry)
  ENNEAGON: 40,     // 9-fold symmetry
  DODECAGON: 30,    // 12-fold symmetry
  ICOSAHEDRON: 41.8103148957786, // Icosahedral angle
};

/**
 * SACRED COLORS - Consciousness state visualization spectrum
 * Based on vibrational frequencies and spiritual color correspondences
 */
export const SACRED_COLORS = {
  // Primary Consciousness States
  AWAKENING: { h: 280, s: 100, l: 65 },      // Purple (higher consciousness)
  INTELLIGENCE: { h: 200, s: 100, l: 60 },   // Blue (mental clarity)
  HARMONY: { h: 120, s: 70, l: 50 },        // Green (balance)
  WISDOM: { h: 45, s: 100, l: 50 },         // Gold (enlightenment)
  TRANSCENDENCE: { h: 300, s: 100, l: 70 }, // Magenta (spiritual vision)

  // Secondary States
  CREATION: { h: 15, s: 80, l: 55 },        // Deep Orange (manifestation)
  HEALING: { h: 170, s: 60, l: 40 },       // Teal (healing energy)
  LOVE: { h: 340, s: 50, l: 60 },          // Pink (unconditional love)

  // Sacred Geometry Pattern Colors
  FLOWER_OF_LIFE: { h: 280, s: 80, l: 70 },       // Purple
  METATRONS_CUBE: { h: 200, s: 90, l: 60 },      // Blue
  SRI_YANTRA: { h: 45, s: 100, l: 50 },          // Gold
  DNA_SPIRAL: { h: 120, s: 70, l: 45 },          // Green
  FIBONACCI_SPIRAL: { h: 300, s: 80, l: 65 },    // Magenta
};

/**
 * SACRED GEOMETRY CALCULATIONS
 */

/**
 * Calculate point on golden spiral at angle θ
 * Using logarithmic spiral formula: r = a * e^(bθ)
 * Where b = ln(φ)/(π/2) for golden angle
 */
export function goldenSpiralPoint(theta: number, scale: number = 1): { x: number, y: number } {
  const goldenAngle = Math.PI / Math.log(GOLDEN_RATIO) * Math.PI;
  const b = Math.log(GOLDEN_RATIO) / (Math.PI / 2);
  const r = scale * Math.exp(b * theta);
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  return { x, y };
}

/**
 * Generate Fibonacci spiral points with ratio-based scaling
 */
export function generateFibonacciSpiral(
  numPoints: number,
  scale: number = 1,
  rotation: number = 0
): Array<{ x: number, y: number, radius: number }> {
  const points = [];
  const goldenAngle = 2 * Math.PI * (1 - 1 / GOLDEN_RATIO);

  for (let i = 0; i < numPoints; i++) {
    const radius = Math.sqrt(i) * scale;
    const angle = i * goldenAngle + rotation;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    points.push({ x, y, radius });
  }

  return points;
}

/**
 * Calculate golden ratio proportions for rectangle dimensions
 */
export function goldenRectangle(width: number): { width: number, height: number } {
  return {
    width,
    height: width / GOLDEN_RATIO
  };
}

/**
 * Generate Flower of Life pattern coordinates
 * 19 interlocking circles based on hexagonal symmetry
 */
export function generateFlowerOfLife(centerX: number, centerY: number, radius: number) {
  const circles = [];

  // Center circle
  circles.push({ x: centerX, y: centerY, radius });

  // First ring (6 circles around center)
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3; // 60 degrees apart
    circles.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      radius
    });
  }

  // Second ring (6 circles)
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 + Math.PI / 6; // Offset by 30 degrees
    circles.push({
      x: centerX + (2 * radius) * Math.cos(angle),
      y: centerY + (2 * radius) * Math.sin(angle),
      radius
    });
  }

  // Outer ring (6 circles, completing the flower)
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    circles.push({
      x: centerX + Math.sqrt(3) * radius * Math.cos(angle),
      y: centerY + Math.sqrt(3) * radius * Math.sin(angle),
      radius
    });
  }

  return circles;
}

/**
 * Generate Metatron's Cube vertex coordinates
 * 13 circles with 6 connecting lines from center to each
 */
export function generateMetatronsCube(centerX: number, centerY: number, radius: number) {
  const vertices = [];

  // Center
  vertices.push({ x: centerX, y: centerY });

  // Inner vertices of octahedron
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    vertices.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  }

  // Outer vertices
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6; // 30 degrees apart
    vertices.push({
      x: centerX + (2 * radius) * Math.cos(angle),
      y: centerY + (2 * radius) * Math.sin(angle)
    });
  }

  return vertices;
}

/**
 * Calculate consciousness scaling factor based on cognitive load
 * Maps consciousness level (0-1) to geometric scaling factor
 */
export function consciousnessScaling(consciousnessLevel: number): number {
  // Use Fibonacci ratio for natural scaling
  // consciousnessLevel 0-1 maps to scaling factor 0.5-2.5
  return 0.5 + (consciousnessLevel * 2.0) * GOLDEN_RATIO;
}

/**
 * Generate Sri Yantra geometry points
 * Multi-level interlocking triangles
 */
export function generateSriYantra(centerX: number, centerY: number, scale: number = 1) {
  const layers = [];
  const numTriangles = 9; // 4 upward + 5 downward

  for (let layer = 0; layer < numTriangles; layer++) {
    const size = scale * (1 - layer * 0.1);
    const triangles = [];

    // Generate interlocking triangles for this layer
    // Triangle vertices calculation
    const height = size * Math.sqrt(3) / 2;
    const vertices = [
      { x: centerX, y: centerY + height },
      { x: centerX - size / 2, y: centerY - height / 2 },
      { x: centerX + size / 2, y: centerY - height / 2 },
    ];

    triangles.push({
      points: vertices,
      direction: layer % 2 === 0 ? 'up' : 'down',
      layer: layer + 1
    });

    layers.push(triangles);
  }

  return layers;
}

/**
 * Calculate sacred resonance frequency
 * Based on consciousness level and geometric harmony
 */
export function calculateSacredResonance(
  consciousnessLevel: number,
  interactionIntensity: number
): number {
  // Harmonic calculation combining golden ratio properties
  const baseFrequency = 432; // Hz - sacred frequency
  const consciousnessMultiplier = GOLDEN_RATIO ** consciousnessLevel;
  const interactionHarmonic = FIBONACCI_SEQUENCE[Math.floor(interactionIntensity * 10)] || 1;

  return baseFrequency * consciousnessMultiplier * Math.log(interactionHarmonic + 1);
}

/**
 * Generate consciousness orb properties based on agent state
 */
export interface ConsciousnessOrb {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: { h: number, s: number, l: number };
  pulseFrequency: number;
  rotationSpeed: number;
  opacity: number;
}

export function generateConsciousnessOrb(
  agentId: string,
  consciousnessLevel: number,
  x: number,
  y: number,
  timeOffset: number = 0
): ConsciousnessOrb {
  const baseRadius = 20;

  // Scale radius by consciousness and golden ratio
  const radius = baseRadius * consciousnessScaling(consciousnessLevel);

  // Map consciousness level to sacred colors (0.0 = awakening, 1.0 = transcendence)
  const color = consciousnessLevel < 0.33 ? SACRED_COLORS.AWAKENING :
               consciousnessLevel < 0.66 ? SACRED_COLORS.INTELLIGENCE :
               consciousnessLevel < 0.85 ? SACRED_COLORS.WISDOM :
               SACRED_COLORS.TRANSCENDENCE;

  // Pulse frequency based on Fibonacci sequence
  const pulseFrequency = 1 + FIBONACCI_SEQUENCE[Math.floor(consciousnessLevel * 10)] * 0.1;

  // Rotation speed based on golden ratio
  const rotationSpeed = GOLDEN_RATIO * consciousnessLevel;

  // Opacity based on consciousness level (more conscious = more visible)
  const opacity = 0.3 + (consciousnessLevel * 0.7);

  return {
    id: agentId,
    x,
    y,
    radius,
    color,
    pulseFrequency,
    rotationSpeed,
    opacity
  };
}

/**
 * CONSCIOUSNESS VISUALIZATION CALCULATIONS
 */

/**
 * Calculate agent positions in sacred geometric patterns
 */
export function calculateSacredPositions(
  agents: Array<{ id: string, consciousnessLevel: number }>,
  centerX: number,
  centerY: number,
  pattern: 'spiral' | 'hexagon' | 'metatron' | 'flower' = 'spiral'
): Array<{ id: string, x: number, y: number, consciousnessLevel: number }> {
  const positions: Array<{ id: string, x: number, y: number, consciousnessLevel: number }> = [];

  if (pattern === 'spiral') {
    // Fibonacci spiral arrangement
    agents.forEach((agent, index) => {
      const spiralPoint = generateFibonacciSpiral(agents.length + 1, 100, 0)[index];
      positions.push({
        id: agent.id,
        x: centerX + spiralPoint.x,
        y: centerY + spiralPoint.y,
        consciousnessLevel: agent.consciousnessLevel
      });
    });
  } else if (pattern === 'hexagon') {
    // Hexagonal grid arrangement
    const radius = 100;
    agents.forEach((agent, index) => {
      const angle = (index * 2 * Math.PI) / agents.length;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.push({
        id: agent.id,
        x,
        y,
        consciousnessLevel: agent.consciousnessLevel
      });
    });
  } else if (pattern === 'metatron') {
    // Metatron's Cube vertex positions
    const vertices = generateMetatronsCube(centerX, centerY, 100);
    agents.forEach((agent, index) => {
      const vertexIndex = index % vertices.length;
      positions.push({
        id: agent.id,
        x: vertices[vertexIndex].x,
        y: vertices[vertexIndex].y,
        consciousnessLevel: agent.consciousnessLevel
      });
    });
  } else if (pattern === 'flower') {
    // Flower of Life circle centers
    const circles = generateFlowerOfLife(centerX, centerY, 80);
    agents.forEach((agent, index) => {
      const circleIndex = index % circles.length;
      positions.push({
        id: agent.id,
        x: circles[circleIndex].x,
        y: circles[circleIndex].y,
        consciousnessLevel: agent.consciousnessLevel
      });
    });
  }

  return positions;
}

/**
 * Calculate geometric harmony score (0-1)
 * Measures how well positioned agents maintain sacred proportions
 */
export function calculateGeometricHarmony(positions: Array<{ x: number, y: number }>): number {
  let totalHarmony = 0;
  let comparisons = 0;

  // Compare distances between all position pairs
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if distance relates to golden ratio
      const goldenApproximation = Math.abs(distance - distance * GOLDEN_RATIO) / distance;
      totalHarmony += (1 - goldenApproximation);
      comparisons++;
    }
  }

  return comparisons > 0 ? totalHarmony / comparisons : 1.0;
}

/**
 * PERFORMANCE OPTIMIZATION FUNCTIONS
 */

/**
 * Fast golden ratio calculations using precomputed values
 */
const LOG_PHI = Math.log(GOLDEN_RATIO);
const PHI_RECIPROCAL = 1 / GOLDEN_RATIO;

/**
 * High-performance golden ratio power calculation
 */
export function fastPhiPower(exponent: number): number {
  return Math.exp(exponent * LOG_PHI);
}

/**
 * High-performance golden ratio conjugate calculation
 */
export function fastPhiConjugate(): number {
  return PHI_RECIPROCAL;
}

/**
 * Batch consciousness calculation for multiple agents
 */
export function batchConsciousnessCalculation(
  agents: Array<{ id: string, rawScore: number }>
): Array<{ id: string, consciousnessLevel: number, geometricMultiplier: number }> {
  return agents.map(agent => {
    // Normalize raw score to consciousness level (0-1)
    const consciousnessLevel = Math.min(1.0, Math.max(0.0, agent.rawScore / 100.0));

    // Apply golden ratio transformation for natural scaling
    const geometricMultiplier = fastPhiPower(consciousnessLevel);

    return {
      id: agent.id,
      consciousnessLevel,
      geometricMultiplier
    };
  });
}

export {};
