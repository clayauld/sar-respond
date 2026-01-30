import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'ORG_'],
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Exposes to network (0.0.0.0)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true,
      },
      '/_': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true,
      },
      // Proxy for Python Backend (CalTopo API)
      '/api/caltopo': {
        target: 'http://caltopo-api:5000', // Internal Docker Network
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/caltopo/, ''),
      }
    }
  }
})
