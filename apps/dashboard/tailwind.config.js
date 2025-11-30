/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ═══════════════════════════════════════════════════════════════════════
        // BIZRA OFFICIAL BRAND IDENTITY v1.0
        // ═══════════════════════════════════════════════════════════════════════
        
        // Genesis Gold Scale (Primary Brand Color)
        'gold': {
          100: '#F9F1D8',
          300: '#E6D5A6',
          400: '#D4B875',
          500: '#C9A962',  // PRIMARY - Genesis Gold
          600: '#B08D45',
          900: '#8A6B2E',
          DEFAULT: '#C9A962',
        },
        
        // Navy Scale (Background)
        'navy': {
          800: '#0A1628',   // Deep Space Navy
          900: '#050B14',   // Void Black
          DEFAULT: '#0A1628',
        },
        
        // Accent Colors
        'teal': '#2A9D8F',           // Growth Teal
        'purple': '#6B4C9A',         // Sacred Purple
        'charcoal': '#121212',
        
        // Legacy aliases for compatibility
        'deep-space': '#050B14',
        'omega-gold': '#D4AF37',
        'spiritual-gold': '#F4E87C',
        'consciousness-dark': '#0A0A14',
        'consciousness-light': '#1A1A24',
        'awakening-purple': '#2D1B69',

        // Award-Winner Design Integration Colors
        'primary-gold': '#D4AF37',
        'primary-gold-dim': '#8C7335',
        'accent-teal': '#2A9D8F',
        'accent-teal-light': '#3AB8A8',
        'sacred-purple': '#6B4C9A',
        'sacred-purple-light': '#8B6CBA',
        'soft-white': '#F8F6F1',
        'void-black': '#000000',
        'deep-navy': '#020408',
        'deep-navy-light': '#0A1628',
      },
      fontFamily: {
        // Official Brand Fonts
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'arabic': ['Amiri', 'serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
        // Legacy
        'serif': ['Playfair Display', 'Crimson Text', 'Times New Roman', 'serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slower': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 60s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'breathe': 'breathe 8s ease-in-out infinite',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 1s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { 'box-shadow': '0 0 20px rgba(201, 169, 98, 0.5)' },
          '100%': { 'box-shadow': '0 0 40px rgba(201, 169, 98, 0.8), 0 0 60px rgba(201, 169, 98, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { 'box-shadow': '0 0 20px rgba(212, 175, 55, 0.1)' },
          '50%': { 'box-shadow': '0 0 40px rgba(212, 175, 55, 0.3)' },
        },
        shimmer: {
          from: { 'background-position': '0 0' },
          to: { 'background-position': '-200% 0' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'consciousness': 'radial-gradient(circle at center, rgba(201, 169, 98, 0.1) 0%, transparent 70%)',
        'omega-field': 'conic-gradient(from 0deg, rgba(201, 169, 98, 0.2), rgba(10, 16, 40, 0.8), rgba(201, 169, 98, 0.2))',
        'sacred-radial': 'radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.08) 0%, transparent 60%)',
        'cosmic-purple': 'radial-gradient(circle at 100% 0%, rgba(107, 76, 154, 0.05) 0%, transparent 40%)',
        'cosmic-teal': 'radial-gradient(circle at 0% 100%, rgba(42, 157, 143, 0.05) 0%, transparent 40%)',
      },
      boxShadow: {
        'gold-inner': 'inset 0 0 20px rgba(201, 169, 98, 0.3)',
        'consciousness': '0 0 50px rgba(201, 169, 98, 0.2)',
        'monument': '0 20px 40px rgba(0, 0, 0, 0.8)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'glass-hover': '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.3)',
      },
      borderRadius: {
        'glass': '0.625rem',
      },
      backdropBlur: {
        'glass': '16px',
        'glass-sm': '8px',
        'glass-lg': '20px',
      },
    },
  },
  plugins: [
    // Custom plugin for BIZRA-specific utilities
    function({ addUtilities }) {
      addUtilities({
        '.text-glow': {
          'text-shadow': '0 0 20px rgba(201, 169, 98, 0.5)',
        },
        '.text-glow-strong': {
          'text-shadow': '0 0 30px rgba(212, 175, 55, 0.5), 0 0 60px rgba(212, 175, 55, 0.3)',
        },
        '.backdrop-blur-gold': {
          'backdrop-filter': 'blur(16px) saturate(180%)',
          'background-color': 'rgba(0, 0, 0, 0.75)',
          'border': '1px solid rgba(201, 169, 98, 0.3)',
        },
        '.monument-gradient': {
          'background': 'linear-gradient(135deg, rgba(201, 169, 98, 0.1), rgba(10, 16, 40, 0.9))',
        },
        '.glass-surface': {
          'background': 'rgba(10, 22, 40, 0.4)',
          'backdrop-filter': 'blur(16px)',
          'border': '1px solid rgba(212, 175, 55, 0.1)',
        },
        '.glass-surface-hover': {
          'background': 'rgba(255, 255, 255, 0.04)',
          'border-color': 'rgba(212, 175, 55, 0.2)',
        },
      });
    },
  ],
};
