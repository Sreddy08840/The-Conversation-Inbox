/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Graphite base
        graphite: {
          50: '#f6f7f9',
          100: '#edf0f3',
          200: '#d7dde4',
          300: '#b3bfc9',
          400: '#899bb0',
          500: '#647c97',
          600: '#4e6279',
          700: '#3f4f62',
          800: '#27313d', // Borders and card backgrounds
          900: '#1a202c', // Primary UI background (slate/graphite)
          950: '#0f131a', // Muted dark background
        },
        // Mapped urgency colors as semantic design tokens
        urgency: {
          calm: {
            text: '#94a3b8', // Slate 400
            bg: '#1e293b', // Slate 900
            border: '#334155', // Slate 800
            indicator: '#475569', // Slate 600
          },
          elevated: {
            text: '#fbbf24', // Amber 400
            bg: '#451a03', // Amber 950
            border: '#78350f', // Amber 900
            indicator: '#d97706', // Amber 600
          },
          critical: {
            text: '#fda4af', // Rose 300
            bg: '#4c0519', // Rose 950
            border: '#881337', // Rose 900
            indicator: '#e11d48', // Rose 600
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
