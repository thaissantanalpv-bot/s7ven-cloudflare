// SEVEN: Cloudflare Workers deployment - independent of Lovable Cloud.
// Keep Cloudflare as the ONLY server adapter (no Nitro and no Lovable Vite wrapper).
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      strategies: "generateSW",
      filename: "sw.js",
      outDir: "dist/client",
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ["assets/index-*.js", "assets/styles-*.css"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              (request.mode === "navigate" || request.destination === "") &&
              url.origin === self.location.origin && url.pathname === "/" &&
              !url.searchParams.has("sw"),
            handler: "NetworkFirst",
            options: {
              cacheName: "s7ven-public-pages-v1",
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 10, maxAgeSeconds: 30 * 86400 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "s7ven-public-assets-v1",
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 600, maxAgeSeconds: 30 * 86400 },
            },
          },
        ],
      },
    }),
  ],
});
