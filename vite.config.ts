// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [VitePWA({
    strategies: "generateSW",
    filename: "sw.js",
    registerType: "autoUpdate",
    injectRegister: null,
    manifest: false,
    devOptions: { enabled: false },
    workbox: {
      globPatterns: ["assets/**/*.{js,css,woff,woff2}"],
      navigateFallback: null,
      cleanupOutdatedCaches: true,
      runtimeCaching: [{
        urlPattern: ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin && url.pathname === "/" && !url.searchParams.has("sw"),
        handler: "NetworkFirst",
        options: { cacheName: "s7ven-public-pages-v1", networkTimeoutSeconds: 3, cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 10, maxAgeSeconds: 30 * 86400 } },
      }],
    },
  })],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
