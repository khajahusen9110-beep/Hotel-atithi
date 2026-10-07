import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable app + offline app shell. Menu, prices, stock and orders always come
    // live from Supabase (never cached), so a customer can never see stale prices.
    // Dish photos are left to the browser's HTTP cache: caching them here would need
    // CORS image requests, and an opaque cached copy costs ~7 MB of quota each.
    VitePWA({
      registerType: 'prompt', // ask before swapping versions mid-order (see PwaUpdatePrompt)
      injectRegister: false, // registered from src/components/PwaUpdatePrompt.tsx
      includeAssets: ['icons/icon.svg', 'icons/favicon-32x32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Hotel Atithi - Order Food Online',
        short_name: 'Hotel Atithi',
        description: 'Order Biryani, Tandoori, Chinese and Veg meals from Hotel Atithi, Raichur. No delivery charge, Cash on Delivery.',
        lang: 'en-IN',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#f97316',
        categories: ['food', 'shopping'],
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Menu', url: '/?source=pwa-shortcut', icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Cart', url: '/cart', icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'My Orders', url: '/orders', icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // App shell: every page's JS/CSS so the app opens instantly and offline.
        // The map (Leaflet) is only needed on checkout, so it is cached on first use instead.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        globIgnores: ['**/leaflet-*'],
        navigateFallback: '/index.html',
        // Files for search engines must open as themselves, not as the app
        navigateFallbackDenylist: [/^\/sitemap\.xml$/, /^\/robots\.txt$/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/leaflet-/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'map-library', expiration: { maxEntries: 6 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css', cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: they keep their hash (and browser cache) across
        // deploys that only change app code. Matching on the path also catches
        // sub-entries such as react-dom/client and scheduler.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|cookie|set-cookie-parser)[\\/]/.test(id)) {
            return 'react';
          }
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('leaflet')) return 'leaflet';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
