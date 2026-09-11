import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The dev proxy target is configurable so the app can be run against a staging
// backend or a tunnelled database without editing this file.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          id: '/cafe-olga',
          name: 'Cafe Olga — Online Ordering',
          short_name: 'Cafe Olga',
          description: 'Pesan kopi & makanan hangat langsung dari Cafe Olga',
          theme_color: '#c87028',
          background_color: '#fbf9f6',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // API responses must never be served from the precache: a cached
          // menu, order status or delivery quote would show stale prices.
          navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
          runtimeCaching: [
            {
              urlPattern: /^\/api\//,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^\/uploads\//,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'olga-uploads',
                expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          // Required for the live order WebSocket at /api/v1/ws.
          ws: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
