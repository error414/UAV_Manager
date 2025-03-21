import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: process.env.DOCKER === 'true' || process.env.DOCKER === '1' ? 'http://backend:8000' : 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/auth': {
        target: process.env.DOCKER === 'true' || process.env.DOCKER === '1' ? 'http://backend:8000' : 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
