/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0c0c10', light: '#fafafa' },
        secondary: { DEFAULT: '#151519', light: '#f4f4f5' },
        sidebar: { DEFAULT: '#0e0e13', light: '#f0f0f2' },
        card: { DEFAULT: '#1a1a21', light: '#ffffff' },
        accent: { DEFAULT: '#00d4aa', hover: '#00e5bb', muted: '#00d4aa20' },
        'border-default': { DEFAULT: '#2c2c38', light: '#e4e4e7' },
        danger: { DEFAULT: '#f43f5e', hover: '#fb7185' },
        success: { DEFAULT: '#10b981', hover: '#34d399' },
        warning: { DEFAULT: '#f59e0b', hover: '#fbbf24' },
        surface: { DEFAULT: '#1f1f27', light: '#f9f9fb' }
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1rem'
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(0, 212, 170, 0.15)',
        'glow-sm': '0 0 10px rgba(0, 212, 170, 0.1)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
        'elevated': '0 8px 32px rgba(0, 0, 0, 0.5)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.03)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")"
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
