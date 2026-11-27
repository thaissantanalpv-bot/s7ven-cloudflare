import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/test/browser",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    headless: true,
    launchOptions: { executablePath: "/usr/bin/chromium" },
  },
  webServer: {
    command: "npx vite --config src/test/browser/vite.config.ts --host 127.0.0.1",
    url: "http://127.0.0.1:4174/src/test/browser/catalog-image-egress.html",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
