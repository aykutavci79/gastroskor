import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--color-bg-primary)',
          card: 'var(--color-bg-card)',
          input: 'var(--color-bg-input)',
        },
        content: {
          DEFAULT: 'var(--color-text-primary)',
          muted: 'var(--color-text-secondary)',
        },
        brand: {
          DEFAULT: 'var(--color-accent-primary)',
          hover: 'var(--color-accent-primary-hover)',
          gold: 'var(--color-accent-secondary)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        },
        success: 'var(--color-success)',
        google: 'var(--color-google)',
        bad: '#ef4444',
        /** @deprecated use brand.DEFAULT */
        accent: {
          DEFAULT: 'var(--color-accent-primary)',
          hover: 'var(--color-accent-primary-hover)',
          foreground: '#ffffff',
        },
        /** @deprecated use surface.card */
        panel: 'var(--color-bg-card)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      transitionDuration: {
        ui: '200ms',
      },
      transitionTimingFunction: {
        ui: 'ease',
      },
    },
  },
  plugins: [],
};

export default config;
