import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Resolve the API proxy target at config time. Falls back to the local Fastify
// API port. Overridable via VITE_API_PROXY_TARGET.
const apiProxyTarget =
  (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

// Same-origin reverse proxy: Caddy serves the SPA and the Fastify API on one
// origin (CORS is `origin: false` in the backend). In dev, proxy /api to the
// local API so the client can use relative URLs unchanged.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});