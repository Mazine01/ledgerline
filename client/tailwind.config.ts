import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  // `dark:` follows the same rule as the tokens: an explicit choice wins, otherwise the system setting.
  darkMode: [
    'variant',
    ["&:is([data-theme='dark'] *)", "@media (prefers-color-scheme: dark) { &:is(:root:not([data-theme='light']):not([data-theme='dark']) *) }"],
  ],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        surface: token('surface'),
        sunken: token('sunken'),
        ink: { DEFAULT: token('ink'), muted: token('ink-muted') },
        rule: { DEFAULT: token('rule'), strong: token('rule-strong') },
        brand: { DEFAULT: token('brand'), ink: token('brand-ink'), soft: token('brand-soft') },
        income: { DEFAULT: token('income'), soft: token('income-soft') },
        expense: { DEFAULT: token('expense'), soft: token('expense-soft') },
        budget: { DEFAULT: token('budget'), ink: token('budget-ink'), soft: token('budget-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['20px', '28px'],
        xl: ['24px', '30px'],
        '2xl': ['32px', '38px'],
        '3xl': ['44px', '48px'],
      },
      borderRadius: { control: '8px', panel: '14px' },
      boxShadow: { panel: 'var(--shadow-panel)' },
    },
  },
  plugins: [],
} satisfies Config;
