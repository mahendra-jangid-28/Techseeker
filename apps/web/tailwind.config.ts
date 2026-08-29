import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          hover: 'var(--bg-surface-hover)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        // Layer 1: Primary / Mentor / Nav — Indigo-Violet
        brand: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          subtle: 'var(--accent-primary-subtle)',
          border: 'var(--accent-primary-border)',
        },
        // Layer 2: Data / Playground — Teal-Cyan
        data: {
          DEFAULT: 'var(--accent-data)',
          hover: 'var(--accent-data-hover)',
          subtle: 'var(--accent-data-subtle)',
          border: 'var(--accent-data-border)',
        },
        // Layer 3: Reward / Achievement — Amber-Gold
        reward: {
          DEFAULT: 'var(--accent-reward)',
          hover: 'var(--accent-reward-hover)',
          subtle: 'var(--accent-reward-subtle)',
          border: 'var(--accent-reward-border)',
        },
        // Legacy accent aliases
        accent: {
          cyan: 'var(--accent-cyan)',
          emerald: 'var(--accent-emerald)',
          violet: 'var(--accent-violet)',
          amber: 'var(--accent-amber)',
          rose: 'var(--accent-rose)',
        },
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          danger: 'var(--status-danger)',
          info: 'var(--status-info)',
        },
      },
      boxShadow: {
        subtle:       'var(--shadow-subtle)',
        elevated:     'var(--shadow-elevated)',
        glow:         'var(--shadow-glow)',
        'glow-data':  'var(--shadow-glow-data)',
        'glow-reward':'var(--shadow-glow-reward)',
      },
      borderRadius: {
        sm:  '6px',
        md:  '8px',
        lg:  '12px',
        xl:  '16px',
        '2xl': '20px',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;