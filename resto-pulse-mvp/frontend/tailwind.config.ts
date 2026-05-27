import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        panel: '#1e293b',
        accent: '#38bdf8',
        good: '#22c55e',
        warn: '#f59e0b',
        bad: '#ef4444',
      },
      boxShadow: {
        glow: '0 0 40px rgba(56, 189, 248, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
