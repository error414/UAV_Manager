import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite' // Original-Import beibehalten

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Umgebungsvariablen laden
  const env = loadEnv(mode, process.cwd(), '')
  
  // Prüfen, ob wir in Docker oder lokal sind
  const isDocker = env.DOCKER === 'true' || env.DOCKER === '1'
  const backendUrl = isDocker ? 'http://backend:8000' : 'http://localhost:8000'
  
  console.log(`Running in ${isDocker ? 'Docker' : 'local'} mode. Backend URL: ${backendUrl}`)
  
  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    server: {
      port: 5175,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false
        },
        '/auth': {
          target: backendUrl,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})