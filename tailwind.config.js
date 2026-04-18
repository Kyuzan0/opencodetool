/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0f0f0f', light: '#ffffff' },
        secondary: { DEFAULT: '#1a1a2e', light: '#f5f5f5' },
        sidebar: { DEFAULT: '#16213e', light: '#e8e8e8' },
        card: { DEFAULT: '#1e1e2e', light: '#ffffff' },
        accent: { DEFAULT: '#6366f1', hover: '#818cf8' },
        'border-default': { DEFAULT: '#2d2d3f', light: '#e0e0e0' },
        danger: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
