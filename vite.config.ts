// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  plugins: [mcpPlugin(), VitePWA({
    strategies: "generateSW",
    filename: "sw.js",
    outDir: "dist/client",
    registerType: "autoUpdate",
    injectRegister: null,
    manifest: false,
    devOptions: { enabled: false },
    workbox: {
      // Precache only the entry files so the worker installs in seconds on mobile;
      // everything else under /assets/ is cached at runtime on first online view.
      globPatterns: ["assets/index-*.js", "assets/styles-*.css"],
      maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      navigateFallback: null,
      cleanupOutdatedCaches: true,
      runtimeCaching: [{
        urlPattern: ({ request, url }) => (request.mode === "navigate" || request.destination === "") && url.origin === self.location.origin && url.pathname === "/" && !url.searchParams.has("sw"),
        handler: "NetworkFirst",
        options: { cacheName: "s7ven-public-pages-v1", networkTimeoutSeconds: 3, cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 10, maxAgeSeconds: 30 * 86400 } },
      }, {
        urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/assets/"),
        handler: "CacheFirst",
        options: { cacheName: "s7ven-public-assets-v1", cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 600, maxAgeSeconds: 30 * 86400 } },
      }],
    },
  })],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
