import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/** @param {import('vite').ViteDevServer | import('vite').PreviewServer} server */
const mountTourEntry = (server) => {
  server.middlewares.use((request, _response, next) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (url.pathname === '/recorrido' || url.pathname === '/recorrido/') {
      request.url = `/recorrido/index.html${url.search}`
    }
    next()
  })
}

export default defineConfig({
  plugins: [react(), { name: 'habitu-tour-entry', configureServer: mountTourEntry, configurePreviewServer: mountTourEntry }],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/images': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['react-leaflet', 'leaflet']
  }
})
