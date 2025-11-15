import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      '/api/n8n': {
        target: 'https://n8n.srv811212.hstgr.cloud',
        changeOrigin: true,
        rewrite: (path) => {
          // Remove /api/n8n prefix, keep the rest of the path
          // /api/n8n/webhook-test -> /webhook-test
          const rewritten = path.replace(/^\/api\/n8n/, '');
          console.log('[Vite Proxy] Rewriting:', path, '->', rewritten);
          return rewritten;
        },
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Vite Proxy] Request:', req.method, req.url);
            console.log('[Vite Proxy] Target URL:', proxyReq.path);
          });
          proxy.on('error', (err, req) => {
            console.error('[Vite Proxy] Error proxying', req.url, ':', err.message);
          });
        },
      },
    },
  },
});
