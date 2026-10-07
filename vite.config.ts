import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
