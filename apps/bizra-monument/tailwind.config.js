/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bizra-gold': '#C9A962',
        'bizra-teal': '#2A9D8F',
        'bizra-navy': '#0A1628',
        'bizra-void': '#050B14',
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
        serif: ['var(--font-source-serif)'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          from: { 'box-shadow': '0 0 5px rgba(201, 169, 98, 0.5)' },
          to: { 'box-shadow': '0 0 20px rgba(201, 169, 98, 0.8), 0 0 30px rgba(201, 169, 98, 0.4)' }
        },
      },
    },
  },
  plugins: [],
}
