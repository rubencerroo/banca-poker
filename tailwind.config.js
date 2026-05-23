/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          950: '#062018',
          900: '#0b3b2e',
          800: '#0f4a3a',
          700: '#13573f',
        },
        gold: {
          400: '#d4af37',
          500: '#b8941f',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        chip: '0 4px 12px rgba(0,0,0,0.35), inset 0 -2px 0 rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.15)',
      },
    },
  },
  plugins: [],
}
