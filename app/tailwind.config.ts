import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Map Argos cream design tokens to Tailwind names so legacy components
        // (still using bg-background, text-foreground, etc.) keep rendering.
        bg: 'var(--bg)',
        'bg-2': 'var(--bg-2)',
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        'ink-4': 'var(--ink-4)',
        line: 'var(--line)',
        'line-soft': 'var(--line-soft)',
        coral: 'var(--coral)',
        'coral-soft': 'var(--coral-soft)',
        butter: 'var(--butter)',
        'butter-soft': 'var(--butter-soft)',
        sage: 'var(--sage)',
        'sage-soft': 'var(--sage-soft)',
        lav: 'var(--lav)',
        'lav-soft': 'var(--lav-soft)',
        sky: 'var(--sky)',
        rose: 'var(--rose)',
        // Legacy compat for any remaining shadcn-style usages
        background: 'var(--bg)',
        foreground: 'var(--ink)',
        muted: 'var(--bg-2)',
        'muted-foreground': 'var(--ink-3)',
        border: 'var(--line)',
        input: 'var(--line)',
        ring: 'var(--coral)',
        card: 'var(--paper)',
        'card-foreground': 'var(--ink)',
        popover: 'var(--paper)',
        'popover-foreground': 'var(--ink)',
        accent: 'var(--coral)',
        'accent-foreground': '#fff',
        secondary: 'var(--bg-2)',
        'secondary-foreground': 'var(--ink)',
        destructive: 'var(--coral)',
        'destructive-foreground': '#fff',
        success: '#3a8e5c',
        warning: 'var(--butter)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter Tight', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Instrument Serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '0.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
