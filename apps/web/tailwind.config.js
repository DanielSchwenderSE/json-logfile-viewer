/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Log-Level-Farben (hell/dunkel-tauglich über Opacity/Border geregelt)
        level: {
          error: '#ef4444',
          warn: '#f59e0b',
          info: '#3b82f6',
          debug: '#8b5cf6',
          trace: '#6b7280',
        },
      },
    },
  },
  plugins: [],
}
