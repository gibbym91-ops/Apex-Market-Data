/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        apex: {
          bg: '#080c14',
          surface: '#0d1421',
          card: '#111827',
          border: '#1e2d45',
          accent: '#00d4ff',
          green: '#00ff88',
          red: '#ff3355',
          yellow: '#ffd700',
          purple: '#9b59ff',
          text: '#e2e8f0',
          muted: '#64748b',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'flicker': 'flicker 0.15s infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' }
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        }
      }
    },
  },
  plugins: [],
}
