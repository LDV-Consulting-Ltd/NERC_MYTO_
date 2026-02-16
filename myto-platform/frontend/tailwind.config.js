/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--ldv-primary)',
          hover: 'var(--ldv-primary-hover)',
        },
        accent: {
          DEFAULT: 'var(--ldv-accent)',
          hover: 'var(--ldv-accent-hover)',
        },
        support: 'var(--ldv-support)',
        surface: 'var(--ldv-surface)',
        border: 'var(--ldv-border)',
        'text-primary': 'var(--ldv-text-primary)',
        'text-muted': 'var(--ldv-text-muted)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      ringColor: {
        DEFAULT: 'var(--ldv-accent)',
      },
    },
  },
  plugins: [],
};
