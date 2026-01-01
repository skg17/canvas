import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Get base path from environment variable, default to '/' for root
const base = import.meta.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})

