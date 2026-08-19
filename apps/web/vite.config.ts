import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-Server läuft auf :5173 und leitet /api an das Express-Backend (:3001) weiter.
// So bleiben Frontend und Backend im Dev getrennt, in Produktion liefert das
// Backend die gebauten Frontend-Dateien aus.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
