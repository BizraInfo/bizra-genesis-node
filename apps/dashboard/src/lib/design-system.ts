/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA GENESIS NODE - SACRED GEOMETRY DESIGN SYSTEM                       ║
 * ║  Elite Practitioner Level Implementation                                  ║
 * ║                                                                           ║
 * ║  "Every Human a Node, Every Node a Seed, Every Seed Infinite Potential"   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// MATHEMATICAL CONSTANTS - Sacred Geometry Foundation
// ═══════════════════════════════════════════════════════════════════════════

/** The Golden Ratio (φ) - Foundation of sacred geometry */
export const PHI = 1.618033988749895;

/** Fibonacci sequence generator */
export const fibonacci = (n: number): number => {
  if (n <= 1) {return n;}
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
};

/** Golden angle in radians (used for spiral patterns) */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Schumann Resonance - Earth's heartbeat frequency */
export const SCHUMANN_RESONANCE = 7.83;

/** Sacred frequencies */
export const SACRED_FREQUENCIES = {
  healing: 432,      // Universal healing frequency
  love: 528,         // Love frequency (DNA repair)
  awakening: 639,    // Connection frequency
  intuition: 741,    // Awakening intuition
  spiritual: 852,    // Spiritual order
  unity: 963,        // Pure consciousness
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// COLOR SYSTEM - Sacred Geometry Palette
// ═══════════════════════════════════════════════════════════════════════════

export const BIZRA_COLORS = {
  // Primary Sacred Colors
  sacred: {
    gold: '#D4AF37',           // Golden ratio representation
    goldLight: '#F4E4BC',      // Sacred light
    goldDark: '#B08D45',       // Deep gold
  },
  
  // Consciousness Colors
  consciousness: {
    electric: '#2DD4BF',       // Electric consciousness
    quantum: '#6366F1',        // Quantum field
    emergence: '#8B5CF6',      // Emergence purple
    transcendence: '#EC4899',  // Transcendence pink
  },
  
  // Environment Colors
  environment: {
    deepSpace: '#050B14',      // Primary background
    cosmos: '#0A1828',         // Secondary background
    nebula: '#0F2744',         // Tertiary background
    void: '#000000',           // Pure void
  },
  
  // State Colors
  state: {
    success: '#2A9D8F',        // Teal success
    warning: '#F59E0B',        // Amber warning
    error: '#EF4444',          // Red error
    info: '#3B82F6',           // Blue info
  },
  
  // Text Colors
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Border Colors
  border: {
    subtle: 'rgba(255, 255, 255, 0.1)',
    default: 'rgba(255, 255, 255, 0.2)',
    sacred: 'rgba(212, 175, 55, 0.3)',
    sacredHover: 'rgba(212, 175, 55, 0.5)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export const BIZRA_TYPOGRAPHY = {
  fonts: {
    primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: "'Playfair Display', Georgia, serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  
  sizes: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '2rem',     // 32px
    '4xl': '2.5rem',   // 40px
    '5xl': '3.5rem',   // 56px
    '6xl': '4.5rem',   // 72px
  },
  
  weights: {
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
  
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.1em',
    wider: '0.2em',
    widest: '0.3em',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SPACING SYSTEM - Based on Golden Ratio
// ═══════════════════════════════════════════════════════════════════════════

const baseSpace = 4; // 4px base unit

export const BIZRA_SPACING = {
  0: '0',
  px: '1px',
  0.5: `${baseSpace * 0.5}px`,   // 2px
  1: `${baseSpace}px`,           // 4px
  2: `${baseSpace * 2}px`,       // 8px
  3: `${baseSpace * 3}px`,       // 12px
  4: `${baseSpace * 4}px`,       // 16px
  5: `${baseSpace * 5}px`,       // 20px
  6: `${baseSpace * 6}px`,       // 24px
  8: `${baseSpace * 8}px`,       // 32px
  10: `${baseSpace * 10}px`,     // 40px
  12: `${baseSpace * 12}px`,     // 48px
  16: `${baseSpace * 16}px`,     // 64px
  20: `${baseSpace * 20}px`,     // 80px
  24: `${baseSpace * 24}px`,     // 96px
  32: `${baseSpace * 32}px`,     // 128px
  
  // Golden ratio spacing
  phi: `${baseSpace * PHI}px`,
  'phi-2': `${baseSpace * PHI * 2}px`,
  'phi-3': `${baseSpace * PHI * 3}px`,
  'phi-4': `${baseSpace * PHI * 4}px`,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SACRED GEOMETRY CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const SACRED_GEOMETRY = {
  // Flower of Life pattern
  flowerOfLife: {
    circles: 7,
    radius: 20,
    strokeWidth: 2,
    color: BIZRA_COLORS.sacred.gold,
    opacity: 0.3,
  },
  
  // Seed of Life (simplified Flower of Life)
  seedOfLife: {
    circles: 7,
    radius: 20,
    positions: [
      { cx: 50, cy: 50 },  // Center
      { cx: 50, cy: 30 },  // Top
      { cx: 67.3, cy: 40 }, // Top right
      { cx: 67.3, cy: 60 }, // Bottom right
      { cx: 50, cy: 70 },  // Bottom
      { cx: 32.7, cy: 60 }, // Bottom left
      { cx: 32.7, cy: 40 }, // Top left
    ],
  },
  
  // Metatron's Cube dimensions
  metatronsCube: {
    vertices: 13,
    edges: 78,
    outerRadius: 50,
    innerRadius: 25,
  },
  
  // Sri Yantra
  sriYantra: {
    triangles: 9,
    upward: 4,
    downward: 5,
  },
  
  // Torus energy field
  torus: {
    majorRadius: 40,
    minorRadius: 15,
    segments: 64,
    rings: 32,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION SYSTEM - Consciousness Transitions
// ═══════════════════════════════════════════════════════════════════════════

export const BIZRA_ANIMATIONS = {
  // Timing functions
  easings: {
    consciousness: 'cubic-bezier(0.4, 0, 0.2, 1)',
    quantum: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    sacred: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    emergence: 'cubic-bezier(0.19, 1, 0.22, 1)',
  },
  
  // Duration presets
  durations: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '800ms',
    consciousness: '1200ms',
    transcendence: '2000ms',
  },
  
  // Animation keyframes (CSS-in-JS format)
  keyframes: {
    consciousnessPulse: `
      @keyframes consciousnessPulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
      }
    `,
    
    sacredGlow: `
      @keyframes sacredGlow {
        0% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.3); }
        50% { box-shadow: 0 0 40px rgba(212, 175, 55, 0.6); }
        100% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.3); }
      }
    `,
    
    quantumEntanglement: `
      @keyframes quantumEntanglement {
        0% { transform: rotate(0deg) scale(1); }
        25% { transform: rotate(90deg) scale(1.1); }
        50% { transform: rotate(180deg) scale(1); }
        75% { transform: rotate(270deg) scale(1.1); }
        100% { transform: rotate(360deg) scale(1); }
      }
    `,
    
    flowerRotation: `
      @keyframes flowerRotation {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
    
    fadeIn: `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,
    
    slideIn: `
      @keyframes slideIn {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `,
    
    scaleIn: `
      @keyframes scaleIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `,
  },
  
  // Pre-composed animations
  presets: {
    consciousnessPulse: 'consciousnessPulse 3s ease-in-out infinite',
    sacredGlow: 'sacredGlow 4s ease-in-out infinite',
    quantumEntanglement: 'quantumEntanglement 20s linear infinite',
    flowerRotation: 'flowerRotation 120s linear infinite',
    fadeIn: 'fadeIn 0.5s ease-out forwards',
    slideIn: 'slideIn 0.3s ease-out forwards',
    scaleIn: 'scaleIn 0.3s ease-out forwards',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// BORDER & SHADOW SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export const BIZRA_BORDERS = {
  radii: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
    full: '9999px',
  },
  
  widths: {
    none: '0',
    thin: '1px',
    default: '2px',
    thick: '4px',
  },
} as const;

export const BIZRA_SHADOWS = {
  // Standard shadows
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
  
  // Sacred shadows with golden glow
  sacred: {
    sm: '0 0 10px rgba(212, 175, 55, 0.2)',
    md: '0 0 20px rgba(212, 175, 55, 0.3)',
    lg: '0 0 40px rgba(212, 175, 55, 0.4)',
    xl: '0 0 60px rgba(212, 175, 55, 0.5)',
  },
  
  // Consciousness glow
  consciousness: {
    electric: '0 0 30px rgba(45, 212, 191, 0.4)',
    quantum: '0 0 30px rgba(99, 102, 241, 0.4)',
    emergence: '0 0 30px rgba(139, 92, 246, 0.4)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// BREAKPOINTS & RESPONSIVE
// ═══════════════════════════════════════════════════════════════════════════

export const BIZRA_BREAKPOINTS = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Z-INDEX SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export const BIZRA_ZINDEX = {
  background: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
  consciousness: 100, // Sacred geometry overlays
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED DESIGN SYSTEM EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const BIZRA_DESIGN_SYSTEM = {
  // Mathematical foundations
  constants: {
    phi: PHI,
    goldenAngle: GOLDEN_ANGLE,
    schumannResonance: SCHUMANN_RESONANCE,
    frequencies: SACRED_FREQUENCIES,
  },
  
  // Visual system
  colors: BIZRA_COLORS,
  typography: BIZRA_TYPOGRAPHY,
  spacing: BIZRA_SPACING,
  borders: BIZRA_BORDERS,
  shadows: BIZRA_SHADOWS,
  
  // Sacred geometry
  geometry: SACRED_GEOMETRY,
  
  // Animation system
  animations: BIZRA_ANIMATIONS,
  
  // Layout system
  breakpoints: BIZRA_BREAKPOINTS,
  zIndex: BIZRA_ZINDEX,
} as const;

// Type exports for TypeScript consumers
export type BIZRAColors = typeof BIZRA_COLORS;
export type BIZRATypography = typeof BIZRA_TYPOGRAPHY;
export type BIZRASpacing = typeof BIZRA_SPACING;
export type BIZRAAnimations = typeof BIZRA_ANIMATIONS;
export type BIZRADesignSystem = typeof BIZRA_DESIGN_SYSTEM;

export default BIZRA_DESIGN_SYSTEM;
