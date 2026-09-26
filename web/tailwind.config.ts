import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // shadcn
        border:      'var(--pattern-line)',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary:     { DEFAULT: 'hsl(var(--primary))',     foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))',   foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted:       { DEFAULT: 'hsl(var(--muted))',       foreground: 'hsl(var(--muted-foreground))' },
        accent:      { DEFAULT: 'var(--tissue-2)',          foreground: 'var(--ink)' },
        popover:     { DEFAULT: 'hsl(var(--popover))',     foreground: 'hsl(var(--popover-foreground))' },
        card:        { DEFAULT: 'hsl(var(--card))',        foreground: 'hsl(var(--card-foreground))' },
        // Made to measure (values in globals.css)
        tissue: { DEFAULT: 'var(--tissue)', 2: 'var(--tissue-2)' },
        ink:    { DEFAULT: 'var(--ink)',    2: 'var(--ink-2)' },
        line:   'var(--pattern-line)',
        thread: { DEFAULT: 'var(--thread)', deep: 'var(--thread-deep)' },
        tape:   'var(--tape)',
        chalk:  'var(--chalk)',
        night:  'var(--night)',
        // Legacy aliases still used by inner pages. New code uses the names above.
        surface:  'var(--tissue-2)',
        elevated: 'var(--tissue-2)',
        brand: {
          DEFAULT: 'var(--thread)',
          light:   'var(--thread-deep)',
          dim:     'rgba(196,50,31,0.10)',
          glow:    'rgba(196,50,31,0.18)',
        },
        dim:     'var(--ink-2)',
        success: 'var(--chalk)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 1px)',
        sm: 'calc(var(--radius) - 2px)',
      },
      fontFamily: {
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-up':        'fade-up 0.65s ease both',
        'fade-in':        'fade-in 0.4s ease both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
