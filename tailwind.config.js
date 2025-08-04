/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'audiowide': ['Audiowide', 'monospace'],
        'unbounded': ['Unbounded', 'sans-serif'],
        'orbitron': ['var(--font-orbitron)', 'monospace'],
        'inter': ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        'neon-cyan': '#007E7E',
        'neon-purple': '#7E007E',
        'neon-green': '#007E00',
        'neon-pink': '#7E4662',
        // Light mode variants - updated for better contrast
        'light-cyan': '#0E7490',
        'light-purple': '#6B21A8',
        'light-green': '#15803D',
        'light-pink': '#9D174D',
        // Off-white background variants
        'off-white': '#FCFCFA',
        'warm-white': '#F8F8F6',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
