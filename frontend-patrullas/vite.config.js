// frontend-patrulles/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      // Activa el SW en development per poder provar-lo
      devOptions: {
        enabled: true,
      },

      manifest: {
        name: 'COORDINA - Patrulles',
        short_name: 'COORDINA',
        description: 'Aplicació de coordinació per a patrulles policials',
        theme_color: '#1e3a5f',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icones/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icones/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icones/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      workbox: {
        // Pre-cacheja tots els assets estàtics
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        runtimeCaching: [
          {
            // Crides a l'API: primer xarxa, si falla usa caché
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5,
              },
            },
          },
        ],
      },
    }),
  ],
})