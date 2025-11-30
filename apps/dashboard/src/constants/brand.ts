/**
 * BIZRA Brand Identity Constants
 * Based on Sacred Geometry - Seed of Life Pattern
 *
 * The Nuqta (نقطة) - The dot under the Bā' (ب), beginning of all knowledge
 * البذرة (al-Bizra) - "The Seed"
 */

export const BRAND = {
  // Primary Colors
  colors: {
    // Genesis Gold Gradient
    gold: {
      100: '#F9F1D8',
      300: '#E6D5A6',
      400: '#D4B875',
      500: '#C9A962', // Primary
      600: '#B08D45',
      900: '#8A6B2E',
    },
    // Deep Space Navy
    navy: {
      800: '#0A1628',
      900: '#050B14', // Background
    },
    // Growth Teal (Accent)
    teal: {
      500: '#2A9D8F',
      600: '#238B80',
    },
    // Charcoal
    charcoal: '#121212',
    // Text
    text: {
      primary: '#F8F6F1',
      secondary: 'rgba(248, 246, 241, 0.6)',
      muted: 'rgba(248, 246, 241, 0.3)',
    },
  },

  // Typography
  fonts: {
    serif: "'Playfair Display', serif", // Headlines, spiritual messaging
    sans: "'Inter', sans-serif",        // UI, body text
    arabic: "'Amiri', serif",           // Arabic script
    mono: "'JetBrains Mono', monospace", // Code, metrics
  },

  // Three.js Color Values (Hex Numbers)
  three: {
    gold: 0xC9A962,
    goldLight: 0xF9F1D8,
    goldDark: 0x8A6B2E,
    navy: 0x0A1628,
    navyDeep: 0x050B14,
    teal: 0x2A9D8F,
  },

  // Sacred Geometry Constants
  geometry: {
    seedRadius: 40,        // Radius of each circle in Seed of Life
    petalCount: 6,         // 6 surrounding circles
    goldenAngle: 137.5,    // Golden angle in degrees
    phi: 1.618033988749,   // Golden ratio
  },

  // Animation Timing
  animation: {
    fast: 0.2,
    normal: 0.5,
    slow: 1.0,
    reveal: 2.0,
  },

  // Arabic Text
  arabic: {
    tagline: 'البذرة',      // "The Seed"
    bismillah: 'بسم الله',  // "In the name of God"
  },
} as const;

// CSS Custom Properties for Tailwind
export const cssVariables = `
  :root {
    --gold-100: #F9F1D8;
    --gold-300: #E6D5A6;
    --gold-400: #D4B875;
    --gold-500: #C9A962;
    --gold-600: #B08D45;
    --gold-900: #8A6B2E;
    --navy-800: #0A1628;
    --navy-900: #050B14;
    --teal-500: #2A9D8F;
    --charcoal: #121212;
  }
`;

export default BRAND;
