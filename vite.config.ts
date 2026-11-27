// SEVEN: Cloudflare Workers deployment - independent of Lovable Cloud.
// Keep Cloudflare as the ONLY server adapter (no Nitro and no Lovable Vite wrapper).
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

const pwa = VitePWA({
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
    importScripts: ["/catalog-cache-cleanup.js"],
    runtimeCaching: [
      {
        urlPattern: ({ url }) =>
          /^\/storage\/v1\/(?:object|render\/image)\/sign\//.test(url.pathname),
        handler: "NetworkOnly",
        options: { fetchOptions: { cache: "no-store" } },
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
});

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    ...pwa,
    {
      // Vite's app builder runs the Cloudflare client build in a separate
      // environment. vite-plugin-pwa's closeBundle skips the top-level SSR config.
      name: "s7ven:generate-worker-after-cloudflare-build",
      apply: "build",
      buildApp: {
        order: "post",
        async handler(builder) {
          const client = builder.environments["client"];
          if (!client?.isBuilt) throw new Error("Cloudflare client assets were not built.");
          const api = pwa.find((plugin) => plugin.api)?.api;
          if (!api) throw new Error("The catalog service worker generator is unavailable.");
          await api.generateSW();
          const worker = await stat(
            resolve(builder.config.root, client.config.build.outDir, "sw.js"),
          );
          if (!worker.size) throw new Error("The generated catalog service worker is empty.");
        },
      },
    },
  ],
});
