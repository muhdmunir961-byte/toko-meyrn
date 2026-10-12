import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Resolve the API proxy target at config time. Falls back to the local Fastify
// API port. Overridable via VITE_API_PROXY_TARGET.
const apiProxyTarget =
  (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

// Trusted hostnames (NOT `allowedHosts: true`). These are the hosts that may
// reach the dev/preview server through a reverse proxy (e.g. code-server /
// Cloudflare tunnel). Requests with any other Host header are rejected with a
// 403 to prevent DNS-rebinding attacks.
const trustedHosts = [
  'localhost',
  '127.0.0.1',
  '.codespaces.githubusercontent.com',
  '.github.dev',
  '.preview.app.github.dev',
  // Add your specific tunnel/proxy hostname here if needed.
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: trustedHosts,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: trustedHosts,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
