// frontend-patrulles/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      devOptions: {
        enabled: true,
        disableDevLogs: true,
      },

      manifest: {
        name: 'COORDINA - Patrulles',
        short_name: 'COORDINA',
        description: 'Aplicació de coordinació per a patrulles policials',
        theme_color: '#1e3a5f',
        background_color: '#0f172a',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        runtimeCaching: [
          {
            // API del backend: detectem per pathname que comenci per /api
            // Funciona tant en local com en producció
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5,
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Tiles del mapa OpenStreetMap
            urlPattern: ({ url }) =>
              url.hostname.includes('tile.openstreetmap.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            // OSRM
            urlPattern: ({ url }) =>
              url.hostname.includes('router.project-osrm.org'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'osrm-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 10,
              },
            },
          },
          {
            // Leaflet CDN
            urlPattern: ({ url }) =>
              url.hostname.includes('cdnjs.cloudflare.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'leaflet-assets-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
})