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
        border:      'var(--line)',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary:     { DEFAULT: 'hsl(var(--primary))',     foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))',   foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted:       { DEFAULT: 'hsl(var(--muted))',       foreground: 'hsl(var(--muted-foreground))' },
        accent:      { DEFAULT: 'var(--panel)',             foreground: 'var(--ink)' },
        popover:     { DEFAULT: 'hsl(var(--popover))',     foreground: 'hsl(var(--popover-foreground))' },
        card:        { DEFAULT: 'hsl(var(--card))',        foreground: 'hsl(var(--card-foreground))' },
        // Palette (values in globals.css)
        paper:  'var(--paper)',
        panel:  'var(--panel)',
        line:   'var(--line)',
        ink:    { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)' },
        body:   'var(--body)',
        subtle: 'var(--subtle)',
        brand: {
          DEFAULT: 'var(--brand)',
          strong:  'var(--brand-strong)',
          deep:    'var(--brand-deep)',
          tint:    'var(--brand-tint)',
          ink:     'var(--brand-ink)',
          // Legacy names still used by inner pages.
          light:   'var(--brand-strong)',
          dim:     'var(--brand-tint)',
          glow:    'rgba(99,102,241,0.18)',
        },
        gap:    { DEFAULT: 'var(--gap)', tint: 'var(--gap-tint)', ink: 'var(--gap-ink)' },
        night:  { DEFAULT: 'var(--night)', 2: 'var(--night-2)' },
        // The extension popup's dark UI, for product visuals only.
        ext: {
          bg:       'var(--ext-bg)',
          surface:  'var(--ext-surface)',
          elevated: 'var(--ext-elevated)',
          border:   'var(--ext-border)',
          text:     'var(--ext-text)',
          muted:    'var(--ext-muted)',
          soft:     'var(--ext-accent-soft)',
        },
        // Legacy aliases still used by inner pages. New code uses the names above.
        surface:  'var(--card)',
        elevated: 'var(--panel)',
        dim:      'var(--subtle)',
        success:  'var(--brand-strong)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
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
