// Sacred Geometry utilities for BIZRA consciousness system
// Based on the Seed of Life (البذرة) sacred geometry pattern

/**
 * Golden ratio constant (phi)
 */
export const PHI = 1.618033988749895;

/**
 * Scale consciousness level using sacred geometry principles
 * Maps input level to output scale factor
 */
export function consciousnessScaling(level: number): number {
  // Clamp to valid range and apply golden ratio scaling
  const normalized = Math.max(0, Math.min(1, level));
  return 0.5 + normalized * 1.5; // Returns 0.5 to 2.0
}

/**
 * Calculate harmonic frequency based on consciousness level
 */
export function harmonicFrequency(level: number): number {
  return 432 * Math.pow(PHI, level - 0.5);
}

/**
 * Generate seed of life pattern coordinates
 */
export function seedOfLifePattern(radius: number, centerX = 0, centerY = 0): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  // Center circle
  points.push({ x: centerX, y: centerY });

  // Six surrounding circles
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  return points;
}

/**
 * Calculate consciousness coherence factor
 */
export function coherenceFactor(values: number[]): number {
  if (values.length === 0) {return 0;}

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

  // Higher coherence = lower variance
  return 1 / (1 + Math.sqrt(variance));
}

export default {
  PHI,
  consciousnessScaling,
  harmonicFrequency,
  seedOfLifePattern,
  coherenceFactor,
};
