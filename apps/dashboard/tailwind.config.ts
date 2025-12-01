import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bizra: {
          gold: 'var(--bizra-gold)',
          'gold-light': 'var(--bizra-gold-light)',
          'gold-dark': 'var(--bizra-gold-dark)',
          black: 'var(--bizra-black)',
          dark: 'var(--bizra-dark)',
          surface: 'var(--bizra-surface)',
          border: 'var(--bizra-border)',
        },
        pat: {
          'master-reasoner': 'var(--pat-master-reasoner)',
          'memory-architect': 'var(--pat-memory-architect)',
          'creative-synthesizer': 'var(--pat-creative-synthesizer)',
          'data-analyzer': 'var(--pat-data-analyzer)',
          'communicator': 'var(--pat-communicator)',
          'execution-planner': 'var(--pat-execution-planner)',
          'ethics-guardian': 'var(--pat-ethics-guardian)',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(212, 175, 55, 0.6)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
