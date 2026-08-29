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
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-space-grotesk)', 'Space Grotesk', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-xl':  ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'display-lg':  ['3rem',    { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-md':  ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'heading-xl':  ['2rem',    { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'heading-lg':  ['1.5rem',  { lineHeight: '1.3', letterSpacing: '-0.015em' }],
        'heading-md':  ['1.25rem', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        'heading-sm':  ['1.125rem', { lineHeight: '1.4', letterSpacing: '-0.005em' }],
        'body-lg':     ['1.125rem', { lineHeight: '1.6', letterSpacing: '-0.005em' }],
        'body-md':     ['1rem',    { lineHeight: '1.55', letterSpacing: '0em' }],
        'body-sm':     ['0.875rem', { lineHeight: '1.5', letterSpacing: '0em' }],
        'caption':     ['0.75rem', { lineHeight: '1.45', letterSpacing: '0.01em' }],
        'caption-sm':  ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
      },
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