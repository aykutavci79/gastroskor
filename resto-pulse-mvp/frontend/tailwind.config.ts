import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Sicak koyu zemin */
        ink: '#0c0a09',
        panel: '#1f1a17',
        surface: '#292018',
        line: '#3f362e',
        /** Ana marka — domates / mercan (yemek, CTA) */
        accent: {
          DEFAULT: '#f97316',
          hover: '#ea580c',
          soft: '#fb923c',
          foreground: '#1c0a00',
        },
        /** Basari / onay */
        good: '#22c55e',
        warn: '#fbbf24',
        bad: '#ef4444',
        /** Harita / konum (bilgi) */
        map: '#38bdf8',
      },
      boxShadow: {
        glow: '0 0 40px rgba(249, 115, 22, 0.18)',
        'glow-sm': '0 0 20px rgba(249, 115, 22, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
